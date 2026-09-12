# Learning Center Plan (V2)

This is the V2 of in-app learning/discoverability, building on the V1
already planned in `plans/private/GUIDES_ONEPAGER.md` (self-written
"how to play Nimble" PDF one-pagers, hosted as static files, linked from
a "Player Guides" button on About). V1 answers "how do I learn the
Nimble *rules*"; this plan answers "how do I learn what this *app* can
do," and treats V1's guides as one entry in its checklist rather than
redoing that discovery work.

## Problem

Feature discovery today is thin and passive:

- **Tutorial** (`client/Tutorial/`) covers only the first-run combat loop
  (add heroes/monsters, damage, taken-turn, open Settings). It never
  mentions Rooms, custom fields, tags, Player View, hidden combatants, etc.
- **"Did you know?" tips** (`client/Settings/Tips.ts`, shown via
  `TipCarousel` on the About tab) surface ~15 one-liners about deeper
  features, but they're a random rotation with no way to browse the full
  list, no detail beyond one sentence, and no memory of what you've already
  read.
- Deeper features are explained only where you stumble into them: an
  `Info` tooltip on the `Player` dropdown explains Rooms
  (`client/StatBlockEditor/StatBlockEditor.tsx:387-398`), and the Custom
  Fields UI (`client/Settings/components/StatBlockCustomFields.tsx`) has no
  in-context explanation at all beyond field labels.

There's no single place a GM can go to browse "everything this app can do"
at their own pace, independent of the guided first-run flow.

## Proposal

Add a **Learning Center**: a new Settings tab that lists app features as a
checklist, grouped by topic. Each item has a short title, a one-to-few
sentence explanation (reusing/absorbing the existing `Tips.ts` content plus
new entries), and a checkbox the user can tick to mark it "learned." Some
items get a "Show me" action that jumps to the relevant Settings tab or
triggers the matching Tutorial step, the way `OptionsSettings` already links
to `EpicInitiativeSettings` via `goToEpicInitiativeSettings`.

This is additive, not a replacement for the Tutorial (first-run guided
flow) or the About tab (project info, support links) — it's the "browse
anytime" complement to both.

### Why a checklist over just "better tips"

A flat list of tips has no sense of progress and nothing to distinguish
"I already know this" from "I haven't seen this yet." A checklist gives
GMs a self-serve map of the app's surface area and lets them track their
own progress across sessions, which fits how onboarding checklists work in
most SaaS apps. It's a small, local (not account-synced) feature — no
server changes needed.

## Content: candidate topics — **approved**

Pulled from existing `Tips.ts`, inline `Info` tooltips, and the feature
areas explored while researching this plan. Groupings and coverage
approved as-is by the user; exact per-item wording can still be refined
during implementation, but no topics remain to add or cut:

**Encounter Basics**
- Adding Heroes vs. Monsters (Monsters clone per-encounter; Heroes persist
  across encounters)
- Applying damage/healing (negative damage heals; temp HP overwrites,
  doesn't stack)
- Marking a combatant's turn taken (no strict turn order in Nimble)
- Hidden combatants (Alt+click a library entry to add hidden)
- Multi-select combatants (modifier-click to apply damage/tags to several
  at once)

**Rooms** *(StatBlock `Player: "room"`, see
`StatBlockEditor.tsx:364-370`, `StatBlock.IsRoomInfo` — full GM walkthrough
already written in `plans/private/HOW_TO_CREATE_A_ROOM.md`/`ROOMS.md`,
this topic is that content adapted for in-app display)*
- What a Room is: a non-combat info card (read-aloud text/GM notes), not a
  monster — excluded from difficulty math, hidden from Player View by
  default, no HP bar
- Creating one: make a StatBlock in the Monsters library, set Player →
  Room (form collapses to Name + a large Description field), write the
  read-aloud text in Description
- GM-only secrets/traps/loot: use the "Update Persistent Notes" command
  (default key **Y** on a selected combatant; toolbar/inline buttons can
  be enabled in Settings → Commands)
- Persisting it: "Save Current Location" at the bottom of the
  Locations tab (renamed Encounters tab) — same Name/Folder each time to
  overwrite rather than duplicate; notes only persist once re-saved this
  way
- A Room can hold real monsters too — just add them to the same
  Combatants list alongside the room-info entry

**Custom Fields**
- UI path (corrected — the plan originally cited Settings → Content,
  which is wrong): `StatBlockCustomFields.tsx` actually renders inside
  `EpicInitiativeSettings.tsx` (the "Legendary" tab), gated behind
  `env.HasEpicInitiative` and hidden entirely in production until
  Epic/Mythic tiers launch (see
  `patreon_tier_rollout` memory) — define a name/default value per field,
  optionally surface it as a column in the Combatants list
- Confirmed with user: this topic covers the Settings UI only (define
  field → toggle "Display in Encounter View" → set column header/width).
  Under the hood it's stored as `StatBlock.CustomFields` (see
  `common/StatBlock.ts:113`), but there's no separate raw-JSON authoring
  path to document — the UI is the entry point.
