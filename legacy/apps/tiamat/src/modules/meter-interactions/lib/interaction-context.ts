import { MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { isReadInteraction, isTokenInteraction, isControlInteraction, isWriteInteraction } from './meter-interaction-type-helpers';

type InteractionPriorityContext = {
  interactionType: MeterInteractionTypeEnum;
  fromCommissioning?: boolean;
  fromUser?: boolean;
  followingUpOnType?: MeterInteractionTypeEnum;
}

/**
 * Defines the explicit execution order for commissioning interactions.
 * This sequence is used across:
 * - Creating interactions in the correct order (meter-installs.service)
 * - Picking the next interaction to execute (meter-installs.service)
 * - Calculating interaction priority (interaction-context)
 *
 * Order matters: interactions execute sequentially in this exact order.
 * TOP_UP is always last to ensure meter is fully configured before receiving credit.
 */
export const COMMISSIONING_COMMAND_SEQUENCE: readonly MeterInteractionTypeEnum[] = [
  'CLEAR_TAMPER',    // 1. Clear any tamper flags first
  'CLEAR_CREDIT',    // 2. Reset credit to zero
  'SET_POWER_LIMIT', // 3. Configure power limit
  'READ_VOLTAGE',    // 4. Verify voltage
  'READ_POWER',      // 5. Verify power
  'TOP_UP',          // 6. Add initial credit (always last)
];

/**
 * Gets the commissioning priority for a given interaction type.
 * Last interaction (TOP_UP) = 50, then increments by 10 for each earlier interaction.
 * First interaction (CLEAR_TAMPER) = 100.
 * Not found: defaults to 60, so at least before topup
 * @returns The priority (50-100), or 60 if it's not found
 */
const getCommissioningCommandPriority = (interactionType: MeterInteractionTypeEnum): number => {
  const index = COMMISSIONING_COMMAND_SEQUENCE.indexOf(interactionType);
  if(index < 0) return 60;

  // Calculate priority: last item = 50, working backwards by 10s
  // Formula: 50 + (length - 1 - index) * 10
  return 50 + (COMMISSIONING_COMMAND_SEQUENCE.length - 1 - index) * 10;
};

/**
 * Sort comparator for ordering interactions by commissioning sequence priority.
 * Higher priority interactions come first (descending order).
 * Usage: interactions.sort(sortByCommissioningPriority)
 */
export const sortByCommissioningPriority = (
  interactionA: { meter_interaction_type: MeterInteractionTypeEnum },
  interactionB: { meter_interaction_type: MeterInteractionTypeEnum },
): number => {
  const priorityA = getCommissioningCommandPriority(interactionA.meter_interaction_type);
  const priorityB = getCommissioningCommandPriority(interactionB.meter_interaction_type);
  return priorityB - priorityA; // Descending order (highest priority first)
};

export const inferInteractionPriority = ({
  interactionType, fromCommissioning, fromUser, followingUpOnType,
}: InteractionPriorityContext): number => {
  // If an interaction is following up a previous interaction, then actually
  // mirror the priority of the interaction it is following up.
  if(followingUpOnType) return inferInteractionPriority({
    interactionType: followingUpOnType, fromCommissioning, fromUser,
  });

  // Commissioning interactions are top priority, because they have to
  // come before top-up
  if(fromCommissioning) return getCommissioningCommandPriority(interactionType);

  // Clear credit always goes before top-ups, because we don't want
  // a top-up to happen and then immediately cleared. If we do a clear
  // and a top-up, it will always be intended to first clear and then top-up,
  // starting a meter  with a clean slate.
  if(interactionType === 'CLEAR_CREDIT') return 60;

  // Top-ups higher than other writes
  if(interactionType === 'TOP_UP') return 50;

  const isWrite = (isWriteInteraction(interactionType) || isControlInteraction(interactionType) || isTokenInteraction(interactionType));
  if(isWrite && fromUser) return 40;

  const isRead = isReadInteraction(interactionType);
  if(isRead && fromUser) return 30;

  if(isWrite) return 20;
  if(isRead) return 10;

  // Unknown
  return 10;
};
