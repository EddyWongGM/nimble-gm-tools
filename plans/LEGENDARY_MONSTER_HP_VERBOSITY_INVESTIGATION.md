# Legendary Monster HP Verbosity Customization: Investigation

**Status:** superseded by [MONSTER_VERBOSITY.md](MONSTER_VERBOSITY.md), which
has the settled design — read that one first. This doc is kept for its
open-question history. One correction: the "Decisions so far" section below
assumed the stat-color feature's `PlayerViewState.hasEpicInitiative`
server-side plumbing would be needed for Epic-gating; it isn't — see
MONSTER_VERBOSITY.md's "Correction to the investigation doc's tentative
gating plan" for why `GetHPDisplay` can read `env.HasEpicInitiative` directly
instead.

## The ask

A Legendary-tier monster feature: let a monster's HP-state *labels* vary by
flavor instead of always using the fixed "Bloodied" wording — e.g. an undead
or ooze/slime creature narratively can't be "Bloodied" (no blood to lose), so
its qualitative HP display (and/or its mechanical bloodied-trigger
convention) should say something else, or skip that state entirely. The
request doesn't yet say which of two different mechanics this touches (see
below) — this doc scans both before any design decision is made.

## Two different things currently called "Bloodied" in this codebase

These are separate mechanisms today and don't share code. A real plan needs
to know which one (or both) the feature is about.

### 1. Player View's qualitative HP label (`HpVerbosityOption`, GM-wide setting)

