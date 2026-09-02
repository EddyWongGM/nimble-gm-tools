import * as ko from "knockout";
import * as React from "react";
import * as SocketIOClient from "socket.io-client";

import * as compression from "json-url";
import * as lzString from "lz-string";
import { TagState } from "../common/CombatantState";
import { PersistentCharacter } from "../common/PersistentCharacter";
import { Settings } from "../common/Settings";
import { StatBlock } from "../common/StatBlock";
import { Omit, ParseJSONOrDefault } from "../common/Toolbox";
import { AccountClient } from "./Account/AccountClient";
import { Combatant } from "./Combatant/Combatant";
import { CombatantViewModel } from "./Combatant/CombatantViewModel";
import { BuildEncounterCommandList } from "./Commands/BuildEncounterCommandList";
import { CombatantCommander } from "./Commands/CombatantCommander";
import { EncounterCommander } from "./Commands/EncounterCommander";
import { LibrariesCommander } from "./Commands/LibrariesCommander";
import { BetaDataWarningPrompt } from "./Prompts/BetaDataWarningPrompt";
import { PrivacyPolicyPrompt } from "./Prompts/PrivacyPolicyPrompt";
import { PromptQueue } from "./Commands/PromptQueue";
import { SubmitButton } from "./Components/Button";
import { Encounter } from "./Encounter/Encounter";
import { UpdateLegacyEncounterState } from "./Encounter/UpdateLegacySavedEncounter";
import { env } from "./Environment";
import {
  Libraries,
  LibraryType,
  loadTutorialHeroes
} from "./Library/Libraries";
import { PlayerViewClient } from "./PlayerView/PlayerViewClient";
import { DefaultRules } from "./Rules/Rules";
import {
  UpdateLegacyCommandSettingsAndSave,
  CurrentSettings,
  SubscribeCommandsToSettingsChanges,
  SubscribeToDarkModeChanges,
  SubscribeToRollableUnderlineChanges
} from "./Settings/Settings";
import { StatBlockEditorProps } from "./StatBlockEditor/StatBlockEditor";
import { TextEnricher } from "./TextEnricher/TextEnricher";
import { LegacySynchronousLocalStore } from "./Utility/LegacySynchronousLocalStore";
import { Metrics } from "./Utility/Metrics";
import { EventLog } from "./Widgets/EventLog";
import { SpellEditorProps } from "./StatBlockEditor/SpellEditor";
import { Spell } from "../common/Spell";

const codec = compression("lzma");

export class TrackerViewModel {
  private rules = new DefaultRules();

  public PlayerViewClient = new PlayerViewClient(this.Socket);
  public PromptQueue = new PromptQueue();
  public EventLog = new EventLog();
  public Libraries: Libraries;
  public EncounterCommander = new EncounterCommander(this);
  public CombatantCommander = new CombatantCommander(this);
  public LibrariesCommander = new LibrariesCommander(
    this,
    this.EncounterCommander
  );
  public EncounterToolbar = BuildEncounterCommandList(
    this.EncounterCommander,
    this.LibrariesCommander.SaveEncounter
  );

  public TutorialVisible = ko.observable(
    !LegacySynchronousLocalStore.Load(
      LegacySynchronousLocalStore.User,
      "SkipIntro"
    )
  );
  public PostTutorialNudgeVisible = ko.observable(false);
  public SettingsVisible = ko.observable(false);
  public LibrariesVisible = ko.observable(true);
  public LibraryManagerPane = ko.observable<LibraryType | null>(null);
  public ToggleLibraryManager = (): void => {
    if (this.LibraryManagerPane() === null) {
      Metrics.TrackEvent(Metrics.Event.LibraryManagerOpened);
      this.LibraryManagerPane("StatBlocks");
    } else {
      this.LibraryManagerPane(null);
    }
  };
  public ToolbarWide = ko.observable(false);

