import * as React from "react";

import { CombatantState } from "../../common/CombatantState";
import { StatBlock as StatBlockNamespace } from "../../common/StatBlock";
import { Tags } from "./Tags";
import {
  GetInventorySlotsUsed,
  GetMaxInventorySlots
} from "../Combatant/InventorySlots";
import { CommandContext } from "./CommandContext";
import { SettingsContext } from "../Settings/SettingsContext";
import { Command } from "../Commands/Command";
import { useSubscription } from "../Combatant/linkComponentToObservables";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";

import Tippy from "@tippyjs/react";
import { SketchPicker } from "react-color";

type CombatantRowProps = {
  combatantState: CombatantState;
  isActive: boolean;
  isSelected: boolean;
  showIndexLabel: boolean;
  initiativeIndex: number;
  showManaColumn: boolean;
  showResourcesColumn: boolean;
  showHitDiceColumn: boolean;
  showWoundsColumn: boolean;
  showItemsColumn: boolean;
  showGoldColumn: boolean;
};

type CombatantDragData = {
  type: "combatant";
  id: string;
};

export function CombatantRow(props: CombatantRowProps) {
  const displayName = getDisplayName(props);
  const tooltipName = StatBlockNamespace.IsPlayerCharacter(
    props.combatantState.StatBlock
  )
    ? `${displayName} (Hero)`
    : displayName;
  const commandContext = React.useContext(CommandContext);

  const settings = React.useContext(SettingsContext);
  const {
    DisplayPortraits,
    DisplayHPBar,
    DisplayCombatantColor,
    DisplayReactionTracker
  } = settings.TrackerView;

  const { combatantState, isSelected, isActive } = props;
  const { StatBlock } = combatantState;

  const selectCombatant = (mouseEvent?: React.MouseEvent) => {
    const appendSelection =
      mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey);
    commandContext.SelectCombatant(props.combatantState.Id, appendSelection);
  };

  const [, drag] = useDrag({
    item: {
      id: props.combatantState.Id,
      initiativeIndex: props.initiativeIndex,
      type: "combatant"
    }
  });

  const [collectedProps, drop] = useDrop({
    accept: "combatant",
    drop: (dragData: CombatantDragData) => {
      if (combatantState.Id !== dragData.id) {
        commandContext.MoveCombatantFromDrag(dragData.id, combatantState.Id);
      }
    },
    collect: (monitor: DropTargetMonitor) => {
      if (!monitor.isOver() || monitor.getItemType() !== "combatant") {
        return {
          id: null,
          initiativeIndex: null
        };
      }
      return {
        id: monitor.getItem().id,
        initiativeIndex: monitor.getItem().initiativeIndex
      };
    }
  });

  const classNames = getClassNames(props);
  if (collectedProps.initiativeIndex !== null) {
    if (collectedProps.initiativeIndex > props.initiativeIndex) {
      classNames.push("drop-before");
    }
    if (collectedProps.initiativeIndex < props.initiativeIndex) {
      classNames.push("drop-after");
    }
  }

  return (
    <tr ref={drop} className={classNames.join(" ")} onClick={selectCombatant}>
      {
        <td className="combatant__left-gutter" ref={drag}>
          <i className="fas fa-grip-vertical" />
        </td>
      }
      <td aria-hidden="true" className="combatant__image-cell">
        {DisplayPortraits && (
          <img
            src={StatBlock.ImageURL || "/img/logo-improved-initiative.svg"}
            alt="" // Image is only decorative
            className="combatant__image"
            height={35}
            width={35}
          />
        )}
      </td>

      <td
        className="combatant__name"
        title={tooltipName}
        align="left"
        aria-current={isActive ? "true" : "false"}
      >
        <Tippy content="Has taken a turn this round">
          <input
            type="checkbox"
            className="combatant__has-taken-turn"
            checked={!!props.combatantState.HasTakenTurn}
            onClick={e => e.stopPropagation()}
            onChange={() =>
              commandContext.ToggleCombatantHasTakenTurn(
                props.combatantState.Id
              )
            }
          />
        </Tippy>
        {DisplayCombatantColor && (
          <CombatantColorPicker combatantState={props.combatantState} />
        )}
        {props.combatantState.Hidden && (
          <Tippy content="Hidden from Player View">
            <span className="combatant__hidden-icon fas fa-eye-slash" />
          </Tippy>
        )}
        <button
          className="combatant__selection-button"
          onClick={e => {
            e.stopPropagation();
            selectCombatant(e);
          }}
          aria-pressed={isSelected ? "true" : "false"}
        >
          {renderDisplayName(props)}
        </button>
      </td>

      <td className="combatant__hp">
        <div
          className="combatant__hp-outer"
          onClick={event => {
            commandContext.ApplyDamageToCombatant(props.combatantState.Id);
            event.stopPropagation();
          }}
        >
          <div className="combatant__hp-inner" style={getHPStyle(props)}>
            <span
              className="combatant__mobile-icon fas fa-heart"
              aria-hidden="true"
            />

            {renderHPText(props)}
            {DisplayHPBar && (
              <span
                className={
                  "combatant__hp-bar" +
                  (props.combatantState.HasEnteredLastStage
                    ? " combatant__hp-bar--last-stage"
                    : "")
                }
              >
                <span
                  className="combatant__hp-bar--filled"
                  style={renderHPBarStyle(props)}
                />
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="combatant__ac">
        {StatBlockNamespace.ActsInPlayerPhase(props.combatantState.StatBlock) ? (
          <>
            <span
              className="combatant__mobile-icon fas fa-shield-alt"
              aria-hidden="true"
            />

            {props.combatantState.StatBlock.AC.Value}
            {props.combatantState.RevealedAC && (
              <Tippy content="Revealed in Player View">
                <span className="combatant__ac--revealed-badge fas fa-eye" />
              </Tippy>
            )}
          </>
        ) : (
          renderArmorBadge(props, commandContext)
        )}
      </td>

      {props.showManaColumn && (
        <td className="combatant__mana">
          {props.combatantState.StatBlock.Mana ? (
            <div
              className="combatant__mana-outer"
              onClick={event => {
                commandContext.ApplyManaToCombatant(props.combatantState.Id);
                event.stopPropagation();
              }}
            >
              <div className="combatant__mana-inner" style={getManaStyle(props)}>
                <span
                  className="combatant__mobile-icon fas fa-tint"
                  aria-hidden="true"
                />

                {renderManaText(props)}
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderManaBarStyle(props)}
                    />
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-tint"
              aria-hidden="true"
            />
          )}
        </td>
      )}

      {props.showResourcesColumn && (
        <td className="combatant__resources">
          {props.combatantState.StatBlock.Resources ? (
            <div
              className="combatant__resources-outer"
              onClick={event => {
                commandContext.ApplyResourcesToCombatant(
                  props.combatantState.Id
                );
                event.stopPropagation();
              }}
            >
              <div
                className="combatant__resources-inner"
                style={getResourcesStyle(props)}
              >
                <span
                  className="combatant__mobile-icon fas fa-bolt"
                  aria-hidden="true"
                />

                {renderResourcesText(props)}
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderResourcesBarStyle(props)}
                    />
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-bolt"
              aria-hidden="true"
            />
          )}
        </td>
      )}

      {props.showHitDiceColumn && (
        <td className="combatant__hitdice">
          {props.combatantState.StatBlock.HitDice ? (
            <div
              className="combatant__hitdice-outer"
              onClick={event => {
                commandContext.ApplyHitDiceToCombatant(
                  props.combatantState.Id
                );
                event.stopPropagation();
              }}
            >
              <div
                className="combatant__hitdice-inner"
                style={getHitDiceStyle()}
              >
                <span
                  className="combatant__mobile-icon fas fa-dice-d6"
                  aria-hidden="true"
                  style={{ color: "var(--orange)" }}
                />

                {renderHitDiceText(props)}
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderHitDiceBarStyle(props)}
                    />
                  </span>
                )}
                {props.combatantState.RevealedHitDice === false && (
                  <Tippy content="Hidden from Player View">
                    <span className="combatant__hitdice--hidden-badge fas fa-eye-slash" />
                  </Tippy>
                )}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-dice-d6"
              aria-hidden="true"
            />
          )}
        </td>
      )}

      {props.showWoundsColumn && (
        <td className="combatant__wounds">
          {props.combatantState.StatBlock.Wounds &&
          StatBlockNamespace.ActsInPlayerPhase(
            props.combatantState.StatBlock
          ) ? (
            <div
              className="combatant__wounds-outer"
              onClick={event => {
                commandContext.ApplyWoundsToCombatant(
                  props.combatantState.Id
                );
                event.stopPropagation();
              }}
            >
              <div
                className="combatant__wounds-inner"
                style={getWoundsStyle(props)}
              >
                <span
                  className="combatant__mobile-icon fas fa-skull"
                  aria-hidden="true"
                  style={{ color: "var(--wound-red)" }}
                />

                {renderWoundsText(props)}
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderWoundsBarStyle(props)}
                    />
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-skull"
              aria-hidden="true"
              style={{ color: "var(--wound-red)" }}
            />
          )}
        </td>
      )}

      {props.showItemsColumn && (
        <td className="combatant__items-slots">
          {StatBlockNamespace.IsPlayerCharacter(
            props.combatantState.StatBlock
          ) ? (
            <div
              className="combatant__items-slots-outer"
              onClick={event => {
                commandContext.AddItemToCombatant(props.combatantState.Id);
                event.stopPropagation();
              }}
            >
              <div
                className="combatant__items-slots-inner"
                style={getItemsStyle(props)}
              >
                <span
                  className="combatant__mobile-icon fas fa-scroll"
                  aria-hidden="true"
                />

                {renderItemsText(props)}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-scroll"
              aria-hidden="true"
            />
          )}
        </td>
      )}

      {props.showGoldColumn && (
        <td className="combatant__gold">
          {StatBlockNamespace.IsPlayerCharacter(
            props.combatantState.StatBlock
          ) ? (
            <div
              className="combatant__gold-outer"
              onClick={event => {
                commandContext.ApplyGoldToCombatant(props.combatantState.Id);
                event.stopPropagation();
              }}
            >
              <div className="combatant__gold-inner" style={getGoldStyle()}>
                <span
                  className="combatant__mobile-icon fas fa-coins"
                  aria-hidden="true"
                />

                {renderGoldText(props)}
              </div>
            </div>
          ) : (
            <span
              className="combatant__mobile-icon fas fa-coins"
              aria-hidden="true"
            />
          )}
        </td>
      )}

      {settings.StatBlock.CustomFields.filter(f => f.showInEncounterView).map(
        field => (
          <td
            key={field.name}
            className="combatant__custom-field"
            style={{
              width: field.combatantRowWidth
                ? field.combatantRowWidth + "px"
                : undefined
            }}
          >
            {props.combatantState.StatBlock.CustomFields?.find(
              f => f.Name === field.name
            )?.Content || field.defaultValue}
          </td>
        )
      )}

      <td className="combatant__tags-commands-cell">
        <div className="combatant__tags-commands-wrapper">
          <Tags
            tags={props.combatantState.Tags}
            combatantId={props.combatantState.Id}
          />
          <Commands />
          {DisplayReactionTracker && (
            <ReactionIndicator combatantState={props.combatantState} />
          )}
        </div>
      </td>
    </tr>
  );
}

