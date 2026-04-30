import { chunkifyArray, pluckIdsFrom, sliceByPercent } from './array-helpers';

describe('Helpers: Array helpers: chunkifyArray', () => {
  const TEST_ARRAY = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ];

  it('Is immutable and leaves the existing array intact', () => {
    const shallowClone = [ ...TEST_ARRAY ];
    chunkifyArray(TEST_ARRAY, 6);
    expect(TEST_ARRAY).toHaveLength(12);
    expect(TEST_ARRAY).toEqual(shallowClone);
  });

  it('Makes one chunk if length chunksize is exactly array length', () => {
    const chunks = chunkifyArray(TEST_ARRAY, TEST_ARRAY.length);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(12);
  });

  it('Makes one chunk if length chunksize is greater than array length', () => {
    const chunks = chunkifyArray(TEST_ARRAY, 2000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(12);
  });

  it('Can chunk an array in equal parts', () => {
    const chunks = chunkifyArray(TEST_ARRAY, 6);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(6);
    expect(chunks[1]).toHaveLength(6);
  });

  it('Can chunk an array in unequal parts', () => {
    const chunks = chunkifyArray(TEST_ARRAY, 5);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(5);
    expect(chunks[1]).toHaveLength(5);
    expect(chunks[2]).toHaveLength(2);
  });
});

describe('Helpers: Array helpers: pluckIds', () => {
  const TEST_ARRAY = [
    { id: 0, hihi: 'mimi' },
    { id: 1, nest0: { nest1: { nest2: 'poepjes' } } },
    { id: 2 },
    { id: 3, what: { ever: 'my United States of' } },
    { id: 4, lala: 'dada' },
  ];

  it('Returns an array of ids, and only of ids', () => {
    const ids = pluckIdsFrom(TEST_ARRAY);
    expect(ids).toHaveLength(5);
    expect(ids).toEqual([ 0, 1, 2, 3, 4 ]);
  });
});

describe('Helpers: Array helpers: sliceByPercent', () => {
  const TEST_ARRAY = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];

  it('Is immutable and leaves the existing array intact', () => {
    const shallowClone = [ ...TEST_ARRAY ];
    sliceByPercent(50, TEST_ARRAY);
    expect(TEST_ARRAY).toEqual(shallowClone);
  });

  it('Returns an empty array for 0 percent', () => {
    expect(sliceByPercent(0, TEST_ARRAY)).toEqual([]);
  });

  it('Returns the first element for 10 percent', () => {
    expect(sliceByPercent(10, TEST_ARRAY)).toEqual([ 1 ]);
  });

  it('Rounds up to include enough elements for 25 percent', () => {
    expect(sliceByPercent(25, TEST_ARRAY)).toEqual([ 1, 2, 3 ]);
  });

  it('Can return half of the array for 50 percent', () => {
    expect(sliceByPercent(50, TEST_ARRAY)).toEqual([ 1, 2, 3, 4, 5 ]);
  });

  it('Returns the entire array for 100 percent', () => {
    expect(sliceByPercent(100, TEST_ARRAY)).toEqual(TEST_ARRAY);
  });
});
