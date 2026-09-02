# StatBlocks: allow the same Name at different Challenge ratings

Last reviewed: 2026-09-01

Status: implemented in full — Fixes 1-4 (StatBlock library save/display),
the encounter-tracker scope (Fix 5), a related `SaveEditedListing` bug
(Fix 6), and a server-side preloaded-content Id collision (Fix 7) below.

## Context

Today, saving a monster with the same `Name` (and same `Path`/folder) as an
existing one silently deletes and replaces the existing one, regardless of
whether the two monsters are actually the same creature. There is no
Challenge-rating awareness anywhere in this check. Requested behavior: a
`Name`+`Path` collision should only overwrite when the `Challenge` also
matches; if the `Challenge` differs, both should be saved as separate
listings (e.g. a "Goblin" at Challenge 1 and a "Goblin" at Challenge 2
coexisting in the same folder).

### Root cause

The collision check lives in the generic `useLibrary<T>()` hook
(`client/Library/useLibrary.ts`), shared by all four library types
(StatBlocks, Spells, Encounters, PersistentCharacters —
`client/Library/Libraries.ts:106-142`). `SaveNewListing`
(`client/Library/useLibrary.ts:120-149`) matches purely on `Path + Name`:

```ts
const SaveNewListing = React.useCallback(
  async (newListable: T) => {
    const listingsToOverwrite = listings.filter(
      l =>
        (l.Origin === "localAsync" || l.Origin === "localStorage") &&
        l.Meta().Path == newListable.Path &&
        l.Meta().Name == newListable.Name
    );
    ...
    for (const listingToOverwrite of listingsToOverwrite) {
      await DeleteListing(listingToOverwrite.Meta().Id);
    }
    return await saveListing(listing, newListable);
  },
  [listings]
);
```

Any existing local listing sharing `Path`+`Name` is deleted before the new
one is saved — no `Id` or `Challenge` awareness at all. `SaveEditedListing`
(`useLibrary.ts:151-175`) has a similar-looking `Path+Name` branch, but it
compares against the *listing being edited's own* pre-edit identity (to
clean up a stale `Origin === "account"` copy), not against the incoming
`newListable` — it's unrelated to this bug and does not need to change.

The underlying storage (`client/Utility/Store.ts`, IndexedDB via
`localforage`, store name `"Creatures"`) is keyed by `Id`, which is already
unique per listing — the collision is entirely in this in-memory
pre-save-delete logic, not in storage.

### Where `SaveNewListing` is actually invoked (all three matter here)

Traced via `client/Commands/LibrariesCommander.ts:149-198`:

1. **"New Monster" primary Save** — `CreateAndEditStatBlock` (line 149) wires
   `onSave: library.SaveNewListing` directly. This is the exact repro path:
   create "Goblin" (Challenge 1), save; create another "Goblin" (Challenge
   2), hit the plain Save button — the first is silently deleted.
2. **"Save as a copy"** on a local listing — `EditStatBlock`'s local-origin
   branch (line 193) wires `onSaveAsCopy: library.SaveNewListing`.
3. **Editing a built-in/server-origin listing** (e.g. a `Monster Builder`
   template or a `basic_rules_creatures` entry) — `EditStatBlock`'s
   `Origin === "server"` branch (line 182) *also* routes the primary Save
   through `library.SaveNewListing`, because editing a server-provided
   listing forks it into a new local copy.

### The `Challenge` field already flows into `FilterDimensions.Level`

No new field is needed. `common/Listable.ts:10-18` defines:

```ts
export interface FilterDimensions {
  // StatBlocks: Challenge Rating.
  Level?: string;
  ...
}
```

and `common/StatBlock.ts:107-110` (`StatBlock.FilterDimensions`) already
sets `Level: statBlock.Challenge`. Every listing's `Meta().FilterDimensions`
is already computed and stored at save time
(`callbacks.getFilterDimensions(newListable)`, `useLibrary.ts:135`), for
every library type — Encounters' `getFilterDimensions` returns `{}`
(`Libraries.ts:131`), and Spells/PersistentCharacters never populate `Level`
either, so comparing `Level` is a no-op (`undefined == undefined`) for
those three types and only changes behavior for StatBlocks.

### Scenarios (for clarity)

