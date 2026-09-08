# Scalable Monsters

## Goal

Some Normal-type monsters (e.g. a special Ghoul) should author their HP as
"per hero" rather than a flat number, so that adding the monster to an
encounter multiplies its HP by the number of heroes currently in the tracker
— e.g. 10 HP/hero × 4 heroes = 40 HP.

This is the same mechanic Legendary monsters already use (`StatBlock.HP.Value`
authored as "per hero", multiplied once on add), just extended to opt-in
Normal (`Player: ""`) monsters instead of being hardcoded to
`Player === "legendary"`.

(A previously-considered second feature — Companions scaling HP by the
party's average Level — has been dropped. Not needed.)

## Existing mechanism (Legendary), for reference

- `client/Encounter/Encounter.ts` `AddCombatantFromStatBlock`: if
  `statBlock.Player === "legendary"`, computes
  `heroCount = Math.max(1, <PCs currently in encounter>)`, multiplies
  `HP.Value *= heroCount`, stores `LegendaryHeroCount` on the
  `CombatantState`, and tags the combatant `HP ×N`.
- `client/Combatant/Combatant.ts` `RescaleLegendaryHP(newHeroCount)`: on
  encounter load, recovers the per-hero base (`HP.Value / oldHeroCount`) and
  re-multiplies for whatever party is actually present, replacing the old
  `HP ×N` tag.
- `client/Commands/EncounterCommander.ts` `LoadSavedEncounter`: after all PCs
  are loaded, computes the real hero count and calls `RescaleLegendaryHP` on
  every Legendary combatant.
- `common/CombatantState.ts` / `Combatant.ts`: `LegendaryHeroCount` persists
  the hero count last scaled for, so a reload can recover the per-hero base.

## Design

### 1. Schema — `common/StatBlock.ts`

- Add `ScalesWithHeroCount?: boolean` to `StatBlock`.
- Only meaningful (and only shown in the editor) when `Player === ""`
  (Normal monster). `HP.Value` (and, if set, `HPMediumArmor`/`HPHeavyArmor` —
  whichever tier `ResolveArmorHP` picks) is interpreted as "per hero" when
  this flag is set, exactly like Legendary already does.

### 2. Generalize the hero-count-scaling mechanism

Rather than duplicating the Legendary multiply/rescale logic for a second
flag, broaden the existing mechanism to cover both triggers
(`Player === "legendary"` OR `ScalesWithHeroCount === true`):

- **`common/StatBlock.ts`**: add
  `IsHeroCountScaled = (sb) => IsLegendary(sb) || (sb.Player === "" && !!sb.ScalesWithHeroCount)`.
  The `Player === ""` check is defense-in-depth against hand-edited/imported
  data setting `ScalesWithHeroCount` on a non-Normal stat block — the editor
  only ever shows the checkbox when `Player === ""`, but the helper
  shouldn't rely solely on that.
- **`client/Encounter/Encounter.ts`** `AddCombatantFromStatBlock`: change the
  `statBlock.Player === "legendary"` check to
  `StatBlock.IsHeroCountScaled(statBlock)`. Everything else (multiply,
  `HP ×N` tag) stays as-is.
- **`client/Combatant/Combatant.ts`**:
  - Rename `LegendaryHeroCount` → `ScaledHeroCount` (mirrors the field it
    replaces — swap "Legendary" for "Scaled" — and matches this file's
    existing noun-phrase naming, e.g. `CurrentHP`, `IndexLabel`). Keep reading
    the old field name as a fallback when loading saved data (same pattern
    already used for the `LastStageHP`→`LastStandHP` and
    `HasEnteredLastStage`→`HasEnteredLastStand` renames in this file), so
    existing saved encounters with Legendary monsters keep working.
  - Rename `RescaleLegendaryHP` → `RescaleHeroCountHP`; change its guard from
    `!StatBlock.IsLegendary(this.StatBlock())` to
    `!StatBlock.IsHeroCountScaled(this.StatBlock())`.
- **`client/Commands/EncounterCommander.ts`** `LoadSavedEncounter`: change the
  rescale-on-load check from `StatBlock.IsLegendary(...)` to
  `StatBlock.IsHeroCountScaled(...)`, call `RescaleHeroCountHP`.
- **`common/CombatantState.ts`**: rename `LegendaryHeroCount?: number` →
  `ScaledHeroCount?: number` (old field read via a cast in the migration
  fallback above, not part of the typed shape going forward).
- **`common/PlayerViewCombatantState.ts`**: no change — `IsLegendary` there
  only drives a cosmetic CSS class in Player View
  (`PlayerViewCombatant.tsx`), and a Scalable Ghoul should look like a normal
  monster, not get the Legendary styling/badge.
- **`client/InitiativeList/InitiativeList.tsx`**: no change — the
  "Legendary monsters are exempt from numbering" logic stays
  Legendary-only. Scalable monsters aren't solo-by-design (a GM can still add
  several Ghouls), so they keep normal per-name numbering.