- Because the tab is currently unreachable for most users, this item's
  body should say it's part of Legendary Tier rather than link a
  "Show me" into a tab that doesn't exist for them yet.

**Tags & Conditions**
- Creating tags, auto-expiring tags (disappear after N rounds)
- Automatic Concentration reminders (tag `Concentrating`, toggle in
  Settings)

**Library Management**
- Library Manager (bulk move/delete/export) — enabled via Encounter
  Commands tab
- "Edit Unique Monster" command for ad-hoc single-monster tweaks without
  touching the library copy

**Scaling & Difficulty**
- Legendary monsters (HP scales to hero count)
- Scalable Normal monsters (opt-in HP × hero count — see
  `plans/done/SCALABLE_MONSTERS.md`)

**Player View**
- Sharing the Player View URL to any device
- NPC HP shown as a qualitative indicator only (configurable)

**Inventory**
- Enabling Inventory in Options; adding items via the "Add Item" combatant
  command

**Settings & Shortcuts**
- Keybindings/advanced commands (Commands tab)
- Exporting user data periodically (beta-state safety net)

**Account**
- Account Sync (Patreon) for cross-device Hero/Encounter access

**Learning Nimble (the tabletop game itself)**
- Different in kind from every group above: those teach the *app*, this
  teaches the *rules*. This is the V1 dependency
  (`plans/private/GUIDES_ONEPAGER.md`) — self-written, class/topic
  one-pager PDFs (~20 planned: class guides plus general "how to play
  Nimble" topics), hosted under `public/guides/` with a static
  `public/guides/index.html` and a "Player Guides" button on About.
  Hosting, licensing (original content, not redistributed Nimble Co.
  material — clear per CONTRIBUTING.md), and content scope are already
  resolved there; nothing new to decide here.
- This group only exists in the Learning Center once V1 ships. Its item(s)
  just deep-link into `/guides/` (or per-guide, if a per-topic checklist
  is wanted instead of one umbrella link) — the "learned" checkbox here
  means "I've read this," not "I've tried this feature."
- Sequencing, **decided**: V1 (`GUIDES_ONEPAGER.md` — guides themselves
  + the About button) ships first. This group is added to the Learning
  Center only once V1 is live, not shipped early as a placeholder/dead
  link. The rest of the Learning Center's topics don't depend on this and
  can ship on their own timeline.

## UI/UX sketch

- New `SettingsTab.Discover` entry in `SettingsPane.tsx`, labeled
  **"Discover"** in the tab bar, positioned immediately after `About`
  since both are "orientation" tabs rather than configuration.
  **Decided** — chosen over "Tutorials"/"Learn"/"Teach Me" specifically
  to avoid colliding with the existing single-flow, first-run `Tutorial`
  component/"Repeat Tutorial" button; "Discover" reads as the browsable
  checklist it is rather than another guided walkthrough.
- The Settings modal/window will need to grow — both to fit one more tab
  in the tab bar and to comfortably fit a multi-group checklist without
  heavy scrolling, since current tabs are short-form by comparison.
  **Decided**, size up during implementation rather than cramming it into
  the existing modal dimensions.
- `client/Settings/components/LearningCenter.tsx`:
  - Renders topic groups as collapsible sections (reuse whatever
    accordion/expand pattern already exists, if any — otherwise a simple
    `<details>`-based or state-toggled group, matching this codebase's
    plain-React style rather than pulling in a new UI dependency;
    confirmed no such pattern exists in the codebase today).
  - Each item: checkbox + title + expandable body text. Checking a box
    doesn't change app behavior — purely a personal progress marker.
    Groups stay flat — completing every item in a group has no special
    effect (no auto-collapse, no badge). **Decided.**
  - A small progress indicator ("12 / 28 learned") at the top of the tab.
  - Optional "Show me" link per item where a natural target exists (jump
    to a Settings tab, or re-open the specific Tutorial step — needs
    `NotifyTutorialOfAction`/step-index plumbing if we want deep-linking
    into the guided tutorial rather than just opening Settings tabs).

## Persistence

Store checked-state locally only, keyed by a stable item id per topic
(e.g. `rooms.what-is-a-room`), using `LegacySynchronousLocalStore`
(`client/Utility/LegacySynchronousLocalStore.ts`) the same way the
tutorial nudge flag is already stored in `App.tsx` — a synchronous
localStorage-backed flag, no server/account sync needed. This deliberately
does **not** sync across devices or Account Sync, matching how the
Tutorial's own "seen it" state is local-only today.

## Status

All open questions are resolved: tab placement/name ("Discover," next to
About, modal sized up), group-completion behavior (flat, no special
effect), the candidate topic list (approved as-is), and the game-rules-
guides group's sequencing behind V1 (`GUIDES_ONEPAGER.md` ships first).
Ready to move from planning to implementation.

## Out of scope

- Changing the existing Tutorial's steps or content.
- Server-side/account-synced learning progress.
- A searchable help/docs site — this is in-app only.
