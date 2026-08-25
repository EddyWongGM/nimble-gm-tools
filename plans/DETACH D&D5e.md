# Detach D&D 5e

Last reviewed: 2026-08-24

## Context

Per [NIMBLE_CONVERSION.md](../NIMBLE_CONVERSION.md), the conversion so far has
followed one consistent approach: **"D&D-only fields are hidden rather than
removed, so existing D&D content still imports and displays correctly."**
That was the right call for shipping fast, but it means the underlying data
model, importers, and internal math are still almost entirely D&D 5e shaped
underneath a UI layer that hides/relabels a subset of it. This plan inventories
exactly what's still D&D-shaped versus already Nimble-native, and lays out
what finishing the detachment would involve, area by area.

**Trigger example from the user:** Nimble stat blocks use 4 stats (Str, Dex,
Int, Wil), not D&D's 6, and a stat is meant to be *just* a modifier (e.g.
"+2") - there's no player-facing concept of "16 STR" needing a lookup table.
Today the app still stores raw D&D scores (3-20) and computes the modifier at
render time. Fixing that for real - not just hiding the extra 2 stats -
means changing what's actually stored, which has a knock-on effect on
existing saved data and on every importer that currently writes a raw score.
That pattern (cosmetic-only UI change sitting on an unconverted data model)
repeats in several other places below.

## How to read this document

Each area gets: **current state** (data shape + who reads/writes it),
**hidden vs. live** (is the D&D-ness already invisible to users, or still
fully exposed), and **recommendation** or **open question**. Rules-content
questions (does Nimble even have a mechanic here?) are marked as open
questions for the GM/user to answer - this plan doesn't invent Nimble rules
it doesn't have information about.

---

## 1. Ability scores - the motivating example

