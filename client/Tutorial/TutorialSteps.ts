import * as _ from "lodash";

interface Position {
  left: number;
  top: number;
}

export interface TutorialStep {
  Message: string;
  RaiseSelector: string;
  AwaitAction?: string;
  CalculatePosition: (elements: NodeListOf<HTMLElement>) => Position;
}

function getLocation(element: HTMLElement) {
  if (!element) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  return element.getBoundingClientRect();
}

export const TutorialSteps: TutorialStep[] = [
  {
    Message:
      "It's easy to add your own heroes to Nimble RPG App. For now, add a few sample <strong>Heroes</strong>. <strong>Click on any hero</strong> to add one to the encounter pane.",
    RaiseSelector: ".left-column, .prompt, .combatants",
    CalculatePosition: elements => {
      const location = getLocation(elements.item(0));
      const left = location.left + location.width + 10;
      const top = location.top + 200;
      return { left, top };
    }
  },
  {
    Message:
      "When you're ready to add some monsters,<br />select the <strong>Monsters</strong> tab at the top of the library.",
    RaiseSelector: '.libraries .c-tabs .c-tab[data-tab-key="StatBlocks"]',
    AwaitAction: "SelectMonstersTab",
    CalculatePosition: elements => {
      const element = _.last(elements);
      const location = getLocation(element);
      const left = location.left + location.width + 10;
      const top = location.top + 5;
      return { left, top };
    }
  },
  {
    Message:
      "Let's add a few monsters to the view.<br /><strong>Click on any monster</strong> to add one to the encounter pane.",
    RaiseSelector: ".left-column, .combatants",
    CalculatePosition: elements => {
      const location = getLocation(elements[0]);
      const left = location.left + location.width + 10;
      const top = location.top + 200;
      return { left, top };
    }
  },
  {
    Message:
      "Select a combatant by clicking.",
    RaiseSelector: ".combatants, .right-column",
    CalculatePosition: elements => {
      const element = elements[0];
      const location = getLocation(element);
      const left = location.left + 5;
      const top = location.top + location.height + 10;
      return { left, top };
    }
  },
  {
    Message:
      "Press on the health value to apply damage to selected combatants. You can enter a negative number to apply healing.",
    RaiseSelector: ".combatants, .combatant__hp-outer, .prompts, .prompt",
    AwaitAction: "ApplyDamage",
    CalculatePosition: elements => {
      // Positioned beside (not below) the combatants table, since the
      // Apply Damage prompt renders directly below it and a position
      // below would cover the prompt the user is being asked to use.
      const element = elements[0];
      const location = getLocation(element);
      const left = location.left + location.width + 10;
      const top = location.top + 5;
      return { left, top };
    }
  },
  /*{
        Message: "Press 'n' or click 'Next Turn' to advance the tracker. The active combatant's statblock is displayed for convenience.",
        RaiseSelector: ".c-button--next-turn, .left-column, .combatants",
        CalculatePosition: elements => {
            const element = elements.first();
            const left = location.left + element.outerWidth() + 10;
            const top = location.top + 5;
            return { left, top };
        }
    },*/
  {
    Message:
      "Click 'Settings' to set keyboard shortcuts and explore advanced features, or choose <strong>End Tutorial</strong>.",
    RaiseSelector: ".c-button--settings",
    AwaitAction: "ShowSettings",
    CalculatePosition: elements => {
      const element = _.last(elements);
      const location = getLocation(element);
      const left = location.left + location.width + 10;
      const top = location.top + 5;
      return { left, top };
    }
  }
];
