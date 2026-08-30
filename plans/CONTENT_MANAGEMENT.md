# Content Settings: Tutorial & Starter Content Parity

Last reviewed: 2026-08-30

## Context

Settings > Content ([ContentSettings.tsx](../client/Settings/components/ContentSettings.tsx))
has three sections - Monsters, Heroes, Compendium - each a list of `Toggle`
switches controlling which content sources get preloaded into that library
on load (`useLibraries` in [Libraries.ts](../client/Library/Libraries.ts)).
The goal: each of the three should optionally offer the same two local
preload options - **Tutorial** content and **Starter** content - instead of
the current inconsistent mix.

## Current state

| Library | Starter content | Tutorial content |
|---|---|---|
| **Monsters** (StatBlocks) | `local-basic-rules` → `/statblocks/` (`basic_rules_creatures.json`). Toggle: "Basic (Local)". **Default: on.** | None exists. |
| **Heroes** (PersistentCharacters) | `local-basic-rules` → `/basic-rules-heroes/` (`basic_rules_heroes.json`). Toggle: "Basic (Local)". **Default: off.** | `tutorial-heroes` → `/heroes/` (`tutorial_heroes.json`). Toggle: "Tutorial (Local)". **Default: on.** |
| **Compendium** (Spells) | Route exists (`/spells/`, `basic_rules_spells.json`) but is **not wired to anything** - no toggle, no preload call. | None exists. |

Heroes is the only library with both options built, and is the reference
pattern to copy. (`common/Settings.ts:129-131` has the current defaults;
`configureBasicRulesContent.ts` on the server serves all three
`basic_rules_*.json` files, but the client only ever fetches two of them.)

## Finding: Compendium's "Starter Content" is half-built and dead

[configureBasicRulesContent.ts:24-37](../server/configureBasicRulesContent.ts#L24-L37)
already stands up a `spellLibrary` from `basic_rules_spells.json` and serves
it at `GET /spells/` and `GET /spells/:id`, in exactly the same
`Library.FromFile` shape as the Monsters and Heroes local sources (plain
`ListingMeta[]`, no import/transform step needed - confirmed by reading a
sample entry, which is already flat `Spell` data with `Name`/`Source`).
Nothing on the client calls it: `preloadSpells` in
[Libraries.ts:268-286](../client/Library/Libraries.ts#L268-L286) only loops
`settings.PreloadedSpellSources` against `/open5e-spells/${sourceSlug}/`,
and `ContentSettings.tsx`'s Compendium section only renders open5e spell
toggles. This route has presumably been sitting unused since whenever it was
added.

This means Compendium's "starter content" gap is the cheapest of the three
to close - it's a wiring task, not new content.

## Gaps to close

### 1. Compendium - Starter Content (wire up the existing route)

- `ContentSettings.tsx`: add a toggle above the open5e spell list, mirroring
  Monsters' `local-basic-rules` toggle:
  `<Toggle fieldName="PreloadedSpellSources.local-basic-rules">Basic (Local)</Toggle>`
- `Libraries.ts` `preloadSpells`: add a branch for `sourceSlug ===
  "local-basic-rules"` that does `axios.get("/spells/")` and
  `Spells.AddListings(localListings, "server")` - same shape as
  `preloadStatBlocks`'s `local-basic-rules` branch
  ([Libraries.ts:169-178](../client/Library/Libraries.ts#L169-L178)), no
  importer function needed.
- `common/Settings.ts`: add `"local-basic-rules": true` to
  `PreloadedSpellSources` defaults - match Monsters (core rules content, on
  by default) rather than Heroes (off by default, since Heroes' local set is
  a large premade-character pack, not baseline reference content).

### 2. Compendium - Tutorial Content (net new, likely low priority)

No tutorial spell/compendium data exists, and per
[TUTORIAL_FLOW.md](TUTORIAL_FLOW.md) the tutorial itself never touches
spells or the Compendium tab at all. Building a `tutorial_spells.json` set
would be speculative work with nothing to consume it. **Recommendation:
skip unless/until the tutorial gains a Compendium-related step** - revisit
together with the "tutorial has zero coverage of Nimble-specific features"
note in that doc.

### 3. Monsters - Tutorial Content (open question)

Heroes needed a separate `tutorial-heroes` set because its "Basic (Local)"
set defaults **off** (it's a large premade pack, not meant to load
unasked). Monsters' "Basic (Local)" set defaults **on** already, and
tutorial step 0 ("click on any creature") just needs *some* creature
present - which Basic Rules already guarantees today. A dedicated
`tutorial_creatures.json` would only earn its keep if Basic Rules ever
defaults off, or if the tutorial wants a curated 2-3-monster subset instead
of the full bestiary. **Recommendation: don't build this yet** - flag as
optional, revisit if either premise changes.

### 4. UI/naming consistency

Once #1 lands, all three sections will have a "Basic (Local)" toggle, but
only Heroes will also have a "Tutorial (Local)" one - so the sections won't
look symmetric even after the wiring gap closes, just for a real reason
(#2/#3 above being intentionally skipped). Worth relabeling for clarity
regardless: rename "Basic (Local)" → "Starter Content (Local)" and
"Tutorial (Local)" → "Tutorial Content (Local)" across all toggles so the
two categories read the same way everywhere, rather than leaving "Basic" as
an unexplained synonym for "starter."

## Plan of action

1. Wire Compendium's starter content (item 1) - small, mechanical, closes
   the only genuine gap where content already exists but isn't reachable.
2. Relabel the "Basic (Local)" / "Tutorial (Local)" toggles for consistency
   (item 4) while touching `ContentSettings.tsx` anyway.
3. Leave Compendium tutorial content and Monsters tutorial content as
   explicitly deferred (items 2/3) - no new JSON content files unless a
   concrete need shows up.

## Open questions

- Should Compendium's starter toggle default to `true` (parity with
  Monsters) or `false` (parity with Heroes)? Leaning `true` since spells are
  baseline reference content like the monster Basic Rules set, not a large
  optional pack like premade Heroes - but worth confirming against how large
  `basic_rules_spells.json` actually is in practice (319 entries, per a
  quick read - comparable to a full sourcebook, not a small curated set).
- If a future tutorial step does touch the Compendium tab, does it need
  dedicated tutorial spell content, or can it just point at whatever's
  already preloaded (same question Monsters already resolves by relying on
  Basic Rules)?
