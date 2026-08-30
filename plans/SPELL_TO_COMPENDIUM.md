# SpellEditor → CompendiumEditor

Last reviewed: 2026-08-30

## Goal

Investigate what it would take to generalize
[SpellEditor.tsx](client/StatBlockEditor/SpellEditor.tsx) into a more general
`CompendiumEditor` capable of editing multiple content types, not just
`Spell`. This is a research/design document, not an approved implementation
plan — per `AGENTS.md`, new architectural elements need explicit confirmation
before being built.

## Current state

### "Compendium" is a UI label, not a data model

There is no `Compendium` type today. "Compendium" is the display name for the
`Spells` library only:
[Libraries.ts:26-31](client/Library/Libraries.ts#L26-L31)

```ts
export const LibraryFriendlyNames = {
  PersistentCharacters: "Heroes",
  StatBlocks: "Monsters",
  Encounters: "Encounters",
  Spells: "Compendium",
};
```

The four content types (`StatBlock`, `Spell`, `SavedEncounter`,
`PersistentCharacter`) are siblings, uniformly modeled as `Library<T extends
Listable>`, not variants of one shared "compendium entry" concept. A fifth
tab, Scenes, deliberately sits *outside* this pattern
([AGENTS.md:59-69](AGENTS.md#L59-L69)) — it reads/writes
`Settings.PlayerView.SceneLibrary` directly and is not backed by
`Listing<T>`/IndexedDB. Any generalization must not assume every browsable
list in the app follows the `Listing<T>` pattern.

### Editors today (one per content type, hand-rolled)

All editors live under `client/StatBlockEditor/` despite the folder name
(pre-existing naming smell, not addressed here):

| Type | Editor | Shape |
|---|---|---|
| `Spell` | [SpellEditor.tsx](client/StatBlockEditor/SpellEditor.tsx) | function component, Formik |
| `StatBlock` (Monsters) | [StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx) | class component, Formik, `componentDidCatch` |
| `PersistentCharacter` (Heroes) | reuses `StatBlockEditor` on `character.StatBlock`, via `editorTarget: "persistentcharacter"` | — |
| `SavedEncounter` | [SavedEncounterEditor.tsx](client/StatBlockEditor/SavedEncounterEditor.tsx) | function component, Formik, ~70 lines |

`StatBlockEditor`'s `editorTarget: "library" | "combatant" |
"persistentcharacter"` prop is existing precedent for "one editor, multiple
flavors via a discriminator" — the closest thing in the codebase to what a
`CompendiumEditor` would do across content *types* rather than across
StatBlock *contexts*.

### SpellEditor internals

[SpellEditor.tsx](client/StatBlockEditor/SpellEditor.tsx) (186 lines):

```ts
export type SpellEditorProps = {
  spell: Spell;
  onSave: (newSpell: Spell) => void;
  onDelete: (id: string) => void;
  onSaveAsCopy?: (newSpell: Spell) => void;
  onClose: () => void;
  currentListings?: Listing<Listable>[];
};
```

- Store-agnostic: reads/writes only through props, no direct library access.
  The wiring to `libraries.Spells` happens one level up (see Entry points,
  below). This means the component itself would generalize cleanly.
- `"standard" | "json"` mode toggle — standard mode renders Formik fields,
  JSON mode is a raw `<textarea>` over `JSON.stringify(spell)`, merged onto
  `Spell.Default()` on submit. Same pattern in `StatBlockEditor` (there it
  also doubles as an error-recovery fallback).
- Shares [IdentityFields.tsx](client/StatBlockEditor/components/IdentityFields.tsx)
  (Name/Path/mode toggle/save-as-copy) and
  [DescriptionField](client/StatBlockEditor/components/StatBlockEditorFields.tsx)
  with `StatBlockEditor` already.
- Type-specific body (`StandardEditor()`) further branches on
  `EntryType: "spell" | "rule"` to hide/show spell-only fields — i.e. `Spell`
  already models two sub-kinds through one optional-field union, which is
  itself a small-scale version of the problem a `CompendiumEditor` would
  solve at the library-type scale.
- Validation is hand-written, not schema-driven (no Yup/Zod despite Formik).
  Same pattern across all three editors: check `Name`, and for save-as-copy
  check Path+Name uniqueness against `currentListings`.

### Data model

Shared base — [Listable.ts](common/Listable.ts):

```ts
export interface Listable {
  Id: string;
  Version: string;
  Name: string;
  Path: string;
  LastUpdateMs?: number;
}
```

This is the *only* field set common to all four types. `Source` appears on
`Spell` and `StatBlock` but not `SavedEncounter`; there is no shared
Description/tagging contract. `PersistentCharacter` doesn't even use `extends
Listable` — it duplicates the fields and wraps a full `StatBlock`.
`StatBlock` itself is large and irregular (ability scores, sortable
trait/action arrays, custom fields) versus `Spell`'s flat field list. There is
no existing generic "field schema" type describing per-type editable fields.

### What's already fully generic (reuse as-is)

- **Persistence**: `Listing<T>`, `useLibrary<T>`
  ([useLibrary.ts](client/Library/useLibrary.ts)), `Store`
  ([Store.ts](client/Utility/Store.ts)), server-side
  `configureEntityRoute<T extends Listable>`
  ([storageroutes.ts:102](server/storageroutes.ts#L102)) and
  `Library<TItem extends Listable>.FromFile()`
  ([library.ts](server/library.ts)) — all already parameterized by
  `<T extends Listable>` end to end.
- **Browsing**: `LibraryReferencePane<T extends Listable>`
  ([LibraryReferencePane.tsx](client/Library/ReferencePane/LibraryReferencePane.tsx)),
  `ListingRow<T>`
  ([ListingRow.tsx](client/Library/Components/ListingRow.tsx)),
  `BuildListingTree<T>`
  ([BuildListingTree.tsx](client/Library/Components/BuildListingTree.tsx)).
  Each content type gets a thin wrapper supplying `renderListingRow`,
  `renderPreview`, `listingGroups`, `defaultItem`, `addNewItem`.
- `GetDefaultForLibrary(libraryType): Listable`
  ([Libraries.ts:42-57](client/Library/Libraries.ts#L42-L57)) — already a
  generic-by-switch "empty entity for this library type" factory.

### What's not generic (the actual refactor target)

1. The editor **field forms** themselves — each type hand-rolls its Formik
   fields, validation, and body layout.
2. Two **hard-coded dispatch points** that pick which editor to render, both
   branching per type rather than being table-driven:
   - [EditorView.tsx:130-157](client/Library/Manager/EditorView.tsx#L130-L157)
     — Library Manager pane, switches on `editorType` to call
     `RenderStatBlockEditor` / `RenderPersistentCharacterEditor` /
     `RenderSpellEditor` / `RenderSavedEncounterEditor`.
   - [centerColumnView.tsx](client/Layout/centerColumnView.tsx) /
     [CenterColumn.tsx](client/Layout/CenterColumn.tsx) — combat-tracker
     center column, switches on which Knockout observable
     (`TrackerViewModel.SpellEditorProps` /
     `TrackerViewModel.StatBlockEditorProps`, etc.) is non-null.

   Both are fed from [LibrariesCommander.ts](client/Commands/LibrariesCommander.ts)
   (`CreateAndEditSpell`, `EditSpell`, and the StatBlock/Encounter/Character
   equivalents), which calls `tracker.EditSpell({...})` to populate the
   Knockout observable that `CenterColumn.tsx` watches.

   This dual-hosting mechanism (Knockout-observable center column vs
   React-state `EditorView`) is an existing seam a `CompendiumEditor` would
   need to keep working through, or unify — unifying it is a separable,
   larger Knockout-removal effort per `AGENTS.md`'s Knockout/React guidance,
   not something to bundle into this change without calling it out first.

## Design shape (for discussion, not decided)

Two questions drive the scope, and they're mostly independent:

**A. How much of the editor gets shared?**

- **Shell-only generalization** (lower risk): lift the pattern already
  common to `SpellEditor`/`SavedEncounterEditor` — title row, `IdentityFields`,
  standard/JSON toggle, Cancel/Delete/Save/Save-as-copy buttons — into one
  `CompendiumEditor` shell parameterized by a per-type render-prop/component
  for the type-specific body. Each type keeps its own field form (today's
  `StandardEditor()` / `fieldEditor()` equivalents) as the plugged-in body.
  This mirrors `StatBlockEditor`'s existing `editorTarget` precedent and
  needs no new field-schema abstraction.
- **Full field-schema generalization** (higher risk): design a declarative
  field schema (field kind: text/number/textarea/enum/list/keyword-list/
  value+notes, per type) that a single generic form renderer consumes for
  every content type. `StatBlock`'s irregular shape (custom fields, ability
  scores, sortable arrays) versus `Spell`'s flat fields makes this the
  speculative, high-effort half of the idea — and it edges toward "new
  architectural element" territory that `AGENTS.md` says needs explicit
  confirmation before building.

**B. Does the dispatch layer get unified too?**

Registering a per-`LibraryType` editor entry (component + default-item
factory) next to the existing `GetDefaultForLibrary` switch, and consuming it
from both `EditorView.tsx` and `centerColumnView.tsx`, would remove the two
hard-coded branches without touching the persistence/browsing layers (which
don't need any change) or requiring the Knockout/React unification called out
above.

## Recommendation

Start with shell-only generalization (A) plus table-driven dispatch (B) as
one scoped, incremental change: it reuses everything already generic
(persistence, browsing, `IdentityFields`, JSON-mode pattern), directly
mirrors the `editorTarget` precedent already in the codebase, and avoids
introducing a new field-schema abstraction. Treat full field-schema
unification as a separate, later decision — only worth it if a fifth content
type or heavy per-type duplication in the shell body makes the case
concretely, and only with explicit confirmation first.

## Open questions

- Does "CompendiumEditor" mean *all four* library types, or specifically
  broadening what "Compendium" (today: Spells only) can hold — e.g. adding
  items/feats as new entries in the Spells library? `LIBRARY_TABS_PLAN.md`
  §2 flags that as a materially different, larger effort (new `Listable`
  type or tagged union, new `Store` key, new list/filter/import UI) and
  explicitly recommends not renaming/expanding the Spells library until that
  scope is real. Worth resolving before scoping implementation work, since
  it changes which of the two questions above is actually in play.
- Is unifying the two editor-hosting mechanisms (Knockout center column vs
  React `EditorView`) in scope, or should `CompendiumEditor` be built to
  slot into both as they exist today?
