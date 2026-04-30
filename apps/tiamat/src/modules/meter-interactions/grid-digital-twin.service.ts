import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@core/modules/supabase.module';
import { CommunicationProtocolEnum } from '@core/types/supabase-types';

const IS_PRODUCTION = process.env.NXT_ENV === 'production';
const STABILITY_WINDOW_MS = 5 * 60 * 1000;

/** In-memory representation of a metering gateway's real-time connectivity state. */
export type GatewayDigitalTwin = {
  readonly id: number;
  readonly communication_protocol: CommunicationProtocolEnum | null;
  readonly is_online: boolean;
  readonly last_online_at: string | null;
  readonly is_online_updated_at: string | null;
};

/** In-memory representation of a grid's real-time operational state, including its gateways. */
export type GridDigitalTwin = {
  readonly id: number;
  readonly is_energised: boolean;
  readonly is_any_lorawan_gateway_online: boolean;
  readonly gateways: readonly GatewayDigitalTwin[];
};

/** Describes confirmed state transitions after the stability window has elapsed. */
export type GridTwinTransition = {
  readonly gridId: number;
  readonly gatewaysNowOnline: readonly number[];
  readonly isNowEnergised: boolean | null;
};

type TransitionListener = (transitions: readonly GridTwinTransition[]) => unknown;

/**
 * Maintains an in-memory cache of grid and gateway operational state in Tiamat.
 *
 * The source of truth is the Supabase database, which is kept up-to-date by
 * Yeti's GridDigitalTwinService (Victron MQTT → is_hps_on) and
 * DcuSnapshot1MinService (Calin API → gateway connectivity).
 *
 * This service hydrates on startup and refreshes every minute, providing
 * fast in-memory lookups for the InteractionGatekeeperService.
 *
 * State transitions (gateway coming online, HPS turning on) are debounced
 * through a configurable stability window before listeners are notified,
 * to avoid reacting to transient connectivity flickers.
 */
@Injectable()
export class GridDigitalTwinService implements OnModuleInit {
  private gridMap = new Map<number, GridDigitalTwin>();
  private isRefreshing = false;
  private hasCompletedInitialLoad = false;

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async onModuleInit() {
    await this.generateTwins();
  }

  /**
   * Get the cached digital twin state for a grid, including its gateways.
   * Returns undefined if the grid is not tracked or the cache hasn't loaded yet.
   */
  getGridTwin(gridId: number): GridDigitalTwin | undefined {
    return this.gridMap.get(gridId);
  }