**Current state**
[`common/StatBlock.ts:6-13`](../common/StatBlock.ts#L6-L13):
```ts
export interface AbilityScores {
  Str: number; Dex: number; Con: number; Cha: number; Int: number; Wis: number;
}
```
All six stored as raw D&D scores (3-20, default 10). Every use site converts
via [`GetModifierFromScore`](../client/Rules/Rules.ts#L20-L22)
(`Math.floor((score - 10) / 2)`) at render/use time - there are 9 call sites
across `Combatant.ts` (initiative, concentration, inventory slots),
`InventorySlots.ts`, `TextEnricher.tsx` (renders any score as a clickable
modifier), and `GetCombatantsSorted.tsx`. No server-side ability math exists.

**Hidden vs. live:** Only 4 of 6 are ever shown -
[`VisibleAbilityNames = ["Str", "Dex", "Int", "Wis"]`](../common/StatBlock.ts#L69-L76)
(with `Wis` relabeled `"Wil"`) drives both the read-only display
(`StatBlock.tsx`) and the editor (`StatBlockEditor.tsx`) - it's a plain array
filter, not CSS. **Cha is fully dead** - stored, imported, and
type-converted, but referenced by zero game logic anywhere. The raw score
(not the modifier) is what a GM actually types into the editor
([`StatBlockEditorFields.tsx:60-71`](../client/StatBlockEditor/components/StatBlockEditorFields.tsx#L60-L71));
only the *read-only display* shows the computed modifier.

**Every importer writes raw scores 1:1**, no conversion at import time:
`Open5eImporter.ts:32-39,200-207`, `StatBlockImporter.ts:51-60` (D&D-app XML
`str`/`dex`/`con`/`int`/`wis`/`cha` attributes).

**Fixed (2026-08-24): Nimble concentration is STR-based, not Con-based**
(confirmed by the user, and independently corroborated by the codebase's own
condition text - `Conditions2025.Concentrating`
([`client/Rules/Conditions.ts:93-95`](../client/Rules/Conditions.ts#L93-L95))
already read *"must make a **DC 10 STR save**"*). `Combatant.ConcentrationBonus`
and `GetConcentrationRoll` were computing from `Abilities.Con`, not
`Abilities.Str` - a live bug, not just stale-data-model residue: the
reference text the app itself showed a GM already documented the correct
Nimble rule, while the actual concentration-check roll silently used the
wrong ability score. Fixed in
[`Combatant.ts:283-286`](../client/Combatant/Combatant.ts#L283-L286)
(`ConcentrationBonus` now reads `Abilities.Str`); `tsc` and the full Jest
suite (55/55 suites, 420 passing) confirmed clean after the change.

With Con's only live use gone, **`AbilityScores` shrinks cleanly to exactly
the 4 shown fields** (`Str/Dex/Int/Wis`) - both Con and Cha confirmed safe to
drop entirely, no open question remaining.

**Recommendation:**
- Store the modifier directly (drop the score→modifier indirection). This
  matches how a Nimble GM actually thinks about a stat block ("+2 STR"), not
  how a D&D one does ("16 STR").
- Drop `Cha` and `Con` entirely - both confirmed zero *correct* live
  references (Con's one use was pointed at the wrong ability to begin with).
- **Migration is required, not optional, once this ships** - see §8.
  Importers (`Open5eImporter.ts`, `StatBlockImporter.ts`) need
  `GetModifierFromScore` moved *into* them (convert-on-import), since their
  source formats (Open5e API, D&D-app XML) will keep giving raw scores
  regardless of what this app stores internally.

## 2. Skills and Saves

**Current state**
[`common/StatBlock.ts:15-18,51-52`](../common/StatBlock.ts#L15-L18): both are
flat `NameAndModifier[]` (`{Name, Modifier}` pairs) - pre-baked numbers, not
derived from `Abilities` or a proficiency bonus at all.
`GetProficiencyBonus` ([`Rules.ts:24-34`](../client/Rules/Rules.ts#L24-L34),
a D&D CR→bonus table) has **zero call sites** - already dead code.

**Hidden vs. live:**
- **Saves**: fully live, shown and editable (`StatBlock.tsx:69`,
  `StatBlockEditor.tsx:235-237`).
- **Skills**: hidden by omission, not by flag - simply absent from both
  components' render lists. Zero UI surface (no display, no editor field)
  despite being fully populated by every importer
  (`Open5eImporter.ts:45-50,225-230`, `StatBlockImporter.ts:85`) and
  type-converted on load (`ConvertStringsToNumbersWhereNeeded.tsx:24`). A
  `.Skills` CSS rule in `statblock.less:370-381` is now dead/unreachable.

**Recommendation:** Since both are already just freeform `{Name, Modifier}`
lists with no D&D mechanical coupling (no live formula ties them to ability
scores or proficiency), neither is technically D&D-locked - they're already
generic enough to represent whatever Nimble calls this. The open question is
purely about UI, not data shape:
- **Open question:** does Nimble have a Skills-equivalent worth exposing, or
  should the field (plus its dead CSS rule and importer-populated-but-unused
  data) be removed outright since nothing has surfaced it in the UI since at
  least the "hide Skills" commit? If there's no plan to ever show it, delete
  it rather than leave it as invisible dead weight.
- Saves can likely stay as-is structurally; only its label/framing may need
  to change if Nimble's defense mechanic isn't "D&D saving throw"-shaped.

## 3. Other StatBlock fields

| Field | D&D-specific? | Hidden or live? | Notes |
|---|---|---|---|
| `Type` | Size+Type+Alignment baked into one free-text string by importers (`Open5eImporter.ts:160-177`, `StatBlockImporter.ts:12-29`) | Live, unrelabeled | No separate `Size`/`Alignment` fields exist - already just an editable string, so not really D&D-*locked*, just D&D-*flavored* by import convention. Low priority - a GM can already type anything here. |
| `HP` / `AC` | Flat numbers (D&D-shaped concept, generic mechanic) | Live; `AC` relabeled "Defense" in both display and editor | Terminology already converted; mechanic (flat number, no formula) was never D&D-locked to begin with. No further action needed. |
| `Challenge` | D&D CR string incl. fractions ("1/8") via `normalizeChallengeRating` ([`Toolbox.ts:44-55`](../common/Toolbox.ts#L44-L55)) | Dual-labeled "Level" (PCs) vs "Challenge" (monsters) at render time, same underlying field/format | **Open question:** does Nimble use CR-style fractional difficulty ratings for monsters, or a flat integer level like PCs? If the latter, monster stat blocks importing from D&D sources would still need CR math converted to *something* Nimble-meaningful - not just a label swap. |
| `DamageVulnerabilities`/`Resistances`/`Immunities`, `ConditionImmunities`, `Senses` | D&D taxonomy by *convention* (values from imported content), but stored as plain `string[]` - no enum constraint anywhere | Live | Not technically D&D-locked in code - already freeform. Whether Nimble mechanically needs vulnerability/resistance/immunity as three separate concepts (vs. D&D's specific interaction with damage types) is a rules question, not a data-model blocker. |
| `Traits`/`Actions`/`Reactions`/`BonusActions`/`LegendaryActions`/`MythicActions` | D&D action-economy categories | All live, separately editable | `MythicActions` already carries a "keep the D&D name internally, relabel 'Other' in the UI" hack for CSS-class continuity ([`StatBlock.tsx:94-101`](../client/Components/StatBlock.tsx#L94-L101)) - the same pattern as spell `Level`→"Tier" below. **Open question:** does Nimble's action economy match D&D's Action/Bonus Action/Reaction/Legendary Action split, or does it need its own categories? If different, this is a bigger structural change than a rename. |

**Recommendation:** none of this row urgently blocks anything technically -
these fields are mostly already freeform strings that happen to carry D&D
conventions from imported content, not hard-coded D&D logic. Treat as
lower-priority than §1/§4, and resolve only once the underlying rules
questions (does Nimble use CR? the same action-economy split?) are answered.

## 4. Spells (`common/Spell.ts`)

**Current state** - full field list:
```ts
export interface Spell extends Listable {
  Source: string; Level: number; School: string; CastingTime: string;
  Range: string; Components: string; Duration: string; Classes: string[];
  Description: string; Ritual: boolean;
}
```

- **`Level`**: same pattern as ability scores - NIMBLE_CONVERSION.md's
  "Level was renamed Tier" is UI-label-only. The field is still literally
  named `Level`, still a raw D&D spell level (0-9), and every importer still
  writes it unconverted (`Open5eImporter.ts:68`, `SpellImporter.ts:44`). If
  Nimble's tier numbering happens to line up 1:1 with D&D's 0-9 range this is
  harmless; if it doesn't, spells are silently mislabeled today.
  **Open question:** confirm Nimble's actual tier range/numbering against
  what's stored.
- **`School`** (D&D's 8 schools), **`Components`** (V/S/M), **`Ritual`**
  (bool), **`Classes`** (D&D class list, e.g.
  `open5eSpell.dnd_class.split(", ")` in `Open5eImporter.ts:74`): all fully
  live and editable (`SpellEditor.tsx:98-118`), all D&D-specific mechanics
  Nimble doesn't obviously use. Unlike the StatBlock fields in §3, these
  aren't freeform-but-conventionally-D&D - they're D&D **mechanics**
  (spell schools, verbal/somatic/material components, ritual casting) that
  either need a Nimble equivalent or don't apply at all.
- **`Concentration`** does not exist as a field - never modeled, nothing to
  detach.

**Recommendation:** this is the most concretely stale area found. Unless
Nimble has direct equivalents, `School`/`Components`/`Ritual`/`Classes` are
strong candidates for the same "hide from UI, leave importer support intact
for legacy D&D content" treatment already applied to Skills - or removal, if
there's no expectation of showing D&D spell data going forward.
**Open question for the user:** does Nimble spellcasting use any of
schools/components/ritual/class-restriction, or should these four be hidden
outright?

## 5. PersistentCharacter

[`common/PersistentCharacter.ts`](../common/PersistentCharacter.ts) (71
lines, read in full) is **already fully generic** - no class/race/background/
alignment/level-progression fields exist here. Its only D&D residue is
transitive, via the embedded `StatBlock` (all of §§1-3) and
`GetTotalLevelFromString` (`PersistentCharacter.ts:50-65`), which parses
`Challenge` for filtering - generic number-parsing, not itself D&D-specific.
**No action needed on this file directly** - fixing §1/§3 fixes this too.

## 6. Importers (`client/Importers/*.ts`)

| Importer | Source format | D&D-specific logic |
|---|---|---|
| `Open5eImporter.ts` (313 lines) | Open5e REST API JSON (v1 + v2/2024 schema) | Heaviest: raw ability scores, save/skill bonus objects, CR normalization, Size+Type+Alignment string building, D&D action-economy buckets, spell level/school/class passthrough |
| `StatBlockImporter.ts` (108 lines) | D&D-app XML `<monster>` nodes | Raw ability attributes, a D&D size-abbreviation table (T/S/M/L/H/G), same Type-string building |
| `SpellImporter.ts` (57 lines) | Same D&D-app XML, `<spell>` nodes | D&D school-initial lookup table, level/components/ritual/classes passthrough |
| `DnDAppFilesImporter.ts` (59 lines) | Orchestrator only (reads the uploaded file, delegates per-node to the two above) | None of its own |

**Recommendation:** keep all four importers - they're the whole reason
existing D&D content can still be used at all, which
NIMBLE_CONVERSION.md explicitly wants to preserve. What changes is *where*
conversion happens: today they write D&D-shaped values straight into
D&D-shaped storage (a no-op copy); once §1 (and possibly §4) change what's
stored, these importers become the place raw-D&D-format → Nimble-format
conversion actually happens, e.g. `GetModifierFromScore` moves from
render-time (`Rules.ts`) into `Open5eImporter.ts`/`StatBlockImporter.ts`
themselves. This is the main implementation cost of §1 - not the type change
itself, but updating both importers plus writing a migration for
already-imported data (§8).

## 7. Conditions (`client/Rules/Conditions.ts`)

Two full lists exist: `Conditions2014` (unmodified D&D 5e conditions, verbatim
rules text) and `Conditions2025` (Nimble-adapted: drops Charmed/Deafened/
Paralyzed/Stunned/Unconscious/Exhaustion, adds Dazed/Dying/Hampered/Riding/
Silenced/Slowed/Taunted, rewrites Concentrating for Nimble's mechanic).

**Confirmed: `Conditions2014` has zero consumers anywhere** - every live
usage site (`TextEnricher.tsx`, `ConditionReferencePrompt.tsx`, `TagPrompt.tsx`)
references `Conditions2025` exclusively. This part of the conversion is
**already fully done** - `Conditions2014` is just orphaned dead code.

**Recommendation: delete `Conditions2014`.** No migration risk - it's a
static reference table, not per-creature persisted data, so nothing reads or
depends on it existing. The one genuinely trivial, zero-risk cleanup in this
whole plan.

## 8. Cross-cutting: migration

This is the part of the user's original framing worth calling out on its
own: **any of the storage-shape changes above (§1 ability scores being the
concrete example) require a one-time migration for already-saved data**, not
just a type change. Today:

- `StatBlock` stamps a `Version` field
  ([`StatBlock.ts:148`](../common/StatBlock.ts#L148)) but **nothing reads it
  to run a migration** - confirmed via search, no `UpdateStatBlock`-style
  function exists anywhere.
- Compare to `Settings`, which already has exactly this pattern:
  [`UpdateSettings(oldSettings: any): Settings`](../client/Settings/Settings.ts#L75),
  invoked on load to bring older saved `Settings` blobs up to the current
  shape. `StatBlock`/`PersistentCharacter`/`Spell` have no equivalent today.

**Recommendation:** before shipping §1 (or any other shape change), add a
`StatBlock`-shape migration function following the same pattern as
`UpdateSettings` - detect old-shape data (e.g. `Abilities.Str` still in the
3-20 range, or simply gate on the stamped `Version`) and run it once through
`GetModifierFromScore` into the new shape, on load. This needs to run
wherever a `StatBlock` is deserialized from IndexedDB/localStorage/Mongo -
the same set of places [IMPROVE_BACKUP_PLAN.md](IMPROVE_BACKUP_PLAN.md)
already mapped for the unrelated backup-format work, so that investigation's
"current backup/restore surfaces" section is a useful map of every place this
migration would need to run too.

## 9. Initiative-related commands

The user flagged 7 commands as D&D-legacy and no longer needed: **Reroll
Initiative, Start Encounter, End Encounter, Next Turn, Previous Turn, Edit
Initiative, Link Initiative.** Traced each one fully - the honest finding is
that only 3 of the 7 are cleanly removable as-is. The other 4 wrap
mechanisms Nimble still depends on (round counting, tag-duration ticking,
reaction resets, the "is combat active" gate `Group Monsters` and player-view
hiding both key off) - those need the D&D-specific *part* stripped out while
keeping the state machine underneath, not a straight deletion.

**Safe to remove outright (D&D-only, no other consumers):**

- **Reroll Initiative** - [`EncounterCommander.RerollInitiative`](../client/Commands/EncounterCommander.ts#L251-L254)
  just re-opens the same dice-roll prompt `StartEncounter` uses. Its only
  other consumer is as an optional callback passed into `NextTurn` for the
  round-wrap auto-reroll behavior (see below) - removing the standalone
  command doesn't touch that.
- **Edit Initiative *(the command)*** - [`CombatantCommander.EditInitiative`](../client/Commands/CombatantCommander.tsx#L759-L762)
  → [`CombatantViewModel.EditInitiative`](../client/Combatant/CombatantViewModel.ts#L243-L263),
  a manual numeric-entry dialog. **But** this same method is also
  auto-invoked, not via any command/toolbar path, whenever a combatant is
  added while the encounter is active
  ([`Encounter.ts:205-207`](../client/Encounter/Encounter.ts#L205-L207), wired
  through `TrackerViewModel.tsx:120-131`) - so deleting the command without
  also replacing that auto-invoked hook breaks "add a monster mid-fight."
  Needs a Nimble-appropriate replacement there (e.g. assign the newcomer to
  a phase/position), not just a deletion.
- **Link Initiative *(the command)*** - [`CombatantCommander.LinkInitiative`](../client/Commands/CombatantCommander.tsx#L800-L817),
  the manual "click one combatant, then another, to link them" flow. Its
  underlying private helper, `linkCombatantInitiatives`
  (`CombatantCommander.tsx:766-786`), is **shared** with `GroupCombatants` -
  the implementation behind "Group Monsters," which Nimble keeps. Confirmed
  `GroupCombatants` calls the shared helper directly, not through the
  `LinkInitiative` command - so the standalone two-combatant-linking command
  and its `LinkInitiativePrompt.tsx` UI can be deleted with **zero** effect
  on Group Monsters.

**Cannot be deleted outright - repurpose, don't remove:**

- **Start Encounter / End Encounter** - these aren't just "roll initiative."
  [`EncounterFlow.StartEncounter`](../client/Encounter/EncounterFlow.ts#L35-L50)
  flips `State` to `"active"`, sets `ActiveCombatant`, and starts round/turn
  timers - `SortByInitiative`/the dice-roll prompt is only *part* of what it
  does. That `"active"`/`"inactive"` state independently gates: tag-duration
  creation ([`TagPrompt.tsx:104-111`](../client/Prompts/TagPrompt.tsx#L104-L111),
  confirmed - "Start Encounter to enable tag durations" is a real, currently
  load-bearing gate, not just copy), whether adding a combatant mid-fight
  triggers the initiative-slot prompt (`Encounter.ts:205-207`), and whether
  Player View hides monsters outside combat
  (`Settings.PlayerView.HideMonstersOutsideEncounter`). **Recommendation:**
  keep the state machine and the Start/End Encounter commands (they still
  make sense as "Start Combat"/"End Combat" without dice) but strip the
  dice-rolling part specifically - have `StartEncounter` call `SortByPhase`
  instead of opening `InitiativePrompt`/rolling `Initiative`. This is the
  one open UX question in this section: does starting combat need any
  prompt at all (e.g. "who goes first, players or monsters?"), or does it
  just activate immediately using whatever `MonstersActFirst` is already
  set to?
- **Next Turn / Previous Turn** - by far the most load-bearing pair.
  [`EncounterFlow.NextTurn`](../client/Encounter/EncounterFlow.ts#L65-L109)
  and [`PreviousTurn`](../client/Encounter/EncounterFlow.ts#L111-L148) don't
  just move `ActiveCombatantId` - they drive round counting
  (`CombatTimer.IncrementCombatRounds`/`DecrementCombatRounds`), the
  `StartOfTurn`/`EndOfTurn` duration-tag increment/decrement engine (Nimble's
  own `Tag`/`DurationTiming` system, kept per NIMBLE_CONVERSION.md), per-turn
  timers, and (on `NextTurn` only) resetting `ReactionsSpent(0)` - Nimble's
  own reaction economy, not a D&D concept. **These must stay** as the "whose
  phase-turn is active" advancement mechanism - only the round-wrap
  auto-reroll sub-behavior inside `NextTurn` (gated by the `AutoRerollInitiativeOption`
  setting) is the actual D&D-only part, and that's a separate, smaller
  removal (see below). Also confirmed: `CombatantCommander.Remove`
  ([`CombatantCommander.tsx:151-175`](../client/Commands/CombatantCommander.tsx#L151-L175))
  calls `EncounterFlow.NextTurn` internally to skip past a deleted active
  combatant - an internal dependency with nothing to do with the toolbar
  button, unaffected either way.

**Related, smaller D&D-only pieces worth removing alongside the above (not
in the user's original list, but the same category):**

- **`AutoRerollInitiativeOption` setting** and its round-wrap behavior inside
  `NextTurn`/`Remove` (`EncounterFlow.ts:80-86`, `rerollInitiativeWithoutPrompt`
  at `EncounterFlow.ts:154-158`) - the auto-reroll-on-round-wrap feature is
  exactly as D&D-only as the manual Reroll Initiative command it's paired
  with. Same fate, separate call site.
- **`InitiativeBonus`/`GetInitiativeRoll`/`InitiativeAdvantage`/
  `InitiativeSpecialRoll`/`InitiativeModifier`** (`Combatant.ts:276-281,
  323-342`; `StatBlock.ts:44-46`) - the dice-roll-with-advantage machinery
  behind Reroll/Edit Initiative's prompts. Removable once those prompts are
  gone, though the plain `Initiative: number` field itself
  (`CombatantState.ts:39`) should **stay** - it's still Group Monsters' and
  drag-to-reorder's (`MoveCombatant`, `Encounter.ts:370-396`) internal sort
  key, just never again presented to a user as a rolled D&D score.

**Bonus dead code found while tracing this (unrelated to the 7 commands, but
in the same area, confirmed unimported anywhere outside their own files):**

- **`client/Reducers/*`** (`EncounterReducer.tsx`, `GetCombatantsSorted.tsx`,
  `Actions.ts`, `EncounterActions.tsx`, `CombatantActions.tsx`,
  `CombatantsReducer.tsx`) - a stale, unwired parallel reimplementation of
  Start/End/Next/Previous Turn as bare `ActiveCombatantId` pointer moves,
  with none of the tag/timer/reaction side effects the live `EncounterFlow`
  has. Not reachable from the running app at all - safe to delete.
- **`client/GetContextualCommandSuggestion.tsx`** - not imported anywhere,
  including its own tests.
- **`TutorialSteps.ts:117-126`** - a commented-out "Next Turn" tutorial step,
  already inert.

## Summary / suggested order

1. ~~§1's `ConcentrationBonus` fix~~ - **done (2026-08-24)**.
2. **§7 Conditions, and §9's dead-code finds** (`client/Reducers/*`,
   `GetContextualCommandSuggestion.tsx`) - trivial, zero-risk, do any time.
3. **§9 Reroll Initiative / Edit Initiative (command) / Link Initiative
   (command)** - also close to zero-risk once each command's one dependent
   call site is handled (Edit Initiative's mid-fight-add hook needs a
   replacement, not just deletion; Reroll and Link Initiative have none).
4. **§8 Migration scaffolding** - build the `UpdateStatBlock`-equivalent
   first, since §1 (and possibly §4) depend on it existing before they can
   ship safely.
5. **§1 Ability scores (storage-shape change)** - the concrete motivating
   example; Con/Cha removal is now unblocked (resolved above), so this is
   gated only on §8 existing first.
6. **§9 Start/End Encounter's dice-roll removal, and
   `AutoRerollInitiativeOption`** - blocked on one UX open question (does
   starting combat need any prompt at all).
7. **§2 Skills** - cheap deletion once the "does Nimble want this at all"
   question is answered; Saves likely needs no structural change.
8. **§4 Spells** - the most concretely stale area (School/Components/
   Ritual/Classes are live D&D mechanics with no Nimble equivalent found) -
   needs the same open questions answered before deciding hide-vs-delete.
9. **§3 misc StatBlock fields** - lowest priority; mostly already freeform
   strings, blocked on rules questions (CR vs. flat level, action-economy
   split) rather than code.

**Not going anywhere:** §9's Next Turn / Previous Turn (minus the auto-reroll
sub-behavior) - they're core Nimble turn/round/tag/reaction infrastructure,
not D&D residue, despite being on the user's original list.

Every open question above needs a Nimble-rules answer from the user before
implementation starts - this plan deliberately stops at "here's exactly what
changes and what it depends on" rather than guessing at rules this codebase
has no record of.
