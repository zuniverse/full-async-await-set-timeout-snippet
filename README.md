# full-async-await-set-timeout-snippet

setTimeout in a full async await enironment is a nightmare. Here is a personal solution.

```js
    /**
     * Turn Scanner Off after a delay
     */
    async turnScannerOffAfterDelay(delay_in_ms = 2 * 60 * 1000) {
      console.log('call turnScannerOffAfterDelay', delay_in_ms)
      console.log('ClearTimeout id=', this.timeoutId)
      clearTimeout(this.timeoutId) // clear previously set timeout
      const delayPromiseToHideScanner = (ms) => new Promise((res) => {
        this.timeoutId = setTimeout(res, ms)
        console.log('SET Timeout id=', this.timeoutId)
      })
      const hideScannerAfterDelay = async (delayBy = 60 * 1000) => {
        await delayPromiseToHideScanner(delayBy)
        console.log(`turning Scanner Off After Delay ${delayBy} on timeoutId=${this.timeoutId}`)
        this.timeoutId = null
        return await this.hideScanner()
      }
      // return await hideScannerAfterDelay(delay_in_ms)
      hideScannerAfterDelay(delay_in_ms) // do not return or await, to get asynchronous behavior
    },
```