  constructor(private Socket: SocketIOClient.Socket) {
    const allCommands = [
      ...this.EncounterToolbar,
      ...this.CombatantCommander.Commands
    ];
    UpdateLegacyCommandSettingsAndSave(CurrentSettings(), allCommands);
    SubscribeCommandsToSettingsChanges(allCommands);
    SubscribeToDarkModeChanges();
    SubscribeToRollableUnderlineChanges();

    this.subscribeToSocketMessages();

    this.joinPlayerViewEncounter();

    this.showPrivacyNotificationAfterTutorial();
  }

  public SetLibraries = (libraries: Libraries): void => {
    // I don't like this pattern, but it's my first stab at a partial
    // conversion to allow an observable-backed class to also depend
    // on a React hook. This will probably catch fire at some point.
    // It's also probably impossible to test.
    this.Libraries = libraries;

    this.StatBlockTextEnricher = new TextEnricher(
      this.CombatantCommander.RollDice,
      this.LibrariesCommander.ReferenceSpell,
      this.LibrariesCommander.ReferenceCondition,
      this.Libraries.Spells.GetAllListings,
      this.LibrariesCommander.GetSpellsByNameRegex,
      this.rules
    );

    this.LibrariesCommander.SetLibraries(libraries);
  };

  // Set synchronously by RepeatTutorial, right before it writes the
  // PendingRepeatTutorial flag and calls location.reload(). The reload
  // doesn't stop this page's JS immediately - it keeps running (and
  // re-rendering, since RepeatTutorial's own SaveUpdatedSettings just
  // changed CurrentSettings) until the browser actually navigates away.
  // useLibraries' allPersistentCharactersLoaded callback fires repeatedly
  // (once per relevant library/state change, not once per page), so without
  // this guard one of those extra firings on this same doomed page finds the
  // flag it just wrote, consumes it, and runs RepeatTutorial a second time
  // here - which briefly opens the tutorial on a page that's about to be
  // thrown away, and leaves no flag for the real post-reload page to find.
  private didTriggerRepeatTutorialReload = false;

  // Called once account sync and local persistent-character loading have
  // both finished (see useLibraries' allPersistentCharactersLoaded callback
  // in App.tsx). Calling RepeatTutorial any earlier races two things that
  // can silently undo it: SetLibraries runs synchronously in App's render
  // body, so setting TutorialVisible there happens before App's own
  // useSubscription has read the new value; and for a logged-in account,
  // LoadAutoSavedEncounterIfAvailable (gated on this same signal) can
  // restore a previous encounter after RepeatTutorial's EndEncounter call,
  // undoing the fresh start. Running after both are settled avoids both.
  public ContinuePendingRepeatTutorialIfNeeded = (): void => {
    if (this.didTriggerRepeatTutorialReload) {
      return;
    }
    const pending = LegacySynchronousLocalStore.Load(
      LegacySynchronousLocalStore.User,
      "PendingRepeatTutorial"
    );
    if (pending) {
      LegacySynchronousLocalStore.Delete(
        LegacySynchronousLocalStore.User,
        "PendingRepeatTutorial"
      );
      this.RepeatTutorial();
    }
  };

  // Guards against allPersistentCharactersLoaded's repeated firing (see its
  // comment above ContinuePendingRepeatTutorialIfNeeded) - without this, a
  // tutorial closed in the current session sets the pending flag, then a
  // later same-session firing of this same callback would immediately
  // consume it, showing the nudge right on top of the tutorial's own
  // closing prompts instead of on the GM's next session.
  private hasCheckedPostTutorialNudge = false;

  public ShowPostTutorialNudgeIfPending = (): void => {
    if (this.hasCheckedPostTutorialNudge) {
      return;
    }
    this.hasCheckedPostTutorialNudge = true;

    const pending = LegacySynchronousLocalStore.Load(
      LegacySynchronousLocalStore.User,
      "PendingPostTutorialNudge"
    );
    if (pending) {
      LegacySynchronousLocalStore.Delete(
        LegacySynchronousLocalStore.User,
        "PendingPostTutorialNudge"
      );
      this.PostTutorialNudgeVisible(true);
    }
  };

  public DismissPostTutorialNudge = (): void => {
    this.PostTutorialNudgeVisible(false);
  };

  public StatBlockTextEnricher: TextEnricher;

