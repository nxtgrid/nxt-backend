import { sleep } from './utilities';

describe('Helpers: Utilities', () => {
  it('Sleeps', async () => {
    const SLEEPY_TIME = 100;
    const SURELY_STILL_SLEEPING = 20;

    jest.useFakeTimers({ advanceTimers: true });
    const spy = jest.fn();
    const start = performance.now();
    sleep(SLEEPY_TIME).then(spy);

    await jest.advanceTimersByTimeAsync(SURELY_STILL_SLEEPING);
    expect(spy).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(SLEEPY_TIME - SURELY_STILL_SLEEPING);
    expect(spy).toHaveBeenCalled();

    const end = performance.now();
    expect(end - start).toBe(SLEEPY_TIME);
  });
});
