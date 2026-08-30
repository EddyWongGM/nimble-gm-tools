# Player Hero Card — Phase 1 Implementation Plan

Last reviewed: 2026-08-30

Implementation plan for Option 4 / phase 1 from
[plans/private/PLAYERSHEET.md](private/PLAYERSHEET.md) (research/background,
not tracked in git — see that doc for the fuller option comparison and open
product questions). This doc only covers building phase 1: a player, already
viewing the public `/p/:id` Player View on their phone, taps their own row
and sees a focused single-character card instead of the full party table.

Not yet started — this is the plan to review before writing code.

## Scope boundaries

Explicit non-goals for phase 1, to keep this change small and low-risk:

- No new server route, socket event, or persisted schema field.
- No full stat block (abilities/skills/actions/traits) — that's phase 2,
  and needs new data on the wire this doc doesn't touch.
- No standalone/persistent link — the focused view only exists inside an
  active `/p/:id` session, same lifecycle as today.
- No new dependency.
- No change to the shared/full-party list's existing layout or behavior —
  the focused card is an additive view, not a retrofit of
  `lesscss/pages/player-view.less`'s existing TV/projector-tuned rules.

## Current architecture (what this plugs into)

- `client/PlayerView/ReactPlayerView.tsx` — non-React glue: owns the socket,
  calls `renderReact(<PlayerView ... />, element)` on every update
  (`"encounter updated"`, `"settings updated"`, etc.).
- `client/PlayerView/components/PlayerView.tsx` — the React component that
  currently renders `PlayerViewCombatantHeader` + a `<ul>` of
  `PlayerViewCombatant` rows, plus various modals (portrait, damage/tag
  suggestion, combat stats, inventory) via its own `LocalState`.
- `client/PlayerView/components/PlayerViewCombatant.tsx` — one `<li>` row:
  name, HP/Mana/Resources/HitDice/Wounds/Inventory/AC/Gold, tags. Already has
  click handlers for portrait (`showPortrait`), HP (`suggestDamage`), and a
  tag-add button (`suggestTag`) — any new tap target must not collide with
  these.
- Data shape: `common/PlayerViewCombatantState.ts` — already includes `Id`,
  `Name`, `IsPlayerCharacter`, and every display string/color field
  (`HPDisplay`/`HPColor`, `ManaDisplay`/`ManaColor`, ...), `Tags`,
  `ImageURL`. Phase 1 uses only what's already here.

## Design

### State: `focusedCombatantId`

