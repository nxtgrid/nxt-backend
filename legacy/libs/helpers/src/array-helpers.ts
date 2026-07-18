import { splitEvery, pluck, path as R_path, isNil, sort } from 'ramda';

export const chunkifyArray = <T>(array: T[], chunkSize: number): T[][] =>
  splitEvery(chunkSize, array);

export const pluckIdsFrom = <T extends { id?: number }>(items: T[]): number[] =>
  pluck('id', items);

export const sliceByPercent = (
  percent: number,
  array: any[],
): any[] => array.slice(0, Math.ceil(array.length * percent / 100));

export const orderWith = ({ path, ascending = true, caseInsensitive = true }) => {
  const getter = R_path(path.split('.'));

  const normalize = (val: unknown) => {
    if (isNil(val)) return val;
    return (caseInsensitive && typeof val === 'string')
      ? val.toLowerCase()
      : val
    ;
  };

  const comparator = (_a: unknown, _b: unknown) => {
    const valueA = normalize(getter(_a));
    const valueB = normalize(getter(_b));

    if (isNil(valueA) && isNil(valueB)) return 0;
    // nulls last on ASC, first on DESC
    if (isNil(valueA)) return ascending ? 1 : -1;
    if (isNil(valueB)) return ascending ? -1 : 1;

    return ascending
      ? valueA < valueB ? -1 : valueA > valueB ? 1 : 0
      : valueA > valueB ? -1 : valueA < valueB ? 1 : 0
    ;
  };
  return sort(comparator);
};

export const shuffle = (originalArray: any[]) => {
  const array = [].concat(originalArray);
  let currentIndex = array.length;
  let temporaryValue: any;
  let randomIndex: number;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};