function ReactionIndicator(props: { combatantState: CombatantState }) {
  const commandContext = React.useContext(CommandContext);

  if (!props.combatantState.ReactionsSpent) {
    return (
      <Tippy content="Reaction">
        <span
          className="combatant__reaction-icon fas fa-reply"
          onClick={() =>
            commandContext.ToggleCombatantSpentReaction(props.combatantState.Id)
          }
        />
      </Tippy>
    );
  } else {
    return (
      <Tippy content="Reaction">
        <span
          className="combatant__reaction-icon fas fa-minus"
          onClick={() =>
            commandContext.ToggleCombatantSpentReaction(props.combatantState.Id)
          }
        />
      </Tippy>
    );
  }
}

function CombatantColorPicker(props: { combatantState: CombatantState }) {
  const commandContext = React.useContext(CommandContext);
  const hasColorSet =
    props.combatantState.Color && props.combatantState.Color.length > 0;

  return (
    <Tippy
      trigger="click"
      interactive
      appendTo={document.body}
      content={
        <div onClick={e => e.stopPropagation()}>
          <SketchPicker
            color={props.combatantState.Color || ""}
            disableAlpha
            onChangeComplete={color =>
              commandContext.SetCombatantColor(
                props.combatantState.Id,
                color.hex
              )
            }
          />
          <button
            className="combatant__color-clear-button c-button"
            disabled={!hasColorSet}
            onClick={() =>
              commandContext.SetCombatantColor(props.combatantState.Id, "")
            }
          >
            Clear color
          </button>
        </div>
      }
    >
      {hasColorSet ? (
        <span
          className="combatant__color fas fa-circle"
          style={{ color: props.combatantState.Color }}
        />
      ) : (
        <span className="combatant__color far fa-circle" />
      )}
    </Tippy>
  );
}

