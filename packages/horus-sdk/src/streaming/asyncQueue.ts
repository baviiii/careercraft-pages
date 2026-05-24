type QueueResolver<T> = (result: IteratorResult<T>) => void;

export class AsyncQueue<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private waiters: QueueResolver<T>[] = [];
  private closed = false;

  enqueue(item: T): void {
    if (this.closed) {
      throw new Error("Queue is closed");
    }

    const nextWaiter = this.waiters.shift();
    if (nextWaiter) {
      nextWaiter({ value: item, done: false });
      return;
    }

    this.queue.push(item);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.({ value: undefined as never, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        const nextItem = this.queue.shift();
        if (nextItem !== undefined) {
          return Promise.resolve({ value: nextItem, done: false });
        }

        if (this.closed) {
          return Promise.resolve({ value: undefined as never, done: true });
        }

        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}