### 3. Editor UI — `client/StatBlockEditor/StatBlockEditor.tsx`

- Add a checkbox next to the existing Player/Armor toggle, shown only when
  `api.values.Player === ""`. There's no standalone `Checkbox` component in
  this codebase — the existing pattern (see `ResourcesStartEmpty` in
  `StatBlockEditorFields.tsx:35-39`) is a plain Formik
  `<Field type="checkbox" name="ScalesWithHeroCount" />` wrapped in a
  `c-statblock-editor__checkbox-label` label:
  ```tsx
  <label className="c-statblock-editor__checkbox-label">
    <Field type="checkbox" name="ScalesWithHeroCount" />
    Scalable (HP × Hero Count)
  </label>
  ```
- When checked, show an `<Info>` blurb mirroring the Legendary one:
  > This monster's max HP is multiplied by the number of heroes already in
  > the encounter, calculated once when it's added to the tracker. Add heroes
  > to the encounter first, or the multiplier will under-count.
- No changes needed to the HP fields themselves — same `ValueAndNotesField`
  for `HP`/`HPMediumArmor`/`HPHeavyArmor`, just reinterpreted as "per hero"
  when `ScalesWithHeroCount` is on (same as Legendary's `HP.Value` already
  is).

### 4. Tests to update/add

- `client/Commands/EncounterCommander.test.ts` (existing Legendary rescale
  test at ~line 494) — add an equivalent case for a Scalable Normal monster.
- `client/Encounter/Encounter.test.ts` — add a case for
  `AddCombatantFromStatBlock` with `ScalesWithHeroCount: true`, `Player: ""`.
- `client/Combatant/StatBlock.test.ts` — cover `IsHeroCountScaled`.
- Search for any other direct references to `LegendaryHeroCount` /
  `RescaleLegendaryHP` before renaming, to make sure nothing is missed (grep
  turned up: `Combatant.ts`, `Encounter.ts`, `CombatantState.ts`,
  `EncounterCommander.ts`, `EncounterCommander.test.ts` — no other call
  sites as of this writing).

## Known limitation

`ScalesWithHeroCount` only affects HP. It does **not** change how the
monster counts toward the encounter Difficulty calculator
(`Encounter.ts:71-103`) — Legendary/Titan get special treatment there
specifically because their `Challenge` is judged against the whole party at
once, but a Scalable monster stays a plain Normal monster for that
calculation, contributing its authored `Challenge` exactly once regardless
of how much its HP actually grew. A GM using this flag needs to manually set
`Challenge` to reflect the scaled threat, or the difficulty estimate will
under-count for a large party. Out of scope for this plan; flagging so it
isn't mistaken for a bug later.

## Naming (settled)

- Authored stat block field: `ScalesWithHeroCount` (boolean).
- Per-combatant scaling state: `ScaledHeroCount` (number), replacing
  `LegendaryHeroCount`.
