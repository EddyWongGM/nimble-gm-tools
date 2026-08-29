import * as ko from "knockout";
import * as React from "react";

import {
  CombatantState,
  InventoryItem,
  TagState
} from "../../common/CombatantState";
import { probablyUniqueString } from "../../common/Toolbox";
import { Combatant } from "../Combatant/Combatant";
import { CombatantDetails } from "../Combatant/CombatantDetails";
import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { MultipleCombatantDetails } from "../Combatant/MultipleCombatantDetails";
import { Dice } from "../Rules/Dice";
import { RollResult } from "../Rules/RollResult";
import { CurrentSettings } from "../Settings/Settings";
import { TrackerViewModel } from "../TrackerViewModel";
import { Metrics } from "../Utility/Metrics";
import { BuildCombatantCommandList } from "./BuildCombatantCommandList";
import { Command } from "./Command";
import { AcceptDamagePrompt } from "../Prompts/AcceptDamagePrompt";
import { AcceptTagPrompt } from "../Prompts/AcceptTagPrompt";
import { ApplyDamagePrompt } from "../Prompts/ApplyDamagePrompt";
import { ApplyHealingPrompt } from "../Prompts/ApplyHealingPrompt";
import { ApplyManaPrompt } from "../Prompts/ApplyManaPrompt";
import { RestoreManaPrompt } from "../Prompts/RestoreManaPrompt";
import { ApplyResourcesPrompt } from "../Prompts/ApplyResourcesPrompt";
import { RestoreResourcesPrompt } from "../Prompts/RestoreResourcesPrompt";
import { ApplyHitDicePrompt } from "../Prompts/ApplyHitDicePrompt";
import { RestoreHitDicePrompt } from "../Prompts/RestoreHitDicePrompt";
import { ApplyWoundsPrompt } from "../Prompts/ApplyWoundsPrompt";
import { RestoreWoundsPrompt } from "../Prompts/RestoreWoundsPrompt";
import { ApplyGoldPrompt } from "../Prompts/ApplyGoldPrompt";
import { SubtractGoldPrompt } from "../Prompts/SubtractGoldPrompt";
import { ConcentrationPrompt } from "../Prompts/ConcentrationPrompt";
import { ShowDiceRollPrompt } from "../Prompts/RollDicePrompt";
import { TagPrompt } from "../Prompts/TagPrompt";
import { ItemPrompt } from "../Prompts/ItemPrompt";
import { RemoveItemPrompt } from "../Prompts/RemoveItemPrompt";
import { InventoryCardPrompt } from "../Prompts/InventoryCardPrompt";
import { UpdateNotesPrompt } from "../Prompts/UpdateNotesPrompt";
import { ApplyTemporaryHPPrompt } from "../Prompts/ApplyTemporaryHPPrompt";
import { ApplyTemporaryManaPrompt } from "../Prompts/ApplyTemporaryManaPrompt";
import { ApplyTemporaryResourcesPrompt } from "../Prompts/ApplyTemporaryResourcesPrompt";
import { ApplyTemporaryHitDicePrompt } from "../Prompts/ApplyTemporaryHitDicePrompt";
import { ApplyTemporaryWoundsPrompt } from "../Prompts/ApplyTemporaryWoundsPrompt";
import { TextEnricherContext } from "../TextEnricher/TextEnricher";
import { QuickEditStatBlockPrompt } from "../Prompts/QuickEditStatBlockPrompt";

export class CombatantCommander {
  private selectedCombatantIds = ko.observableArray<string>([]);
  private latestRoll: RollResult;
  public InventoryDisplayedCombatantId = ko.observable<string>(null);
  public InventoryDisplayedCombatantName = ko.observable<string>(null);

  constructor(private tracker: TrackerViewModel) {
    this.Commands = BuildCombatantCommandList(this);
  }

