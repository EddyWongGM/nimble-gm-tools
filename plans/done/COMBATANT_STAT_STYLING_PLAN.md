# Combatant Stat Styling Plan

Last reviewed: 2026-08-23

## Goal

Give each combatant stat a distinct, consistent visual identity a player
can recognize and call out at the table — color first, but icon glyph is
part of the same identity and has been touched for the same reason (see
Wounds/Hit Dice/Inventory below). Sizing hasn't come up yet, but if it
does, it belongs in this doc alongside color and glyph rather than a new
plan — same stats, same seven-location duplication problem, same
per-location checklist. "Health = green, Mana = blue" was the starting
brief for color; the rest of the palette, and the constraint that shaped
it ("pick colors a player can name on sight"), were worked out along the
way.

## Current palette

| Stat | CSS var | Light | Dark | Status |
|---|---|---|---|---|
| Health | *(kept as-is — see Non-goals)* | `rgb(200,30,30)` red for label/value | same | a few identity icons only → `--green` |
| Mana | `--blue` | `#0078dc` | `#4da3ff` | done |
| Resources | `--yellow` | `#ab9400` | `#ffe135` | done |
| Hit Dice | `--orange` | `#e67814` | `#ff9a3d` | done |
| Wounds | `--wound-red` | `#c81e1e` | `#f0453b` | done |
| Inventory | *(none)* `var(--text-face)` | theme default (black/white) | same | done |
| Gold | `--gold` | `#d4a32a` | `#f0c552` | done |

"Done" means all locations for that stat (7, or 6/5 for a stat with no DM
detail-panel label and/or no resource bar — see the audit below) point at
the var/value above, in both the DM tracker and the player view. **HP and
Wounds are both in the red family** — known and accepted, not an
oversight; see "HP" under Non-goals.

Colors that were tried and rejected: `--amber` (Hit Dice, then Inventory)
and a Wounds-specific magenta — both dropped because they're hard for a
player to identify and say out loud at the table. That's the operative
constraint for any future color pick here, not just "looks distinct on
screen."

## Guiding principles

