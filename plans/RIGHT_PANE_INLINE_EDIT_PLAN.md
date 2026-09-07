# Investigation: Inline Editing (HP and beyond) in the Right-Side Info Pane

Status: **implemented 2026-09-06.**

Summary of what shipped:
- `EventLog.LogTemporaryHP` added ([EventLog.ts](../client/Widgets/EventLog.ts)).
- `CombatantViewModel` gained an `EventLog` reference plus six apply+log
  methods for inline use — `ApplyHPDelta`, `ApplyTemporaryHPGrant`,
  `ApplyManaDelta`, `ApplyResourcesDelta`, `ApplyHitDiceDelta`,
  `ApplyWoundsDelta` — that call the same mutation methods the modal prompts
  use, then log the same way ([CombatantViewModel.ts](../client/Combatant/CombatantViewModel.ts)).
- A shared `EditableStat` click-to-edit component was added to
  [CombatantDetails.tsx](../client/Combatant/CombatantDetails.tsx), wired to
  all six stats plus a new always-visible Temp HP field. It commits on blur
  and also flushes a pending edit from a `useEffect` cleanup (reading a
  plain ref, not the DOM node) so a selection-change remount can't drop an
  in-flight edit.
- `MultipleCombatantDetails` was left untouched — multi-select still uses
  the modal prompts, per the single-select-only decision.
- New CSS in [statblock.less](../lesscss/components/statblock.less) for the
  editable span, the stat input, and a spacing rule for the new
  `TemporaryHP` label in the `.c-combatant-details__hp` row.
- `tsc --noEmit` and the full `npm test` suite (537 tests) pass.

## Decisions (2026-09-06)

- **Edit semantics:** Delta (+/-), not absolute. Reuse the existing
  `ApplyDamage`/`ApplyHealing`/`ApplyManaChange`/etc. mutation methods —
  no new `SetCurrentHP`-style method needed. The change is relocating the
  input from the modal prompt into the pane, not changing what it does.
- **Scope:** All trackable stats get inline editing, not just HP — HP,
  Mana, Resources, Hit Dice, Wounds, Temporary HP.
- **Multi-select:** Single-select only. Inline editing appears only in the
  single-combatant `CombatantDetails` view; `MultipleCombatantDetails` keeps
  using the existing modal-based bulk `ApplyDamage`/`ApplyHealing` flow.
- **Commit trigger:** Commit on blur, matching the existing inventory
  quantity input pattern already in `CombatantDetails.tsx`. Since
  `CombatantDetails` is remounted via `key={selectedCombatants[0].Combatant.Id}`
  on selection change, blur must fire (and commit) before unmount — verify
  React's blur-before-unmount ordering holds for the selection-change path,
  or add an explicit flush.
- **Modal coexistence:** Keep the modal prompts for multi-select only.
  Single-select uses the new inline fields exclusively — no "apply latest
  dice roll" shortcut needed inline, since that case is now modal-only
  (multi-select).
- **Validation:** Clamp to `[0, max]`. Overheal/negative HP are silently
  clamped rather than allowed through; non-numeric/blank input is ignored,
  mirroring `ApplyDamagePrompt`'s `isNaN` guard.
- **Visual design:** Click-to-edit. Each stat renders as plain text by
  default (as today); clicking reveals a focused input, matching the pane's
  current read-only look until interacted with.
- **Event log:** Inline edits log to the combat Event Log the same way the
  modal prompts do, for all six stats — not just HP/healing. If
  `EventLog.LogHPChange`-equivalent logging doesn't already exist for
  Mana/Resources/Hit Dice/Wounds/Temp HP, that's new logging to add, not
  just a UI relocation.

## Goal

When a combatant is selected, the right-side info pane currently shows
read-only details. Investigate what it would take to let the GM edit HP
(and possibly Mana/Resources/Hit Dice/Wounds/Temporary HP) directly inline
in that pane, instead of going through the existing modal-prompt flow.

## Current architecture (as of 2026-09-06)