  public Commands: Command[];
  public SelectedCombatants = ko.pureComputed<CombatantViewModel[]>(() => {
    const selectedCombatantIds = this.selectedCombatantIds();
    return this.tracker
      .CombatantViewModels()
      .filter(c => selectedCombatantIds.some(id => c.Combatant.Id == id));
  });
  public HasSelected = ko.pureComputed(
    () => this.SelectedCombatants().length > 0
  );
  public HasOneSelected = ko.pureComputed(
    () => this.SelectedCombatants().length === 1
  );
  public HasMultipleSelected = ko.pureComputed(
    () => this.SelectedCombatants().length > 1
  );

  public CombatantDetails = ko.pureComputed(() => {
    const selectedCombatants = this.SelectedCombatants();
    if (!this.HasSelected()) {
      return null;
    }

    if (this.HasOneSelected()) {
      const combatantViewModel = selectedCombatants[0];
      return (
        <TextEnricherContext.Provider
          value={this.tracker.StatBlockTextEnricher}
        >
          <CombatantDetails
            combatantViewModel={combatantViewModel}
            displayMode="default"
            key={combatantViewModel.Combatant.Id}
          />
        </TextEnricherContext.Provider>
      );
    } else {
      return (
        <TextEnricherContext.Provider
          value={this.tracker.StatBlockTextEnricher}
        >
          <MultipleCombatantDetails combatants={selectedCombatants} />
        </TextEnricherContext.Provider>
      );
    }
  });

  public Select = (data: CombatantViewModel, appendSelection?: boolean) => {
    if (!data) {
      return;
    }
    const combatantsToRemainSelected = appendSelection
      ? this.selectedCombatantIds()
      : [];

    const allSelected = [...combatantsToRemainSelected, data.Combatant.Id];

    this.selectedCombatantIds(allSelected);

    Metrics.TrackEvent(Metrics.Event.CombatantsSelected, {
      count: this.selectedCombatantIds().length
    });
  };

  private selectByOffset = (offset: number) => {
    let newIndex =
      this.tracker.CombatantViewModels().indexOf(this.SelectedCombatants()[0]) +
      offset;
    if (newIndex < 0) {
      newIndex = 0;
    } else if (newIndex >= this.tracker.CombatantViewModels().length) {
      newIndex = this.tracker.CombatantViewModels().length - 1;
    }
    this.selectedCombatantIds.removeAll();
    this.selectedCombatantIds.push(
      this.tracker.CombatantViewModels()[newIndex].Combatant.Id
    );
  };

  public Remove = async () => {
    if (!this.HasSelected()) {
      return;
    }

    const combatantsToRemove = this.SelectedCombatants();
    this.selectedCombatantIds.removeAll();
    const firstDeletedIndex = this.tracker
      .CombatantViewModels()
      .indexOf(combatantsToRemove[0]);
    const deletedCombatantNames = combatantsToRemove.map(
      c => c.Combatant.StatBlock().Name
    );

    if (this.tracker.CombatantViewModels().length > combatantsToRemove.length) {
      let activeCombatant =
        this.tracker.Encounter.EncounterFlow.ActiveCombatant();
      while (combatantsToRemove.some(c => c.Combatant === activeCombatant)) {
        await this.tracker.Encounter.EncounterFlow.NextTurn(
          this.tracker.EncounterCommander.RerollInitiative
        );
        activeCombatant =
          this.tracker.Encounter.EncounterFlow.ActiveCombatant();
      }
    }

    combatantsToRemove.forEach(vm =>
      this.tracker.Encounter.RemoveCombatant(vm.Combatant)
    );

    const remainingCombatants = this.tracker.CombatantViewModels();
    if (remainingCombatants.length > 0) {
      const newSelectionIndex =
        firstDeletedIndex > remainingCombatants.length
          ? remainingCombatants.length - 1
          : firstDeletedIndex;
      this.Select(this.tracker.CombatantViewModels()[newSelectionIndex]);
    }

    this.tracker.EventLog.AddEvent(
      `${deletedCombatantNames.join(", ")} removed from encounter.`
    );
    Metrics.TrackEvent(Metrics.Event.CombatantsRemoved, {
      names: deletedCombatantNames
    });
  };