  public Encounter = new Encounter(
    this.PlayerViewClient,
    combatantId => {
      const combatant = this.CombatantViewModels().find(
        (c: CombatantViewModel) => c.Combatant.Id == combatantId
      );
      if (combatant) {
        combatant.EditInitiative();
      }
    },
    this.rules
  );

  public CombatantViewModels: ko.PureComputed<CombatantViewModel[]> =
    ko.pureComputed(() =>
      this.Encounter.Combatants()
        .filter(c => !c.IsPendingRemoval())
        .map(this.buildCombatantViewModel)
    );

  public StatBlockEditorProps = ko.observable<StatBlockEditorProps>(null);
  public SpellEditorProps = ko.observable<SpellEditorProps>(null);

  public CloseSettings = (): void => {
    this.SettingsVisible(false);
    //this.TutorialVisible(false);
  };

  public ReviewPrivacyPolicy = (): void => {
    this.SettingsVisible(false);
    const prompt = PrivacyPolicyPrompt();
    this.PromptQueue.Add(prompt);
  };

  public EditStatBlock(props: Omit<StatBlockEditorProps, "onClose">): void {
    this.StatBlockEditorProps({
      ...props,
      onClose: () => this.StatBlockEditorProps(null)
    });
  }

  public EditSpell(props: Omit<SpellEditorProps, "onClose">): void {
    this.SpellEditorProps({
      ...props,
      onClose: () => this.SpellEditorProps(null)
    });
  }

  public async EditPersistentCharacterStatBlock(
    persistentCharacterId: string,
    newStatBlock?: StatBlock
  ): Promise<void> {
    this.StatBlockEditorProps(null);
    const persistentCharacterListing =
      await this.Libraries.PersistentCharacters.GetOrCreateListingById(
        persistentCharacterId
      );

    const persistentCharacter =
      await persistentCharacterListing.GetWithTemplate(
        PersistentCharacter.Default()
      );

    const hpDown =
      persistentCharacter.StatBlock.HP.Value - persistentCharacter.CurrentHP;

    this.StatBlockEditorProps({
      statBlock: newStatBlock || persistentCharacter.StatBlock,
      editorTarget: "persistentcharacter",
      onSave: (statBlock: StatBlock) =>
        this.LibrariesCommander.UpdatePersistentCharacterStatBlockInLibraryAndEncounter(
          persistentCharacterId,
          statBlock,
          hpDown
        ),
      onDelete: () =>
        this.Libraries.PersistentCharacters.DeleteListing(
          persistentCharacterId
        ),
      onSaveAsCopy: (statBlock: StatBlock) =>
        this.Libraries.PersistentCharacters.SaveNewListing(
          PersistentCharacter.Initialize(statBlock)
        ),
      onClose: () => this.StatBlockEditorProps(null),
      currentListings: this.Libraries.PersistentCharacters.GetAllListings()
    });
  }

  public RepeatTutorial = (): void => {
    const settings = CurrentSettings();
    if (!settings.PreloadedHeroSources["tutorial-heroes"]) {
      this.didTriggerRepeatTutorialReload = true;
      this.SaveUpdatedSettings({
        ...settings,
        PreloadedHeroSources: {
          ...settings.PreloadedHeroSources,
          "tutorial-heroes": true
        }
      });
      LegacySynchronousLocalStore.Save(
        LegacySynchronousLocalStore.User,
        "PendingRepeatTutorial",
        true
      );
      window.location.reload();
      return;
    }

    this.Encounter.EncounterFlow.EndEncounter();
    this.EncounterCommander.ShowLibraries();
    this.SettingsVisible(false);
    this.TutorialVisible(true);
    loadTutorialHeroes(this.Libraries.PersistentCharacters);
  };

  public ImportEncounterIfAvailable = (): void => {
    const encounter = env.PostedEncounter;
    if (encounter) {
      this.TutorialVisible(false);
      this.Encounter.ClearEncounter();
      this.Encounter.ImportEncounter(encounter);
    }
  };

