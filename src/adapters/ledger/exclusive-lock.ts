export function createExclusiveLock() {
  let queue: Promise<unknown> = Promise.resolve();

  return function withLock<T>(operation: () => Promise<T> | T): Promise<T> {
    const run = queue.then(operation, operation);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
