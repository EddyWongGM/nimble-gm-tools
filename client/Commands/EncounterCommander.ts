import * as ko from "knockout";
import * as _ from "lodash";

import { CombatStats } from "../../common/CombatStats";
import { PostCombatStatsOption } from "../../common/Settings";
import { UpdateLegacySavedEncounter } from "../Encounter/UpdateLegacySavedEncounter";
import { env } from "../Environment";
import { CurrentSettings } from "../Settings/Settings";
import { TrackerViewModel } from "../TrackerViewModel";
import { NotifyTutorialOfAction } from "../Tutorial/NotifyTutorialOfAction";
import { Metrics } from "../Utility/Metrics";
import { CombatStatsPrompt } from "../Prompts/CombatStatsPrompt";
import { InitiativePrompt } from "../Prompts/InitiativePrompt";
import { PlayerViewPrompt } from "../Prompts/PlayerViewPrompt";
import { QuickAddPrompt } from "../Prompts/QuickAddPrompt";
import { RollDicePrompt } from "../Prompts/RollDicePrompt";
import { ScenePrompt } from "../Prompts/ScenePrompt";
import { ToggleFullscreen } from "./ToggleFullscreen";
import { PersistentCharacter } from "../../common/PersistentCharacter";
import { SavedScene } from "../../common/PlayerViewSettings";
import { ConfirmAndShutdownServer } from "../Utility/ShutdownServer";

export class EncounterCommander {
  // Tracks the currently displayed scene reveal card, if any, so clicking a
  // new scene replaces it instead of stacking cards, and so dismissing it
  // (by the checkmark, by pressing Escape, or by the Dismiss Scene button
  // in the Scenes tab) reliably un-hides combatants and clears the
  // background, regardless of which path removed the prompt from the queue.
  private currentScenePromptId: string | null = null;

  // Lets the Scenes tab show a "Dismiss Scene" action on whichever scene's
  // row is currently live, without threading the encounter state through it.
  public ActiveSceneId = ko.observable<string | null>(null);

  constructor(private tracker: TrackerViewModel) {
    this.tracker.PromptQueue.GetPrompts.subscribe(prompts => {
      if (
        this.currentScenePromptId &&
        !prompts.some(([, id]) => id === this.currentScenePromptId)
      ) {
        this.currentScenePromptId = null;
        this.ActiveSceneId(null);
        this.tracker.Encounter.CombatantsHidden(false);
        this.tracker.Encounter.TemporaryBackgroundImageUrl(null);
        this.tracker.Encounter.TemporaryBackgroundImageFit("cover");
        Metrics.TrackEvent(Metrics.Event.SceneDismissed);
      }
    });
  }

