import { CalinMetaBytes, DecodedLorawanCalinEvent } from './types';
import { PhaseEnum } from '@core/types/device-messaging';

enum CalinControlCode {
  'READING',
  'READING_SUCCESS',
  'READING_FAILURE',
  'WRITING',
  'WRITING_SUCCESS',
  'WRITING_FAILURE',
  'SEND_TOKEN',
  'SEND_TOKEN_SUCCESS',
  'SEND_TOKEN_FAILURE',
}

const CONTROL_CODE_MAP = {
  // Request
  // 0x01: CalinControlCode.READING,
  // 0x04: CalinControlCode.WRITING,
  // 0x00: CalinControlCode.SEND_TOKEN,

  // Response
  0x81: CalinControlCode.READING_SUCCESS,
  0xC1: CalinControlCode.READING_FAILURE,
  0x84: CalinControlCode.WRITING_SUCCESS,
  0xC4: CalinControlCode.WRITING_FAILURE,
  0x80: CalinControlCode.SEND_TOKEN_SUCCESS,
  0xC0: CalinControlCode.SEND_TOKEN_FAILURE,
};

// RESPONSE TO USED TOKEN :: Buffer.from('aCM2MwNwBGjAATTIFg==', 'base64');
// <Buffer 68 23 36 33 03 70 04 68 c0 01 34 c8 16>
// Where c0 is the SEND_TOKEN_FAILURE

/**
 * Decodes a CALIN protocol uplink message from LoRaWAN bytes
 *
 * The CALIN protocol frame structure:
 * - Byte 0: Frame header (0x68)
 * - Bytes 1-6: Meter address (6 bytes, little-endian)
 * - Byte 7: Second frame header (0x68)
 * - Byte 8: Control code
 * - Byte 9: Data size
 * - Bytes 10-11: Data Identifier (DI)
 * - Bytes 12+: Data payload (variable length based on DI)
 * - Byte N-2: Checksum
 * - Byte N-1: End byte (0x16)
 */

export const decodeResponseData = (dataString: string): DecodedLorawanCalinEvent => {
  const bytes = Buffer.from(dataString, 'base64');

  if(bytes[0] === 0x00) return {
    status: 'EXECUTION_SUCCESS',
    data: decodeDLMS(bytes),
  };

  if (
    bytes[0] !== CalinMetaBytes.HEADER_BYTE ||
    bytes[7] !== CalinMetaBytes.HEADER_BYTE ||
    bytes[bytes.length - 1] !== CalinMetaBytes.END_BYTE
  ) {
    console.warn('[LORAWAN CALIN DECODE] Invalid frame headers', bytes);
    return null;
  }

  // Get operation by control code byte
  const operation: CalinControlCode = CONTROL_CODE_MAP[bytes[8]];
  if(!operation) {
    console.warn('[LORAWAN CALIN DECODE] Couldn\'t match control code', bytes[8]);
    return null;
  }

  // Compute checksum: Sum of all bytes from the start up to the byte before checksum (modulo 256)
  const computed_checksum = bytes.subarray(0, bytes.length - 2).reduce((sum, byte) => sum + byte, 0) % 256;
  const received_checksum = bytes[bytes.length - 2];  // The second to last byte is the checksum
  if (computed_checksum !== received_checksum) {
    console.warn(`[LORAWAN CALIN DECODE] Checksum mismatch: Expected ${ computed_checksum } but got ${ received_checksum }`);
  }

  // Early exits for operations that don't need further processing
  if(operation === CalinControlCode.SEND_TOKEN_SUCCESS) return {
    status: 'EXECUTION_SUCCESS',
    data: {
      token_accepted: true,
    },
  };

  if(operation === CalinControlCode.SEND_TOKEN_FAILURE) return {
    status: 'EXECUTION_FAILURE',
    data: {
      token_accepted: false,
    },
    failure_context: {
      reason: 'Delivery was successful but the token was not accepted',
    },
  };

  if(operation === CalinControlCode.WRITING_SUCCESS) return {
    status: 'EXECUTION_SUCCESS',
    data: {
      on_off_toggle_accepted: true,
    },
  };

  if(operation === CalinControlCode.WRITING_FAILURE) return {
    status: 'EXECUTION_FAILURE',
    data: {
      on_off_toggle_accepted: false,
    },
    failure_context: {
      reason: 'Delivery was successful but the command was not (successfully) executed',
    },
  };

  // Data Identifier (DI): Extract bytes 10-11, reverse for little-endian, and format as hex
  // The DI determines which data processor function to use
  const dataIdentifier = '0x' + reverseAndCombine(bytes.subarray(10, 12))
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')
  ;

  const parser = DATA_PROCESSOR_MAP[dataIdentifier];
  if(!parser) {
    console.warn('[LORAWAN CALIN DECODE] Couldn\'t find parser for data identifier', dataIdentifier);
    console.info('Raw bytes:', bytes);
    return null;
  }

  const data = parser(bytes);

  // Special case read report
  // Meter sends these automatically, we didn't
  // dispatch a command to ask for one
  if(dataIdentifier === '0xC111') return {
    status: 'EXECUTION_SUCCESS',
    data,
    unsolicited_event_type: 'READ_REPORT',
  };

  if(operation === CalinControlCode.READING_SUCCESS) return {
    status: 'EXECUTION_SUCCESS',
    data,
  };
  else return {
    status: 'EXECUTION_FAILURE',
    data,
    failure_context: {
      reason: 'Delivery was successful but the readout was not (successfully) executed',
    },
  };
};


