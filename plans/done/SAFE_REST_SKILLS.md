# Trackable ability charges ("2/Safe Rest", "1/Encounter" etc.)

## Problem

Stat block abilities (`Traits`/`Actions`/`Reactions`/`BonusActions`) already
carry a free-text `Usage` field (`common/StatBlock.ts:39`) that authors fill
in with things like `2/Safe Rest`, `1/Encounter`, `Recharge 5-6`. Today it's
purely a display label — `StatBlockComponent` prints it next to the ability
name (`client/Components/StatBlock.tsx:261`) but nothing tracks how many
charges a specific combatant has spent. The GM has to remember by hand.

Note: real starter-set content puts this info inline in `Description` prose
instead (e.g. `preload-content/compendium_starter_set.json:214`, `"(1/Safe
Rest) End poison on yourself..."`) — every stat block's dedicated `Usage`
field is currently blank. This feature only lights up for abilities authored
through the `Usage` field going forward; parsing arbitrary `Description`
prose is out of scope (too fragile). Existing inline mentions keep displaying
as plain prose, unaffected.

Two reset triggers are in scope:
- **`N/Safe Rest`** — resets when the party takes a Safe Rest.
  `performSafeRest` (`client/Commands/EncounterCommander.ts:369-382`)
  already resets HP, Hit Dice, Mana, Resources, and ticks down a Wound on
  every PC there; per-ability Safe Rest charges reset alongside them.
- **`N/Encounter`** — resets once every monster/NPC has been removed from
  the encounter view (see "Reset on encounter end" below).

## Scope decision: parse `Usage`, don't reshape `StatBlock`

`StatBlock` is shared compendium data (imported/exported, edited via
`StatBlockEditorFields.tsx`, and baked into `preload-content/*.json`).
Turning `Usage` into a structured `{ Max, RechargeOn }` field would touch the
editor, the importer, every preload file, and back-compat migration in
`StatBlock.Update`. That's a lot of surface for a feature that only needs to
recognize two patterns.

Instead, parse the existing free-text `Usage` string at render/use time:

```
/^\s*(\d+)\s*\/\s*Safe Rest\s*$/i
/^\s*(\d+)\s*\/\s*Encounter\s*$/i
```

If either matches, the ability has `N` charges that reset on that trigger.
Anything that doesn't match (`Recharge 5-6`, empty, prose) is left as a plain
label, unchanged from today. This is additive and needs no compendium
migration — existing `"Usage": "2/Safe Rest"` text starts working the moment
the parser ships.

Put the parser in `common/StatBlock.ts` as an exported helper:

```ts
type ChargeResetTrigger = "safe-rest" | "encounter";
StatBlock.ParseChargeUsage(usage: string):
  { max: number; resetOn: ChargeResetTrigger } | null
```

so both the UI and the reset logic share one definition of the pattern.

## Data model: charges used, per combatant, per ability

Follow the existing `ReactionsSpent` pattern (`common/CombatantState.ts:36`,
`client/Combatant/Combatant.ts:86`) rather than inventing a new subsystem.
Add to `CombatantState` (`common/CombatantState.ts`):

```ts
// Keyed by ability Name. Only present for abilities with a parsed charge
// Usage (Safe Rest or Encounter); absence means 0 used. A Name->count map
// (not an array-of-structs) keeps lookups O(1) and survives ability
// reordering in the editor. Which reset trigger applies to a given key is
// NOT stored here - it's derived by re-parsing that ability's Usage on the
// combatant's current StatBlock whenever a reset trigger fires (see below).
AbilityChargesUsed?: Record<string, number>;
```

Mirror it in `Combatant.ts`:
- `public AbilityChargesUsed = ko.observable<Record<string, number>>({});`
- restore it in `processCombatantState` (`Combatant.ts:114`, alongside
  `ReactionsSpent`), defaulting to `{}`.
