import * as ko from "knockout";
import * as _ from "lodash";

import { CombatantCommander } from "../Commands/CombatantCommander";
import { ConcentrationTagText } from "../Prompts/ConcentrationPrompt";
import { CurrentSettings } from "../Settings/Settings";
import { Metrics } from "../Utility/Metrics";
import { Combatant } from "./Combatant";
import { Tag } from "./Tag";
import { TagState } from "../../common/CombatantState";
import { EditInitiativePrompt } from "../Prompts/EditInitiativePrompt";
import { PromptProps } from "../Prompts/PendingPrompts";
import { EditAliasPrompt } from "../Prompts/EditAliasPrompt";

const animatedCombatantIds = ko.observableArray<string>([]);

export class CombatantViewModel {
  public HP: ko.PureComputed<string>;
  public HPPercentage: ko.PureComputed<string>;
  public Mana: ko.PureComputed<string>;
  public ManaPercentage: ko.PureComputed<string>;
  public Resources: ko.PureComputed<string>;
  public ResourcesPercentage: ko.PureComputed<string>;
  public HitDice: ko.PureComputed<string>;
  public HitDicePercentage: ko.PureComputed<string>;
  public Wounds: ko.PureComputed<string>;
  public WoundsPercentage: ko.PureComputed<string>;
  public Gold: ko.PureComputed<string>;
  public Name: ko.PureComputed<string>;

  constructor(
    public Combatant: Combatant,
    public CombatantCommander: CombatantCommander,
    public EnqueuePrompt: (prompt: PromptProps<any>) => void,
    public LogEvent: (message: string) => void
  ) {
    this.HP = ko.pureComputed(() => {
      if (this.Combatant.TemporaryHP()) {
        return `${this.Combatant.CurrentHP()}+${this.Combatant.TemporaryHP()}/${this.Combatant.MaxHP()}`;
      } else {
        return `${this.Combatant.CurrentHP()}/${this.Combatant.MaxHP()}`;
      }
    });
    this.HPPercentage = ko.pureComputed(() => {
      return (
        Math.floor(
          (this.Combatant.CurrentHP() / this.Combatant.MaxHP()) * 100
        ) + "%"
      );
    });
    this.Mana = ko.pureComputed(() => {
      const maxMana = this.Combatant.MaxMana();
      if (maxMana === undefined) {
        return null;
      }
      return `${this.Combatant.CurrentMana()}/${maxMana}`;
    });
    this.ManaPercentage = ko.pureComputed(() => {
      const maxMana = this.Combatant.MaxMana();
      if (!maxMana) {
        return "0%";
      }
      return (
        Math.floor((this.Combatant.CurrentMana() / maxMana) * 100) + "%"
      );
    });
    this.Resources = ko.pureComputed(() => {
      const maxResources = this.Combatant.MaxResources();
      if (maxResources === undefined) {
        return null;
      }
      return `${this.Combatant.CurrentResources()}/${maxResources}`;
    });
    this.ResourcesPercentage = ko.pureComputed(() => {
      const maxResources = this.Combatant.MaxResources();
      if (!maxResources) {
        return "0%";
      }
      return (
        Math.floor(
          (this.Combatant.CurrentResources() / maxResources) * 100
        ) + "%"
      );
    });
    this.HitDice = ko.pureComputed(() => {
      const maxHitDice = this.Combatant.MaxHitDice();
      if (maxHitDice === undefined) {
        return null;
      }
      return `${this.Combatant.CurrentHitDice()}/${maxHitDice}`;
    });
    this.HitDicePercentage = ko.pureComputed(() => {
      const maxHitDice = this.Combatant.MaxHitDice();
      if (!maxHitDice) {
        return "0%";
      }
      return (
        Math.floor((this.Combatant.CurrentHitDice() / maxHitDice) * 100) + "%"
      );
    });
    this.Wounds = ko.pureComputed(() => {
      const maxWounds = this.Combatant.MaxWounds();
      if (maxWounds === undefined) {
        return null;
      }
      return `${this.Combatant.CurrentWounds()}/${maxWounds}`;
    });
    this.WoundsPercentage = ko.pureComputed(() => {
      const maxWounds = this.Combatant.MaxWounds();
      if (!maxWounds) {
        return "0%";
      }
      return (
        Math.floor((this.Combatant.CurrentWounds() / maxWounds) * 100) + "%"
      );
    });
    this.Gold = ko.pureComputed(() => {
      if (!this.Combatant.IsPlayerCharacter()) {
        return null;
      }
      return `${this.Combatant.CurrentGold()}`;
    });
    this.Name = Combatant.DisplayName;
    setTimeout(() => animatedCombatantIds.push(this.Combatant.Id), 500);
  }

