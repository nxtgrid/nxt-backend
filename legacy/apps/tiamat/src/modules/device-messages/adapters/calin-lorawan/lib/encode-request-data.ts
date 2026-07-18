import { MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { PhaseEnum } from '@core/types/device-messaging';
import { isTokenInteraction } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
import { SetDatePayload, SetTimePayload } from '../../../lib/types';
import { CalinMetaBytes } from './types';

// We alias it here because it may become an aggregate type
type RequestType = MeterInteractionTypeEnum;
type RequestPayload = SetDatePayload | SetTimePayload;

type ToEncode = {
  deviceIdentifier: string; // Expected as hex string (e.g., "47003333771" = 0x47003333771)
  devicePhase: PhaseEnum;
  requestType: RequestType;
  token?: string; // Expected as hex string when provided
  payload?: RequestPayload; // Required for write operations such as SET_DATE / SET_TIME
}

export const encodeRequestData = ({ deviceIdentifier, devicePhase, requestType, token, payload }: ToEncode): number[] | null => {
  // For READ_POWER_LIMIT we use DLMS, which is made of fixed strings anyway
  if (requestType === 'READ_POWER_LIMIT') return encodeDLMS(requestType);

  // Parse hex string representing Device EUI into bytes (6 bytes, little-endian)
  const deviceEuiBytes = deviceIdentifier
    .padStart(12, '0') // Ensure 12 hex digits (6 bytes)
    .match(/.{2}/g)! // Split into byte pairs (safe after padStart ensures even length)
    .map(hexPair => parseInt(hexPair, 16)) // Parse each hex pair to decimal byte
    .reverse()  // Reverse for little-endian order
  ;

  const frameHeader = [
    CalinMetaBytes.HEADER_BYTE,
    ...deviceEuiBytes,
    0x68, // Second frame header
  ];

  const passwordBytes = [ 0x00, 0x00, 0x00, 0x00 ]; // Password for write operations - addition of 0x33 will be done later

  // Determine command configuration upfront
  const commandConfig = determineCommandConfig({ requestType, token, devicePhase, payload });
  if (!commandConfig) return null;

  const { controlCode, dataIdentifier, rawWriteData, requiresPassword } = commandConfig;

  // Add 0x33 to each byte, then reverse the data identifier bytes (little endian)
  const dataIdentifierBytes = dataIdentifier
    .map(byte => (byte + 0x33) & 0xFF)
    .reverse()
  ;

  // Process write bytes based on whether password is required
  const writeBytes = requiresPassword
    ? [
      ...passwordBytes.map(byte => (byte + 0x33) & 0xFF).reverse(),
      ...rawWriteData.map(byte => (byte + 0x33) & 0xFF).reverse(),
    ]
    : rawWriteData;

  // Calculate data size once (2 bytes for data identifier + write bytes length)
  const dataSize = 0x02 + writeBytes.length;

  // Construct the frame body without checksum or end mark
  const frameBody = [
    ...frameHeader,
    controlCode,
    dataSize,
    ...dataIdentifierBytes,
    ...writeBytes,
  ];

  // Compute checksum (sum of all bytes, mod 256)
  const checksum = frameBody.reduce((sum, byte) => sum + byte, 0) % 256;

  return [
    ...frameBody,
    checksum,
    CalinMetaBytes.END_BYTE,
  ];
};


/**
 * Utility functions
**/

interface CommandConfig {
  controlCode: number;
  dataIdentifier: number[];
  rawWriteData: number[];
  requiresPassword: boolean;
}

/**
 * Determines the command configuration based on request type.
 * Returns null if the request type is not supported.
 */
const determineCommandConfig = ({
  requestType,
  token,
  devicePhase,
  payload,
}: {
  requestType: RequestType;
  token?: string;
  devicePhase: PhaseEnum;
  payload?: RequestPayload;
}): CommandConfig | null => {
  // Commands that require a token (hex string)
  if (isTokenInteraction(requestType)) {
    if (!token) return null; // Token is required for these commands

    const rawWriteData = token
      .match(/.{2}/g)! // Split hex string into byte pairs
      .map(hexPair => parseInt(hexPair, 16)) // Parse to decimal bytes
      .map(byte => (byte + 0x33) & 0xFF) // Add 0x33 offset
      .reverse() // Reverse for little-endian order
    ;

    return {
      controlCode: 0x00, // Token
      dataIdentifier: [ 0xa1, 0x20 ],
      rawWriteData,
      requiresPassword: false,
    };
  }

  switch (requestType) {
    // Control operations
    case 'TURN_ON': // Close the meter relay (provide power)
      return {
        controlCode: 0x04,  // Writing
        dataIdentifier: [ 0xc0, 0x3d ],
        rawWriteData: [ 0x96 ],
        requiresPassword: true,
      };
    case 'TURN_OFF':  // Open the meter relay (stop power output)
      return {
        controlCode: 0x04,  // Writing
        dataIdentifier: [ 0xc0, 0x3c ],
        rawWriteData: [ 0x35 ],
        requiresPassword: true,
      };
      // Write operations
    case 'SET_DATE': {
      if (!isSetDatePayload(payload)) return null;
      return {
        controlCode: 0x04, // Writing
        dataIdentifier: [ 0xc0, 0x10 ],
        rawWriteData: encodeDateBytes(payload),
        requiresPassword: true,
      };
    }
    case 'SET_TIME': {
      if (!isSetTimePayload(payload)) return null;
      return {
        controlCode: 0x04, // Writing
        dataIdentifier: [ 0xc0, 0x11 ],
        rawWriteData: encodeTimeBytes(payload),
        requiresPassword: true,
      };
    }

    // Reading operations
    case 'READ_CREDIT': // Credit remaining on meter
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: [ 0xe4, 0x21 ],
        rawWriteData: [],
        requiresPassword: false,
      };
    // case 'READ_FRAUD_STATUS':
    //   return {
    //     controlCode: 0x01, // Reading
    //     dataIdentifier: [ 0xef, 0xf6 ],
    //     rawWriteData: [],
    //     requiresPassword: false,
    //   };
    // case 'READ_STATUS':
    //   return {
    //     controlCode: 0x01, // Reading
    //     dataIdentifier: [ 0xef, 0xf5 ],
    //     rawWriteData: [],
    //     requiresPassword: false,
    //   };
    case 'READ_DATE':
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: [ 0xc0, 0x10 ],
        rawWriteData: [],
        requiresPassword: false,
      };
    case 'READ_TIME':
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: [ 0xc0, 0x11 ],
        rawWriteData: [],
        requiresPassword: false,
      };
    // case 'READ_TOTAL_ACTIVE_KWH': // Total Active kWh Register
    //   return {
    //     controlCode: 0x01, // Reading
    //     dataIdentifier: [ 0x90, 0x10 ],
    //     rawWriteData: [],
    //     requiresPassword: false,
    //   };
    case 'READ_VOLTAGE':
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: readVoltageByPhase(devicePhase),
        rawWriteData: [],
        requiresPassword: false,
      };
    case 'READ_POWER':
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: readPowerByPhase(devicePhase),
        rawWriteData: [],
        requiresPassword: false,
      };
    case 'READ_CURRENT':
      return {
        controlCode: 0x01, // Reading
        dataIdentifier: readCurrentByPhase(devicePhase),
        rawWriteData: [],
        requiresPassword: false,
      };
    default:
      return null;
  }
};

