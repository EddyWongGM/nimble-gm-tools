import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { TrackerViewModel } from "../TrackerViewModel";
import { CombatantCommander } from "./CombatantCommander";

describe("CombatantCommander", () => {
  let encounter: Encounter;
  let combatantCommander: CombatantCommander;
  let trackerViewModel: TrackerViewModel;
  beforeEach(() => {
    window.confirm = () => true;

    InitializeTestSettings();

    const mockIo: any = {
      on: jest.fn(),
      emit: jest.fn()
    };

    trackerViewModel = new TrackerViewModel(mockIo);
    encounter = trackerViewModel.Encounter;
    combatantCommander = trackerViewModel.CombatantCommander;
  });

  afterEach(() => {
    encounter.ClearEncounter();
  });

  test("Apply Damage", () => {
    encounter.AddCombatantFromStatBlock({
      ...StatBlock.Default(),
      HP: { Value: 10 }
    });
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];
    expect(combatantViewModel.HP()).toEqual("10/10");
    combatantViewModel.ApplyDamage("5");
    expect(combatantViewModel.HP()).toEqual("5/10");
  });

  test("Toggle Hidden", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    const playerViewBeforeToggle = encounter.GetPlayerView();
    expect(playerViewBeforeToggle.Combatants).toHaveLength(1);

    combatantCommander.Select(combatantViewModel);
    combatantCommander.ToggleHidden();
    const playerView = encounter.GetPlayerView();

    expect(playerView.Combatants).toHaveLength(0);
  });

  test("Toggle Keep Hidden", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    expect(combatantViewModel.Combatant.KeepHidden()).toBe(false);

    combatantCommander.Select(combatantViewModel);
    combatantCommander.ToggleKeepHidden();
    expect(combatantViewModel.Combatant.KeepHidden()).toBe(true);

    combatantCommander.ToggleKeepHidden();
    expect(combatantViewModel.Combatant.KeepHidden()).toBe(false);
  });

  test("Toggle Reveal Gold", () => {
    encounter.AddCombatantFromStatBlock({
      ...StatBlock.Default(),
      Player: "player"
    });
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    expect(combatantViewModel.Combatant.RevealedGold()).toBe(false);

    combatantCommander.Select(combatantViewModel);
    combatantCommander.ToggleRevealedGold();
    expect(combatantViewModel.Combatant.RevealedGold()).toBe(true);

    combatantCommander.ToggleRevealedGold();
    expect(combatantViewModel.Combatant.RevealedGold()).toBe(false);
  });

  test("Toggle Reveal Hit Dice", () => {
    encounter.AddCombatantFromStatBlock({
      ...StatBlock.Default(),
      Player: "player",
      HitDice: { Value: 2, Notes: "" }
    });
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    expect(combatantViewModel.Combatant.RevealedHitDice()).toBe(true);

    combatantCommander.Select(combatantViewModel);
    combatantCommander.ToggleRevealedHitDice();
    expect(combatantViewModel.Combatant.RevealedHitDice()).toBe(false);

    combatantCommander.ToggleRevealedHitDice();
    expect(combatantViewModel.Combatant.RevealedHitDice()).toBe(true);
  });

  test("Toggle Reveal AC", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    const playerViewBeforeToggle = encounter.GetPlayerView();
    expect(playerViewBeforeToggle.Combatants[0].AC).toBeUndefined();

    combatantCommander.Select(combatantViewModel);
    combatantCommander.ToggleRevealedAC();
    const playerView = encounter.GetPlayerView();

    expect(playerView.Combatants[0].AC).toBe(10);
  });

  test("Add Item prompt's scroll shortcut shows inventory to players and as a DM card", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];
    combatantViewModel.Combatant.ApplyItemChange("Torch", true, 1, 1);

    combatantCommander.AddItem(combatantViewModel);
    const [prompt] = trackerViewModel.PromptQueue.GetPrompts()[0];

    prompt.onSubmit({
      itemName: "",
      stackable: false,
      quantity: "1",
      slotCost: "1",
      showInventoryCard: true
    });

    // Broadcast to Player View...
    expect(combatantCommander.InventoryDisplayedCombatantId()).toBe(
      combatantViewModel.Combatant.Id
    );
    // ...and a DM-facing inventory card queued alongside the original Add
    // Item prompt (still present here since this test calls onSubmit
    // directly rather than through the PendingPrompts wrapper that would
    // normally remove it).
    expect(trackerViewModel.PromptQueue.GetPrompts()).toHaveLength(2);
  });

  test("Submitting the inventory card also hides the Player View popup", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    combatantCommander.ShowInventoryCard(combatantViewModel.Combatant);
    expect(combatantCommander.InventoryDisplayedCombatantId()).toBe(
      combatantViewModel.Combatant.Id
    );

    const [cardPrompt] = trackerViewModel.PromptQueue.GetPrompts()[0];
    cardPrompt.onSubmit({});

    expect(combatantCommander.InventoryDisplayedCombatantId()).toBeNull();
  });

  test("Escaping out of the inventory card also hides the Player View popup", () => {
    encounter.AddCombatantFromStatBlock(StatBlock.Default());
    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];

    combatantCommander.ShowInventoryCard(combatantViewModel.Combatant);
    expect(combatantCommander.InventoryDisplayedCombatantId()).toBe(
      combatantViewModel.Combatant.Id
    );

    // PendingPrompts wires the Prompt's Escape key handler to this
    // onCancel, in addition to removing the prompt from the queue.
    const [cardPrompt] = trackerViewModel.PromptQueue.GetPrompts()[0];
    cardPrompt.onCancel();

    expect(combatantCommander.InventoryDisplayedCombatantId()).toBeNull();
  });

  test("Dismissing a stale inventory card doesn't hide a different combatant's popup", () => {
    const combatantA = addCombatantFromStatBlock(encounter);
    const combatantB = addCombatantFromStatBlock(encounter);

    combatantCommander.ShowInventoryCard(combatantA);
    const [staleCardPrompt] = trackerViewModel.PromptQueue.GetPrompts()[0];

    // The DM leaves A's card open and switches the Player View popup to B
    // without dismissing it first.
    combatantCommander.ShowInventoryCard(combatantB);
    expect(combatantCommander.InventoryDisplayedCombatantId()).toBe(
      combatantB.Id
    );

    // Dismissing A's now-stale card must not hide B's still-live popup.
    staleCardPrompt.onSubmit({});

    expect(combatantCommander.InventoryDisplayedCombatantId()).toBe(
      combatantB.Id
    );
  });

  test("Should maintain selection when initiative order changes", () => {
    const combatant1 = addCombatantFromStatBlock(encounter);
    const combatant2 = addCombatantFromStatBlock(encounter);

    combatant1.Initiative(15);
    combatant2.Initiative(10);
    encounter.SortByInitiative(false);

    expect(trackerViewModel.CombatantViewModels()[0].Combatant).toBe(
      combatant1
    );

    const combatantViewModel = trackerViewModel.CombatantViewModels()[0];
    expect(combatantViewModel.Combatant).toBe(combatant1);

    combatantCommander.Select(combatantViewModel);
    combatantViewModel.ApplyInitiative(5);

    expect(trackerViewModel.CombatantViewModels()[1].Combatant).toBe(
      combatant1
    );

    expect(combatantCommander.SelectedCombatants()[0]).toBe(
      trackerViewModel.CombatantViewModels()[1]
    );
  });
});