  public FlushCombatants = () => {
    this.tracker.Encounter.FlushCombatants();
  };

  public RestoreCombatants = () => {
    this.tracker.Encounter.RestoreCombatants();
  };

  public Deselect = () => {
    this.selectedCombatantIds([]);
  };

  public SelectPrevious = () => {
    if (this.tracker.CombatantViewModels().length == 0) {
      return;
    }

    if (!this.HasSelected()) {
      this.Select(this.tracker.CombatantViewModels()[0]);
      return;
    }

    this.selectByOffset(-1);
  };

  public SelectNext = () => {
    if (this.tracker.CombatantViewModels().length == 0) {
      return;
    }

    if (!this.HasSelected()) {
      this.Select(this.tracker.CombatantViewModels()[0]);
      return;
    }

    this.selectByOffset(1);
  };

  private applyDamageForCombatants(combatantViewModels: CombatantViewModel[]) {
    const latestRollTotal = this.latestRoll?.Total || 0;
    const prompt = ApplyDamagePrompt(
      combatantViewModels,
      latestRollTotal.toString(),
      this.tracker.EventLog.LogHPChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public ApplyDamage = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyDamageForCombatants(selectedCombatants);
  };

  public ApplyDamageTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyDamageForCombatants([combatantViewModel]);
  };