/**
 * Decoder functions
**/

// This is currently only implementing READ_POWER_LIMIT
const decodeDLMS = (bytes: Buffer) => {
  const last4Bytes = bytes.subarray(-4);
  return {
    power_limit: hexArrayToNumber(last4Bytes), // Power limit in Watt
  };
};

const decodeReadVoltage = (phase: PhaseEnum) => (bytes: Buffer) => ({
  // Voltage (3 bytes, little-endian, BCD format: XXXX.XX V)
  // Note: Documentation suggests 4 bytes, but testing shows 3 bytes are used
  voltage: bcdToInteger(bytes.subarray(13, 16).map(subtract33H)) / 100,
  phase,
});

const decodeReadPower = (phase: PhaseEnum) => (bytes: Buffer) => ({
  // Power: bytes 12-15 (4 bytes, BCD format, divided by 10 for watts)
  power: bcdToInteger(bytes.subarray(12, 16).map(subtract33H)) / 10,
  phase,
});

const decodeReadCurrent = (phase: PhaseEnum) => (bytes: Buffer) => ({
  // Current: bytes 12-13 (2 bytes, BCD format, divided by 100 for amperes)
  // Note: Similar to voltage which uses 3 bytes, current uses 2 bytes
  current: bcdToInteger(bytes.subarray(12, 14).map(subtract33H)) / 100,
  phase,
});

// Processes Total Active kWh Register data
// function processTotalActiveKwhRead(bytes: Buffer) {
//   // Total Active Kwh Register (4 bytes, little-endian, BCD format: XXXXXX.XX kWh)
//   // Data located at bytes 12-15 (0-indexed)
//   // Note: Documentation suggests 4 bytes, but testing shows otherwise
//   const total_active_kwh = bcdToInteger(bytes.subarray(12, 16).map(subtract33H)) / 100;

//   return {
//     total_active_kwh: `${ total_active_kwh } kWh`,
//   };
// }

// Processes Remaining Credit data
// Extracts credit information including remaining credit amount, credit level, and relay status
const decodeReadCredit = (bytes: Buffer) => ({
  // Credit left: bytes 12-15 (4 bytes, BCD format, divided by 100 for kWh)
  kwh_credit_available: bcdToInteger(bytes.subarray(12, 16).map(subtract33H)) / 100,
  // Credit level: byte 16
  credit_level: subtract33H(bytes[16]),
  // Relay status: byte 17
  is_on: subtract33H(bytes[17]) === 0,
  // Note: Alternative implementation using bit flags would be: !!(relay_status & 0b00000001)
});

