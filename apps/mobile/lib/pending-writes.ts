/**
 * Writes still waiting for an answer, so a read that must see them can wait
 * first. Used by the discovery filters: the deck reloads as the filters
 * sheet closes, and a reopened sheet reads the row as it mounts, and
 * neither may read the row from before a drag let go a moment earlier.
 *
 * Each write holds its slot until it is answered or its own deadline
 * passes, whichever is first, and then leaves the set, so nothing is kept
 * once it is done and a write that never answers holds readers back once,
 * for at most its deadline, not every time (review, 2026-09-15: the first
 * version chained every answer for the life of the app and made every
 * later read wait out a hung write's full timeout again).
 */
export class PendingWrites {
  private readonly slots = new Set<Promise<void>>();

  /** Track `pending`; the same promise is handed back to the caller. */
  track<T>(pending: PromiseLike<T>, deadlineMs: number): Promise<T> {
    const write = Promise.resolve(pending);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, deadlineMs);
    });
    const slot: Promise<void> = Promise.race([write, deadline])
      .then(
        () => undefined,
        () => undefined,
      )
      .finally(() => {
        clearTimeout(timer);
        this.slots.delete(slot);
      });
    this.slots.add(slot);
    return write;
  }

  /** Resolves once every write tracked so far is answered or overdue. */
  answered(): Promise<void> {
    return Promise.all([...this.slots]).then(() => undefined);
  }

  /** How many writes are still waiting; for the tests. */
  get size(): number {
    return this.slots.size;
  }
}