  public ImportFromQueryParamIfAvailable = async (): Promise<void> => {
    if (!URLSearchParams) {
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const compressedJSONv1 = urlParams.get("s");
    const compressedJSONv2 = urlParams.get("i");
    const entityType = urlParams.get("t");
    if (!compressedJSONv1 && !compressedJSONv2) {
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    this.TutorialVisible(false);

    if (!env.IsLoggedIn || !env.HasEpicInitiative) {
      Metrics.TrackPatreonAccessDenied(Metrics.LeadSource.ImporterLoginFail, {
        link_url: env.IsLoggedIn
          ? "https://www.patreon.com/join/NimbleRPGApp"
          : env.PatreonLoginUrl
      });
    }

    if (!env.IsLoggedIn) {
      this.PromptQueue.Add({
        autoFocusSelector: ".submit",
        initialValues: {},
        onSubmit: () => true,
        children: (
          <span className="not-logged-in-for-import">
            {"Please login with "}
            <a
              href={env.PatreonLoginUrl}
              target="_blank"
              onClick={() =>
                Metrics.TrackPatreonLoginStarted(
                  Metrics.LeadSource.ImporterLoginFail
                )
              }
            >
              Patreon
            </a>
            {" to use the D&D Beyond Importer."}
            <SubmitButton />
          </span>
        )
      });
    }

    if (!env.HasEpicInitiative) {
      this.PromptQueue.Add({
        autoFocusSelector: ".submit",
        initialValues: {},
        onSubmit: () => true,
        children: (
          <span className="no-epic-initiative-for-import">
            {"The D&D Beyond Importer is available for "}
            <a
              href={"https://www.patreon.com/join/NimbleRPGApp"}
              target="_blank"
              onClick={() =>
                Metrics.TrackPatreonSignupIntent(
                  Metrics.LeadSource.ImporterLoginFail,
                  {
                    link_url: "https://www.patreon.com/join/NimbleRPGApp"
                  }
                )
              }
            >
              Epic Initiative
            </a>
            {" Patrons."}
            <SubmitButton />
          </span>
        )
      });

      return;
    }

    let json = "";
    if (compressedJSONv1) {
      json = await codec.decompress(compressedJSONv1);
    }
    if (compressedJSONv2) {
      json = lzString.decompressFromEncodedURIComponent(compressedJSONv2);
    }
    if (!json.length) {
      return;
    }

    const parsedPayload = ParseJSONOrDefault<Record<string, unknown>>(
      json,
      {}
    );

    if (entityType === "sp") {
      this.editImportedSpell(parsedPayload);
    } else {
      this.editImportedStatBlock(parsedPayload);
    }
  };

  private editImportedStatBlock(parsedPayload: Record<string, unknown>) {
    const statBlock: StatBlock = {
      ...StatBlock.Default(),
      ...parsedPayload
    };

    Metrics.TrackEvent(Metrics.Event.StatBlockImported, {
      name: statBlock.Name
    });

    if (!StatBlock.IsPlayerCharacter(statBlock)) {
      this.EditStatBlock({
        editorTarget: "library",
        onSave: this.Libraries.StatBlocks.SaveNewListing,
        statBlock,
        currentListings: this.Libraries.StatBlocks.GetAllListings()
      });
    } else {
      const currentListings =
        this.Libraries.PersistentCharacters.GetAllListings();
      const existingListing = currentListings.find(
        l => l.Meta().Name == statBlock.Name
      );
      if (existingListing) {
        this.EditPersistentCharacterStatBlock(
          existingListing.Meta().Id,
          statBlock
        );
      } else {
        this.EditStatBlock({
          editorTarget: "persistentcharacter",
          onSave: statBlock => {
            const persistentCharacter =
              PersistentCharacter.Initialize(statBlock);
            this.Libraries.PersistentCharacters.SaveNewListing(
              persistentCharacter
            );
          },
          statBlock,
          currentListings
        });
      }
    }
  }

  private editImportedSpell(parsedPayload: Record<string, unknown>) {
    const spell: Spell = {
      ...Spell.Default(),
      ...parsedPayload
    };
    Metrics.TrackEvent(Metrics.Event.SpellImported, {
      name: spell.Name
    });
    this.EditSpell({
      onSave: this.Libraries.Spells.SaveNewListing,
      spell,
      onDelete: () => {}
    });
  }

  private subscribeToSocketMessages = () => {
    this.Socket.on(
      "suggest damage",
      (
        suggestedCombatantIds: string[],
        suggestedDamage: number,
        suggester: string
      ) => {
        const suggestedCombatants = this.CombatantViewModels().filter(
          c => suggestedCombatantIds.indexOf(c.Combatant.Id) > -1
        );
        this.CombatantCommander.PromptAcceptSuggestedDamage(
          suggestedCombatants,
          suggestedDamage,
          suggester
        );
      }
    );

    this.Socket.on(
      "suggest tag",
      (suggestedCombatantIds: string[], suggestedTag: TagState) => {
        const suggestedCombatants = this.CombatantViewModels().filter(
          c => suggestedCombatantIds.indexOf(c.Combatant.Id) > -1
        );

        this.CombatantCommander.PromptAcceptSuggestedTag(
          suggestedCombatants[0].Combatant,
          suggestedTag
        );
      }
    );
  };

  private joinPlayerViewEncounter() {
    this.PlayerViewClient.JoinEncounter(env.EncounterId);

    this.PlayerViewClient.UpdateSettings(
      env.EncounterId,
      CurrentSettings().PlayerView
    );

    this.PlayerViewClient.UpdateEncounter(
      env.EncounterId,
      this.Encounter.GetPlayerView()
    );

    CurrentSettings.subscribe(v => {
      this.PlayerViewClient.UpdateSettings(env.EncounterId, v.PlayerView);
      this.PlayerViewClient.UpdateEncounter(
        env.EncounterId,
        this.Encounter.GetPlayerView()
      );
    });
  }

  private didLoadAutosave = false;

  public LoadAutoSavedEncounterIfAvailable(): void {
    if (this.didLoadAutosave) {
      return;
    }
    this.didLoadAutosave = true;

    const autosavedEncounter = LegacySynchronousLocalStore.Load(
      LegacySynchronousLocalStore.AutoSavedEncounters,
      LegacySynchronousLocalStore.DefaultSavedEncounterId
    );

    if (autosavedEncounter) {
      const updatedState = UpdateLegacyEncounterState(autosavedEncounter);

      this.Encounter.LoadEncounterState(
        updatedState,
        this.LibrariesCommander.UpdatePersistentCharacter,
        this.Libraries.PersistentCharacters
      );
    }

    this.Encounter.StartEncounterAutosaves();
  }

  private showPrivacyNotificationAfterTutorial() {
    this.TutorialVisible.subscribe(v => {
      if (v == false) {
        this.displayBetaWarningIfNeeded();
        this.displayPrivacyNotificationIfNeeded();
      }
    });
  }

  private displayBetaWarningIfNeeded = () => {
    if (
      LegacySynchronousLocalStore.Load(
        LegacySynchronousLocalStore.User,
        "AcknowledgedBetaWarning"
      ) == null
    ) {
      this.PromptQueue.Add(BetaDataWarningPrompt());
    }
  };

  private buildCombatantViewModel = (combatant: Combatant) => {
    const vm = new CombatantViewModel(
      combatant,
      this.CombatantCommander,
      this.PromptQueue.Add,
      this.EventLog.AddEvent
    );
    return vm;
  };

  private displayPrivacyNotificationIfNeeded = () => {
    if (
      LegacySynchronousLocalStore.Load(
        LegacySynchronousLocalStore.User,
        "AllowTracking"
      ) == null
    ) {
      this.ReviewPrivacyPolicy();
    }
  };

  public SaveUpdatedSettings(newSettings: Settings): void {
    CurrentSettings(newSettings);
    Metrics.TrackEvent(Metrics.Event.SettingsSaved, newSettings);
    LegacySynchronousLocalStore.Save(
      LegacySynchronousLocalStore.User,
      "Settings",
      newSettings
    );
    new AccountClient().SaveSettings(newSettings);
  }
}