  /** Refreshes the grid + gateway cache from Supabase and detects state transitions. */
  @Cron(CronExpression.EVERY_MINUTE, { disabled: !IS_PRODUCTION })
  async generateTwins(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;

      // Note: `dcus` is the legacy table name for metering gateways
      const grids = await supabase
        .from('grids')
        .select(`
          id,
          is_generation_managed_by_nxt_grid,
          is_hps_on,
          dcus(id, communication_protocol, is_online, last_online_at, is_online_updated_at)
        `)
        .is('deleted_at', null)
        .then(handleResponse)
      ;

      // Build grid twins with nested gateways
      const nextMap = new Map<number, GridDigitalTwin>();
      for (const grid of grids) {
        const gateways: GatewayDigitalTwin[] = (grid.dcus ?? []).map(dcu => ({
          id: dcu.id,
          communication_protocol: dcu.communication_protocol,
          is_online: dcu.is_online,
          last_online_at: dcu.last_online_at,
          is_online_updated_at: dcu.is_online_updated_at,
        }));

        const is_any_lorawan_gateway_online = gateways
          .filter(({ communication_protocol }) => communication_protocol === 'CALIN_LORAWAN')
          .some(({ is_online }) => is_online)
        ;

        const is_energised = grid.is_generation_managed_by_nxt_grid ? grid.is_hps_on : true;

        nextMap.set(grid.id, {
          id: grid.id,
          is_energised,
          is_any_lorawan_gateway_online,
          gateways,
        });
      }

      // Detect confirmed transitions (skip on first load — no previous state to compare)
      const confirmedTransitions = this.hasCompletedInitialLoad
        ? this.detectConfirmedTransitions(nextMap)
        : [];

      // Swap atomically, then notify so listeners see the updated state
      this.gridMap = nextMap;
      this.hasCompletedInitialLoad = true;

      if (confirmedTransitions.length) {
        this.notifyListeners(confirmedTransitions);
      }
    }
    catch (err) {
      console.error('[GRID DIGITAL TWIN] Error refreshing digital twin cache', err);
    }
    finally {
      this.isRefreshing = false;
    }
  }


  /**
   * Transition detection
   */

  /** Gateway ID → timestamp when first detected online after being offline. */
  private pendingGatewayOnline = new Map<number, Date>();
  /** Grid ID → timestamp when grid first detected as energised after being de-energised. */
  private pendingEnergised = new Map<number, Date>();

  private transitionListeners: TransitionListener[] = [];

  /**
   * Register a listener for confirmed state transitions.
   * Transitions are only emitted after the stability window has elapsed,
   * ensuring the state change is not a transient flicker.
   */
  onTransition(listener: TransitionListener): void {
    this.transitionListeners.push(listener);
  }

  private detectConfirmedTransitions(nextMap: Map<number, GridDigitalTwin>): GridTwinTransition[] {
    const now = new Date();
    const transitions: GridTwinTransition[] = [];

    // Flatten old gateway states for O(1) lookups
    const oldGatewayOnlineById = new Map<number, boolean>();
    for (const grid of this.gridMap.values()) {
      for (const gw of grid.gateways) {
        oldGatewayOnlineById.set(gw.id, gw.is_online);
      }
    }

    for (const [ gridId, newGrid ] of nextMap) {
      const oldGrid = this.gridMap.get(gridId);

      const gatewaysNowOnline = this.processGatewayTransitions(now, newGrid.gateways, oldGatewayOnlineById);
      const isNowEnergised = this.processEnergisedTransition(now, gridId, newGrid, oldGrid);

      if (gatewaysNowOnline.length > 0 || isNowEnergised !== null) {
        transitions.push({ gridId, gatewaysNowOnline, isNowEnergised });
      }
    }

    this.cleanupStalePendingTransitions(nextMap);

    return transitions;
  }

  /** Returns confirmed gateway IDs that have been stably online past the stability window. */
  private processGatewayTransitions(
    now: Date,
    gateways: readonly GatewayDigitalTwin[],
    oldGatewayOnlineById: Map<number, boolean>,
  ): number[] {
    const confirmed: number[] = [];

    for (const gateway of gateways) {
      const oldIsOnline = oldGatewayOnlineById.get(gateway.id);
      const wasKnownAndOffline = oldIsOnline !== undefined && !oldIsOnline;

      // Gateway was offline and is now online — start stability tracking
      if (wasKnownAndOffline && gateway.is_online && !this.pendingGatewayOnline.has(gateway.id)) {
        this.pendingGatewayOnline.set(gateway.id, now);
      }

      // Evaluate pending transitions
      if (this.pendingGatewayOnline.has(gateway.id)) {
        if (!gateway.is_online) {
          this.pendingGatewayOnline.delete(gateway.id);
        }
        else {
          const firstSeenAt = this.pendingGatewayOnline.get(gateway.id)!;
          if (now.getTime() - firstSeenAt.getTime() >= STABILITY_WINDOW_MS) {
            this.pendingGatewayOnline.delete(gateway.id);
            confirmed.push(gateway.id);
          }
        }
      }
    }

    return confirmed;
  }

  /** Returns true if grid has been stably energised past the stability window, null otherwise. */
  private processEnergisedTransition(
    now: Date,
    gridId: number,
    newGrid: GridDigitalTwin,
    oldGrid: GridDigitalTwin | undefined,
  ): boolean | null {
    const wasKnownAndDeEnergised = oldGrid !== undefined && !oldGrid.is_energised;

    // Grid was de-energised and is now energised — start stability tracking
    if (wasKnownAndDeEnergised && newGrid.is_energised && !this.pendingEnergised.has(gridId)) {
      this.pendingEnergised.set(gridId, now);
    }

    // Evaluate pending transition
    if (this.pendingEnergised.has(gridId)) {
      if (!newGrid.is_energised) {
        this.pendingEnergised.delete(gridId);
      }
      else {
        const firstSeenAt = this.pendingEnergised.get(gridId)!;
        if (now.getTime() - firstSeenAt.getTime() >= STABILITY_WINDOW_MS) {
          this.pendingEnergised.delete(gridId);
          return true;
        }
      }
    }

    return null;
  }

  /** Remove pending entries for gateways or grids that no longer exist in the data. */
  private cleanupStalePendingTransitions(nextMap: Map<number, GridDigitalTwin>): void {
    const currentGatewayIds = new Set<number>();
    for (const grid of nextMap.values()) {
      for (const gw of grid.gateways) currentGatewayIds.add(gw.id);
    }

    for (const gatewayId of this.pendingGatewayOnline.keys()) {
      if (!currentGatewayIds.has(gatewayId)) this.pendingGatewayOnline.delete(gatewayId);
    }
    for (const gridId of this.pendingEnergised.keys()) {
      if (!nextMap.has(gridId)) this.pendingEnergised.delete(gridId);
    }
  }


  /**
   * Listener notification
   */

  private notifyListeners(transitions: readonly GridTwinTransition[]): void {
    for (const listener of this.transitionListeners) {
      try {
        const result = listener(transitions);
        if (result instanceof Promise) {
          result.catch(err => console.error('[GRID DIGITAL TWIN] Error in transition listener', err));
        }
      }
      catch (err) {
        console.error('[GRID DIGITAL TWIN] Error in transition listener', err);
      }
    }
  }

}
