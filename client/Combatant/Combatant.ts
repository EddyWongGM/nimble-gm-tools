import * as ko from "knockout";

import { CombatantState, InventoryItem } from "../../common/CombatantState";
import { InitiativeSpecialRoll, StatBlock } from "../../common/StatBlock";
import { probablyUniqueString } from "../../common/Toolbox";
import { Encounter } from "../Encounter/Encounter";
import { UpdatePersistentCharacter } from "../Library/Libraries";
import { CurrentSettings } from "../Settings/Settings";
import { NotifyTutorialOfAction } from "../Tutorial/NotifyTutorialOfAction";
import { Metrics } from "../Utility/Metrics";
import { CombatTimer } from "../Widgets/CombatTimer";
import { Tag } from "./Tag";
import { GetInventorySlotsUsed } from "./InventorySlots";
import { ApplyResourcePoolChange } from "./ApplyResourcePoolChange";
import { RollResult } from "../Rules/RollResult";
import { AbilityCheckResult } from "../Rules/Rules";
import { AutoGroupInitiativeOption } from "../../common/Settings";

export class Combatant {
  constructor(
    combatantState: CombatantState,
    public Encounter: Encounter
  ) {
    let oldStatBlockName = combatantState.StatBlock.Name;
    this.Id = "" + combatantState.Id; //legacy Id may be a number
    this.PersistentCharacterId = combatantState.PersistentCharacterId || null;

    this.StatBlock(combatantState.StatBlock);

    this.processStatBlock();

    this.StatBlock.subscribe(newStatBlock => {
      this.processStatBlock(oldStatBlockName);
      oldStatBlockName = newStatBlock.Name;
    });

    this.CurrentHP = ko.observable(combatantState.CurrentHP);
    this.CurrentNotes = ko.observable(combatantState.CurrentNotes || "");
    this.CurrentMana = ko.observable(
      combatantState.CurrentMana ?? this.MaxMana() ?? 0
    );
    this.CurrentResources = ko.observable(
      combatantState.CurrentResources ?? this.MaxResources() ?? 0
    );
    this.CurrentHitDice = ko.observable(
      combatantState.CurrentHitDice ?? this.MaxHitDice() ?? 0
    );
    this.CurrentWounds = ko.observable(combatantState.CurrentWounds ?? 0);
    this.CurrentGold = ko.observable(combatantState.CurrentGold ?? 0);

    this.processCombatantState(combatantState);

    this.Initiative.subscribe(newInitiative => {
      const groupId = this.InitiativeGroup();
      if (!this.updatingGroup && groupId) {
        this.updatingGroup = true;
        this.Encounter.Combatants().forEach(combatant => {
          if (combatant.InitiativeGroup() === groupId) {
            combatant.Initiative(newInitiative);
          }
        });
        this.updatingGroup = false;
      }
    });
  }
  public Id = probablyUniqueString();
  public PersistentCharacterId: string | null = null;
  public Alias = ko.observable("");
  public TemporaryHP = ko.observable(0);
  public TemporaryMana = ko.observable(0);
  public TemporaryResources = ko.observable(0);
  public TemporaryHitDice = ko.observable(0);
  public TemporaryWounds = ko.observable(0);
  public Tags = ko.observableArray<Tag>();
  public Items = ko.observableArray<InventoryItem>();
  public Initiative = ko.observable(0);
  public InitiativeGroup = ko.observable<string>(null);
  public StatBlock = ko.observable<StatBlock>(StatBlock.Default());
  public Hidden = ko.observable(false);
  public KeepHidden = ko.observable(false);
  public RevealedAC = ko.observable(false);
  public RevealedHitDice = ko.observable(true);
  public HasTakenTurn = ko.observable(false);
  public IndexLabel = ko.observable(0);
  public Color = ko.observable("");
  public ReactionsSpent = ko.observable(0);
  public IsPendingRemoval = ko.observable(false);

  public CombatTimer = new CombatTimer();

  public CurrentHP: KnockoutObservable<number>;
  public CurrentMana: KnockoutObservable<number>;
  public CurrentResources: KnockoutObservable<number>;
  public CurrentHitDice: KnockoutObservable<number>;
  public CurrentWounds: KnockoutObservable<number>;
  public CurrentGold: KnockoutObservable<number>;
  public CurrentNotes: KnockoutObservable<string>;
  public PlayerDisplayHP: KnockoutComputed<string>;
  private updatingGroup = false;