| Existing listing | Save this | `Name` same? | `Challenge` same? | Result |
| --- | --- | --- | --- | --- |
| Existing listing | Save this | `Name` same? | `Challenge` same? | Result |
| --- | --- | --- | --- | --- |
| Goblin (Challenge 1) | Goblin (Challenge 1) | yes | yes | Overwrite (unchanged) |
| Goblin (Challenge 2) | Goblin (Challenge 2), edited via plain Save | yes | yes | Overwrite (unchanged) — goes through `SaveEditedListing`, matched by `Id`; this plan doesn't touch that path at all |
| Goblin (Challenge 2) | Goblin (Challenge 2), "Save as a copy" with nothing changed | yes | yes | Overwrite (unchanged) — goes through `SaveNewListing`; `Name` and `Level` both match so the fix still treats it as the same monster |
| Goblin (Challenge 1) | Goblin (Challenge 2), same `Name` | yes | no | **New fix: save as separate listing** instead of overwriting |
| Goblin (Challenge 1) | "Goblin 2" (renamed), any Challenge | no | n/a | Already unaffected today — different `Name` never collided in the first place, so this stays exactly as-is; no change from this plan |

Two of the five rows above ("same `Name`, same `Challenge`") are the true-
duplicate case, and both keep overwriting exactly as today, regardless of
which Save path is used — only the fourth row (same `Name`, *different*
`Challenge`) actually changes behavior. Renaming to a different `Name`
(last row, e.g. "Goblin lv 2" saved as "Goblin 2") was never part of this
bug either — the `Name` half of the `Path+Name` match already prevents any
collision today, with or without this plan.

## Design

### Fix 1 (core) — `client/Library/useLibrary.ts`, `SaveNewListing`

Extend the collision filter to also require `FilterDimensions.Level` to
match:

```ts
const listingsToOverwrite = listings.filter(
  l =>
    (l.Origin === "localAsync" || l.Origin === "localStorage") &&
    l.Meta().Path == newListable.Path &&
    l.Meta().Name == newListable.Name &&
    l.Meta().FilterDimensions?.Level ==
      callbacks.getFilterDimensions(newListable).Level
);
```

Effect:
- Same `Path` + `Name` + `Challenge` → still overwrites, exactly like today.
- Same `Path` + `Name`, different `Challenge` → no longer matched, so both
  listings are kept as separate entries with distinct `Id`s (a new `Id` is
  minted by the existing `newListable.Id || probablyUniqueString()` line
  for the "New Monster" and "Save as copy" paths, since both already clear
  `Id` before calling — confirmed at `StatBlockEditor.tsx:435,438`).
- Spells, Encounters, PersistentCharacters: unaffected — their `Level` is
  always `undefined` on both sides of the comparison.

`SaveEditedListing` is intentionally left unchanged (see Context above —
its `Path+Name` branch serves a different purpose and isn't part of this
bug).

### Fix 2 — keep `StatBlockEditor`'s own "will overwrite" validation consistent

`client/StatBlockEditor/StatBlockEditor.tsx:461-517`:

```ts
private willOverwriteStatBlock = _.memoize(
  (path: string, name: string) =>
    this.props.currentListings?.some(
      l => l.Meta().Path == path && l.Meta().Name == name
    ),
  (path: string, name: string) => JSON.stringify({ path, name })
);

private validate = async values => {
  ...
  if (!values.SaveAs) {
    return errors;
  }
  ...
  if (path === originalPath && name === originalName) {
    errors.PathAndName = "Error: Save as a copy requires a different name.";
  } else if (this.willOverwriteStatBlock(path, name)) {
    errors.PathAndName =
      "Error: This copy will overwrite an existing statblock. Please change the name or folder.";
  }
  return errors;
};
```

This only runs for "Save as a copy" (`values.SaveAs`), and only compares
`Path`+`Name`. Once Fix 1 lands, this check would go stale: it would still
block "Save as a copy" with a same `Name`+`Path` but different `Challenge`,
even though `SaveNewListing` would now actually allow it — the UI would
contradict the save layer. Update `willOverwriteStatBlock` to also take the
submitted `Challenge` and compare against
`l.Meta().FilterDimensions.Level`:

```ts
private willOverwriteStatBlock = _.memoize(
  (path: string, name: string, challenge: string) =>
    this.props.currentListings?.some(
      l =>
        l.Meta().Path == path &&
        l.Meta().Name == name &&
        l.Meta().FilterDimensions?.Level == challenge
    ),
  (path: string, name: string, challenge: string) =>
    JSON.stringify({ path, name, challenge })
);
```

and pass `values.Challenge` through at the call site. `SpellEditor.tsx`'s
parallel `PathAndName` check (`client/StatBlockEditor/SpellEditor.tsx:39-63`)
is untouched — Spells have no Challenge concept.

### Fix 3 (recommended) — make same-name monsters distinguishable in the listing tree

Without this, after Fix 1 the library tree would show two rows both
labeled plain "Goblin" in the same folder with nothing to tell them apart
short of opening each to edit it — this is the actual "Goblin LV 1" /
"Goblin LV 2" outcome the request describes, so it needs an explicit
display change, not just a save-layer change.

**Resolved design** (per follow-up discussion):

1. **Only show the suffix when it's actually disambiguating** a same-`Name`
   collision — not on every StatBlock row. There's already an exact
   precedent for detecting this: `client/Library/ReferencePane/LibraryReferencePane.tsx:91-107`
   computes a `showSource` boolean today by checking whether an *adjacent*
   listing in the array shares the same `Name`:

   ```ts
   const listingAndFolderComponents = BuildListingTree(
     (listing, index, array) => {
       // If an adjacent listing has the same name, show the source
       let showSource = false;
       if (
         array[index - 1]?.Meta().Name === listing.Meta().Name ||
         array[index + 1]?.Meta().Name === listing.Meta().Name
       ) {
         showSource = true;
       }
       return this.props.renderListingRow(
         listing,
         this.previewItem,
         this.onPreviewOut,
         showSource
       );
     },
     ...
   );
   ```

   Extend this same computation to also produce a `showChallenge` boolean
   (same adjacent-name check, just a second flag alongside `showSource`),
   and thread it through `renderListingRow` the same way `showSource`
   already is. This means: two different-Challenge "Goblin" listings get
   the suffix; a lone "Goblin" elsewhere in the library does not.

2. **Wording**: `LV {value}` when `Challenge` looks numeric or a fraction
   (matches `/^\d+(\/\d+)?$/`, e.g. `"1"`, `"1/2"`) → `"Goblin LV 1"`,
   `"Goblin LV 2"`. For word-based Challenge values (e.g. `"Minion"`,
   `"Solo"`) show the raw value with no `LV` prefix → `"Goblin Minion"`,
   since `"LV Minion"` reads oddly.

3. **Redundancy guard**: skip appending the suffix at all if `Name`
   already ends with the `Challenge` value as a word (case-insensitive) —
   e.g. a listing actually named `"Goblin Minion"` with `Challenge:
   "Minion"` (this is a real, existing entry in `basic_rules_creatures.json`)
   must render as plain `"Goblin Minion"`, not `"Goblin Minion Minion"`.
   This check is per-row and independent of the sibling-collision check
   in point 1 — apply it even when `showChallenge` is true.

4. **Styling**: the appended suffix (`LV 2`, `Minion`, etc.) is rendered in
   a lighter/gray tone via the existing `--text-faded` CSS custom property
   (`lesscss/base/colors.less:40`, already theme-aware — redefined per
   theme alongside `--grey`/`--light-grey`), not a new color. This token is
   already used elsewhere in this exact stylesheet family
   (`lesscss/components/libraries.less:12,38,148,190`), so it's the
   established "secondary/de-emphasized text" convention in this codebase,
   not a new pattern.

**Implementation note**: `ListingButton`'s `text` prop
(`client/Library/Components/ListingButton.tsx:5,17,31`) is currently typed
`string` and rendered as `{text} {props.children}` — plain string
concatenation can't carry a partial color. Widening `text` to
`React.ReactNode` (it's already rendered inside JSX, so a `ReactNode` works
as-is) lets `ListingRow` pass something like
`<>{listingName} <span className="c-listing__challenge">{suffix}</span></>`
instead of a single string, with `.c-listing__challenge { color:
var(--text-faded); }` added in `lesscss/components/listing.less`.