function Commands() {
  const commandContext = React.useContext(CommandContext);

  return (
    <div className="combatant__commands">
      {commandContext.CombatantCommands.map(c => (
        <CommandButton command={c} key={c.Id} />
      ))}
    </div>
  );
}

function CommandButton(props: { command: Command }) {
  const { command } = props;
  const showInCombatantRow = useSubscription(command.ShowInCombatantRow);
  const fontAwesomeIcon = useSubscription(command.FontAwesomeIcon);
  if (!showInCombatantRow) {
    return null;
  }
  const isHitDiceToggle = command.Id === "toggle-reveal-hit-dice";
  return (
    <Tippy content={`${command.Description} [${command.KeyBinding}]`}>
      <button
        className={
          "combatant__command-button fa-clickable c-button--" +
          command.Id +
          (isHitDiceToggle ? "" : " fa-" + fontAwesomeIcon)
        }
        onClick={command.ActionBinding}
        aria-label={command.Description}
      >
        {isHitDiceToggle && (
          <span className="fa-stack">
            <i className="fas fa-dice-d6 fa-stack-2x"></i>
            <i className="fas fa-slash fa-stack-2x"></i>
          </span>
        )}
      </button>
    </Tippy>
  );
}

function getClassNames(props: CombatantRowProps) {
  const classNames = ["combatant"];
  if (props.isActive) {
    classNames.push("active");
  }
  if (props.isSelected) {
    classNames.push("selected");
  }
  return classNames;
}

