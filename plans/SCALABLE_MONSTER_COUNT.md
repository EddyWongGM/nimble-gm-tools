# Scalable Monster Count

**Status: implemented (2026-09-12).**

## Goal

Some Normal-type monsters should author how many copies of themselves to add
per hero, instead of a fixed headcount — e.g. usually 1 monster/hero, but a
GM could author 2 monsters/1 hero (a swarm) or 1 monster/2 heroes (a tougher
solo-ish threat). Adding a party of 4 heroes to an encounter containing a
"2 monsters/hero" Goblin should produce 8 Goblins; a "1 monster/2 heroes"
Ogre should produce 2.

This is a sibling feature to [[scalable_monsters_plan]] (`ScalesWithHeroCount`,
done — see `plans/done/SCALABLE_MONSTERS.md`), which scales a monster's *HP*
per hero. This plan scales *headcount* per hero instead. The two flags are
independent and can be combined on the same monster (e.g. a monster whose HP
**and** count both scale), though that's an unusual, GM-opt-in combination.

**Rounding rule (per user, applies to all Nimble rounding, not just this
feature): round in favor of the heroes.** For monster count that means round
*down* — a party size that doesn't divide evenly into the ratio gets fewer
enemies, never more.

## Worked example

Setup: a GM opens the "Goblin" stat block in the editor, checks **Scalable
count (copies × Hero Count)**, and sets **Monsters per hero** to `2`. That
writes `ScalesCountWithHeroCount: true, MonstersPerHero: 2` onto the Goblin's
stat block. Nothing else about the Goblin changes — same HP, AC, actions.

**1. Live add, mid-session, with a party of 4 heroes already in the tracker**

The GM has 4 heroes in the tracker and clicks "Add" once on Goblin from the
compendium.

- `Encounter.AddCombatantFromStatBlock` reads the flag, computes
  `heroCount = 4`, then `GetHeroScaledMonsterCount = floor(2 × 4) = 8`.
- It adds 8 separate Goblin combatants in that one click — Goblin 1 through
  Goblin 8, each independently rolling its own HP if the stat block uses
  dice notation.
- All 8 share one freshly-generated `ScaledGroupId` (say `"grp-abc"`), invisible
  to the GM, recording "these 8 came from one expansion."

The GM now fights the encounter. Say 3 Goblins die during play — 5 remain,
still all tagged `ScaledGroupId: "grp-abc"`.

**2. Saving the encounter to the library afterward**

The GM clicks "Save Encounter" to keep this fight as a reusable template for
next session. Without the fix, the 5 surviving Goblins (or all 8, if saved
before any died) would be written to the saved encounter as 5 (or 8)
independent `CombatantState` entries, each still flagged
`ScalesCountWithHeroCount: true` — a ticking time bomb for the next load.

Instead, `SaveEncounterPrompt`'s `CollapseScaledGroups` groups the included
Goblins by `ScaledGroupId`, keeps only the first one (say Goblin 2, if
Goblin 1 died), and strips its `ScaledGroupId`. The saved encounter ends up
with exactly **one** Goblin entry — indistinguishable from a hand-authored
template — still carrying `ScalesCountWithHeroCount: true, MonstersPerHero: 2`
on its stat block, but with no group marker.

**3. Loading that saved encounter next session, for a party of 3 heroes**

