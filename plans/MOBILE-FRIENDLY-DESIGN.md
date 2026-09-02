# Mobile-Friendly Redesign — Investigation & Phased Plan

## Status (updated after Phase 0-3 implementation session)

| Phase | Status |
|---|---|
| 0 — Touch-capable drag-and-drop | ✅ Done |
| 1 — GM Tracker single-column layout + navigation | ✅ Done |
| 2 — GM Tracker Combatant Details content reflow | ✅ Done |
| 3 — Player View mobile layout | ✅ Done |
| 4 — Library Manager / Statblock & Spell editors | ⬜ Not started — pick up here |
| 5 — Settings & Landing polish | ⬜ Not started |

**Before starting Phase 4, read "Continuing in a new session" near the bottom of this file** — it has the one unresolved functional bug found during 0-3, plus environment/testing notes that'll save you re-discovering them.

## Context

The app currently has no device detection and only shallow CSS responsiveness: three breakpoints (`@large: 1200px`, `@medium: 1000px`, `@small: 750px` in [lesscss/nimble-rpg-app.less](lesscss/nimble-rpg-app.less#L31-L33)) tuned for narrowing a desktop/tablet browser window, not for real phone widths (~375-430px). Investigation across the GM Tracker, Player View, Library Manager/editors, and Settings confirms a genuine phone layout is achievable — the codebase already has some reusable patterns (a mobile card-grid for the initiative table, state-driven column priority) — but several things actively block it: hardcoded pixel-width columns, zero breakpoints on Player View, and mouse-only drag-and-drop (`react-dnd` + `HTML5Backend`) used for column resize, initiative reorder, and inventory reorder.

This plan covers both the GM Tracker and Player View (per your priority call), sequenced so foundational work (touch-capable drag-and-drop) lands before the layout phases that depend on it, with Library Manager/editors and Settings/Landing as lower-priority follow-on phases.

## Guiding technical decisions (apply across all phases)

- **New breakpoint**: add `@phone: 430px` next to the existing trio in [lesscss/nimble-rpg-app.less:31-33](lesscss/nimble-rpg-app.less#L31-L33). Kept as a LESS variable since nearly all of this is CSS-driven.
- **`useIsMobile` hook**: new `client/Utility/useIsMobile.ts`, a reactive `matchMedia` hook (`addEventListener("change", ...)`, cleaned up on unmount) — modeled on the one existing precedent, a one-shot `window.matchMedia("(max-width: 650px)")` read in [client/Library/ReferencePane/LibraryReferencePane.tsx:245](client/Library/ReferencePane/LibraryReferencePane.tsx#L245). Only needed for the few spots doing structural JS branching (e.g. forcing the toolbar narrow); most of this plan is pure CSS reflow. `PlayerView.tsx` is a class component — if JS branching is ever needed there, wrap it in a small functional child rather than converting the class.
- **Viewport meta**: [html/tracker.html](html/tracker.html) sets `user-scalable=no`, disabling pinch-zoom. Remove that (keep `width=device-width,initial-scale=1`) as a trivial fix in Phase 0.
- **`vh` units on mobile Safari**: iOS Safari's collapsing address bar makes `vh` resize mid-scroll. Existing usages — [player-view.less:158,240](lesscss/pages/player-view.less#L158) (`max-height: 80vh` on popups), [player-view.less:165](lesscss/pages/player-view.less#L165) (`margin-top: 85vh`), [landing.less:18](lesscss/pages/landing.less#L18) (`min-height: 100vh`) — should switch to `dvh` (with a fallback, since `dvh` support isn't universal) in whichever phase touches them, rather than porting the existing `vh` values as-is.
- **iOS input-zoom**: Safari auto-zooms the viewport when focusing any input with computed `font-size` under 16px. Audit input font-sizes (stat fields, editors) in whichever phase touches them and bump to ≥16px at phone width rather than discovering this live.
- **Real-device pass for touch**: Chrome DevTools touch emulation is sufficient for layout checks but doesn't reliably reproduce scroll-vs-drag timing/momentum. Phase 0 especially should get at least one real-device (or real-device-cloud, e.g. BrowserStack) pass before being called done, not emulation alone.
- **Landscape phone width**: not a new tier — landscape phone widths (~650-900px) fall into the existing `@small`/`@medium` breakpoints, which already collapse to one column. This is the deliberate choice, not an oversight; no `@phone`-specific landscape handling is planned.

## Phase 0 — Foundational: touch-capable drag-and-drop ✅ DONE

**Why first**: `DndProvider` is wired once at [client/App.tsx](client/App.tsx) with `HTML5Backend`, which is mouse-only (confirmed: zero touch/pointer event handling anywhere in the codebase). Every later phase that involves resize or reorder needs to be verified under real touch, so this has to land first.

**Consumers sharing the one global provider**: [client/Layout/VerticalResizer.tsx](client/Layout/VerticalResizer.tsx) (column resize), [client/InitiativeList/CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) (initiative reorder, drag ref on the whole `<tr>`), [client/Combatant/CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx) (inventory reorder, drag ref on the whole `<li>`, though a visual grip icon `.c-combatant-details__item-grip` already exists there), and the statblock editor's field-reorder components (`client/StatBlockEditor/components/KeywordField.tsx`, `NameAndAdvantageField.tsx`, `PowerField.tsx`, `UseDragDrop.tsx`).

**Approach**: add `react-dnd-touch-backend` and swap `App.tsx`'s single `DndProvider` to `TouchBackend` with `enableMouseEvents: true` — one universal backend handles both touch and mouse, so no per-surface branching or `react-dnd-multi-backend` needed.

**Real risk**: because drag refs are bound to the *whole row/list-item* (which also has `onClick` selection behavior and sits in a scrollable list), a naive swap makes any touch-drag on a row start a reorder instead of a scroll, and fights with tap-to-select. Mitigate with:
- `delayTouchStart` (~200ms long-press) so a quick tap still scrolls/selects.
- Prefer scoping the drag ref to a dedicated handle where one already exists — the inventory list's `.c-combatant-details__item-grip` icon is purely visual today; wire `drag` to just that icon instead of the whole `<li>`. `CombatantRow.tsx` has no existing grip icon; decide during implementation whether adding one now (touches the Phase 1 card-grid layout too) or deferring to `delayTouchStart` alone is acceptable.
- Widen `VerticalResizer`'s 6px hit target (e.g. a wider transparent touch-hit padding zone) — low-risk, bundle here since it's the same backend swap.

**Files**: `client/App.tsx`, `client/Layout/VerticalResizer.tsx`, `client/InitiativeList/CombatantRow.tsx`, `client/Combatant/CombatantDetails.tsx`, `package.json`.

**Done when**: on touch emulation, column resize / initiative reorder / inventory reorder all work without triggering scroll-instead-of-drag or drag-instead-of-tap; mouse behavior at desktop width is unchanged (regression check); confirmed with at least one real-device (or real-device-cloud) touch pass in addition to DevTools emulation, since emulation doesn't reliably reproduce scroll/drag timing.

**Shipped**: `react-dnd-touch-backend@11.1.3` added (pinned to match the existing `react-dnd`/`react-dnd-html5-backend` version); `App.tsx`'s `DndProvider` swapped to it with `enableMouseEvents: true, delayTouchStart: 200`. Drag refs rescoped off the whole row/list-item onto dedicated grip handles in both `CombatantRow.tsx` and `CombatantDetails.tsx` — **correction to this plan's own investigation**: `CombatantRow.tsx` already had a visual grip cell (`.combatant__left-gutter`) the write-up above said didn't exist; used it instead of adding a new one. `VerticalResizer` got a `::before` invisible touch-hit zone (~30px vs. the 6px visible bar) via `tracker.less`. Verified with Playwright: mouse-driven reorder/resize confirmed working end-to-end in a real browser (not just typecheck), plus real `TouchEvent`s dispatched at the grip handle to exercise the touch path directly, zero console errors. **Not done**: an actual real-device pass (only Chrome DevTools/Playwright touch emulation) — flagged as a real gap, not silently skipped.

## Phase 1 — GM Tracker: single-column phone layout + navigation ✅ DONE

**Key finding**: the "list vs. details" problem is largely already solved, just not phone-tuned. [interfacePriorityClass.tsx](client/Layout/interfacePriorityClass.tsx) already picks one winning column from state (confirmed by reading it directly: combatant selected → details wins via `show-right-center-left`; encounter active with nothing selected → list wins via `show-center-left-right`; libraries open → reference pane wins; editor open → editor wins), and the existing `@small` (750px) block in [lesscss/base/responsive.less](lesscss/base/responsive.less) already collapses to exactly one visible column driven by that class, overriding inline React-state pixel widths with `width: unset !important`.

Work in this phase:
1. Add the `@phone` breakpoint and extend/re-verify the existing single-column collapse logic in `responsive.less` still makes sense that narrow (vs. needing its own simplified rule).
2. Make the existing deselect/back affordance ([client/Layout/SelectedCombatants.tsx](client/Layout/SelectedCombatants.tsx)'s close button) touch-friendly (≥44px hit target) and discoverable at phone width (consider a persistent "Back to Initiative" label).
3. Audit other `interfacePriorityClass` branches for phone dead-ends — e.g. libraries-open hides the initiative list; confirm a reachable close control exists in `client/Library/ReferencePane/LibraryReferencePanes.tsx`.
4. Enlarge small touch targets scoped to phone width only: `.combatant__command-button` (currently 25x25px in [lesscss/components/combatants.less](lesscss/components/combatants.less)) and toolbar command buttons, target ~40-44px.
5. Extend the initiative table's existing mobile card-grid ([lesscss/components/combatants.less](lesscss/components/combatants.less)'s `@medium` block, which already converts the `<table>` to a named-grid-area card layout with `.combatant__mobile-icon` prefixes) with a phone-tier rule that stacks stat cells 1-2 per row instead of cramming up to 8 into one row.
6. Make the toolbar's existing icon-only mode (`.c-toolbar.s-narrow` in [lesscss/components/toolbar.less](lesscss/components/toolbar.less), today only reachable via the user-toggled Knockout observable `tracker.ToolbarWide`) auto-apply at phone width. Clean up the dead `.toolbar-narrow` selector in `responsive.less` (matches no real element) while touching this file.
7. Constrain the `SketchPicker`/Tippy color-picker popover in `CombatantRow.tsx` (`appendTo={document.body}`) so it doesn't overflow a 375px viewport.

**Done when**: at 390px, a full encounter loop works by touch — start encounter, select a combatant, view details, return to list, reorder initiative, use the toolbar, open the color picker without clipping.

**Shipped**: all 7 items done, plus one unplanned functional fix. `@phone: 430px` added; `user-scalable=no` removed from `tracker.html`. `responsive.less` got the dead `.toolbar-narrow` selector removed and a new `@media (max-width: @phone)` block: the visible single column gets `overflow-y: auto` + a sticky `.combatant-details__header` with a 44px close button and a CSS-only (`::after`) "Back to Initiative" label, phone-only. `toolbar.less` forces icon-only layout + 44px buttons at phone width regardless of the desktop wide/narrow toggle. `combatants.less`: `.combatant__command-button` → 44px at phone; initiative table's mobile card-grid gets a phone-tier `grid-template` stacking stat cells 2-per-row instead of 8-across; `.sketch-picker` (color picker) capped to viewport width. **Unplanned fix**: `interfacePriorityClass.tsx` — `LibrariesVisible` defaults to `true`, and it was checked *before* `hasPrompt`, so the privacy-policy prompt (shown by default on first load) rendered in a center column hidden at phone width — new mobile users had no way to dismiss it and get into the app at all. Reordered so a pending prompt always wins. Reproduced and fixed live (Playwright).

**Found, not fixed** (flagged for you, see "Continuing in a new session" below): `.combatant__command-button`-based row commands (Add Tag, Add Item, Add Gold) only appear on a `.selected` row in the initiative list — but selecting a combatant hides that list entirely at phone width. **There is currently no way to add a tag/item/gold to a combatant from a phone.**

## Phase 2 — GM Tracker: Combatant Details content reflow ✅ DONE

Once Phase 1 makes the details column reachable and full-width on phone, audit its *internal* content — [client/Combatant/CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx)'s stat rows, inventory list, tags, notes — for fixed-width assumptions (side-by-side label+value pairs that should stack, fixed-width inputs). Mostly CSS (flex-wrap, removing fixed widths) against the same `@phone` breakpoint.

**Done when**: a fully-populated stat block (HP/mana/resources/hit dice/wounds/inventory/gold/tags) is readable at 375px with no horizontal scroll or overlap; all inputs in this view are ≥16px font-size at phone width so focusing one doesn't trigger iOS Safari's auto-zoom.

**Shipped**: all in `statblock.less`, `@media (max-width: @phone)` only. `.c-combatant-details__hp/__defense-resources/__hitdice-wounds/__tags` (label+value row groups) get `flex-wrap: wrap` — they had no ancestor clipping overflow-x, so a populated row would've caused real horizontal scroll (`__speed-initiative` already wrapped; the others didn't). Inventory list `column-count: 1` (was 2, too cramped). Item grip + remove button enlarged toward 44px via padding + compensating negative margin. Quantity input's font-size confirmed to resolve to 16px (inherits body, no smaller ancestor) — no iOS zoom risk. Verified live: added a deliberately long tag and confirmed it wraps cleanly at 390px with zero horizontal overflow (measured via `body.scrollWidth === innerWidth`, not just eyeballed).

**Not verified live** (sample hero data doesn't populate these): Mana, Resources, Gold, and Inventory-items rows specifically — `EnableInventory` defaults off and none of the built-in sample heroes have Mana/Resources/Gold. The CSS fix is generic (same `flex-wrap` rule for every label/value row, already proven correct on the tags row), so risk is low, but it wasn't eyeballed. If you populate these in Phase 4/5 testing anyway, worth a quick look back.

## Phase 3 — Player View mobile layout ✅ DONE

**Current state**: [lesscss/pages/player-view.less](lesscss/pages/player-view.less) has zero `@media` queries. Each row is a flex row with up to 7 stat columns at fixed `flex-basis: 6%` plus name `25%` and a fixed 50px portrait. `.inventory-display-popup` is `width: 40vw; min-width: 24rem` — cannot fit a phone screen regardless of reflow.

**Approach**: prefer pure CSS here — column visibility (`acColumnVisible`, `manaColumnVisible`, etc. in [client/PlayerView/components/PlayerView.tsx](client/PlayerView/components/PlayerView.tsx)) is already data-driven and doesn't need to change. Add a `@media (max-width: @phone)` block in `player-view.less` that reflows rows into the same stacked/named-area card pattern established in Phase 1's `combatants.less` work, rather than inventing a new layout. Since `PlayerView.tsx` is a class component, this avoids needing to route `useIsMobile` through it. Also fix `.inventory-display-popup` and the other modal popups (portrait, damage-suggestion, tag-suggestion, combat-stats) for viewport-relative sizing, and check `CombatFooter.tsx` for fixed-width assumptions during implementation.

**Done when**: Player View at 375-430px shows readable stacked rows and all popups fit the viewport without horizontal scroll, using a test encounter with AC/mana/resources/hit dice/wounds/inventory/gold all populated simultaneously (worst case); `.inventory-display-popup` and the other `vh`-sized popups switch to `dvh` (with fallback) and are verified on an actual iOS Safari session (or simulator) where the address bar collapses/expands mid-scroll, not just DevTools emulation.

**Shipped, with one deliberate deviation from this plan**: the row/header reflow uses `flex-wrap` (name fills its row, each stat cell gets `flex: 1 1 40%` so ~2 fit per row, tags always full-width), **not** the named-grid-area pattern Phase 1 established. Reason found during implementation: Player View's stat columns are conditionally *rendered* per encounter (any subset of 7, plus portrait) rather than fixed-but-hidden like the Tracker's, so a static grid template would need a different template per combination — flex-wrap handles any subset for free. `.suggestion-prompt` mixin (shared by damage/tag/combat-stats popups) capped to `calc(100vw - 32px)`. `.inventory-display-popup`'s `min-width: 24rem` (384px, literally can't fit 375px) overridden to viewport-relative at phone width. `.combat-stats`'s two side-by-side lists stack at phone. `dvh` fallbacks added everywhere a popup was sized against `vh` (portrait image/caption, inventory popup) — `vh` line kept as the automatic fallback. `CombatFooter.tsx` checked, no fixed-width issue found, untouched.

**Verified live** via a real second encounter (desktop tracker + a `/p/<id>` Player View context side by side, not just one or the other): 6 heroes with only HP populated (no overflow) → then with AC also revealed, confirmed HP and AC actually sit *side-by-side* (proves the 2-per-row wrap pairs cells, not just stacks everything) → a long tag wraps cleanly on its own row → damage-suggestion popup (tap HP; needs `Settings > Options > "Allow players to suggest damage/healing"` enabled first, off by default) confirmed centered and fully within the 390px viewport. Zero console errors, zero horizontal overflow throughout.

**Not tested**: inventory-display and portrait popups specifically (couldn't get inventory items or portrait images into the sample data in time) and real iOS Safari `dvh` behavior (emulation only, not a real device/simulator). The inventory popup shares the exact mechanism (`.suggestion-prompt()` + explicit width override) already confirmed working on the damage popup, so risk is low but unconfirmed.

## Phase 4 — Library Manager / Statblock & Spell editors (lower priority)

Structurally the most expensive: [client/Library/Manager/LibraryManager.tsx](client/Library/Manager/LibraryManager.tsx) renders three side-by-side columns — left (`useStoreBackedState`, default 500px) and center (default 600px) as inline pixel React state, plus a hardcoded CSS `720px` editor column (~1820px minimum). CSS alone can't reflow inline pixel styles — needs the same `width: unset !important`-style override pattern already used for the Tracker's `LeftColumn`/`RightColumn` in `responsive.less`. The statblock editor's `__keywords` hard 2-column grid and fixed-rem label columns (9rem/5.5rem), and the spell editor's fixed 2-column grids, need phone-width single-column overrides. Phase 0's DnD backend swap already covers this surface's drag consumers for free.

**Done when**: Library Manager and both editors are usable (not necessarily polished) at 375-430px — single-column stacking, no overflow.

## Phase 5 — Settings & Landing polish (lowest priority)

Mostly minor CSS on an already largely-responsive surface: `DisplaysToggle`/`.c-display-toggles__toggle` fixed 80px columns, the Commands tab's fixed 80px keybinding columns and 2-column grid, `.c-dropdown select { min-width: 150px }` in [client/Settings/components/SettingsPane.tsx](client/Settings/components/SettingsPane.tsx)/`OptionsSettings.tsx` — each gets a phone-width override to wrap/stack. Landing page: extend the existing `@small` join-encounter row fix (input+button don't currently stack even at 750px) to also cover `@phone`.

**Done when**: Settings modal and landing page have no clipped/overflowing controls at 375-430px; landing page's `min-height: 100vh` switches to `dvh` (with fallback) so it doesn't clip/overshoot as Safari's address bar collapses.

## Continuing in a new session

Read this before starting Phase 4. A fresh session has no memory of the 0-3 implementation session — this is what's worth knowing.

**The one real functional bug found, still open**: at phone width, once a combatant is selected the initiative list (and with it, the only UI for Add Tag/Add Item/Add Gold, which live on `.combatant__command-button`s that only render on a `.selected` row) is completely hidden. There is no phone-reachable way to add a tag, item, or gold to a combatant right now. This isn't Phase 4/5 scope as written, but it's a real hole worth a conscious decision (fix now as a quick Phase 3.5, fold into Phase 4, or explicitly defer) rather than discovering it again from scratch.

**Verification gaps carried forward** (all flagged inline above too): no real-device touch pass yet (Phase 0's own "Done when" asks for one); Mana/Resources/Gold/Inventory-item rows never actually seen populated in the GM Tracker or Player View, only reasoned about via shared CSS with rows that were tested; `dvh` fallbacks never verified against a real iOS Safari session (only DevTools/Playwright viewport emulation, which doesn't reproduce the collapsing-address-bar behavior `dvh` exists for).

**Getting test data past the sample heroes' limits** (this ate real time in the 0-3 session, don't rediscover it):
- Sample heroes (Berserker, Cheat, Commander, Hunter, Mage, Oathsworn) never populate Mana, Resources, or Gold — Nimble's classes apparently don't use those resource types by default. Commander and others do populate Hit Dice + Wounds.
- `EnableInventory` defaults `false` (`common/Settings.ts`) — enable via Settings (gear icon) → Options tab → "Inventory" toggle before inventory content will render anywhere.
- `Settings.PlayerView.AllowPlayerSuggestions` defaults `false` — Player View's tap-to-suggest-damage popup silently no-ops without it. Settings → Options → "Allow players to suggest damage/healing".
- AC is hidden from Player View until the GM explicitly reveals it per-combatant (`toggle-reveal-ac` command, keybinding `Alt+h`, no default toolbar/row button — that command's `defaultShowOnActionBar`/`defaultShowInCombatantRow` are both unset).
- Add Tag *is* reachable via a row-level button (`.c-button--add-tag`) when a row is `.selected`, but Add Item/Add Gold have no default UI entry point at all (see the bug above) — they're wired to commands (`add-item`, `add-gold` in `client/Commands/BuildCombatantCommandList.ts`) with `defaultShowOnActionBar: false` and no keybinding, and don't appear in the Settings → Commands customization list either. Never found a way to trigger them through the UI in this session.
- The Player View URL needs the live encounter ID: read it from `document.documentElement.getAttribute("environmentJSON")` (JSON, has an `EncounterId` field) on the tracker page, then open `/p/<id>` in a separate context — same pattern as a real second-device setup.

**Local dev-server quirks hit repeatedly this session** (all Windows-specific):
- `npm run dev` spawns `mongodb-memory-server`; an unclean shutdown (e.g. killing node processes directly instead of letting `concurrently`'s SIGTERM cascade finish) leaves a stale `data/db/mongod.lock` that fails the next start with `DBPathInUse`. Fix: delete just that lock file (confirm no `mongod.exe` process is actually running first) before relaunching — never delete the rest of `data/db/`.
- `browser-sync`'s internal socket (`BROWSER_SYNC_SOCKET_PORT`, 3003 per `.env`) can be left orphaned by a previous run and blocks the *entire* `concurrently` group (`--kill-others`) with `EADDRINUSE`, even though ports 3000/3001 look free. Check/kill 3000-3003 together, not just 3000/3001.
- No `chromium-cli` available in this environment. Used a scratch npm project (`npm install playwright` in the scratchpad dir) driving Playwright directly against the already-cached Chromium in `~/AppData/Local/ms-playwright` — no browser download needed, just the npm package.

## Cross-cutting notes

- **Sequencing**: Phase 0 before Phase 1 because Phase 1's verification needs real touch reorder/resize to sanity-check the new layout. Phases 1-2 before 3 because the Tracker establishes the `@phone` breakpoint, `useIsMobile` hook, and card-grid CSS pattern that Phase 3 reuses. Phases 4-5 are independent and could be reordered or dropped.
- **Shared DndProvider risk**: any future change to `App.tsx`'s backend config affects the Tracker (Phase 1) and the statblock/spell editors (Phase 4) simultaneously — regression-test all consumers whenever it changes, not just the one being actively worked on.
- **No CSS framework**: all work stays hand-written LESS against the existing `@large/@medium/@small/@phone` convention — no framework introduced.

## Verification

This is a visual/interaction change — type-checking and existing unit tests will not catch layout overflow, touch-target sizing, or drag/scroll conflicts. For every phase: use the `run` skill to launch the dev server, then Chrome DevTools responsive mode at 375/390/430px — **with touch emulation enabled** for any phase touching drag-and-drop (Phase 0, and the reorder interactions in Phase 1/4), not just narrow width. For Phase 1, walk each `interfacePriorityClass` branch (combatant selected, libraries open, editor open, prompt shown, encounter active/inactive) at phone width, since each is a distinct layout state. For Phase 3, open `playerview.html`'s own mount point (separate bundle from the tracker) with a test encounter populated with every optional stat. Confirm no regression at desktop width after each phase (drag-and-drop especially, per Phase 0).
