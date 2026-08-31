# Monster Armor Tiers & Per-Armor HP

Last reviewed: 2026-08-31

## Goal

Monster-only mechanic (Normal and Legendary alike — Player/Companion
Defense/AC is untouched). A monster has an **Armor** tier — Unarmored /
Medium Armor / Heavy Armor — and a separate authored HP pool for each tier.
Whichever tier is selected on the stat block determines which HP pool the
monster enters combat with. The numeric AC/"Defense" stat currently shown
for monsters is dropped entirely (per your call — ignore it, don't show it)
in favor of this tier.

Examples from the spec:

- Normal: `HP no armor: 30 / medium: 20 / heavy: 10`. Saved as Medium →
  enters combat at 20 HP.
- Legendary: `HP no armor: 30 / medium: 20 / heavy: 10` (still × heroes, per
  [LEGENDARY_MONSTER.md](02_LEGENDARY_MONSTER.md)). Saved as Heavy → enters
  combat at `10 × heroCount`. The armor-tier pick and the hero-count
  multiplier compose — armor selects *which* base pool, heroes then scale
  *that* pool.

## Data model

```ts
// common/StatBlock.ts
export type ArmorTier = "" | "medium" | "heavy";  // "" = Unarmored

export interface StatBlock extends Listable {
  ...
  Armor?: ArmorTier;             // new — monster only
  HP: ValueAndNotes;             // reused as-is: the Unarmored pool
  HPMediumArmor?: ValueAndNotes; // new
  HPHeavyArmor?: ValueAndNotes;  // new
  AC: ValueAndNotes;             // unchanged — still used by players/companions
  ...
}
```

`HP` itself is reused as the "no armor" pool rather than adding a fourth
field — matches the spec's own framing ("HP no armor" is just the base
stat) and needs no migration.

## HP resolution

Hooks into the same place the Legendary hero-count multiplier already lands
— [Encounter.ts `AddCombatantFromStatBlock`](client/Encounter/Encounter.ts#L218-L255)
— as a step *before* it, since armor picks which pool feeds the existing
roll/multiply logic unchanged:

```ts
const statBlock: StatBlock = { ...StatBlock.Default(), ...statBlockJson };

if (statBlock.Player !== "player" && statBlock.Player !== "companion") {
  if (statBlock.Armor === "medium" && statBlock.HPMediumArmor) {
    statBlock.HP = statBlock.HPMediumArmor;
  } else if (statBlock.Armor === "heavy" && statBlock.HPHeavyArmor) {
    statBlock.HP = statBlock.HPHeavyArmor;
  }
  // Armor === "" (or the tier's HP field wasn't authored) falls through to
  // the existing statBlock.HP ("Unarmored") pool unchanged.
}

statBlock.HP = {
  ...statBlock.HP,
  Value: GetOrRollMaximumHP(statBlock, variantMaximumHP)
};

if (statBlock.Player === "legendary") {
  // existing hero-count multiplier from LEGENDARY_MONSTER.md, now
  // operating on whichever pool armor selected above
  ...
}
```

An unauthored tier (GM sets Armor to "heavy" but never fills in
`HPHeavyArmor`) silently falls back to the Unarmored pool — same
falls-back-quietly pattern already used for optional fields like
`Mana`/`Resources`.

## Editor UI (`StatBlockEditor.tsx`)

- New `Armor` `EnumToggle` (`"" → "Unarmored"`, `medium → "Medium Armor"`,
  `heavy → "Heavy Armor"`), same 3-option pattern as the existing `Player`
  tier toggle at
  [StatBlockEditor.tsx:228-238](client/StatBlockEditor/StatBlockEditor.tsx#L228-L238),
  shown for the same `library`/`combatant` targets, monsters only (not
  `player`/`companion`).
- In [`statFields`](client/StatBlockEditor/StatBlockEditor.tsx#L168-L205),
  for monsters: drop the single "Defense"/AC row entirely, and replace the
  single "Hit Points" row with three `ValueAndNotesField`s — "HP
  (Unarmored)" → `HP`, "HP (Medium Armor)" → `HPMediumArmor`, "HP (Heavy
  Armor)" → `HPHeavyArmor`. Player/companion `statFields` output is
  unchanged (still one AC + one HP row).

## Read-only / live display — needs a decision per site

Three places currently render `statBlock.AC.Value` **unconditionally for
every combatant type**, monsters included, and would show a stale/removed
field once AC stops being authored for monsters:

1. [client/Components/StatBlock.tsx:125-126](client/Components/StatBlock.tsx#L125-L126)
   — reference-pane "Defense" stat. (`CombatantDetails.tsx:134-141` is
   already gated to `ActsInPlayerPhase`, i.e. player/companion only — no
   change needed there.)
2. [client/InitiativeList/CombatantRow.tsx:192-204](client/InitiativeList/CombatantRow.tsx#L192-L204)
   — the live tracker row's shield-icon AC column, shown for every
   combatant.
3. [client/Prompts/QuickEditStatBlockPrompt.tsx:35-46](client/Prompts/QuickEditStatBlockPrompt.tsx#L35-L46)
   — quick-edit modal lets the GM directly edit `AC.Value` mid-encounter for
   any combatant.
4. [client/Combatant/ToPlayerViewCombatantState.ts:42](client/Combatant/ToPlayerViewCombatantState.ts#L42)
   — `RevealedAC` reveals `AC.Value` to the shared Player View.

All four need to become player/companion-only (matching `CombatantDetails`'s
existing gate) at minimum. Whether monsters get an Armor-tier *replacement*
shown in these spots, or just go blank, is genuinely open — see below.

## Decided

Matching how `LEGENDARY_MONSTER.md` already decided HP is a one-time bake at
add-time with no live-editing story:

- **Tracker AC column** ([CombatantRow.tsx:199-216](client/InitiativeList/CombatantRow.tsx#L199-L216)):
  the numeric AC is gone for monster rows, replaced with a GM-only "M"/"H"
  badge (`renderArmorBadge`) when `Armor` is `"medium"`/`"heavy"` - blank for
  Unarmored. Never sent to Player View (see below).
- **Player View reveal** ([ToPlayerViewCombatantState.ts:42](client/Combatant/ToPlayerViewCombatantState.ts#L42)):
  monster Armor tier is never revealed to players — `RevealedAC` stops
  applying to monsters entirely (still works as today for player/companion
  AC), and `PlayerViewCombatantState` carries no `Armor` field at all.
- **Quick-edit prompt** ([QuickEditStatBlockPrompt.tsx:35-46](client/Prompts/QuickEditStatBlockPrompt.tsx#L35-L46)):
  AC editing is removed from the quick-edit prompt for monster combatants —
  no Armor-tier picker, no mid-fight tier changes (sidesteps the "does
  current HP rescale" question entirely, since it can't come up).
- **GM combatant details pane** ([CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx#L134-L151)),
  the read-only right-column panel for the selected combatant, GM-only (never
  shown to players): revised from the original "no change needed" call above
  — it now shows the Armor tier read-only in the same spot player/companion
  rows show Defense, labeled "Armor", value via
  [`StatBlock.ArmorDisplayNames`](common/StatBlock.ts) ("Unarmored" / "Medium
  Armor" / "Heavy Armor"). No editing affordance, so the current-HP-rescale
  question still doesn't come up.

## Out of scope

- Any change to player/companion AC/Defense — fully untouched.
- Whether armor tiers do anything mechanically beyond selecting an HP pool
  (e.g. an actual to-hit/AC effect) — not specified, not designed here.
