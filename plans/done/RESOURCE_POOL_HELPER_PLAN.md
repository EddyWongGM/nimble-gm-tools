# Resource Pool Helper Refactor Plan

Last reviewed: 2026-08-22

## Goal

Extract the duplicated clamp/temporary-absorption math out of
`Combatant.ts`'s four `Apply*Change` methods (Mana, Resources, Hit Dice,
Wounds) into one shared pure helper, so the next resource pool (or a bug fix
to an existing one) touches one function instead of four near-identical
copies. Scoped deliberately small — see "Why this scope, not larger" below.

## Why this refactor

`Combatant.ts` currently has four ~25-line methods
([Combatant.ts:380-456](client/Combatant/Combatant.ts#L380-L456),
[Combatant.ts:541-567](client/Combatant/Combatant.ts#L541-L567)) that are
identical in structure and differ only in which field they read/write and,
for Wounds, the sign of `amount`:

```ts
public ApplyManaChange(amount: number) {
  const maxMana = this.MaxMana() ?? 0;
  let currentMana = this.CurrentMana();
  let temporaryMana = this.TemporaryMana();

  if (amount > 0) {
    temporaryMana -= amount;
    if (temporaryMana < 0) {
      currentMana += temporaryMana;
      temporaryMana = 0;
    }
  } else {
    currentMana -= amount;
  }

  if (currentMana < 0) currentMana = 0;
  if (currentMana > maxMana) currentMana = maxMana;

  this.CurrentMana(currentMana);
  this.TemporaryMana(temporaryMana);
}
```

`ApplyResourcesChange`/`ApplyHitDiceChange` are the same block with
`Mana`→`Resources`/`HitDice`. `ApplyWoundsChange` is the same block with the
`amount > 0` branch's arithmetic sign flipped (Wounds' "positive input"
means *add* a wound, not spend a resource — see
[NIMBLE_CONVERSION.md](NIMBLE_CONVERSION.md)'s "Per-combatant resource
pools" table).

This exact duplication already caused a real, shipped bug: `ApplyWoundsChange`
was copy-pasted from `ApplyManaChange` and initially kept Mana's `current -
amount` math, so adding a wound silently did nothing (documented in
NIMBLE_CONVERSION.md's Testing section as "Bug fix: Add Wounds prompt didn't
add wounds"). A shared helper with the sign as an explicit parameter makes
that class of bug structurally harder to reintroduce, since the four call
sites become one-line calls instead of four hand-copied bodies.

## Why this scope, not larger

Reviewed and deliberately excluded from this plan:

- **`CombatantViewModel.ts`'s display/percentage computeds** and
  **`ToPlayerViewCombatantState.ts`'s `Get*Display`/`Get*Color` pairs** are
  *also* duplicated per resource, but each has real per-resource variance
  that doesn't collapse into one shared function as cleanly: Hit Dice/Wounds
  gate on `IsPlayerCharacter()`/`ActsInPlayerPhase()` and only read
  `PlayerHPVerbosity`, while Mana/Resources have no PC gate and read both
  `MonsterHPVerbosity`/`PlayerHPVerbosity`; Wounds additionally hides while
  `CurrentWounds() <= 0` and uses an inverted color gradient. Unifying these
  would mean a parameterized function with as many flags as there are
  differences, which is a wash on readability, not a clear win.
- **A full generic "resource pool" architecture** (a `ResourcePool` class or
  similar wrapping the Knockout observables themselves) is out of scope per
  [AGENTS.md](AGENTS.md)'s guidance to favor incremental changes over broad
  rewrites in this long-lived codebase, and to not introduce new
  architectural elements without explicit confirmation. The project's own
  build history treats each new resource as a deliberate, reviewable clone
  of the previous one (see NIMBLE_CONVERSION.md) — this plan keeps that
  pattern for everything except the one block that has already caused a
  bug.

If the duplication in the view-model/display layer becomes a real pain
point later (e.g. a second sign-convention bug there), revisit those two
files as a separate, later plan — don't fold them into this one.

## Proposed helper

New pure function, `client/Combatant/ApplyResourcePoolChange.ts`:

```ts
export function ApplyResourcePoolChange(
  current: number,
  temporary: number,
  max: number,
  amount: number,
  positiveAmountIncreasesCurrent = false
): { current: number; temporary: number } {
  const sign = positiveAmountIncreasesCurrent ? 1 : -1;
  let newCurrent = current;
  let newTemporary = temporary;

  // amount > 0 is always the "temporary pool absorbs first" case, regardless
  // of sign — for Mana/Resources/Hit Dice that's spending, for Wounds it's
  // an incoming wound (temporary wounds are protection that absorb it).
  if (amount > 0) {
    newTemporary -= amount;
    if (newTemporary < 0) {
      newCurrent += sign * -newTemporary; // apply the overflow, signed
      newTemporary = 0;
    }
  } else {
    newCurrent += sign * amount;
  }

  if (newCurrent < 0) newCurrent = 0;
  if (newCurrent > max) newCurrent = max;

  return { current: newCurrent, temporary: newTemporary };
}
```

`positiveAmountIncreasesCurrent` defaults to `false` (Mana/Resources/Hit
Dice's "positive = spend" convention, `sign = -1`) and is passed `true` only
for Wounds (`sign = +1`). Naming it after the *behavioral* difference (not
e.g. a generic `sign: 1 | -1`) is deliberate — a future reader shouldn't
have to reverse-engineer which sign means what.

**The branch condition must stay `amount > 0`, not a sign-adjusted value.**
An earlier draft of this helper computed a `subtractAmount = sign * amount`
first and branched on `subtractAmount > 0` — that inverts which case is
"absorb into temporary" for the `positiveAmountIncreasesCurrent: true`
path: a positive Wounds amount (adding a wound) would skip the temporary
pool entirely instead of draining it first, and a negative amount (healing)
would incorrectly drain temporary. Verified against the current
implementation by hand, matching the exact scenarios in
`Combatant.test.ts`:

| Scenario | `positiveAmountIncreasesCurrent` | current, temp, max, amount | Result | Matches |
|---|---|---|---|---|
| Mana spend, temp covers it | `false` (sign `-1`) | 10, 5, 20, 3 | current 10, temp 2 | temp absorbs fully, current untouched |
| Mana spend, temp runs out | `false` | 10, 2, 20, 6 | current 6, temp 0 | temp drains to 0, overflow 4 subtracted from current |
| Mana restore | `false` | 6, 0, 20, -3 | current 9, temp 0 | temp untouched, current increases by 3 |
| Wounds add, temp absorbs | `true` (sign `+1`) | 0, 2, 5, 2 | current 0, temp 0 | temp absorbs fully, current untouched |
| Wounds add, temp exhausted | `true` | 0, 0, 5, 2 | current 2, temp 0 | overflow 2 added to current |
| Wounds heal | `true` | 2, 0, 5, -1 | current 1, temp 0 | temp untouched, current decreases by 1 |

Each row matches what `ApplyManaChange`/`ApplyWoundsChange` currently
produce in `Combatant.ts` — use this table as a spot-check while writing
the helper's own tests in step 1.

Each of the four `Combatant.ts` methods becomes:

```ts
public ApplyManaChange(amount: number) {
  const { current, temporary } = ApplyResourcePoolChange(
    this.CurrentMana(),
    this.TemporaryMana(),
    this.MaxMana() ?? 0,
    amount
  );
  this.CurrentMana(current);
  this.TemporaryMana(temporary);
}

public ApplyWoundsChange(amount: number) {
  const { current, temporary } = ApplyResourcePoolChange(
    this.CurrentWounds(),
    this.TemporaryWounds(),
    this.MaxWounds() ?? 0,
    amount,
    /* positiveAmountIncreasesCurrent */ true
  );
  this.CurrentWounds(current);
  this.TemporaryWounds(temporary);
}
```

`ApplyResourcesChange`/`ApplyHitDiceChange` mirror `ApplyManaChange` exactly
(same `positiveAmountIncreasesCurrent: false` default).

`ApplyGoldChange` ([Combatant.ts:458-466](client/Combatant/Combatant.ts#L458-L466))
and `ApplyItemChange`/`RemoveItem`/`MoveItem` are structurally different (no
`max`, no temporary pool for Gold; a list, not a scalar, for Items) and are
untouched by this plan.

## Steps

1. Add `client/Combatant/ApplyResourcePoolChange.ts` with the function above
   and a colocated `ApplyResourcePoolChange.test.ts` covering: spend from
   temporary then spill over; restore without touching temporary; clamp at
   `0`; clamp at `max`; the `positiveAmountIncreasesCurrent: true` case
   (Wounds' add-then-absorb-into-temporary direction) with the same
   spend/restore/clamp cases mirrored.
2. Replace the bodies of `ApplyManaChange`, `ApplyResourcesChange`,
   `ApplyHitDiceChange`, `ApplyWoundsChange` in `Combatant.ts` with calls
   into the helper, per the shape above. Leave method signatures, method
   names, and the `TemporaryX`/`CurrentX` observable names untouched — this
   is an internal implementation swap, not an API change, so nothing
   outside `Combatant.ts` should need to change.
3. Run the existing suite without modification and confirm every existing
   `Apply*Change` test in
   [Combatant.test.ts](client/Combatant/Combatant.test.ts) (spend-from-temp,
   spillover, clamp-at-0, clamp-at-max, restore-without-touching-temporary,
   for Mana/Resources/HitDice/Wounds — see lines 69-193, 441-503) still
   passes unchanged. These tests were written against the *current*
   per-method implementations and are the regression net for this refactor;
   if any of them need to change to pass, that's a signal the helper doesn't
   actually preserve existing behavior and the extraction is wrong, not the
   test.
4. `npx tsc --noEmit -p client/tsconfig.json` (expect 0 errors, per
   [KNOWN-TYPE-ERRORS.md](KNOWN-TYPE-ERRORS.md)'s `skipLibCheck` baseline)
   and `npx jest --config client/jest.config.js` (expect the same
   pass/fail counts as the current baseline — see
   [AGENTS.md](AGENTS.md)'s Testing and Verification section for the 2
   known pre-existing `InitiativeList.test.tsx` failures to not chase).
5. Update documentation to reflect the new shared helper:
   - [AGENTS.md](AGENTS.md)'s High-Risk Areas bullet on Nimble resource
     pools currently warns that copying one resource as a template for
     another has already caused a sign-flip bug. Add a note that the core
     clamp/temporary-absorption math is now centralized in
     `ApplyResourcePoolChange` — that specific failure mode is narrower now,
     though the still-unrefactored `CombatantViewModel.ts`/
     `ToPlayerViewCombatantState.ts` per-resource duplication (see "Why this
     scope, not larger" above) remains a live risk.
   - [NIMBLE_CONVERSION.md](NIMBLE_CONVERSION.md)'s Testing section should
     mention `ApplyResourcePoolChange.ts` as the shared implementation for
     Mana/Resources/Hit Dice/Wounds' spend/restore math, so a future change
     to one resource's sign convention or clamping is made in one place
     instead of re-derived per method.

## Non-goals

- No change to `CombatantViewModel.ts` or `ToPlayerViewCombatantState.ts`
  (see "Why this scope, not larger").
- No change to Gold or Inventory handling.
- No change to any prompt, command, column, or style file — this plan is
  scoped entirely to `Combatant.ts`'s internal math and one new helper file.
- No renaming of the public `Apply*Change` methods or the `CurrentX`/
  `TemporaryX` observables.