Note: React `key`s for these rows already include `Id`
(`StatBlockLibraryReferencePane.tsx:117-122`), so two same-named listings
won't collide as list keys even before this fix — Fix 3 is purely about
human-readable disambiguation, not correctness.

**Amendment** (found during manual verification): editing a preloaded
monster (e.g. "Goblin" from `basic_rules_creatures.json`) and saving it at
a different Challenge forks a local copy that keeps the same `Source`
("Systems Reference Document") as the original. The initial implementation
set `showSource` and `showChallenge` off the same single "an adjacent
listing shares this Name" boolean, so both suffixes fired together —
producing `"Goblin (Systems Reference Document) LV 2"` even though `Source`
was identical between the two and told the reader nothing; only `Level`
actually disambiguated them. Fixed in `LibraryReferencePane.tsx:92-110` so
each suffix is shown only when *that specific dimension* differs from the
colliding adjacent listing (`Source` for `showSource`, `Level` for
`showChallenge`), independently — not just whether the Name collides.

### Fix 4 — `FilterCache` was independently deduping same-name listings

Found during manual verification, not in the original investigation: even
after Fix 1, saving "Goblin" (Challenge 1) then "Goblin" (Challenge 2)
correctly created two separate listings in storage/state, but the library's
left pane still showed only one "Goblin" row. Root cause is a second,
unrelated dedup step in `client/Library/FilterCache.ts`'s
`DedupeByRankAndFilterListings` (used by `LibraryReferencePane` to build
the rendered/filtered list) — its `dedupeKey` was built from
`Path-Name-Source` only:

```ts
const dedupeKey =
  `${listingMeta.Path}-${listingMeta.Name} -${sourceSortable}`.toLocaleLowerCase();
```

This function's actual purpose is reconciling the *same* item appearing
under multiple `Origin`s at once (e.g. a `"localAsync"` copy and an
`"account"` copy of the identical StatBlock mid-sync), keeping only the
newest/best-ranked representation — not a same-name guard. But because it
never considered `Challenge`, it collapsed two genuinely different Goblins
down to one for display, independent of the Fix 1 save-layer change.

Fixed the same way as Fix 1 — include `FilterDimensions.Level` in the key:

```ts
const dedupeKey =
  `${listingMeta.Path}-${listingMeta.Name} -${sourceSortable}-${listingMeta.FilterDimensions.Level}`.toLocaleLowerCase();
```

Same generic-safe reasoning as Fix 1: a no-op for Spells/Encounters/
Characters (`Level` always `undefined` there), and true multi-origin
duplicates of the same StatBlock still share the same `Challenge`, so
they keep deduping correctly.

Regression coverage added in `client/Library/FilterCache.test.ts`: two
same-`Name` listings at different `Challenge` both survive
`GetFilteredEntries`; two at the *same* `Challenge` still dedupe to one.

**Amendment (sort order)**: the raw `Level` string was also used verbatim
in the `dedupeKey`, so same-name listings ended up ordered by plain
alphabetical string comparison of their Challenge — e.g. `"1/2"` sorts
before `"minion"` (digit `<` letter), putting "Goblin LV 1/2" above
"Goblin Minion" even though Minion is the weaker creature. There's already
a canonical utility for exactly this ranking:
`client/Utility/GetAlphaSortableLevelString.ts`, already used by
`StatBlockLibraryReferencePane.tsx:87-95` to order the "Challenge" grouping
view (Minion → `"0000"`, ascending numeric/fraction levels → `"1" + padded
value`, any other label → `"9999" + label`). Reused it for the dedupe-key's
Level component instead of the raw string:

```ts
const levelSortable = GetAlphaSortableLevelString(
  listingMeta.FilterDimensions.Level
);
const dedupeKey =
  `${listingMeta.Path}-${listingMeta.Name} -${sourceSortable}-${levelSortable}`.toLocaleLowerCase();
```

Since `Path`/`Name` still dominate the key, this only changes the tie-break
order among same-Path+Name+Source listings — the overall alphabetical-by-
name order of the whole list is unaffected. Regression test added: "Goblin"
at `"1/2"` and at `"Minion"` now come back Minion-first.

## Fix 5: distinguishing same-name combatants in the encounter tracker