function getDisplayName(props: CombatantRowProps) {
  let displayName = props.combatantState.StatBlock.Name;
  if (props.combatantState.Alias?.length) {
    displayName = props.combatantState.Alias;
  } else if (props.showIndexLabel) {
    displayName = props.combatantState.IndexLabel + " " + displayName;
  }
  return displayName;
}

function renderDisplayName(props: CombatantRowProps) {
  const name = props.combatantState.Alias?.length
    ? props.combatantState.Alias
    : props.combatantState.StatBlock.Name;
  const showIndexLabel =
    props.showIndexLabel && !props.combatantState.Alias?.length;
  return (
    <>
      {showIndexLabel && (
        <strong className="combatant__index-label">
          {props.combatantState.IndexLabel}
        </strong>
      )}
      {name}
    </>
  );
}

// GM-only armor tier badge for monsters, replacing the AC column that's
// dropped entirely for monsters (see plans/Monsters/03_MONSTER_ARMOR_HP.md) -
// never sent to Player View, since ToPlayerViewCombatantState omits Armor.
// Clicking it cycles the tier (Unarmored -> Medium -> Heavy -> ...); this
// only changes which HP pool the monster would use next time it's added -
// it does not rescale this combatant's already-baked current/max HP.
function renderArmorBadge(
  props: CombatantRowProps,
  commandContext: React.ContextType<typeof CommandContext>
) {
  const armor = props.combatantState.StatBlock.Armor || "";
  const label = armor === "medium" ? "M" : armor === "heavy" ? "H" : "-";
  return (
    <Tippy
      content={`${StatBlockNamespace.ArmorDisplayNames[armor]} (click to change)`}
    >
      <strong
        className="combatant__armor-badge combatant__armor-badge--clickable"
        onClick={event => {
          commandContext.CycleArmorTierForCombatant(props.combatantState.Id);
          event.stopPropagation();
        }}
      >
        {label}
      </strong>
    </Tippy>
  );
}

function getHPStyle(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value,
    currentHP = props.combatantState.CurrentHP;
  // Do not set green any higher, low value is needed for contrast against light background
  const green = Math.floor((currentHP / maxHP) * 120);
  const red = Math.floor(((maxHP - currentHP) / maxHP) * 170);
  return { color: "rgb(" + red + "," + green + ",0)" };
}

function renderHPText(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value;
  if (props.combatantState.TemporaryHP) {
    return `${props.combatantState.CurrentHP}+${props.combatantState.TemporaryHP}/${maxHP}`;
  } else {
    return `${props.combatantState.CurrentHP}/${maxHP}`;
  }
}
function renderHPBarStyle(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value,
    currentHP = props.combatantState.CurrentHP;
  return { width: Math.floor((currentHP / maxHP) * 100) + "%" };
}

function getManaStyle(props: CombatantRowProps) {
  const maxMana = props.combatantState.StatBlock.Mana?.Value;
  if (!maxMana) {
    return {};
  }
  return { color: "var(--blue)" };
}

function renderManaText(props: CombatantRowProps) {
  const maxMana = props.combatantState.StatBlock.Mana?.Value;
  if (!maxMana) {
    return "";
  }
  if (props.combatantState.TemporaryMana) {
    return `${props.combatantState.CurrentMana ?? 0}+${props.combatantState.TemporaryMana}/${maxMana}`;
  }
  return `${props.combatantState.CurrentMana ?? 0}/${maxMana}`;
}

