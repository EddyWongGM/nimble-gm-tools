# Known type errors (`ws` fixed for real; Knockout still silenced via `skipLibCheck`)

`npx tsc --noEmit -p client/tsconfig.json` used to report 7 errors, all
inside `node_modules/**/*.d.ts` (none in this project's own source).
`client/tsconfig.json` sets `"skipLibCheck": true`, which silences all of
them regardless of whether the underlying cause is actually fixed.

**As of 2026-08-24, the `ws` error is genuinely fixed** (see below), so with
`skipLibCheck` off there are now only 5 errors, not 7. `skipLibCheck` stays
`true` because the Knockout error and the 5 `esModuleInterop`-shaped errors
are still open.

Reproduce (now clean either way): `npx tsc --noEmit -p client/tsconfig.json`
To see the remaining 5 errors this is silencing: temporarily remove
`skipLibCheck` from `client/tsconfig.json` and re-run.

## Fixed (2026-08-24): `ws` `Server` is not generic

```
node_modules/@types/ws/index.d.ts(334,18): error TS2315: Type 'Server' is
not generic.
node_modules/@types/ws/index.d.ts(334,34): error TS2315: Type 'Server' is
not generic.
```

- **Versions at the time**: `ws@8.21.1`, `@types/ws@8.18.1` (both
  transitive, pulled in by `socket.io`/`engine.io`), against
  `@types/node@12.20.55`.
- **Actual cause (not a duplicate `ws` copy)**: `npm ls ws @types/ws`
  showed only one deduped copy of each - the earlier "conflicting second
  copy" theory was wrong. The real mismatch was `@types/node@^12.20.55`
  (Node 12-era types) versus `engines.node: "^24.0.0"` in
  [package.json](../package.json#L10-L13). `@types/ws@8.18.1` declares its
  `Server` against a version of `http.Server` that's generic - a shape
  `@types/node` didn't add until well after v12 - so against the v12 types,
  `@types/ws`'s own generic `Server<...>` collided with the non-generic
  `http.Server` it was built against.
- **Fix applied**: bumped `@types/node` to `^24.13.3` (matching
  `engines.node`). Verified with `skipLibCheck` temporarily off: the `ws`
  error is gone, zero new client-side errors. It did surface 2 new
  **server**-side errors from the same bump - `@types/node@24`'s
  `cluster.d.ts` doesn't declare `cluster.worker` (only the plural
  `cluster.workers` - looks like a gap in those types, since the property
  still exists at runtime per Node's own docs). Fixed with a one-line cast
  in [server.ts](../server/server.ts#L46-L51), not a cascade.
- **Verification**: full Jest suite unchanged after both changes (same 420
  passing / 2 pre-existing `InitiativeList.test.tsx` failures, before and
  after).

## Still open: Knockout conflicting global `ko` declaration

```
node_modules/@types/knockout/index.d.ts(1192,13): error TS2403: Subsequent
variable declarations must have the same type. Variable 'ko' must be of
type 'typeof import(".../knockout/build/types/knockout")', but here has
type 'KnockoutStatic'.
```

- **Versions**: `knockout@3.5.1`, `@types/knockout@3.4.73`.
- **Cause**: `knockout@3.5.1` ships its own bundled `.d.ts` (
  `knockout/build/types/knockout`), which declares the global `ko`
  differently than the separately-installed `@types/knockout` package does.
  Both get loaded, and TypeScript won't merge two incompatible declarations
  of the same global.
- **Real fix, tested and NOT applied (2026-08-24) - bigger than a "low
  effort" fix, don't mistake this for quick follow-up work.** Actually
  removed `@types/knockout` from `node_modules/@types` (not just the
  devDependency) and re-ran `tsc --noEmit -p client/tsconfig.json` to see
  the true blast radius. It's much larger than "the ~8 files that reference
  `KnockoutObservable`/`KnockoutComputed` directly by name": removing the
  ambient global types also collapses `ko.pureComputed()`/`ko.computed()`
  return-type inference to `unknown` throughout the app, cascading into
  100+ new errors across nearly every major client file (`App.tsx`,
  `CombatantDetails.tsx`, `InitiativeListHost.tsx`, `Layout/*`,
  `Library/*`, and more) - not just the files with direct
  `KnockoutObservable` references. Comparable in scope to the reverted
  `esModuleInterop` attempt below, not a bounded mechanical rename. Change
  fully reverted after the test; nothing left applied.

## Tried and reverted: `esModuleInterop`

The other 5 errors (formik + react-markdown's default-import complaints)
looked like a two-line `esModuleInterop`/`allowSyntheticDefaultImports`
fix. Tried it and it had a much bigger blast radius than `tsc` alone
revealed:

- It did clear those 5 errors with **zero** changes.
- But it broke type-checking in 3 of this project's own source files that
  rely on the *non-interop* CJS-namespace-as-callable pattern
  (`import * as _ from "lodash"` then calling `_(...)` to start a lodash
  chain, in `LibrariesCommander.ts`; `import * as Color from "color"` then
  `Color(...)`, in `CSSFrom.ts`; `import * as Awesomplete from "awesomplete"`
  then `new Awesomplete(...)`, in `AutocompleteTextInput.tsx`). Switching
  those three to default imports (`import _ from "lodash"` etc.) fixed the
  new errors cleanly.
- But then the **full Jest suite broke** - all 38 suites failed with
  `TypeError: Adapter is not a constructor` in
  `client/test/adapterSetup.ts`, which does
  `import * as Adapter from "enzyme-adapter-react-16"; new Adapter()` - the
  same pattern, except `esModuleInterop` changes *runtime* interop
  behavior too (not just type-checking), and `client/tsconfig.jest.json`
  extends `client/tsconfig.json` so ts-jest picked up the flag change.
  That one couldn't be fixed with a one-line import tweak without further
  investigation into what else in the test/build pipeline depends on the
  pre-interop calling convention.

Given a single compiler flag change cascaded from "3 broken source files"
to "the entire test suite broken," this was reverted in full (tsconfig.json
and all three import-statement edits) rather than chased further. Skipped
in favor of `skipLibCheck`, which achieves the same "0 errors" outcome with
none of that risk.

## Verification history

- 2026-08-21: confirmed original 7 errors, all in `node_modules`, no change
  from the baseline noted throughout `NIMBLE-CONVERSION-PLAN.md`'s
  implementation logs across this session's earlier work.
- 2026-08-21: added `skipLibCheck: true` to `client/tsconfig.json`. `tsc
  --noEmit -p client/tsconfig.json` now exits 0. Full Jest suite unchanged
  (198/202 passing, same 2 pre-existing `InitiativeList.test.tsx` failures,
  both before and after).
- 2026-08-24: bumped `@types/node` to `^24.13.3` and fixed the resulting
  `cluster.worker` gap in `server.ts` - genuinely fixes the `ws` error (5
  errors remain with `skipLibCheck` off, down from 7). Separately tested
  (then fully reverted) removing `@types/knockout` to size up that fix -
  confirmed it cascades into 100+ new errors, not a small one. Full Jest
  suite unchanged (420 passing, same 2 pre-existing
  `InitiativeList.test.tsx` failures).
