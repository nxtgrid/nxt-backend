export const round = (number: number, precision?: number): number => {
  const _precision = precision == null ? 0 : (precision >= 0 ? Math.min(precision, 292) : Math.max(precision, -292));
  if (_precision) {
    // Shift with exponential notation to avoid floating-point issues.
    // See [MDN](https://mdn.io/round#Examples) for more details.
    let pair = `${ number }e`.split('e');
    const expNumber = Number(`${ pair[0] }e${ +pair[1] + _precision }`);
    const value = Math.round(expNumber);

    pair = `${ value }e`.split('e');
    return +`${ pair[0] }e${ +pair[1] - _precision }`;
  }
  return Math.round(number);
};

export const formatCurrency = (amount: number, currency) => {
  return amount.toLocaleString('en-NG', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Returns a function that converts a value to a safe number.
 * If conversion fails, it returns the provided fallback.
 */
export function toSafeNumberOr<T>(fallback: T): (value: unknown) => number | T {
  return (value: unknown): number | T => {
    // 1. Handle actual numbers
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }

    // 2. Handle strings
    if (typeof value === 'string') {
      if (value.trim() === '') return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    // 3. Reject everything else
    return fallback;
  };
}

// Specific export for typical use cases
export const toSafeNumberOrNull = toSafeNumberOr<null>(null);
export const toSafeNumberOrZero = toSafeNumberOr(0);