Everything above is about the StatBlock *library* (the left-pane browsing
list). Raised as a follow-up: once two differently-`Challenge`d "Goblin"
listings both exist, adding both to an actual encounter (the center-column
combat tracker, a separate Knockout-based view from the React library
pane) hits the same "can't tell them apart" problem one level further in —
except here the ambiguity is the GM's, not just a display nuisance, since
target selection during combat depends on it, and the fix can't leak the
Challenge to players.

### What's already there

- `Combatant.DisplayName()` (`client/Combatant/Combatant.ts:560-578`)
  already numbers same-name combatants — "Goblin 1", "Goblin 2" — via
  `IndexLabel`/`CombatantCountsByName`, purely off name collisions,
  with no `Challenge` awareness (mirrors the exact gap Fix 1-4 closed in
  the library). Confirmed by the existing test file
  `client/Combatant/IndexLabeling.test.ts:20-27`. This numbering is also
  sent to players (via `GetIndexLabel`, see below) — a GM-only Challenge
  hint must be layered on top of this, not replace it.
- `ToPlayerViewCombatantState.ts:7-51` already builds a separate,
  stripped-down state sent to the player view — `Name` is only ever
  `combatant.DisplayName()` (alias, or `"Name N"`), so `Challenge` is not
  currently leaked to players through this path, and any new GM-only
  annotation must stay outside this function's output (or be filtered the
  same way tags are, next point).
- `Tag`/`TagState` (`client/Combatant/Tag.ts`) already has a first-class
  `HiddenFromPlayerView` flag: GM-only tags are already filtered out by
  `ToPlayerViewCombatantState.ts:31-41`
  (`.filter(t => t.NotExpired() && !t.HiddenFromPlayerView)`), already
  persist with the combatant via `CombatantState`/`TagState`, and already
  render in the GM's own combatant card. This looks like the natural
  primitive to reuse rather than inventing a new field: auto-attach a
  `Tag` like `Text: "LV 1/2"` (or `"Minion"`), `HiddenFromPlayerView: true`
  when a combatant's StatBlock `Name` collides with another combatant in
  the same encounter at a *different* `Challenge` — the same "only when
  disambiguating" trigger condition as Fix 3's `showChallenge`.
- Note: no code currently gives the GM a distinct visual treatment for a
  hidden vs. visible tag in their own view (grep for
  `HiddenFromPlayerView` only turns up `Tag.ts` and
  `ToPlayerViewCombatantState.ts`) — worth deciding whether that matters
  here before relying purely on the Tags UI.

### Resolved design and implementation

Design questions resolved by taking the option already recommended above
in each case (reuse over new surface area):

- **Reuse `Tag`/`HiddenFromPlayerView`** (not a dedicated field) — there
  was already a precedent for exactly this shape of auto-generated hidden
  tag: `Encounter.AddCombatantFromStatBlock` already pushes a
  `new Tag(`HP ×${legendaryHeroCount}`, combatant, true)` for the legendary
  hero-count multiplier (`client/Encounter/Encounter.ts:273-277`), so an
  auto-generated Challenge tag follows an established pattern rather than
  introducing one.
- **Trigger condition**: same-encounter, same-`Name`, different-`Challenge`
  collision only, mirroring Fix 3's `showChallenge`.
- **Wording**: reused the exact same formatting as Fix 3, factored out of
  `ListingRow.tsx` into a shared `client/Utility/GetChallengeSuffix.ts`
  (`LV {n}` for numeric/fraction Challenge, raw value otherwise, `null`
  when the Name already contains the Challenge word) so the library and
  the tracker can never drift out of sync on wording.

**New file `client/Combatant/TagChallengeCollisions.ts`**: given a
just-added `combatant` and the full combatant list, finds any other
combatant sharing its StatBlock `Name` at a *different* `Challenge`, and
pushes a hidden `Tag` (via `GetChallengeSuffix`) onto every combatant in
that collision — the new one and the pre-existing one(s) — skipping any
that's already carrying that exact hidden tag (so re-triggering on a third
same-name addition doesn't duplicate tags on the first two).

**Wired into `client/Encounter/Encounter.ts`'s `AddCombatantFromState`**
(the single funnel every "add combatant" path goes through — from the
library, from a persistent character, from duplicating an existing
combatant, from loading a saved encounter), immediately after the existing
`combatant.UpdateIndexLabel()` call:

```ts
const combatant = new Combatant(combatantState, this);
this.combatants.push(combatant);

combatant.UpdateIndexLabel();
TagChallengeCollisions(combatant, this.combatants());
```

Not extended to the `StatBlock` swap case (`Combatant.processStatBlock` /
`UpdateIndexLabel(oldName)`) — kept to the add-time trigger only, matching
the reported scenario (two different-Challenge Goblins both added to an
encounter) without expanding scope to statblock-swap-in-place.

Regression coverage in `client/Combatant/TagChallengeCollisions.test.ts`:
a lone monster gets no tag; same-name-same-Challenge gets no tag;
same-name-different-Challenge tags both; a third same-name addition at yet
another Challenge tags everyone without duplicating the first two's tags;
a monster whose `Name` already contains its Challenge word (e.g. "Goblin
Minion") gets no redundant tag.

**Amendment (per-tag visibility)**: originally every auto-generated
Challenge tag was unconditionally `HiddenFromPlayerView: true`. Revised so
only a numeric/fraction Challenge tag (`"LV 2"`) stays GM-only - that's
meta-game math - while a word-based one (`"Minion"`) is now revealed to
players, since a label like that is usually already apparent at the table
rather than something being hidden from them. Implemented by exporting a
small `IsNumericChallenge(challenge: string): boolean` alongside
`GetChallengeSuffix` in `client/Utility/GetChallengeSuffix.ts` (same
regex, single source of truth for "is this Challenge numeric"), and using
it in `TagChallengeCollisions.ts` to set each tag's
`HiddenFromPlayerView` individually per combatant rather than a hardcoded
`true` for everyone in the collision. The "already tagged" de-dupe check
was simplified to match on `Text` alone (dropping the `HiddenFromPlayerView`
condition it previously also checked), since visibility is now a pure
function of the Challenge value and doesn't need to be part of the
identity check. Regression tests split accordingly: one confirms `"LV n"`
stays hidden, another confirms `"Minion"` is revealed.

## Fix 6: `SaveEditedListing` had the same Path+Name-only gap as Fix 1

Reported: with a "Goblin" at Challenge Minion and a "Goblin" at Challenge
1/2 both saved (post Fix 1-4), editing either one's HP and saving appeared
to affect both records.

`client/Library/useLibrary.ts`'s `SaveEditedListing` (used for the normal
"Edit → Save" flow on an already-local listing, as opposed to `SaveAs`)
has a second matching branch alongside the `Id` match, originally scoped
as "out of scope" earlier in this plan on the reasoning that it only
*deletes* matches whose `Origin === "account"`, and account listings
created via a save's `useSaveListing` side effect always share the same
`Id` as their local counterpart — so it looked like it could only ever
re-match the item being edited. That reasoning missed a second, real path
to an `"account"`-origin listing with a genuinely *different* `Id`: one
fetched from the account sync API on load (via `AddListings`), independent
of any save the current session performed. The original code:

```ts
const listingsToOverwrite = listings.filter(
  l =>
    l.Meta().Id == listing.Meta().Id ||
    l.Meta().Path + l.Meta().Name ==
      listing.Meta().Path + listing.Meta().Name
);

for (const listingToOverwrite of listingsToOverwrite) {
  if (listingToOverwrite.Origin === "account") {
    try {
      await DeleteListing(listingToOverwrite.Meta().Id);
    } catch {}
  }
}
```

The `Path+Name` fallback exists to reconcile that different-Id account
copy with the local edit being saved — but, exactly like Fix 1's
`SaveNewListing`, it never considered `Challenge`. So editing "Goblin"
(Minion) and saving would also match "Goblin" (1/2)'s account-origin
listing purely on `Path+Name`, and silently `DeleteListing` it — for a
user with account sync enabled, this reads as "editing one Goblin deleted
data belonging to the other," matching the report. (For a user without
account sync, or where the sibling's account copy happens to share the
same `Id`, this branch is a no-op, which is why it wasn't obviously
visible before.)

Fixed the same way as Fix 1 — require `FilterDimensions.Level` to match
too, on the fallback branch only (the `Id` branch is intentionally
untouched, since matching the item being edited by its own `Id` is always
correct regardless of `Challenge`):