// Processes Automatic Periodic Report data (DI: 0xC111)
const decodeReadReport = (bytes: Buffer) => {
  // Extract freeze time: year (byte 13), month (byte 14), day (byte 15), hour (byte 16), minute (byte 17)
  // const freeze_time_year = parseDateTimeByte(bytes[13]);
  // const freeze_time_month = parseDateTimeByte(bytes[14]);
  // const freeze_time_day = parseDateTimeByte(bytes[15]);
  // const freeze_time_hour = parseDateTimeByte(bytes[16]);
  // const freeze_time_minute = parseDateTimeByte(bytes[17]);
  // const freeze_time = `20${ freeze_time_year }-${ freeze_time_month }-${ freeze_time_day } ${ freeze_time_hour }:${ freeze_time_minute }`;

  // Extract freeze time: year (byte 17), month (byte 16), day (byte 15), hour (byte 14), minute (byte 13)
  const freeze_time_year = '20' + parseDateTimeByte(bytes[17]);
  const freeze_time_month = parseDateTimeByte(bytes[16]);
  const freeze_time_day = parseDateTimeByte(bytes[15]);
  const freeze_time_hour = parseDateTimeByte(bytes[14]);
  const freeze_time_minute = parseDateTimeByte(bytes[13]);
  const freeze_time = `${ freeze_time_year }-${ freeze_time_month }-${ freeze_time_day } ${ freeze_time_hour }:${ freeze_time_minute }`;

  // Source 1 data: consumption (bytes 18-21, 4 bytes, divided by 100 for kWh) and remaining purchase (bytes 22-25, 4 bytes as float)
  const consumption_source_1 = reverseAndCombine(bytes.subarray(18, 22)) / 100;
  const purchase_remain_source_1 = processFloatFromBytes(bytes.subarray(22, 26));

  // Source 2 data: consumption (bytes 26-29, 4 bytes, divided by 100 for kWh) and remaining purchase (bytes 30-33, 4 bytes as float)
  const consumption_source_2 = reverseAndCombine(bytes.subarray(26, 30)) / 100;
  const purchase_remain_source_2 = processFloatFromBytes(bytes.subarray(30, 34));

  // Interval demand: bytes 34-37 (4 bytes)
  const interval_demand = reverseAndCombine(bytes.subarray(34, 38));

  // Voltage: bytes 38-39 (2 bytes, divided by 10 for volts)
  const voltage = reverseAndCombine(bytes.subarray(38, 40)) / 10;

  // Current: bytes 40-43 (4 bytes, divided by 1000 for amperes)
  const current = reverseAndCombine(bytes.subarray(40, 44)) / 1000;

  // Meter status byte (byte 44): bit flags indicating various meter conditions
  const meter_status = subtract33H(bytes[44]);

  // Extract individual status flags from the meter_status byte using bitwise AND operations
  const relay_open = !!(meter_status & 0b00000001);
  const battery_low = !!(meter_status & 0b00000010);
  const magnetic_interference = !!(meter_status & 0b00000100);
  const terminal_cover_open = !!(meter_status & 0b00001000);
  const cover_open = !!(meter_status & 0b00010000);
  const source_2_activated = !!(meter_status & 0b00100000);
  const current_reverse = !!(meter_status & 0b01000000);
  const current_unbalance = !!(meter_status & 0b10000000);

  return {
    freeze_time,
    consumption_source_1,
    purchase_remain_source_1,
    consumption_source_2,
    purchase_remain_source_2,
    interval_demand,
    voltage,
    current,
    meter_status: {
      relay_open,
      battery_low,
      magnetic_interference,
      terminal_cover_open,
      cover_open,
      source_2_activated,
      current_reverse,
      current_unbalance,
    },
  };
};

// Processes Read Meter Date data (DI: 0xC010)
// Extracts the current date from the meter's internal clock
const decodeReadDate = (bytes: Buffer) => {
  // Date data is 4 bytes in reverse order: weekday (byte 12), day (byte 13), month (byte 14), year (byte 15, 2-digit)
  // Weekday is available as a single decimal digit at byte 12 (0 = Sunday) but is not returned
  // const weekday = subtract33H(bytes[12]);
  const day = parseDateTimeByte(bytes[13]);
  const month = parseDateTimeByte(bytes[14]);
  const year = '20' + parseDateTimeByte(bytes[15]);

  return { day, month, year };
};

// Processes Read Meter Time data (DI: 0xC011)
// Extracts the current time from the meter's internal clock
const decodeReadTime = (bytes: Buffer) => {
  // Time data is stored in reverse byte order: second (byte 12), minute (byte 13), hour (byte 14)
  const hour = bcdToString([ subtract33H(bytes[14]) ]);
  const minute = bcdToString([ subtract33H(bytes[13]) ]);
  const second = bcdToString([ subtract33H(bytes[12]) ]);

  return { hour, minute, second };
};

// Processes Meter Running Status data (DI: 0xEFF5)
// Extracts meter operational status flags including relay state, generation set status, and credit information
// function decodeMeterRunningStatus(bytes: Buffer) {
//   // Meter status bytes: bytes 12-13 (status_0 and status_1)
//   // Note: Documentation suggests bytes should be reversed for little-endian, but testing shows they are used as-is
//   const meter_status_0 = subtract33H(bytes[12]);
//   const meter_status_1 = subtract33H(bytes[13]);