  public ApplyHealing = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const latestRollTotal = this.latestRoll?.Total || 0;
    const prompt = ApplyHealingPrompt(
      selectedCombatants,
      latestRollTotal.toString(),
      this.tracker.EventLog.LogHPChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  private applyManaForCombatants(combatantViewModels: CombatantViewModel[]) {
    const prompt = ApplyManaPrompt(
      combatantViewModels,
      "",
      this.tracker.EventLog.LogManaChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public SpendMana = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyManaForCombatants(selectedCombatants);
  };

  public SpendManaTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyManaForCombatants([combatantViewModel]);
  };

  public RestoreMana = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const prompt = RestoreManaPrompt(
      selectedCombatants,
      "",
      this.tracker.EventLog.LogManaChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public AddTemporaryMana = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    const combatantNames = selectedCombatants.map(c => c.Name()).join(", ");
    const prompt = ApplyTemporaryManaPrompt(combatantNames, model => {
      if (model.manaAmount) {
        selectedCombatants.forEach(c =>
          c.ApplyTemporaryMana(model.manaAmount)
        );
        this.tracker.EventLog.AddEvent(
          `${model.manaAmount} temporary mana granted to ${combatantNames}.`
        );
        Metrics.TrackEvent(Metrics.Event.TemporaryManaAdded, {
          amount: model.manaAmount
        });
      }
      return true;
    });

    this.tracker.PromptQueue.Add(prompt);

    return false;
  };

  private applyResourcesForCombatants(
    combatantViewModels: CombatantViewModel[]
  ) {
    const prompt = ApplyResourcesPrompt(
      combatantViewModels,
      "",
      this.tracker.EventLog.LogResourcesChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public SpendResources = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyResourcesForCombatants(selectedCombatants);
  };

  public SpendResourcesTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyResourcesForCombatants([combatantViewModel]);
  };

  public RestoreResources = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const prompt = RestoreResourcesPrompt(
      selectedCombatants,
      "",
      this.tracker.EventLog.LogResourcesChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public AddTemporaryResources = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    const combatantNames = selectedCombatants.map(c => c.Name()).join(", ");
    const prompt = ApplyTemporaryResourcesPrompt(combatantNames, model => {
      if (model.resourcesAmount) {
        selectedCombatants.forEach(c =>
          c.ApplyTemporaryResources(model.resourcesAmount)
        );
        this.tracker.EventLog.AddEvent(
          `${model.resourcesAmount} temporary resources granted to ${combatantNames}.`
        );
        Metrics.TrackEvent(Metrics.Event.TemporaryResourcesAdded, {
          amount: model.resourcesAmount
        });
      }
      return true;
    });

    this.tracker.PromptQueue.Add(prompt);

    return false;
  };

  private applyHitDiceForCombatants(
    combatantViewModels: CombatantViewModel[]
  ) {
    const prompt = ApplyHitDicePrompt(
      combatantViewModels,
      "",
      this.tracker.EventLog.LogHitDiceChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public SpendHitDice = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyHitDiceForCombatants(selectedCombatants);
  };

  public SpendHitDiceTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyHitDiceForCombatants([combatantViewModel]);
  };

  public RestoreHitDice = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const prompt = RestoreHitDicePrompt(
      selectedCombatants,
      "",
      this.tracker.EventLog.LogHitDiceChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public AddTemporaryHitDice = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    const combatantNames = selectedCombatants.map(c => c.Name()).join(", ");
    const prompt = ApplyTemporaryHitDicePrompt(combatantNames, model => {
      if (model.hitDiceAmount) {
        selectedCombatants.forEach(c =>
          c.ApplyTemporaryHitDice(model.hitDiceAmount)
        );
        this.tracker.EventLog.AddEvent(
          `${model.hitDiceAmount} temporary hit dice granted to ${combatantNames}.`
        );
        Metrics.TrackEvent(Metrics.Event.TemporaryHitDiceAdded, {
          amount: model.hitDiceAmount
        });
      }
      return true;
    });

    this.tracker.PromptQueue.Add(prompt);

    return false;
  };

  private applyWoundsForCombatants(combatantViewModels: CombatantViewModel[]) {
    const prompt = ApplyWoundsPrompt(
      combatantViewModels,
      "",
      this.tracker.EventLog.LogWoundsChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public SpendWounds = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyWoundsForCombatants(selectedCombatants);
  };

  public SpendWoundsTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyWoundsForCombatants([combatantViewModel]);
  };

  public RestoreWounds = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const prompt = RestoreWoundsPrompt(
      selectedCombatants,
      "",
      this.tracker.EventLog.LogWoundsChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public AddTemporaryWounds = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    const combatantNames = selectedCombatants.map(c => c.Name()).join(", ");
    const prompt = ApplyTemporaryWoundsPrompt(combatantNames, model => {
      if (model.woundsAmount) {
        selectedCombatants.forEach(c =>
          c.ApplyTemporaryWounds(model.woundsAmount)
        );
        this.tracker.EventLog.AddEvent(
          `${model.woundsAmount} points of wound protection granted to ${combatantNames}.`
        );
        Metrics.TrackEvent(Metrics.Event.TemporaryWoundsAdded, {
          amount: model.woundsAmount
        });
      }
      return true;
    });

    this.tracker.PromptQueue.Add(prompt);

    return false;
  };

  private applyGoldForCombatants(combatantViewModels: CombatantViewModel[]) {
    const prompt = ApplyGoldPrompt(
      combatantViewModels,
      "",
      this.tracker.EventLog.LogGoldChange
    );
    this.tracker.PromptQueue.Add(prompt);
  }

  public AddGold = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    this.applyGoldForCombatants(selectedCombatants);
  };

  public AddGoldTargeted = (combatantViewModel: CombatantViewModel) => {
    this.applyGoldForCombatants([combatantViewModel]);
  };

