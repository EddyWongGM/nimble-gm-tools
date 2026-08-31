# Monster Save DC & Saving-Throw Advantage

Last reviewed: 2026-08-31

## Goal

Applies to **all monster tiers** (Normal/Legendary/Titan) — not specific to
the Legendary work in [LEGENDARY_MONSTER.md](02_LEGENDARY_MONSTER.md).

Two distinct, independent pieces of monster save info, replacing the current
D&D-style "Saves" list of named per-ability bonuses:

1. **Save DC** — a single integer a monster shows once (e.g. "Save DC 10").
   This is what **players roll against** when the monster forces a save.
2. **Saving-throw advantage** — an optional per-ability tag some monsters
   have (e.g. `INT+`, `STR++`, `INT-`). This is what **the monster itself
   rolls with** when it has to make a saving throw. Shown only for the
   abilities where the monster has advantage or disadvantage — not a full
   Str/Dex/Int/Wis table, since monster ability scores aren't displayed
   anywhere in the stat block today (`AbilityScores` only renders for player
   characters — [client/Components/StatBlock.tsx:145-147](client/Components/StatBlock.tsx#L145-L147)).

## Current state

`StatBlock.Saves` ([common/StatBlock.ts:53](common/StatBlock.ts#L53)) is a
`NameAndModifier[]` — free-text `Name` + numeric `Modifier`, edited via a
repeatable add/remove row (`NameAndModifierFields`, wired at
[StatBlockEditor.tsx:270](client/StatBlockEditor/StatBlockEditor.tsx#L270))
and rendered as `"{Name}{+Modifier}"` pairs under a "Saves" label
([StatBlock.tsx:69, 167-181](client/Components/StatBlock.tsx#L69)). This is a
literal port of D&D 5e's per-ability saving throw bonus list. `Open5eImporter`
still populates it from D&D `saving_throws` today
([client/Importers/Open5eImporter.ts:97, 218](client/Importers/Open5eImporter.ts#L97)),
but per [DETACH D&D5e.md](../DETACH%20D&D5e.md) the app is moving away from
that integration entirely, so it's not a constraint on this design — no need
to keep its output shape compatible.

`Skills` ([common/StatBlock.ts:54](common/StatBlock.ts#L54)) has the same
`NameAndModifier[]` shape and reuses the same field components, but isn't
wired into `StatBlockEditor.tsx` or `StatBlock.tsx` at all today — dead data.
Since it shares the exact shape being reworked here, **this plan wires
`Skills` up for the first time using the same advantage-tag pattern**,
rather than reworking `Saves` alone and leaving `Skills` dead — see §2.

## 1. `SaveDC`

New plain integer field, no dice notation needed (unlike `HP`/`AC`):

```ts
// common/StatBlock.ts
export interface StatBlock extends Listable {
  ...
  SaveDC?: number;
  ...
}
```

**Editor:** a simple number input next to Challenge/AC/HP in
`statFields` ([StatBlockEditor.tsx:168-205](client/StatBlockEditor/StatBlockEditor.tsx#L168-L205)),
following the same plain-number pattern already used for
`InitiativeModifier` ([StatBlockEditorFields.tsx:37-46](client/StatBlockEditor/components/StatBlockEditorFields.tsx#L37-L46))
rather than the `ValueAndNotes` two-part pattern `HP`/`AC` use (no rollable
notes needed for a DC).

**Display:** a single `"Save DC {n}"` stat entry, shown only when
`SaveDC` is set — same conditional-render pattern as `Mana`/`Resources`.

## 2. Saving-throw & Skill advantage (replaces `Saves`, wires up `Skills`)

New discrete type, replacing `Saves: NameAndModifier[]` **and** giving
`Skills` the same shape/treatment — both are the exact same "named entry +
some kind of bonus" concept, and `Skills` was already dead data sharing the
old shape, so there's no reason to rework one and leave the other stranded
on the shape being replaced:

```ts
// common/StatBlock.ts
export type AdvantageLevel =
  | "----"
  | "---"
  | "--"
  | "-"
  | ""
  | "+"
  | "++"
  | "+++"
  | "++++";

export interface NameAndAdvantage {
  Name: string;      // e.g. "Int" for a save, "Perception" for a skill
  Advantage: AdvantageLevel;
}

export interface StatBlock extends Listable {
  ...
  Saves: NameAndAdvantage[];    // was NameAndModifier[]
  Skills: NameAndAdvantage[];   // was NameAndModifier[]; now wired up for real
  ...
}
```

`""` exists as the neutral/default value for a freshly-added row, but in
practice a GM only adds a row for an ability/skill that *has* advantage or
disadvantage — there's no reason to list one at parity, same as today's
Saves list only including abilities worth calling out.

**Editor:** new `NameAndAdvantageField` component, sibling to the existing
[NameAndModifierField.tsx](client/StatBlockEditor/components/NameAndModifierField.tsx),
swapping the `<Field type="number" name="...Modifier">` for a `<select>` (or
`EnumToggle`-style control) over the 9 `AdvantageLevel` values, labeled
"---- Disadvantage x4" / "--- Disadvantage x3" / "-- Disadvantage x2" / "-
Disadvantage" / "Normal" / "+ Advantage" / "++ Advantage x2" / "+++
Advantage x3" / "++++ Advantage x4" — stacking up to quadruple in either
direction is a real Nimble occurrence (e.g. a monster's Str save), not just
double. A dropdown reads better than an `EnumToggle` button row here since
there are 9 options, not 2-3 like the existing `Player` toggle. Built
generically (`modifierType` prop, same as
`NameAndModifierField` today) so the identical component drives **both** a
new `<NameAndAdvantageFields modifierType="Saves" />` and
`<NameAndAdvantageFields modifierType="Skills" />` row in
[StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx#L270) —
`Skills` gets wired into the editor for the first time, right alongside
`Saves`, using this same pattern.

**Display:** add `Skills` alongside `Saves` in the `modifierTypes` array at
[StatBlock.tsx:69](client/Components/StatBlock.tsx#L69) (currently only
`Saves` is listed — `Skills` was never rendered), and replace the
`EnrichModifier(modifier.Modifier)` numeric render at
[StatBlock.tsx:173-178](client/Components/StatBlock.tsx#L173-L178) with a
direct symbol + label render matching the spec examples: `INT+`
("advantage"), `STR++` ("double advantage"), `INT-` ("disadvantage"). Rows
with `Advantage === ""` are filtered out of the render for both groups
(nothing to show for parity).

## Decided

- **Migration of existing data**: old `Saves` entries are
  `{ Name, Modifier: number }`; the new shape is `{ Name, Advantage: string }`.
  There's no sound numeric-to-advantage mapping (a "+5" bonus isn't
  equivalent to "advantage"), so **legacy entries are dropped on load** —
  `StatBlock.Update` strips any entry that has `Modifier` but no
  `Advantage`, same idempotent-migration pattern already used for the
  ability-score `Con`/`Cha` cleanup at
  [common/StatBlock.ts:113-128](common/StatBlock.ts#L113-L128). This
  silently empties every existing monster's Saves list the first time it
  loads post-change — confirmed acceptable. `Skills` gets the identical
  treatment (it's dead data today, so this is a no-op in practice — nothing
  currently reads or writes it to lose).
- **`Skills` scope**: extended to the same `NameAndAdvantage` shape and
  wired into the editor/display alongside `Saves` (see §2), rather than
  left on the old numeric shape. Confirmed — try it on Skills first since
  it shares the exact same requirements as Saves (a named entry with an
  advantage/disadvantage tag, no numeric bonus needed).

## Out of scope

- Player-character saves (`AbilityScores`/`VisibleAbilityNames` machinery
  for PCs is unaffected — this is monster-only, matching where `SaveDC` and
  the advantage tables are actually displayed).
