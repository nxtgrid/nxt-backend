import { pluck } from 'ramda';
import { sleep } from './utilities';
import { mapAsyncSequential } from './promise-helpers';

const BASE_RESOLVE_TIME = 10;

const mockPromiseGenerator = (spyFn?: any) =>
  async ({ resolveWith, resolveWithError, after }) => {
    await sleep(after);
    if(spyFn) spyFn(resolveWith);
    if(resolveWithError) throw new Error('Yes error');
    return resolveWith;
  };

describe('Helpers: Promise helpers: mapAsyncSequential', () => {
  it('Resolves promises in sequence', async () => {
    // Note that timings are different, so if used in a normal
    // Promise.all they would resolve in a different order
    const resolveArr = [
      { resolveWith: 'I', after: BASE_RESOLVE_TIME * 3 },
      { resolveWith: 'resolve', after: BASE_RESOLVE_TIME },
      { resolveWith: 'promises', after: BASE_RESOLVE_TIME * 2 },
      { resolveWith: 'in', after: BASE_RESOLVE_TIME },
      { resolveWith: 'sequence', after: BASE_RESOLVE_TIME * 2 },
      { resolveWith: '🥳', after: BASE_RESOLVE_TIME },
    ];

    jest.useFakeTimers({ advanceTimers: true });
    const spy = jest.fn();
    const promiseGenerator = mockPromiseGenerator(spy);

    const promise = mapAsyncSequential(promiseGenerator)(resolveArr);

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME * 3);
    expect(spy).toHaveBeenLastCalledWith('I');

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME);
    expect(spy).toHaveBeenLastCalledWith('resolve');

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME * 2);
    expect(spy).toHaveBeenLastCalledWith('promises');

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME);
    expect(spy).toHaveBeenLastCalledWith('in');

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME * 2);
    expect(spy).toHaveBeenLastCalledWith('sequence');

    await jest.advanceTimersByTimeAsync(BASE_RESOLVE_TIME);
    expect(spy).toHaveBeenLastCalledWith('🥳');

    promise.then(({ results }) => {
      expect(results).toEqual(pluck('resolveWith', resolveArr));
    });
  });

  it('Can handle errors', async () => {
    const resolveArr = [
      { resolveWith: 'No error', after: BASE_RESOLVE_TIME },
      { resolveWithError: true, after: BASE_RESOLVE_TIME },
    ];

    const { results, errors } = await mapAsyncSequential(mockPromiseGenerator())(resolveArr);
    expect(results).toEqual([ 'No error' ]);
    expect(errors.map(({ error }) => error.message)).toEqual([ 'Yes error' ]);
    expect(errors.map(({ input }) => input)).toEqual([ resolveArr[1] ]);
  });

  it('Does not return an input by default', async () => {
    const resolveArr = [ { resolveWith: 'The input', after: BASE_RESOLVE_TIME } ];
    const { results } = await mapAsyncSequential(mockPromiseGenerator())(resolveArr);
    expect(results[0].input).toBeUndefined();
  });

  it('Does return an input when specified in options', async () => {
    const resolveArr = [ { resolveWith: 'The input', after: BASE_RESOLVE_TIME } ];
    const { results } = await mapAsyncSequential(mockPromiseGenerator(), { returnWithInput: true })(resolveArr);
    expect(results[0].input).toBe(resolveArr[0]);
    expect(results[0].result).toBe('The input');
  });

  it('Can bind the "this" context of a class to the method', async () => {
    const resolveArr = [ { resolveWith: 'Called in proper context', after: BASE_RESOLVE_TIME } ];

    class Test {
      private nestedFn() {
        return 'lala';
      }

      testPromiseGenerator(args) {
        this.nestedFn();
        return mockPromiseGenerator()(args);
      }

      testMethod() {
        return mapAsyncSequential(this.testPromiseGenerator, { context: this })(resolveArr);
      }
    }
    const test = new Test();
    const externallyInjected = await mapAsyncSequential(test.testPromiseGenerator, { context: test })(resolveArr);
    const internallyInjected = await test.testMethod();

    expect(externallyInjected.results[0]).toBe('Called in proper context');
    expect(internallyInjected.results[0]).toBe('Called in proper context');
  });
});
