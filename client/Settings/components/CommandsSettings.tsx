import { Field } from "formik";
import * as _ from "lodash";

import * as React from "react";
import { Command } from "../../Commands/Command";
import { Info } from "../../Components/Info";
import { CommandInfoById } from "./CommandInfo";
import { ToggleButton } from "./Toggle";
import { useContext } from "react";
import { SettingsContext } from "../SettingsContext";
import { useSubscription } from "../../Combatant/linkComponentToObservables";

type CommandSettingRowProps = {
  command: Command;
  withCombatantRow: boolean;
};

function CommandSettingRow(props: CommandSettingRowProps) {
  const info = CommandInfoById[props.command.Id];
  const settings = useContext(SettingsContext);
  const index = _.findIndex(settings.Commands, s => s.Name == props.command.Id);
  const fontAwesomeIcon = useSubscription(props.command.FontAwesomeIcon);

  return (
    <div>
      <span className="command-description">
        {props.command.Description}
        {info && <Info>{info}</Info>}
      </span>
      <Field className="keybinding" name={`Commands[${index}].KeyBinding`} />
      <label className="toolbar-setting">
        <i className={"fas fa-" + fontAwesomeIcon} />
        <ToggleButton
          fieldName={`Commands[${index}].ShowOnActionBar`}
          disabled={props.command.LockOnActionBar}
        />
      </label>
      {props.withCombatantRow && (
        <label className="combatant-setting">
          <ToggleButton fieldName={`Commands[${index}].ShowInCombatantRow`} />
        </label>
      )}
    </div>
  );
}

type CommandsSettingsProps = {
  encounterCommands: Command[];
  combatantCommands: Command[];
};

const HIDDEN_FROM_COMMAND_SETTINGS = new Set([
  "start-encounter",
  "reroll-initiative",
  "end-encounter",
  "next-turn",
  "previous-turn",
  "set-initiative",
  "shutdown-server",
  "toggle-keep-hidden",
  "spend-hit-dice",
  "restore-hit-dice",
  "spend-wounds",
  "restore-wounds",
  "add-gold",
  "subtract-gold",
  "add-item"
]);

export function CommandsSettings(props: CommandsSettingsProps) {
  const encounterCommands = props.encounterCommands.filter(
    c => !HIDDEN_FROM_COMMAND_SETTINGS.has(c.Id)
  );
  const combatantCommands = props.combatantCommands.filter(
    c => !HIDDEN_FROM_COMMAND_SETTINGS.has(c.Id)
  );

  return (
    <div className="tab-content keybindings">
      <h2>Encounter Commands</h2>
      <div className="command-options-labels">
        <span className="hotkey-label">Hotkey</span>
        <span className="toolbar-label">Toolbar</span>
      </div>
      {encounterCommands.map(buildCommandSettingRow(props, false))}
      <h2>Name Commands</h2>
      <div className="command-options-labels">
        <span className="hotkey-label">Hotkey</span>
        <span className="toolbar-label">Toolbar</span>
        <span className="combatant-label">Inline</span>
      </div>
      {combatantCommands.map(buildCommandSettingRow(props, true))}
    </div>
  );
}

function buildCommandSettingRow(
  props: CommandsSettingsProps,
  withCombatantRow: boolean
) {
  return (command: Command) => {
    return (
      <CommandSettingRow
        withCombatantRow={withCombatantRow}
        command={command}
        key={command.Id}
      />
    );
  };
}
