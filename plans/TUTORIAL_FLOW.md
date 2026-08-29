# Tutorial Flow

Last reviewed: 2026-08-26

No such document existed before this one - this is a from-scratch description
of the in-app tutorial, written for editing its copy/steps without having to
reverse-engineer the code first.

## What it is, where it lives

A guided walkthrough overlaid on the live tracker UI: a small floating box
(`.tutorial` in [Tutorial.tsx](../client/Tutorial/Tutorial.tsx)) with a message
and a "Next" button, positioned next to whichever UI element the current step
wants the user looking at. That element gets a `.tutorial-focus` CSS class
(styling in [lesscss/components/tutorial.less](../lesscss/components/tutorial.less))
so it's visually highlighted/spotlighted against the rest of the (dimmed) UI.

- **Step content and order**: [TutorialSteps.ts](../client/Tutorial/TutorialSteps.ts)
  - a plain ordered array, one object per step.
- **Playback engine**: [Tutorial.tsx](../client/Tutorial/Tutorial.tsx) - tracks
  `stepIndex`, renders the current step's message, highlights its target
  element(s), and advances on "Next" or on a matching app action (see below).
- **Cross-cutting signal channel**: [NotifyTutorialOfAction.ts](../client/Tutorial/NotifyTutorialOfAction.ts) -
  a single global Knockout observable. Various unrelated parts of the app
  (library panes, encounter commands, prompts, combat math) call
  `NotifyTutorialOfAction("SomeActionName")` when the user does the specific
  thing a step is waiting for. `Tutorial.tsx` subscribes to it and advances if
  the fired name matches the current step's `AwaitAction`.

## When it's shown

