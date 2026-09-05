import { saveAs } from "browser-filesaver";
import * as moment from "moment";
import * as React from "react";
import { AccountClient } from "../../Account/AccountClient";
import { Button } from "../../Components/Button";
import { LegacySynchronousLocalStore } from "../../Utility/LegacySynchronousLocalStore";
import { Store } from "../../Utility/Store";
import { CurrentSettings, UpdateSettings } from "../Settings";
import { FileUploadButton } from "./FileUploadButton";

export class LocalDataSettings extends React.Component {
  public render() {
    return (
      <>
        <h3>Local Data</h3>
        <div className="c-button-with-label">
          <span>Export all your data as JSON file</span>
          <Button fontAwesomeIcon="file-archive" onClick={this.exportData} />
        </div>
        <div className="c-button-with-label">
          <span>Replace all your data by uploading a JSON file</span>
          <FileUploadButton
            acceptFileType=".json"
            fontAwesomeIcon="recycle"
            handleFile={this.importDataAndReplace}
          />
        </div>
        <div className="c-button-with-label">
          <span>Add Library content from a JSON file</span>
          <FileUploadButton
            acceptFileType=".json"
            fontAwesomeIcon="upload"
            handleFile={this.importDataAndAdd}
          />
        </div>
        <div className="c-button-with-label">
          <span>
            Export only your Settings as JSON file
          </span>
          <Button fontAwesomeIcon="sliders-h" onClick={this.exportSettings} />
        </div>
        <div className="c-button-with-label">
          <span>Replace only your Settings by uploading a JSON file</span>
          <FileUploadButton
            acceptFileType=".json"
            fontAwesomeIcon="undo"
            handleFile={this.importSettings}
          />
        </div>
        <div className="c-button-with-label">
          <span>Clear all your Local data</span>
          <Button
            fontAwesomeIcon="trash"
            onClick={this.confirmClearLocalData}
          />
        </div>
      </>
    );
  }

  private exportData = async () => {
    const asyncKeys = await Store.GetAllKeyPairs();
    const blob = LegacySynchronousLocalStore.ExportAll(asyncKeys);
    saveAs(blob, `nimble-gm-tools-${moment().format("YYYY-MM-DD")}.json`);
  };

  private importDataAndReplace = async (file: File) => {
    if (
      confirm(
        `Replace your Nimble RPG App data with imported ${file.name} and reload?`
      )
    ) {
      await Store.DeleteAll();
      await Store.ImportAll(file);
      LegacySynchronousLocalStore.ImportAllAndReplace(file);
      location.reload();
    }
  };

  private importDataAndAdd = async (file: File) => {
    if (
      confirm(`Import all statblocks and spells in ${file.name} and reload?`)
    ) {
      await Store.ImportAll(file);
      LegacySynchronousLocalStore.ImportAll(file);
      location.reload();
    }
  };

  private exportSettings = () => {
    const blob = new Blob([JSON.stringify(CurrentSettings(), null, 2)], {
      type: "application/json"
    });
    saveAs(
      blob,
      `nimble-gm-tools-settings-${moment().format("YYYY-MM-DD")}.json`
    );
  };

  private importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      let importedSettings: any;
      try {
        importedSettings = JSON.parse(event.target.result);
      } catch (error) {
        alert(`There was a problem importing ${file.name}: ${error}`);
        return;
      }

      if (
        !confirm(
          `Replace your current Settings (rules toggles, keybindings, styles, and scene library) with imported ${file.name}?`
        )
      ) {
        return;
      }

      const updatedSettings = UpdateSettings(importedSettings);
      LegacySynchronousLocalStore.Save(
        LegacySynchronousLocalStore.User,
        "Settings",
        updatedSettings
      );
      CurrentSettings(updatedSettings);
      new AccountClient().SaveSettings(updatedSettings);
    };
    reader.readAsText(file);
  };

  private confirmClearLocalData = async () => {
    const promptText =
      "To clear all of your saved player heroes, statblocks, encounters, and settings, enter DELETE.";
    if (prompt(promptText) == "DELETE") {
      await Store.DeleteAll();
      LegacySynchronousLocalStore.DeleteAll();
      location.reload();
    }
  };
}
