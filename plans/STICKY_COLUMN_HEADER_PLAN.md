# Sticky column header at narrow width

## Goal

At `@medium` and below, show one icon-labeled header row (reusing the existing
`InitiativeListHeader` component, already built and already used on desktop)
instead of hiding it, keep it pinned while the list scrolls, and remove the
now-redundant icon from every row.

## Why this isn't just "delete `thead { display: none; }`"

- **Column alignment is the crux.** Rows are `display: grid` at this width,
  not a real `<table>` layout, so header and row cells won't auto-align like
  real table columns do — the header needs the same `grid-template-columns`
  as the rows. Every aligning column already has a fixed width (left-gutter
  `1.4rem`, hp `4rem`, ac `3rem`, etc.) rather than content-based sizing, so
  as long as the header repeats the identical fixed widths, alignment falls
  out for free without measuring anything at runtime. (Only the compact
  `combatant--inline-stats` shape actually uses `1fr` for `name` — the
  original many-column shape has no `1fr` at all; its `name` row just spans
  the other columns. The header's grid-template for that shape needs to set
  explicit widths on every column itself, since it won't have a second row to
  borrow sizing from the way body rows do.)
- **Two row shapes to match.** The compact `combatant--inline-stats` template
  (5 columns: name/hp/ac) and the original many-column stacked template are
  structurally different — the header needs a matching variant for each,
  toggled by the same list-wide flag.
- **`position: sticky` will silently fail without a targeted fix.**
  `combatants.less:67-71` has `.combatants, .combatants * { position: static; }`
  — a blanket rule (added to silence a console warning) that will stomp on
  any `position: sticky` on the header. Needs a selector specific enough to
  override it (e.g. `.combatants thead.combatant--header`).
- **Accessibility parity.** Rows currently have no screen-reader label for
  HP/AC (just an `aria-hidden` icon + bare number) — that was fine when the
  visible header existed as the accessible label. But at `@medium`,
  `.combatants`/`tbody` already switch to `display: block` and `.combatant`
  (`<tr>`) switches to `display: grid` — browsers derive ARIA table
  semantics from computed `display`, so header-to-cell association is
  already broken at this breakpoint today, independent of whether `thead` is
  visible. That means a visible/sticky header alone won't announce "Health:
  12" to a screen reader landing on a row's HP cell — a per-value
  screen-reader-only span (reusing `.screen-reader-only` from
  `lesscss/utilities/helpers.less:14`, same pattern already used in
  `InitiativeListHeader.tsx`) is required regardless of header visibility.
- **Risk level vs. what we've done so far:** everything up to now was a pure
  CSS/class tweak verifiable by compiling LESS and reading the generated
  rules. This one genuinely needs a live browser check — sticky positioning
  and cross-element grid alignment are exactly the kind of thing static
  reading can get subtly wrong (this is also the category of change ("CSS
  reflow") that caused the previous mobile redesign attempt to get reverted
  for looking wrong — see `mobile-redesign-reverted` memory).

## Decisions made

- **Title bar:** `.initiative-list__header` ("Nimble RPG App" title) stays
  non-sticky — only the new column-icon header pins. If the list scrolls,
  the title scrolls away like today.
- **Inline-stats icons:** the compact `combatant--inline-stats` row's own
  heart/shield icons (`combatants.less:242-246`, added same session as this
  plan) get removed too, not just the many-column shape's icons — the sticky
  header becomes the single source of the icon label for every row shape.

## Files touched

- **`client/InitiativeList/InitiativeListHeader.tsx`** — needs a
  `hasOptionalStatColumn` prop so it can pick a grid layout matching whichever
  row shape is active. No new markup needed otherwise — it already renders
  every icon `<th>` (`fa-heart`, `fa-shield-alt`, etc.) plus
  screen-reader-only labels.
- **`client/InitiativeList/InitiativeList.tsx`** — already computes
  `showManaColumn`/etc. once for the whole list; hoist the `hasOptionalStatColumn`
  boolean logic here (currently duplicated per-row in
  `CombatantRow.tsx`'s `getClassNames`) and pass it to both
  `InitiativeListHeader` and `CombatantRow`.
- **`lesscss/components/combatants.less`** — the real work:
  - un-hide `thead`, give it a grid layout per row-shape variant, make it sticky
  - override the blanket `position: static` rule for the header specifically
  - revert `.combatant__mobile-icon` to `display: none` at `@medium`,
    **including** removing the `.combatant--inline-stats` override that
    currently re-enables it as `display: inline-block`
- **`client/InitiativeList/CombatantRow.tsx`** — add a screen-reader-only
  span for the HP and AC values (matching the `.screen-reader-only` pattern
  already used in `InitiativeListHeader.tsx`), and drop the per-row
  `combatant__mobile-icon` spans now that the sticky header carries that job.

## Progress

- [ ] Hoist `hasOptionalStatColumn` into `InitiativeList.tsx`; pass to
      `InitiativeListHeader` and `CombatantRow`
- [ ] `InitiativeListHeader.tsx`: accept `hasOptionalStatColumn` prop
- [ ] `combatants.less`: un-hide `thead`, add matching grid-template variants
      for the many-column and inline-stats shapes
- [ ] `combatants.less`: sticky positioning + override for the blanket
      `position: static` rule
- [ ] `combatants.less`: revert `.combatant__mobile-icon` to `display: none`
      at `@medium` (base rule **and** the `.combatant--inline-stats` override)
- [ ] `CombatantRow.tsx`: add screen-reader-only labels for HP/AC values,
      remove the now-redundant `combatant__mobile-icon` spans
- [ ] Stand up dev server, verify live: column alignment, sticky behavior on
      scroll, both row shapes, screen reader labels
