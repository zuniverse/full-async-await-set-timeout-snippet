# full-async-await-set-timeout-snippet

setTimeout in a full async await environment is a nightmare. Here is a personal solution in javascript.

I added a typescript port.

## fr

### Le problème

**setTimeout est une API callback d'avant les promesses.** Dans une base de code entièrement async/await, c'est le seul truc qui ne s'attend pas - et le réflexe (le promisifier) casse justement ce pour quoi on l'utilisait.

#### 1. setTimeout n'est pas awaitable, mais on ne veut pas l'attendre non plus

Le wrapper classique const sleep = ms => new Promise(r => setTimeout(r, ms)) transforme le délai en quelque chose d'attendable. Sauf qu'ici on ne veut pas bloquer l'appelant pendant 2 minutes : on veut programmer une action différée et rendre la main tout de suite. D'où le commentaire ligne 25 de turnScannerOffAfterDelay.js:25 - hideScannerAfterDelay(...) n'est délibérément pas awaité.

#### 2. Promisifier fait disparaître l'id du timer -> plus d'annulation possible

C'est le point douloureux. Une promesse n'est pas annulable. Si tu écris await sleep(ms), l'id retourné par setTimeout reste prisonnier de la closure du new Promise et tu ne peux plus jamais appeler clearTimeout. Tu perds le comportement de debounce : « rappeler la fonction annule le run en attente et redémarre le délai ».

La solution du snippet est exactement là, à turnScannerOffAfterDelay.js:14 :

`this.timeoutId = setTimeout(res, ms);   // l'id sort de la closure vers l'état d'instance`

L'id est hissé sur l'instance pendant que la promesse, elle, reste à l'intérieur. C'est ce qui permet au clearTimeout(this.timeoutId) du début de méthode d'annuler l'appel précédent.

#### 3. Annuler un timer promisifié laisse une promesse éternellement pending

Corollaire du point 2 : clearTimeout empêche res d'être appelé, donc la promesse ne se résout ni ne rejette jamais. L'await de hideScannerAfterDelay reste suspendu à vie, et avec lui toute la frame de la fonction async. Dans ce snippet, chaque redémarrage du délai laisse ainsi une frame suspendue derrière lui - c'est borné et minuscule, mais c'est la contrepartie assumée du pattern, et c'est typiquement ce qui rend setTimeout + async/await désagréable à raisonner.

#### 4. Les erreurs ne remontent pas là où on les attend

Une exception levée dans un callback setTimeout s'exécute dans un autre tick : aucun try/catch englobant ne l'attrape. Et comme la promesse flotte ici (non awaitée), un rejet de this.hideScanner() part en unhandledRejection au lieu de remonter à l'appelant.

#### 5. La promesse « ment » sur son achèvement

turnScannerOffAfterDelay est async et retourne donc une promesse - mais elle se résout immédiatement, pas quand le scanner est masqué. Un appelant qui fait await controller.turnScannerOffAfterDelay() croit attendre le travail alors qu'il n'attend rien. C'est d'ailleurs le async redondant noté en aside dans TYPESCRIPT.md, et la raison du void du point 4 de ce même fichier : signaler que la promesse flottante est intentionnelle.

#### En résumé

La phrase du README veut dire : dès qu'on veut un timer annulable dans un monde async/await, on est coincé entre une API callback qu'on ne peut pas attendre et une promesse qu'on ne peut pas annuler. Ta solution consiste à ne promisifier que l'attente, en gardant l'id du timer dans l'état de l'instance pour conserver l'annulation.

#### La solution moderne sans frame suspendue depuis node:timers/promises :

AbortSignal règle proprement le cas - setTimeout(cb, ms, { signal }) côté DOM, ou await setTimeout(ms, undefined, { signal }) depuis node:timers/promises, où l'abort rejette la promesse (AbortError) au lieu de la laisser pending.

## Files

| File                                                           | Contents                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| [`turnScannerOffAfterDelay.js`](./turnScannerOffAfterDelay.js) | The snippet, with the original `console.log` traces kept in. |
| [`turnScannerOffAfterDelay.ts`](./turnScannerOffAfterDelay.ts) | TypeScript port, type-checked under `strict`.                |
| [`TYPESCRIPT.md`](./TYPESCRIPT.md)                             | Why the port is typed the way it is.                         |

The block above is the same code with the logging removed, to keep the pattern
readable. Run `npx tsc` to type-check the TypeScript port.