  public ApplyDamage(inputDamage: string) {
    const damage = parseInt(inputDamage),
      healing = -damage,
      shouldAutoCheckConcentration =
        CurrentSettings().Rules.AutoCheckConcentration;

    if (isNaN(damage)) {
      return;
    }

    if (damage > 0) {
      Metrics.TrackEvent(Metrics.Event.DamageApplied, {
        amount: damage.toString()
      });
      if (
        shouldAutoCheckConcentration &&
        this.Combatant.Tags().some(t => t.Text === ConcentrationTagText)
      ) {
        this.CombatantCommander.CheckConcentration(this.Combatant, damage);
      }
      this.Combatant.ApplyDamage(damage);
    } else {
      this.Combatant.ApplyHealing(healing);
    }
  }

  public ApplyManaChange(inputAmount: string) {
    const amount = parseInt(inputAmount);
    if (isNaN(amount)) {
      return;
    }

    this.Combatant.ApplyManaChange(amount);
  }

  public ApplyResourcesChange(inputAmount: string) {
    const amount = parseInt(inputAmount);
    if (isNaN(amount)) {
      return;
    }

    this.Combatant.ApplyResourcesChange(amount);
  }

  public ApplyHitDiceChange(inputAmount: string) {
    const amount = parseInt(inputAmount);
    if (isNaN(amount)) {
      return;
    }

    this.Combatant.ApplyHitDiceChange(amount);
  }

  public ApplyWoundsChange(inputAmount: string) {
    const amount = parseInt(inputAmount);
    if (isNaN(amount)) {
      return;
    }

    this.Combatant.ApplyWoundsChange(amount);
  }

  public ApplyGoldChange(inputAmount: string) {
    const amount = parseInt(inputAmount);
    if (isNaN(amount)) {
      return;
    }

    this.Combatant.ApplyGoldChange(amount);
  }

  public ApplyTemporaryHP(newTemporaryHP: number) {
    if (isNaN(newTemporaryHP)) {
      return;
    }

    this.Combatant.ApplyTemporaryHP(newTemporaryHP);
  }

  public ApplyTemporaryMana(newTemporaryMana: number) {
    if (isNaN(newTemporaryMana)) {
      return;
    }

    this.Combatant.ApplyTemporaryMana(newTemporaryMana);
  }

  public ApplyTemporaryResources(newTemporaryResources: number) {
    if (isNaN(newTemporaryResources)) {
      return;
    }

    this.Combatant.ApplyTemporaryResources(newTemporaryResources);
  }

  public ApplyTemporaryHitDice(newTemporaryHitDice: number) {
    if (isNaN(newTemporaryHitDice)) {
      return;
    }

    this.Combatant.ApplyTemporaryHitDice(newTemporaryHitDice);
  }

  public ApplyTemporaryWounds(newTemporaryWounds: number) {
    if (isNaN(newTemporaryWounds)) {
      return;
    }

    this.Combatant.ApplyTemporaryWounds(newTemporaryWounds);
  }

  public ApplyInitiative(initiative: number) {
    this.Combatant.Initiative(initiative);
    this.Combatant.Encounter.SortByInitiative(true);
  }

