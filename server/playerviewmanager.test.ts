import Redis from "ioredis-mock";
import { EncounterState } from "../common/EncounterState";
import { PlayerViewCombatantState } from "../common/PlayerViewCombatantState";
import { getDefaultSettings } from "../common/Settings";
import { InMemoryPlayerViewManager } from "./InMemoryPlayerViewManager";
import { RedisPlayerViewManager } from "./RedisPlayerViewManager";
import { PlayerViewManager } from "./playerviewmanager";

function TestPlayerViewManagerImplementation(
  managerName: string,
  makePlayerViewManager: () => PlayerViewManager
) {
  describe(managerName, () => {
    it("Should return a default player view when not initialized", async () => {
      const playerViewManager = makePlayerViewManager();
      const playerView = await playerViewManager.Get("someId");
      expect(playerView).toEqual({
        encounterState: EncounterState.Default<PlayerViewCombatantState>(),
        settings: getDefaultSettings().PlayerView,
        hasEpicInitiative: false
      });
    });

    it("Should show uninitialized views as available", async () => {
      const playerViewManager = makePlayerViewManager();
      const isAvailable = await playerViewManager.IdAvailable("someId");
      expect(isAvailable).toBe(true);
    });

    it("Should show initialized views as unavailable", async () => {
      const playerViewManager = makePlayerViewManager();
      const playerViewId = await playerViewManager.InitializeNew();

      const isAvailable = await playerViewManager.IdAvailable(playerViewId);
      expect(isAvailable).toBe(false);
    });

    it("Should implicitly initialize encounter", async () => {
      const playerViewManager = makePlayerViewManager();
      const encounterState = {
        ...EncounterState.Default(),
        RoundCounter: 3
      };
      await playerViewManager.UpdateEncounter("someId", encounterState, false);

      const isAvailable = await playerViewManager.IdAvailable("someId");
      expect(isAvailable).toBe(false);

      const playerView = await playerViewManager.Get("someId");
      expect(playerView).toEqual({
        encounterState: encounterState,
        settings: getDefaultSettings().PlayerView,
        hasEpicInitiative: false
      });
    });

    it("Should persist the GM's Epic Tier status alongside settings, for Player View to gate stat colors on", async () => {
      const playerViewManager = makePlayerViewManager();
      const customSettings = {
        ...getDefaultSettings().PlayerView,
        DarkMode: true
      };
      await playerViewManager.UpdateSettings("someId", customSettings, true);

      const playerView = await playerViewManager.Get("someId");
      expect(playerView.hasEpicInitiative).toBe(true);
      expect(playerView.settings).toEqual(customSettings);
    });

    it("Should persist a GM's Epic Tier status from UpdateEncounter too", async () => {
      const playerViewManager = makePlayerViewManager();
      const encounterState = {
        ...EncounterState.Default(),
        RoundCounter: 5
      };
      await playerViewManager.UpdateEncounter("someId", encounterState, true);

      const playerView = await playerViewManager.Get("someId");
      expect(playerView.hasEpicInitiative).toBe(true);
    });
  });
}

TestPlayerViewManagerImplementation(
  "InMemoryPlayerViewManager",
  () => new InMemoryPlayerViewManager()
);
TestPlayerViewManagerImplementation(
  "RedisPlayerViewManager",
  () => new RedisPlayerViewManager(new Redis())
);