  public QuickAddStatBlock = (): void => {
    const prompt = QuickAddPrompt(
      this.tracker.Encounter.AddCombatantFromStatBlock
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public ShowLibraries = (): void => this.tracker.LibrariesVisible(true);
  public HideLibraries = (): void => this.tracker.LibrariesVisible(false);

  public ToggleLibraryManager = (): void => this.tracker.ToggleLibraryManager();

  public LaunchPlayerView = (): void => {
    const prompt = PlayerViewPrompt(
      env.EncounterId,
      this.tracker.Encounter.TemporaryBackgroundImageUrl() ?? "",
      this.ApplyScene,
      this.requestCustomEncounterIdAndUpdateEncounter
    );
    this.tracker.PromptQueue.Add(prompt);

    Metrics.TrackEvent(Metrics.Event.PlayerViewLaunched, {
      id: env.EncounterId
    });
  };

  public ApplyScene = (imageUrl: string): void => {
    // Removing an active scene's card here (rather than leaving it orphaned)
    // triggers the same PromptQueue-subscribe cleanup DismissScene does -
    // un-hiding combatants - before this method's own lines below set the
    // final background/Fit/ActiveSceneId state.
    if (this.currentScenePromptId) {
      this.tracker.PromptQueue.Remove(this.currentScenePromptId);
    }

    this.tracker.Encounter.TemporaryBackgroundImageUrl(imageUrl);
    this.tracker.Encounter.TemporaryBackgroundImageFit("cover");
    this.ActiveSceneId(null);
    Metrics.TrackEvent(Metrics.Event.SceneApplied);
  };

  public ShowScene = (scene: SavedScene): void => {
    if (this.currentScenePromptId) {
      this.tracker.PromptQueue.Remove(this.currentScenePromptId);
    }

    this.tracker.Encounter.TemporaryBackgroundImageUrl(scene.ImageUrl);
    this.tracker.Encounter.TemporaryBackgroundImageFit(scene.Fit ?? "cover");
    this.tracker.Encounter.CombatantsHidden(true);
    this.ActiveSceneId(scene.Id);
    this.currentScenePromptId = this.tracker.PromptQueue.Add(
      ScenePrompt(scene)
    );

    Metrics.TrackEvent(Metrics.Event.SceneApplied, { name: scene.Name });
  };

  /** Dismisses the currently active scene's card, same as its checkmark. */
  public DismissScene = (): void => {
    if (this.currentScenePromptId) {
      this.tracker.PromptQueue.Remove(this.currentScenePromptId);
    }
  };

  public ToggleCombatantsHiddenInPlayerView = (): void => {
    this.tracker.Encounter.ToggleCombatantsHidden();
    this.tracker.EventLog.AddEvent(
      this.tracker.Encounter.CombatantsHidden()
        ? "Names hidden from player view."
        : "Names shown in player view."
    );
    Metrics.TrackEvent(Metrics.Event.CombatantsHiddenInPlayerViewToggled);
  };

  private requestCustomEncounterIdAndUpdateEncounter = async (
    requestedId: string
  ) => {
    const didGrantId =
      await this.tracker.PlayerViewClient.RequestCustomEncounterId(requestedId);

    if (didGrantId) {
      env.EncounterId = requestedId;
      const settings = CurrentSettings();
      settings.PlayerView.CustomEncounterId = requestedId;
      this.tracker.SaveUpdatedSettings(settings);
      this.tracker.PlayerViewClient.UpdateEncounter(
        requestedId,
        this.tracker.Encounter.GetPlayerView()
      );
    }

    return didGrantId;
  };

  public ToggleFullScreen = (): boolean => {
    ToggleFullscreen();
    Metrics.TrackEvent(Metrics.Event.FullscreenToggled);
    return false;
  };

  public ShowSettings = (): void => {
    NotifyTutorialOfAction("ShowSettings");
    this.tracker.SettingsVisible(true);
    Metrics.TrackEvent(Metrics.Event.SettingsOpened);
  };

  public ShutdownServer = (): void => {
    ConfirmAndShutdownServer();
  };

  public ToggleToolbarWidth = (): void => {
    this.tracker.ToolbarWide(!this.tracker.ToolbarWide());
  };

  private ShowInitiativePrompt = (): Promise<void> => {
    return new Promise<void>(done => {
      this.tracker.PromptQueue.Add(
        InitiativePrompt(this.tracker.Encounter.Combatants(), () => {
          this.tracker.Encounter.EncounterFlow.StartEncounter();
          done();
        })
      );
    });
  };

  public StartEncounter = (): boolean => {
    if (this.tracker.Encounter.Combatants().length == 0) {
      this.tracker.EventLog.AddEvent("Cannot start empty encounter.");
      return;
    }

    this.HideLibraries();

    if (this.tracker.Encounter.EncounterFlow.State() == "active") {
      return;
    }

    this.ShowInitiativePrompt();

    NotifyTutorialOfAction("ShowInitiativeDialog");

    this.tracker.EventLog.AddEvent("Encounter started.");
    Metrics.TrackEvent(Metrics.Event.EncounterStarted, {
      combatant_count: this.tracker.Encounter.Combatants().length
    });

    return false;
  };

  public EndEncounter = (): boolean => {
    if (this.tracker.Encounter.EncounterFlow.State() == "inactive") {
      return;
    }

    this.tracker.Encounter.EncounterFlow.EndEncounter();
    this.tracker.EventLog.AddEvent("Encounter ended.");
    Metrics.TrackEvent(Metrics.Event.EncounterEnded, {
      combatants: this.tracker.Encounter.Combatants().length
    });

    const displayPostCombatStats =
      CurrentSettings().TrackerView.PostCombatStats;

    if (displayPostCombatStats != PostCombatStatsOption.None) {
      const combatTimer = this.tracker.Encounter.EncounterFlow.CombatTimer;

      const combatStats: CombatStats = {
        elapsedRounds: combatTimer.ElapsedRounds(),
        elapsedSeconds: combatTimer.ElapsedSeconds(),
        combatants: this.tracker.Encounter.Combatants()
          .filter(c => c.IsPlayerCharacter())
          .map(c => ({
            displayName: c.DisplayName(),
            elapsedRounds: c.CombatTimer.ElapsedRounds(),
            elapsedSeconds: c.CombatTimer.ElapsedSeconds()
          }))
      };

      if (
        displayPostCombatStats == PostCombatStatsOption.EncounterViewOnly ||
        displayPostCombatStats == PostCombatStatsOption.Both
      ) {
        const combatStatsPrompt = CombatStatsPrompt(combatStats);
        this.tracker.PromptQueue.Add(combatStatsPrompt);
      }

      if (
        displayPostCombatStats == PostCombatStatsOption.PlayerViewOnly ||
        displayPostCombatStats == PostCombatStatsOption.Both
      ) {
        this.tracker.Encounter.DisplayPlayerViewCombatStats(combatStats);
      }
    }

    this.tracker.Encounter.Combatants().forEach(c => c.CombatTimer.Stop());
    this.tracker.Encounter.EncounterFlow.CombatTimer.Stop();

    return false;
  };

  public RerollInitiative = async (): Promise<void> => {
    await this.ShowInitiativePrompt();
    Metrics.TrackEvent(Metrics.Event.InitiativeRerolled);
  };

  public GroupAllMonsters = (): boolean => {
    const monsterCombatants = this.tracker
      .CombatantViewModels()
      .filter(c => !c.Combatant.ActsInPlayerPhase());

    if (monsterCombatants.length < 2) {
      this.tracker.EventLog.AddEvent(
        "Need at least two monsters in the encounter to group them."
      );
      return false;
    }

    this.tracker.CombatantCommander.GroupCombatants(monsterCombatants);
    this.tracker.EventLog.AddEvent("Monsters grouped together.");
    Metrics.TrackEvent(Metrics.Event.MonstersGrouped);

    return false;
  };

  public SwapPhaseOrder = (): boolean => {
    this.tracker.Encounter.ToggleMonstersActFirst();

    this.tracker.EventLog.AddEvent(
      this.tracker.Encounter.MonstersActFirst()
        ? "Monsters now act first."
        : "Player characters now act first."
    );
    Metrics.TrackEvent(Metrics.Event.PhaseOrderSwapped);

    return false;
  };

  public ToggleAllMonstersHidden = (): boolean => {
    const monsterCombatants = this.tracker
      .CombatantViewModels()
      .filter(c => !c.Combatant.ActsInPlayerPhase());

    if (monsterCombatants.length === 0) {
      return false;
    }

    const allMonstersAlreadyHidden = monsterCombatants.every(c =>
      c.Combatant.Hidden()
    );

    if (allMonstersAlreadyHidden) {
      // Reveal - but a monster the DM has locked hidden (KeepHidden) stays
      // hidden regardless; that lock is a separate, deliberate override this
      // bulk action must not clobber.
      monsterCombatants
        .filter(c => !c.Combatant.KeepHidden())
        .forEach(c => c.Combatant.Hidden(false));

      this.tracker.EventLog.AddEvent(
        "All monsters revealed in player view (except any locked hidden)."
      );
      Metrics.TrackEvent(Metrics.Event.AllMonstersRevealed);
    } else {
      monsterCombatants.forEach(c => c.Combatant.Hidden(true));

      this.tracker.EventLog.AddEvent("All monsters hidden from player view.");
      Metrics.TrackEvent(Metrics.Event.AllMonstersHidden);
    }

    return false;
  };

  public ClearEncounter = (): boolean => {
    if (confirm("Remove all combatants and end encounter?")) {
      this.tracker.Encounter.ClearEncounter();
      this.tracker.CombatantCommander.Deselect();
      this.tracker.EventLog.AddEvent("All combatants removed from encounter.");
      Metrics.TrackEvent(Metrics.Event.EncounterCleared);
    }

    return false;
  };

  public CleanEncounter = (): boolean => {
    if (confirm("Remove NPCs and end encounter?")) {
      const npcViewModels = this.tracker
        .CombatantViewModels()
        .filter(c => !c.Combatant.ActsInPlayerPhase());
      this.tracker.CombatantCommander.Deselect();
      this.tracker.Encounter.EncounterFlow.EndEncounter();
      npcViewModels.forEach(vm =>
        this.tracker.Encounter.RemoveCombatant(vm.Combatant)
      );
      this.tracker.Encounter.CombatantCountsByName({});
      this.tracker.Encounter.SaveEncounterDefaults(null);
      Metrics.TrackEvent(Metrics.Event.EncounterCleaned);
    }

    return false;
  };

  public RestoreAllPlayerCharacterHP = (): void => {
    const playerCharacters = this.tracker.Encounter.Combatants().filter(c =>
      c.IsPlayerCharacter()
    );
    playerCharacters.forEach(pc => pc.CurrentHP(pc.MaxHP()));
    this.tracker.EventLog.AddEvent("All player character HP was restored.");
    Metrics.TrackEvent(Metrics.Event.AllPlayerCharacterHpRestored);
  };

  public LoadSavedEncounter = async (
    legacySavedEncounter: Record<string, any>
  ): Promise<void> => {
    const savedEncounter = UpdateLegacySavedEncounter(legacySavedEncounter);
    this.tracker.Encounter.SaveEncounterDefaults({
      Name: savedEncounter.Name,
      Path: savedEncounter.Path
    });

    const nonCharacterCombatants = savedEncounter.Combatants.filter(
      c => !c.PersistentCharacterId
    );

    const nonCharacterCombatantsInLabelOrder = _.sortBy(
      nonCharacterCombatants,
      c => c.IndexLabel
    );

    nonCharacterCombatantsInLabelOrder.forEach(
      this.tracker.Encounter.AddCombatantFromState
    );

    const persistentCharacters = savedEncounter.Combatants.filter(
      c => c.PersistentCharacterId
    );

    const persistentCharactersPromise = persistentCharacters.map(
      pc =>
        new Promise<void>(async resolve => {
          const persistentCharacterListing =
            await this.tracker.Libraries.PersistentCharacters.GetOrCreateListingById(
              pc.PersistentCharacterId
            );
          const persistentCharacter =
            await persistentCharacterListing.GetWithTemplate(
              PersistentCharacter.Default()
            );
          this.tracker.Encounter.AddCombatantFromPersistentCharacter(
            persistentCharacter,
            this.tracker.LibrariesCommander.UpdatePersistentCharacter,
            pc.Hidden,
            pc.Initiative
          );
          resolve();
        })
    );

    if (this.currentScenePromptId) {
      this.tracker.PromptQueue.Remove(this.currentScenePromptId);
    }

    this.tracker.Encounter.TemporaryBackgroundImageUrl(
      savedEncounter.BackgroundImageUrl
    );
    this.tracker.Encounter.TemporaryBackgroundImageFit("cover");

    Metrics.TrackEvent(Metrics.Event.EncounterLoaded, {
      name: savedEncounter.Name,
      combatants: savedEncounter.Combatants.map(c => c.StatBlock.Name)
    });

    await Promise.all(persistentCharactersPromise);

    this.tracker.Encounter.SortByInitiative(true);
  };

  public NextTurn = async (): Promise<boolean> => {
    if (this.tracker.Encounter.EncounterFlow.State() != "active") {
      this.StartEncounter();
      return;
    }

    if (this.tracker.Encounter.Combatants().length == 0) {
      return;
    }

    if (!this.tracker.Encounter.EncounterFlow.ActiveCombatant()) {
      this.tracker.Encounter.EncounterFlow.ActiveCombatant(
        this.tracker.Encounter.Combatants()[0]
      );
      return;
    }

    const turnEndCombatant =
      this.tracker.Encounter.EncounterFlow.ActiveCombatant();
    if (turnEndCombatant) {
      Metrics.TrackEvent(Metrics.Event.TurnCompleted, {
        name: turnEndCombatant.DisplayName()
      });
    }

    await this.tracker.Encounter.EncounterFlow.NextTurn(this.RerollInitiative);

    const turnStartCombatant =
      this.tracker.Encounter.EncounterFlow.ActiveCombatant();
    this.tracker.EventLog.AddEvent(
      `Start of turn for ${turnStartCombatant.DisplayName()}.`
    );

    return false;
  };

  public PreviousTurn = (): boolean => {
    if (!this.tracker.Encounter.EncounterFlow.ActiveCombatant()) {
      return;
    }

    this.tracker.Encounter.EncounterFlow.PreviousTurn();
    const currentCombatant =
      this.tracker.Encounter.EncounterFlow.ActiveCombatant();
    this.tracker.EventLog.AddEvent(
      `Initiative rewound to ${currentCombatant.DisplayName()}.`
    );

    return false;
  };

  public PromptRollDice = (): void => {
    this.tracker.PromptQueue.Add(
      RollDicePrompt(this.tracker.CombatantCommander.RollDice)
    );
  };
}