  private processStatBlock(oldStatBlockName?: string) {
    if (oldStatBlockName !== undefined) {
      this.UpdateIndexLabel(oldStatBlockName);
    }

    this.setAutoInitiativeGroup();
    if (oldStatBlockName !== undefined) {
      this.Encounter.Combatants.notifySubscribers();
    }
  }

  private processCombatantState(savedCombatant: CombatantState) {
    this.IndexLabel(savedCombatant.IndexLabel || 0);
    this.CurrentHP(savedCombatant.CurrentHP);
    this.CurrentNotes(savedCombatant.CurrentNotes || "");
    this.CurrentMana(savedCombatant.CurrentMana ?? this.MaxMana() ?? 0);
    this.CurrentResources(
      savedCombatant.CurrentResources ?? this.MaxResources() ?? 0
    );
    this.CurrentHitDice(
      savedCombatant.CurrentHitDice ?? this.MaxHitDice() ?? 0
    );
    this.CurrentWounds(savedCombatant.CurrentWounds ?? 0);
    this.CurrentGold(savedCombatant.CurrentGold ?? 0);
    this.TemporaryHP(savedCombatant.TemporaryHP);
    this.TemporaryMana(savedCombatant.TemporaryMana ?? 0);
    this.TemporaryResources(savedCombatant.TemporaryResources ?? 0);
    this.TemporaryHitDice(savedCombatant.TemporaryHitDice ?? 0);
    this.TemporaryWounds(savedCombatant.TemporaryWounds ?? 0);
    this.Initiative(savedCombatant.Initiative);
    this.InitiativeGroup(
      savedCombatant.InitiativeGroup || this.InitiativeGroup()
    );
    this.Alias(savedCombatant.Alias);
    this.Tags(Tag.FromTagStates(savedCombatant.Tags, this));
    this.Items(savedCombatant.Items ?? []);
    this.Hidden(savedCombatant.Hidden);
    this.KeepHidden(savedCombatant.KeepHidden ?? false);
    this.RevealedAC(savedCombatant.RevealedAC);
    this.RevealedHitDice(savedCombatant.RevealedHitDice ?? true);
    this.HasTakenTurn(savedCombatant.HasTakenTurn || false);
    this.Color(savedCombatant.Color || "");
    this.ReactionsSpent(savedCombatant.ReactionsSpent || 0);
    this.CombatTimer.SetElapsedRounds(savedCombatant.RoundCounter || 0);
    this.CombatTimer.SetElapsedSeconds(savedCombatant.ElapsedSeconds || 0);
  }

