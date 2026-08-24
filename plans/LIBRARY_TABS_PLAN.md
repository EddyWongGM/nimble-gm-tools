# Library Tabs: Space, Glossary Rename, and Sounds

Last reviewed: 2026-08-24

## Context

Started as a note about the left-pane library tabs running out of horizontal
room, then grew two more ideas: renaming "Spells" to something broader, and
adding sound support. These are three separable decisions that interact
mainly through tab count, so this plan investigates each and calls out where
they push against each other.

Original tabs ([LibraryReferencePanes.tsx:136-139](client/Library/ReferencePane/LibraryReferencePanes.tsx#L136-L139)):
Creatures, Characters, Encounters, Spells, Scenes.

## 1. Tab bar is already tight

`.c-tab` is `flex: 1` with `overflow-x: hidden` and no `text-overflow:
ellipsis` ([tabs.less:25-32](lesscss/components/tabs.less#L25-L32)), so on a
narrow sidebar long labels get hard-clipped rather than truncated
gracefully. "Characters" and "Encounters" are already the longest labels at
5 tabs. Any 6th tab (Sounds or otherwise) shrinks every tab further.

Options, cheapest first:
- Add `text-overflow: ellipsis` + `white-space: nowrap` so clipping at least
  looks intentional - doesn't fix crowding, just stops mid-letter cutoff.
- Abbreviate labels ("Chars", "Encs") - ugly, avoid.
- Icon-only tabs with a tooltip, matching the pattern already used for the
  header buttons (`Button` with `fontAwesomeIcon` + `tooltip`,
  [LibraryReferencePanes.tsx:107-123](client/Library/ReferencePane/LibraryReferencePanes.tsx#L107-L123)).
  Most consistent with existing UI, but needs an icon that reads clearly for
  each tab.
- Let `.c-tabs` wrap to two rows - `flex-flow: row wrap` is already set, but
  `flex: 1` fights wrapping. Needs a `min-width` per tab instead of `flex: 1`
  for wrapping to actually trigger before full clipping. Tried first, then
  reverted in favor of icon+tooltip below.

**Decision: icon+tooltip.** Implemented:
- [Tabs.tsx](client/Components/Tabs.tsx) gained an optional
  `optionIconsById` prop - when a tab has an icon, it renders a FontAwesome
  glyph wrapped in a `Tippy` tooltip (matching `Button`'s
  `fontAwesomeIcon`/`tooltip` pattern) instead of its text label.
- [LibraryReferencePanes.tsx](client/Library/ReferencePane/LibraryReferencePanes.tsx)
  now passes a `tabIconsById` map: Creatures → `dragon`, Characters → `user`,
  Encounters → `chess-board`, Spells → `hat-wizard`, Scenes → `image`.
- `tabs.less` is unchanged (`flex: 1`, `overflow-x: hidden` stay as-is) -
  icon glyphs are narrow enough that clipping no longer happens in practice.

Other `Tabs` usages (`SettingsPane`, `LibraryManager`) don't pass
`optionIconsById`, so they keep rendering plain text labels unchanged.

## 2. "Spells" → glossary (spells, items, feats)

The tab *label* is decoupled from storage: `LibraryFriendlyNames.Spells =
"Spells"` ([Libraries.ts:26-31](client/Library/Libraries.ts#L26-L31)) is
just display text, while the actual IndexedDB store name is the literal
string `"Spells"` set independently in
[Store.ts:15](client/Utility/Store.ts#L15). So **renaming the tab to
"Glossary" is a pure cosmetic change** - no store rename, no migration -
*as long as the underlying data stays spell-shaped*.

Actually broadening the library to hold items and feats as first-class
entries is a different, much bigger effort: a new `Listable` type (or a
tagged union), a new `Store` key alongside `SupportedLists`
([Store.ts:18-23](client/Utility/Store.ts#L18-L23)), new list/filter/import
UI, and an import-path decision for existing spell data. Worth treating as
its own future plan, not bundled into this one.

One thing to flag against goal #1: "Glossary" (8 chars) is *longer* than
"Spells" (6 chars) - a pure rename actively works against the
shorter-labels goal. If the label change happens before the scope actually
broadens, there's no reason to rename yet.

**Recommendation:** don't rename until the scope genuinely includes
items/feats; when it does, treat the data-model expansion as the real work
and the label as a footnote.

## 3. Sounds

There is currently **no audio code anywhere in `client/`** (confirmed via
search - PlayerView, Scenes, etc. are all silent). This is a new feature,
not a re-skin of something existing.

**Option A - separate "Sounds" tab/library.** New `LibraryType`, new
`Store` key, new reference-pane component, new list/search/import UI - the
full weight of a library like Spells or Encounters. This is a 6th tab,
which directly collides with the space problem in #1.

**Option B - fold into Scenes.** `SavedScene` already carries `ImageUrl`,
optional `Fit`, optional `Path`
([PlayerViewSettings.ts:32-39](common/PlayerViewSettings.ts#L32-L39)), and
Scenes already has a full apply/show/dismiss/edit pipeline: `AddScene` /
`EditScene` / `ShowScene` / `DismissScene` /
`saveScene` in
[LibrariesCommander.ts:499-590](client/Commands/LibrariesCommander.ts#L499-L590),
plus the `SaveScenePrompt` UI and `SceneLibraryReferencePane`. Adding an
optional `SoundUrl` (and maybe `Loop`/`Volume`) field to `SavedScene`
reuses all of that: no new tab, no new store, no migration (existing saved
scenes simply lack the field). The remaining work is narrow: an `<audio>`
element in PlayerView driven by the active scene (mirroring how the
background image is already applied), plus a sound-URL field and
play/stop controls in the scene prompt/reference pane.

**Recommendation:** Option B. It sidesteps the tab-space problem entirely
(no new tab) and rides on plumbing that already exists end-to-end, so it's
substantially less work than Option A for a first version.

## Summary

- **Tab space:** add ellipsis now; revisit icon+tooltip tabs if a new tab
  is ever added.
- **Spells → Glossary:** hold off - cheap to rename later, but only once
  the data model actually broadens; a bare rename works against goal #1.
- **Sounds:** extend `SavedScene` with an optional sound field instead of
  building a new library/tab. Needs a new PlayerView `<audio>` element and
  a sound field in the scene prompt UI; no schema migration or new store.

## Open questions

- Is sound meant to be strictly per-scene (plays/stops with the active
  scene), or also needed independent of any scene - e.g. one-off combat
  stingers? Per-scene is the Option B scope above; standalone stingers
  would push back toward something closer to Option A (or a lightweight
  "sound board" that still isn't a full library tab).
- Volume/loop/autoplay UX, given the DM controls PlayerView from a separate
  window/tab than where they'd trigger sound changes.
- Where do sound files live - pasted URL like scene images, or an upload?
  (Scenes currently expect a URL, not a file upload, per
  `SaveScenePrompt`.)
