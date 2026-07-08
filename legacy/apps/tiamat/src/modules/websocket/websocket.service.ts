import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { MeterInteractionStatusEnum, MeterInteractionTypeEnum } from '@core/types/supabase-types';

export type MeterInteractionSocketOperation = 'CREATE' | 'UPDATE';

type MeterInteractionSocketPayload = {
  id: number;
  updated_at: string;
  meter_interaction_type: MeterInteractionTypeEnum;
  meter_interaction_status: MeterInteractionStatusEnum;
  meter_external_reference: string;
  dcu_external_reference: string | null;
}

type MeterInteractionSocketEvent = {
  operation: MeterInteractionSocketOperation;
  data: MeterInteractionSocketPayload;
}

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(private readonly websocketGateway: WebsocketGateway) {}

  /**
   * Emit a meter interaction change event to clients subscribed to the grid room.
   *
   * @param gridId - The grid ID to emit to (clients join rooms by grid_id)
   * @param operation - Whether this is a CREATE or UPDATE operation
   * @param payload - The meter interaction change payload
   */
  emitMeterInteraction(
    gridId: number,
    operation: MeterInteractionSocketOperation,
    payload: MeterInteractionSocketPayload,
  ): void {
    try {
      const server = this.websocketGateway.getServer();
      if (!server) {
        this.logger.warn('WebSocket server not initialized, skipping emission');
        return;
      }

      const event: MeterInteractionSocketEvent = {
        operation,
        data: payload,
      };

      server.to(String(gridId)).emit('meter-interaction', event);
      // this.logger.debug(
      //   `Emitted meter-interaction (${ operation }) for interaction ${ payload.id } to grid ${ gridId }`,
      // );
    }
    catch (error) {
      this.logger.error(
        `Failed to emit meter-interaction:change: ${ error instanceof Error ? error.message : String(error) }`,
      );
      // Don't throw - websocket failures shouldn't break the main flow
    }
  }
}
