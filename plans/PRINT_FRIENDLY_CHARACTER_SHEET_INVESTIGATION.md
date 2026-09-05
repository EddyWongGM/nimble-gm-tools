# Print-Friendly Character Sheet for the GM: Investigation

**Status:** findings only, not yet planned/implemented.

## The ask

The GM wants a way to print a character sheet (or several) — either to a
physical printer or to PDF via the browser's print dialog — for a hero
tracked in the app. This doc is a scan of the current codebase to ground a
future implementation plan; no design decisions are made here yet.

## Current state: no print support exists

Searched all of `client/`, `common/`, and `lesscss/` for `print`,
`@media print`, `window.print`, and `page-break` (case-insensitive) — zero
matches. There is no print stylesheet, print button, or print-triggered flow
anywhere in the app today. There's also no export/share feature to reuse as a
pattern (no PDF export, image export, or clipboard copy) — the closest
existing "produce an artifact" features are local save/load prompts like
[SaveEncounterPrompt.tsx](../client/Prompts/SaveEncounterPrompt.tsx) and
[SaveScenePrompt.tsx](../client/Prompts/SaveScenePrompt.tsx), which don't
generalize to printing. This is a greenfield feature.

## Data model

- [common/StatBlock.ts:46-91](../common/StatBlock.ts#L46-L91) — the core
  creature/PC/companion shape: `Name`, `HP`/`AC`/`Mana`/`Resources`/
  `HitDice`/`Wounds` (each `{Value, Notes}`), `Abilities` (Str/Dex/Int/Wis —
  no Con/Cha in Nimble), `SaveAdvantages`, `Speed`, `Saves`/`Skills`
  (`NameAndAdvantage[]`), `Senses`/`Languages`, `Damage(Vulnerabilities|
  Resistances|Immunities)`, `ConditionImmunities`, `Challenge`/`CRRating`/
  `SaveDC`, `Traits`/`Actions`/`Reactions`/`BonusActions`/`LegendaryActions`/
  `MythicActions`/`CustomFields` (`NameAndContent[]`), `Description`,
  `Player` (discriminator: `"player"|"companion"|"legendary"|"titan"|""`),
  `ImageURL`.
- [common/PersistentCharacter.ts:6-22](../common/PersistentCharacter.ts#L6-L22)
  — the GM's persistent PC record: wraps a `StatBlock` plus live state
  (`CurrentHP/Mana/Resources/HitDice/Wounds/Gold`), freeform `Notes`, `Tags`,
  and `Items` (`InventoryItem[]`). This is almost certainly the right input
  type for a GM-facing character sheet, since it carries current values, not
  just the static definition.
- [common/CombatantState.ts](../common/CombatantState.ts) — the live
  in-encounter wrapper (turn/initiative bookkeeping) built from a `StatBlock`
  via
  [client/Reducers/InitializeCombatantFromStatBlock.tsx](../client/Reducers/InitializeCombatantFromStatBlock.tsx).
  Relevant only if "print the current encounter roster" turns out to be part
  of the ask.

## Where sheets render today

- [client/Components/StatBlock.tsx:13-20](../client/Components/StatBlock.tsx#L13-L20)
  — `StatBlockComponent`, the shared full-sheet renderer (`AbilityScores`,
  header, traits/actions/etc.), `displayMode: "default" | "active"`. Used
  across the compendium, editor previews, and combatant details.
- [client/Components/StatBlockHeader.tsx](../client/Components/StatBlockHeader.tsx)
  — name/HP/AC header row used by the above.
- [client/Library/ReferencePane/PersistentCharacterLibraryReferencePane.tsx:84-89](../client/Library/ReferencePane/PersistentCharacterLibraryReferencePane.tsx#L84-L89)
  — already renders a full `StatBlockComponent` as a read-only preview pane
  when browsing saved PCs in the library. This is the closest existing
  analog to a "sheet view" and the most natural place to hang a "Print"
  action.
- [client/Library/ReferencePane/StatBlockLibraryReferencePane.tsx](../client/Library/ReferencePane/StatBlockLibraryReferencePane.tsx)
  — same pattern for compendium creature statblocks.
- [client/Combatant/CombatantDetails.tsx](../client/Combatant/CombatantDetails.tsx)
  / `MultipleCombatantDetails.tsx` — the GM's in-tracker combatant detail
  panel, another candidate trigger point during an active encounter.
- [client/PlayerView/components/PlayerViewCombatant.tsx](../client/PlayerView/components/PlayerViewCombatant.tsx)
  — the player-facing (sanitized) combatant card; a different, GM-hidden
  view, probably not the target here.

## Styling architecture (pattern to follow)

- [lesscss/nimble-rpg-app.less](../lesscss/nimble-rpg-app.less) is the single
  LESS aggregator (`@import`s everything under `base/`, `layout/`,
  `components/`, `pages/`, `utilities/`). A new print stylesheet would be a
  new partial imported here, e.g. `utilities/print.less` or a `@media print`
  block appended to `components/statblock.less`.
- [client/PlayerView/CSSFrom.ts](../client/PlayerView/CSSFrom.ts) is a useful
  architectural precedent for anything that needs *dynamic* CSS (e.g. a
  GM-chosen accent color carried into the print layout): a pure function
  that builds a CSS string from a settings object, rendered via
  [CustomStyles.tsx](../client/PlayerView/components/CustomStyles.tsx) as
  `<style dangerouslySetInnerHTML>`. For a static print stylesheet this
  likely isn't needed — plain LESS + `@media print` is simpler and matches
  how the rest of the app is styled.
- Note: the working-tree diff currently touching `CSSFrom.ts`/
  `CustomStyles.tsx`/`PlayerView.tsx` is unrelated in-flight work (threading
  an `HasEpicInitiative` flag into stat-color CSS) — not print-related, just
  noted so it isn't confused with this investigation.

## Tech stack constraints

Webpack + Grunt build (not CRA/Vite), React 16.14, LESS for all styling, no
CSS-in-JS. `package.json` has **no** `react-to-print`, `jsPDF`, or
`html2canvas` — any approach that wants an actual downloadable PDF file
(rather than relying on the browser's own print-to-PDF) needs a new
dependency.

## Open questions to resolve before scoping a real plan

1. **Scope** — PC character sheets only (`PersistentCharacter`), creature
   statblocks too (for GM prep printouts of monsters), or both?
2. **Batch vs single** — print one character at a time, or "print my whole
   party" as a multi-page/multi-column batch?
3. **Trigger surface** — a "Print" button on the reference-pane preview
   ([PersistentCharacterLibraryReferencePane.tsx:84-89](../client/Library/ReferencePane/PersistentCharacterLibraryReferencePane.tsx#L84-L89)),
   on `CombatantDetails`, or a new dedicated library action?
4. **Content** — full static `StatBlock` definition, or the live GM state
   too (`CurrentHP`/`Wounds`/`Gold`, `Notes`, `Items`)? A sheet meant for a
   player to keep differs from a GM's own quick-reference printout.
5. **Output fidelity** — is `@media print` + `window.print()` (letting the
   browser's own "Save as PDF" handle file output) good enough, or does the
   user want a one-click downloadable PDF without going through the print
   dialog (would require `jsPDF`/`html2canvas`/`react-to-print`)?
6. **Visual style** — match the app's existing dark/themed UI closely, or a
   stripped ink-friendly layout (white background, black text, no shadows/
   colored borders) more typical of a printable sheet?
7. **Page size** — US Letter vs A4; one character per page vs fit-many.

## Candidate approaches (sketch, pending answers above)

- **A. Pure CSS `@media print` + `window.print()`** — new print-only React
  component reusing pieces of `StatBlock.tsx` (e.g. `AbilityScores`) but
  with its own ink-friendly layout, plus a new LESS partial with `@page`/
  `page-break` rules, triggered by a button calling `window.print()`. No new
  dependencies; consistent with how the rest of the app is styled and built.
  Downside: PDF output depends on the browser's print-to-PDF, and per-browser
  print rendering has minor quirks.
- **B. `react-to-print`** — thin wrapper around approach A that manages
  mounting a print-only subtree and calling `window.print()` for you. Small
  new dependency, purpose-built, reduces DIY plumbing.
- **C. `html2canvas` + `jsPDF`** — renders a DOM node to canvas then to a PDF
  file client-side, for a real one-click download independent of the browser
  print dialog. Two new dependencies, heavier, and produces an image-based
  (non-selectable, non-searchable) PDF — worse fidelity than A/B for a text
  document like a character sheet.

**Leaning towards A (optionally B for ergonomics)** given no PDF libs exist
in this codebase today and LESS + plain CSS is the established styling
approach everywhere else — but this should be confirmed against the answer
to question 5 before committing.

## Next steps

1. Get the user's answers to the open questions above.
2. Write a full implementation plan (component, LESS partial, trigger UI,
   which data fields to include) once scope is settled.