- **Identity color vs. severity color are different jobs — don't conflate
  them.** Identity color answers "which stat is this?" (a fixed color per
  stat: label, icon, bar). Severity color answers "how full/empty is this
  right now?" HP has the only real severity indicator in this system: a
  red↔green *interpolated* gradient in `GetHPColor`
  ([ToPlayerViewCombatantState.ts:350-366](client/Combatant/ToPlayerViewCombatantState.ts#L350-L366))
  and `CombatantRow.tsx`'s
  [renderHPBarStyle](client/InitiativeList/CombatantRow.tsx#L634-L637) —
  left untouched throughout this plan. Everything else that looked like it
  might be severity-based (the shared mini progress-bar component, in
  particular) turned out to be a fixed two-tone component with only the
  *width* varying, not the color — so it's identity color after all, and
  in scope.
- **Pick colors a player can name.** Added after the fact, once amber and
  magenta both got flagged as hard to call out. A hue a player can point at
  and say ("the yellow one," "the orange one") beats a technically-distinct
  color that reads as "that brownish one."

## Where each stat's styling lives (why every stat needs 6–7 edits)

Each stat's color is duplicated across up to seven independent locations —
there's no shared source of truth beyond the CSS vars themselves. The same
seven also carry icon glyph for the stats that needed one changed (Wounds,
Hit Dice, Inventory, and — for a different reason — the five
`apply-temporary-*` buttons) — there's no separate audit for glyphs, they
ride along with color at whichever of these sites render that stat's icon.
The `apply-temporary-*` buttons are their own case: all five originally
shared one generic `medkit` glyph (in
[BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts)),
distinguished only by button color from location #1 below. Each was
switched to its stat's own identity icon (`heart`/`tint`/`bolt`/`dice-d20`/
`skull`) plus a small "+" badge layered on with a CSS `::after` pseudo-element
(`.temporary-badge()` mixin in buttons.less) — deliberately *not* routed
through the shared `Button.tsx`/`CommandButton.tsx` components used by 30+
unrelated screens, so the badge stays scoped to these five button classes
without touching generic button-rendering logic:

1. **[buttons.less](lesscss/components/buttons.less)** — temp-apply/reveal
   button icon colors.
2. **[statblock.less](lesscss/components/statblock.less)** — the DM
   detail-panel `.stat-label` text color. *(Gold and Inventory have no
   label here — neither is rendered as a labeled stat in
   `CombatantDetails.tsx`, only in the tracker row and player view.)*
3. **[combatants.less](lesscss/components/combatants.less)** — the shared
   `.combatant__hp-bar` mini progress-bar component, used by both the DM
   detail panel and the tracker row (per-stat override, e.g.
   `.combatant__hitdice-inner .combatant__hp-bar`). *(Gold has no bar
   either — it's a simple count, not a current/max pool — so it's a
   5-location stat overall, one fewer than Inventory's 6.)*
4. **[ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts)**
   — one `Get*Color` function per stat, feeding the player-view screen.
5. **[CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx)** — the DM
   tracker row has *its own* copies: a `get*Style()` function for the value
   text, a `combatant__mobile-icon` glyph for the collapsed/mobile layout,
   and sometimes a second mobile-icon fallback branch for an alternate
   render path (see the per-stat notes below for which fallbacks need
   color and which are intentionally left neutral).
6. **[InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx)**
   — the tracker's column-header icons, one per stat.
7. **[PlayerViewCombatantHeader.tsx](client/PlayerView/components/PlayerViewCombatantHeader.tsx)**
   — the player-view's own column-header icons, a separate copy of #6.

This is the same class of problem
[RESOURCE_POOL_HELPER_PLAN.md](plans/RESOURCE_POOL_HELPER_PLAN.md) found
and fixed on the math side (per-resource logic copy-pasted and drifting);
this is the color-side equivalent, with more copies. Every stat done in
this plan was found to be missing at least one of these seven locations on
a first pass — always worth grepping the *old* color value across the
whole repo after "finishing" a stat, not just the locations you remember
touching.

## Known gotchas

**A var referenced everywhere updates for free on rename/repoint; a
hardcoded literal kept alongside it for a reason (e.g. needing its own
alpha channel) does not.** Wounds' "0 current, no temporary" faded state in
`CombatantRow.tsx`'s `getWoundsStyle()` is `rgba(<r>,<g>,<b>,0.4)`, not
`var(--wound-red)`, because it needs an alpha the var can't carry — so
every time Wounds' color changed, this literal needed a matching manual
edit that `grep`-for-the-var wouldn't catch.

**The two column-header icons don't share one background rule anymore —
check each context separately.** `.combatant--header` (in
[combatants.less](lesscss/components/combatants.less)) still pairs
`var(--text-inverted)` text with `var(--page-bg-inverted)` background,
which inverts with site theme (dark bar in light mode, lighter bar in dark
mode) — that's still true for the **DM tracker header**
(`InitiativeListHeader.tsx`). A stat using a *neutral* theme-relative color
(`var(--text-face)`) is invisible there in dark mode, since the background
goes light while the icon goes black. Inventory's DM-header icon still
needs the `var(--text-inverted)` exception for this reason.

The **player-view header** (`PlayerViewCombatantHeader.tsx`) is different:
its background was later pinned to always-dark
(`background-color: var(--grey); color: var(--white);` in
[player-view.less](lesscss/pages/player-view.less), overriding the shared
rule for `#playerview` specifically — the bright, theme-flipped bar was
washing out the per-stat icon colors it's supposed to show off). Once that
background stopped flipping, `var(--text-inverted)` stopped being the
right icon color too — in dark mode it still resolves to black, now
sitting on a background that's *also* dark. Inventory's player-view icon
was updated to a fixed `var(--white)` to match. **Rule of thumb: whichever
color a neutral icon uses must track whatever its actual background does
in that specific context, not assume the two header instances behave the
same.**

**Font Awesome glyphs aren't always vertically centered the same way
within their own box.** Inventory's `fa-dice-d6` rendered visibly higher
than its sibling icons in the player-view header, even though the markup
and CSS are identical across all icon columns — purely a glyph-metrics
quirk. Fixed with a one-off `position: relative; top: 2px;` on that single
icon instance; not something `tsc`/`less` would ever catch, only a visual
check.

## Non-goals

- **HP, apart from a few identity-icon exceptions.** Reviewed and kept as
  its original red — `GetHPColor`/`renderHPBarStyle`'s severity gradient,
  the `.combatant__hp-bar` component, and the DM detail-panel label are
  untouched, superseding the original "Health = green" starting brief.
  Two icon locations were later switched to `var(--green)` as narrow,
  separately-requested exceptions: the two column-header heart icons (a
  header can't reflect one combatant's dynamic HP%, so a fixed green was
  the closest equivalent to "what full HP looks like"), and the
  `apply-temporary-hp` button icon in buttons.less (brought in line with
  every other stat's "apply temporary X" button, which already uses that
  stat's identity color). `apply-damage`/`apply-healing` and the DM
  detail-panel label are still red — not yet requested. This is *why* HP
  and Wounds share the red family everywhere else — accepted as fine,
  since they're still distinguishable by icon (heart vs. skull) and
  position; revisit only if it's a real problem at the table.
- `combatant__has-taken-turn-icon`'s `var(--green, seagreen)` — an
  unrelated "turn taken" indicator, not a stat color.
- A shared TS constants module to de-duplicate
  `ToPlayerViewCombatantState.ts`/`CombatantRow.tsx`'s color functions —
  considered once, rejected as a new architectural element that isn't
  justified by the amount of drift actually observed (updating literals in
  place has worked cleanly every time).
- Icon glyph changes beyond Wounds (`fa-skull-crossbones` → `fa-skull`),
  the Hit Dice/Inventory swap (`fa-dice-d6` ↔ `fa-dice-d20`/`fa-gem`), and
  the `apply-temporary-*` buttons (see "Where each stat's styling lives" —
  base glyph swapped from a shared generic `medkit` to each stat's own
  identity icon, plus a small "+" badge). No *other* stat's glyph is in
  scope beyond those.
- The Tags badge color, the combatant-name font size, and the Rename
  command's position in the toolbar — all real fixes, but none of them are
  a per-stat identity property, so they don't belong in this doc. Tracked
  only in conversation/commit history, not here.
- Inventory's over-capacity warning color (`rgb(200,30,30)`, in
  `GetInventoryColor`/`getItemsStyle`) — a genuine severity signal ("over
  your item limit"), not Inventory's identity color, so it's out of scope
  the same way HP's gradient is.

## Remaining work

Every stat is now done — Gold was the last one, approved and rolled out
2026-08-23: `--gold` added to [colors.less](lesscss/base/colors.less)
(`#d4a32a` light, inherited unchanged from the pre-plan hardcoded
`rgb(212,163,42)`; `#f0c552` dark, brightened following the same pattern as
every other var). Gold turned out to be a **5**-location rollout, not 6 or
7 — it has no DM detail-panel label (like Inventory) *and* no resource bar
(it's a simple count, not a current/max pool, so `combatants.less` needed
no override): just buttons.less, `ToPlayerViewCombatantState.ts`'s
`GetGoldColor`, `CombatantRow.tsx`'s `getGoldStyle()`, and both column
headers. Its mobile icon and the non-player-character fallback icon both
inherit/stay neutral, same as Mana's and Resources' equivalents. Gold's
real-hue color needed no header-gotcha handling (only neutral "theme
default" colors do).

**Only a dark-mode contrast pass remains open.** Every var was
eyeballed and confirmed good in the browser, not run through a
contrast-ratio tool. `--yellow` is the one most worth double-checking:
a readable yellow on a light background is a narrower target than the
other hues (too pale washes out on white; too dark stops reading as
"yellow"). Worth a side-by-side glance too: `--yellow` and `--gold` sit
close enough in hue that Resources and Gold showing at once in the same
tracker row is the one place two "done" stats could still be mixed up on
sight — not flagged as a problem, just the spot to check first if a report
comes in.

## Verification

- `npx grunt less` and `npx tsc --noEmit -p client/tsconfig.json` after
  every change — both stayed clean throughout.
- Jest (`npx jest --config client/jest.config.js -t "<pattern>"` scoped to
  the affected stat) whenever a change touches a tested function —
  `GetHitDiceDisplay`, `GetHitDiceColor`, and `GetInventoryColor` all have
  literal-value assertions in `Combatant.test.ts` that needed updating in
  lockstep with each color change; `tsc`/`less` don't catch a stale string
  literal in a test.
- **A client bundle rebuild is required for `.tsx`/`.ts` changes** —
  `npx grunt less` only rebuilds CSS. Use `npx grunt build_dev`/`build_min`,
  or the `npm run dev` watcher, before checking TS-driven surfaces (tracker
  row, both column headers, player view) in the browser. Skipping this
  once caused real confusion: the CSS was already correct, but a
  JS-driven text color hadn't rebuilt, and it looked like the fix hadn't
  worked at all.
- Visual check in the browser, both themes, across all three surfaces (DM
  detail panel, DM tracker row, player view) — done for every stat,
  including Gold.