  public SubtractGold = () => {
    if (!this.HasSelected()) {
      return;
    }
    const selectedCombatants = this.SelectedCombatants();
    const prompt = SubtractGoldPrompt(
      selectedCombatants,
      "",
      this.tracker.EventLog.LogGoldChange
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public UpdateNotes = async () => {
    if (!this.HasOneSelected()) {
      return;
    }

    const combatant = this.SelectedCombatants()[0].Combatant;
    this.tracker.PromptQueue.Add(UpdateNotesPrompt(combatant));
    return false;
  };

  public PromptAcceptSuggestedDamage = (
    suggestedCombatants: CombatantViewModel[],
    suggestedDamage: number,
    suggester: string
  ) => {
    const allowPlayerSuggestions =
      CurrentSettings().PlayerView.AllowPlayerSuggestions;

    if (!allowPlayerSuggestions) {
      return false;
    }

    Metrics.TrackEvent(Metrics.Event.DamageSuggested, {
      amount: suggestedDamage
    });

    const prompt = AcceptDamagePrompt(
      suggestedCombatants,
      suggestedDamage,
      suggester,
      this.tracker
    );

    this.tracker.PromptQueue.Add(prompt);
    return false;
  };

  public PromptAcceptSuggestedTag = (
    suggestedCombatant: Combatant,
    suggestedTag: TagState
  ) => {
    const prompt = AcceptTagPrompt(
      suggestedCombatant,
      this.tracker.Encounter,
      suggestedTag
    );

    this.tracker.PromptQueue.Add(prompt);
    return false;
  };

  public CheckConcentration = (combatant: Combatant, damageAmount: number) => {
    setTimeout(() => {
      const prompt = ConcentrationPrompt(combatant, damageAmount);
      this.tracker.PromptQueue.Add(prompt);
      Metrics.TrackEvent(Metrics.Event.ConcentrationCheckTriggered);
    }, 1);
  };

  public AddTemporaryHP = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    const combatantNames = selectedCombatants.map(c => c.Name()).join(", ");
    const prompt = ApplyTemporaryHPPrompt(combatantNames, model => {
      if (model.hpAmount) {
        selectedCombatants.forEach(c => c.ApplyTemporaryHP(model.hpAmount));
        this.tracker.EventLog.AddEvent(
          `${model.hpAmount} temporary hit points granted to ${combatantNames}.`
        );
        Metrics.TrackEvent(Metrics.Event.TemporaryHpAdded, {
          amount: model.hpAmount
        });
      }
      return true;
    });

    this.tracker.PromptQueue.Add(prompt);

    return false;
  };

  public AddTag = (combatantVM?: CombatantViewModel) => {
    let targetCombatants: Combatant[] = [];

    if (combatantVM instanceof CombatantViewModel) {
      targetCombatants = [combatantVM.Combatant];
    } else {
      targetCombatants = this.SelectedCombatants().map(c => c.Combatant);
    }

    if (targetCombatants.length == 0) {
      return;
    }

    const prompt = TagPrompt(
      this.tracker.Encounter,
      targetCombatants,
      this.tracker.EventLog.AddEvent
    );
    this.tracker.PromptQueue.Add(prompt);
    return false;
  };

  public AddItem = (combatantVM?: CombatantViewModel) => {
    let targetCombatants: Combatant[] = [];

    const singleTargetVM =
      combatantVM instanceof CombatantViewModel
        ? combatantVM
        : this.HasOneSelected()
          ? this.SelectedCombatants()[0]
          : undefined;

    if (combatantVM instanceof CombatantViewModel) {
      targetCombatants = [combatantVM.Combatant];
    } else {
      targetCombatants = this.SelectedCombatants().map(c => c.Combatant);
    }

    if (targetCombatants.length == 0) {
      return;
    }

    const prompt = ItemPrompt(
      targetCombatants,
      this.tracker.EventLog.AddEvent,
      singleTargetVM && (() => this.ShowInventoryCard(singleTargetVM.Combatant))
    );
    this.tracker.PromptQueue.Add(prompt);
    return false;
  };

  public AddItemTargeted = (combatantViewModel: CombatantViewModel) => {
    this.AddItem(combatantViewModel);
  };

  public PromptRemoveItem = (combatant: Combatant, item: InventoryItem) => {
    const prompt = RemoveItemPrompt(
      combatant,
      item,
      this.tracker.EventLog.AddEvent
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  private displayInventoryToPlayers = (combatant: Combatant) => {
    this.tracker.Encounter.DisplayPlayerViewInventory(
      combatant.DisplayName(),
      combatant.Items()
    );
    this.InventoryDisplayedCombatantId(combatant.Id);
    this.InventoryDisplayedCombatantName(combatant.DisplayName());
    this.tracker.EventLog.AddEvent(
      `${combatant.DisplayName()}'s inventory shown in Player View.`
    );
  };

  // Shows the combatant's inventory to the DM as a dismissible card and
  // pushes it to the Player View popup at the same time - both the
  // combatant details pane's scroll icon and the Add Item prompt's scroll
  // shortcut trigger this same combined action. Dismissing the card any
  // way - its checkmark button or Escape - dismisses the Player View
  // popup along with it (see InventoryCardPrompt's onSubmit/onCancel) -
  // but only if the popup is still showing *this* combatant: if the DM
  // left this card open and switched the popup to someone else in the
  // meantime (another ShowInventoryCard/ToggleInventoryDisplayToPlayers
  // call), dismissing this stale card must not hide their popup.
  public ShowInventoryCard = (combatant: Combatant) => {
    if (!CurrentSettings().Rules.EnableInventory) {
      return;
    }

    this.displayInventoryToPlayers(combatant);

    const dismissIfStillShowing = () => {
      if (this.InventoryDisplayedCombatantId() === combatant.Id) {
        this.DismissInventoryDisplay();
      }
    };

    const prompt = InventoryCardPrompt(combatant, dismissIfStillShowing);
    this.tracker.PromptQueue.Add(prompt);
  };

  public ToggleInventoryDisplayToPlayers = (
    combatantVM?: CombatantViewModel
  ) => {
    const targetCombatantVM =
      combatantVM instanceof CombatantViewModel
        ? combatantVM
        : this.HasOneSelected()
          ? this.SelectedCombatants()[0]
          : null;

    if (!targetCombatantVM) {
      return false;
    }

    const combatant = targetCombatantVM.Combatant;

    if (this.InventoryDisplayedCombatantId() === combatant.Id) {
      this.DismissInventoryDisplay();
    } else {
      this.displayInventoryToPlayers(combatant);
    }
    return false;
  };

  public DismissInventoryDisplay = () => {
    // Guard on Id, not the display name - an unnamed combatant's
    // DisplayName() is legitimately "", which would make a name-based
    // falsy check bail out and leave the popup stuck open for them.
    if (!this.InventoryDisplayedCombatantId()) {
      return;
    }
    const combatantName = this.InventoryDisplayedCombatantName();
    this.tracker.Encounter.HidePlayerViewInventory();
    this.InventoryDisplayedCombatantId(null);
    this.InventoryDisplayedCombatantName(null);
    this.tracker.EventLog.AddEvent(
      `${combatantName}'s inventory hidden in Player View.`
    );
  };

  public EditInitiative = () => {
    this.SelectedCombatants().forEach(c => c.EditInitiative());
    return false;
  };

  private linkCombatantInitiatives = (
    combatants: CombatantViewModel[],
    resort = true
  ) => {
    const highestInitiative = combatants
      .map(c => c.Combatant.Initiative())
      .sort((a, b) => b - a)[0];
    const initiativeGroup = probablyUniqueString();

    combatants.forEach(s => {
      s.Combatant.Initiative(highestInitiative);
      s.Combatant.InitiativeGroup(initiativeGroup);
    });
    this.tracker.Encounter.CleanInitiativeGroups();

    if (resort) {
      this.tracker.Encounter.SortByInitiative();
    }
    Metrics.TrackEvent(Metrics.Event.InitiativeLinked);
  };

  public GroupCombatants = (combatants: CombatantViewModel[]) => {
    if (combatants.length < 2) {
      return;
    }

    // Skip the usual Dex-bonus-ranked resort - grouping combatants together
    // (e.g. "Group Monsters") should preserve their existing manual/drag
    // order, only clustering them into a contiguous phase block.
    this.linkCombatantInitiatives(combatants, false);
    this.tracker.Encounter.SortByPhase();
  };

  public MoveUp = () => {
    if (!this.HasSelected()) {
      return;
    }

    const combatant = this.SelectedCombatants()[0];
    const index = this.tracker.CombatantViewModels().indexOf(combatant);
    if (combatant && index > 0) {
      const newInitiative = this.tracker.Encounter.MoveCombatant(
        combatant.Combatant,
        index - 1
      );
      this.tracker.EventLog.AddEvent(
        `${combatant.Name()} initiative set to ${newInitiative}.`
      );
    }
  };

  public MoveDown = () => {
    if (!this.HasSelected()) {
      return;
    }

    const combatant = this.SelectedCombatants()[0];
    const index = this.tracker.CombatantViewModels().indexOf(combatant);
    if (combatant && index < this.tracker.CombatantViewModels().length - 1) {
      const newInitiative = this.tracker.Encounter.MoveCombatant(
        combatant.Combatant,
        index + 1
      );
      this.tracker.EventLog.AddEvent(
        `${combatant.Name()} initiative set to ${newInitiative}.`
      );
    }
  };

  public SetAlias = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.SetAlias());
    return false;
  };

  public ToggleSpentReaction = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleSpentReaction());
  };

  public ToggleHidden = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleHidden());
  };

  public ToggleKeepHidden = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleKeepHidden());
  };

  public ToggleRevealedAC = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleRevealedAC());
  };

  public ToggleRevealedGold = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleRevealedGold());
  };

  public ToggleRevealedItems = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleRevealedItems());
  };

  public ToggleRevealedHitDice = () => {
    if (!this.HasSelected()) {
      return;
    }

    this.SelectedCombatants().forEach(c => c.ToggleRevealedHitDice());
  };

  public EditOwnStatBlock = () => {
    if (!this.HasOneSelected()) {
      return;
    }

    const selectedCombatant = this.SelectedCombatants()[0].Combatant;
    if (selectedCombatant.PersistentCharacterId) {
      this.tracker.EditPersistentCharacterStatBlock(
        selectedCombatant.PersistentCharacterId
      );
    } else {
      this.tracker.EditStatBlock({
        editorTarget: "combatant",
        statBlock: selectedCombatant.StatBlock(),
        onSave: newStatBlock => {
          selectedCombatant.StatBlock(newStatBlock);
        },
        onDelete: () => this.Remove()
      });
    }
  };

  public QuickEditOwnStatBlock = () => {
    if (!this.HasOneSelected()) {
      return;
    }

    const selectedCombatant = this.SelectedCombatants()[0].Combatant;

    const prompt = QuickEditStatBlockPrompt(
      selectedCombatant,
      updatedStatBlock => {
        if (selectedCombatant.PersistentCharacterId) {
          this.tracker.LibrariesCommander.UpdatePersistentCharacterStatBlockInLibraryAndEncounter(
            selectedCombatant.PersistentCharacterId,
            updatedStatBlock
          );
        } else {
          selectedCombatant.StatBlock(updatedStatBlock);
        }
      }
    );
    this.tracker.PromptQueue.Add(prompt);
  };

  public RollDice = (diceExpression: string) => {
    const diceRoll = Dice.RollDiceExpression(diceExpression);
    this.latestRoll = diceRoll;
    const prompt = ShowDiceRollPrompt(diceExpression, diceRoll);

    Metrics.TrackEvent(Metrics.Event.DiceRolled, {
      expression: diceExpression,
      result: diceRoll.FormattedString
    });
    this.tracker.PromptQueue.Add(prompt);
  };

  public Duplicate = () => {
    if (!this.HasSelected()) {
      return;
    }

    const selectedCombatants = this.SelectedCombatants();
    selectedCombatants.forEach(c => {
      if (c.Combatant.PersistentCharacterId) {
        return;
      }

      this.tracker.Encounter.AddCombatantFromState({
        ...c.Combatant.GetState(),
        Id: probablyUniqueString()
      });
    });

    this.tracker.EventLog.AddEvent(
      `${selectedCombatants.map(c => c.Name()).join(", ")} duplicated.`
    );
  };
}
