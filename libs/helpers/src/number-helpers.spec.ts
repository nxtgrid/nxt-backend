import { round } from './number-helpers';

describe('Helpers: Number helpers', () => {
  const PI = Math.PI;

  it('Rounds to whole number if passed 0, null, or nothing as precision', () => {
    const roundNumberA = round(PI);
    const roundNumberB = round(PI);
    const roundNumberC = round(PI);
    expect(roundNumberA).toBe(3);
    expect(roundNumberB).toBe(3);
    expect(roundNumberC).toBe(3);
  });

  it('Rounds to precision', () => {
    const round1 = round(PI, 1);
    const round2 = round(PI, 2);
    const round3 = round(PI, 3);
    const round4 = round(PI, 4);
    const round5 = round(PI, 5);
    const round6 = round(PI, 6);
    expect(round1).toBe(3.1);
    expect(round2).toBe(3.14);
    expect(round3).toBe(3.142);
    expect(round4).toBe(3.1416);
    expect(round5).toBe(3.14159);
    expect(round6).toBe(3.141593);
  });

  it('Rounds avoiding JS floating point precision errors', () => {
    // https://medium.com/@borisdedejski/rounding-numbers-on-x-decimal-places-in-javascript-5a4bc26e4149
    const roundedWrongWithMathDotRound = 1234.745;
    const roundedNumber = round(roundedWrongWithMathDotRound, 2);
    expect(roundedNumber).toBe(1234.75);
  });
});
