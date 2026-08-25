# Backup / Import-Export Investigation

Last reviewed: 2026-08-24

**Progress: all of #1-#4 and #7 are done as of 2026-08-24.** #6 (rolling
automatic local backup) was dropped as a feature - see its entry below. #5
stays deferred (decision made, no work planned) and #8 lives in its own
doc. **Nothing in this plan has pending implementation work.**

## Trigger

After relocating a scene's map image, restoring an older backup to get the
map back turned out to be more destructive than expected, and separately it
was noticed that a player's inventory doesn't travel cleanly through
backup/restore. This document maps out every current backup surface, what
each one actually captures, and where the gaps are.

## Current backup/restore surfaces

There are three separate, only loosely related mechanisms. None of them
know about the other two.

### 1. Settings → Local Data
[client/Settings/components/LocalDataSettings.tsx](client/Settings/components/LocalDataSettings.tsx)

- **Export** ([LocalDataSettings.tsx:73-77](client/Settings/components/LocalDataSettings.tsx#L73-L77)):
  dumps *all* of `localStorage` plus every record from the four IndexedDB
  stores (`Store.SupportedLists` =
  [StatBlocks, Spells, PersistentCharacters, SavedEncounters],
  [client/Utility/Store.ts:18-23](client/Utility/Store.ts#L18-L23)) into one
  `improved-initiative.json` file, always the same filename.
- **Import → Replace**
  ([LocalDataSettings.tsx:79-90](client/Settings/components/LocalDataSettings.tsx#L79-L90)):
  wipes everything (`Store.DeleteAll()` + `localStorage.clear()`), then
  restores the four IndexedDB stores from the file and copies back every
  `localStorage` key prefixed `ImprovedInitiative.`
  ([LegacySynchronousLocalStore.ts:155-174](client/Utility/LegacySynchronousLocalStore.ts#L155-L174)).
  This is the **only** path that restores `localStorage`, and therefore the
  only path that restores `Settings` (see below).
- **Import → Add**
  ([LocalDataSettings.tsx:92-100](client/Settings/components/LocalDataSettings.tsx#L92-L100)):
  merges StatBlocks/PersistentCharacters/SavedEncounters/Spells into the
  existing IndexedDB stores. Never touches `localStorage` at all.
- **Clear all local data.**

### 2. Settings → Account Sync (Patreon "Account Sync" tier, MongoDB-backed)
[client/Settings/components/AccountSyncSettings.tsx](client/Settings/components/AccountSyncSettings.tsx)

- **"Backup and sync local data"**
  ([AccountSyncSettings.tsx:157-171](client/Settings/components/AccountSyncSettings.tsx#L157-L171)):
  does the exact same full local JSON export as #1, *and* pushes
  unsynced statblocks/spells/persistentcharacters/encounters to the
  account. `Settings` is not explicitly pushed here, but it doesn't need to
  be — every settings change already auto-saves to the account via
  `SaveUpdatedSettings` →
  [AccountClient.SaveSettings](client/Account/AccountClient.ts#L100)
  ([TrackerViewModel.tsx:494-503](client/TrackerViewModel.tsx#L494-L503)).
- **"Download all synced data to local data"**
  ([AccountSyncSettings.tsx:173-209](client/Settings/components/AccountSyncSettings.tsx#L173-L209)):
  pulls `account.statblocks/spells/persistentcharacters/encounters` back
  into local IndexedDB, and (as of the #2 fix below) `account.settings`
  too. The `Account` shape it reads from
  ([client/Account/Account.ts](client/Account/Account.ts)) has a `settings`
  field and the server's `/my/fullaccount` does return it; before the fix,
  this function's `librariesStores` list simply never included it, so
  `account.settings` was fetched and silently discarded.

### 3. Library Manager → Export
[client/Library/Manager/SelectedItemsManager.tsx](client/Library/Manager/SelectedItemsManager.tsx#L120-L138)

Per-selection export of one library tab (statblocks, spells, characters,
encounters) as JSON via `Store.ExportListings`. Export-only — there's no
matching import for this format; a file produced here has to be re-imported
through Local Data's "Import ... and Add".

## What's actually captured vs. what isn't

**Rides along automatically** (because it's just a field on an object that
*is* covered): a `PersistentCharacter`'s `Items` (inventory),  `Tags`,
`Notes`, HP/Mana/Resources/HitDice/Wounds/Gold are all plain fields on the
same record stored in the `PersistentCharacters` list
([common/PersistentCharacter.ts:6-22](common/PersistentCharacter.ts#L6-L22)),
which is in `Store.SupportedLists`. Inventory items sync from an
active-combat `Combatant` back onto its linked `PersistentCharacter` via a
subscription in
[`AttachToPersistentCharacterLibrary`](client/Combatant/Combatant.ts#L152-L219),
mirroring how gold/HP/tags already worked. So inventory *is* present in
every export produced by #1 or #2 above, and *is* restored by the
"Replace" import and by "Download all synced data." It only goes missing in
two specific paths, both of which are really the same underlying gap:

- **Local "Add" import silently drops `Settings`, resolved by #1
  (2026-08-24).** Only "Replace" touched `localStorage`, and `Settings`
  (rules toggles, keybindings, styles, and critically
  `Settings.PlayerView.SceneLibrary` — the saved-map library,
  [common/PlayerViewSettings.ts:26](common/PlayerViewSettings.ts#L26)) lived
  entirely in one `localStorage` key, `ImprovedInitiative.User.Settings`.
  Recovering a lost/relocated map used to require the destructive full
  "Replace" — there was no way to bring back just the scene library without
  also overwriting every character, statblock, and encounter with that
  backup's snapshot. The new dedicated "Backup Settings"/"Backup Scenes"
  actions from #1 close this.
- **"Download all synced data" had the identical gap on the cloud side,
  resolved by #2 (2026-08-24)** — `account.settings` was right there in the
  response and just wasn't applied; see #2 below.

Given those two gaps, the incident this investigation started from is
explained: getting the map back required "Replace," which also rolled every
`PersistentCharacter` (inventory included) back to whatever state it was in
at backup time — not because inventory isn't backed up, but because
**restoring is all-or-nothing**, and the only path that restores the scene
library is the same path that clobbers everything else. Newer inventory
changes made after that backup was taken were real losses, not a
never-backed-up field. (Both gaps are now closed — see #1 and #2 in
Recommendations below.)

### Additional gaps found along the way

- **No freshness/conflict check on "Add" import, resolved by #3
  (2026-08-24).** `importList` used to stamp
  `listing.LastUpdateMs = moment.now()` on *every* imported record before
  saving it, unconditionally, with no comparison against the existing
  record's own `LastUpdateMs`. Importing an old backup "additively" would
  still clobber newer local edits to the same character/encounter/statblock,
  and make the now-stale imported data look freshly edited — which could
  also poison later "most recent wins" comparisons (library sorting, future
  merge logic). Both `Store.importList` and
  `LegacySynchronousLocalStore.importList` now skip an import when the
  existing local record is at least as fresh; see #3 below.
- **No backup metadata or versioning.** **Partially resolved by #4
  (2026-08-24)** — the exported filename now includes a date
  (`nimble-gm-tools-YYYY-MM-DD.json`), so multiple exports are at least
  distinguishable by day. Originally: the exported file was always named
  `improved-initiative.json` — no timestamp, no indication of what's
  inside. Multiple exports pile up indistinguishably in a Downloads folder
  (browsers append `(1)`, `(2)`, ...), so there's no way to tell how stale a
  given file is before restoring it.
- **No selective/partial restore.** You can't restore "just this one
  character" or "just the scene library" from an uploaded backup — it's
  all four stores or nothing (Add), or truly everything (Replace). The
  Library Manager's per-item *export* already proves the data model
  supports scoping; import never got the same treatment.
- **In-progress combat state is outside all of this by design.** An
  actively running, not-yet-saved encounter lives only in the browser's
  in-memory Knockout state plus the ephemeral PlayerView relay
  ([server/InMemoryPlayerViewManager.ts](server/InMemoryPlayerViewManager.ts) /
  [server/RedisPlayerViewManager.ts](server/RedisPlayerViewManager.ts)).
  Only an explicit "Save Encounter" persists it into `SavedEncounters`,
  which *is* covered by backup. Worth knowing, not necessarily worth
  "fixing."
- **Minor/dead code, resolved by #7 (2026-08-24):** `LegacySynchronousLocalStore.PlayerCharacters`
  was a defined list name that was not in `Store.SupportedLists` and never
  referenced by any import/export path — an orphaned legacy list, not a
  live gap, but a cleanup candidate. Removed, along with its one read site
  in `Metrics.ts`; see #7 below.
- **Mongo-backed account data has no application-level backup, only a raw
  file copy**, and the local-instance-only "Shut Down Server" / "Rebuild
  Client" buttons' safety guard doesn't cover a hosted multi-tenant
  deployment. Both only matter for a hypothetical future hosted service, not
  the current single local DM self-host setup - split out into
  `HOSTED_DEPLOYMENT.md` (private notes, not in this repo) rather than
  covered as a recommendation here.

## Recommendations (roughly priority order)

1. **Status: done (2026-08-24).** **Add two independent, dedicated
   backup/restore actions for `Settings` and for the scene library**,
   instead of folding either into the existing "Add" import. `Settings`
   (rules toggles, keybindings, styles) and `Settings.PlayerView.SceneLibrary`
   ([common/PlayerViewSettings.ts:26](common/PlayerViewSettings.ts#L26)) are
   both just fields on the one `Settings` object at
   `localStorage["ImprovedInitiative.User.Settings"]` - nothing about the
   storage shape stopped giving each its own export/import:
   - **Backup Settings** (two new buttons in
     [LocalDataSettings.tsx:47-61](client/Settings/components/LocalDataSettings.tsx#L47-L61),
     handlers at
     [LocalDataSettings.tsx:106-145](client/Settings/components/LocalDataSettings.tsx#L106-L145)):
     exports the whole `Settings` blob to `nimble-gm-tools-settings-<date>.json`;
     import is a full overwrite of `Settings` (there's no field-level merge
     concept, so "replace" is the only sensible import here), applied live
     via `CurrentSettings` with no page reload needed. This intentionally
     also reverts `SceneLibrary` as a side effect of reverting everything
     else - that's fine for a "revert my whole settings" action, and is
     exactly what the separate Scenes action below is for avoiding. Import
     asks for confirmation first, then runs the parsed file through
     `UpdateSettings()` (schema migration), saves it via
     `LegacySynchronousLocalStore.Save`, sets `CurrentSettings(...)` live,
     and pushes it to the account via `new AccountClient().SaveSettings(...)`
     - mirroring `TrackerViewModel.SaveUpdatedSettings`'s existing three-step
     pattern so a Settings restore auto-syncs to the account exactly like any
     other settings change.
   - **Backup Scenes** (new buttons next to "Add Scene" in
     [SceneLibraryReferencePane.tsx:166-179](client/Library/ReferencePane/SceneLibraryReferencePane.tsx#L166-L179),
     wired through
     [LibraryReferencePanes.tsx](client/Library/ReferencePane/LibraryReferencePanes.tsx)
     to new commander methods
     [`LibrariesCommander.ExportScenes`](client/Commands/LibrariesCommander.ts#L526-L535)
     and
     [`LibrariesCommander.ImportScenes`](client/Commands/LibrariesCommander.ts#L537-L561),
     following the same pattern as the existing `AddScene`/`EditScene`/`DeleteScene`
     methods there): exports just `Settings.PlayerView.SceneLibrary` to
     `nimble-gm-tools-scenes-<date>.json`; import **merges by `Id`** (upsert
     into the existing array, in place for a matching `Id` and appended
     otherwise) rather than replacing it outright, matching the
     non-destructive "Add" semantics used elsewhere and directly avoiding the
     original incident (an old backup silently discarding newer scenes).
     `SavedScene` has no `LastUpdateMs` field, so unlike #3's freshness
     check, this is a plain upsert with no timestamp comparison.

   Neither of these touches StatBlocks/PersistentCharacters/SavedEncounters/
   Spells, so a saved map (or a keybinding/style revert) can come back
   without rolling back characters or encounters.

   **Tests: done** - scene upsert logic (existing scene overwritten in place,
   new scene appended, other scenes/order untouched, invalid JSON leaves
   settings untouched) unit-tested directly in
   [LibrariesCommander.scenes.test.ts](client/Commands/LibrariesCommander.scenes.test.ts).
   Component-level button wiring covered in
   [SceneLibraryReferencePane.test.tsx](client/Library/ReferencePane/SceneLibraryReferencePane.test.tsx)
   ("Backup Scenes" click and file-upload cases) and
   [LocalDataSettings.test.tsx](client/Settings/components/LocalDataSettings.test.tsx)
   (`exportSettings`/`importSettings` describe blocks, covering the
   apply-live-when-confirmed and untouched-when-declined cases).
   **Docs:** none needed - no README or in-app help text documents the Local
   Data buttons individually, and the new buttons carry their own inline
   labels/tooltips instead.
2. **Make `downloadAndSaveAllSyncedItems` apply `account.settings`.**
   **Status: done (2026-08-24)** — fixed in
   [AccountSyncSettings.tsx](client/Settings/components/AccountSyncSettings.tsx),
   exactly as described below. Unlike
   #1, this isn't a design choice - it's a one-line bug fix, because the
   push side already works: every local settings change auto-saves to the
   account via `SaveUpdatedSettings` →
   [AccountClient.SaveSettings](client/Account/AccountClient.ts#L100)
   ([TrackerViewModel.tsx:494-503](client/TrackerViewModel.tsx#L494-L503)),
   so the account is already a live, continuous settings backup. The only
   gap is on pull:
   [`downloadAndSaveAllSyncedItems`](client/Settings/components/AccountSyncSettings.tsx#L173-L209)
   fetches `account.settings` via `GetFullAccount()`
   ([Account.ts:5](client/Account/Account.ts#L5)) but its `librariesStores`
   array only lists statblocks/spells/persistentcharacters/encounters -
   `account.settings` was fetched and never used. Fix (applied, now at
   [AccountSyncSettings.tsx:200-206](client/Settings/components/AccountSyncSettings.tsx#L200-L206)):
   added, before the existing `location.reload()`:
   ```ts
   if (account.settings) {
     LegacySynchronousLocalStore.Save(
       LegacySynchronousLocalStore.User,
       "Settings",
       account.settings
     );
   }
   ```
   The subsequent reload already re-runs `InitializeSettings()`
   ([Settings.ts:93-111](client/Settings/Settings.ts#L93-L111)), which reads
   that localStorage key back and runs it through the `UpdateSettings`
   schema-migration function automatically, so no manual migration or
   `CurrentSettings()` call is needed here.

   Unlike #1, there's no local "Add" vs "Replace" split to mirror on the
   cloud side - "Download all synced data" has only ever been one button,
   and it already behaves as a per-item upsert rather than a wipe. Closing
   this gap doesn't require the two-dedicated-actions treatment #1 got; it's
   a fix inside the existing button. **Open question, not yet decided:**
   whether to also add matching dedicated "Backup/Restore Scenes to
   Account" cloud actions for full symmetry with #1's local design, or leave
   scenes as cloud-sync's blind spot for now since they're a recent
   addition with no existing account-side plumbing.

   **Tests: done** - see
   [AccountSyncSettings.test.tsx](client/Settings/components/AccountSyncSettings.test.tsx)
   (`downloadAndSaveAllSyncedItems` describe block): covers `account.settings`
   present (gets written to `LegacySynchronousLocalStore` and read back
   correctly) and absent (local settings left untouched).
   **Docs:** n/a - internal bug fix with no user-facing behavior description
   to update; the button's existing label ("Download all synced data to
   local data") already covers what it now correctly does.
3. **Status: done (2026-08-24).** **Add a freshness check to `importList`,
   in both places it exists:**
   [`Store.importList`](client/Utility/Store.ts#L117-L146) (the four
   IndexedDB stores: StatBlocks/PersistentCharacters/SavedEncounters/Spells)
   and
   [`LegacySynchronousLocalStore.importList`](client/Utility/LegacySynchronousLocalStore.ts#L125-L153)
   (older localStorage-format entries, same four lists). Both used to stamp
   `listing.LastUpdateMs = moment.now()` and save unconditionally, with no
   read of whatever was already stored at that key - so a stale backup's
   "Add" import could silently overwrite a locally-edited record *and*
   re-stamp it as "just updated," which also poisoned the "newer wins"
   dedup logic in
   [FilterCache.ts:39-40](client/Library/FilterCache.ts#L39-L40) elsewhere
   in the app.

   Fix, applied in both places: before saving each imported record, load
   whatever's already stored at that key (both now exported so they're
   directly testable, previously private).
   `Listable.LastUpdateMs` is optional
   ([Listable.ts:6](common/Listable.ts#L6)), so a missing value is treated
   as `0` for the comparison via `?? 0`. Then:
   - No existing record at that key -> save.
   - Existing record's `LastUpdateMs` >= imported record's -> **skip**
     silently, leave the local copy and its timestamp untouched. No prompt,
     no per-item or batch review - a bulk multi-record import isn't a good
     place for interactive conflict resolution, so newer-local-wins with no
     interruption is the whole behavior.
   - Existing record's `LastUpdateMs` < imported record's -> save (imported
     one really is newer).

   **Tests: done** - [Store.test.ts](client/Utility/Store.test.ts) gained a
   `describe("Store.importList")` block and a
   `describe("LegacySynchronousLocalStore.importList")` block (20 new cases
   total across both), covering all three branches plus missing
   `LastUpdateMs` on either side (existing only, imported only, and both).
   **Docs:** n/a - import conflict handling isn't documented for users
   anywhere today; the behavior described in the "Additional gaps found"
   section above is this document's only existing writeup of it.
4. **Status: done (2026-08-24).** **Timestamp the exported filename**, as `nimble-gm-tools-YYYY-MM-DD.json`
   (e.g. `nimble-gm-tools-2026-08-24.json`), matching the naming pattern
   already proposed for the new Settings/Scenes exports in #1
   (`nimble-gm-tools-settings-<date>.json`,
   `nimble-gm-tools-scenes-<date>.json`) instead of the current fixed
   `improved-initiative.json`, so multiple backups are distinguishable at a
   glance. Two call sites, both currently
   `saveAs(blob, "improved-initiative.json")` with no date:
   [LocalDataSettings.tsx:76](client/Settings/components/LocalDataSettings.tsx#L76)
   (full local export) and
   [AccountSyncSettings.tsx:161](client/Settings/components/AccountSyncSettings.tsx#L161)
   ("Backup and sync local data"). Use `moment().format("YYYY-MM-DD")` for
   the date, consistent with the `moment` usage already present elsewhere in
   this code.

   **Tests: done** - see the `syncAll`/`exportData` cases in
   [AccountSyncSettings.test.tsx](client/Settings/components/AccountSyncSettings.test.tsx)
   and [LocalDataSettings.test.tsx](client/Settings/components/LocalDataSettings.test.tsx),
   which mock `browser-filesaver`'s `saveAs` and assert the date-stamped
   filename.
   **Docs:** n/a - the filename itself isn't documented anywhere users would
   see it (it only ever appears in the browser's own download prompt/folder).
5. **Deferred: selective/partial restore.** Letting a user pick individual
   characters/encounters/scenes out of an uploaded backup file, instead of
   all-or-nothing per store, would need real UI (a file preview/picker) for
   comparatively little payoff now that #1 already splits out the two cases
   that actually caused pain (settings and scenes), and #3's freshness check
   removes the main risk of a bulk "Add" import (silently clobbering newer
   local edits). **Decision: stay all-or-nothing per store for now** -
   revisit only if a concrete need for picking individual
   characters/encounters shows up.

   **Tests / Docs:** n/a while deferred - not being built, so nothing to
   cover yet. Revisit alongside implementation if this gets picked back up.
6. **Dropped (2026-08-24).** ~~Rolling automatic local backup~~ - decided
   against as a feature. Left as a documented non-goal rather than deleted
   outright, in case the tradeoff gets revisited later: it would have reused
   the existing export blob
   ([LocalDataSettings.tsx:73-77](client/Settings/components/LocalDataSettings.tsx#L73-L77))
   behind a new rotating snapshot store and a session-start trigger, but the
   open retention/staleness/UI-placement decisions it needed were never
   resolved, and manual export (now timestamped, per #4) plus #1's scoped
   Settings/Scenes backups were judged sufficient for now.
7. **Status: done (2026-08-24).** **Remove** (not migrate) the orphaned
   `LegacySynchronousLocalStore.PlayerCharacters` list. It was a leftover
   bucket from before `PersistentCharacter` existed as a concept. It wasn't
   fully unreferenced - `Metrics.ts` read its length on every app load for
   an analytics count (`pc_statblocks`) - but nothing wrote to it anywhere
   in the current codebase, and it was absent from `Store.SupportedLists`
   and `MigrateItemsToStore()`. Checked directly in a real browser console
   against this app's own data (2026-08-24): `Object.keys(localStorage).filter(k =>
   k.startsWith("ImprovedInitiative.PlayerCharacters"))` returned only the
   list's own empty tracking key (no `.itemId` entries), and
   `localStorage.getItem('ImprovedInitiative.PlayerCharacters')` was `"[]"` -
   confirming no real character data was stranded there, just the empty-list
   marker `LegacySynchronousLocalStore.List()` auto-creates the first time
   anything reads a list that doesn't exist yet. Deleted the `PlayerCharacters`
   constant and the `pc_statblocks` field/`Metrics.ts` reference to it with no
   migration step needed.

   **Tests:** n/a - pure dead-code removal (an always-empty list and its one
   read site). No test exercised `PlayerCharacters` before the removal, and
   the existing [Store.test.ts](client/Utility/Store.test.ts) coverage of
   `LegacySynchronousLocalStore`/`Store` is untouched by it.
   **Docs:** n/a - never user-facing or documented.
8. **Moved to `HOSTED_DEPLOYMENT.md` (private notes, not in this repo).**
   Started here
   as "Mongo needs a backup story too," but grew into deployment/security
   considerations for a hypothetical future hosted, multi-tenant version of
   this app - a different kind of concern than the client-side backup/restore
   UX fixes in #1-#7 above. Split out into its own plan since it's
   speculative and forward-looking rather than a near-term fix; not
   applicable to the current single local DM self-host setup.
