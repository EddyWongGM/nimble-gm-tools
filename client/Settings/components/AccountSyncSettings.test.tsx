import * as moment from "moment";

import { Settings } from "../../../common/Settings";
import { AccountClient } from "../../Account/AccountClient";
import { Libraries } from "../../Library/Libraries";
import { LegacySynchronousLocalStore } from "../../Utility/LegacySynchronousLocalStore";
import { AccountSyncSettings } from "./AccountSyncSettings";

const saveAsMock = jest.fn();
jest.mock("browser-filesaver", () => ({
  saveAs: (...args: unknown[]) => saveAsMock(...args)
}));

function makeComponent(accountClient: Partial<AccountClient>) {
  return new AccountSyncSettings({
    libraries: {} as Libraries,
    accountClient: accountClient as AccountClient
  });
}

describe("AccountSyncSettings", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    saveAsMock.mockClear();
    // These tests call component methods directly without mounting, which
    // triggers a harmless React "setState on unmounted component" warning,
    // and jsdom logs a "navigation not implemented" error for location.reload().
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("downloadAndSaveAllSyncedItems", () => {
    it("saves account.settings to local storage when present", async () => {
      const settings = { Rules: "core" } as unknown as Settings;
      const component = makeComponent({
        GetFullAccount: jest.fn().mockResolvedValue({
          settings,
          statblocks: {},
          persistentcharacters: {},
          spells: {},
          encounters: {}
        })
      });

      await (component as any).downloadAndSaveAllSyncedItems();

      const saved = LegacySynchronousLocalStore.Load(
        LegacySynchronousLocalStore.User,
        "Settings"
      );
      expect(saved).toEqual(settings);
    });

    it("leaves local settings untouched when account.settings is absent", async () => {
      const component = makeComponent({
        GetFullAccount: jest.fn().mockResolvedValue({
          settings: null,
          statblocks: {},
          persistentcharacters: {},
          spells: {},
          encounters: {}
        })
      });

      await (component as any).downloadAndSaveAllSyncedItems();

      const saved = LegacySynchronousLocalStore.Load(
        LegacySynchronousLocalStore.User,
        "Settings"
      );
      expect(saved).toBeNull();
    });
  });

  describe("syncAll", () => {
    it("exports the backup file with a date-stamped filename", async () => {
      const component = makeComponent({
        SaveAllUnsyncedItems: jest.fn()
      });

      await (component as any).syncAll();

      expect(saveAsMock).toHaveBeenCalledWith(
        expect.anything(),
        `nimble-gm-tools-${moment().format("YYYY-MM-DD")}.json`
      );
    });
  });
});
