# Nimble Conversion

This fork adapts Improved Initiative from Dungeons & Dragons 5th Edition to
the [Nimble](https://nimblerpg.com/) tabletop RPG, and adds a set of
combat-tracker features that Nimble's rules call for but D&D's don't. D&D-only
fields (e.g. spell levels, certain stat block fields) are hidden rather than
removed, so existing D&D content still imports and displays correctly.

For build/dev setup, see the main [README.md](README.md). This document
covers what changed and why, as a reference for anyone extending the fork
further.

## Terminology

Spell "Level" was renamed "Tier" throughout the UI and conditions text, to
match Nimble's vocabulary.

## Per-combatant resource pools

The app already tracked HP; this fork adds four more resource pools, each
following the same "stat block defines a max, `Combatant` tracks a live
current value, changes sync to the saved `PersistentCharacter`" pattern as
HP, but with different visibility/gating rules where Nimble's mechanics
require it.

| Resource | Who has it | Starts at | Sign convention | Player View |
|---|---|---|---|---|
| **Mana** | Any stat block with `StatBlock.Mana` set | Full | spend decreases (`current - amount`) | shown when set, current only |
| **Resources** | Any stat block with `StatBlock.Resources` set | Full | spend decreases | shown when set, current only |
| **Hit Dice** | Player characters only | Full | spend decreases | shown when set, current only, hide/reveal toggle |
| **Wounds** | Player characters (and companions — see below) only | 0 (empty) | add increases (`current + amount`) | hidden until first wound taken; DM always sees `0/max` |
| **Gold** | Player characters only | 0 | add increases | hide/reveal toggle, defaults hidden for new PCs |

Notable deviations from the obvious pattern:

- **Wounds is inverted.** Unlike every other resource, 0 is healthy and max
  is defeated, so its color gradient and "Add"/"Heal" verbs run the opposite
  direction from HP/Mana's "Spend"/"Restore". A fresh PC starts at `0/5`
  wounds (5 is the Nimble default max), not full.
- **Gold and Hit Dice default to hidden** for newly-created player
  characters — the DM reveals them per-combatant via a "Hide/Reveal in
  Player View" toggle (mirroring the existing AC-reveal mechanic), rather
  than a global settings checkbox. Older saved encounters keep showing
  them as before (legacy data defaults to visible).
- Column order everywhere the resources appear together: **HP, Mana,
  Resources, Hit Dice, Wounds, AC, Gold**.
- **Mana, Resources, Hit Dice, and Wounds each got a `TemporaryX` pool**
  (like `TemporaryHP`), added after the initial per-resource builds. A
  positive change first drains the temporary pool before touching the real
  current value (for Wounds, this means temporary points act as protection,
  absorbing incoming wounds before `CurrentWounds` rises). Gold has no
  temporary variant — it's currency, not a combat resource. None of the
  five got a verbosity setting independent of the HP verbosity dropdowns —
  still deferred.

Key files: [common/StatBlock.ts](common/StatBlock.ts),
[common/CombatantState.ts](common/CombatantState.ts),
[common/PersistentCharacter.ts](common/PersistentCharacter.ts),
[client/Combatant/Combatant.ts](client/Combatant/Combatant.ts),
[client/Combatant/ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts).

## Persistent tags for player characters

`Tags` used to live only in per-encounter `CombatantState`, so a PC's
conditions/labels reset every time they were re-added to an encounter. Tags
without a duration now sync to `PersistentCharacter` (mirroring how
HP/Mana/Gold already do) and are restored when the character is next added
to any encounter. Duration-based tags (which reference round counts and a
specific combatant ID from one encounter) intentionally stay
encounter-local, since they wouldn't mean anything elsewhere.

Known gap: reloading a *saved* encounter re-syncs HP/Mana/etc. from the
canonical `PersistentCharacter` but not Tags — a non-expiring tag picked up
in a different encounter since this one was saved won't appear until the
character is re-added.

## Inventory tracking

Persistent characters can carry items, tracked the same dual-storage way as
gold (`CombatantState.Items` + `PersistentCharacter.Items`, editable only
while the character is in an active encounter).

- **Slot-based capacity**, derived from Strength: `10 +
  GetModifierFromScore(Str)`. Not a stored field — always recomputed so it
  can't drift if Strength changes.
- **Stackable items** (e.g. torches) are one row with a `Quantity`, costing a
  flat 1 slot regardless of quantity. **Non-stackable items** are one row
  per item, each with its own `SlotCost`.
- Going over capacity is a warning ("11/10 slots"), not a hard block.
- The DM's own initiative-list column shows a full/not-full slot indicator
  only (`"7/10"`); the DM's combatant details pane shows full contents
  (`CombatantDetails.tsx`, `ItemDetails`) at all times, regardless of
  what's pushed to players.
- Full contents reach players only on demand, via a DM-triggered popup
  (`InventoryDisplayPopup.tsx`, reusing the same transient-socket-event
  mechanism as the existing "Post-Combat Breakdown" popup), not
  continuously synced. The DM toggles it via the "Show/Hide Inventory in
  Player View Popup" command (`CombatantCommander.ToggleInventoryDisplayToPlayers`
  /`InventoryDisplayedCombatantId`/`DismissInventoryDisplay`) in the
  combatant command list, or via a one-click shortcut on the "Add Item"
  prompt itself (`fa-scroll` button in `ItemPrompt.tsx`, which also
  dismisses that prompt) — clicking the command again dismisses the popup,
  no separate close button needed on the player side. There is no
  persistent on-screen indicator in the DM view that a popup is currently
  showing; re-triggering the same toggle is the only way to dismiss it
  short of the players closing it themselves.
