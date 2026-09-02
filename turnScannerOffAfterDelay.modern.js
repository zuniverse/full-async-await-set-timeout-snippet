/**
 * Turn Scanner Off after a delay - AbortSignal version.
 *
 * Same contract as turnScannerOffAfterDelay.js: calling it again cancels the
 * pending run and restarts the delay, and the call returns immediately.
 *
 * The difference: cancelling REJECTS the waiting promise instead of leaving it
 * pending forever, so no async frame stays suspended behind a cleared timer.
 */

/**
 * Cancellable sleep. Works in the browser and in Node.
 * Rejects with an AbortError (signal.reason) when the signal is aborted.
 *
 * Under Node you can drop this helper and use the built-in instead:
 *   import { setTimeout as sleep } from "node:timers/promises";
 *   await sleep(ms, undefined, { signal });   // note the extra `value` argument
 */
const delay = (ms, { signal } = {}) =>
  new Promise((resolve, reject) => {
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

class ScannerController {
  #pending = null; // AbortController of the run currently waiting, if any

  turnScannerOffAfterDelay(delay_in_ms = 2 * 60 * 1000) {
    this.#pending?.abort(); // cancel a previously scheduled run

    const controller = new AbortController();
    this.#pending = controller;

    const hideScannerAfterDelay = async () => {
      await delay(delay_in_ms, { signal: controller.signal });
      this.#pending = null;
      await this.hideScanner();
    };

    // not awaited on purpose, so the caller is not blocked
    hideScannerAfterDelay().catch((err) => {
      if (err?.name === "AbortError") return; // superseded by a newer call: expected
      this.onError(err);
    });
  }

  /** Cancel a pending run without scheduling a new one. */
  cancel() {
    this.#pending?.abort();
    this.#pending = null;
  }

  /** Where a real hideScanner() failure goes, since nobody awaits it. Override as needed. */
  onError(err) {
    console.error("turnScannerOffAfterDelay failed", err);
  }
}
