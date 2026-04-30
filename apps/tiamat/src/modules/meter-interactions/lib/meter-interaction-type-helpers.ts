import { MeterInteractionTypeEnum } from '@core/types/supabase-types';

/**
 * Type arrays to aggregate types into usable subsets
**/
const phaseSpecificReadTypes = [ 'READ_VOLTAGE', 'READ_CURRENT' ] satisfies MeterInteractionTypeEnum[];
const readTypes = [ ...phaseSpecificReadTypes, 'READ_POWER', 'READ_POWER_LIMIT', 'READ_CREDIT', 'READ_VERSION', 'READ_DATE', 'READ_TIME'  ] satisfies MeterInteractionTypeEnum[];
const controlTypes = [ 'TURN_ON', 'TURN_OFF' ] satisfies MeterInteractionTypeEnum[];
const writeTypes = [ 'SET_DATE', 'SET_TIME' ] satisfies MeterInteractionTypeEnum[];
const generateTokenTypes = [ 'CLEAR_CREDIT', 'CLEAR_TAMPER', 'SET_POWER_LIMIT', 'TOP_UP' ] satisfies MeterInteractionTypeEnum[];
const tokenTypes = [ ...generateTokenTypes, 'DELIVER_PREEXISTING_TOKEN' ] satisfies MeterInteractionTypeEnum[];
const unsolicitedTypes = [ 'READ_REPORT', 'JOIN_NETWORK' ] satisfies MeterInteractionTypeEnum[];

export type PhaseSpecificReadTypes = typeof phaseSpecificReadTypes[number];
export type GenerateTokenTypes = typeof generateTokenTypes[number];
export { generateTokenTypes };

/**
 * Some complex typing to ensure that:
 *   - we never have an extra or wrong value in our types
 *   - we never have a value missing that was newly added to db
**/

// Union of all types in arrays
type AllMeterInteractionTypes =
  | typeof readTypes[number]
  | typeof controlTypes[number]
  | typeof writeTypes[number]
  | typeof tokenTypes[number]
  | typeof unsolicitedTypes[number]
;

// Detect missing enum values
type MissingTypes = Exclude<MeterInteractionTypeEnum, AllMeterInteractionTypes>;

// Force compile-time error if any
// ⚠️ If the following type fails, it means that a new value was added  ⚠️
// ⚠️ to the MeterInteractionTypes enum and we haven't handled it here ⚠️
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type checkAllTypesAreCovered = AssertNever<MissingTypes>;

const isTypeIn =
  <const T extends readonly MeterInteractionTypeEnum[]>(group: T) =>
    (status: MeterInteractionTypeEnum): status is T[number] => group.includes(status as T[number]);

export const isPhaseSpecificReadInteraction = isTypeIn(phaseSpecificReadTypes);
export const isReadInteraction = isTypeIn(readTypes);
export const isControlInteraction = isTypeIn(controlTypes);
export const isWriteInteraction = isTypeIn(writeTypes);
export const isTokenInteraction = isTypeIn(tokenTypes);
export const isUnsolicitedInteraction = isTypeIn(unsolicitedTypes);