- **First run**: [TrackerViewModel.tsx:63-68](../client/TrackerViewModel.tsx#L63-L68) -
  `TutorialVisible` starts `true` unless `localStorage`'s `SkipIntro` flag is
  set. Closing the tutorial (the "End Tutorial" button, or finishing the last
  step) sets `SkipIntro = true` ([App.tsx:99-104](../client/App.tsx#L99-L104)),
  so it never auto-shows again for that browser.
- **Manually replayed**: Settings > About > "Repeat Tutorial" calls
  `TrackerViewModel.RepeatTutorial` ([TrackerViewModel.tsx:208-230](../client/TrackerViewModel.tsx#L208-L230)),
  which ends any active encounter, opens the Libraries pane, closes Settings,
  and restarts the tutorial from step 0. It does **not** clear `SkipIntro`, so
  it won't auto-show again next visit just because it was replayed once.
  The tutorial's sample heroes require `PreloadedHeroSources["tutorial-heroes"]`
  to be `true`; if the user has turned that source off in Content settings,
  `RepeatTutorial` instead flips it back on, persists the setting, sets a
  `PendingRepeatTutorial` flag in local storage, and reloads the page. On the
  next boot, `TrackerViewModel.SetLibraries` ([TrackerViewModel.tsx:103-134](../client/TrackerViewModel.tsx#L103-L134))
  sees that flag, clears it, and calls `RepeatTutorial` again automatically
  once libraries are ready - this time the setting is on, so it proceeds
  normally.
- While the tutorial is active, editing a library StatBlock or a Persistent
  Character's stat block is disabled ([LibrariesCommander.ts:168-170,
  219-221](../client/Commands/LibrariesCommander.ts#L168-L170)) - the tutorial
  has first claim on the UI.

## How advancing works

Each step is one of two kinds:

- **Click-to-advance**: "Next" is always enabled; the user reads the message
  and clicks through at their own pace.
- **Wait-for-action**: the step sets `AwaitAction`, which disables "Next"
  ([Tutorial.tsx:70](../client/Tutorial/Tutorial.tsx#L70)) until that exact
  action name comes through `NotifyTutorialOfAction`. The step only advances
  once the user actually performs the highlighted thing (clicking a specific
  tab, submitting a specific prompt, etc.) - not by clicking a button in the
  tutorial box itself.

**If you add a step with an `AwaitAction` that nothing in the app ever
fires, the tutorial gets permanently stuck on that step** ("Next" stays
disabled forever) - wiring the matching `NotifyTutorialOfAction("YourName")`
call at the right code site is not optional.

## Step-by-step walkthrough

| # | Message shown | Highlights | Advances when | Fired from |
|---|---|---|---|---|
| 0 | "Let's start by adding a few creatures to the encounter. **Click on any creature** to add one to the encounter pane." | Library panel / combatants area | User clicks "Next" (no gate) | - |
| 1 | "When you're ready to add some adventurers, select the **Heroes** tab at the top of the library." | The library's tab bar | User clicks the **Heroes** (Persistent Characters) tab | [LibraryReferencePanes.tsx:49-52](../client/Library/ReferencePane/LibraryReferencePanes.tsx#L49-L52) |
| 2 | "It's easy to add your own heroes to Nimble RPG App. For now, **add a few sample characters**." | Library panel / combatants area | User clicks "Next" (no gate) | - |
| 3 | "Press 'alt-r' or **click 'Start Encounter'** to roll initiative." | The "Start Encounter" button | User clicks Start Encounter, opening the initiative-roll prompt | [EncounterCommander.ts:188-190](../client/Commands/EncounterCommander.ts#L188-L190) |
| 4 | "Enter initiative rolls, or **press enter** to take the pre-rolled results." | The initiative-roll prompt | User submits the initiative prompt | [InitiativePrompt.tsx:225-233](../client/Prompts/InitiativePrompt.tsx#L225-L233) |
| 5 | "Select a combatant by clicking. You can select multiple combatants by holding the control key." | Combatants list / right column | User clicks "Next" (no gate) | - |
| 6 | "Press 't' or click 'Apply Damage' to apply damage to selected combatants. You can enter a negative number to apply healing." | Combatants list, Apply Damage button/prompt | User actually applies damage/healing to a combatant | [Combatant.ts:369](../client/Combatant/Combatant.ts#L369) (`ApplyDamage`, fired for both damage and healing) |
| 7 | "Click 'Settings' to set keyboard shortcuts and explore advanced features, or choose **End Tutorial**." | The Settings button | User clicks Settings (or "End Tutorial" to close early) | [EncounterCommander.ts:151-155](../client/Commands/EncounterCommander.ts#L151-L155) |

Finishing step 7 (or clicking "End Tutorial" at any point) closes the
tutorial and sets `SkipIntro`.

**Dead step, not shown to anyone:** there's a commented-out block in
[TutorialSteps.ts:117-126](../client/Tutorial/TutorialSteps.ts#L117-L126) for
a "Next Turn" step, already inert (also separately noted as dead code in
[plans/DETACH D&D5e.md](DETACH%20D&D5e.md)). Safe to delete outright, or
revive if a "advance the turn order" step is wanted back.

## Known issue worth flagging before editing content

**Steps 3-4 teach D&D-style dice-rolled initiative** ("Start Encounter" →
roll/accept initiative numbers per combatant). Per
[NIMBLE_CONVERSION.md](../NIMBLE_CONVERSION.md)'s "Monster grouping and phase
order" section, Nimble doesn't use per-creature rolled initiative at all - it
uses **phase order** (one side acts, then the other, via "Group Monsters" /
"Swap Phase Order"), a mechanic this tutorial never mentions.
[plans/DETACH D&D5e.md §9](DETACH%20D&D5e.md) already flags Start/End
Encounter's dice-roll prompt as D&D-only residue, blocked on one open UX
question (does starting combat need any prompt at all). **If/when that
question is resolved and the prompt changes, steps 3-4 here need rewriting
to match** - otherwise the tutorial will actively teach new users a flow the
app no longer really has.

More generally, **the tutorial has zero coverage of any Nimble-specific
feature** added by this fork - Mana/Resources/Hit Dice/Wounds/Gold, Inventory,
Companions, or the phase-order toggle itself. It's still exactly the
original D&D-era 8-step script. Worth deciding whether new steps should be
added, independent of the initiative rewrite above.

## Editing guide

Each entry in the `TutorialSteps` array has:

- **`Message`** - the HTML string shown in the tutorial box (`<strong>` tags
  for emphasis are used throughout; rendered via `dangerouslySetInnerHTML`,
  so it's raw HTML, not escaped).
- **`RaiseSelector`** - one or more CSS selectors (comma-separated); every
  matching element gets the `.tutorial-focus` highlight class.
- **`CalculatePosition`** - given the matched elements (as a `NodeList`),
  returns `{ left, top }` pixel coordinates for the tutorial box itself,
  almost always computed relative to one of the highlighted elements'
  bounding rect (`getBoundingClientRect()`, wrapped by the local `getLocation`
  helper). Get this wrong and the box floats in the wrong place or off-screen
  - there's no automatic layout, every step positions itself by hand.
  - Positions are computed in [`useLayoutEffect`](../client/Tutorial/Tutorial.tsx#L43-L60)
    right when the step changes, and again cleared (`.tutorial-focus` removed
    from everything) on close - not re-computed on window resize, so a step
    open across a resize can end up misplaced until the next step change.
- **`AwaitAction`** (optional) - omit it for a plain click-to-advance step.
  Set it to gate advancement on a real user action instead; the string must
  exactly match a `NotifyTutorialOfAction("...")` call added at the
  appropriate site elsewhere in the app (see the table above for the existing
  five call sites).

To reorder, insert, or remove a step: just edit the array - `Tutorial.tsx`
walks it purely by index, nothing else references step numbers.
