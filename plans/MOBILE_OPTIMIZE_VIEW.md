# Mobile view: overflow findings

**Status:** three fixes applied (CSS only), not yet verified on a real device
or in a live narrow-viewport browser — no browser/screenshot tool was
available in the session that made these changes, so everything below was
diagnosed by reading the LESS/TSX and confirmed only by `lessc` compiling
without error, not by rendering.

## Context

A screenshot taken on an Android phone (physical resolution 930x2048,
~2.2:1 — a plausible scaled-down phone viewport, not a distorted one) showed
the Tracker's center column with content running past the right edge of the
screen: a spell card's corner button and its "Source: ..." line, and
separately the combat footer's difficulty text. Investigated as real
horizontal-overflow bugs rather than a viewport-size artifact.

Before touching anything, checked git history for prior mobile work:
`0902c473` ("Mobile-friendly redesign: touch DnD, responsive layout, phone
breakpoints") was fully reverted in `467b642a`/`af211f18`. That revert
swapped the drag-and-drop backend (react-dnd-touch-backend) in addition to
CSS wrapping fixes, and touched `CombatantDetails.tsx`, `CombatantRow.tsx`,
`interfacePriorityClass.tsx`, and five `.less` files. None of the three
issues below overlap those files, so these are new gaps in areas the revert
never touched — not a re-litigation of that decision. Nothing here changes
the DnD backend.

## 1. Spell card / "Add Spell" prompt overflowed past the viewport

[client/Prompts/SpellPrompt.tsx](../client/Prompts/SpellPrompt.tsx) renders
a `.prompt-spell` card whose submit (checkmark) button is deliberately
positioned via `transform: translateX(-100%)` to float over the card's
top-right corner — see the comment at
[lesscss/components/spell.less:22-29](../lesscss/components/spell.less#L22-L29).
That trick only lands inside the card if the `.prompt` dialog itself never
grows wider than the viewport, and neither `.prompt` nor `.prompts` had any
width cap — unlike the hover-preview `.c-overlay`, which already gets
`max-width: 100%` at `@small` in
[lesscss/base/responsive.less](../lesscss/base/responsive.less).

Separately, `.spell-footer`'s two children share one row
(`justify-content: space-between`): `.spell-upcast` can shrink, but
`.spell-source` is `flex-shrink: 0` (so its own text never wraps
mid-word) — see
[lesscss/components/spell.less:91-117](../lesscss/components/spell.less#L91-L117).
With both children present, that row's min-content could be wider than a
phone screen, forcing the whole card wider than the viewport (matching the
"Source: Core Rules Sp[...]" text seen cut off in the screenshot).

**Fix:**
- [lesscss/base/responsive.less](../lesscss/base/responsive.less) — added
  `.prompts, .prompt { box-sizing: border-box; max-width: 100%; }` inside
  the existing `@media (max-width: @small)` block, next to `.c-overlay`.
- [lesscss/components/spell.less](../lesscss/components/spell.less) — added
  `@media (max-width: @phone)` rule that sets `.spell-footer { flex-wrap:
  wrap; }` and gives `.spell-upcast`/`.spell-source` each `flex-basis: 100%`,
  so Source drops to its own line instead of squeezing next to Upcast.

## 2. Combatant name column acted like a fixed width on phone

[lesscss/components/combatants.less:241-258](../lesscss/components/combatants.less#L241-L258) —
when a combatant has no optional stat columns enabled (only HP/AC — matches
the screenshot, which showed only a heart/HP column), `CombatantRow.tsx`
adds the `combatant--inline-stats` modifier
([client/InitiativeList/CombatantRow.tsx:531-533](../client/InitiativeList/CombatantRow.tsx#L531-L533)),
which at phone width puts Name/HP/AC on one CSS grid row with Name in a
`1fr` track and `white-space: nowrap` on `.combatant__name`.

Grid items default to `min-width: auto` (their content's min-content) —
combined with `nowrap`, that min-content is the full unwrapped name, so the
`1fr` track could never actually shrink below whatever the longest visible
name needed. The row (and the table) got forced wider than the screen for
any name that wasn't very short — reads as "the name column has a fixed
width" since it doesn't respond to available space at all.

**Fix:** added `min-width: 0` (lets the track honor `1fr` and shrink) plus
`overflow: hidden; text-overflow: ellipsis;` so a long name truncates
cleanly instead of blowing out the row. Committed as `c823e53`.

### 2b. Same symptom returns once any optional stat column shows (e.g. a spellcaster's Mana)

The `combatant--inline-stats` fix above only applies when `hasOptionalStatColumn`
is false. That flag is computed **table-wide** in
[client/InitiativeList/InitiativeList.tsx:22-52](../client/InitiativeList/InitiativeList.tsx#L22-L52) —
e.g. `showManaColumn = EnableMana && encounterState.Combatants.some(c =>
c.StatBlock.Mana)`. So the moment *any* combatant in the encounter has Mana
(a spellcaster, matching the "spell info card" scenario that prompted this),
every row — including ones with no optional stats of their own — drops out
of `combatant--inline-stats` and into the general many-column grid template
([combatants.less:213-236](../lesscss/components/combatants.less#L213-L236)),
where the c823e53 fix doesn't apply and names looked like they'd stopped
shrinking again.

In that layout, "name" spans several `grid-template-columns: auto` tracks
that are *shared* with the stat-column row below it (hp/ac/mana/etc, each
its own single-track fixed width — `combatant__mana`/`resources`/`hitdice`/
`wounds`/`itemsslots` are all `width: 4rem`, `combatant__ac` `3rem`,
`combatant__gold` `3.5rem` — none of those widths are relaxed at
`@medium`). Two separate things follow from that:

- Switching name to `nowrap` + ellipsis (mirroring the `combatant--inline-stats`
  fix) would be unsafe here: unlike a `1fr` track, `auto` tracks size to
  fit their content, so nowrap text's full-name min-content would force
  the shared tracks — and the whole row — wider, reproducing the same
  overflow via a different mechanism. `white-space: normal` (wrap) is
  actually the correct choice for this shared-track layout; wrapping
  keeps the name's min-content down to its widest word, so it can't force
  the tracks wider.
- **Fix applied:** kept the wrap, but bounded it with `display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;`
  so a very long name still gets ellipsized after 2 lines instead of
  growing the row's height unbounded — an intentionally different
  technique from 2a's single-line ellipsis, not an inconsistency.
- **Not fixed / deferred (user's call):** even with the name bounded, the
  row can *still* overflow horizontally on its own — the fixed-width stat
  columns (`4rem`/`3.5rem`/`3rem` each) simply don't shrink or wrap at
  phone width, and several showing at once (e.g. Mana + Resources +
  HitDice) can add up to more than a phone's viewport regardless of the
  name. Properly fixing that means making each optional stat column
  itself flexible/wrappable at phone width — a bigger change, closer in
  size and shape to the mobile redesign that was reverted before (see
  Context above). Worth its own investigation/plan before touching it.

## 3. Library Manager's left pane (item list) could vanish with no way back

Not a viewport-size artifact this time — a real, reachable dead end, and
not phone-specific: it starts as soon as the window drops below `@large`
(1200px).

[client/Library/Manager/LibraryManager.tsx](../client/Library/Manager/LibraryManager.tsx)
renders three sibling panes directly inside the same `.encounter-view`
wrapper the main Tracker uses
([client/App.tsx:213-222](../client/App.tsx#L213-L222)): a list pane
classed `left-column` (LibraryManager.tsx:58, reused purely for its card
styling), a `c-library-manager__center` selected-item pane, and a
`c-library-manager__editor` pane. `lesscss/base/responsive.less` has
several rules, scoped to `.encounter-view.show-*`, that hide `.left-column`
below `@large`/`@small` depending on `interfacePriority`
([client/Layout/interfacePriorityClass.tsx](../client/Layout/interfacePriorityClass.tsx)).
`interfacePriority` is computed once in App.tsx from Tracker-only state
(`librariesVisible`, prompt/selection state, encounter state) that has
nothing to do with Library Manager, and is never recomputed or overridden
while Library Manager is open.

Library Manager opens two ways: the "Open Library Manager" button inside
the reference pane (only reachable while `librariesVisible` is already
true — always safe, resolves to `show-left-center-right`), or the
standalone toolbar icon (`TrackerViewModel.ToggleLibraryManager`,
`BuildEncounterCommandList.ts:94-99` — reachable regardless of
`librariesVisible`). If the reference pane was previously closed (a normal
flow — it has a close button for reclaiming space) and the user reopens
Library Manager via the toolbar icon, the list can get `display: none`'d.
Nothing inside Library Manager reveals it again — `PaneHeader`'s close
button and `LibraryManagerToolbar`'s "Return to Tracker" both exit Library
Manager entirely rather than restoring the list.

Also: [lesscss/components/library-manager.less](../lesscss/components/library-manager.less)
had zero breakpoint rules, and `.c-library-manager__editor` had a
hardcoded `width: 720px` — so even with the list visible, its row layout
would still overflow a narrow screen next to the always-shown center/editor
panes.

**Fix:** rather than repurposing the Tracker's `librariesVisible`/
`interfacePriority` state (which would leak side effects back into the
Tracker view on close, e.g. silently re-showing a reference pane the user
had deliberately hidden), decoupled Library Manager's layout from it
entirely. Added a `@media (max-width: @large)` block to
`lesscss/components/library-manager.less` that: stacks the three panes
(`flex-flow: column`) instead of a row, so nothing needs to be hidden to
avoid horizontal overflow; forces `.left-column` visible/full-width with
`!important` (needed — the existing `.encounter-view.show-*` selectors are
more specific); adds `overflow-y: auto` on `.c-library-manager` itself
since its parent `.encounter-view` is `overflow: hidden`
([lesscss/pages/tracker.less:8-9](../lesscss/pages/tracker.less#L8-L9)) —
without that, stacked content taller than the viewport would just be
clipped instead of scrollable; and drops the editor's hardcoded `720px`
so it doesn't force overflow once stacked full-width.

## 4. Selecting a combatant pushed AC/HP off-screen (unrelated to the name column)

Confirmed with before/after screenshots from the user, not just static
reading — this turned out to be a different bug than #2/#2b above, despite
looking similar (both are "the row got wider than the screen").

Before selecting: header shows Name/HP/AC, all three fit. After tapping a
combatant (which selects it and opens one of its spell cards below) the row
gets a `.selected` green border, the AC header cell is no longer visible —
not hidden, *pushed past the right edge* (a shield-icon fragment is visible
right at the cut-off edge) — and HP's value area shrinks too.

`.combatant__commands` ([combatants.less:723-732](../lesscss/components/combatants.less#L723-L732))
is `display: none` until the row is `.selected`, at which point it switches
to `display: flex` and renders one button per applicable command
([CombatantRow.tsx:484-490](../client/InitiativeList/CombatantRow.tsx#L484-L490)) — so this content doesn't exist in the layout at all until
selection. It lives in the `tagsCommands` grid-area, which — in both the
`combatant--inline-stats` and general grid templates — spans the *same*
`auto`/`1fr` columns that `name`/`hp`/`ac` also use in the rows above it.

`.combatant__tags-commands-wrapper` already has `flex-flow: row wrap`, so
it was reasonable to assume it couldn't force extra width — that assumption
was wrong. A wrapping flex container's **max-content size** (what an
ancestor grid's `auto` columns use to decide how big to grow) is, by
spec, computed as if wrapping never happens — the sum of every child laid
out on one line. `flex-wrap` only changes behavior once a width has
already been assigned to the container; it has no effect on what width the
grid *asks for* while computing that width in the first place. So the
moment selection revealed a row of command buttons, that row's full
single-line width got fed into the same shared columns name/hp/ac live in,
forcing them wider than the screen — explaining exactly what the
screenshots show.

**Fix:** on `.combatant__tags-commands-cell`
([combatants.less:635-646](../lesscss/components/combatants.less#L635-L646)),
replaced `width: 100%` with `width: 1px; min-width: 100%;` at the same
`@media (max-width: @medium)` breakpoint. `width: 1px` reports a
near-zero size for the grid's sizing pass (instead of the wrapping
container's full max-content), so it stops forcing the shared columns
wider; `min-width: 100%` then stretches the cell back to fill whatever
width the row actually ends up with, once that's been determined by
everything else.

## Still open / not investigated

- The combat footer's `.footer-bar` (round counter / encounter-difficulty
  text, [lesscss/components/combat-footer.less](../lesscss/components/combat-footer.less))
  was suspected from the original screenshot (an "E..." fragment cut off at
  the bottom edge) but not confirmed — its spans use default
  `flex-shrink: 1` with wrappable text, which doesn't obviously reproduce
  the same min-content trap as #1/#2 above. Worth a real-device look before
  assuming it needs the same treatment.
- None of this was verified visually — no browser automation/screenshot
  tool was available in-session. Next mobile pass should open the Tracker
  at a phone-width viewport (devtools or a real device) and check: the
  "Add Spell" prompt, a combatant with a long name and only HP/AC tracked,
  the combat footer, and — for #3 — opening Library Manager via the
  standalone toolbar icon (not the reference-pane button) after closing
  the reference pane, at <1200px width, confirming the list is visible and
  reachable and nothing overflows horizontally.
