# TypeScript notes

Companion to [`turnScannerOffAfterDelay.ts`](./turnScannerOffAfterDelay.ts).

Porting the snippet to TypeScript forces four decisions that the JavaScript
version could leave implicit. Each one is a place where the naive translation
does not compile under `--strict`.

## 1. `ReturnType<typeof setTimeout>` for the timer id

```ts
type TimeoutId = ReturnType<typeof setTimeout>;

private timeoutId: TimeoutId | null = null;
```

`setTimeout` returns a `number` in the browser and a `Timeout` object under
Node. Hard-coding either one couples the snippet to a single runtime:
`number` breaks the moment `@types/node` is in scope, `NodeJS.Timeout` breaks
in a DOM-only project.

`ReturnType<typeof setTimeout>` resolves against whichever `lib` the consuming
project configured, so the snippet stays portable.

## 2. Explicit `new Promise<void>`

```ts
new Promise<void>((res) => {
  this.timeoutId = setTimeout(res, ms);
});
```

Without the type argument, TypeScript infers `Promise<unknown>` and types the
resolver as `(value: unknown) => void`. That signature requires an argument,
while `setTimeout` invokes its callback with none — so `setTimeout(res, ms)`
fails to type-check.

Declaring `Promise<void>` makes `res` a zero-argument function and the call
valid. It also documents the real contract: this promise carries no value, it
only marks the passage of time.

## 3. Guarding `clearTimeout`

```ts
if (this.timeoutId !== null) clearTimeout(this.timeoutId);
```

Neither the DOM nor the Node signature of `clearTimeout` accepts `null` — both
stop at `undefined`. Since the field is `TimeoutId | null`, the call needs
narrowing.

A `this.timeoutId ?? undefined` cast would also compile, but the guard states
the intent directly: there is nothing to clear on the first call.

## 4. `void` on the deliberately floating promise

```ts
void hideScannerAfterDelay(delay_in_ms); // do not return or await
```

Not awaiting is the whole point of the snippet — the method must return
immediately and let the timer run on its own. But an unhandled promise is
normally a bug, and `@typescript-eslint/no-floating-promises` flags it.

The `void` operator is the idiomatic way to say *this promise is dropped on
purpose*, which silences the rule and tells the next reader that the omission
was a decision rather than an oversight.

## Aside: the redundant `async`

`turnScannerOffAfterDelay` is declared `async` but never awaits anything; it
returns an already-resolved promise. The keyword can be removed without
changing behaviour. It is kept here to match the original JavaScript snippet.

## Unimplemented dependency

`hideScanner()` is called but never defined in the original snippet. It is
declared `abstract` so the class type-checks:

```ts
protected abstract hideScanner(): Promise<void>;
```

Replace it with a concrete method to get a standalone, instantiable class.