Add `focusedCombatantId: string | null` to `PlayerView`'s existing
`LocalState` in `PlayerView.tsx`. Set it via a new `focusCombatant`
handler, clear it via `unfocusCombatant` (the card's "back" control).

React reconciliation should preserve this across the re-renders
`ReactPlayerView.renderPlayerView` triggers on every socket event, the same
way `showPortrait`/`showCombatStats` etc. already survive those re-renders
today — worth confirming explicitly while implementing (add a test: focus a
combatant, simulate a prop update from a fresh `encounterState`, assert
focus is retained), since this is the one thing phase 1 is implicitly
relying on for correctness.

Handle the case where the focused combatant is no longer in
`encounterState.Combatants` (removed by the GM, or a bad/stale id) by
falling back to the full list rather than rendering nothing.

Optional, out of the first cut unless wanted: mirror `focusedCombatantId` to
`location.hash` (e.g. `#c-<id>`) so the browser back button un-focuses and a
mid-session refresh restores focus. Keep this as a separate follow-up commit
if pursued — it's the only piece that would touch browser history/global
state rather than local component state.

### Tap target

Add an explicit affordance in `PlayerViewCombatant.tsx` (e.g. a small icon
next to the name, or the name itself) rather than overloading an existing
click handler. New prop: `onFocus?: (combatant: PlayerViewCombatantState) => void`.

Open question, recommend PC-only: should the tap target appear on every row,
or only rows where `combatant.IsPlayerCharacter` is true? Recommend
PC-only for phase 1 — it matches "view their hero" directly and avoids a
separate question about whether players should be able to zoom into a
monster's card. Can widen later without any structural change.

### Focused card rendering

New component: `client/PlayerView/components/PlayerViewFocusedCombatant.tsx`.
Renders one combatant large: name, portrait (if `DisplayPortraits` is on and
an image exists), then each already-computed display/color pair
(HP/Mana/Resources/HitDice/Wounds/Gold/Inventory — only the ones that are
`!= undefined`, same visibility rule the list already uses), tags, and a
"back to party view" control.

In `PlayerView.render()`: if `state.focusedCombatantId` resolves to a
combatant currently in `encounterState.Combatants`, render
`<PlayerViewFocusedCombatant>` in place of
`PlayerViewCombatantHeader` + the `<ul>` of rows; otherwise render today's
list unchanged. Existing modals (portrait, suggestion prompts, combat
stats, inventory) stay wired the same way regardless of focus state.

### Styling

Add a new, purpose-built card layout to
`lesscss/pages/player-view.less` (new class, e.g. `.combatant-focused-card`)
rather than reusing/adapting the existing `.combatant`/`.combatant--header`
flex-row rules, which are deliberately sized for a screen "visible to
players from a distance (projector/TV)". A dedicated card avoids any risk
of regressing that shared layout and can be phone-first from the start:
single column, large type, generous tap targets.

`lesscss/base/responsive.less` is not touched by this plan — a responsive
pass on the *existing* full-party list (Option 1 in the research doc) is a
separate, independent piece of work, not a prerequisite for this one.

### Sockets / data flow

No changes to `ReactPlayerView.tsx`, `server/sockets.ts`,
`common/PlayerViewCombatantState.ts`, or
`client/Combatant/ToPlayerViewCombatantState.ts`. Phase 1 is entirely a
client-side rendering change layered on data already flowing today.

## Step-by-step

1. `client/PlayerView/components/PlayerViewCombatant.tsx` — add `onFocus`
   prop and tap target, gated to `IsPlayerCharacter` per the decision above.
2. `client/PlayerView/components/PlayerView.tsx` — add `focusedCombatantId`
   to `LocalState`; add `focusCombatant`/`unfocusCombatant`; wire `onFocus`
   into each row; add the render branch (focused card vs. full list); handle
   the "focused combatant no longer present" fallback.
3. New `client/PlayerView/components/PlayerViewFocusedCombatant.tsx`.
4. `lesscss/pages/player-view.less` — add the focused-card styles.
5. Tests — extend `client/PlayerView/PlayerView.test.tsx` (existing pattern:
   `buildEncounter`/`addCombatantFromStatBlock` + React Testing Library
   `render`/`fireEvent`):
   - Tapping a PC row's focus affordance shows the focused card for that
     combatant.
   - The "back" control returns to the full list.
   - Focus persists across a simulated prop update (new `encounterState`
     from a socket event) for the same combatant id.
   - If the focused combatant is removed from `encounterState.Combatants`
     between renders, the view falls back to the full list instead of
     crashing.
   - (If `IsPlayerCharacter`-gating is implemented) a monster row has no
     focus affordance.
6. Manual verification: `npm run dev`, open `/p/:id` in a phone-width
   viewport (devtools device emulation, or an actual phone on the same
   network) alongside the GM tracker; add a couple of PCs and a monster to
   an encounter; confirm tap-to-focus, back navigation, and legibility at
   phone width; confirm HP/Mana/etc. changes pushed from the GM tracker
   still update the focused card live.

## Open implementation questions

Worth settling (with the user, or by picking the stated recommendation and
flagging it) before/while coding:

1. Tap target scope — PC rows only (recommended) or all combatants?
2. Is the optional `location.hash` deep-link/back-button behavior in scope
   for this first cut, or deferred to a follow-up?
3. Visual design of the focused card beyond "bigger" — any reference/mock
   wanted, or default to following the existing per-resource theme
   variables (`--green`, `--blue`, `--magenta`, etc.) already used by the
   list view for visual consistency?

## Relationship to other work

- Phase 2 (full stat block on the focused card) and Option 1 (a responsive
  pass on the existing whole-party list) are both out of scope here and
  should get their own plan doc(s) when picked up — see
  [plans/private/PLAYERSHEET.md](private/PLAYERSHEET.md) for that
  comparison and the reveal-settings question phase 2 will need to resolve.