- The `fa-scroll` icon in the combatant details pane's Inventory header is
  a *different*, DM-only action: it opens a dismissible read-only info card
  (`InventoryCardPrompt.tsx`, queued the same way as spell/condition
  reference cards) showing that combatant's contents. It does not push
  anything to players.
- Removing an item goes through a confirm-before-delete prompt
  (`RemoveItemPrompt.tsx`) rather than deleting immediately.
- Same hide/reveal-from-players toggle as Gold and Hit Dice
  (`RevealedItems`), defaulting hidden for new PCs. This is a distinct
  control from the popup toggle above: `RevealedItems` governs the passive
  slot-count indicator, the popup toggle governs the on-demand
  full-contents popup.
- Add/remove UI in the combatant details pane (`CombatantDetails.tsx`),
  modeled on `Tags`' inline-list-with-remove-button pattern plus a
  Gold-style signed-quantity prompt (`ItemPrompt.tsx`).

Key files: [common/CombatantState.ts](common/CombatantState.ts),
[client/Combatant/InventorySlots.ts](client/Combatant/InventorySlots.ts),
[client/Prompts/ItemPrompt.tsx](client/Prompts/ItemPrompt.tsx),
[client/Prompts/InventoryCardPrompt.tsx](client/Prompts/InventoryCardPrompt.tsx),
[client/Prompts/RemoveItemPrompt.tsx](client/Prompts/RemoveItemPrompt.tsx),
[client/PlayerView/components/InventoryDisplayPopup.tsx](client/PlayerView/components/InventoryDisplayPopup.tsx).

**Not yet built:** a shared item library with predefined slot costs, to
save re-typing the same item's name and slot cost every time.

## Companions

Nimble PCs can have companions/sidekicks (pets, hirelings) that aren't full
player characters but shouldn't be swept up by monster-only bulk actions
either. `StatBlock.Player` gained a third value, `"companion"`, alongside
`""` (monster/NPC) and `"player"`.

- Companions act in the player phase (`ActsInPlayerPhase`) for sorting
  purposes, but are otherwise monster-shaped: no Gold or Hit Dice, no
  Level-vs-Challenge label, no PC-style HP rolling.
- Excluded from "Group Monsters", "Hide/Reveal All Monsters", and "Clean
  Encounter"'s removal — a companion in the fight stays in the fight.
- *Do* get Wounds tracking, and — if created as a Persistent Character
  (via the "Characters" library tab, same as a PC) — get the same
  one-copy-per-encounter uniqueness and cross-encounter HP/Wounds
  persistence a PC gets.
- A stat block can be marked a companion either in the "Characters" library
  (persistent) or via the Quick Edit toggle on any in-combat creature
  (non-persistent, same as marking one "Player Character" today).

Key files: [common/StatBlock.ts](common/StatBlock.ts) (`IsCompanion`,
`ActsInPlayerPhase`), [client/Commands/EncounterCommander.ts](client/Commands/EncounterCommander.ts).

## Monster grouping and phase order

Nimble doesn't use per-creature fixed initiative — one side (players or
monsters) acts as a phase, in whatever order that side likes, and which
side goes first can flip round to round. Rather than rebuild initiative
from scratch, this reuses the existing numeric sort with two toolbar
commands layered on top:

- **Group Monsters** — gives every monster the same (highest) initiative
  and a shared `InitiativeGroup`, clustering them into one visual block via
  the existing sort tiebreak.
- **Swap Phase Order** — toggles `Encounter.MonstersActFirst` and re-sorts
  by phase block instead of by individual initiative/Dex modifier, so
  toggling flips which side's block is on top without touching anyone's
  `Initiative` value or re-ranking players/monsters within their own block
  by Dex.

The plain "Start Encounter" flow (no phase toggle involved) is unaffected
and still ranks tied initiatives by Dex modifier as before — phase sorting
(`Encounter.SortByPhase`) is a separate code path used only by these two
commands.

