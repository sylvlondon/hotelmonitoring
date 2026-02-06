const BACKOFF_MS = [2000, 5000, 10000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < BACKOFF_MS.length; i += 1) {
    const attempt = i + 1;
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (i < BACKOFF_MS.length - 1) {
        await sleep(BACKOFF_MS[i]);
      }
    }
  }

  throw lastError;
}