function renderManaBarStyle(props: CombatantRowProps) {
  const maxMana = props.combatantState.StatBlock.Mana?.Value;
  if (!maxMana) {
    return { width: "0%" };
  }
  const currentMana = props.combatantState.CurrentMana ?? 0;
  return { width: Math.floor((currentMana / maxMana) * 100) + "%" };
}

function getResourcesStyle(props: CombatantRowProps) {
  const maxResources = props.combatantState.StatBlock.Resources?.Value;
  if (!maxResources) {
    return {};
  }
  return { color: "var(--magenta)" };
}

function renderResourcesText(props: CombatantRowProps) {
  const maxResources = props.combatantState.StatBlock.Resources?.Value;
  if (!maxResources) {
    return "";
  }
  if (props.combatantState.TemporaryResources) {
    return `${props.combatantState.CurrentResources ?? 0}+${props.combatantState.TemporaryResources}/${maxResources}`;
  }
  return `${props.combatantState.CurrentResources ?? 0}/${maxResources}`;
}

function renderResourcesBarStyle(props: CombatantRowProps) {
  const maxResources = props.combatantState.StatBlock.Resources?.Value;
  if (!maxResources) {
    return { width: "0%" };
  }
  const currentResources = props.combatantState.CurrentResources ?? 0;
  return { width: Math.floor((currentResources / maxResources) * 100) + "%" };
}

function getHitDiceStyle() {
  return { color: "var(--orange)" };
}

function renderHitDiceText(props: CombatantRowProps) {
  const maxHitDice = props.combatantState.StatBlock.HitDice?.Value;
  if (!maxHitDice) {
    return "";
  }
  if (props.combatantState.TemporaryHitDice) {
    return `${props.combatantState.CurrentHitDice ?? 0}+${props.combatantState.TemporaryHitDice}/${maxHitDice}`;
  }
  return `${props.combatantState.CurrentHitDice ?? 0}/${maxHitDice}`;
}

function renderHitDiceBarStyle(props: CombatantRowProps) {
  const maxHitDice = props.combatantState.StatBlock.HitDice?.Value;
  if (!maxHitDice) {
    return { width: "0%" };
  }
  const currentHitDice = props.combatantState.CurrentHitDice ?? 0;
  return { width: Math.floor((currentHitDice / maxHitDice) * 100) + "%" };
}

function getItemsStyle(props: CombatantRowProps) {
  const maxSlots = GetMaxInventorySlots(props.combatantState.StatBlock);
  const slotsUsed = GetInventorySlotsUsed(props.combatantState.Items ?? []);
  if (slotsUsed > maxSlots) {
    return { color: "rgb(200,30,30)" };
  }
  return { color: "var(--parchment)" };
}

function renderItemsText(props: CombatantRowProps) {
  const maxSlots = GetMaxInventorySlots(props.combatantState.StatBlock);
  const slotsUsed = GetInventorySlotsUsed(props.combatantState.Items ?? []);
  return `${slotsUsed}/${maxSlots}`;
}

function getGoldStyle() {
  return { color: "var(--gold)" };
}

function renderGoldText(props: CombatantRowProps) {
  return `${props.combatantState.CurrentGold ?? 0}`;
}

function getWoundsStyle(props: CombatantRowProps) {
  const maxWounds = props.combatantState.StatBlock.Wounds?.Value;
  if (!maxWounds) {
    return {};
  }
  return { color: "var(--wound-red)" };
}

function renderWoundsText(props: CombatantRowProps) {
  const maxWounds = props.combatantState.StatBlock.Wounds?.Value;
  if (!maxWounds) {
    return "";
  }
  const currentWounds = props.combatantState.CurrentWounds ?? 0;
  if (props.combatantState.TemporaryWounds) {
    return `${currentWounds}+${props.combatantState.TemporaryWounds}/${maxWounds}`;
  }
  if (currentWounds === 0) {
    return "0";
  }
  return `${currentWounds}/${maxWounds}`;
}

function renderWoundsBarStyle(props: CombatantRowProps) {
  const maxWounds = props.combatantState.StatBlock.Wounds?.Value;
  if (!maxWounds) {
    return { width: "0%" };
  }
  const currentWounds = props.combatantState.CurrentWounds ?? 0;
  return { width: Math.floor((currentWounds / maxWounds) * 100) + "%" };
}