//   // Extract status flags from meter_status_0 (byte 12)
//   // Note: Some bits are reserved and not used
//   const relay_open = !!(meter_status_0 & 0b00001000);     // Bit 3
//   const gen_set = !!(meter_status_0 & 0b00100000);        // Bit 5
//   const currency_type = !!(meter_status_0 & 0b01000000);  // Bit 6

//   // Extract status flags from meter_status_1 (byte 13)
//   const prepaid_type = !!(meter_status_1 & 0b00000001);   // Bit 0
//   const credit_low = !!(meter_status_1 & 0b00000010);    // Bit 1
//   const friendly_mode = !!(meter_status_1 & 0b00000100);  // Bit 2
//   const credit_use_out = !!(meter_status_1 & 0b00001000); // Bit 3

//   return {
//     relay_open,
//     gen_set,
//     currency_type,
//     prepaid_type,
//     credit_low,
//     friendly_mode,
//     credit_use_out,
//   };
// }

const DATA_PROCESSOR_MAP = {
  // Meter voltage
  '0xB611': decodeReadVoltage('A'),
  '0xB612': decodeReadVoltage('B'),
  '0xB613': decodeReadVoltage('C'),

  // Meter power
  '0xB630': decodeReadPower('A'),
  '0xB631': decodeReadPower('B'),
  '0xB632': decodeReadPower('C'),

  // Meter current
  '0xB621': decodeReadCurrent('A'),
  '0xB622': decodeReadCurrent('B'),
  '0xB623': decodeReadCurrent('C'),

  '0xE421': decodeReadCredit,
  '0xC111': decodeReadReport,

  '0xC010': decodeReadDate,
  '0xC011': decodeReadTime,

  /** Total Active kWh Register data identifier (0x9010) */
  // '0x9010': processTotalActiveKwhRead,


  /** Meter Running Status data identifier (0xEFF5) */
  // '0xEFF5': decodeMeterRunningStatus,
};


/**
 * Helper functions
**/

// Convert the buffer to an integer (assumes unsigned integer)
const hexArrayToNumber = (buffer: Buffer) => buffer.readUIntBE(0, buffer.length);

// Subtracts 0x33 from a byte value (CALIN protocol offset)
const subtract33H = (byte: number) => (byte - 0x33 + 256) % 256;  // Ensure the result stays in the unsigned byte range

// Combines multi-byte fields in little-endian format
const reverseAndCombine = (byteArray: Buffer) =>
  byteArray.reduce((acc, byte, index) => acc + (subtract33H(byte) << (index * 8)), 0);

// Processes a little-endian 32-bit float from 4 bytes
const processFloatFromBytes = (bytes: Buffer) => {
  if (bytes.length !== 4) return null;

  // Apply subtract33H to each byte
  const processedBytes = bytes.map(subtract33H);

  // Reverse the bytes array to handle little-endian encoding
  const reversedBytes = processedBytes.slice().reverse();

  // Convert the reversed bytes into a 32-bit float using IEEE 754
  const floatBuffer = new ArrayBuffer(4);
  const floatView = new DataView(floatBuffer);
  reversedBytes.forEach((byte, index) => floatView.setUint8(index, byte));

  // Extract the float value
  return floatView.getFloat32(0);
};

// Converts a BCD (Binary Coded Decimal) byte array to an integer
const bcdToInteger = (bcdArray: Uint8Array) => {
  const resultStr = Array.from(bcdArray.subarray().reverse())
    .map(byte => {
      // Extract the higher and lower nibble (4 bits each) to get two decimal digits
      const highNibble = (byte >> 4) & 0x0F;
      const lowNibble = byte & 0x0F;
      return `${ highNibble }${ lowNibble }`;
    })
    .join('') // Join the array of strings into one long string
  ;

  // Convert the resulting string into an integer
  return parseInt(resultStr, 10);
};

// Converts a BCD byte array to a hexadecimal string representation
const bcdToString = (bcdArray: number[]) =>
  bcdArray.map(bcd => ('0' + bcd.toString(16)).slice(-2)).join('');

// Specific helper to parse every byte that represents a two digit part of a Datestring
const parseDateTimeByte = (byte: number) => bcdToString([ subtract33H(byte) ]);