  public EditInitiative() {
    const prompt = EditInitiativePrompt(this.Combatant, model => {
      if (model.initiativeRoll) {
        if (model.breakLink) {
          this.Combatant.InitiativeGroup(null);
          this.Combatant.Encounter.CleanInitiativeGroups();
        }
        this.ApplyInitiative(model.initiativeRoll);
        this.LogEvent(
          `${this.Name()} initiative set to ${model.initiativeRoll}.`
        );
        Metrics.TrackEvent(Metrics.Event.InitiativeSet, {
          name: this.Name()
        });
        return true;
      }
      return false;
    });

    this.EnqueuePrompt(prompt);
  }

  public SetAlias() {
    const currentName = this.Combatant.DisplayName();
    const prompt = EditAliasPrompt(this.Combatant, model => {
      this.Combatant.Alias(model.alias);
      if (model.alias) {
        this.LogEvent(`${currentName} alias changed to ${model.alias}.`);
        Metrics.TrackEvent(Metrics.Event.AliasSet, {
          statblock_name: this.Combatant.StatBlock().Name,
          alias: model.alias
        });
      } else {
        this.LogEvent(`${currentName} alias removed.`);
      }
      return true;
    });
    this.EnqueuePrompt(prompt);
  }

  public ToggleSpentReaction(): void {
    if (this.Combatant.ReactionsSpent() == 0) {
      this.Combatant.ReactionsSpent(1);
    } else {
      this.Combatant.ReactionsSpent(0);
    }
  }

  public ToggleHasTakenTurn(): void {
    this.Combatant.HasTakenTurn(!this.Combatant.HasTakenTurn());
  }

  public ToggleHidden() {
    if (this.Combatant.Hidden()) {
      this.Combatant.Hidden(false);
      this.LogEvent(`${this.Name()} revealed in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantRevealed, {
        name: this.Name()
      });
    } else {
      this.Combatant.Hidden(true);
      this.LogEvent(`${this.Name()} hidden in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantHidden, {
        name: this.Name()
      });
    }
  }

  public ToggleKeepHidden() {
    if (this.Combatant.KeepHidden()) {
      this.Combatant.KeepHidden(false);
      this.LogEvent(`${this.Name()} no longer locked hidden.`);
      Metrics.TrackEvent(Metrics.Event.CombatantKeepHiddenUnlocked, {
        name: this.Name()
      });
    } else {
      this.Combatant.KeepHidden(true);
      this.LogEvent(
        `${this.Name()} locked hidden - "Reveal All Monsters" won't reveal them.`
      );
      Metrics.TrackEvent(Metrics.Event.CombatantKeepHiddenLocked, {
        name: this.Name()
      });
    }
  }

  public ToggleRevealedAC() {
    if (this.Combatant.RevealedAC()) {
      this.Combatant.RevealedAC(false);
      this.LogEvent(`${this.Name()} AC hidden in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantAcHidden, {
        name: this.Name()
      });
    } else {
      this.Combatant.RevealedAC(true);
      this.LogEvent(`${this.Name()} AC revealed in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantAcRevealed, {
        name: this.Name()
      });
    }
  }

  public ToggleRevealedHitDice() {
    if (this.Combatant.RevealedHitDice()) {
      this.Combatant.RevealedHitDice(false);
      this.LogEvent(`${this.Name()} Hit Dice hidden in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantHitDiceHidden, {
        name: this.Name()
      });
    } else {
      this.Combatant.RevealedHitDice(true);
      this.LogEvent(`${this.Name()} Hit Dice revealed in player view.`);
      Metrics.TrackEvent(Metrics.Event.CombatantHitDiceRevealed, {
        name: this.Name()
      });
    }
  }

  public RemoveTag = (tag: Tag) => {
    this.Combatant.Tags.splice(this.Combatant.Tags.indexOf(tag), 1);
    this.LogEvent(`${this.Name()} removed tag: "${tag.Text}"`);
  };

  public RemoveTagByState = (tagState: TagState) => {
    const tag = this.Combatant.Tags().find(t =>
      _.isEqual(tagState, t.GetState())
    );
    if (tag !== undefined) {
      this.Combatant.Tags.remove(tag);
    }
  };
}