The GM loads the saved encounter with only 3 heroes in the tracker this
time (one player couldn't make it).

- `EncounterCommander.LoadSavedEncounter` loads the 1 saved Goblin verbatim
  first, then — once the real hero count (3) is known — finds it via
  `StatBlock.IsCountScaledByHeroes`, computes
  `targetCount = floor(2 × 3) = 6`, and adds 5 more copies to reach 6 total.
- The whole new group of 6 gets a brand-new shared `ScaledGroupId`, ready to
  collapse correctly if this encounter is saved again later.

Net effect: the GM authors the Goblin's ratio once, and every future load of
that saved encounter re-derives the right headcount for whatever party
actually shows up — 8 for a 4-hero party, 6 for a 3-hero party, 2 for a
1-hero solo session — without ever needing to hand-edit the saved JSON.

### How a GM saves an entry like this from scratch

There's no separate "author a saved encounter directly" screen — the only
path into a `SavedEncounter` is via the live tracker, then Save:

1. **Flag the monster once**, in the stat block editor (checkbox +
   `MonstersPerHero`). A one-time edit to the Goblin's stat block in the
   compendium/library, not something repeated per encounter.
2. **Add it to the live tracker** — click "Add" on the Goblin from the
   compendium/library (or Quick Add). It self-expands immediately based on
   whatever hero count is live at that moment. It doesn't matter how many
   heroes are present yet or how many Goblins appear here - even a
   hero-less draft defaults `heroCount` to 1 and adds `floor(2 × 1) = 2`.
3. **Click "Save Encounter"** (this UI is mid-rename to "Save Adventure" in
   this codebase as of writing, unrelated to this feature). This snapshots
   the live tracker into a `SavedEncounter`, running `CollapseScaledGroups`
   first - so no matter how many live Goblins existed when the GM hit Save,
   exactly **one** template entry is written, flag intact, group marker
   stripped.

The only way to bypass this is hand-editing a saved encounter's raw JSON via
the editor's "JSON" toggle (`SavedEncounterEditor.tsx`), which skips
`CollapseScaledGroups` entirely - a GM or preload-content author using that
route has to know to author exactly one entry themselves, per the
authoring convention in step 5 above.

**Fractional ratio example (round-in-favor-of-heroes):** an "Ogre"
authored with `MonstersPerHero: 0.5` (1 Ogre per 2 heroes):

| Heroes | `0.5 × heroes` | Ogres added |
|---|---|---|
| 1 | 0.5 | 1 (floored to 0, then clamped up to the minimum of 1) |
| 2 | 1.0 | 1 |
| 3 | 1.5 | 1 (floored down, not rounded up to 2 — favors the heroes) |
| 4 | 2.0 | 2 |
| 5 | 2.5 | 2 (favors the heroes again) |

## Existing mechanism this piggybacks on

- `common/StatBlock.ts`: `IsHeroCountScaled(statBlock)` = Legendary, or
  Normal (`Player === ""`) with `ScalesWithHeroCount`.
- `client/Encounter/Encounter.ts` `AddCombatantFromStatBlock`: computes
  `heroCount = Math.max(1, <PCs currently in encounter>)` and multiplies
  `HP.Value` by it when `IsHeroCountScaled`.
- `client/Commands/EncounterCommander.ts` `LoadSavedEncounter`: saved/preload
  encounters restore each combatant verbatim via `Encounter.AddCombatantFromState`
  (not `AddCombatantFromStatBlock`), so hero-count HP scaling doesn't run
  automatically on load. A separate post-load pass, run once every PC/
  persistent character has been added, computes the real hero count and calls
  `combatant.RescaleHeroCountHP(heroCount)` on every `IsHeroCountScaled`
  combatant. Count-scaling needs the same two-path treatment (live add vs.
  saved-encounter load), detailed below.

## Design

### 1. Schema — `common/StatBlock.ts`

```ts
// Normal monster only (Player === "") - this stat block adds multiple
// copies of itself when added to an encounter, scaled by the party's hero
// count, instead of a single fixed copy.
ScalesCountWithHeroCount?: boolean;
// Copies added per hero. 1 = the traditional 1-monster-per-hero encounter,
// 2 = a swarm (2/hero), 0.5 = a tougher threat (1 monster per 2 heroes).
// Only meaningful when ScalesCountWithHeroCount is set; defaults to 1.
MonstersPerHero?: number;
```

Add helpers next to `IsHeroCountScaled`:

```ts
export const IsCountScaledByHeroes = (statBlock: StatBlock): boolean =>
  statBlock.Player === "" && !!statBlock.ScalesCountWithHeroCount;

// Rounds down (favors heroes - see plan notes) and never returns less than 1;
// a monster the GM placed in the encounter shouldn't be able to round away
// to zero copies.
export const GetHeroScaledMonsterCount = (
  statBlock: StatBlock,
  heroCount: number
): number => {
  if (!IsCountScaledByHeroes(statBlock)) {
    return 1;
  }
  const ratio = statBlock.MonstersPerHero ?? 1;
  return Math.max(1, Math.floor(ratio * Math.max(1, heroCount)));
};
```

### 2. New per-combatant state — `common/CombatantState.ts`

```ts
// Shared by every combatant produced by one count-scaling expansion (see
// SCALABLE_MONSTER_COUNT.md). Lets a later "Save Encounter" collapse a
// currently-expanded group back to a single reusable template instead of
// baking in however many copies happen to exist live right now.
ScaledGroupId?: string;
```

This is the piece that makes the feature safe to round-trip through Save/
Load repeatedly - see step 4. Not needed for HP-scaling, since HP scaling
mutates one existing combatant's number rather than creating/removing
combatant instances, so there's nothing to regroup later.

### 3. Live add — `client/Encounter/Encounter.ts`

`AddCombatantFromStatBlock` currently builds one `initialState`, applies HP
scaling, and pushes one combatant (plus an `HP ×N` tag). Split it:

- Extract everything from building `initialState` through the `HP ×N` tag
  push into a private `addOneCombatantFromStatBlock(statBlock, hideOnAdd,
  variantMaximumHP): Combatant` — unchanged behavior, just a named single-add
  primitive that the count-scaling loop and the load-time top-up (step 5) can
  both call without re-triggering count expansion.
- New `AddCombatantFromStatBlock` body: compute `heroCount = Math.max(1,
  this.combatants().filter(c => c.IsPlayerCharacter()).length)` once, then
  `count = StatBlock.GetHeroScaledMonsterCount(statBlock, heroCount)`. If
  `count > 1`, generate one `groupId = probablyUniqueString()` and stamp it
  (`combatant.ScaledGroupId = groupId`) on every copy created in the loop —
  all members equally, not just the "extras", so step 4's collapse doesn't
  need to special-case which one is primary. Each call independently
  re-derives its own HP-scaling multiplier the same way it does today, so a
  monster with both flags gets correctly-scaled HP on every copy.

This means clicking "Add" once on a compendium monster flagged 2/hero, with
4 heroes in the tracker, adds all 8 copies in that one click — matching what
a GM would expect (no manual repeat-clicking, no separate UI).

### 4. Collapse-on-save — `client/Prompts/SaveEncounterPrompt.tsx`

**Why this step exists:** `SaveEncounter` (`LibrariesCommander.ts:297`)
passes the *live* `Encounter.FullEncounterState()` into this prompt, and
`onSubmit` (`SaveEncounterPrompt.tsx:159-168`) persists
`encounterState.Combatants` filtered only by the GM's Include checkboxes —
no deduplication. Without a fix, saving an encounter that currently has 8
live copies of a 2/hero Goblin (because it was added live, or because a
previously-saved template was loaded, played, and is now being re-saved)
would persist all 8 as independent templates, each still flagged
`ScalesCountWithHeroCount`. Loading that later for a different party size
would expand *each* of the 8 independently - multiplying, not scaling.
This is the default path (build → save → play later), not an edge case, so
it has to be handled, not just documented as a limitation.

**Fix:** this can't happen inside `Encounter.FullEncounterState()` itself -
that computed also feeds the live-session autosave
(`Encounter.ts:485-494`, restored via
`TrackerViewModel.LoadAutoSavedEncounterIfAvailable` → `Encounter.LoadEncounterState`,
a verbatim-restore path, separate from `EncounterCommander.LoadSavedEncounter`,
that must never expand or collapse anything). Collapsing there would delete
live, possibly-already-damaged monsters out of an in-progress fight on every
autosave tick.

Instead, collapse only in the library-save path, in
`SaveEncounterPrompt`'s `onSubmit`, right before building
`savedEncounter.Combatants`: group the included non-character combatants by
`ScaledGroupId` (combatants without one pass through unchanged), keep only
the first member of each group, and strip `ScaledGroupId` from the kept copy
so the saved template is indistinguishable from a fresh hand-authored one
(and the next expansion assigns itself a brand-new id).

Note this also means a GM who deliberately unchecks some-but-not-all copies
of a scaled group in the Include list still gets exactly 1 saved template
(the flag lives on the shared StatBlock, not on a specific count) - they
can't freeze one saved encounter at a fixed non-scaling count for this
monster without turning `ScalesCountWithHeroCount` off on the stat block
itself. Documented trade-off, not fixed here.

### 5. Saved/preload encounter load — `client/Commands/EncounterCommander.ts`

Authoring convention: a saved/preload encounter includes **exactly one**
`CombatantState` for a count-scaled monster (the "template" instance), with
no `ScaledGroupId` set. Step 4 guarantees this for anything saved through
the app; hand-edited JSON that violates it is the one remaining edge case
(see Known Limitations).

At `LoadSavedEncounter`, after the existing hero-count HP-rescale pass
(~line 466-470, once every PC/persistent character is loaded and the real
`heroCount` is known), add a count top-up pass over the same combatant list,
snapshotted *before* any expansion runs (so newly-added copies aren't
themselves re-expanded):

```ts
const countScaledOriginals = this.tracker.Encounter.Combatants().filter(c =>
  StatBlock.IsCountScaledByHeroes(c.StatBlock())
);
countScaledOriginals.forEach(c => {
  const targetCount = StatBlock.GetHeroScaledMonsterCount(
    c.StatBlock(),
    heroCount
  );
  if (targetCount <= 1) return;
  const groupId = probablyUniqueString();
  c.ScaledGroupId = groupId;
  for (let i = 1; i < targetCount; i++) {
    const copy = this.tracker.Encounter.AddSingleCombatantFromStatBlock(
      c.StatBlock(),
      hideOnAdd || c.Hidden()
    );
    copy.ScaledGroupId = groupId;
  }
});
```

This calls a new `Encounter.AddSingleCombatantFromStatBlock` — a thin public
wrapper around the same `addOneCombatantFromStatBlock` primitive from step 3
— deliberately **not** the public `AddCombatantFromStatBlock`, since that one
self-expands by count and would multiply the target instead of topping it up
by the 1 already-loaded original.

### 6. Editor UI — `client/StatBlockEditor/StatBlockEditor.tsx`

Mirror the `ScalesWithHeroCount` checkbox (only shown when `Player === ""`),
as a second, independent checkbox:

```tsx
<label className="c-statblock-editor__checkbox-label">
  <Field type="checkbox" name="ScalesCountWithHeroCount" />
  Scalable count (copies × hero count)
</label>
```

When checked, show the ratio field using the existing reusable `NumberField`
component (`StatBlockEditorFields.tsx:68-73` — already used for other plain
numeric inputs in this editor):

```tsx
<NumberField label="Monsters per hero" fieldName="MonstersPerHero" />
```

plus an `<Info>` blurb:

> This monster is added as multiple copies, scaled by the number of heroes
> already in the encounter: `copies = floor(MonstersPerHero × heroes)`,
> rounded down, minimum 1. Use 2 for a swarm (2 per hero), 0.5 for a tougher
> threat (1 per 2 heroes). Add heroes to the encounter first, or the count
> will under-scale.

Add `MonstersPerHero: 1` to `StatBlock.Default()` so the field shows `1`
rather than blank the first time the checkbox is checked.

### 7. Tests to add

- `client/Combatant/StatBlock.test.ts` — `IsCountScaledByHeroes` and
  `GetHeroScaledMonsterCount`: whole ratios, fractional ratios that round
  down, and the minimum-1 floor at low hero counts.
- `client/Encounter/Encounter.test.ts` — `AddCombatantFromStatBlock` with
  `ScalesCountWithHeroCount: true` adds the right number of combatants for a
  given PC count already in the encounter; a monster with both
  `ScalesWithHeroCount` and `ScalesCountWithHeroCount` gets both correct
  count and correct per-copy HP.
- `client/Commands/EncounterCommander.test.ts` — `LoadSavedEncounter` with a
  single authored count-scaled combatant expands to the target count once
  PCs are loaded (parallel to the existing Legendary/Scalable HP rescale
  test at ~line 494).
- `client/Prompts/SaveEncounterPrompt.test.tsx` (or wherever this prompt is
  currently tested, if at all) — saving an encounter state containing a
  live-expanded group (shared `ScaledGroupId`) collapses it to one
  `CombatantState` with `ScaledGroupId` stripped; combatants with no
  `ScaledGroupId` are unaffected; a group with some members excluded via the
  Include checkboxes still collapses the remaining included members to one.

## Post-implementation fix: top-up pass scoped to the whole tracker, not just this load

Found via real GM usage right after implementation: loading two saved
encounters into the same live tracker back-to-back (e.g. "4.1 Seedling" with
3 heroes present, then "4 Venus Fly Trap" loaded additively on top, without
clearing the tracker in between) produced 6 *extra* Seedlings on the second
load, on top of the 3 already sitting there correctly from the first.

Root cause: step 5's top-up pass filtered
`this.tracker.Encounter.Combatants()` — every combatant currently live in
the tracker — for anything `IsCountScaledByHeroes`, with no check for
whether a given combatant had already been expanded. The first load
correctly turned 1 Seedling template into 3. The second load's pass found
those same 3 Seedlings still sitting in the tracker (unrelated to the
encounter it was actually loading), treated each one as if it were a fresh,
un-expanded template, and topped each one up by `targetCount - 1 = 2` more
copies — 3 × 2 = 6 extra, matching the bug exactly. (The parallel HP-rescale
pass a few lines above has the same "scan the whole tracker" shape but is
safe, because `RescaleHeroCountHP` no-ops when `heroCount` already matches
the combatant's recorded `ScaledHeroCount` — count-scaling's top-up loop had
no equivalent already-done check.)

Fixed in `client/Commands/EncounterCommander.ts` by scoping the top-up pass
to only the combatants *this* `LoadSavedEncounter` call just added, not the
whole live tracker — capturing them via `.map` instead of `.forEach` on the
non-character-combatants add loop:

```ts
const newlyLoadedCombatants = nonCharacterCombatantsInLabelOrder.map(c =>
  this.tracker.Encounter.AddCombatantFromState(
    hideOnAdd ? { ...c, Hidden: true } : c
  )
);
// ...
const countScaledOriginals = newlyLoadedCombatants.filter(c =>
  StatBlock.IsCountScaledByHeroes(c.StatBlock())
);
```

The HP-rescale pass was deliberately left scanning the whole tracker,
unchanged — that "resync everything present, including combatants left over
from an earlier load" behavior is intentional there (and already
idempotent), just not safely reusable for count without also teaching it to
recognize an already-expanded group.