- serialize it in the `ToCombatantState`-equivalent block near
  `Combatant.ts:652` (where `ReactionsSpent: this.ReactionsSpent()` is
  written today).

Add a mutator, e.g. `CombatantViewModel.SetAbilityChargesUsed(abilityName,
count)` (same home as `ToggleSpentReaction`,
`CombatantViewModel.ts:326-332`, for consistency with how the reactions
toggle is exposed to the UI):
- clamps `count` to `[0, max]`
- writes a new object into `Combatant.AbilityChargesUsed` (Knockout
  observable, so replace not mutate) with that key set, or removed entirely
  when `count === 0` (keeps the map free of zero-valued clutter, matching
  how `ReactionsSpent` treats 0 as "absent/default" rather than storing
  explicit zeroes everywhere)

The pip UI (below) calls this directly with the clicked pip's target count,
rather than a plain toggle/increment — see "UI: pips" for why.

## Reset on Safe Rest

Because the map can now hold both Safe-Rest- and Encounter-scoped entries,
`performSafeRest` (`EncounterCommander.ts:369-382`) can no longer just blank
the whole map — it must clear only the keys whose ability currently parses
to `resetOn: "safe-rest"`:

```ts
pc.AbilityChargesUsed(
  clearChargesForTrigger(pc.AbilityChargesUsed(), pc.StatBlock(), "safe-rest")
);
```

Add `clearChargesForTrigger(used, statBlock, trigger)` as a small shared
helper (e.g. next to `ParseChargeUsage`, or as a `Combatant` method) that
walks the stat block's `Traits`/`Actions`/`Reactions`/`BonusActions`, and for
every ability whose `Usage` parses to the given `trigger`, deletes that
ability's key from `used`. Entries for abilities that no longer exist on the
stat block (renamed/removed in the editor) are harmless leftovers and can be
dropped the same way or just ignored — they won't render anywhere without a
matching ability name.

## Reset on encounter end (`N/Encounter`)

"All monsters removed from the view" is a single choke point already:
`Encounter.flushCombatant` (`client/Encounter/Encounter.ts:359-386`) is
where every combatant removal actually lands — whether triggered by
`ClearEncounter`, `CleanEncounter` (`EncounterCommander.ts:336-363`), or a
one-at-a-time manual remove/drag-off. It already computes
`remainingCombatants` right after removing the flushed combatant
(`Encounter.ts:371`).

Add, right after that computation:

```ts
const noMonstersRemain = remainingCombatants.every(c =>
  c.ActsInPlayerPhase()
);
if (noMonstersRemain) {
  remainingCombatants
    .filter(c => c.ActsInPlayerPhase())
    .forEach(c =>
      c.AbilityChargesUsed(
        clearChargesForTrigger(c.AbilityChargesUsed(), c.StatBlock(), "encounter")
      )
    );
}
```

`ActsInPlayerPhase` (`common/StatBlock.ts:197`, exposed on `Combatant` as
used already in `CleanEncounter` via `!c.Combatant.ActsInPlayerPhase()`)
distinguishes PCs/companions from monsters, so this fires exactly when the
last NPC leaves the tracker, regardless of whether any PCs remain. It
naturally covers `ClearEncounter` and `CleanEncounter` for free, since both
funnel through this same removal path — no separate hook needed in either
command.

## Persistent Characters (confirmed: charges persist across sessions)

`PersistentCharacter` (`common/PersistentCharacter.ts:13-16`) already mirrors
`CurrentMana`/`CurrentResources`/etc. so a PC's resource pools survive
between encounters/sessions. `AbilityChargesUsed` follows the same path:

- add `AbilityChargesUsed?: Record<string, number>` to `PersistentCharacter`
- subscribe to it in `AttachToPersistentCharacterLibrary`
  (`Combatant.ts:188-219`), same shape as the `CurrentResources.subscribe`
  block at line 208, so every toggle writes through to the library like HP/
  Mana/Resources/Hit Dice already do.
