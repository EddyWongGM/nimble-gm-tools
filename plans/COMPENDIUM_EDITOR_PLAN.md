# CompendiumEditor: shell-only generalization

Last reviewed: 2026-08-30

Status: approved, not yet implemented.

## Context

`SpellEditor`, `StatBlockEditor`, `SavedEncounterEditor` (and `StatBlockEditor`
reused for `PersistentCharacter`) are four hand-rolled editors sharing a large
amount of near-identical JSX skeleton (title row, identity fields, Cancel/
Delete/Save button row) but each managing its own Formik lifecycle. Per
`plans/SPELL_TO_COMPENDIUM.md`, the goal is to extract that shared skeleton
into one `CompendiumEditor` shell, without touching persistence, the two
existing dispatch mechanisms (React `EditorView.tsx` switch vs. Knockout
`CenterColumn.tsx`/`TrackerViewModel` observables), or introducing a new
data model / field-schema abstraction. Confirmed scope:

- **All four** existing content types are covered (Spell, StatBlock/Monster,
  SavedEncounter, PersistentCharacter) — no new `Listable` type, no new
  `Store` key.
- **Both dispatch mechanisms stay exactly as they are** — only *what* they
  render changes (one shared shell instead of four separate components),
  not *how* they decide what to render.
- The shell owns presentational chrome only. Formik `initialValues`,
  `validate`, `onSubmit`, and `editorMode` state stay per-type, unchanged —
  unifying those would drift toward the already-rejected declarative
  field-schema approach for no real duplication benefit (the JSX skeleton is
  the duplicated part, not the Formik lifecycle).
- Root CSS class is unified on `c-statblock-editor` (per user decision) —
  `spell-editor.less` is retired. This is a deliberate, visible convergence:
  `.spell-editor`'s own comments already describe it as an incomplete
  hand-copy of `.c-statblock-editor` meant to "match" it, but its `input`
  rule currently lacks the `border: 1px solid var(--red)` / `border-radius`
  / `padding` that `.c-statblock-editor input` has — Spell editor inputs
  will visually pick up that treatment. Needs an eyeball check after the
  Spell editor cutover (step 3 below).
- `SavedEncounterEditor`'s Save button stays a plain `<Button
  onClick={api.submitForm}>` (type="button"), **not** upgraded to
  `<SubmitButton>` (per user decision) — Enter-to-submit stays inconsistent
  across editors, unchanged from today.

## Design

### The shell (new file: `client/StatBlockEditor/CompendiumEditor.tsx`)

Pure presentational component, no Formik/validation logic:

```tsx
export interface CompendiumEditorChromeProps {
  className: string;          // always "c-statblock-editor" going forward
  title: string;
  buttons: JSX.Element;       // Cancel/Delete/Submit row, built by the caller
  identity?: JSX.Element;     // omitted entirely (no wrapper div) when absent
  children: JSX.Element;      // type-specific body
}

export function CompendiumEditor(props: CompendiumEditorChromeProps) {
  return (
    <Form className={props.className} autoComplete="false" translate="no">
      <div className="c-statblock-editor__title-row">
        <h2 className="c-statblock-editor__title">{props.title}</h2>
        {props.buttons}
      </div>
      {props.identity && (
        <div className="c-statblock-editor__identity">{props.identity}</div>
      )}
      {props.children}
      <div className="c-statblock-editor__buttons">{props.buttons}</div>
    </Form>
  );
}
```

Matches the skeleton already common to all three editors (`Form` → title-row
(h2 + buttons) → identity (optional) → body → buttons).

### What moves vs. stays per-type

| Piece | Shell | Per-type |
|---|---|---|
| `<Form>`, className, title `<h2>` | shell | — |
| Button row JSX (which buttons exist, confirm text) | shell renders verbatim | built by each type, passed in as `buttons` |
| `<IdentityFields>` usage | shell renders `identity` slot | Spell/StatBlock build it and pass it in; SavedEncounter passes nothing |
| `editorMode` state, JSON textarea vs. field body | — | stays in each type's own component |
| Formik `initialValues`/`validate`/`onSubmit` | — | stays fully per-type, unchanged |
| `StandardEditor()` (Spell), `fieldEditor()` (StatBlock), Name/Path/BackgroundImageUrl+`FieldArray` (SavedEncounter) | — | passed as `children` |

### Prop contracts — no caller-facing changes

`StatBlockEditorProps` and `SpellEditorProps` keep their exact current
shape (same required/optional fields) since they're consumed by name in
`TrackerViewModel.tsx`, `LibrariesCommander.ts`, `CenterColumn.tsx`, and
`StatBlockEditor.test.tsx`. Lift `SavedEncounterEditor`'s inline anonymous
props type into a named, exported `SavedEncounterEditorProps` (same shape:
`{ savedEncounter, onSave, onClose }` — still no `onDelete`/`onSaveAsCopy`/
`currentListings`), mirroring the other two for consistency. `StatBlockEditor`,
`SpellEditor`, `SavedEncounterEditor` keep their current exported names —
only their internals change to compose `<CompendiumEditor>`. `PersistentCharacter`
editing continues to be `StatBlockEditor` with `editorTarget:
"persistentcharacter"`, unchanged.

### SavedEncounterEditor divergence — keep it minimal (no IdentityFields)

`SavedEncounterEditor` keeps its exact current hand-rolled `Name`/`Path`/
`BackgroundImageUrl` fields, unwrapped, as the first elements of `children`,
with `identity` left `undefined`. Adopting `IdentityFields` would add a
dead Standard/JSON toggle (no JSON mode exists for encounters) and hide the
currently-always-visible Path field behind `AutoHideField`'s folder toggle —
real behavior changes, not refactors. Only the title-row/button-row gets
deduped for this type.

### `IdentityFields`'s "Save as a Hero" label — no change

Stays hardcoded. Only `StatBlockEditor` ever passes `allowSaveAsCharacter=true`;
no other type needs it, and Scope A confirms no new content types are being
added.

### Dispatch — table-driven where possible, untouched where not

**`EditorView.tsx`** (React path, all 4 types): replace the `if/else` chain
with a `Record<LibraryType, EditorRenderer>` lookup:

```ts
type EditorRenderer = (
  editorTarget: Listing<Listable>,
  loadedTarget: Listable,
  props: EditorViewProps
) => JSX.Element;