Regression test added in `client/Commands/EncounterCommander.test.ts`:
"Loading a second saved encounter into an already-populated tracker doesn't
re-expand a count-scaled monster left over from the first load" — verified
failing (9 Seedlings instead of 3) against the pre-fix code before
confirming the fix, by temporarily reverting just the two changed lines.

## Known limitations (documenting, not fixing here)

- **Load-time only, like HP scaling.** Adding a PC mid-encounter doesn't
  retroactively spawn more copies of an already-added count-scaled monster,
  same as it doesn't retroactively rescale HP today. Only a fresh
  `AddCombatantFromStatBlock` call or a saved-encounter load re-evaluates the
  ratio.
- **Hand-edited JSON can still bypass the app's own collapse-on-save
  safeguard.** Step 4 guarantees anything saved *through the app* always
  round-trips to one template per group, but nothing stops someone
  hand-authoring 2 un-grouped copies directly in a saved/preload encounter's
  JSON; loading that would still multiply rather than scale. Same class of
  trust-the-author assumption the HP-scaling feature already makes for
  hand-authored content.
- **Difficulty calculator is fine here** (unlike the HP-scaling feature's
  known limitation) — because this feature adds real combatant instances
  rather than inflating one instance's stats, each copy contributes its own
  `Challenge` to the difficulty total automatically.

## Naming (proposed, not yet settled)

- Authored stat block fields: `ScalesCountWithHeroCount` (boolean),
  `MonstersPerHero` (number, default 1).
- New per-combatant persisted state: `ScaledGroupId` (string, optional) —
  unlike HP scaling's `ScaledHeroCount`, this doesn't record a value to
  recover from, just which combatants are siblings from one expansion, so
  "Save Encounter" can collapse them back to a single template (see step 4).
