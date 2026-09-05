# Monster Generator: Investigation

**Status:** findings only, not yet planned/implemented.

## The ask

The GM wants some kind of "monster generator" — the request doesn't yet say
which of several different things that could mean (see "What 'generator'
could mean" below). This doc is a scan of the current codebase to ground a
future implementation plan; no design decisions or scope commitments are
made here yet.

## Data model

- [common/StatBlock.ts:46-91](../common/StatBlock.ts#L46-L91) — the target
  shape any generator has to produce: `Name`, `HP`/`AC`/`Mana`/`Resources`/
  `HitDice`/`Wounds` (each `{Value, Notes}`), `Armor` tier (`""|medium|
  heavy`, each with its own `HP`/`HPMediumArmor`/`HPHeavyArmor` pool),
  `Abilities` (Str/Dex/Int/Wis modifiers — no Con/Cha, no raw D&D scores),
  `SaveAdvantages`, `Speed`, `Saves`/`Skills` (`NameAndAdvantage[]` —
  advantage-tag based, not numeric bonuses), `Senses`/`Languages`,
  `Damage(Vulnerabilities|Resistances|Immunities)`, `ConditionImmunities`,
  `Challenge` (Nimble-native difficulty label) / `CRRating` (free-text D&D5e
  cross-reference, informational only) / `SaveDC`, `Traits`/`Actions`/
  `Reactions`/`BonusActions`/`LegendaryActions`/`MythicActions`/
  `CustomFields` (`NameAndContent[]`), `LastStandHP` (Legendary-tier only),
  `Description`, `Player` (discriminator: `"player"|"companion"|"legendary"|
  "titan"|""`), `ImageURL`.
- `StatBlock.Default()` ([StatBlock.ts:205-238](../common/StatBlock.ts#L205-L238))
  is the existing "blank monster" factory every creation path already starts
  from — any generator producing a full `StatBlock` should build on top of
  this rather than hand-rolling every field.

## What already exists that a "generator" might mean, or build on

### 1. The "Monster Builder" preload library — CR-indexed HP/DC templates

[preload-content/monster_builder_set.json](../preload-content/monster_builder_set.json)
(947 lines) is a preloaded StatBlock library, `Source: "Monster Builder"`,
`Path: "Monster Builder/Normal"` (also `.../Legendary`, presumably other
tiers — not yet confirmed by name alone), containing entries named `"LV 0.5
(CR: 1/4)"`, `"LV 01 (CR: 1/2)"`, etc. Each entry is a bare-bones shell: HP
value, `SaveDC`, `CRRating`, and a `Description` note like `"Damage per
round: 6\nSample dice 1d4+3 or 1d6+2"` — no `Traits`/`Actions`/name/flavor.
This is the existing "generator," but it's fully manual: a GM finds the
level template closest to their target CR in the library browser, saves a
copy under a new name, and hand-fills in the actual monster (name, traits,
actions, damage dice matching the suggested budget). There is no code that
picks or scales one of these automatically — it's static seed data, browsed
like any other library entry.
- [preload-content/monster_starter_set.json](../preload-content/monster_starter_set.json)
  (364 lines) is a second, smaller preloaded set — likely fully-authored
  example monsters (not templates) rather than budget scaffolds; worth
  diffing against the builder set before assuming its role.
- These CR-to-budget numbers (HP by level, `SaveDC`, the damage-per-round
  guidance in `Description`) are presumably sourced from Nimble's official
  monster-building guidelines — that source document (if the GM has it)
  would be the authoritative input for any automated version of this same
  logic, rather than reverse-engineering the formula purely from the 947-line
  JSON.

### 2. Importers — text/API-format-to-StatBlock conversion (not generation, but the closest existing "produce a StatBlock programmatically" code)

- [client/Importers/StatBlockImporter.ts](../client/Importers/StatBlockImporter.ts)
  — parses a fixed key/value block (D&D-Beyond-app-style export text) into a
  `StatBlock`, converting raw ability scores to modifiers via
  `GetModifierFromScore`, splitting comma-lists, bucketing powers into
  Traits/Actions/Reactions/etc.
- [client/Importers/Open5eImporter.ts](../client/Importers/Open5eImporter.ts)
  — same idea, two variants (`ImportOpen5eStatBlock` for the v1 API,
  `ImportOpen5eV2StatBlock` for the 2024/v2 schema), converting a JSON
  response from the public [open5e.com](https://open5e.com) API into a
  `StatBlock`.
- Both are **transformers of already-authored external content**, not
  generators of new content — closest useful precedent is "fetch/parse
  something and normalize it into our shape," not "invent stats from a CR
  target." Also worth noting: [plans/private/DETACH D&D5e.md](private/DETACH%20D&D5e.md)
  documents an in-progress, deliberate move away from D&D5e-shaped concepts
  in the data model (raw ability scores, numeric save/skill bonuses, D&D
  action-economy buckets) — these importers are flagged there as needing
  eventual rework, not as a foundation to build further D&D-sourced tooling
  on top of. A monster generator leaning on the Open5e API (e.g. "generate
  by pulling a random matching creature from Open5e") would be pulling in
  the opposite direction from that stated goal; a Nimble-native procedural/
  random generator would not.

### 3. Recent monster-authoring feature work (balance-relevant fields a generator would need to populate correctly)

[plans/private/done/Monsters/00_MONSTER_PLANS_IMPLEMENTATION_ORDER.md](private/done/Monsters/00_MONSTER_PLANS_IMPLEMENTATION_ORDER.md)
indexes four recently-shipped monster fields, all relevant to what a
generator's output needs to respect:
- [01_MONSTER_CR_RATING.md](private/done/Monsters/01_MONSTER_CR_RATING.md) —
  `CRRating`, free-text D&D5e cross-reference, Normal-tier only.
- [02_LEGENDARY_MONSTER.md](private/done/Monsters/02_LEGENDARY_MONSTER.md) —
  HP × hero-count scaling and `LastStandHP` for Legendary-tier monsters.
- [03_MONSTER_ARMOR_HP.md](private/done/Monsters/03_MONSTER_ARMOR_HP.md) —
  `Armor` tier with three separate HP pools (`HP`/`HPMediumArmor`/
  `HPHeavyArmor`).
- [04_MONSTER_SAVE_DC.md](private/done/Monsters/04_MONSTER_SAVE_DC.md) —
  `SaveDC` (single int) and `Saves`/`Skills` as `NameAndAdvantage[]`
  (advantage-tag, not numeric bonus).
- [plans/done/STATBLOCK_SAME_NAME_DIFFERENT_CR_PLAN.md](done/STATBLOCK_SAME_NAME_DIFFERENT_CR_PLAN.md)
  is also relevant if a generator can produce multiple variants of the same
  named creature at different Challenge levels (e.g. "Goblin" at both
  Minion and 1/2) — the library's save/dedupe logic was recently made
  Challenge-aware specifically to support that pattern correctly.

### 4. Creation/editing entry points (where a generator's output would need to land)

- [client/Commands/LibrariesCommander.ts](../client/Commands/LibrariesCommander.ts)
  — `CreateAndEditStatBlock` and friends are the existing "make a new
  monster" commands, opening `StatBlockEditor` pre-seeded from
  `StatBlock.Default()`. A generator's natural integration point is
  producing a filled-in `StatBlock` and routing it through this same
  create-and-open-for-editing flow (or straight to save), rather than a
  wholly separate creation path.
- [client/StatBlockEditor/StatBlockEditor.tsx](../client/StatBlockEditor/StatBlockEditor.tsx)
  — the manual editing form; whatever a generator produces, the GM almost
  certainly still wants to open it here afterward to tweak (name, flavor
  text, exact trait wording) rather than get a finished, un-editable result.

### 5. No AI/LLM integration exists anywhere in this codebase

Searched for `openai`, `anthropic`, `gpt-`, `claude-`, and similar — zero
matches outside the tool-lockfile-noise level. If "generator" means an
AI-authored monster (describe a concept in freeform text, get a full
`StatBlock` back), that would be a from-scratch integration: no existing
API client, no server-side proxy/key-handling route, no prompt-construction
code to build on. This is a materially bigger scope than either of the
other two interpretations below.

## What "generator" could mean (needs to be resolved before scoping)

1. **A procedural/random Nimble-native generator** — GM picks a target
   Challenge/CR and maybe a theme (e.g. "undead", "beast"), the app rolls up
   a plausible `StatBlock` (name from a word list, HP/SaveDC from the same
   budget curve already encoded in `monster_builder_set.json`, a few traits/
   actions drawn from a curated pool or simple templates like "deals Xd6+Y
   damage"). No external dependency, deterministic budget math, but requires
   authoring/curating the random-content tables (names, trait templates)
   from scratch — there's no existing "random monster" content anywhere in
   the repo to reuse.
2. **An AI-authored generator** — GM describes a concept in free text ("a
   swamp-dwelling frog cultist, CR 3"), an LLM returns a full `StatBlock`.
   Highest ceiling for creative/flavorful output, but the only interpretation
   requiring genuinely new infrastructure (API integration, key management,
   cost/rate-limit handling, output validation against the `StatBlock`
   shape) — see point 5 above.
3. **A quick "instantiate one of the existing CR templates" shortcut** — a
   thinner feature than either of the above: given a target CR, auto-select
   and duplicate the matching `monster_builder_set.json` template into the
   GM's own library (skipping the manual "find it in the browser, save a
   copy" steps), still leaving all flavor/traits to the GM by hand. Smallest
   possible scope, reuses 100% existing data, but is closer to a UX shortcut
   on the existing library than a "generator" in the sense of creating new
   content.
4. **A random encounter generator** (as opposed to a single monster) —
   given a party size/level and a difficulty target, assemble a roster of
   *existing* library monsters that fit an XP/difficulty budget. Different
   problem shape entirely (combinatorial selection over the existing
   library, not stat-block authoring) — would touch `Encounter.ts` /
   `EncounterCommander.ts` rather than `StatBlock`/`StatBlockEditor`. No
   existing difficulty-budget calculator was found in this codebase either
   (searched for "budget", "XP", "difficulty" — nothing beyond the informal
   damage-per-round notes in `monster_builder_set.json`).

These are not mutually exclusive (e.g. 1 and 3 could ship together, or 2
could be layered on top of 1's budget math as a "flavor pass"), but they
have very different scope, and 2 in particular is a different category of
work (new external dependency, cost, and failure-mode surface) from 1/3/4.

## Open questions to resolve before scoping a real plan

1. **Which of the above (or a different idea entirely) is meant by
   "generator"?** This single answer determines almost everything else in
   this doc.
2. If procedural/random (option 1 or 3): is the Nimble monster-building
   guideline (HP/SaveDC/damage-per-round-by-CR curve) available as a written
   reference, or does it need to be reverse-engineered purely from
   `monster_builder_set.json`'s 947 lines?
3. If AI-authored (option 2): is there an existing Anthropic/OpenAI API key
   or budget the GM has in mind, and where would the key live (server-side
   route needed — an API key can't be shipped to the client)? Is
   variability/unpredictability in output acceptable for a stat-authoring
   tool, or does the GM want the output constrained to always be
   mechanically valid (which likely means validation/repair logic on top of
   the raw LLM response, not just a passthrough)?
4. **Scope of "monster"**: Normal tier only, or should generation also cover
   Legendary/Titan (which need `LastStandHP`, hero-count HP scaling, and
   generally more hand-tuned design)? Simplest to start Normal-only, same
   pattern the CR Rating field followed
   ([01_MONSTER_CR_RATING.md](private/done/Monsters/01_MONSTER_CR_RATING.md)).
5. **Trigger surface**: a new button in the StatBlock library toolbar (near
   "New Monster"), a new step inside `StatBlockEditor` itself ("Generate"
   button that fills the open form), or a standalone modal/prompt (matching
   existing patterns like
   [client/Prompts/QuickAddPrompt.tsx](../client/Prompts/QuickAddPrompt.tsx))?
6. **Does this replace or sit alongside `monster_builder_set.json`?** — e.g.
   if the generator just re-derives the same budget curve programmatically,
   the static template library may become redundant (or stay as a fallback/
   reference).

## Next steps

1. Get the user's answer on which "generator" concept (or combination) is
   actually wanted — this doc deliberately stops short of picking one.
2. If any option involving new budget math is chosen, get or confirm the
   underlying Nimble CR/HP/damage curve as an explicit table, rather than
   inferring it solely from the existing JSON.
3. Write a full implementation plan once scope is settled — likely a very
   different plan shape depending on which option (1-4) is chosen.
