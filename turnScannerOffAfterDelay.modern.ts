/**
 * Turn Scanner Off after a delay - AbortSignal version.
 * TypeScript port of turnScannerOffAfterDelay.modern.js.
 */

/**
 * Cancellable sleep. Works in the browser and in Node.
 * Rejects with signal.reason (an AbortError) when the signal is aborted.
 *
 * Under Node you can drop this helper and use the built-in instead:
 *   import { setTimeout as sleep } from "node:timers/promises";
 *   await sleep(ms, undefined, { signal });   // note the extra `value` argument
 */
const delay = (ms: number, { signal }: { signal?: AbortSignal } = {}): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/**
 * Under `strict`, a caught value is `unknown`, so the abort case has to be
 * narrowed before `.name` can be read.
 * `err === controller.signal.reason` would be an equally exact test.
 */
const isAbortError = (err: unknown): boolean =>
  err instanceof Error && err.name === "AbortError";

abstract class ScannerController {
  private pending: AbortController | null = null; // the run currently waiting, if any

  /** Actually hides the scanner. Provided by the concrete implementation. */
  protected abstract hideScanner(): Promise<void>;

  /**
   * Turn Scanner Off after a delay.
   * Calling it again cancels the pending run and restarts the delay.
   */
  turnScannerOffAfterDelay(delay_in_ms: number = 2 * 60 * 1000): void {
    this.pending?.abort(); // cancel a previously scheduled run

    const controller = new AbortController();
    this.pending = controller;

    const hideScannerAfterDelay = async (): Promise<void> => {
      await delay(delay_in_ms, { signal: controller.signal });
      this.pending = null;
      await this.hideScanner();
    };

    // not awaited on purpose, so the caller is not blocked; the .catch() is what
    // satisfies @typescript-eslint/no-floating-promises here, so no `void` operator
    hideScannerAfterDelay().catch((err: unknown) => {
      if (isAbortError(err)) return; // superseded by a newer call: expected
      this.onError(err);
    });
  }

  /** Cancel a pending run without scheduling a new one. */
  cancel(): void {
    this.pending?.abort();
    this.pending = null;
  }

  /** Where a real hideScanner() failure goes, since nobody awaits it. Override as needed. */
  protected onError(err: unknown): void {
    console.error("turnScannerOffAfterDelay failed", err);
  }
}

// Makes this file a module: without it, `ScannerController` would collide with
// the one declared in turnScannerOffAfterDelay.ts under the same tsconfig include.
export { ScannerController };
