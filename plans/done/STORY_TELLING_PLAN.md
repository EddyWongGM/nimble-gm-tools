# Player View Storytelling Plan

Last reviewed: 2026-08-22

## Goal

Use the Player View (the read-only screen popped out to a second
monitor/TV for players) as a storytelling aid — scenery images to set a
mood, portraits to reveal a monster or NPC dramatically — on top of what
already exists in this codebase, rather than building a new feature from
scratch.

## Current state: this already works, and is already unlocked locally

Two image mechanisms already exist end-to-end (DM UI → socket.io/REST sync
→ Player View render). Both are gated behind the upstream project's
`env.HasEpicInitiative` Patreon flag, but this fork's local
[.env](.env) already sets `DEFAULT_ACCOUNT_LEVEL=epicinitiative`
([server/routes.ts:245-249](server/routes.ts#L245-L249)), which sets
`session.hasEpicInitiative = true` for every session on this local server
([server/routes.ts:238-264](server/routes.ts#L238-L264) `setupLocalDefaultUser`,
documented for exactly this self-hosting case in
[README.md:58](README.md#L58)). So both features below are already active —
no code or config change needed to use them.

### 1. Full-screen scenery/background image

- Set per-launch from the DM tracker: click "Launch Player View" →
  Background Image URL field
  ([client/Prompts/PlayerViewPrompt.tsx:61-69](client/Prompts/PlayerViewPrompt.tsx#L61-L69)),
  wired through `EncounterCommander.LaunchPlayerView`
  ([client/Commands/EncounterCommander.ts:35-48](client/Commands/EncounterCommander.ts#L35-L48)).
- Synced live via `EncounterState.BackgroundImageUrl`
  ([common/EncounterState.ts:10](common/EncounterState.ts#L10)) over the
  same socket.io channel as combatant state, so changing it mid-session
  updates the popped-out Player View immediately.
- Rendered as a full-viewport CSS `background-image: cover` on `#playerview`
  ([client/PlayerView/CSSFrom.ts:56-62](client/PlayerView/CSSFrom.ts#L56-L62),
  base styling in
  [lesscss/improved-initiative.less:45-53](lesscss/improved-initiative.less#L45-L53)).
- Can also be baked into a **saved encounter** so it reloads automatically
  next time that encounter is loaded
  ([common/SavedEncounter.ts:7](common/SavedEncounter.ts#L7), editable in
  [client/StatBlockEditor/SavedEncounterEditor.tsx:48](client/StatBlockEditor/SavedEncounterEditor.tsx#L48)
  and
  [client/Prompts/SaveEncounterPrompt.tsx:77](client/Prompts/SaveEncounterPrompt.tsx#L77)).
- There's also a separate, persistent per-account default background
  (`PlayerViewCustomStyles.backgroundUrl`,
  [common/PlayerViewSettings.ts:35](common/PlayerViewSettings.ts#L35)), set
  once in Settings, used when no per-encounter background is set.

### 2. Per-combatant portrait images

- Each `StatBlock` has an `ImageURL` field
  ([common/StatBlock.ts:65](common/StatBlock.ts#L65)), editable in the stat
  block editor via the "Portrait URL" field
  ([client/StatBlockEditor/StatBlockEditor.tsx:169](client/StatBlockEditor/StatBlockEditor.tsx#L169)),
  which validates the URL actually loads an image before saving
  ([StatBlockEditor.tsx:354-367](client/StatBlockEditor/StatBlockEditor.tsx#L354-L367)).
- Flows to Player View through the sanitized DTO
  (`ToPlayerViewCombatantState.ts:41`) as long as `env.HasEpicInitiative` —
  already true locally.
- Shown as small portraits next to combatants, or full-screen on click
  ([client/PlayerView/components/PortraitModal.tsx](client/PlayerView/components/PortraitModal.tsx)),
  or auto-splashed full-screen when that combatant's turn starts — the
  "Splash Portraits" setting
  ([client/PlayerView/components/PlayerView.tsx:205-235](client/PlayerView/components/PlayerView.tsx#L205-L235)).
  This is the natural way to reveal a boss or NPC dramatically the moment
  it acts.

### 3. Popping it out

`window.open("/p/:encounterId", "Player View")`
([client/Prompts/PlayerViewPrompt.tsx:22-24](client/Prompts/PlayerViewPrompt.tsx#L22-L24))
opens a separate browser window/tab at the dedicated `/p/:id` route
([server/routes.ts:180-188](server/routes.ts#L180-L188)), suitable for
dragging to a second monitor or TV. It syncs live over socket.io while
open, and rehydrates from the last-known state via `GET /playerviews/:id`
on load/reconnect
([client/PlayerView/ReactPlayerView.tsx:30-42](client/PlayerView/ReactPlayerView.tsx#L30-L42)),
so refreshing or reopening the window doesn't lose the current scenery or
combat state.

## Practical workflow for a session

1. Set portrait URLs on monster/NPC stat blocks ahead of time (or add them
   live mid-session — the field is just a URL, so any image host works).
2. Set a background image URL when launching Player View for an
   establishing shot (tavern, dungeon corridor, etc.), or bake one into a
   saved encounter so it's automatic when that encounter loads.
3. Turn on "Splash Portraits" in Player View settings so a monster's
   portrait fills the screen the moment it's added to combat.
4. Mid-session, switch scenes with one click from the "Scenes" tab in the
   Libraries panel (Add Scene once ahead of time to save a name + image
   URL; click a saved scene during the session to set it as the Player
   View background immediately) — usable as a lightweight scene change
   (e.g. moving from "approaching the tower" to "inside the tower").

## Known gaps, if this needs to go further

Confirmed by codebase search — no dedicated "Scene" or "Map" concept
exists anywhere (only the flat `BackgroundImageUrl`/`ImageURL` strings
above). Gaps, roughly in order of how much new surface area each needs:

- **No quick scene switcher.** Changing the background today means
  reopening the Launch Player View prompt and re-typing/pasting a URL —
  there's no saved list of scene images to click between mid-session.
  Smallest incremental addition: a small list of named image URLs (stored
  per-encounter or per-account, similar to `PlayerViewCustomStyles`) with a
  one-click "set as background" action from the DM tracker.
- **No image positioning/zoom/pan control** — it's a flat CSS
  `background-image: cover`, so a portrait-oriented or oddly-cropped image
  may not frame well.
- **No multi-image/slideshow or transition** — swapping the background URL
  is an instant cut, not a fade.
- **No map/grid/token/fog-of-war system** — out of scope for "storytelling
  scenery" and a much larger undertaking; not pursued here unless
  explicitly requested separately.

## Scoped: Scene quick-switcher (next increment)

User decisions locked in for this increment:

- **Storage**: a global, per-account, reusable scene library — not tied to
  a single encounter.
- **Switching UI**: a toolbar panel, not the existing "Launch Player View"
  modal — switching scenes should be a one-click action during a session,
  not a modal you reopen and retype each time.
- **Entry detail**: name + URL + thumbnail preview in the picker.
- **Panel placement**: a new "Scenes" tab inside the existing Libraries
  panel ([client/Library/ReferencePane/LibraryReferencePanes](client/Library/ReferencePane/LibraryReferencePanes.tsx)),
  reusing its tab-switching chrome rather than a standalone panel.
- **Thumbnail strategy**: reuse the same `ImageUrl` at a small CSS size —
  no separate thumbnail field.
- **Add/edit UX**: a separate modal, matching the existing
  `SaveEncounterPrompt`-style flow, rather than an inline form in the tab.
- **Naming**: "Scenes" — tab label, button copy, and the `SceneLibrary`
  field name all follow this.
- **Library size**: soft-cap with a warning past some threshold, rather
  than unbounded or hard-blocked (exact number TBD at implementation
  time — not worth pinning down before the panel exists to test against).

### Data model

Add a new type and a field on the existing settings blob (this reuses the
account sync/persistence this project already has for
`PlayerViewSettings.CustomStyles` — no new storage system needed):

```ts
// common/PlayerViewSettings.ts
export interface SavedScene {
  Id: string; // uuid, for stable React keys / edit-in-place
  Name: string;
  ImageUrl: string;
}

export interface PlayerViewSettings {
  // ...existing fields
  SceneLibrary: SavedScene[];
}
```

`Settings.Default()` ([common/Settings.ts:89-115](common/Settings.ts#L89-L115))
gets `SceneLibrary: []` alongside the other `PlayerView` defaults.

### Switching mechanism — no sync/socket changes needed

`Encounter.GetPlayerView` already `subscribe`s and auto-pushes to
`playerViewClient.UpdateEncounter` on every change
([client/Encounter/Encounter.ts:76-81](client/Encounter/Encounter.ts#L76-L81)),
and that computed already reads `TemporaryBackgroundImageUrl()`
([client/Encounter/Encounter.ts:42](client/Encounter/Encounter.ts#L42)).
So a scene-switch click just needs to call
`this.tracker.Encounter.TemporaryBackgroundImageUrl(scene.ImageUrl)`
directly — the existing subscription broadcasts it live to the popped-out
Player View with no new plumbing. This is exactly the setter
`EncounterCommander.LaunchPlayerView` already passes into the modal today
([client/Commands/EncounterCommander.ts:38-40](client/Commands/EncounterCommander.ts#L38-L40)),
just invoked from a new panel instead of the modal's submit handler.

### UI panel

`Scenes` becomes a new entry in the existing Libraries panel's tab set
([client/Library/ReferencePane/LibraryReferencePanes.tsx](client/Library/ReferencePane/LibraryReferencePanes.tsx)),
alongside StatBlocks/PersistentCharacters/Encounters/Spells — reusing its
`Tabs` chrome, header, and close button.

**Implementation note (not re-litigating the placement decision, just
flagging a wrinkle under it, confirmed by reading the actual files):** the
existing sibling tabs are all backed by the generic `Listing<T>` library
system — `LibraryType` is literally `keyof typeof LibraryFriendlyNames`
([client/Library/Libraries.ts:26-40](client/Library/Libraries.ts#L26-L40)),
and that same union also indexes `LibraryStoreNames` (an IndexedDB store
per type) and the `Libraries` interface (one `Library<T>` per type, each
wired to account sync in `useLibraries()`,
[client/Library/Libraries.ts:59-160](client/Library/Libraries.ts#L59-L160)).
Adding `"Scenes"` to that literal `LibraryType` union would therefore also
*require* a matching `Store.Scenes` IndexedDB store and a
`Scenes: Library<SavedScene>` account-synced entry — exactly the
`Listing<T>` machinery already ruled out in favor of the simpler
`Settings.PlayerView.SceneLibrary`. **So don't add `"Scenes"` to
`LibraryType`.** Instead, `LibraryReferencePanes.tsx`'s own local
`State.selectedLibrary: LibraryType`
([client/Library/ReferencePane/LibraryReferencePanes.tsx:19-21](client/Library/ReferencePane/LibraryReferencePanes.tsx#L19-L21))
and its `libraries: Record<LibraryType, JSX.Element>` map
([LibraryReferencePanes.tsx:43-68](client/Library/ReferencePane/LibraryReferencePanes.tsx#L43-L68))
are the only places actually coupled to that union — widen just those two
locally to `LibraryType | "Scenes"` and render `SceneLibraryReferencePane`
as an extra case, sourced from `Settings`/`Encounter` rather than
`props.libraries`. This works because `Tabs` itself is already generic
over any string key
([client/Components/Tabs.tsx:3-7](client/Components/Tabs.tsx#L3-L7)) — it
has no dependency on `LibraryType` at all, so nothing there needs to
change. Net effect: `Scenes` renders as a normal-looking tab in the same
row, but is structurally separate from the four `Listing<T>`-backed
libraries in code — no folders or "Library Manager" view, by design.

### Steps

1. Add `SavedScene` type and `SceneLibrary` field to
   `common/PlayerViewSettings.ts` and `common/Settings.ts`'s default (see
   Data model above).
2. Widen `LibraryReferencePanes.tsx`'s local `State.selectedLibrary` and
   its `libraries: Record<LibraryType, JSX.Element>` map to
   `LibraryType | "Scenes"`, add a `"Scenes"` entry to the `Tabs` row's
   `optionNamesById`, and render `SceneLibraryReferencePane` for that case
   — **do not** add `"Scenes"` to the shared `LibraryType` union itself
   (see the Implementation note above for why).
3. Build `SceneLibraryReferencePane` (new component, sibling location to
   `EncounterLibraryReferencePane` etc. but *not* implementing the same
   `librariesCommander`/`library: Library<T>` props shape those take —
   it reads `CurrentSettings().PlayerView.SceneLibrary` and takes an
   `applyScene: (imageUrl: string) => void` callback instead): list of
   saved scenes as name + small thumbnail (`ImageUrl` scaled down via CSS,
   no separate thumbnail field); click calls
   `Encounter.TemporaryBackgroundImageUrl(scene.ImageUrl)` (wire this
   callback down from `TrackerViewModel`/`EncounterCommander`, mirroring
   how `LaunchPlayerView` already does,
   [client/Commands/EncounterCommander.ts:38-40](client/Commands/EncounterCommander.ts#L38-L40));
   delete inline.
4. Build `SaveScenePrompt` (new modal, mirroring `SaveEncounterPrompt`'s
   shape) for add/edit of a scene's name + URL, opened from an "Add Scene"
   button in `SceneLibraryReferencePane`. Validate the URL the same way
   `StatBlockEditor` already does for portraits — load it into an `Image`
   and reject on error
   ([client/StatBlockEditor/StatBlockEditor.tsx:354-367](client/StatBlockEditor/StatBlockEditor.tsx#L354-L367))
   — before saving.
5. Wire both to the existing settings-save path (`SaveUpdatedSettings`,
   e.g.
   [client/Commands/EncounterCommander.ts:58-61](client/Commands/EncounterCommander.ts#L58-L61))
   so add/rename/delete persist and account-sync like other `PlayerView`
   settings.
6. Soft-cap the library size in the add-scene flow (warn, don't hard
   block, past some threshold — pick the number once the panel exists and
   real thumbnails can be eyeballed for payload weight).
7. **Tests:**
   - Colocated component test for `SceneLibraryReferencePane`: renders
     saved scenes, add/select/delete interactions, soft-cap warning
     trigger — follow the pattern in
     [client/PlayerView/PlayerView.test.tsx](client/PlayerView/PlayerView.test.tsx).
   - Colocated test for `SaveScenePrompt`'s validation (empty name, bad
     image URL), following `StatBlockEditor`'s existing image-URL
     validation test if one exists, else the shape of
     [StatBlockEditor.tsx:354-367](client/StatBlockEditor/StatBlockEditor.tsx#L354-L367).
   - No new test needed for the switch mechanism itself
     (`TemporaryBackgroundImageUrl` → `GetPlayerView` → socket broadcast)
     — that path is unchanged, already exercised by
     [client/Encounter/Encounter.test.ts](client/Encounter/Encounter.test.ts)
     and [client/PlayerView/PlayerView.test.tsx](client/PlayerView/PlayerView.test.tsx);
     just confirm those still pass rather than writing new coverage for
     it.
   - Run `npx tsc --noEmit -p client/tsconfig.json` (expect 0 errors) and
     `npx jest --config client/jest.config.js` (expect the same pass/fail
     counts as the pre-change baseline — see
     [AGENTS.md](AGENTS.md)'s Testing and Verification section for the 2
     known pre-existing `InitiativeList.test.tsx` failures to not chase).
8. **Documentation:**
   - Add a note under [AGENTS.md](AGENTS.md)'s "Player View behavior and
     settings" High-Risk Area bullet
     ([AGENTS.md:58](AGENTS.md#L58)) flagging that the Scenes tab is
     `Settings`-backed, unlike its `Listing<T>`-backed sibling tabs — the
     exact gotcha this plan's Implementation note above exists to prevent,
     so a future change to `LibraryReferencePanes.tsx` doesn't
     accidentally fold Scenes into the `Listing<T>` pattern.
   - Update this plan's "Practical workflow" section (above) to include
     the Scenes tab once built, replacing step 4's "reopen the Launch
     Player View prompt" instruction with the one-click tab flow.

## Non-goals (for this plan as written)

- No map/grid/token/fog-of-war system.
- No changes to the `HasEpicInitiative` gating itself — it's already
  satisfied locally via `DEFAULT_ACCOUNT_LEVEL`, so there's nothing to
  unlock in code.
- No image positioning/zoom/pan or fade-transition work — out of scope for
  this increment, listed only as a further gap above.
- No `Listing<T>`/Library Manager parity for Scenes (folders, drag-and-drop
  organizing) — deliberately deferred per the UI panel note above.

## Status

Implemented (2026-08-22): `SavedScene`/`SceneLibrary` in
[common/PlayerViewSettings.ts](common/PlayerViewSettings.ts), the "Scenes"
tab in
[client/Library/ReferencePane/LibraryReferencePanes.tsx](client/Library/ReferencePane/LibraryReferencePanes.tsx),
[SceneLibraryReferencePane.tsx](client/Library/ReferencePane/SceneLibraryReferencePane.tsx),
[SaveScenePrompt.tsx](client/Prompts/SaveScenePrompt.tsx), and
`EncounterCommander.ApplyScene`/`LibrariesCommander.AddScene`,
`EditScene`, `DeleteScene`. Soft cap is `SCENE_LIBRARY_SOFT_CAP = 20` in
`common/PlayerViewSettings.ts`.

## Pre-commit review findings (2026-08-22) — all fixed

`/code-review` on the staged implementation (verified against the actual
diff, not just skill output) found the design's central invariant — that
`ShowScene`/`ApplyScene`/`DismissScene` in `EncounterCommander` are the
only paths allowed to touch the scene prompt card, `ActiveSceneId`, and
`CombatantsHidden`, keeping all three in sync — has several bypasses.
Build health itself is fine: client and server both typecheck clean, and
`npx jest --projects client/jest.config.js server/jest.config.js
--runInBand` passes except the 2 pre-existing `InitiativeList.test.tsx`
failures already documented above (confirmed present on `development`
before this branch's changes too, via `git stash`).

**Fixed (2026-08-22):** all 6 findings below. Re-ran `tsc --noEmit` on
both `client/tsconfig.json` and `server/tsconfig.json` (0 errors) and the
full Jest suite (same 364 passed / 2 pre-existing `InitiativeList`
failures as the pre-fix baseline) after applying the fixes.

1. **Fixed — `LaunchPlayerView` bypasses scene cleanup.**
   [client/Commands/EncounterCommander.ts:63](client/Commands/EncounterCommander.ts#L63)
   — the background-URL callback sets `TemporaryBackgroundImageUrl`/`Fit`
   directly instead of going through `ApplyScene`. If a scene is active
   (`currentScenePromptId` set), submitting any URL here overwrites the
   background but leaves the old scene's prompt card orphaned in the
   queue, `ActiveSceneId` stale, and `CombatantsHidden` stuck `true`.
   **Fix:** in that callback, do what `ApplyScene` does first — if
   `this.currentScenePromptId`, `this.tracker.PromptQueue.Remove(this.currentScenePromptId)`
   — before setting the background, so the existing PromptQueue-subscribe
   cleanup (line 37-46) resets `ActiveSceneId`/`CombatantsHidden`. Simplest
   version: have `LaunchPlayerView`'s callback just call
   `this.ApplyScene(backgroundImageUrl)` instead of setting the two
   observables itself, so there's one code path for "set an ad-hoc
   background" instead of two. Applied exactly this: the callback now
   passes `this.ApplyScene` directly to `PlayerViewPrompt`.

2. **Fixed — `LoadSavedEncounter` bypasses scene cleanup.**
   [client/Commands/EncounterCommander.ts:411](client/Commands/EncounterCommander.ts#L411)
   — same gap: sets `TemporaryBackgroundImageUrl` from the loaded
   encounter without clearing an active scene's card/`ActiveSceneId`/
   `CombatantsHidden`. **Fix:** same pattern — remove
   `currentScenePromptId` (or call `this.DismissScene()`) before setting
   `TemporaryBackgroundImageUrl` here, so loading a new encounter always
   starts from a clean scene state. Also set
   `TemporaryBackgroundImageFit` to the loaded encounter's saved fit (or
   `"cover"` if none) — currently only `BackgroundImageUrl` is applied,
   leaving a stale `Fit` from whatever was set before. Applied: removes
   `currentScenePromptId` before setting the background (same pattern as
   `ApplyScene`), then always resets `TemporaryBackgroundImageFit` to
   `"cover"` — `common/SavedEncounter.ts` has no per-encounter `Fit`
   field to restore, so `"cover"` is the correct value rather than a
   stale one.

3. **Fixed — `resetEpicInitiativeEncounterFeatures` wasn't updated for
   the new fields.**
   [server/sockets.ts:178](server/sockets.ts#L178) — this pre-existing,
   unstaged function strips `BackgroundImageUrl` for non-EpicInitiative
   sessions on every `"update encounter"` socket event, but this plan's
   new `BackgroundImageFit`/`CombatantsHidden` fields on `EncounterState`
   ([common/EncounterState.ts:13](common/EncounterState.ts#L13) and
   [:16](common/EncounterState.ts#L16)) were never added to it. A
   free-tier (non-EpicInitiative) session that reveals a Scene gets
   `CombatantsHidden` stripped of nothing — it stays `true` — while the
   background is wiped, so Player View shows neither combatants nor
   scenery: blank. **Fix:** add
   `encounterState.CombatantsHidden = false;` (and reset
   `BackgroundImageFit` to `"cover"` for consistency) inside
   `resetEpicInitiativeEncounterFeatures`. **This must ship in the same
   commit/PR as the Scene feature** — landing the client changes without
   it breaks Player View for every non-EpicInitiative self-hosted or
   free-tier user the moment they use a Scene. Applied exactly this.

4. **Fixed — `DeleteScene` doesn't dismiss an active scene first.**
   [client/Commands/LibrariesCommander.ts:515](client/Commands/LibrariesCommander.ts#L515)
   — deleting the currently-shown scene removes its library row (and the
   "Dismiss Scene" action with it) but leaves the card/`CombatantsHidden`/
   background live. **Fix:** `LibrariesCommander` needs a reference to
   `EncounterCommander` (check `TrackerViewModel` wiring — likely already
   holds both) to compare `sceneId` against
   `this.tracker.EncounterCommander.ActiveSceneId()` and call
   `this.tracker.EncounterCommander.DismissScene()` first when they match,
   before filtering `SceneLibrary`. Applied: `LibrariesCommander` already
   held `private encounterCommander: EncounterCommander` in its
   constructor, so `DeleteScene` now checks
   `this.encounterCommander.ActiveSceneId() === sceneId` and calls
   `this.encounterCommander.DismissScene()` before filtering.

5. **Fixed — `saveScene`/`EditScene` doesn't refresh a live active
   scene.**
   [client/Commands/LibrariesCommander.ts:538](client/Commands/LibrariesCommander.ts#L538)
   — editing the `ImageUrl`/`Fit` of the currently-active scene updates
   the library entry only; Player View keeps showing the pre-edit
   image/fit until the scene is re-clicked. **Fix:** in `saveScene`,
   after the library update, check
   `this.tracker.EncounterCommander.ActiveSceneId() === scene.Id` and if
   so re-invoke the equivalent of `ShowScene(scene)` (or just push the
   updated `ImageUrl`/`Fit` straight to
   `TemporaryBackgroundImageUrl`/`TemporaryBackgroundImageFit`) so the
   live Player View picks up the edit immediately. Applied: after the
   library update, `saveScene` checks
   `this.encounterCommander.ActiveSceneId() === scene.Id` and, if so,
   re-invokes `this.encounterCommander.ShowScene(scene)` — this also
   naturally swaps in a fresh `ScenePrompt` card with the updated data.

6. **Fixed — folder sort is case-sensitive; scene sort isn't (minor,
   cosmetic).**
   [client/Library/ReferencePane/SceneLibraryReferencePane.tsx:91](client/Library/ReferencePane/SceneLibraryReferencePane.tsx#L91)
   — `renderSceneFolders` sorts folder keys with plain `Object.keys(...).sort()`
   (case-sensitive/ASCII), while `byName` (used for scenes within each
   folder, [:35](client/Library/ReferencePane/SceneLibraryReferencePane.tsx#L35))
   is locale-aware and case-insensitive. **Fix:** replace
   `Object.keys(foldersByKey).sort()` with
   `Object.keys(foldersByKey).sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()))`
   (or factor a shared `byLabel` helper next to `byName`) so folder order
   matches scene order. Applied: added a `byLabel` helper next to `byName`
   and switched `Object.keys(foldersByKey).sort()` to
   `.sort(byLabel)`.

### Fix priority

Findings 1-3 are correctness bugs that produce visibly broken/stuck
Player View state during normal DM use (1-2) or a blank Player View for
non-EpicInitiative users (3) — fix before merging. 3 in particular touches
a file outside the current staged diff and must land together with it, not
as a separate follow-up, since the new fields it needs to reset don't
exist until this diff ships. Findings 4-5 are edge cases (deleting/editing
a scene while it's live) — lower risk, but cheap enough to fix alongside
1-2 since they touch the same `ActiveSceneId`/`DismissScene` machinery.
Finding 6 is cosmetic and can be deferred without risk.