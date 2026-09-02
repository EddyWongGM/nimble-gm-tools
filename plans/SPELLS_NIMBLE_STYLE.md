# Spells: Missing Nimble-Style Fields

**Status:** findings only, not yet planned/implemented.

Nimble's actual spell rules use a couple of concepts that the current
[Spell](../common/Spell.ts) model has no field for. Both were raised by the
user as gaps found while comparing the editor against real spellcasting play.

## Current model (for reference)

[common/Spell.ts:6-21](../common/Spell.ts#L6-L21) — `Tier`, `School`,
`CastingTime`, `DistanceType`/`Distance`, `Mana`, `Components`, `Duration`,
`Classes`, `Description`, `Ritual`. Editor UI lives in
[SpellEditor.tsx](../client/StatBlockEditor/SpellEditor.tsx), read-only display
in [SpellDetails.tsx](../client/Library/Components/SpellDetails.tsx).

Note `Components` already exists as a field but the standard editor form
([SpellEditor.tsx:152-186](../client/StatBlockEditor/SpellEditor.tsx#L152-L186))
never renders a `TextField` for it — it's only editable via the JSON editor
mode. Worth fixing regardless of the two gaps below.

## Gap 1: Upcast text field

A Tier 1 spell can be cast at Tier 2 (or higher) once a hero has access to
that tier, typically for a stronger effect. Nimble expresses this as spell
text, not a formula — mana cost scales by tier (T1 = 1 mana, T2 = 2 mana,
...) but that scaling is the GM's manual bookkeeping at the table, not
something this tool computes.

- **Proposed field:** `Upcast: string` — free text, same shape as
  `Description`/`CastingTime`. No numeric/derived logic needed since mana
  tracking per upcast tier is already left to the GM.
- **Cantrip exception (Tier 0):** cantrips can't be upcast by tier — they
  instead scale with character level, e.g. "High Levels: +5 damage every 5
  levels." Reuse the same `Upcast` text field for this (still free text, same
  storage), but the editor/display label should switch based on
  `spell.Tier === 0` — label it something like "High Levels" for cantrips vs
  "Upcast" for Tier 1+ (mirrors the existing `getTierValue()` "Cantrip" vs
  numeric-tier branching in
  [SpellDetails.tsx:63-65](../client/Library/Components/SpellDetails.tsx#L63-L65)).
  Content is still just free text either way, so no schema difference — this
  only affects the label shown in the editor and details view.
- Add to `Spell` interface, `Spell.Default()`, and (if old saves need it)
  `Spell.Update()` migration the same way `Mana` was backfilled
  ([common/Spell.ts:77-79](../common/Spell.ts#L77-L79)).
- Editor: new `TextField` (likely multi-line like Description) in
  `StandardEditor()` in SpellEditor.tsx.
- Display: conditional block in SpellDetails.tsx, following the
  `!!spell.Duration` / `!!spell.CastingTime` pattern
  ([SpellDetails.tsx:41-52](../client/Library/Components/SpellDetails.tsx#L41-L52)),
  only rendered when non-empty.

## Gap 2: Cast condition text field

Some spells are only castable under a specific trigger/condition — e.g.
"Castable only while defending." This is a rules-text constraint, not
structured data (no enum of possible conditions exists in Nimble).

- **Field name (decided):** `CastCondition: string` — free text, same
  treatment as `Upcast` above.
- Same touch points: `Spell` interface, `Spell.Default()`, editor
  `TextField`, and conditional display block in SpellDetails.tsx.

## Gap 3: Action cost should be a dedicated INT field, not text on Requires

Today spells encode their action cost as free text inside the `Requires`
field (`CastingTime` in the model,
[SpellEditor.tsx:169](../client/StatBlockEditor/SpellEditor.tsx#L169)) — e.g.
the starter-set spells store the literal string `"1 Action"`
([preload-content/compendium_starter_set.json:582](../preload-content/compendium_starter_set.json#L582)
and similar). That conflates "how many actions this costs" (a number) with
"what else is required to cast" (free text — reactions, bonus actions,
rituals taking 10 minutes, etc.), and makes the action cost unusable as data
(can't sort/filter/display consistently, "1 Action" vs "1 action" vs "One
Action" all differ as strings).

- **Field name (decided):** `Actions: number` — integer input, separate from
  `CastingTime`/`Requires`. `CastingTime`/`Requires` stays as free text for
  anything that isn't a simple action count (e.g. "1 Reaction", "10 minutes,
  Ritual") — confirmed we keep both fields rather than folding one away.
- **Display pluralization (decided):** label singular/plural by value —
  `1 Action`, `2 Actions`, `0 Actions` — e.g.
  `` `${value} Action${value === 1 ? "" : "s"}` ``. The stored field name
  stays `Actions` regardless of value; only the rendered label pluralizes.
- Add to `Spell` interface, `Spell.Default()` (default `0` or `1`), and a
  `Spell.Update()` migration that best-efforts a parse of the leading integer
  out of existing `CastingTime` strings like `"1 Action"` (same idempotent
  backfill pattern as `Mana` — [common/Spell.ts:77-79](../common/Spell.ts#L77-L79)) — imported/legacy data will
  otherwise silently lose action-cost info.
- Editor: add a `TextField` (numeric) for `Actions` alongside `Tier`/`Mana`
  in the `c-spell-editor__small-fields` row
  ([SpellEditor.tsx:167-172](../client/StatBlockEditor/SpellEditor.tsx#L167-L172)),
  cast via `castToNumberOrZero` on submit like `Tier`/`Mana`
  ([SpellEditor.tsx:74-75](../client/StatBlockEditor/SpellEditor.tsx#L74-L75)).
- Display: add an `Actions` row in SpellDetails.tsx following the
  `spell.Mana != null` pattern
  ([SpellDetails.tsx:29-34](../client/Library/Components/SpellDetails.tsx#L29-L34)).
- Importers ([SpellImporter.ts:47](../client/Importers/SpellImporter.ts#L47),
  [Open5eImporter.ts:61](../client/Importers/Open5eImporter.ts#L61)) currently
  write straight into `CastingTime` as text — would need a parse/split too if
  those sources are meant to populate the new field automatically.

## Visual reference (official Nimble spell card layout)

User provided a screenshot of official Nimble spell cards (not saved to
repo) showing the target layout, e.g. "Eye of the Storm" (Tier 4, AoE) and
"Updraft" (Tier 5, AoE). Key layout details that inform placement decisions
above:

- **Header badge:** `TIER {n}, {School/Tag}` (e.g. "TIER 4, AOE") as a
  combined pill/badge above the spell name — tier and school shown together,
  not as separate rows.
- **Title row:** spell name on the left, **action cost on the right** of the
  same row (e.g. "2 Actions") — not grouped with Tier/Mana/Duration at all.
  This means `Actions` should render near the spell name/title, not in a
  stat list alongside `Mana`/`Duration`.
- **Body:** stats (`Reach: 3, AoE.` `Damage: 4d4+10 bludgeoning...`) are
  inline bold-labeled clauses folded directly into the descriptive
  paragraph, not separate `<label>/<span>` rows like the current
  SpellDetails.tsx pattern. Current app architecture uses discrete rows —
  matching this is a real display rework, not just adding fields, and is now
  **in scope** (see "Decided" below — required specifically so the card's
  total size doesn't grow when the three new fields are added).
- **Upcast placement:** shown *after* a horizontal divider, below the main
  stat/description body, as its own short line: `Upcast: +1 Reach.` /
  `Upcast: +2 damage.` — bold italic label, terse text. This means Upcast
  should render **after** the description, not grouped with the
  `Duration`/`CastingTime` rows above it as originally assumed.

A second reference example, "Barrier of Wind" (Tier 2, 0 Actions), shows
`CastCondition` placement:

- **Header:** `TIER 2` badge, name "Barrier of Wind" left / **"0 Actions"**
  right on the title row — confirms `0` still renders as plural "0 Actions"
  (pluralization is value === 1 ? singular : plural, not value > 0).
- **CastCondition placement:** rendered as a single italic line **directly
  under the title row, above a divider, before the description** — "Castable
  only while Defending vs Ranged." No "Condition:"/"Requires:" label prefix
  on the card; it's just the condition text itself, styled distinctly
  (italic) to set it apart from the plain-text description below.
- Body ("Ranged attacks deal half damage vs you this round.") follows below
  a second divider, then `Upcast: Extend this effect to creatures within +1
  Reach.` follows at the bottom — same after-description Upcast placement as
  the first example.

This changes the earlier placement defaults:

- `Actions`: render near/next to the spell name in the title area, not in
  the `c-spell-editor__small-fields` row with Tier/Mana, and not as a
  `<label>Actions</label>` row in SpellDetails.tsx's stat block — needs its
  own spot in the title/header markup in both SpellEditor.tsx and
  SpellDetails.tsx.
- `Upcast`: render as a distinct block **after** `spell-description`
  ([SpellDetails.tsx:55-57](../client/Library/Components/SpellDetails.tsx#L55-L57)),
  separated by a rule, rather than alongside `Duration`/`CastingTime` above
  the description.
- `CastCondition`: render directly under the title/header row, **above**
  the stat block and description (not "alongside Duration/CastingTime" as
  originally assumed — it's higher up, its own standalone italic line, with
  no field-name label shown). This supersedes the earlier
  "same conditional-row pattern as Duration/CastingTime" default.

## Decided (confirmed with user)

- Field names: `Upcast`, `CastCondition`, `Actions` (all as `string`/`string`/
  `number` respectively — see gaps above).
- `Actions` label pluralizes by value ("1 Action" / "2 Actions"); the field
  itself is always named `Actions`.
- `CastingTime`/`Requires` is kept as-is alongside the new `Actions` field
  (not removed or folded away).
- **Editor field order mirrors the reference-card display order**, not just
  the details view. In `StandardEditor()` in SpellEditor.tsx, top-to-bottom:
  1. Existing header fields (`EntryType`, `Source`, `School`, `Tier`), with
     `Actions` added alongside `Tier` — both are header/title-row info on
     the card.
  2. `CastCondition` — moves up to sit right after the header fields, before
     `Requires`/`Mana`/`Duration`/`Distance`, matching its position directly
     under the title row on the card.
  3. Existing `Requires`/`Mana`/`Duration`/`Distance` fields — unchanged
     relative order.
  4. `Description` — unchanged position.
  5. `Upcast` — added last, after `Description`, matching its
     bottom-of-card position.
- **`CastCondition` label split by view (revised):** the **editor** shows a
  visible label, `<TextField label="Cast Condition" fieldName="CastCondition" />`
  — labeled like every other discrete editor input (per the clarification
  above). The **details view** (SpellDetails.tsx) still shows no label, just
  the styled italic text, matching the reference cards exactly. So the
  earlier "no label anywhere" decision is narrowed to details-view-only; the
  editor gets a normal label.
- **SpellDetails.tsx display styling should chase the reference card's
  inline-paragraph look** (no longer a stretch goal) — this is now in scope,
  not optional. **Constraint: total card size must not grow** despite adding
  three new fields worth of content (`Actions`, `CastCondition`, `Upcast`).
  That means this isn't purely additive — the existing discrete `<p><label>/
  <span>` stat rows for `Distance`/`Duration`/`CastingTime`/`Mana`
  ([SpellDetails.tsx:24-53](../client/Library/Components/SpellDetails.tsx#L24-L53))
  need to be **replaced/folded into inline bold-labeled prose** (as on the
  card: "Reach: 3, AoE. Damage: 4d4+10...") rather than kept as separate rows
  with the new fields added on top — collapsing the existing stat block into
  prose is what makes room for `Actions` (moves to the title row, net-neutral),
  `CastCondition` (one compact italic line), and `Upcast` (one compact line
  after the description) without net growth. This is a real display rework of
  SpellDetails.tsx, not just new conditional rows appended to the current
  layout.
- **Editor gets a live preview panel (Reading A, decided).** The editor form
  itself is unchanged structurally — same discrete labeled `TextField`
  inputs (`Tier`, `Mana`, `Duration`, `Requires`, `Distance`, `Actions`,
  `CastCondition`, etc., each with its own label per the clarification
  above). Additionally, a new read-only preview panel is added to
  SpellEditor.tsx that renders the values live, matching how the restyled
  SpellDetails.tsx card will look — so a GM sees the actual card layout
  (title row with Actions, CastCondition line, inline stat/description prose,
  Upcast line) update as they fill in the form, without leaving the editor.
  Implementation-wise this preview should reuse/wrap SpellDetails.tsx's
  rendering (fed the in-progress Formik values) rather than duplicating its
  layout logic in a second component.

## Remaining open questions (non-blocking, can default during implementation)

- None outstanding — all placement, naming, and styling questions raised so
  far are resolved above.
