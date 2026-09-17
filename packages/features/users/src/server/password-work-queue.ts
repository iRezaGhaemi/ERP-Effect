import { DomainError } from "@effect-erp/contracts";

const MAX_ACTIVE_PASSWORD_WORK = 2;
const MAX_QUEUED_PASSWORD_WORK = 8;

type QueuedWork = {
  readonly work: () => Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
};

class PasswordWorkQueue {
  private active = 0;
  private readonly queued: QueuedWork[] = [];

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active < MAX_ACTIVE_PASSWORD_WORK) {
      return this.start(work);
    }

    if (this.queued.length >= MAX_QUEUED_PASSWORD_WORK) {
      return Promise.reject(
        new DomainError(
          "PASSWORD_HASH_BUSY",
          "سامانه موقتاً مشغول است؛ لطفاً کمی بعد دوباره تلاش کنید.",
        ),
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.queued.push({
        work,
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
  }

  private start<T>(work: () => Promise<T>): Promise<T> {
    this.active += 1;

    return Promise.resolve()
      .then(work)
      .finally(() => {
        this.active -= 1;
        this.startNext();
      });
  }

  private startNext(): void {
    const next = this.queued.shift();
    if (!next) return;

    void this.start(next.work).then(next.resolve, next.reject);
  }
}

export const passwordWorkQueue = new PasswordWorkQueue();