- [common/PlayerViewSettings.ts:1-14](../common/PlayerViewSettings.ts#L1-L14)
  — `HpVerbosityOption` enum (`Actual HP` / `Colored Label` / `Monochrome
  Label` / `Damage Taken` / `Hide All`), set globally via two settings,
  `MonsterHPVerbosity` and `PlayerHPVerbosity` (one knob for *all* monsters,
  one for *all* PCs — not per-creature).
- [client/Combatant/ToPlayerViewCombatantState.ts:75-103](../client/Combatant/ToPlayerViewCombatantState.ts#L75-L103)
  (`GetHPDisplay`) is where the actual "Bloodied" string is hardcoded: under
  `Colored Label`/`Monochrome Label`, `currentHP < maxHP / 2` renders
  `<span class='bloodiedHP'>Bloodied</span>`, else `Hurt` or `Healthy`
  (`Defeated` at 0). The exact same `< maxHP/2` cutoff and `bloodiedHP` CSS
  class are duplicated three more times in the same file for Mana
  ([:136](../client/Combatant/ToPlayerViewCombatantState.ts#L136), labeled
  `Low`), Resources ([:197](../client/Combatant/ToPlayerViewCombatantState.ts#L197),
  `Low`), and Wounds ([:325](../client/Combatant/ToPlayerViewCombatantState.ts#L325),
  `Wounded`, inverted since Wounds counts up) — any change to "what counts as
  bloodied" would need to decide whether it touches only HP or all four.
- `GetHPColor` ([:405-421](../client/Combatant/ToPlayerViewCombatantState.ts#L405-L421))
  is a *separate*, continuous red↔green gradient (`currentHP/maxHP`), not a
  discrete cutoff — it has no "bloodied" concept to remove, so a
  label-only change wouldn't affect it.
- This system applies to **every combatant** (PCs via `PlayerHPVerbosity`,
  every monster tier via `MonsterHPVerbosity`) — it has no concept of
  Legendary-only, and no concept of monster `Type` at all today.

### 2. The "BLOODIED:" Legendary Action convention (a Nimble game-rule pattern, not engine-enforced)

Several preloaded Legendary monsters already use "Bloodied" as an ability
trigger, e.g.
[preload-content/monster_starter_set.json:1459-1465](../preload-content/monster_starter_set.json#L1459-L1465):
```json
"LegendaryActions": [
  { "Name": "BLOODIED: ", "Content": "...Krogg loses Medium Armor but his damage increases to 2d8.", "Usage": "" }
]
```
This is pure free text — `NameAndContent` ([common/StatBlock.ts:41-45](../common/StatBlock.ts#L41-L45))
has no `Trigger` field or bloodied-detection logic anywhere in the codebase.
The GM types "BLOODIED:" as a literal ability name and narrates it
themselves when they notice the monster crossed half HP; nothing in the app
currently reads or enforces this threshold. That means "an undead Legendary
monster can't be Bloodied" is *already fully expressible today* for this half
of the feature — the GM just doesn't write a "BLOODIED:" action for it, or
names the trigger something else ("SHATTERED:", "DISSOLVED:"). There's no
missing capability here unless the ask is to make this convention
code-aware (e.g. auto-flagging or auto-triggering it), which is a much
bigger scope than a label change.

## Where Legendary-tier gating already exists (precedent to follow)

- [common/StatBlock.ts:353-354](../common/StatBlock.ts#L353-L354) —
  `StatBlock.IsLegendary = (sb) => sb.Player == "legendary"`. This is the
  monster-tier concept ("Normal" / `"legendary"` / `"titan"` in the `Player`
  discriminator) — **not** the same thing as the Patreon `HasEpicInitiative`/
  `HasMythic` subscription-tier flags in
  [common/ClientEnvironment.ts:6-7](../common/ClientEnvironment.ts#L6-L7),
  which gate unrelated GM-account features (stat colors, custom CSS, Player
  View extras) and have no "Legendary" tier at all (see
  [server/patreon.ts:31-41](../server/patreon.ts#L31-L41) — tiers are Account
  Sync / Epic / Mythic only). **This needs to be confirmed with the user
  before scoping** — see Open Questions.
- [client/StatBlockEditor/StatBlockEditor.tsx:261-270](../client/StatBlockEditor/StatBlockEditor.tsx#L261-L270)
  is the existing pattern for a Legendary-only field: `if (player ===
  "legendary") { fields.push(<ValueAndNotesField fieldName="LastStandHP" .../>) }`.
  A new Legendary-only customization field would follow this same shape.
- [common/StatBlock.ts:139-150](../common/StatBlock.ts#L139-L150) (`FilterDimensions`)
  documents that `Type` is **free text** ("Goblin", "Boss" — whatever the GM
  typed), explicitly *not* a fixed D&D creature-type taxonomy. There is no
  `"undead"` / `"ooze"` enum anywhere in the data model. This is the biggest
  open gap for the "undead or slimes" framing specifically: detecting
  "this monster is undead" from `Type` today means fragile substring
  matching on GM-authored free text, not a reliable lookup.
- `CustomFields?: NameAndContent[]` ([common/StatBlock.ts:113](../common/StatBlock.ts#L113))
  is the one existing generic extension point on `StatBlock` for
  GM-authored key/value data without a schema change — worth considering as
  a low-effort carrier for an opt-out flag/label override instead of a new
  typed field, though it's currently just display text, not something other
  code reads and branches on.

## What "verbosity variations and customizations" could mean

1. **A per-Legendary-monster opt-out flag** (e.g. `NoBloodiedState?:
   boolean`, gated the same way `LastStandHP` is) that changes `GetHPDisplay`
   to skip the `Bloodied` bucket for that one combatant — jumps straight from
   `Healthy`/`Hurt` to `Defeated`, or collapses `Bloodied` into `Hurt`. GM
   sets it by hand per monster; no `Type` text-matching needed. Smallest,
   most reliable scope.
2. **A per-Legendary-monster custom label override** (e.g. a `BloodiedLabel:
   string` field, blank = default "Bloodied") so a GM can rename the state
   ("Shattered" for a construct, "Dissolving" for an ooze) rather than only
   suppressing it. Slightly more schema than option 1, more flavorful.
3. **Automatic Type-driven presets** ("if Type contains 'undead' or
   'ooze'/'slime', no Bloodied state by default") — most matches the "what
   if undead or slimes" phrasing literally, but requires either inventing a
   creature-type taxonomy (a real schema addition/migration, and a stance on
   what happens to the hundreds of already-authored `Type` strings in
   `preload-content/*.json`) or fragile substring matching on free text that
   was explicitly designed *not* to be a controlled vocabulary
   ([common/StatBlock.ts:143-147](../common/StatBlock.ts#L143-L147)). Biggest
   scope and the shakiest foundation of the three.
4. **Extending the same customization to the "BLOODIED:" action-name
   convention** — e.g. auto-detecting a `LegendaryActions` entry named
   "BLOODIED:" and refusing/warning if the monster is flagged as "can't be
   bloodied," or auto-renaming it. Not clearly needed per the analysis
   above (this half is already GM-controlled free text with zero engine
   involvement) — likely out of scope unless the user specifically wants
   engine enforcement here too.

These aren't mutually exclusive (1 could ship alone; 2 could layer on top of
1; 3 could later reuse whichever field 1/2 introduce as its output rather
than reinventing storage).

## Decisions so far

- **Scope is mechanism #1 only (Player View's `GetHPDisplay` label).**
  Mechanism #2 (the GM-authored "BLOODIED:" Legendary Action naming
  convention) stays exactly as-is — the GM's own view keeps "BLOODIED"
  unchanged; only what Player View shows is meant to be adjustable.
- **Custom label override, not just suppression** (resolves Open Q2). A GM
  can type a replacement word per monster (e.g. "Shattered", "Dissolving")
  for the `< maxHP/2` Player View label; a blank field keeps the default
  "Bloodied".
- **Manual per-monster field, not automatic Type-detection** (resolves Open
  Q3). No creature-type taxonomy needed — this is a plain opt-in field the
  GM fills in on a specific monster's stat block, same shape as
  `LastStandHP`.
- **Applies to monsters of any `StatBlock.Player` tier (Normal/Legendary/
  Titan), not Legendary-only** (resolves Open Q4). The "Legendary" in this
  feature's working title referred to the **Patreon Epic/Mythic subscription
  tier**, not the monster-tier `Player` discriminator — i.e. this is a
  paid-tier-gated feature available on any monster, not a field restricted
  to `Player === "legendary"` monsters. Follow the exact precedent of
  [[stat_color_customization_plan]]: gate by the GM's Patreon Epic Tier
  (`env.HasEpicInitiative` in the GM's own tracker view), and for Player
  View specifically use the GM's tier plumbed through
  `PlayerViewState.hasEpicInitiative` — **not** `env.HasEpicInitiative`
  client-side there, since Player View is viewed logged-out by players and
  that env reflects the *viewer's* session, not the GM's. Also note: per
  [[patreon_tier_rollout]], Epic Tier isn't live on the current Patreon
  campaign yet, so — same as stat colors — this feature ships built but
  effectively dormant until Epic/Mythic tiers actually launch.
- **PCs/companions are out of scope** — not raised in the decision round;
  the ask has only ever been framed around monster flavor (undead/ooze
  can't "bleed"), so `PlayerHPVerbosity`'s PC-facing path is left untouched.
  Revisit if the user asks for it explicitly.
- **HP-specific only, for now** (tentative default, not explicitly asked —
  flag for confirmation). Mana/Resources/Wounds each have their own
  duplicated `< max/2` "Low"/"Wounded" branch in the same file, but the ask
  has only ever mentioned "Bloodied"/HP. Leaving those three untouched in
  the first version; the label-override field could be extended to them
  later without a redesign if asked.

## Open questions to resolve before scoping a real plan

1. **Which "Legendary tier" is meant** — the `StatBlock.Player === "legendary"`
   monster classification (most likely, given the "BLOODIED:" convention
   already lives there and `LastStandHP` sets the precedent for
   Legendary-only fields), or is this meant to be gated behind a Patreon
   subscription tier? No "Legendary" Patreon tier currently exists (only
   Account Sync/Epic/Mythic) — see [patreon_tier_rollout memory] context.
2. **Suppress vs. relabel vs. both?** — does "can't be bloodied" mean the
   state disappears (jumps Healthy→Defeated), gets folded into "Hurt", or
   just gets renamed to something flavor-appropriate?
3. **Manual per-monster flag, or automatic by creature type?** — the
   `Type` field is free text with no taxonomy
   ([common/StatBlock.ts:143-147](../common/StatBlock.ts#L143-L147)); a
   "GM checks a box on this specific monster" design (option 1/2 above)
   works with today's data model, while "auto-detect undead/ooze from Type"
   (option 3) would need a new taxonomy decision first.
4. **Scope: Legendary only, or also Normal/Titan?** — the ask says
   "Legendary tier," but undead/ooze Normal monsters exist too (e.g. a
   goo/zombie mob). Worth confirming whether this is deliberately
   Legendary-exclusive (matching `LastStandHP`'s precedent) or just where
   the idea originated.
5. **Does it apply to PCs/companions too?** — `GetHPDisplay` is shared code
   between `MonsterHPVerbosity` and `PlayerHPVerbosity`
   ([ToPlayerViewCombatantState.ts:76-78](../client/Combatant/ToPlayerViewCombatantState.ts#L76-L78)).
   A player playing an undead-flavored character/companion could plausibly
   want the same customization — is that in scope, or intentionally
   monster-only?
6. **Interaction with the other three verbosity-driven tracks** (Mana,
   Resources, Wounds each have their own duplicated `< max/2` "Low"/"Wounded"
   branch) — does a monster that "can't be bloodied" also skip "Low
   Mana"/"Low Resources," or is this HP-specific only?
7. **Does the visual severity gradient (`GetHPColor`) need to change too**,
   or is this purely about the text label under `Colored Label`/`Monochrome
   Label` modes? (`Actual HP`/`Damage Taken`/`Hide All` modes have no
   "Bloodied" word today, so they're presumably unaffected either way.)
8. **New typed field vs. reusing `CustomFields`?** — a typed field
   (`NoBloodiedState`, `BloodiedLabel`) is engine-readable and can drive
   `GetHPDisplay` directly, matching the `LastStandHP` precedent, but is a
   schema/migration change; `CustomFields` needs no schema change but isn't
   currently read by any display logic, only rendered as static text.

## Next steps

1. Get the user's answers above — especially #1 (which "Legendary" is meant)
   and #3 (manual flag vs. automatic type-detection), since those two
   decide almost the entire shape of the schema and UI work.
2. If automatic type-detection (option 3) is wanted, get explicit agreement
   on introducing a creature-type taxonomy before writing a plan — that's a
   materially bigger and more invasive change than the free-text `Type`
   field currently supports.
3. Write a full implementation plan once scope is settled — likely small
   (StatBlock field + StatBlockEditor Legendary-gated control +
   `GetHPDisplay` branch + tests) if scoped to options 1/2, larger if 3/4
   are included.
