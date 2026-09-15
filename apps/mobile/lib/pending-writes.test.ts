import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingWrites } from './pending-writes';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('pending writes', () => {
  it('answers at once when nothing is waiting', async () => {
    const writes = new PendingWrites();
    let done = false;
    void writes.answered().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it('waits for a write to be answered, then lets it go', async () => {
    const writes = new PendingWrites();
    const write = deferred<string>();
    const handed = writes.track(write.promise, 10_000);
    let done = false;
    void writes.answered().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toBe(false);
    write.resolve('ok');
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    await expect(handed).resolves.toBe('ok');
    expect(writes.size).toBe(0);
  });

  it('treats a failed write as answered', async () => {
    const writes = new PendingWrites();
    const write = deferred<string>();
    const handed = writes.track(write.promise, 10_000);
    handed.catch(() => undefined);
    let done = false;
    void writes.answered().then(() => {
      done = true;
    });
    write.reject(new Error('refused'));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    expect(writes.size).toBe(0);
  });

  it('holds readers back from a write that never answers only once', async () => {
    const writes = new PendingWrites();
    writes.track(new Promise<never>(() => undefined), 10_000);
    let first = false;
    void writes.answered().then(() => {
      first = true;
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(first).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(first).toBe(true);
    expect(writes.size).toBe(0);
    // The hung write is no longer tracked: a later reader does not wait.
    let second = false;
    void writes.answered().then(() => {
      second = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(second).toBe(true);
  });

  it('waits for every write tracked before the reader asked', async () => {
    const writes = new PendingWrites();
    const a = deferred<void>();
    const b = deferred<void>();
    writes.track(a.promise, 10_000);
    writes.track(b.promise, 10_000);
    let done = false;
    void writes.answered().then(() => {
      done = true;
    });
    a.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    b.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });
});
