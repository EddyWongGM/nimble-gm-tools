# Mobile view: overflow findings

**Status:** four issues found and fixed (CSS only). #4 (the layout-width
trap) is confirmed fixed live, against a deployed dev build, by the user —
the rest (#1, #2/#2b, #3) still only have `lessc`-compiles-clean
confirmation, not a live/visual check, since no browser/screenshot tool was
available in the session that made those changes.

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

### 3b. That fix's own `overflow-y: auto` exposed a second dead end: the close button scrolled out of view

Found live: after the #3 fix, opening Library Manager at 430px showed the
item list (Filter box + Bandit/Goblin/etc.) but no "Library Manager" title
bar or close (X) button above it — looked like the same dead end again.
Confirmed via DevTools this wasn't a hiding/visibility issue — the header
was in the DOM (`document.querySelector('.libraries__header')` returned a
real element with the close button inside it) — it was a *position* issue:
`getBoundingClientRect()` on it returned `top: -87.5`, i.e. scrolled 87.5px
above the viewport.

Root cause: [client/Library/Components/LibraryFilter.tsx:11-13](../client/Library/Components/LibraryFilter.tsx#L11-L13)
has always called `inputRef.current.focus()` on mount to autofocus the
filter box. `.focus()` defaults to scrolling the focused element into
view. That was a no-op everywhere this used to render (no scrollable
ancestor for it to scroll), but #3's own `overflow-y: auto` on
`.c-library-manager` made it a real scroll container — so on mount, the
browser scrolled the now-focused filter input into view, dragging the
header (rendered above it) off the top edge with nothing left to scroll
back with.

**Fix:** changed the call to `inputRef.current.focus({ preventScroll:
true })` — stops the browser from scrolling on focus at all, so the
autofocus behavior is preserved everywhere without the side effect.
Deliberately fixed at the source (the focus call) rather than papering
over it with a `position: sticky` header — this way any *other* future
cause of that container scrolling can't reproduce the same dead end.
**Not yet re-verified live** — needs the same phone-width open-Library-
Manager check, confirming the title bar and close button are visible
without scrolling.

## 4. Opening the spell prompt forced the whole layout wider than the viewport

Confirmed with a live before/after debugging session (screenshots plus
Console measurements against the deployed dev build), not just static
reading. This is the real cause of what looked, from the outside, like #2/
#2b's "name/row got wider than the screen" symptom recurring — a distinct
bug, one level higher up in the layout, that neither of those fixes
(nor a first, wrong-culprit attempt below) actually touched.

**Wrong turn first, kept here so it isn't re-investigated:** the initial
hypothesis was that `.combatant__commands` (hidden until a row is
`.selected`, then `display: flex`, in the `tagsCommands` grid-area shared
with `name`/`hp`/`ac`'s columns) was forcing those shared grid tracks wider
once revealed — reasoning that a wrapping flex container's *max-content*
size is spec'd as if wrap never happens, so `flex-wrap` alone wouldn't
protect the grid from it. That reasoning is correct in general, but a
direct measurement disproved it as the actual cause here: with DevTools
open on the deployed build, `getComputedStyle(document.querySelector('.combatant')).gridTemplateColumns`
was **identical** before and after selecting the row
(`22.39px 10px 225.28px 64px 51px` both times). The `.combatant__tags-commands-cell`
`width: 1px; min-width: 100%` fix built on that theory was reverted — it
compiled fine but (correctly, per this measurement) had no effect, which
is exactly what the user reported after deploying it.

**Actual cause, found by walking the measurement up the DOM tree:**
`document.querySelector('.encounter-view').clientWidth` read **430px**
with the table alone, but **469px** once the spell prompt was showing —
39px wider than the viewport itself
(`window.innerWidth` stayed constant at 430px throughout, and
`.encounter-view`'s own class list, `show-center-right-left`, was also
identical in both states, ruling out a layout-priority swap). `.encounter-view`
had genuinely rendered wider than the screen; the AC/HP content wasn't
being pushed by a sibling, it was riding along with an oversized ancestor.

Root cause: `.center-column` ([lesscss/pages/tracker.less](../lesscss/pages/tracker.less))
is a `flex: 1` child of `.encounter-view` with no `min-width` set. Flex
items default to `min-width: auto` — content's min-content size — so once
the spell prompt card's content needed more than 430px, `.center-column`
(and, propagating up, `.encounter-view` itself, since it has the same
default) was forced to *grow* to fit that content instead of shrinking and
letting the already-present `overflow-x: hidden` on `.center-column` clip
the excess. This is the same underlying "flexbox/grid min-width:auto trap"
as #2's `1fr` track and the ruled-out `auto`-column theory above — just one
level higher in the tree, on the outer column layout rather than inside
the table.

**First fix (incomplete):** added `min-width: 0;` to `.center-column` in
`lesscss/pages/tracker.less`. This is also why the `.prompts`/`.prompt`
`max-width: 100%` fix from #1 didn't fully resolve things on its own — that
caps a child's width *relative to its parent*, but doesn't help when the
parent itself is the one being forced wider by a *different* child's
min-content demand.

**Deployed, re-tested live, and still reproduced** — same symptom (the
AC/shield header and value pushed toward/past the right edge) via the same
real interaction (select a Mage → open a spell from its info panel → popup
shows). This time `getComputedStyle(document.querySelector('.center-column')).minWidth`
confirmed the fix *was* live (`'0px'`), so the trap had to be one level up
again. Walked it with the same clientWidth technique, one measurement at a
time, with the popup open:

| element | clientWidth |
|---|---|
| `.right-column` `scrollWidth` | `0` (hidden this state, not the cause) |
| `.encounter-view` | `508` |
| `#app__container` | `508` |
| `#tracker` | `430` (correct — matches viewport) |

`#tracker`, `#app__container`, and `.encounter-view` share one rule
([lesscss/pages/tracker.less:1-6](../lesscss/pages/tracker.less#L1-L6))
that gives all three `flex: 1` but, like `.center-column` before the first
fix, no `min-width` override. `#tracker` measured correctly because
nothing above *it* forces it wide — but `#app__container` and
`.encounter-view`, each independently a `flex: 1` item with the default
`min-width: auto`, were still individually capable of being forced wider
than the space their own parent would otherwise give them, one level above
where `.center-column` was already fixed. Same underlying trap, just not
fully stamped out on the first pass — fixing the innermost flex item
doesn't fix an ancestor that has the identical unset property.

**Fix:** added the same `min-width: 0;` to the shared
`#tracker, #app__container, .encounter-view` rule in `tracker.less`
(harmless on `#tracker`, which didn't need it, but keeps the chain
consistent). With `.center-column`, `.encounter-view`, and
`#app__container` all now able to actually shrink to the real viewport
width, `.center-column`'s existing `overflow-x: hidden` can finally do its
job and clip anything that still doesn't fit, instead of the whole layout
chain inflating to avoid clipping it.

**Confirmed fixed** — user re-tested against the redeployed dev build
(same repro: select Mage → open spell → popup shows) and confirmed the
AC/shield header now stays on-screen. Unlike the first ("center-column
only") fix, this one held.

Worth a look later: `.left-column`/`.right-column` (same file) likely have
the identical latent gap (no `min-width` override either) — not touched
here since they weren't implicated in this specific bug (confirmed hidden,
`scrollWidth: 0`, in the state that was tested), but the same "content
forces the column wider than viewport" failure mode could apply to them
too under different content/state.

## 4b. Library row actions (rename/move/delete/etc.) only ever revealed on hover, which touch doesn't have

Not an overflow bug — a discoverability dead end. Raised as a design
question first: on a touchscreen there's no cursor to hover a row with, so
is it bad design to just always show these icons at phone width? Answer:
no — hover-only affordances are a known accessibility/usability gap on
touch, and always-showing them below a touch-relevant threshold is the
standard fix, not a compromise.

[client/Library/Components/ListingRow.tsx](../client/Library/Components/ListingRow.tsx)
renders each row's rename/delete/edit/move/preview/boss/minion buttons via
`ListingButton`, all wrapped in `.c-listing-*` classes
([listing.less:41-59](../lesscss/components/listing.less#L41-L59)) that sit
at `opacity: 0` until `.c-listing:hover` or `:focus-within` — i.e. never,
on a device with no hover state and no reason to have focused the row
first. `:focus-within` already gave keyboard users a way in; touch had
none.

**Fix:** added a media query revealing them unconditionally —
`@media (max-width: @medium), (hover: none), (pointer: coarse)`. Both
conditions are included deliberately: `(hover: none)`/`(pointer: coarse)`
is the semantically correct target (an actual touchscreen, at any viewport
width), but `@medium` is included too since it's what this codebase's
entire mobile pass otherwise relies on, and since Chrome DevTools' plain
"Responsive" sizing mode (used throughout this session's live testing)
doesn't reliably flip the touch media features on its own — without it,
this fix could compile correctly and still visually not appear during the
same width-resize testing used for every other fix in this doc.

Not addressed: tap-target size. `.c-listing-button`'s existing padding
(`@medium-spacer` = 8px around a ~16px icon, ~32px total) is on the small
side of the ~44px commonly recommended minimum touch target — left alone
here since `.c-listing-button` is a shared, general-purpose class (not
library-row-specific), so enlarging it has a wider blast radius than this
visibility fix and deserves its own look rather than a drive-by change.
**Not yet verified live.**

## 5. StatBlock editor: a keyword's "+" add button overlapped the next column's label

Found live via screenshot at 430px width, editing a monster: the "Damage
Vulnerabilities" row's `+` button rendered on top of "Damage Resistances"
(the adjacent column), not next to its own label.

[client/StatBlockEditor/components/SortableList.tsx:49-55](../client/StatBlockEditor/components/SortableList.tsx#L49-L55) —
when a keyword list (Speed/Senses/Damage Vulnerabilities/etc.) is empty, it
renders `<span className="c-statblock-editor__label">{label}{addButton}</span>`
— label text and the add button as inline-flex siblings on one line
([lesscss/components/statblock-editor.less:301-314](../lesscss/components/statblock-editor.less#L301-L314)).
`.c-statblock-editor__keywords` is a 2-up CSS grid
([statblock-editor.less:439-448](../lesscss/components/statblock-editor.less#L439-L448))
narrow enough on phone that a two-word label like "Damage Vulnerabilities"
has to wrap. Plain text can still shrink to wrap (its min-content is just
its widest word), but the 50px button can't shrink at all and the row
never had `flex-wrap` set (defaults to nowrap) — so the row's combined
minimum (widest word + button) stayed wider than the ~185px column even
after the label text wrapped, and the excess rendered past the column
boundary into the neighboring grid cell. Same "flex min-content" family of
bug as #2/#4, just on a label+button row instead of a name column or a
layout column.

**Fix:** added `flex-wrap: wrap;` to `span.c-statblock-editor__label`
([statblock-editor.less](../lesscss/components/statblock-editor.less)) so
the button drops to its own line below the label instead of forcing the
row wider than its column. **Not yet verified live.**

## 6. StatBlock editor: a Trait/Action's Usage field rendered outside the card

Same screenshot: the "Usage (e.g. ...)" field on a Trait row (Parry,
Sneak, etc.) was cut off at the card's right edge instead of wrapping or
shrinking into view.

[client/StatBlockEditor/components/PowerField.tsx:24-47](../client/StatBlockEditor/components/PowerField.tsx#L24-L47)
renders one `.inline` row per Trait/Action: a grab-handle, a Name input
(general `input` rule — `flex-grow: 1`, 12rem baseline), a Usage input
(`input.usage` — fixed `width: 10rem`, `flex-grow: 0`), a delete icon, and
(on the last row) the add button. `.inline` is `display: flex;
flex-direction: row;` with no `flex-wrap` — on a phone-width card, Name +
Usage + the icons don't fit on one line even after the inputs shrink, and
with nothing allowed to wrap, Usage simply overflowed past the card's
right edge into the viewport.

**Fix:** scoped to where the problem actually is, not the shared base
`.inline` class (which `KeywordField.tsx` also uses for its single-input
row, elsewhere, without this problem) — added
`.c-statblock-editor__power-group .inline { flex-wrap: wrap; }`
([statblock-editor.less](../lesscss/components/statblock-editor.less)).
**Not yet verified live.**

## Known gap, not yet fixed: prompts have no visible way to cancel

Found live: opening the "Save Encounter As" prompt at 430px width showed
the label + input but no visible button to back out of it.
[client/Prompts/PendingPrompts.tsx:37-41](../client/Prompts/PendingPrompts.tsx#L37-L41)
shows this isn't Save-Encounter-specific or mobile-specific — every prompt
(`Prompt` in `PendingPrompts.tsx`, used for Save Encounter, Add Spell,
Scene reveal, roll-initiative, add-item/add-tag, etc.) can only be
canceled via the `Escape` key. That's always been true; it just never
showed up as a problem before because desktop always has an Escape key,
and touch devices don't.

**Planned fix (approved, not yet implemented):** add a visible close (X)
button to the shared `Prompt` component, wired to the same `onCancel` the
Escape handler already calls — fixes every prompt at once, on every
screen size, rather than special-casing Save Encounter or gating it to
phone width. Positioning needs care: `.prompt`'s own flex layout
(`justify-content: space-between`, exactly 2 children assumed — content,
then each prompt's own inline `SubmitButton`) can't just take a 3rd flex
child without risking misalignment across every different prompt variant's
internal layout (roll-initiative, add-item, add-tag, spell, scene, etc.
all lay out their own content very differently). Current plan: a small
button positioned *outside* `.prompt`'s padding box (small negative
top/left offset, `.prompt` given `position: relative`) — clear of both the
existing corner-overlapping submit button used by `.prompt-spell`/
`.prompt-scene` (top-right, via `transform: translateX(-100%)`) and of
each variant's own top-left content, since it never enters their padding
box at all.

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
