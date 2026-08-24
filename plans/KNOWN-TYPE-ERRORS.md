# Known type errors (resolved via `skipLibCheck`, root causes still open)

`npx tsc --noEmit -p client/tsconfig.json` used to report 7 errors, all
inside `node_modules/**/*.d.ts` (none in this project's own source). As of
this session, `client/tsconfig.json` sets `"skipLibCheck": true`, which
silences all 7 (verified: `tsc --noEmit` now exits 0, and the full Jest
suite is unchanged - same 198/202 passing, same 2 pre-existing failures in
`InitiativeList.test.tsx`, before and after).

`skipLibCheck` only skips type-*checking* of `.d.ts` declaration files -
it doesn't change emitted JS or module interop behavior, so it's a
type-checking-only, zero-runtime-risk change. It does **not** actually fix
the two underlying dependency-typing conflicts below - it just stops them
from failing the build. Both are still open if someone wants to properly
resolve rather than silence them.

Reproduce (now clean): `npx tsc --noEmit -p client/tsconfig.json`
To see the errors this is silencing: temporarily remove `skipLibCheck` from
`client/tsconfig.json` and re-run.

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
- **Real fix**: remove the `@types/knockout` devDependency entirely and
  rely solely on knockout's bundled types. Not attempted this session -
  needs a pass over the codebase afterward, since the bundled types may be
  structured/typed slightly differently than `@types/knockout`'s
  `KnockoutStatic`, so some call sites could need adjustment. Bigger and
  riskier than a "low effort" fix, so left for later.

## Still open: `ws` `Server` is not generic

```
node_modules/@types/ws/index.d.ts(334,18): error TS2315: Type 'Server' is
not generic.
node_modules/@types/ws/index.d.ts(334,34): error TS2315: Type 'Server' is
not generic.
```

- **Versions**: `ws@8.21.1`, `@types/ws@8.18.1` (both transitive - not
  direct dependencies of this project; likely pulled in by `socket.io`/
  `engine.io`).
- **Cause**: `@types/ws@8.18.1` declares `Server<...>` as generic, but
  something else in the dependency graph (another `.d.ts`, possibly from a
  different `ws`/`socket.io`-adjacent types package) declares a non-generic
  `Server` that merges with it.
- **Real fix**: `npm ls ws` / `npm ls @types/ws` to find the conflicting
  second copy, then dedupe/pin so only one version graph exists. Not
  attempted this session.

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
