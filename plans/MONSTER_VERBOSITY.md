# Monster HP Verbosity: Custom "Bloodied" Label

**Status: planned, not yet implemented.** Scope decided in
[plans/LEGENDARY_MONSTER_HP_VERBOSITY_INVESTIGATION.md](LEGENDARY_MONSTER_HP_VERBOSITY_INVESTIGATION.md)
(read that first for the two-mechanisms background and the full open-question
history) — this doc is the concrete design now that scope is settled.

## Goal

Let a GM override the word "Bloodied" that Player View shows for a specific
monster once it drops below half HP (under `Colored Label`/`Monochrome
Label` HP verbosity). An undead or ooze/slime monster narratively can't
"bleed," so a GM might relabel it "Shattered," "Dissolving," etc. Blank
(the default) keeps "Bloodied" exactly as today.

**Decided scope** (see investigation doc for the reasoning):

- Custom label override, not suppression-only — a free-text field per
  monster; blank = default "Bloodied".
- Manual per-monster field, not automatic detection from the free-text
  `Type` field.
- Available on monsters of **any** `StatBlock.Player` tier (Normal/
  Legendary/Titan) — "Legendary" in this feature's working title referred to
  the **Patreon "Legendary Tier"** (the user-facing name for what the code
  calls `env.HasEpicInitiative` — see
  [EpicInitiativeSettings.tsx:23](../client/Settings/components/EpicInitiativeSettings.tsx#L23)),
  not the `StatBlock.Player === "legendary"` monster-tier discriminator. This
  is a paid-tier perk gated the same way as
  [[stat_color_customization_plan]], available on any monster tier.
- HP-specific only. Mana/Resources/Wounds keep their own "Low"/"Wounded"
  wording, untouched, for now.
- Monsters only — `PlayerHPVerbosity`'s PC-facing path is untouched.
- The GM's own "BLOODIED:" Legendary Action naming convention
  ([common/StatBlock.ts](../common/StatBlock.ts) `LegendaryActions`, free
  text) is completely unaffected — this feature only touches what Player
  View displays.

## Correction to the investigation doc's tentative gating plan

The investigation doc assumed this would need the same `PlayerViewState.
hasEpicInitiative` server-side plumbing the stat-color feature needed, since
that's the precedent for "Epic-gated Player View behavior." **That plumbing
is not needed here.** Reason: `GetHPDisplay`
([client/Combatant/ToPlayerViewCombatantState.ts:75-103](../client/Combatant/ToPlayerViewCombatantState.ts#L75-L103))
runs **GM-side**, inside `ToPlayerViewCombatantState`, which is called from
[client/Encounter/Encounter.ts:735](../client/Encounter/Encounter.ts#L735) —
GM-side tracker code that builds the `PlayerViewCombatantState` payload
*before* sending it over the socket. It already reads `env.HasEpicInitiative`
directly for this exact purpose one line above, at
[ToPlayerViewCombatantState.ts:10](../client/Combatant/ToPlayerViewCombatantState.ts#L10)
(`const sendImage = env.HasEpicInitiative`, gating portrait URLs the same
way). Player View itself only renders the already-resolved `HPDisplay`
string verbatim; it never re-evaluates verbosity client-side. So a direct
`env.HasEpicInitiative` check inside `GetHPDisplay` is correct and
sufficient — no `PlayerViewState` field, no `server/sockets.ts` change. The
`PlayerViewState.hasEpicInitiative` plumbing was only required for the
stat-color feature because that one is live-rendered as CSS *inside* Player
View's own browser bundle (a separate session with no Patreon identity of
its own), which doesn't apply here.

## Design

### 1. Schema — `common/StatBlock.ts`

```ts
// Player View only (ToPlayerViewCombatantState.GetHPDisplay) - overrides the
// default "Bloodied" qualitative-HP label under Colored/Monochrome Label
// verbosity, for monsters that narratively can't "bleed" (undead, ooze,
// construct, etc). Blank/unset keeps "Bloodied". Gated by Patreon Legendary
// Tier (env.HasEpicInitiative) the same way stat colors are - see
// MONSTER_VERBOSITY.md.
BloodiedLabel?: string;
```

No new helper function needed — this is read directly where "Bloodied" is
hardcoded today. No `StatBlock.Default()` entry needed either (undefined is
the correct default, same as `LastStandHP`).

### 2. Display — `client/Combatant/ToPlayerViewCombatantState.ts`

`GetHPDisplay` ([:75-103](../client/Combatant/ToPlayerViewCombatantState.ts#L75-L103))
currently hardcodes:

```ts
} else if (currentHP < maxHP / 2) {
  return "<span class='bloodiedHP'>Bloodied</span>";
```

Change to:

```ts
} else if (currentHP < maxHP / 2) {
  const customLabel = combatant.StatBlock().BloodiedLabel?.trim();
  const label =
    env.HasEpicInitiative && customLabel ? customLabel : "Bloodied";
  return `<span class='bloodiedHP'>${label}</span>`;
```

- `env` is already imported in this file ([:3](../client/Combatant/ToPlayerViewCombatantState.ts#L3)).
- Keeps the `bloodiedHP` CSS class unchanged regardless of label text, so
  existing color/styling rules in `combatants.less` (and Player View's own
  CSS) keep applying with no LESS changes needed.
- **Below Epic Tier, a stored label is ignored and "Bloodied" always shows**
  — same "feature goes inert, not just un-editable" philosophy as the stat
  color neutralization in [[stat_color_customization_plan]]. Covers the case
  where a GM sets a label while subscribed, then lapses.
- Mana/Resources/Wounds's own `< max/2` branches
  ([:136](../client/Combatant/ToPlayerViewCombatantState.ts#L136),
  [:197](../client/Combatant/ToPlayerViewCombatantState.ts#L197),
  [:325](../client/Combatant/ToPlayerViewCombatantState.ts#L325)) are
  deliberately left untouched (HP-only scope decision above).
- `GetHPColor` ([:405-421](../client/Combatant/ToPlayerViewCombatantState.ts#L405-L421))
  needs no change — it's a continuous gradient/`"auto"`, with no "Bloodied"
  word to replace.
- The GM's own tracker view is unaffected by construction: `bloodiedHP`/
  "Bloodied" text exists **only** in this file (verified — not referenced
  anywhere in `CombatantRow.tsx` or elsewhere under `client/`). The GM's own
  combatant rows show raw HP numbers, never this qualitative label, so there
  is nothing to change there.

### 3. Editor UI — `client/StatBlockEditor/StatBlockEditor.tsx`

Add a `TextField` (already imported,
[StatBlockEditor.tsx:27](../client/StatBlockEditor/StatBlockEditor.tsx#L27))
next to the existing `Player` `EnumToggle` block
([:332-407](../client/StatBlockEditor/StatBlockEditor.tsx#L332-L407)), reusing
the exact "is this stat block a monster, any tier" condition already used
twice in that block
([:324-326](../client/StatBlockEditor/StatBlockEditor.tsx#L324-L326) and
[:396-399](../client/StatBlockEditor/StatBlockEditor.tsx#L396-L399)):

```tsx
{api.values.Player !== "player" &&
  api.values.Player !== "companion" &&
  api.values.Player !== "room" &&
  env.HasEpicInitiative && (
    <>
      <TextField label="Bloodied Label" fieldName="BloodiedLabel" />
      <Info>
        Overrides the default "Bloodied" label Player View shows once this
        monster drops below half HP (Colored/Monochrome Label verbosity
        only). Leave blank to keep "Bloodied".
      </Info>
    </>
  )}
{api.values.Player !== "player" &&
  api.values.Player !== "companion" &&
  api.values.Player !== "room" &&
  !env.HasEpicInitiative && (
    <Info>
      Custom Bloodied labels for Player View are a Legendary Tier perk.
    </Info>
  )}
```

- Needs `import { env } from "../Environment";` added to
  `StatBlockEditor.tsx` (not currently imported there — confirm before
  writing; `Environment.ts` exports the shared mutable `env` singleton every
  other Epic-gated component already reads from).
- Field is hidden entirely below Epic Tier (matching
  `StylesChooser`/`StatColorsChooser`'s whole-section hide in
  `EpicInitiativeSettings.tsx`, rather than a disabled-but-visible input) —
  simplest option, and consistent with "the feature doesn't do anything
  below Epic" from step 2. The one-line upsell `Info` tells a non-Epic GM
  the perk exists without cluttering the editor with a disabled control.
- Placed in the monster-identity block (same row group as the `Player`
  toggle and the Scalable checkboxes) since it's a per-monster identity
  trait, not a combat-mechanic stat — doesn't need to go through
  `statFields`/`flushFieldsIntoRows`.

### 4. No preload-content migration needed

`BloodiedLabel` is optional and additive — every existing stat block in
`preload-content/*.json` and every GM's saved library entry is valid with it
simply absent (reads as `undefined`, behaves exactly as before this
feature). No `StatBlock.Update` migration step required.

## Tests to add

- `client/Combatant/Combatant.test.ts`, in the existing
  `describe("ToPlayerViewCombatantState", ...)` block
  ([:381](../client/Combatant/Combatant.test.ts#L381)):
  - A monster with `BloodiedLabel: "Shattered"` and `env.HasEpicInitiative =
    true` shows `"<span class='bloodiedHP'>Shattered</span>"` once below half
    HP (mirrors the existing `env.HasEpicInitiative = true;` idiom used in
    [PlayerView.test.tsx](../client/PlayerView/PlayerView.test.tsx) — `env`
    is a plain mutable object, just assign the field directly in the test).
  - Same setup with `env.HasEpicInitiative = false` still shows the default
    `"Bloodied"` — confirms the feature is inert below Epic Tier even with a
    stored label.
  - A monster with no `BloodiedLabel` set (or blank string) shows the
    default `"Bloodied"` regardless of tier — no regression to the existing
    `"Should show qualitative HP for creatures"` test
    ([:391](../client/Combatant/Combatant.test.ts#L391)).
  - A Player Character with `BloodiedLabel` set is unaffected (PC path reads
    `PlayerHPVerbosity`, and the override only applies to the monster
    branch in this plan — confirm `IsPlayerCharacter` combatants never reach
    the new branch, or explicitly scope the check to `!IsPlayerCharacter()`
    if needed).
- No new `StatBlock.ts` test needed (no new exported helper function — the
  field is read directly, same as `LastStandHP`).

## Known limitations (documenting, not fixing here)

- **Whole-word override only** — no support for templated/partial
  relabeling (e.g. keeping "Bloodied" but changing only its color). This
  matches the ask (rename the word).
- **No enforcement against the GM's own "BLOODIED:" Legendary Action text**
  going out of sync with a relabeled Player View display (e.g. a monster
  relabeled "Shattered" in Player View but still narrated via a
  "BLOODIED:"-named action in the GM's own stat block). Documented as
  out-of-scope per the investigation doc (mechanism #2 is pure GM-authored
  free text, not engine-read).
- **Unrelated dead code, don't confuse with this feature:**
  `client/Rules/Rules.ts:66` (`EnemyHPTransparency = "whenBloodied"`) is a
  declared-but-never-read field — grepped, no other reference anywhere in
  `client/`. Not part of this feature and not to be wired up as a side
  effect of touching this area.

## Naming (proposed, not yet settled)

- Authored stat block field: `BloodiedLabel` (string, optional, blank/unset
  = default "Bloodied").
