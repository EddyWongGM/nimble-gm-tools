import * as React from "react";
import { HTML5Backend } from "react-dnd-html5-backend";

import { TrackerViewModel } from "./TrackerViewModel";
import { useSubscription } from "./Combatant/linkComponentToObservables";
import { CurrentSettings } from "./Settings/Settings";
import { SettingsContext } from "./Settings/SettingsContext";
import { SettingsPane } from "./Settings/components/SettingsPane";
import { AccountClient } from "./Account/AccountClient";
import { Tutorial } from "./Tutorial/Tutorial";
import { env } from "./Environment";
import { TextEnricherContext } from "./TextEnricher/TextEnricher";
import { LegacySynchronousLocalStore } from "./Utility/LegacySynchronousLocalStore";
import { DndProvider } from "react-dnd";
import { interfacePriorityClass } from "./Layout/interfacePriorityClass";
import { centerColumnView } from "./Layout/centerColumnView";
import { ThreeColumnLayout } from "./Layout/ThreeColumnLayout";
import { LibraryManager } from "./Library/Manager/LibraryManager";
import { Button } from "./Components/Button";
import {
  LibrariesContext,
  loadBasicRulesHeroes,
  unloadTutorialHeroes,
  useLibraries
} from "./Library/Libraries";
import { Store } from "./Utility/Store";
import { Settings } from "../common/Settings";
import { Metrics } from "./Utility/Metrics";

/*
 * This file is new as of 05/2020. Most of the logic was extracted from TrackerViewModel.
 * TrackerViewModel was the top level Knockout viewmodel for binding to ko components.
 */