/**
 * Encodes DLMS (Device Language Message Specification) commands.
 * These use fixed byte sequences rather than the standard protocol.
 */
const encodeDLMS = (requestType: RequestType): number[] | undefined => {
  switch (requestType) {
    case 'READ_POWER_LIMIT':
      return [ 0x00, 0x01, 0x00, 0x66, 0x00, 0x01, 0x00, 0x0D, 0xC0, 0x01, 0xC1, 0x00, 0x47, 0x00, 0x00, 0x11, 0x00, 0x00, 0xFF, 0x03, 0x00 ];
  }
};

/**
 * Returns the data identifier bytes for reading current on the specified phase.
 */
const readCurrentByPhase = (phase: PhaseEnum): number[] => {
  switch (phase) {
    case 'A':
      return [ 0xB6, 0x21 ];
    case 'B':
      return [ 0xB6, 0x22 ];
    case 'C':
      return [ 0xB6, 0x23 ];
  }
};

/**
 * Returns the data identifier bytes for reading power on the specified phase.
 */
const readPowerByPhase = (phase: PhaseEnum): number[] => {
  switch (phase) {
    case 'A':
      return [ 0xB6, 0x30 ];
    case 'B':
      return [ 0xB6, 0x31 ];
    case 'C':
      return [ 0xB6, 0x32 ];
  }
};

