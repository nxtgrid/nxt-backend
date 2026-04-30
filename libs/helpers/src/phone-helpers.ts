/**
 * Removes the leading '+' from a phone number if present.
 * @param phone - The phone number string to process
 * @returns The phone number without the leading '+'
 */
export const makePhoneCompliantForSupabaseFilter = (phone: string): string =>
  phone.startsWith('+') ? phone.slice(1) : phone;

