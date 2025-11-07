type TimeoutId = ReturnType<typeof setTimeout>;

abstract class ScannerController {
  private timeoutId: TimeoutId | null = null;

  /** Actually hides the scanner. Provided by the concrete implementation. */
  protected abstract hideScanner(): Promise<void>;

  /**
   * Turn Scanner Off after a delay
   */
  async turnScannerOffAfterDelay(delay_in_ms: number = 2 * 60 * 1000): Promise<void> {
    console.log("call turnScannerOffAfterDelay", delay_in_ms);
    console.log("ClearTimeout id=", this.timeoutId);
    if (this.timeoutId !== null) clearTimeout(this.timeoutId); // clear previously set timeout

    const delayPromiseToHideScanner = (ms: number): Promise<void> =>
      new Promise<void>((res) => {
        this.timeoutId = setTimeout(res, ms);
        console.log("SET Timeout id=", this.timeoutId);
      });

    const hideScannerAfterDelay = async (delayBy: number = 60 * 1000): Promise<void> => {
      await delayPromiseToHideScanner(delayBy);
      console.log(
        `turning Scanner Off After Delay ${delayBy} on timeoutId=${this.timeoutId}`,
      );
      this.timeoutId = null;
      return await this.hideScanner();
    };

    // return await hideScannerAfterDelay(delay_in_ms)
    void hideScannerAfterDelay(delay_in_ms); // do not return or await, to get asynchronous behavior
  }
}