  public AttachToPersistentCharacterLibrary(
    updatePersistentCharacter: UpdatePersistentCharacter
  ) {
    const persistentCharacterId = this.PersistentCharacterId;
    if (persistentCharacterId == null) {
      throw "Combatant is not a persistent character";
    }

    this.CurrentHP.subscribe(async c => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentHP: c
      });
    });

    this.CurrentMana.subscribe(async m => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentMana: m
      });
    });

    this.CurrentResources.subscribe(async r => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentResources: r
      });
    });

    this.CurrentHitDice.subscribe(async h => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentHitDice: h
      });
    });

    this.CurrentWounds.subscribe(async w => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentWounds: w
      });
    });

    this.CurrentGold.subscribe(async g => {
      return await updatePersistentCharacter(persistentCharacterId, {
        CurrentGold: g
      });
    });

    this.CurrentNotes.subscribe(async n => {
      return await updatePersistentCharacter(persistentCharacterId, {
        Notes: n
      });
    });

    this.Tags.subscribe(async tags => {
      // Duration tags are meaningful only within the encounter they were
      // added in (they reference round counts and other combatants' IDs),
      // so only non-expiring tags carry over to the persistent character.
      const persistentTags = tags
        .filter(t => !t.HasDuration)
        .map(t => t.GetState());
      return await updatePersistentCharacter(persistentCharacterId, {
        Tags: persistentTags
      });
    });

    this.Items.subscribe(async items => {
      return await updatePersistentCharacter(persistentCharacterId, {
        Items: items
      });
    });
  }

  public UpdateIndexLabel(oldName?: string) {
    if (
      CurrentSettings().Rules.AlwaysNumberMonsters &&
      !this.ActsInPlayerPhase()
    ) {
      const otherMonsters = this.Encounter.Combatants().filter(
        c => c !== this && !c.ActsInPlayerPhase()
      );
      // A duplicated combatant inherits its source's IndexLabel, which
      // collides with the still-present source - treat that the same as
      // not having a label yet, so it gets its own number.
      const collides = otherMonsters.some(
        c => this.IndexLabel() && c.IndexLabel() === this.IndexLabel()
      );
      if (!this.IndexLabel() || collides) {
        const existingMonsterIndices = otherMonsters.map(
          c => c.IndexLabel() || 0
        );
        this.IndexLabel(Math.max(0, ...existingMonsterIndices) + 1);
      }
      return;
    }

    const name = this.StatBlock().Name;
    const counts = this.Encounter.CombatantCountsByName();
    if (name == oldName) {
      return;
    }
    if (oldName) {
      if (!counts[oldName]) {
        counts[oldName] = 1;
      }
      counts[oldName] = counts[oldName] - 1;
    }
    if (!counts[name]) {
      counts[name] = 1;
    } else {
      counts[name] = counts[name] + 1;
    }

    const displayNameIsTaken = this.Encounter.Combatants().some(
      c => c.DisplayName() == this.DisplayName() && c != this
    );

    if (
      !this.IndexLabel() ||
      this.IndexLabel() < counts[name] ||
      displayNameIsTaken
    ) {
      this.IndexLabel(counts[name]);
    }

    this.Encounter.CombatantCountsByName(counts);
  }

  public InitiativeBonus = ko.computed(() => {
    const dexterityModifier = this.StatBlock().Abilities.Dex;
    return dexterityModifier + (this.StatBlock().InitiativeModifier || 0);
  });

  // Nimble's concentration check is a DC 10 STR save, not D&D's Con save -
  // see Conditions2025.Concentrating in client/Rules/Conditions.ts.
  public ConcentrationBonus = ko.computed(
    () => this.StatBlock().Abilities.Str
  );

  public IsPlayerCharacter = ko.computed(() =>
    StatBlock.IsPlayerCharacter(this.StatBlock())
  );

  public IsCompanion = ko.computed(() =>
    StatBlock.IsCompanion(this.StatBlock())
  );

  public ActsInPlayerPhase = ko.computed(() =>
    StatBlock.ActsInPlayerPhase(this.StatBlock())
  );

  public MaxHP = ko.computed(() => this.StatBlock().HP.Value);

  public MaxMana = ko.computed(() => this.StatBlock().Mana?.Value);

  public MaxResources = ko.computed(() => this.StatBlock().Resources?.Value);

  public MaxHitDice = ko.computed(() =>
    this.IsPlayerCharacter() ? this.StatBlock().HitDice?.Value : undefined
  );

  public MaxWounds = ko.computed(() =>
    this.ActsInPlayerPhase() ? this.StatBlock().Wounds?.Value : undefined
  );

  public MaxInventorySlots = ko.computed(
    () => 10 + this.StatBlock().Abilities.Str
  );

  public InventorySlotsUsed = ko.computed(() =>
    GetInventorySlotsUsed(this.Items())
  );

  public GetInitiativeRoll: () => AbilityCheckResult = () => {
    const sideInitiative =
      CurrentSettings().Rules.AutoGroupInitiative ==
      AutoGroupInitiativeOption.SideInitiative;

    let initiativeSpecialRoll: InitiativeSpecialRoll | undefined = undefined;
    if (!sideInitiative) {
      if (this.StatBlock().InitiativeAdvantage) {
        initiativeSpecialRoll = "advantage";
      }

      initiativeSpecialRoll = this.StatBlock().InitiativeSpecialRoll;
    }

    const initiativeBonus = sideInitiative ? 0 : this.InitiativeBonus();
    return this.Encounter.Rules.AbilityCheck(
      initiativeBonus,
      initiativeSpecialRoll
    );
  };

  public GetConcentrationRoll = () =>
    this.Encounter.Rules.AbilityCheck(this.ConcentrationBonus());

  public ApplyDamage(damage: number) {
    let currHP = this.CurrentHP(),
      tempHP = this.TemporaryHP();
    const allowNegativeHP = CurrentSettings().Rules.AllowNegativeHP;

    tempHP -= damage;
    if (tempHP < 0) {
      currHP += tempHP;
      tempHP = 0;
    }

    if (currHP <= 0 && !allowNegativeHP) {
      Metrics.TrackEvent(Metrics.Event.CombatantDefeated, {
        name: this.DisplayName()
      });
      currHP = 0;
    }

    this.CurrentHP(currHP);
    this.TemporaryHP(tempHP);
    NotifyTutorialOfAction("ApplyDamage");
  }

  public ApplyHealing(healing: number) {
    let currHP = this.CurrentHP();

    currHP += healing;
    if (currHP > this.StatBlock().HP.Value) {
      currHP = this.StatBlock().HP.Value;
    }

    this.CurrentHP(currHP);
  }

  public ApplyManaChange(amount: number) {
    const { current, temporary } = ApplyResourcePoolChange(
      this.CurrentMana(),
      this.TemporaryMana(),
      this.MaxMana() ?? 0,
      amount
    );
    this.CurrentMana(current);
    this.TemporaryMana(temporary);
  }

  public ApplyResourcesChange(amount: number) {
    const { current, temporary } = ApplyResourcePoolChange(
      this.CurrentResources(),
      this.TemporaryResources(),
      this.MaxResources() ?? 0,
      amount
    );
    this.CurrentResources(current);
    this.TemporaryResources(temporary);
  }

  public ApplyHitDiceChange(amount: number) {
    const { current, temporary } = ApplyResourcePoolChange(
      this.CurrentHitDice(),
      this.TemporaryHitDice(),
      this.MaxHitDice() ?? 0,
      amount
    );
    this.CurrentHitDice(current);
    this.TemporaryHitDice(temporary);
  }

  public ApplyGoldChange(amount: number) {
    let currentGold = this.CurrentGold() + amount;

    if (currentGold < 0) {
      currentGold = 0;
    }

    this.CurrentGold(currentGold);
  }

  public ApplyItemChange(
    itemName: string,
    stackable: boolean,
    quantityDelta: number,
    slotCost: number
  ) {
    const items = this.Items();

    if (stackable) {
      const existingIndex = items.findIndex(
        i => i.Stackable && i.Name === itemName
      );

      if (existingIndex >= 0) {
        const existing = items[existingIndex];
        const newQuantity = existing.Quantity + quantityDelta;
        const newItems = items.slice();
        if (newQuantity <= 0) {
          newItems.splice(existingIndex, 1);
        } else {
          newItems.splice(existingIndex, 1, {
            ...existing,
            Quantity: newQuantity
          });
        }
        this.Items(newItems);
        return;
      }

      if (quantityDelta <= 0) {
        return;
      }

      this.Items([
        ...items,
        {
          Name: itemName,
          Stackable: true,
          Quantity: quantityDelta,
          SlotCost: 1
        }
      ]);
      return;
    }

    this.Items([
      ...items,
      { Name: itemName, Stackable: false, Quantity: 1, SlotCost: slotCost }
    ]);
  }

  public RemoveItem(item: InventoryItem) {
    this.Items.remove(item);
  }

  public MoveItem(fromIndex: number, toIndex: number) {
    const items = this.Items();
    if (
      fromIndex < 0 ||
      fromIndex >= items.length ||
      toIndex < 0 ||
      toIndex >= items.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const newItems = items.slice();
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    this.Items(newItems);
  }

  public ApplyWoundsChange(amount: number) {
    // Temporary Wounds act as protection: they absorb incoming wounds
    // before the real Wounds count goes up.
    const { current, temporary } = ApplyResourcePoolChange(
      this.CurrentWounds(),
      this.TemporaryWounds(),
      this.MaxWounds() ?? 0,
      amount,
      /* positiveAmountIncreasesCurrent */ true
    );
    this.CurrentWounds(current);
    this.TemporaryWounds(temporary);
  }

  public ApplyTemporaryHP(tempHP: number) {
    if (tempHP > this.TemporaryHP()) {
      this.TemporaryHP(tempHP);
    }
  }

  public ApplyTemporaryMana(tempMana: number) {
    if (tempMana > this.TemporaryMana()) {
      this.TemporaryMana(tempMana);
    }
  }

  public ApplyTemporaryResources(tempResources: number) {
    if (tempResources > this.TemporaryResources()) {
      this.TemporaryResources(tempResources);
    }
  }

  public ApplyTemporaryHitDice(tempHitDice: number) {
    if (tempHitDice > this.TemporaryHitDice()) {
      this.TemporaryHitDice(tempHitDice);
    }
  }

  public ApplyTemporaryWounds(tempWounds: number) {
    if (tempWounds > this.TemporaryWounds()) {
      this.TemporaryWounds(tempWounds);
    }
  }

  public DisplayName = ko.pureComputed(() => {
    const alias = ko.unwrap(this.Alias),
      name = ko.unwrap(this.StatBlock).Name,
      combatantCount = this.Encounter.CombatantCountsByName()[name],
      index = this.IndexLabel();

    if (alias) {
      return alias;
    }
    const alwaysNumberMonsters =
      CurrentSettings().Rules.AlwaysNumberMonsters &&
      !this.ActsInPlayerPhase();
    if (combatantCount > 1 || alwaysNumberMonsters) {
      return name + " " + index;
    }

    return name;
  });

  public GetState: () => CombatantState = () => {
    return {
      Id: this.Id,
      PersistentCharacterId: this.PersistentCharacterId || undefined,
      StatBlock: this.StatBlock(),
      CurrentHP: this.CurrentHP(),
      CurrentMana: this.CurrentMana(),
      TemporaryMana: this.TemporaryMana(),
      CurrentResources: this.CurrentResources(),
      TemporaryResources: this.TemporaryResources(),
      CurrentHitDice: this.CurrentHitDice(),
      TemporaryHitDice: this.TemporaryHitDice(),
      CurrentWounds: this.CurrentWounds(),
      TemporaryWounds: this.TemporaryWounds(),
      CurrentGold: this.CurrentGold(),
      CurrentNotes: this.CurrentNotes(),
      TemporaryHP: this.TemporaryHP(),
      Initiative: this.Initiative(),
      InitiativeGroup: this.InitiativeGroup(),
      Alias: this.Alias(),
      IndexLabel: this.IndexLabel(),
      Tags: this.Tags()
        .filter(t => t.NotExpired())
        .map(t => t.GetState()),
      Items: this.Items(),
      Hidden: this.Hidden(),
      KeepHidden: this.KeepHidden(),
      RevealedAC: this.RevealedAC(),
      RevealedHitDice: this.RevealedHitDice(),
      HasTakenTurn: this.HasTakenTurn(),
      Color: this.Color(),
      ReactionsSpent: this.ReactionsSpent(),
      RoundCounter: this.CombatTimer.ElapsedRounds(),
      InterfaceVersion: process.env.VERSION || "unknown"
    };
  };

  private setAutoInitiativeGroup = () => {
    const autoInitiativeGroup = CurrentSettings().Rules.AutoGroupInitiative;
    let lowestInitiativeCombatant: Combatant | null = null;
    if (autoInitiativeGroup == AutoGroupInitiativeOption.None) {
      return;
    }
    if (autoInitiativeGroup == AutoGroupInitiativeOption.ByName) {
      if (this.IsPlayerCharacter()) {
        return;
      }
      lowestInitiativeCombatant = this.findLowestInitiativeGroupByName();
    } else if (
      autoInitiativeGroup == AutoGroupInitiativeOption.SideInitiative
    ) {
      lowestInitiativeCombatant = this.findLowestInitiativeGroupBySide();
    }

    if (lowestInitiativeCombatant) {
      if (!lowestInitiativeCombatant.InitiativeGroup()) {
        const initiativeGroup = probablyUniqueString();
        lowestInitiativeCombatant.InitiativeGroup(initiativeGroup);
      }

      this.Initiative(lowestInitiativeCombatant.Initiative());
      this.InitiativeGroup(lowestInitiativeCombatant.InitiativeGroup());
    }
  };

  private findLowestInitiativeGroupByName(): Combatant {
    const combatants = this.Encounter.Combatants();
    return combatants
      .filter(c => c != this)
      .filter(c => c.StatBlock().Name == this.StatBlock().Name)
      .sort((a, b) => a.Initiative() - b.Initiative())[0];
  }

  private findLowestInitiativeGroupBySide(): Combatant {
    const combatants = this.Encounter.Combatants();
    return combatants
      .filter(c => c != this)
      .filter(c => c.IsPlayerCharacter() === this.IsPlayerCharacter())
      .sort((a, b) => a.Initiative() - b.Initiative())[0];
  }
}
