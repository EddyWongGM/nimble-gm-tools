# Legendary Monster HP Scaling & Last Stage

Last reviewed: 2026-08-31

## Goal

Monsters have three tiers going forward: **Normal**, **Legendary**, **Titan**.
Titan is out of scope for this doc (future work, no design yet). This plan
covers **Legendary**:

1. A Legendary monster's max HP scales with the number of heroes in the
   encounter.
2. A Legendary monster gets a **last stage**: when it would hit 0 HP for the
   first time, instead of dying it drops to a GM-authored "last stage HP"
   value and keeps fighting. The second time it hits 0, it's defeated as
   normal.

This is scoped as pure combat-mechanics plumbing — no new UI concept beyond
one new stat block field and (optionally) a small "last stage" indicator on
the combatant.

## Existing groundwork

The `legendary`/`titan` tier already exists as a value of the overloaded
`StatBlock.Player` field, set via the `EnumToggle` in
[client/StatBlockEditor/StatBlockEditor.tsx:228-238](client/StatBlockEditor/StatBlockEditor.tsx#L228-L238)
(`""` = Normal, `"legendary"`, `"titan"`). It already gates whether the
Legendary Actions section shows
([StatBlockEditor.tsx:294-298](client/StatBlockEditor/StatBlockEditor.tsx#L294-L298)).
Nothing currently reads this value for HP/combat purposes — it's cosmetic
today. This plan is the first thing to make it mechanical.

No existing "boss/minion/solo" role or hero-count HP scaling exists anywhere
else in the app. `VariantMaximumHP` (DEFAULT/MINION/BOSS in
[client/Combatant/GetOrRollMaximumHP.ts](client/Combatant/GetOrRollMaximumHP.ts))
is an unrelated, transient per-click choice at add-time (1 HP / rolled max HP
via the disabled `EnableBossAndMinionHP` setting) — not a stored property of
the monster, and not touched by this plan.

## 1. HP scaling by hero count

**Formula:** whatever `HP.Value` the stat block resolves to (its authored
static value, or a dice-rolled value if `RollMonsterHp`/BOSS-variant applies)
gets **multiplied by the number of hero combatants already in the
encounter**. E.g. a Legendary monster with `HP.Value = 20`, added to an
encounter with 4 heroes, ends up with 80 max HP.

**Trigger point:** computed once, when the Legendary monster is added to the
encounter — not recalculated later if heroes join/leave or drop out. This
matches how HP already works for every other monster (baked into
`CombatantState.CurrentHP` at add-time in
[client/Encounter/Encounter.ts:230-246](client/Encounter/Encounter.ts#L230-L246)),
so no new "live recompute" machinery is needed. Practical implication worth
flagging to GMs (in a tooltip or the field label): **add heroes to the
encounter before adding Legendary monsters**, or the multiplier under-counts.

**Where it hooks in:** [Encounter.ts:218-255](client/Encounter/Encounter.ts#L218-L255)
`AddCombatantFromStatBlock`, right after the existing
`GetOrRollMaximumHP(statBlock, variantMaximumHP)` call resolves the base HP
value (so it multiplies the *resolved* number, not the dice notation —
avoids re-rolling or double-applying against `HP.Notes`):

```ts
statBlock.HP = {
  ...statBlock.HP,
  Value: GetOrRollMaximumHP(statBlock, variantMaximumHP)
};
if (statBlock.Player === "legendary") {
  const heroCount = Math.max(
    1,
    this.combatants().filter(c => c.IsPlayerCharacter()).length
  );
  statBlock.HP = { ...statBlock.HP, Value: statBlock.HP.Value * heroCount };
}
```

`Math.max(1, ...)` guards against a 0-hero encounter (e.g. a solo test add)
silently zeroing the monster out.

`Combatant.MaxHP` ([Combatant.ts:295](client/Combatant/Combatant.ts#L295))
already reads `StatBlock().HP.Value`, so it needs no change — it'll reflect
the multiplied value automatically since that's what's now stored.

## 2. Last stage

**Data:** new field on `StatBlock`, editable per-monster (not
level-derived — GM authors any table they want per monster), reusing the
existing `ValueAndNotes` shape for UI consistency with `HP`/`AC`:

```ts
// common/StatBlock.ts
export interface StatBlock extends Listable {
  ...
  HP: ValueAndNotes;
  LastStageHP?: ValueAndNotes;   // new — only meaningful when Player === "legendary"
  ...
}
```

Add it to `StatBlock.Default()` alongside `HP`/`AC` (`{ Value: 0, Notes: "" }`).

**UI:** in
[StatBlockEditor.tsx `statFields`](client/StatBlockEditor/StatBlockEditor.tsx#L168-L205),
add a `ValueAndNotesField` for `LastStageHP` (label "Last Stage HP"), rendered
only when `player === "legendary"` — same conditional pattern already used
for the Legendary Actions power group at
[StatBlockEditor.tsx:294-298](client/StatBlockEditor/StatBlockEditor.tsx#L294-L298).

**Trigger logic:** hook into `Combatant.ApplyDamage`
([Combatant.ts:341-362](client/Combatant/Combatant.ts#L341-L362)), which is
where HP currently gets clamped to 0 on defeat. Add a one-shot check before
that clamp:

```ts
public ApplyDamage(damage: number) {
  let currHP = this.CurrentHP(),
    tempHP = this.TemporaryHP();
  const allowNegativeHP = CurrentSettings().Rules.AllowNegativeHP;

  tempHP -= damage;
  if (tempHP < 0) {
    currHP += tempHP;
    tempHP = 0;
  }

  const lastStageHP = this.StatBlock().LastStageHP?.Value ?? 0;
  if (
    currHP <= 0 &&
    this.StatBlock().Player === "legendary" &&
    !this.HasEnteredLastStage() &&
    lastStageHP > 0
  ) {
    currHP = lastStageHP;
    this.HasEnteredLastStage(true);
    Metrics.TrackEvent(Metrics.Event.CombatantEnteredLastStage, {
      name: this.DisplayName()
    }); // new Metrics.Event member, alongside CombatantDefeated
  } else if (currHP <= 0 && !allowNegativeHP) {
    Metrics.TrackEvent(Metrics.Event.CombatantDefeated, {
      name: this.DisplayName()
    });
    currHP = 0;
  }

  this.CurrentHP(currHP);
  this.TemporaryHP(tempHP);
  NotifyTutorialOfAction("ApplyDamage");
}
```

The stage transition check runs regardless of the `AllowNegativeHP` setting
(a Legendary monster should transform at 0 HP whether or not the table
allows negative numbers) and only fires once per combatant, per encounter,
via a new one-shot flag.

**New state:** `HasEnteredLastStage?: boolean` on `CombatantState`
([common/CombatantState.ts](common/CombatantState.ts)), plumbed through
`Combatant` the same way `RevealedAC`/`ReactionsSpent` already are:
- observable init in the constructor
- read in `processCombatantState`
  ([Combatant.ts:112](client/Combatant/Combatant.ts#L112))
- written back out in `GetState`
  ([Combatant.ts:554](client/Combatant/Combatant.ts#L554))

**Last stage indicator — decided:** reuse the existing `Tags` system —
auto-add a "Last Stage" tag on the combatant the moment
`HasEnteredLastStage` flips true (no new sync plumbing needed; tags already
broadcast to Player View, so this covers both GM and player-facing
indication for free), plus a GM-only HP-bar recolor keyed off
`HasEnteredLastStage` (pure CSS, tracker-side only). No new socket event, no
toast/announcement feed — those were considered and dropped as unnecessary
polish for a first pass.

**Not covered by this plan (open questions):**
- `ApplyHealing` isn't touched — healing a last-stage monster back up just
  works against whatever its current max HP is (unaffected by this change).
- If a GM manually edits `CurrentHP` to 0 (rather than via `ApplyDamage`),
  the stage transition won't fire — acceptable, matches how no other
  HP-derived logic (e.g. defeat metrics) fires on manual edits either.

## Out of scope

- **Titan** tier: no mechanics defined yet, deferred entirely.
- Any change to the `VariantMaximumHP` MINION/BOSS add-time buttons.
- Live HP recalculation if hero count changes mid-encounter.
