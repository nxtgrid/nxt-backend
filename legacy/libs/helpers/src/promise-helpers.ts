type PromiseGenerator = (...args: any[]) => Promise<any>
interface Options {
  returnWithInput?: boolean;
  context?: unknown;
}

interface ReturnData {
  results: any[]
  errors: { input: any; error: Error; }[]
}

export const mapAsyncSequential = (generatorFn: PromiseGenerator, options?: Options) =>
  async (arr: unknown[]): Promise<ReturnData> => {
    const { returnWithInput = false, context } = options || {};
    const _generatorFn = context ? generatorFn.bind(context) : generatorFn;

    const returnObj = { results: [], errors: [] };

    for (const input of arr) {
      try {
        const result = await _generatorFn(input);
        returnObj.results = [ ...returnObj.results, returnWithInput ? { input, result } : result ];
      }
      catch(err) {
      // For errors we always return the originating item so the unhappy path can be handled smartly
        returnObj.errors = [ ...returnObj.errors, { input, error: err } ];
      }
    }

    return returnObj;
  }
;
