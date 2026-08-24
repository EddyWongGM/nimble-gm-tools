import * as moment from "moment";

import { InitializeTestSettings } from "../../test/InitializeTestSettings";
import { CurrentSettings } from "../Settings";
import { LocalDataSettings } from "./LocalDataSettings";

const saveAsMock = jest.fn();
jest.mock("browser-filesaver", () => ({
  saveAs: (...args: unknown[]) => saveAsMock(...args)
}));

describe("LocalDataSettings", () => {
  beforeEach(() => {
    saveAsMock.mockClear();
  });

  it("exports the backup file with a date-stamped filename", async () => {
    const component = new LocalDataSettings({});

    await (component as any).exportData();

    expect(saveAsMock).toHaveBeenCalledWith(
      expect.anything(),
      `nimble-gm-tools-${moment().format("YYYY-MM-DD")}.json`
    );
  });

  describe("exportSettings", () => {
    it("exports the current Settings blob with a date-stamped filename", () => {
      InitializeTestSettings({ TrackerView: { DarkMode: true } });
      const component = new LocalDataSettings({});

      (component as any).exportSettings();

      expect(saveAsMock).toHaveBeenCalledWith(
        expect.anything(),
        `nimble-gm-tools-settings-${moment().format("YYYY-MM-DD")}.json`
      );
    });
  });

  describe("importSettings", () => {
    it("applies the imported Settings live when confirmed", async () => {
      InitializeTestSettings({ TrackerView: { DarkMode: false } });
      const confirmMock = jest
        .spyOn(window, "confirm")
        .mockReturnValue(true);
      const component = new LocalDataSettings({});

      const imported = {
        ...CurrentSettings(),
        TrackerView: { ...CurrentSettings().TrackerView, DarkMode: true }
      };
      const file = new File([JSON.stringify(imported)], "settings.json", {
        type: "application/json"
      });

      (component as any).importSettings(file);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(CurrentSettings().TrackerView.DarkMode).toBe(true);
      confirmMock.mockRestore();
    });

    it("leaves Settings untouched when the confirmation is declined", async () => {
      InitializeTestSettings({ TrackerView: { DarkMode: false } });
      const confirmMock = jest
        .spyOn(window, "confirm")
        .mockReturnValue(false);
      const component = new LocalDataSettings({});

      const imported = {
        ...CurrentSettings(),
        TrackerView: { ...CurrentSettings().TrackerView, DarkMode: true }
      };
      const file = new File([JSON.stringify(imported)], "settings.json", {
        type: "application/json"
      });

      (component as any).importSettings(file);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(CurrentSettings().TrackerView.DarkMode).toBe(false);
      confirmMock.mockRestore();
    });
  });
});
