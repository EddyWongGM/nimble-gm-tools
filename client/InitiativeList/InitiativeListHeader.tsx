import * as React from "react";
import { SettingsContext } from "../Settings/SettingsContext";

export function InitiativeListHeader(props: {
  encounterActive: boolean;
  showManaColumn: boolean;
  showResourcesColumn: boolean;
  showHitDiceColumn: boolean;
  showWoundsColumn: boolean;
  showItemsColumn: boolean;
  showGoldColumn: boolean;
}) {
  const settings = React.useContext(SettingsContext);

  return (
    <thead className="combatant--header">
      <tr>
        <th className="combatant__left-gutter" />

        <th className="combatant__image" aria-hidden="true"></th>

        <th className="combatant__name" align="left">
          Name
        </th>

        <th className="combatant__hp">
          <span className="screen-reader-only">Health</span>
          <span
            className="fas fa-heart"
            title="Health"
            aria-hidden="true"
            style={{ color: "var(--green)" }}
          ></span>
        </th>

        <th className="combatant__ac">
          <span className="screen-reader-only">Defense</span>
          <span
            className="fas fa-shield-alt"
            title="Defense"
            aria-hidden="true"
          ></span>
        </th>

        {props.showManaColumn && (
          <th className="combatant__mana">
            <span className="screen-reader-only">Mana</span>
            <span
              className="fas fa-tint"
              title="Mana"
              aria-hidden="true"
              style={{ color: "var(--blue)" }}
            ></span>
          </th>
        )}

        {props.showResourcesColumn && (
          <th className="combatant__resources">
            <span className="screen-reader-only">Resources</span>
            <span
              className="fas fa-bolt"
              title="Resources"
              aria-hidden="true"
              style={{ color: "var(--magenta)" }}
            ></span>
          </th>
        )}

        {props.showHitDiceColumn && (
          <th className="combatant__hitdice">
            <span className="screen-reader-only">Hit Dice</span>
            <span
              className="fas fa-dice-d6"
              title="Hit Dice"
              aria-hidden="true"
              style={{ color: "var(--orange)" }}
            ></span>
          </th>
        )}

        {props.showWoundsColumn && (
          <th className="combatant__wounds">
            <span className="screen-reader-only">Wounds</span>
            <span
              className="fas fa-skull"
              title="Wounds"
              aria-hidden="true"
              style={{ color: "var(--wound-red)" }}
            ></span>
          </th>
        )}

        {props.showItemsColumn && (
          <th className="combatant__items-slots">
            <span className="screen-reader-only">Inventory</span>
            <span
              className="fas fa-scroll"
              title="Inventory"
              aria-hidden="true"
              style={{ color: "var(--white)" }}
            ></span>
          </th>
        )}

        {props.showGoldColumn && (
          <th className="combatant__gold">
            <span className="screen-reader-only">Gold</span>
            <span
              className="fas fa-coins"
              title="Gold"
              aria-hidden="true"
              style={{ color: "var(--gold)" }}
            ></span>
          </th>
        )}

        {settings.StatBlock.CustomFields.filter(f => f.showInEncounterView).map(
          (field, index) => (
            <th
              key={index}
              className="combatant__custom-field"
              style={{
                width: field.combatantRowWidth
                  ? field.combatantRowWidth + "px"
                  : "20px"
              }}
            >
              {field.combatantRowHeader || field.name}
            </th>
          )
        )}

        <th align="right">
          <span className="screen-reader-only">Tags and commands</span>
        </th>
      </tr>
    </thead>
  );
}