export function App(props: { tracker: TrackerViewModel }): JSX.Element {
  const { tracker } = props;
  const settings = useSubscription<Settings>(CurrentSettings);

  const settingsVisible = useSubscription(tracker.SettingsVisible);
  const tutorialVisible = useSubscription(tracker.TutorialVisible);
  const postTutorialNudgeVisible = useSubscription(
    tracker.PostTutorialNudgeVisible
  );
  const libraryManagerPane = useSubscription(tracker.LibraryManagerPane);
  const librariesVisible = useSubscription(tracker.LibrariesVisible);
  const statblockEditorProps = useSubscription(tracker.StatBlockEditorProps);
  const spellEditorProps = useSubscription(tracker.SpellEditorProps);
  const prompts = useSubscription(tracker.PromptQueue.GetPrompts);

  const encounterFlowState = useSubscription(
    tracker.Encounter.EncounterFlow.State
  );

  const isACombatantSelected = useSubscription(
    tracker.CombatantCommander.HasSelected
  );

  const libraries = useLibraries(settings, new AccountClient(), () => {
    tracker.LoadAutoSavedEncounterIfAvailable();
    tracker.ContinuePendingRepeatTutorialIfNeeded();
    tracker.ShowPostTutorialNudgeIfPending();
  });

  tracker.SetLibraries(libraries);

  const centerColumn = centerColumnView(statblockEditorProps, spellEditorProps);
  const interfacePriority = interfacePriorityClass(
    centerColumn,
    librariesVisible,
    prompts.length > 0,
    isACombatantSelected,
    encounterFlowState
  );

  const blurVisible = tutorialVisible || settingsVisible;

  const closeTutorial = React.useCallback(() => {
    tracker.TutorialVisible(false);
    unloadTutorialHeroes(libraries.PersistentCharacters);
    loadBasicRulesHeroes(libraries.PersistentCharacters);
    tracker.SaveUpdatedSettings({
      ...settings,
      PreloadedHeroSources: {
        ...settings.PreloadedHeroSources,
        "tutorial-heroes": false,
        "local-basic-rules": true
      }
    });
    LegacySynchronousLocalStore.Save(
      LegacySynchronousLocalStore.User,
      "SkipIntro",
      true
    );
    // Checked on a later page load (see ShowPostTutorialNudgeIfPending) so
    // the nudge lands on the GM's next session instead of piling onto this
    // one right after the tutorial and its other one-time prompts.
    LegacySynchronousLocalStore.Save(
      LegacySynchronousLocalStore.User,
      "PendingPostTutorialNudge",
      true
    );
  }, [tracker, libraries, settings]);

  // Adds the tutorial's Berserker and Cheat Heroes, then the bundled intro
  // Encounter (a couple of ready-made Monsters), so a first-timer sees a
  // complete fight in the tracker instead of monsters with no one to fight
  // them - Heroes are awaited first so they land in the combatant list ahead
  // of the Monsters regardless of which network fetch resolves first. Falls
  // back to the first available bundled Encounter if the intro one hasn't
  // loaded for some reason. The tutorial Heroes are always preloaded ahead
  // of this step (see PreloadedHeroSources["tutorial-heroes"] in Settings.ts
  // and TrackerViewModel.RepeatTutorial), so no extra fetch is needed for
  // them.
  const loadSampleEncounter = React.useCallback(async () => {
    const sampleHeroNames = ["Berserker", "Cheat"];
    const heroListings = libraries.PersistentCharacters.GetAllListings().filter(
      l => sampleHeroNames.includes(l.Meta().Name)
    );
    for (const heroListing of heroListings) {
      await tracker.LibrariesCommander.AddPersistentCharacterFromListing(
        heroListing,
        false
      );
    }

    const encounterListings = libraries.Encounters.GetAllListings();
    const sampleListing =
      encounterListings.find(l => l.Meta().Path?.includes("Intro")) ??
      encounterListings[0];
    if (sampleListing) {
      sampleListing.GetAsyncWithUpdatedId(savedEncounter => {
        tracker.LibrariesCommander.LoadEncounter(savedEncounter, false);
      });
    }
  }, [libraries, tracker]);

  React.useEffect(() => {
    if (!env.IsLoggedIn) {
      Metrics.TrackPatreonCtaViewed(Metrics.LeadSource.StickyPatreonLogin, {
        creative_name: Metrics.CreativeName.StickyPatreonLoginV1,
        link_url: env.PatreonLoginUrl
      });
    }
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <SettingsContext.Provider value={settings}>
        <TextEnricherContext.Provider value={tracker.StatBlockTextEnricher}>
          <LibrariesContext.Provider value={libraries}>
            <div className={"encounter-view " + interfacePriority}>
              {blurVisible && (
                <div className="modal-blur" onClick={tracker.CloseSettings} />
              )}
              {settingsVisible && (
                <SettingsPane
                  handleNewSettings={tracker.SaveUpdatedSettings}
                  encounterCommands={tracker.EncounterToolbar}
                  combatantCommands={tracker.CombatantCommander.Commands}
                  reviewPrivacyPolicy={tracker.ReviewPrivacyPolicy}
                  repeatTutorial={tracker.RepeatTutorial}
                  closeSettings={() => tracker.SettingsVisible(false)}
                  libraries={libraries}
                  accountClient={new AccountClient()}
                />
              )}
              {tutorialVisible && (
                <Tutorial
                  onClose={closeTutorial}
                  onLoadSampleEncounter={loadSampleEncounter}
                  librariesVisible={librariesVisible}
                  onHideLibraries={tracker.EncounterCommander.HideLibraries}
                  isCombatantSelected={isACombatantSelected}
                  onDeselectCombatant={tracker.CombatantCommander.Deselect}
                />
              )}
              {postTutorialNudgeVisible && (
                <div className="post-tutorial-nudge">
                  <span>
                    Welcome back! Next time you run a session, try adding one
                    of your own Heroes from the Compendium or "Add New" in the
                    Heroes tab.
                  </span>
                  <Button
                    fontAwesomeIcon="times"
                    onClick={tracker.DismissPostTutorialNudge}
                    tooltip="Dismiss"
                  />
                </div>
              )}
              {!env.IsLoggedIn && (
                <a
                  className="login button"
                  href={env.PatreonLoginUrl}
                  onClick={() =>
                    Metrics.TrackPatreonLoginStarted(
                      Metrics.LeadSource.StickyPatreonLogin,
                      {
                        creative_name:
                          Metrics.CreativeName.StickyPatreonLoginV1
                      }
                    )
                  }
                >
                  Log In with Patreon
                </a>
              )}
              {libraryManagerPane ? (
                <LibraryManager
                  libraries={libraries}
                  librariesCommander={tracker.LibrariesCommander}
                  closeManager={() => tracker.LibraryManagerPane(null)}
                  initialPane={libraryManagerPane}
                />
              ) : (
                <ThreeColumnLayout tracker={tracker} />
              )}
            </div>
          </LibrariesContext.Provider>
        </TextEnricherContext.Provider>
      </SettingsContext.Provider>
    </DndProvider>
  );
}
