# Stylesheet Findings

## Current convention (lesscss/)

Yes — this repo has a well-established LESS convention, not ad-hoc CSS.

- **Single entry point**: [lesscss/improved-initiative.less](lesscss/improved-initiative.less) imports everything in a fixed cascade order: `base/colors` → fonts (Google Fonts: Roboto + Spectral SC) → FontAwesome → spacer/breakpoint variables → `base/typography` → `layout/base` → `layout/forms` → `components/*` → `pages/*` → `base/responsive`.
- **Folder structure**: `base/` (colors, typography, responsive), `layout/` (base, forms), `components/` (one file per UI component — buttons, cards, tabs, statblock, combatants, toolbar, etc.), `pages/` (landing, tracker, player-view), `utilities/` (animations, helpers).
- **Theming via CSS custom properties**: all colors are defined as `--variables` on `:root` in [colors.less](lesscss/base/colors.less), then *redefined* under a `.dark-mode` class for dark mode. Components never hardcode colors — they consume semantic tokens like `--text-face`, `--button-face`, `--card-background-white`, `--text-header`, `--dark-border`, not raw hex values.
- **Layout/spacing tokens**: LESS variables (`@small-spacer`, `@medium-spacer`, `@large-spacer`, `@border-radius: 0`, breakpoints `@small/@medium/@large`) are set once in the entry file and reused everywhere.
- **Naming**: BEM-ish, `c-` prefixed component classes (`.c-button`, `.c-tabs`, `.c-statblock`, `.c-combatant-details__item`), plus reusable LESS mixins written as `.mixin-name()` (e.g. `.colors()`, `.button()`, `.card-bg()`, `.green-button()`).
- **Visual language**: sharp corners (`border-radius: 0` globally), drop-shadow "cards" for panels, a parchment-texture page background (`paper-bg.jpg` / `dark-texture.png`), serif headers (Spectral SC) over sans body text (Roboto), red (`--red`) as the primary accent/header color, green as the secondary/positive-action color.

This is a mature, token-driven system — restyling should mean swapping tokens/values inside this structure, not introducing a second styling system.

## Nimble template reference (nimble-template/)

This is a **Typst** print template (`.typ`), not CSS, but it encodes Nimble's visual identity clearly:

- **Palette**: warm parchment/khaki neutrals (page background is a tan paper texture with ornate hand-drawn corner flourishes — [img/background-full.png](nimble-template/img/background-full.png)), dark red `#540808` and dark yellow `#fcba03` as defined accents, stat-block fills in muted tan/khaki (`rgb(191,184,151)`, `rgb(212,205,187)`) — no dark mode, no cool greys/blues.
- **Typography**: "Avenir Next LT Pro" (bold/extrabold) for headers and UI-style labels, "IBM Plex Serif" for h2-level headings — a bold sans for structure vs. current site's serif-for-headers approach.
- **Layout motifs**:
  - `nimble-margin` — a fixed-width left margin column (grey, bold, small caps-ish) paired with body content on the right. Used for spell tier/action-cost labels and class "LEVEL N" callouts. This is conceptually close to the existing `.stat-label` / `.stat-value` pattern already in [statblock.less](lesscss/components/statblock.less).
  - `nimble-note` — flat khaki rounded-rect callout boxes, no shadow.
  - `nimble-monster` — a stat block: bordered khaki header strip, centered uppercase name, "»" speed glyph and heart symbol for HP, small-caps section labels.
  - `nimble-chapter` — full-bleed art background with large bottom-anchored title text, for section breaks.
  - `nimble-table` — flat, strokeless tables with subtle alternating-row tan tint instead of hard borders.
- **No shadows/gradients**: everything is flat fills + thin/no borders, leaning on texture and typography for richness rather than elevation effects.

## Gap summary (current site vs. Nimble look)

| Aspect | Current site | Nimble template |
|---|---|---|
| Accent color | Red `#802000` / green `#3e885b`, cool greys | Dark red `#540808`, warm khaki/tan, gold `#fcba03` |
| Background | Light parchment photo texture | Tan parchment + ornate corner border art |
| Headers | Spectral SC (serif) | Avenir Next LT Pro (bold sans) / IBM Plex Serif (h2) |
| Body | Roboto | Avenir Next LT Pro |
| Cards/panels | White card bg + drop shadow | Flat khaki fill, no shadow |
| Corners | `border-radius: 0` (already sharp) | Sharp/flat (already aligned) |
| Dark mode | Full `.dark-mode` token set | Not applicable (print-only) — would need a design decision for dark mode |

Next step would be to decide how far to push this (token-swap only vs. also adopting flat-fill statblocks and border art) before touching [colors.less](lesscss/base/colors.less) and [typography.less](lesscss/base/typography.less).
