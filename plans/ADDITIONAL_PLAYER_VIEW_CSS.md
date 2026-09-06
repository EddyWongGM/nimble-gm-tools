# Additional Player View CSS — Usage Examples

Selectors available in the Player View DOM (see `client/PlayerView/components/`
and `client/PlayerView/CSSFrom.ts`), for use in the `PlayerView.CustomCSS`
field (rendered raw into a `<style>` tag after the built-in custom-style
declarations, so it can override anything above it — see
`client/PlayerView/components/CustomStyles.tsx`).

All of `lesscss/pages/player-view.less` is nested under `#playerview`, so
every built-in rule compiles with an ID in its selector (e.g.
`#playerview .combatant.active { border-left: ... }`). A bare class
selector like `.combatant.playercharacter` can never out-specificity that,
no matter how many classes it stacks — so when overriding a property the
built-in CSS already sets for that element, prefix your selector with
`#playerview` too. A property the built-in CSS never touches (e.g.
`opacity`, `display: none` on an element only positioned by flex rules)
applies fine without the prefix, since there's nothing to lose a
specificity fight against.

```css
/* Hide combatant portraits */
.combatant__portrait { display: none; }

/* Enlarge combatant names */
li.combatant { font-size: 1.4em; }

/* Distinguish player characters from monsters at a glance */
/* (#playerview prefix required: player-view.less sets border-left on
   .combatant and .combatant.active) */
#playerview .combatant.playercharacter { border-left: 4px solid gold; }

/* Flag a specific status tag (e.g. Prone) */
/* (#playerview prefix required: player-view.less sets background/color
   on .combatant__tags .tag) */
#playerview .tag[data-tag="prone"] { background-color: firebrick; color: white; }

/* Fade out combatants who've already taken their turn */
.combatant__name--taken-turn { opacity: 0.5; }

/* Star icon for heroes, skull icon for monsters (uses the bundled Font
   Awesome 5 Free webfont, so no external request or extra dependency) */
.combatant.playercharacter .combatant__name::before {
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  content: "\f005"; /* fa-star */
  margin-right: 0.4em;
  color: gold;
}
.combatant:not(.playercharacter):not(.companion) .combatant__name::before {
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  content: "\f54c"; /* fa-skull */
  margin-right: 0.4em;
}
```

## Other useful selectors

- `#playerview` — root container
- `.combatant--header` — column header row
- `.combatant.playercharacter` — PC rows
- `.combatant.companion` — companion rows (a player's pet/sidekick; not a
  PC, but acts in the player phase)
- `.combatant.legendary` — legendary monster rows
- `.combatant.titan` — titan monster rows
- `.combatant:not(.playercharacter):not(.companion):not(.legendary):not(.titan)`
  — plain monster/NPC rows (this data model doesn't distinguish an NPC from
  an ordinary monster - both are just an unset `Player` field)
- `.combatant__ac` — AC column (e.g. hide on monsters with
  `.combatant:not(.playercharacter) .combatant__ac { visibility: hidden; }`
  to stop players doing to-hit math)
- `.combatant__hp-inner` — HP bar fill
- `.combatant__mana`, `.combatant__resources`, `.combatant__hitdice`,
  `.combatant__wounds`, `.combatant__inventory`, `.combatant__gold` — stat
  columns
- `.combatant__tags` — tag pills row
- `.tag[data-tag="..."]` — an individual tag pill, keyed by its lowercased
  text
- `.combatant__add-tag-button` — the "+ tag" button
- `.combatant__name--taken-turn` — a combatant's name once they've acted
  this round

## Open question

Not yet decided where these examples should live long-term — this file, or
folded into the in-app Info tooltip on "Additional Player View CSS
(experimental)" in `EpicInitiativeSettings.tsx`.






test example:
/* Enlarge combatant names */
li.combatant { font-size: 2em; }

/* Distinguish player characters from monsters at a glance */
#playerview .combatant.playercharacter { border-left: 12px solid gold; }
#playerview .combatant:not(.playercharacter):not(.companion) { border-left: 12px solid red; }

/* Star icon for heroes, skull icon for monsters (uses the bundled Font
   Awesome 5 Free webfont, so no external request or extra dependency) */
.combatant.playercharacter .combatant__name::before {
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  content: "\f005"; /* fa-star */
  margin-right: 0.4em;
  color: gold;
}
.combatant:not(.playercharacter):not(.companion) .combatant__name::before {
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  content: "\f54c"; /* fa-skull */
  margin-right: 0.4em;
  color: red;
}