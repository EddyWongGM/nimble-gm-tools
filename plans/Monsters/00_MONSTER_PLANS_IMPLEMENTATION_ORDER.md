# Monster Plans — Implementation Order

Last reviewed: 2026-08-31

Ordering across the four monster-design plans in this folder:
[LEGENDARY_MONSTER.md](02_LEGENDARY_MONSTER.md),
[MONSTER_SAVE_DC.md](04_MONSTER_SAVE_DC.md),
[MONSTER_ARMOR_HP.md](03_MONSTER_ARMOR_HP.md),
[MONSTER_CR_RATING.md](01_MONSTER_CR_RATING.md). Driven by actual code
dependency, not just feature scope — two of the four touch the same
function in sequence, so grouping matters more than difficulty here.

## 1. CR Rating

[MONSTER_CR_RATING.md](01_MONSTER_CR_RATING.md) — fully isolated, one new
optional string field, editor-only, gated on tier. No shared touchpoints
with anything else. Good first step: cheapest possible change, validates
the "new field on StatBlock, gated by `Player` tier" pattern the other
three all reuse.

## 2. Legendary — HP scaling

[LEGENDARY_MONSTER.md](02_LEGENDARY_MONSTER.md) §1 — the `HP × heroCount`
multiplier lands in `Encounter.AddCombatantFromStatBlock`, right after
`GetOrRollMaximumHP`. This is the foundational edit to the HP-resolution
pipeline that Armor (step 4) explicitly builds on top of.

## 3. Legendary — Last Stage

[LEGENDARY_MONSTER.md](02_LEGENDARY_MONSTER.md) §2 — independent code path
(`Combatant.ApplyDamage` + new `HasEnteredLastStage` state), but same
feature as step 2 — do it next so "Legendary" ships as one complete,
testable unit (scales with heroes *and* survives to 0 HP correctly) before
anything else touches the HP pipeline again.

## 4. Armor Tiers & Per-Armor HP

[MONSTER_ARMOR_HP.md](03_MONSTER_ARMOR_HP.md) — has to come after step 2; its
own plan literally wraps the Legendary multiplier ("hooks in as a step
before it"). Doing it right after Legendary is fully done avoids touching
`AddCombatantFromStatBlock` in two unrelated, overlapping PRs. Also the
largest UI footprint (editor rework, 3-4 display sites to blank out for
monsters) — worth its own dedicated pass.

## 5. Save DC & Saving-Throw Advantage

[MONSTER_SAVE_DC.md](04_MONSTER_SAVE_DC.md) — fully independent of the other
three, different fields, no shared code. Placed last on purpose: it's the
only one with a **destructive migration** (drops legacy `Saves` data on
load). Isolating it as its own standalone PR makes it easy to review/revert
without entangling it with the additive changes above.

## Combined editor layout

Three of the four plans add fields to the same two spots in
`StatBlockEditor.tsx`'s `fieldEditor`/`statFields` — CR Rating, Armor,
Last Stage HP, and Save DC all land in the monster-only headers/stat-grid
area. No single plan addresses their combined order, so here's the
suggested final arrangement (monsters only; player/companion editing is
untouched throughout):

**Headers block** (top, order top-to-bottom):
1. Portrait URL, Source, Type — existing, unchanged.
2. **Player tier toggle** (Normal/Legendary/Titan) — existing, moved
   conceptually "first" among the toggles since it gates the visibility of
   everything below it (CR Rating, Last Stage HP).
3. **Armor toggle** (Unarmored/Medium/Heavy) — new, right after the tier
   toggle since both are 3-option monster-subtype pickers of the same kind.
4. **CR Rating** — new, directly after the toggles, shown only when tier
   is Normal. Reads as "pick the monster's type, then its D&D-comparison
   tag appears right below."

**Stat grid** (`statFields`, monster branch — AC/Defense row removed
entirely, replaced by):
1. Challenge (existing).
2. **Save DC** — new plain-number row, placed right where AC used to be
   (both are "what an opponent rolls against" stats, natural swap).
3. **HP (Unarmored)** — was the single "Hit Points" row.
4. **HP (Medium Armor)** — new.
5. **HP (Heavy Armor)** — new.
6. **Last Stage HP** — new, Legendary-tier only, placed after the three
   armor-HP rows since it's a distinct fourth pool, not one of the
   armor-selectable three.

**Saves/Skills section** (unchanged position, after Custom Fields): both
`Saves` and `Skills` become `NameAndAdvantageField` rows per
[04_MONSTER_SAVE_DC.md](04_MONSTER_SAVE_DC.md) §2 — gated to monster targets
only (this section currently renders unconditionally for players too;
narrowing it to monster-only is a needed side-effect of the rework, since
advantage tags don't make sense for a PC that already shows real ability
scores).

This isn't binding — just a concrete default so each plan's implementation
doesn't have to re-litigate placement — flag here if you want a different
arrangement before any of steps 1-5 land.

## Why not a different order

- CR Rating and Save DC have zero interaction with HP/Armor — they could
  technically move anywhere in the sequence. CR Rating is first because
  it's the cheapest confidence-builder; Save DC is last because it's the
  riskiest (data loss on legacy Saves) and benefits from being reviewed in
  isolation.
- Armor must follow Legendary's HP scaling, not the other way around —
  reversing that would mean writing Armor's HP-pool-selection code against
  an `AddCombatantFromStatBlock` that doesn't yet have the multiplier step
  it's designed to wrap.