- a Safe Rest performed while the PC is in an active encounter goes through
  `performSafeRest` → the `clearChargesForTrigger(..., "safe-rest")` write
  described above → the subscription above persists the trimmed map to the
  library automatically, same path `CurrentWounds` etc. already take. No
  separate "Safe Rest outside combat" entry point exists today (Safe Rest is
  only invoked from `EncounterCommander`), so no new persistence trigger is
  needed beyond wiring the subscription.

## UI: pips (confirmed)

`StatBlockComponent` (`client/Components/StatBlock.tsx`) renders abilities
for both the read-only Library view and the in-combat "active" display
(`displayMode === "active"`, used via `CombatantDetails.tsx:316-322`). Only
the active mode has a live combatant to track state against — the Library
view is just compendium data with no combatant.

Plan:
- Add optional props to `StatBlockComponent`: `abilityChargesUsed?:
  Record<string, number>` and `onSetAbilityCharge?: (abilityName: string,
  count: number) => void` (count = the clicked pip's target value, per
  `SetAbilityChargesUsed`'s signature above).
- `CombatantDetails.tsx` passes both through, sourced from
  `useSubscription(props.combatantViewModel.Combatant.AbilityChargesUsed)`
  and `props.combatantViewModel.SetAbilityChargesUsed`.
- At `StatBlock.tsx:261`, where `power.Usage` is rendered, branch: if
  `StatBlock.ParseChargeUsage(power.Usage)` returns a result and
  `abilityChargesUsed` was passed (i.e. we're in combat, not the Library),
  render `N` clickable pips instead of the plain text — filled pip = used
  charge, regardless of whether `resetOn` is `"safe-rest"` or `"encounter"`
  (the pips look identical; only the reset trigger differs, invisibly to the
  GM clicking them). Clicking pip `i` sets used count to `i+1` (or to `i` if
  it was already at `i+1`, to allow un-spending by clicking the last lit pip
  again — more precise than a simple increment-and-wrap, and matches how
  players actually correct misclicks). Fall back to the current plain-text
  label otherwise (Library view, or a `Usage` string that isn't
  `N/Safe Rest` or `N/Encounter`).

## Also check on implementation

- Players can see their own remaining charges (confirmed) — mirror
  `AbilityChargesUsed` into the Player View state the same way
  `ReactionsSpent` already is: add the field to
  `common/PlayerViewCombatantState.ts:30` and populate it in
  `client/Combatant/ToPlayerViewCombatantState.ts:51`. This only needs to
  carry the raw `Record<string, number>` map — the Player View side derives
  max/resetOn by re-parsing `Usage` from the stat block it already has,
  same as the GM-side pip rendering does.
- `client/Encounter/EncounterFlow.ts:106` resets `ReactionsSpent` at
  start-of-turn — do NOT add any `AbilityChargesUsed` reset there; both
  Safe-Rest- and Encounter-scoped charges must persist across turns/rounds,
  only clearing at their respective trigger (Safe Rest command, or last
  monster leaving the tracker).
- Existing encounter saves have no `AbilityChargesUsed` key; the `?? {}`
  fallback in `processCombatantState` handles that with no migration step
  needed.
- `Encounter.flushCombatant` already has an adjacent `this.combatants()
  .length == 0` check that calls `EncounterFlow.EndEncounter()`
  (`Encounter.ts:383-385`). The new "no monsters remain" check is
  deliberately separate from that — a PC-only party (monsters gone, PCs
  still present) should reset `N/Encounter` charges even though the
  encounter-empty branch doesn't fire.

## Resolved decisions

1. **Pips**, not a typed-number field — confirmed.
2. **`N/Encounter` is in scope**, resetting when the last monster/NPC is
   removed from the tracker (see "Reset on encounter end" above), alongside
   `N/Safe Rest`.
3. **Players see their own remaining charges** in Player View, same
   visibility level as their HP/Resources.
