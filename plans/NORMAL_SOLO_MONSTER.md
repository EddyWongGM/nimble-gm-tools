# Normal Solo Monster (Last Stand, fixed HP)

**Status: implemented (2026-09-12).**

## Goal

A new opt-in flag for Normal (`Player === ""`) monsters that gives them
Legendary's "solo boss" treatment — Last Stand, exemption from forced
monster numbering, and solo difficulty-calculator treatment — **without**
Legendary's hero-count HP scaling. The monster is a single stat block meant
to stand in for a whole encounter (like a Legendary), but its HP is
authored as a plain fixed number, exactly like any other Normal monster's
`HP.Value` already works.

Decided with the user before drafting this plan:

- The new flag also exempts the monster from forced numbering, same as
  Legendary. (A single boss shouldn't show up as "Ogre 1" under the "Always
  Number Monsters" setting.)
- The new flag also gets Legendary/Titan's solo difficulty-calculator
  treatment (Challenge judged against the party's average level, not summed
  into the normal monster-level total).
- The field name is `HasLastStand`.

## Relationship to existing plans

Sibling to [[scalable_monsters_plan]] (`ScalesWithHeroCount`) and
[[scalable_monster_count_plan]] (`ScalesCountWithHeroCount`, `MonstersPerHero`)
— both are opt-in boolean flags on Normal monsters, following the same
`Player === ""` defense-in-depth guard pattern. This flag is **orthogonal**
to both: it does not touch HP scaling or copy-count scaling at all. A GM
*could* check `HasLastStand` alongside one of those (see Known limitations),
but the intended use is a plain fixed-HP Normal monster.

## Existing mechanism (Legendary), for reference

- `client/Combatant/Combatant.ts` `ApplyDamage` (~line 427-445): the first
  time a combatant's HP would hit 0, if `this.StatBlock().Player ===
  "legendary"` and an authored `LastStandHP.Value > 0` exists, HP drops to
  `LastStandHP.Value` instead of 0, `HasEnteredLastStand` is set (persisted,
  Player-agnostic already), and a "Last Stand" tag is added. This only ever
  triggers once per combatant.
- `common/StatBlock.ts` `IsExemptFromMonsterNumbering` (~line 375-376):
  `IsLegendary(statBlock) || IsRoomInfo(statBlock)`. Consumed by
  `client/InitiativeList/InitiativeList.tsx` (~line 99-115) to skip the
  "Name N" numbering that `Rules.AlwaysNumberMonsters` would otherwise force.
- `client/Encounter/Encounter.ts` (~line 83-95): if any combatant in the
  encounter is `IsLegendary` or `IsTitan`, its `Challenge` is passed as
  `legendaryChallenge` to `DifficultyCalculator.Calculate`, which judges it
  solo against the party's average level instead of folding it into the
  summed monster-level total (`client/Widgets/DifficultyCalculator.ts`
  ~line 46-68).
- `client/StatBlockEditor/StatBlockEditor.tsx` `statFields` (~line 261-270):
  shows the "Last Stand HP" field only when `player === "legendary"`.

## Design

### 1. Schema — `common/StatBlock.ts`

```ts
// Normal monster only (Player === "") - grants this monster Legendary's
// solo-boss treatment (Last Stand, exempt from forced monster numbering,
// solo difficulty-calc treatment) without hero-count HP scaling. HP stays
// fixed, authored like any other Normal monster's HP.
HasLastStand?: boolean;
```

Add a helper next to `IsHeroCountScaled`, following the same
Player-guard pattern:

```ts
// Whether this monster gets Legendary's solo-boss treatment: Last Stand,
// exemption from forced monster numbering, and solo difficulty-calc
// treatment. Legendary monsters always do; a Normal monster opts in via
// HasLastStand - unlike Legendary, this does not imply hero-count HP
// scaling (see IsHeroCountScaled), which stays a fully separate flag.
export const IsSoloMonster = (statBlock: StatBlock): boolean =>
  IsLegendary(statBlock) ||
  (statBlock.Player === "" && !!statBlock.HasLastStand);
```

### 2. Last Stand mechanic — `client/Combatant/Combatant.ts`

Change the `ApplyDamage` gate (~line 430):

```ts
// before
this.StatBlock().Player === "legendary" &&
// after
StatBlock.IsSoloMonster(this.StatBlock()) &&
```

No other change needed here — `HasEnteredLastStand`, the "Last Stand" tag,
and `Metrics.TrackEvent(Metrics.Event.CombatantEnteredLastStand, ...)` are
already Player-agnostic.

### 3. Numbering exemption — `common/StatBlock.ts`

```ts
// before
export const IsExemptFromMonsterNumbering = (statBlock: StatBlock): boolean =>
  IsLegendary(statBlock) || IsRoomInfo(statBlock);
// after
export const IsExemptFromMonsterNumbering = (statBlock: StatBlock): boolean =>
  IsSoloMonster(statBlock) || IsRoomInfo(statBlock);
```

Since `IsSoloMonster` already includes `IsLegendary`, existing Legendary
behavior is unchanged. Titan stays non-exempt (it already wasn't included
here) — not something this plan changes.

### 4. Difficulty calculator solo treatment — `client/Encounter/Encounter.ts`

Change the solo-combatant lookup (~line 86-90):

```ts
// before
const legendaryCombatant = monsterCombatants.find(
  c =>
    StatBlock.IsLegendary(c.StatBlock()) ||
    StatBlock.IsTitan(c.StatBlock())
);
// after
const legendaryCombatant = monsterCombatants.find(
  c =>
    StatBlock.IsSoloMonster(c.StatBlock()) ||
    StatBlock.IsTitan(c.StatBlock())
);
```

(Renaming the local `legendaryCombatant`/`legendaryChallenge` identifiers is
optional cleanup, not required — they're internal to this function and
already describe the mechanic rather than the trigger.)

### 5. Editor UI — `client/StatBlockEditor/StatBlockEditor.tsx`

**a) New checkbox**, alongside the existing `Player === ""` checkboxes
(~line 349-386), following the exact same pattern as `ScalesWithHeroCount`:

```tsx
{api.values.Player === "" && (
  <label className="c-statblock-editor__checkbox-label">
    <Field type="checkbox" name="HasLastStand" />
    Last Stand (solo boss)
  </label>
)}
{api.values.Player === "" && api.values.HasLastStand && (
  <Info>
    This monster gets a Legendary-style Last Stand: the first time it would
    drop to 0 HP, it instead drops to its Last Stand HP and keeps fighting.
    It's also exempt from forced monster numbering and is judged solo
    against the party's average level for encounter difficulty, like a boss
    fight. Unlike Legendary, its HP does not scale with hero count — author
    it as a fixed number.
  </Info>
)}
```

**b) "Last Stand HP" field visibility.** This field is built in `statFields`,
which currently only receives `player: string` (called as
`this.statFields(api.values.Player)` at ~line 434) — it has no access to
`HasLastStand`. Widen the signature:

```ts
// before
private statFields = (player: string): JSX.Element[][] => {
// after
private statFields = (player: string, hasLastStand: boolean): JSX.Element[][] => {
```

```ts
// call site, before
this.statFields(api.values.Player)
// after
this.statFields(api.values.Player, api.values.HasLastStand)
```

And the field condition (~line 261):

```ts
// before
if (player === "legendary") {
// after
if (player === "legendary" || (player === "" && hasLastStand)) {
```

### 6. Migration / `Default()`

None needed. `HasLastStand` is a new optional boolean — absent/`undefined`
reads as falsy everywhere, same as `ScalesWithHeroCount`. No dependent
numeric field needs a seeded default (unlike `MonstersPerHero`, which
needed `1` so its field wouldn't show blank).

### 7. Tests to add

- `client/Combatant/StatBlock.test.ts` — `IsSoloMonster`: Legendary → true;
  Normal + `HasLastStand: true` → true; plain Normal → false; Titan → false
  (Titan gets solo difficulty treatment through its own separate `IsTitan`
  check at the Encounter.ts call site, not through `IsSoloMonster`).
- `client/Combatant/Combatant.test.ts` — mirror the existing Legendary Last
  Stand tests (~line 647-708) with `Player: "", HasLastStand: true}` instead
  of `Player: "legendary"`: triggers once when dropping to 0 HP with an
  authored `LastStandHP`, does not retrigger on a second drop to 0, does not
  trigger without an authored `LastStandHP`.
- `client/Combatant/IndexLabeling.test.ts` — mirror the existing Legendary
  numbering-exemption tests (~line 163-187, using `Player: "legendary"`)
  with a `Player: "", HasLastStand: true` stat block: a solo `HasLastStand`
  monster keeps its bare name even when added twice, and doesn't consume/
  shift the numbering of unrelated same-named Normal monsters added around
  it.
- `client/Encounter/Encounter.test.ts` (or wherever the difficulty-calc
  solo-combatant selection is tested) — a `HasLastStand` Normal monster is
  picked as the solo combatant for difficulty calculation, same as a
  Legendary one; a plain Normal monster (no flag) is not.
- `client/StatBlockEditor/StatBlockEditor.test.tsx` — the "Last Stand HP"
  field appears for `Player: "", HasLastStand: true` (and not for a plain
  Normal monster); the checkbox and its `Info` blurb render/toggle as
  expected.

## Known limitations (documenting, not fixing here)

- **No cross-field validation against the scaling flags.** Nothing stops a
  GM from also checking `ScalesWithHeroCount` or `ScalesCountWithHeroCount`
  on a `HasLastStand` monster. That combination is conceptually
  contradictory — a "solo boss" whose HP secretly gets multiplied, or that
  duplicates itself by hero count — but the editor doesn't block it,
  matching this codebase's general trust-the-author stance on flag
  combinations. Out of scope to add validation here.
- **Titan is untouched.** It never had Last Stand (`ApplyDamage` only ever
  checked `"legendary"`), isn't included in `IsSoloMonster`, and stays
  outside the numbering exemption — all pre-existing behavior, not
  something this plan unifies.
- **Player View styling is deliberately not extended.** The `IsLegendary`
  CSS badge (`client/PlayerView/components/PlayerViewCombatant.tsx:37-38`)
  stays Legendary-only, mirroring the precedent set by
  [[scalable_monsters_plan]] ("a Scalable Ghoul should look like a normal
  monster, not get the Legendary styling/badge"). A `HasLastStand` monster
  should look like a Normal monster in Player View except for its actual
  Last Stand behavior when it triggers.

## Naming (proposed, not yet settled)

- Authored stat block field: `HasLastStand` (boolean) — confirmed with the
  user.
- Shared predicate: `IsSoloMonster` (boolean), reused by `ApplyDamage`,
  `IsExemptFromMonsterNumbering`, and the Encounter.ts difficulty-calc
  solo-combatant lookup. Considered `CanEnterLastStand`, rejected because it
  undersells the numbering/difficulty behaviors it also gates.