### Right pane render path
- [RightColumn.tsx](../client/Layout/RightColumn.tsx) renders
  [SelectedCombatants.tsx](../client/Layout/SelectedCombatants.tsx), which
  subscribes to `combatantCommander.SelectedCombatants` (a Knockout
  `pureComputed` on `CombatantCommander`,
  [CombatantCommander.tsx:61](../client/Commands/CombatantCommander.tsx#L61)).
- Zero selected → placeholder. One selected →
  [CombatantDetails.tsx](../client/Combatant/CombatantDetails.tsx). Multiple
  selected → `MultipleCombatantDetails.tsx`.
- `CombatantDetails` is **read-only**: HP/Mana/Resources/HitDice/Wounds are
  rendered as plain `<span>` text pulled from `CombatantViewModel` observables
  (`HP`, `HPPercentage`, `Mana`, `Resources`, `HitDice`, `Wounds`, ...). There
  is no click handler or input on any of these values today.
- The one piece of inline editing that already exists in this pane is the
  inventory item quantity `<input type="number">` with an `onBlur` handler
  ([CombatantDetails.tsx:421-428](../client/Combatant/CombatantDetails.tsx#L421-L428))
  calling `combatant.ApplyItemChange(...)`. This is the closest existing
  precedent/pattern for a "commit on blur" numeric field.

### How HP editing works today (for comparison)
- Clicking the HP bar in the initiative *row* (not the pane) calls
  `commandContext.ApplyDamageToCombatant(id)`
  ([CombatantRow.tsx:170](../client/InitiativeList/CombatantRow.tsx#L170)).
- That flows to `CombatantCommander.ApplyDamage` /
  `ApplyDamageTargeted` / `ApplyHealing`
  ([CombatantCommander.tsx:224-259](../client/Commands/CombatantCommander.tsx#L224-L259)),
  which builds a **Formik-based modal prompt**
  ([ApplyDamagePrompt.tsx](../client/Prompts/ApplyDamagePrompt.tsx),
  [ApplyHealingPrompt.tsx](../client/Prompts/ApplyHealingPrompt.tsx)) and
  pushes it onto `tracker.PromptQueue`.
- The prompt takes a single numeric delta (not an absolute value) and, on
  submit, calls `combatantViewModel.ApplyDamage(...)` /
  logs the change via `EventLog.LogHPChange`.
- Similar delta-based commands exist for Mana (`ApplyManaPrompt`), and the
  commander has analogous methods for Resources, Hit Dice, and Wounds
  (grep hits in `CombatantCommander.tsx` around lines 261+).

### Underlying data model mutation methods
All on `Combatant.ts`, all delta-based (not "set absolute value"):
- `ApplyDamage(damage: number)` — [Combatant.ts:394](../client/Combatant/Combatant.ts#L394)
- `ApplyHealing(healing: number)` — [Combatant.ts:430](../client/Combatant/Combatant.ts#L430)
- `ApplyManaChange(amount: number)` — [Combatant.ts:441](../client/Combatant/Combatant.ts#L441)
- `ApplyResourcesChange(amount: number)` — [Combatant.ts:452](../client/Combatant/Combatant.ts#L452)
- `ApplyHitDiceChange(amount: number)` — [Combatant.ts:463](../client/Combatant/Combatant.ts#L463)
- `ApplyWoundsChange(amount: number)` — [Combatant.ts:557](../client/Combatant/Combatant.ts#L557)
- `ApplyTemporaryHP(tempHP: number)` — [Combatant.ts:571](../client/Combatant/Combatant.ts#L571)

There is currently **no "set current HP to exact value"** method — everything
is a relative delta applied to current state, and damage/healing are
signed opposites of the same underlying `ApplyDamage`. An inline pane editor
that shows "current/max" and lets the GM type a new "current" number would
need either a new `SetCurrentHP(value)`-style method, or to keep the
existing delta-only prompt UX but move the *input* into the pane rather than
a floating modal.

### Multiplayer/sync considerations
- **Verified 2026-09-06:** `CombatantsReducer.tsx`/`CombatantActions.tsx` is a
  separate, parallel Redux-style path used only from `EncounterReducer.tsx` —
  `CombatantCommander.tsx`'s existing prompt flow never dispatches through it.
  The prompts mutate the Knockout `Combatant` instance directly (e.g.
  `combatant.ApplyDamage(...)`) and Player View/sync pick up the change via
  Knockout's existing observable reactivity, not a reducer action. There is no
  reducer path for inline edits to "match" — they should call the same
  `Combatant.ts` instance methods directly, exactly like the prompts do today.
- `EventLog.Log*Change` fires from the modal prompts via a callback passed
  into each `*Prompt(...)` call (see `CombatantCommander.tsx:224-294`). Inline
  edits should call the same `EventLog` methods the same way, for
  consistency/undo-visibility.

## Remaining open items — resolved 2026-09-06

1. **Event log wiring — mostly done already.** `EventLog.ts` already has
   `LogHPChange`, `LogManaChange`, `LogResourcesChange`, `LogHitDiceChange`,
   and `LogWoundsChange`. Only **`LogTemporaryHP`-equivalent logging is
   missing** and needs to be added; the other five stats need no new logging
   method, just wiring the existing ones into the inline component.
2. **Sync path — no reducer to match.** Confirmed `CombatantCommander`'s
   existing prompts don't use `CombatantsReducer`/`CombatantActions` at all
   (that path is only reachable from `EncounterReducer.tsx`). Inline edits
   should call the `Combatant.ts` instance methods directly, same as the
   prompts — no reducer/action dispatch to plumb in.
3. **Clamping — already implemented, nothing new to build.** `ApplyDamage`
   ([Combatant.ts:394](../client/Combatant/Combatant.ts#L394)) already clamps
   to 0 (respecting `AllowNegativeHP`/Last Stand) and `ApplyHealing`
   ([Combatant.ts:430](../client/Combatant/Combatant.ts#L430)) already clamps
   to max HP. Mana/Resources/Hit Dice/Wounds all route through
   `ApplyResourcePoolChange`
   ([ApplyResourcePoolChange.ts:25-30](../client/Combatant/ApplyResourcePoolChange.ts#L25-L30)),
   which already clamps to `[0, max]`. The "clamp to [0, max]" decision is
   satisfied by the existing mutation methods for all six stats — the inline
   component gets this for free and needs no clamping logic of its own.

## Suggested next step

All UX/behavior decisions are made and all open items above are resolved
against the current code. Implementation is:

1. Add `EventLog.LogTemporaryHP` (the one missing log method).
2. Build a single generic "click-to-edit delta stat" input component,
   parameterized per stat (HP, Mana, Resources, Hit Dice, Wounds, Temp HP),
   modeled on the existing inventory-quantity commit-on-blur pattern
   ([CombatantDetails.tsx:421-428](../client/Combatant/CombatantDetails.tsx#L421-L428)).
3. Wire each instance to call its existing `Combatant.ts` `Apply*` method
   directly (no reducer/action dispatch — see "Sync path" above) plus the
   matching `EventLog.Log*Change` call. No new clamping logic is needed;
   the existing mutation methods already clamp to `[0, max]`.
4. Verify/handle blur-before-unmount for the
   `key={selectedCombatants[0].Combatant.Id}` remount-on-selection-change
   case (see "Commit trigger" decision above).
