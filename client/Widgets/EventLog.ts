import * as ko from "knockout";

export class EventLog {
  public Events = ko.observableArray<string>([]);

  public AddEvent = (event: string) => {
    this.Events.unshift(event);
  };

  public LogHPChange = (damage: number, combatantNames: string) => {
    if (damage > 0) {
      this.AddEvent(`${damage} damage applied to ${combatantNames}.`);
    }
    if (damage < 0) {
      this.AddEvent(`${-damage} HP restored to ${combatantNames}.`);
    }
  };

  public LogManaChange = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} mana spent by ${combatantNames}.`);
    }
    if (amount < 0) {
      this.AddEvent(`${-amount} mana restored to ${combatantNames}.`);
    }
  };

  public LogResourcesChange = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} resources spent by ${combatantNames}.`);
    }
    if (amount < 0) {
      this.AddEvent(`${-amount} resources restored to ${combatantNames}.`);
    }
  };

  public LogHitDiceChange = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} Hit Dice spent by ${combatantNames}.`);
    }
    if (amount < 0) {
      this.AddEvent(`${-amount} Hit Dice restored to ${combatantNames}.`);
    }
  };

  public LogWoundsChange = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} wounds added to ${combatantNames}.`);
    }
    if (amount < 0) {
      this.AddEvent(`${-amount} wounds healed for ${combatantNames}.`);
    }
  };

  public LogTemporaryHP = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} temporary hit points granted to ${combatantNames}.`);
    }
  };

  public LogGoldChange = (amount: number, combatantNames: string) => {
    if (amount > 0) {
      this.AddEvent(`${amount} gold added for ${combatantNames}.`);
    }
    if (amount < 0) {
      this.AddEvent(`${-amount} gold subtracted from ${combatantNames}.`);
    }
  };
}