```ts
const editedLevel = callbacks.getFilterDimensions(newListable).Level;
const listingsToOverwrite = listings.filter(
  l =>
    l.Meta().Id == listing.Meta().Id ||
    (l.Meta().Path + l.Meta().Name ==
      listing.Meta().Path + listing.Meta().Name &&
      l.Meta().FilterDimensions?.Level == editedLevel)
);
```

Regression coverage added in `client/Library/StatBlockLibrary.test.tsx`
(new file, mirroring the existing `SavedEncounterLibrary.test.tsx`
`renderHook`/mocked-`Store` pattern): editing one same-name Goblin no
longer deletes a different-Challenge sibling's account listing (verified
to actually fail without the fix, by temporarily reverting it and
re-running); a second test confirms the legitimate case — cleaning up a
same-Name/same-Challenge account copy that has a genuinely different
`Id` — still works, by injecting such a listing via `AddListings` rather
than relying on a save's own same-`Id` account companion (which would
only exercise the untouched `Id` branch, not prove the fallback still
works).

## Fix 7: preloaded "Goblin"/"Goblin" Id collision on the server

Reported: editing either preloaded Goblin's HP and saving "leads to
opening goblin challenge 1/2" — confirmed via follow-up as the *edit form
itself* showing the 1/2 Goblin's data regardless of which Goblin's Edit
button was clicked.

This turned out to be unrelated to Fixes 1-6 (all client-side, about
locally-saved listings) — `basic_rules_creatures.json` itself already
contains two entries both literally named `"Goblin"`, from the same
`Source` ("Nimble GMG"): one `Challenge: "Minion"`, one `Challenge: "1/2"`
(confirmed by inspecting the file directly - `node -e` dump, no other
preloaded content file has any Name+Source collision, so this is the only
one). The bug is server-side, in `server/library.ts`'s `Library.Add`
(used by every `Library.FromFile` call in
`server/configureBasicRulesContent.ts` - StatBlocks, Spells, Heroes,
Encounters alike):

```ts
private Add(items: any[]) {
  items.forEach(c => {
    if (!(c.Name && c.Source)) {
      throw `Missing Name or Source: Couldn't import ${JSON.stringify(c)}`;
    }
    c.Id = createId(c.Name, c.Source);
    this.items[c.Id] = c;
    ...
