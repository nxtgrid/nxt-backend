/**
 * Type for valid MQTT measure types from Victron topics
 */
export type VictronMeasureType = 'power_L1' | 'power_L2' | 'power_L3';

/**
 * Type for parsed MQTT message payload from Victron
 */
export type VictronMqttPayload = {
  value: number;
  [key: string]: unknown;
};

/**
 * Compiled regex patterns for MQTT topic matching
 * Using compiled patterns for better performance
 */
const POWER_L1_PATTERN = /\/Ac\/ConsumptionOnOutput\/L1\/Power$/;
const POWER_L2_PATTERN = /\/Ac\/ConsumptionOnOutput\/L2\/Power$/;
const POWER_L3_PATTERN = /\/Ac\/ConsumptionOnOutput\/L3\/Power$/;

/**
 * Checks if the topic array is valid (non-empty array)
 * @param topicArray - Array of topic segments
 * @returns true if the array is valid and non-empty
 */
export const isSafeMqttTopicArray = (topicArray: string[]): boolean =>
  Array.isArray(topicArray) && topicArray.length > 0;

/**
 * Safely parses an MQTT message buffer to JSON
 * @param message - Buffer containing the MQTT message
 * @returns Parsed JSON object or null if parsing fails
 */
export const parseMqttMessageSafe = (message: Buffer): VictronMqttPayload | null => {
  try {
    const parsed = JSON.parse(message.toString());
    return parsed as VictronMqttPayload;
  }
  catch {
    return null;
  }
};

/**
 * Extracts the measure type from a Victron MQTT topic
 * @param topic - MQTT topic string
 * @returns Measure type identifier or null if no match found
 */
export const getMeasureTypeFromMqttTopic = (topic: string): VictronMeasureType | null => {
  if (POWER_L1_PATTERN.test(topic)) return 'power_L1';
  if (POWER_L2_PATTERN.test(topic)) return 'power_L2';
  if (POWER_L3_PATTERN.test(topic)) return 'power_L3';
  return null;
};
