import * as _ from "lodash";

interface Position {
  left: number;
  top: number;
}

export interface TutorialStep {
  Message: string;
  RaiseSelector: string;
  AwaitAction?: string;
  // At phone width the Library pane and the Combatants list occupy the same
  // single visible column - a step whose RaiseSelector targets the
  // Combatants list needs the Library pane closed first, or its target is
  // invisible and (for AwaitAction steps) unreachable. Desktop shows both
  // side by side, so this is harmless there too.
  HideLibrariesOnEnter?: boolean;
  // At phone width, selecting a Combatant (as the previous step asks for)
  // swaps the Combatants list for that Combatant's full details - so a step
  // whose RaiseSelector targets the list (like the HP cell here) needs the
  // selection cleared first, for the same reason HideLibrariesOnEnter exists
  // above. Applying damage/toggling "has taken turn" from the list doesn't
  // depend on anything being selected, so clearing it is harmless.
  DeselectCombatantOnEnter?: boolean;
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
    HideLibrariesOnEnter: true,
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
    DeselectCombatantOnEnter: true,
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
  {
    Message:
      "Nimble doesn't use a strict turn order- once a Combatant has acted, check the box next to their name to mark that they've taken their turn this round.",
    RaiseSelector: ".combatants, .combatant__has-taken-turn",
    AwaitAction: "ToggleHasTakenTurn",
    CalculatePosition: elements => {
      const element = elements[0];
      const location = getLocation(element);
      const left = location.left + location.width + 10;
      const top = location.top + 5;
      return { left, top };
    }
  },
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
