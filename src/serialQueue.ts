/**
 * Keep asynchronous writes to the same data store in call order, including
 * operations that fail. Used by mobile solo saves to avoid mixed turn snapshots.
 */
export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve()
  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const operation = tail.then(job)
    tail = operation.then(() => undefined, () => undefined)
    return operation
  }
}
