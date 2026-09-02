# Onboarding Plan: First-Time User Success

**Principle:** first impression = highest-leverage moment for retention. The goal isn't
a bigger tutorial, it's the shortest possible path to a first real win (damage applied,
turn advanced) with zero chance of a dead end, confusing state, or unexpected paywall.

## Baseline: what's already working (keep it)

The app already does several onboarding things right — don't regress these:

- **Zero-friction entry.** [landing.html](../html/landing.html) has no signup wall —
  "Build an Encounter" or "Join a Session" go straight into the product.
- **Auto-launching tutorial, with an escape hatch.** [TrackerViewModel.tsx:67-72](../client/TrackerViewModel.tsx#L67-L72)
  shows the tutorial on first load unless a `SkipIntro` flag is set, and it can be
  replayed anytime via "Repeat Tutorial" in Settings.
- **No blank-state problem.** The tutorial preloads sample Heroes/Monsters
  (`tutorial-heroes` source) so a brand-new user has real content to click on
  immediately instead of an empty library.
- **Learn-by-doing, not read-then-skip.** Several [TutorialSteps.ts](../client/Tutorial/TutorialSteps.ts)
  steps use `AwaitAction` to gate advancement on the user actually performing the
  action (select tab, apply damage) rather than just clicking "Next."
- **Ambient tips.** [TipCarousel.tsx](../client/Settings/components/TipCarousel.tsx)
  surfaces rotating tips for things that don't fit in the guided tour.

## Gaps that hurt the first impression

1. ~~**Tutorial ends before the core loop pays off.**~~ The tutorial used to walk
   through adding combatants and applying damage, then stop at "click Settings." The
   commented-out "Press 'n' / Next Turn" step in TutorialSteps.ts couldn't simply be
   restored: the `next-turn` toolbar command it pointed at was deliberately removed
   (commit `00ccf05f`, "comment out unused commands"). Turn tracking has since moved
   to a per-combatant "has taken turn" checkbox
   (`.combatant__has-taken-turn` in [CombatantRow.tsx:130-138](../client/InitiativeList/CombatantRow.tsx#L130-L138)),
   which fits Nimble's freeform initiative better than a strict turn pointer.
   **Fixed** — added a new step teaching that checkbox right after "Apply Damage" (see
   [TutorialSteps.ts:87-98](../client/Tutorial/TutorialSteps.ts#L87-L98), wired via
   `NotifyTutorialOfAction("ToggleHasTakenTurn")` in
   [CombatantViewModel.ts:293-296](../client/Combatant/CombatantViewModel.ts#L293-L296)).
   Scoped to just the checkbox, not the initiative-roll prompt (which already fires an
   unused `ShowInitiativeDialog`/`CompleteInitiativeRolls` tutorial hook — see
   [InitiativePrompt.tsx:232](../client/Prompts/InitiativePrompt.tsx#L232) — but stays
   out of the tour for now, by explicit decision). Verified end-to-end in a live
   browser: the step appears with correct positioning, the checkbox click advances to
   the final "Click Settings" step, and there are no console errors.

2. ~~**No visibility into where users drop off.**~~ [Metrics.ts](../client/Utility/Metrics.ts)
   used to track only `tutorial_begin` / `tutorial_complete`. **Fixed** — added
   `tutorial_step_viewed` (fires on every step, including the initial one) and
   `tutorial_abandoned` (fires with the step index on early "End Tutorial", not on
   natural completion). See [Tutorial.tsx](../client/Tutorial/Tutorial.tsx).

3. ~~**Debug logging shipped in the onboarding path.**~~ `[TutorialDebug]` `console.log`
   calls were present in Tutorial.tsx, App.tsx, and TrackerViewModel.tsx — exactly the
   code path every new user hits first. **Fixed** — all five call sites removed.

4. ~~**Monetization copy is ahead of what's actually offered.**~~ [Tips.ts:19](../client/Settings/Tips.ts#L19)
   used to promote "Epic Tier" benefits, but per the current Patreon rollout the new
   campaign only offers Account Sync — Epic/Mythic tiers aren't live yet (Epic Tier
   tab is already hidden in Settings for this reason). **Fixed** — reworded to
   "coming soon" and dropped the live pledge CTA link.

5. ~~**The most important warning is the easiest tip to never see.**~~ [Tips.ts:3](../client/Settings/Tips.ts#L3)
   ("app is in beta, export your data periodically") is a genuine data-loss risk
   notice, but it only surfaced if the user opened Settings and happened to land on
   that tip in the rotation — a first-timer who never opened Settings got zero
   warning before they could lose an encounter. **Fixed** — added a one-time
   dismissible prompt ([BetaDataWarningPrompt.tsx](../client/Prompts/BetaDataWarningPrompt.tsx))
   shown right after the tutorial closes (same trigger point as the existing privacy
   prompt), gated on an `AcknowledgedBetaWarning` flag so it only ever shows once.
   Verified live: appears after both "End Tutorial" and full completion, dismisses on
   "Got it," and stays dismissed across a reload.

6. ~~**No onboarding for the other kind of first-time user: players.**~~ "Join a
   Session" used to drop a player straight into a read-only Player View with no
   explanation of what they're looking at — all prior onboarding investment
   (tutorial, tips) was GM-only. **Fixed** — added a one-time dismissible explainer
   in [PlayerView.tsx](../client/PlayerView/components/PlayerView.tsx) covering the
   active-turn highlight, the "has taken turn" checkmark, and (conditionally) the
   damage/tag suggestion affordances if the GM has enabled them. Gated on a
   `DismissedPlayerViewExplainer` flag, same pattern as the beta warning. Verified
   live in a real Player View popup window: shows on first join, dismisses on "Got
   it," stays dismissed across a reload.

7. ~~**Coach-mark positioning is desktop-only tested.**~~ **Checked live now that
   mobile-friendly design (Phases 0-3) has landed — turns out fine, no action
   needed.** [TutorialSteps.ts](../client/Tutorial/TutorialSteps.ts)'s
   `CalculatePosition` functions compute raw pixel offsets, but
   [tutorial.less:18-25](../lesscss/components/tutorial.less#L18-L25) already had a
   pre-existing (predates both this plan and the mobile pass) `@media (max-width:
   @small)` override that forces the widget to a fixed, readable bottom-left position
   with `!important`, ignoring the computed offset entirely below 750px. Verified live
   at 390px: welcome/monsters-tab steps render cleanly, fully on-screen, readable.

8. ~~**NEW — found while verifying #7: the guided tutorial was a hard dead-end past
   "Select a combatant" at phone width.**~~ The mobile pass's single-column layout
   (Phase 1) shows either the library panel *or* the combatants list, never both — by
   design, with a close ("×") button on the library panel as the escape hatch. But the
   tutorial's own `.modal-blur` backdrop intercepted pointer events for that close
   button, so a first-time mobile user could open the library, add a Hero/Monster as
   instructed, and then had no way to close the library and reach the combatants list
   the next three steps required — and since "Apply Damage" has `AwaitAction:
   "ApplyDamage"`, "Next" was disabled there too, so the tutorial was completely stuck.
   **Fixed (Option A, per your call)** — the tutorial now closes the Library pane
   itself right as it advances into "Select a combatant"
   (`HideLibrariesOnEnter` on that step in
   [TutorialSteps.ts](../client/Tutorial/TutorialSteps.ts), wired through
   `EncounterCommander.HideLibraries` in [App.tsx](../client/App.tsx) and
   [Tutorial.tsx](../client/Tutorial/Tutorial.tsx)), rather than relying on the user to
   find and tap a blocked button. Applies at every width, not just phone — harmless
   (and arguably tidier) on desktop, so one code path is exercised at both.

   **Second, related dead-end found and fixed during verification of the first fix:**
   selecting a combatant (the step right after) swaps the combatants list for that
   combatant's full detail view on phone width — hiding the very HP cell the next step
   ("Apply Damage") needs, the same class of problem one step later. Unlike the
   library case this one wasn't fully blocked (the "Back to Initiative"/deselect
   button in `.combatant-details__header` was, unlike the library's, still clickable
   through the blur), but the tutorial still didn't tell the user to tap it. Fixed the
   same way: `DeselectCombatantOnEnter` on the "Apply Damage" step, wired to
   `CombatantCommander.Deselect`. One flag was enough to cover both "Apply Damage" and
   "has taken turn" — neither the HP click nor the checkbox click re-selects the row
   (both call `stopPropagation`), so the list stays visible for both once deselected.

   Both fixes needed the position-calculating effect in `Tutorial.tsx` to depend on
   `librariesVisible`/`isCombatantSelected`, not just `stepIndex` — otherwise it would
   measure the target's position *before* the hide/deselect actually lands in the DOM,
   against the stale (still-hidden) layout.

   **Verified live end-to-end at 390px**: full tutorial walkthrough from Welcome
   through the final Settings step completes with zero manual workarounds, zero
   console errors, zero horizontal overflow at any step. Re-verified at desktop width
   afterward — no regression there either.

## Recommendations

**P0 — cheap, high leverage, do first**
- [x] Strip the `TutorialDebug` console logging.
- [x] Add per-step tutorial metrics (`tutorial_step_viewed`, `tutorial_abandoned`).
- [x] Reword the Epic Tier tip to "coming soon", drop the live pledge CTA link (see
  [Tips.ts:19](../client/Settings/Tips.ts#L19)).
- [x] Write a *new* tutorial step covering the "has taken turn" checkbox so the
  guided tour ends on the app's actual core loop instead of on the Settings button
  (see gap #1 above).

**P1**
- [x] Promote the beta/data-export warning out of the tip rotation (see gap #5
  above).
- [x] Add a minimal explainer for Player View joiners (see gap #6 above).
- [x] Verify tutorial coach-mark placement at mobile widths — checked now that the
  mobile pass has landed, no fix needed (see gap #7 above).
- [x] Fix the tutorial dead-end past "Select a combatant" at phone width — this
  turned out to be two related dead-ends, both fixed (see gap #8 above).

**P2 — nice to have**
- [x] A one-click "load a sample encounter" as a lighter alternative to the full
  step-by-step. Turned out to need no new content: the app already bundles ready-made
  intro encounters via `PreloadedEncounterSources["local-basic-rules"]` (served from
  `basic_rules_encounters.json` at `/basic-rules-encounters/`, on by default) — they
  were just never surfaced outside the "Encounters" library tab a first-timer has no
  reason to open. Added a "Load a Sample Encounter Instead" option to the tutorial's
  welcome step ([Tutorial.tsx](../client/Tutorial/Tutorial.tsx),
  [App.tsx](../client/App.tsx)) that picks the bundled intro encounter (falling back
  to the first available one), loads it via the existing
  `LibrariesCommander.LoadEncounter`, and closes the tutorial. Verified live: loads
  "A Goblin Minions x 2" into the combatants list with no console errors.
- [x] A short post-tutorial nudge on the *next* session ("try adding your own Hero
  this time") instead of treating onboarding as a single one-and-done pass. Added
  `PostTutorialNudgeVisible` to [TrackerViewModel.tsx](../client/TrackerViewModel.tsx),
  set as a `PendingPostTutorialNudge` flag when the tutorial closes and consumed on
  the *next* page load's `allPersistentCharactersLoaded` signal, guarded by a
  session-scoped `hasCheckedPostTutorialNudge` flag so a same-session re-firing of
  that (repeatable) callback can't immediately show it right after the tutorial's own
  closing prompts. Renders as a small dismissible corner banner (see `.post-tutorial-nudge`
  in [tutorial.less](../lesscss/components/tutorial.less)). Verified live across three
  simulated sessions: hidden same-session, shown next session, dismissible, stays
  dismissed after that. **Mobile follow-up (2026-09-02):** checked at 390px and found
  the banner's bottom-left position collided with the fixed "Log In with Patreon"
  button (bottom-right, and both are nearly full-width at phone size) — cut off the
  message text and crowded the dismiss button. Fixed by anchoring to the top instead
  at `@media (max-width: @phone)`; a first attempt at that fix introduced a second bug
  (unconstrained flex row pushed the dismiss button off the right edge of the
  viewport entirely) caught by re-measuring the button's bounding box, not just
  eyeballing the screenshot — fixed with `min-width: 0` on the message span so it
  wraps instead of forcing the row wider than the viewport. Re-verified at both 390px
  and desktop width after the fix.

  Also spot-checked the beta-warning/privacy-prompt stacking (gap #5/#6) at 390px
  while here — both render cleanly with no overflow, no changes needed.

## Non-goals

- No signup/account wall before first use — the current frictionless entry is a
  strength; do not add gates in front of it.
- No mandatory tutorial — the `SkipIntro` escape hatch must stay.