const EditorRenderers: Record<LibraryType, EditorRenderer> = {
  StatBlocks: RenderStatBlockEditor,
  PersistentCharacters: (_target, loaded, props) => RenderPersistentCharacterEditor(loaded, props),
  Spells: RenderSpellEditor,
  Encounters: RenderSavedEncounterEditor
};
```

The four `Render*Editor` functions and their callback-wiring stay exactly as
they are — only the dispatch mechanism changes.

**`centerColumnView.tsx` / `CenterColumn.tsx`** (Knockout path, only 2 of 4
types reachable — `Encounters` has no observable, `PersistentCharacters`
shares `StatBlockEditorProps`): **no changes at all.** Forcing this into a
4-entry `LibraryType` table would require adding new observable surface for
Encounters, which is explicitly out of the confirmed scope. It already picks
up the shell refactor for free, since it renders `<StatBlockEditor>`/
`<SpellEditor>` by name — internals change, call sites don't.

## Migration order (each step independently shippable/revertible)

1. Add `client/StatBlockEditor/CompendiumEditor.tsx` (shell only, no other
   file touched). Add `CompendiumEditor.test.tsx` asserting `title`,
   `buttons`, `identity` (present/absent), `children` land in the right
   slots.
2. Cut over `SavedEncounterEditor.tsx` to use `<CompendiumEditor>`
   internally; lift its props type to named `SavedEncounterEditorProps`.
   Verify visually — no `IdentityFields`, no mode toggle, Save button stays
   plain `<Button>`.
3. Cut over `SpellEditor.tsx`: `buttons()` and the `<IdentityFields>` block
   become `buttons`/`identity` props; `StandardEditor()`/JSON textarea
   become `children`. Apply the unified `c-statblock-editor` class, delete
   `lesscss/components/spell-editor.less`. **Visually check the Spell
   editor's inputs** (red border/padding/rounded corners now apply) before
   merging.
4. Cut over `StatBlockEditor.tsx` (class component): `fieldEditor()`/
   `jsonEditor()` become `children`; button/`IdentityFields` blocks become
   `buttons`/`identity` props. Keep `componentDidCatch`'s fallback-to-json
   logic as-is — confirm it still engages by temporarily throwing inside
   `fieldEditor()` and checking the JSON fallback kicks in, since its output
   is now handed to `CompendiumEditor` as `children` rather than called
   directly in `render()`.
5. Run `StatBlockEditor.test.tsx` unmodified — its DOM/class-name assertions
   (`form.c-statblock-editor`, `.c-statblock-editor__json-button`, `.c-toggle
   #toggle_SaveAs`, etc.) are the regression gate for step 4.
6. Table-driven dispatch in `EditorView.tsx` (mechanical, separate commit so
   a dispatch bug can't be confused with a shell-refactor regression).
7. Smoke-test the Knockout paths (`EditStatBlock`/`EditSpell`/
   `EditPersistentCharacterStatBlock`, imported-statblock/imported-spell
   flows) — no code in that path changes, but it now renders the refactored
   components.

## Critical files

- `client/StatBlockEditor/CompendiumEditor.tsx` (new)
- `client/StatBlockEditor/StatBlockEditor.tsx`
- `client/StatBlockEditor/SpellEditor.tsx`
- `client/StatBlockEditor/SavedEncounterEditor.tsx`
- `client/StatBlockEditor/components/IdentityFields.tsx` (reused, unchanged)
- `client/Library/Manager/EditorView.tsx`
- `lesscss/components/spell-editor.less` (deleted)
- `lesscss/components/statblock-editor.less` (unchanged, now the sole source)

## Verification

- `StatBlockEditor.test.tsx` passes unmodified after step 4.
- New `CompendiumEditor.test.tsx` covers the shell in isolation.
- Manual pass through the app (`/run` skill or `npm start`): open/edit/save/
  delete/save-as-copy for a Spell, a Monster (StatBlock), a Hero
  (PersistentCharacter), and a Saved Encounter, via both the Library Manager
  (React path) and — for StatBlock/Spell/PersistentCharacter — via the
  in-combat center column (Knockout path). Visually confirm the unified
  Spell editor input styling from step 3.
- Trigger the `componentDidCatch` fallback path once manually (step 4) to
  confirm the JSON-mode recovery still works through the new shell.