/**
 * Returns the data identifier bytes for reading voltage on the specified phase.
 */
const readVoltageByPhase = (phase: PhaseEnum): number[] => {
  switch (phase) {
    case 'A':
      return [ 0xB6, 0x11 ];
    case 'B':
      return [ 0xB6, 0x12 ];
    case 'C':
      return [ 0xB6, 0x13 ];
  }
};

/**
 * Type guard for SetDatePayload. Verifies year/month/day are present as numbers.
 */
const isSetDatePayload = (payload?: RequestPayload): payload is SetDatePayload =>
  !!payload &&
  typeof (payload as SetDatePayload).year === 'number' &&
  typeof (payload as SetDatePayload).month === 'number' &&
  typeof (payload as SetDatePayload).day === 'number'
;

/**
 * Encodes a date as 4 BCD bytes in the natural (year-first) order.
 *
 * The encoder pipeline applies (+0x33) per byte and then reverses the array,
 * so the meter receives bytes 12-15 as [weekday, day, month, year] -- the
 * same layout the meter uses when reporting its date in READ_DATE responses.
 *
 * Weekday is derived from the date itself (0 = Sunday, matching DL/T 645).
 *
 * Two-digit years are normalized to 20xx because (a) the wire format only
 * carries 2 year digits, (b) the decoder always prepends '20', and (c) the
 * Date constructor would otherwise treat values 0-99 as 1900-1999, silently
 * producing the wrong weekday (1924-04-19 = Saturday vs 2024-04-19 = Friday).
 */
const encodeDateBytes = ({ year, month, day }: SetDatePayload): number[] => {
  const fullYear = year < 100 ? 2000 + year : year;
  // Use UTC explicitly: the DTO carries grid-local calendar values and the
  // server typically runs in UTC, so we treat year/month/day as a literal
  // calendar date rather than a server-local timestamp.
  const weekday = new Date(Date.UTC(fullYear, month - 1, day)).getUTCDay();
  return [
    toBcd(fullYear % 100),
    toBcd(month),
    toBcd(day),
    toBcd(weekday),
  ];
};

/**
 * Type guard for SetTimePayload. Verifies hour/minute are present as numbers,
 * and that second -- if provided -- is also a number.
 */
const isSetTimePayload = (payload?: RequestPayload): payload is SetTimePayload =>
  !!payload &&
  typeof (payload as SetTimePayload).hour === 'number' &&
  typeof (payload as SetTimePayload).minute === 'number' &&
  ((payload as SetTimePayload).second === undefined || typeof (payload as SetTimePayload).second === 'number')
;

/**
 * Encodes a time-of-day as 3 BCD bytes in the natural (hour-first) order.
 *
 * The encoder pipeline applies (+0x33) per byte and then reverses the array,
 * so the meter receives bytes [second, minute, hour] -- matching the layout
 * used in READ_TIME responses (decoded at bytes 12-14 there). Seconds default
 * to 0 when omitted, mirroring the "HH:MM" convention used elsewhere.
 */
const encodeTimeBytes = ({ hour, minute, second = 0 }: SetTimePayload): number[] => {
  return [
    toBcd(hour),
    toBcd(minute),
    toBcd(second),
  ];
};

/**
 * Encodes a 0-99 decimal value as a single BCD byte (e.g. 26 -> 0x26).
 * Each BCD nibble holds a single decimal digit, so non-integer input is rejected
 * rather than silently truncated by the bitwise OR's Int32 coercion.
 */
const toBcd = (value: number): number => {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error(`BCD value must be an integer in [0, 99], got: ${ value }`);
  }
  return (Math.floor(value / 10) << 4) | (value % 10);
};