```

`createId(name, source)` derives the Id purely from `Name`+`Source`, with
no `Challenge` (or anything else) folded in. `this.items` is a plain
object map keyed by that Id - so when the second "Goblin" entry is
processed, `this.items["nimble-gmg.goblin"] = c` silently *overwrites* the
first. `this.listings` (a plain array, not deduped) still ends up with
*two* listing entries, both carrying the same `Id` - so the list itself
looked fine (each listing's own metadata, including `FilterDimensions.Level`,
is still computed correctly per-entry before the collision matters).

The break is in `GetById`: `return this.items[id];` now always returns
the *last* entry that collided on that Id (the "1/2" Goblin, since it's
second in the JSON array), regardless of which `Id` was requested. The
client hits this through `Listing.GetAsyncWithUpdatedId`
(`client/Library/Listing.ts:90-110`): for a `"server"`-origin listing
whose `.value()` isn't loaded yet, it does
`axios.get(this.listingMeta.Link)` where `Link = route + Id` - and since
*both* Goblin listings share the same `Id`, they share the exact same
`Link` URL, which the server always resolves to the 1/2 version. So
clicking Edit on *either* preloaded Goblin fetches the same URL and always
gets the 1/2 Goblin's full StatBlock back.

Traced and ruled out along the way (kept as a regression test regardless):
`LibrariesCommander.EditStatBlock` itself correctly threads the specific
listing through by reference/Id when both listings are already-loaded
local (`localAsync`) listings with distinct Ids - see
`client/Commands/LibrariesCommander.editStatBlock.test.ts`. The bug only
manifests for the *preloaded* (`server`-origin) entries, which is exactly
what "editing a fresh copy of the seed-data Goblin" hits.

Fixed generically in `server/library.ts`'s `Add`, for every `Library<T>`
instance (not StatBlock-specific): on a genuine `Id` collision, append an
incrementing numeric suffix rather than overwriting silently:

```ts
const baseId = createId(c.Name, c.Source);
let id = baseId;
let suffix = 2;
while (id in this.items) {
  id = `${baseId}-${suffix}`;
  suffix++;
}
c.Id = id;
this.items[c.Id] = c;
```

The common non-colliding case is unaffected (same Id as before, so no
existing bookmarks/links break); only the previously-broken colliding
entries get a distinct, stable Id. Regression coverage in the new
`server/library.test.ts` (verified to fail without the fix, by temporarily
reverting it and re-running): two same-Name/same-Source entries now get
distinct Ids and both resolve correctly via `GetById`; a non-colliding
entry keeps its unchanged, unsuffixed Id.

## Non-goals / explicitly out of scope

- **True duplicates** (same `Name` + `Path` + `Challenge`) keep overwriting
  silently via the primary Save button, exactly as today — confirmed
  decision, not just a default. Note the primary "New Monster" Save already
  skips `willOverwriteStatBlock`/`PathAndName` validation entirely
  (`if (!values.SaveAs) return errors;`, `StatBlockEditor.tsx:499`), so this
  isn't a regression — there's simply no warning today either way, and none
  is being added.
- No changes to Spells, Encounters, or PersistentCharacters save/collision
  behavior.
- No changes to the IndexedDB/localforage storage layer
  (`client/Utility/Store.ts`) — already keyed by `Id`, unaffected.
- No changes to `SaveEditedListing`'s stale-account-copy cleanup logic.

## Files touched

- `client/Library/useLibrary.ts` — `SaveNewListing` collision filter
  (Fix 1); `SaveEditedListing`'s fallback branch made Level-aware too
  (Fix 6)
- `client/StatBlockEditor/StatBlockEditor.tsx` — `willOverwriteStatBlock` /
  `validate` (Fix 2)
- `client/Library/Components/ListingRow.tsx` — new `showChallenge` prop,
  suffix construction with the redundancy guard (Fix 3); later refactored
  to use the shared `GetChallengeSuffix` (Fix 5)
- `client/Library/Components/ListingButton.tsx` — widen `text` prop from
  `string` to `React.ReactNode` (Fix 3)
- `client/Library/ReferencePane/LibraryReferencePane.tsx` — compute
  `showChallenge` alongside the existing `showSource` adjacent-name check
  (Fix 3)
- `client/Library/ReferencePane/StatBlockLibraryReferencePane.tsx` — accept
  and pass through `showChallenge` (Fix 3)
- `lesscss/components/listing.less` — `.c-listing__challenge { color:
  var(--text-faded); }` (Fix 3)
- `client/Library/FilterCache.ts` — `dedupeKey` now includes `Level` (Fix 4)
- `client/Library/FilterCache.test.ts` — regression coverage for Fix 4
- `client/Utility/GetChallengeSuffix.ts` — new shared utility, extracted
  from `ListingRow.tsx` (Fix 5)
- `client/Combatant/TagChallengeCollisions.ts` — new, auto-tags colliding
  combatants (Fix 5)
- `client/Combatant/TagChallengeCollisions.test.ts` — regression coverage
  for Fix 5
- `client/Encounter/Encounter.ts` — wired `TagChallengeCollisions` into
  `AddCombatantFromState` (Fix 5)
- `client/Library/StatBlockLibrary.test.tsx` — new, regression coverage
  for Fix 6
- `client/Commands/LibrariesCommander.editStatBlock.test.ts` — new,
  confirms `EditStatBlock` correctly resolves already-loaded local
  listings (ruled out as part of investigating Fix 7)
- `server/library.ts` — `Library.Add` now disambiguates colliding Ids
  instead of overwriting (Fix 7)
- `server/library.test.ts` — new, regression coverage for Fix 7

## Open questions for the user

- ~~Should an exact duplicate (same `Name` + `Path` + `Challenge`) start
  warning before overwriting on the primary Save button too, or stay silent
  as it is today?~~ **Resolved:** stay silent, exactly as it is today — no
  new warning.
- ~~Display wording and when to show it?~~ **Resolved:** `LV {n}` for
  numeric/fraction Challenge, raw value (no prefix) for word-based
  Challenge, shown only when disambiguating a same-`Name` sibling, in
  `--text-faded` gray, with a guard against duplicating a Challenge word
  that's already part of the literal `Name`.