Key file: [client/Encounter/Encounter.ts](client/Encounter/Encounter.ts).

## Hide/Reveal All Monsters, and Keep Hidden

A toolbar bulk version of the existing per-combatant "Hide/Reveal in Player
View" toggle: if every monster is already hidden it reveals them all,
otherwise it hides them all. A separate per-monster `KeepHidden` lock
(distinct from the plain `Hidden` toggle) lets a DM keep one monster
(e.g. an undetected ambusher) hidden through "Reveal All Monsters", no
matter how many times it's pressed.

## Index labels and monster numbering

`AlwaysNumberMonsters` gives every monster of a given name a stable index
(e.g. "Goblin 1", "Goblin 2") even when only one is present, instead of
only numbering on a name collision. Companions and player characters are
excluded from this numbering, matching how a solo monster would otherwise
go unnumbered.

## Testing

Each feature above shipped with unit tests colocated next to the source it
covers (the project's existing convention), plus two pieces of standalone
test-infrastructure work done during this conversion:

- **Unblocked 8 Jest suites that couldn't run at all.** `remark-breaks@4`
  ships pure ESM, which Jest's CommonJS loader can't parse — anything
  importing it transitively (via `TextEnricher.tsx`) crashed at import
  time, silently disabling `CombatantCommander.test.ts`,
  `EncounterCommander.test.ts`, `TextEnricher.test.tsx`,
  `Components/StatBlock.test.tsx`, `PersistentCharacter.test.tsx`,
  `AutosavedEncounterTest.test.tsx`, `LibrariesCommander.rename.test.ts`,
  and `InitiativeList.test.tsx`. Fixed with a no-op mock
  ([client/test/remarkBreaksMock.ts](client/test/remarkBreaksMock.ts))
  mapped in [client/jest.config.js](client/jest.config.js)'s
  `moduleNameMapper`, the same pattern already used to mock
  `react-markdown`.
- **Filled the coverage gaps that unblocking revealed**, notably: clamp/
  sign-convention tests for every `Apply*Change` method (Mana, Resources,
  Hit Dice, Wounds, Gold each have a different sign convention — this is
  what previously let a real Wounds sign bug ship unnoticed);
  `ToPlayerViewCombatantState.ts` display-gating tests for the
  PC-vs-monster/hide-until-first-wound/reveal-toggle logic across all five
  resources; the persistent-tags-sync filter (non-duration only); the
  `SortByInitiative`-vs-`SortByPhase` divergence for companions; and
  companion-specific coverage for index labeling, Wounds, uniqueness, and
  `PersistentCharacter` sync.
- **Found, but deliberately left alone:** unblocking `InitiativeList.test.tsx`
  exposed 2 genuine pre-2021 test failures (`"Shows a pause/play icon..."`,
  looking for a `data-testid` that no longer exists in
  `InitiativeList.tsx`) that had been silently masked by the parse crash
  above rather than caused by it. Not fixed — needs a decision on the
  right resolution (re-add the icon, repoint the test at the toolbar
  commands, or delete it) rather than a guess.

Current baseline: `npx tsc --noEmit -p client/tsconfig.json` exits clean
(0 errors, via `skipLibCheck` — see below), and `npx jest --config
client/jest.config.js` passes all runnable tests except those 2
pre-existing failures.

**Shared resource-pool math.** Mana, Resources, Hit Dice, and Wounds'
spend/restore/clamp logic (including the temporary-pool absorption that
Mana/Resources/Hit Dice and Wounds each need, in opposite sign directions)
is implemented once in
[client/Combatant/ApplyResourcePoolChange.ts](client/Combatant/ApplyResourcePoolChange.ts),
not copy-pasted per resource. `Combatant.ts`'s four `Apply*Change` methods
are thin wrappers around it — see
[plans/RESOURCE_POOL_HELPER_PLAN.md](plans/RESOURCE_POOL_HELPER_PLAN.md)
for why this was extracted (it's the exact spot the Wounds sign bug above
came from) and why the display/percentage layer
(`CombatantViewModel.ts`/`ToPlayerViewCombatantState.ts`) was deliberately
left un-unified. A future sign-convention or clamping change to one of
these four resources belongs in that one helper, not in `Combatant.ts`.

## Known type errors

Unrelated to the Nimble conversion itself, but surfaced and partly resolved
during this work: see [KNOWN-TYPE-ERRORS.md](KNOWN-TYPE-ERRORS.md) for the
current `skipLibCheck`-silenced TypeScript declaration conflicts
(Knockout's bundled types vs. `@types/knockout`, and a `ws`/`@types/ws`
`Server` generic conflict) and why an `esModuleInterop` fix was tried and
reverted.
