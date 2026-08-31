# Monster CR Rating (D&D5e Reference Field)

Last reviewed: 2026-08-31

## Goal

Normal monsters only (not Legendary/Titan). A new, purely informational
field storing the monster's D&D 5e Challenge Rating (e.g. `"5"`, `"1/4"`,
`"1/2"`) — not used in any Nimble mechanic, just a reference tag so a GM can
compare a homebrew/converted monster against known D&D5e content while
building it.

This is a **new, separate field** — it does not touch or rename the existing
`Challenge` field (`common/StatBlock.ts:57`), which already means something
else (Nimble-native difficulty/level, labeled "Challenge" for monsters /
"Level" for players in the editor — see
[DETACH D&D5e.md §3](../DETACH%20D&D5e.md)). No conflict, no migration —
purely additive.

## Data model

```ts
// common/StatBlock.ts
export interface StatBlock extends Listable {
  ...
  CRRating?: string;   // new, Normal-monster-only, free text (D&D CR
                        // includes fractions like "1/4" - not a number)
  ...
}
```

Free text, not a number — same reasoning as `Challenge` itself already being
a string: D&D CR isn't purely integer (`0`, `1/8`, `1/4`, `1/2`, `1`, `2`, ...).

## Editor UI

New `TextField` ("CR Rating"), same simple pattern as `Source`/`Type` at
[StatBlockEditor.tsx:216-217](client/StatBlockEditor/StatBlockEditor.tsx#L216-L217),
placed alongside them in the headers block. Shown only for `library`/
`combatant` editor targets **and** `api.values.Player === ""` (Normal tier —
same condition that already distinguishes Normal from `legendary`/`titan`
via the tier `EnumToggle` at
[StatBlockEditor.tsx:228-238](client/StatBlockEditor/StatBlockEditor.tsx#L228-L238)).

## Display

Editor-only for this first pass — not added to the combat tracker, the
Player View, or `Combatant`/`CombatantRow` display. It's an authoring aid
(used while building/comparing a monster), not something needed mid-combat.
Could later be surfaced in the library list/reference pane
([StatBlockLibraryReferencePane.tsx](client/Library/ReferencePane/StatBlockLibraryReferencePane.tsx))
if browsing-time comparison turns out to matter, but that's not requested —
flagging as a possible follow-up, not building it now.

## Out of scope

- No change to the existing `Challenge` field or its semantics.
- No validation/parsing of the CR string (no XP-budget math, no
  `DifficultyCalculator` integration) — it's a label, not a number Nimble
  computes with.
- Not shown for Legendary/Titan monsters (no D&D CR equivalent for those
  tiers) or for players/companions.
