import * as React from "react";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";

import { AbilityScores, StatBlockComponent } from "../Components/StatBlock";
import { StatBlock } from "../../common/StatBlock";
import { InventoryItem } from "../../common/CombatantState";
import { toModifierString } from "../../common/Toolbox";
import { StatBlockHeader } from "../Components/StatBlockHeader";
import { TextEnricherContext } from "../TextEnricher/TextEnricher";
import { Combatant } from "./Combatant";
import { CombatantViewModel } from "./CombatantViewModel";
import { useSubscription } from "./linkComponentToObservables";
import { SettingsContext } from "../Settings/SettingsContext";
import { Tag } from "./Tag";
import { useContext } from "react";

interface CombatantDetailsProps {
  combatantViewModel: CombatantViewModel;
  displayMode: "default" | "active" | "status-only";
  key: string;
  onRemoveItem?: (combatant: Combatant, item: InventoryItem) => void;
  onShowInventoryCard?: (combatant: Combatant) => void;
  showChallengeInfo?: boolean;
}

export function CombatantDetails(props: CombatantDetailsProps): JSX.Element {
  const TextEnricher = useContext(TextEnricherContext);
  const currentHp = useSubscription(props.combatantViewModel.HP);
  const currentHPPercentage = useSubscription(
    props.combatantViewModel.HPPercentage
  );
  const currentMana = useSubscription(props.combatantViewModel.Mana);
  const currentManaPercentage = useSubscription(
    props.combatantViewModel.ManaPercentage
  );
  const currentResources = useSubscription(props.combatantViewModel.Resources);
  const currentResourcesPercentage = useSubscription(
    props.combatantViewModel.ResourcesPercentage
  );
  const currentHitDice = useSubscription(props.combatantViewModel.HitDice);
  const currentHitDicePercentage = useSubscription(
    props.combatantViewModel.HitDicePercentage
  );
  const currentWounds = useSubscription(props.combatantViewModel.Wounds);
  const currentWoundsPercentage = useSubscription(
    props.combatantViewModel.WoundsPercentage
  );
  const currentTemporaryHP = useSubscription(
    props.combatantViewModel.Combatant.TemporaryHP
  );
  const initiativeBonus = useSubscription(
    props.combatantViewModel.Combatant.InitiativeBonus
  );
  const name = useSubscription(props.combatantViewModel.Name);
  const tags = useSubscription(props.combatantViewModel.Combatant.Tags);
  const items = useSubscription(props.combatantViewModel.Combatant.Items);
  const inventorySlotsUsed = useSubscription(
    props.combatantViewModel.Combatant.InventorySlotsUsed
  );
  const maxInventorySlots = useSubscription(
    props.combatantViewModel.Combatant.MaxInventorySlots
  );
  const notes = useSubscription(
    props.combatantViewModel.Combatant.CurrentNotes
  );
  const abilityChargesUsed = useSubscription(
    props.combatantViewModel.Combatant.AbilityChargesUsed
  );
  const statBlock = useSubscription(
    props.combatantViewModel.Combatant.StatBlock
  );

  const { DisplayHPBar } = useContext(SettingsContext).TrackerView;
  const { EnableInventory } = useContext(SettingsContext).Rules;
  if (!props.combatantViewModel) {
    return null;
  }

  const renderedNotes = notes.length
    ? TextEnricher.EnrichText(
        notes,
        props.combatantViewModel.Combatant.CurrentNotes
      )
    : null;

  const challengeOrLevel = statBlock.Challenge && (
    <>
      <span className="stat-label Level">
        {statBlock.Player == "player" ? "Level" : "Challenge"}
      </span>
      <span className="stat-value">{statBlock.Challenge}</span>
      {!StatBlock.ActsInPlayerPhase(statBlock) && statBlock.Speed.length > 0 && (
        <>
          <span className="stat-label Speed">Speed</span>
          <span className="stat-value">
            {statBlock.Speed.map((speed, i) => (
              <span
                className="stat-value__item"
                key={"stat-value__speed-" + i}
              >
                {speed}
              </span>
            ))}
          </span>
        </>
      )}
    </>
  );

  return (
    <div className="c-combatant-details">
      <StatBlockHeader
        name={name}
        statBlockName={statBlock.Name}
        source={statBlock.Source}
        type={statBlock.Type}
        imageUrl={statBlock.ImageURL}
      />
      {StatBlock.IsPlayerCharacter(statBlock) && (
        <>
          <AbilityScores statBlock={statBlock} />
          <hr />
        </>
      )}
      <div className="c-combatant-details__hp">
        {!StatBlock.IsRoomInfo(statBlock) && (
          <>
            <span className="stat-label CurrentHP">HP</span>
            <span>
              <EditableStat
                value={currentHp}
                ariaLabel={`Apply damage or healing to ${name}`}
                onCommit={delta =>
                  props.combatantViewModel.ApplyHPDelta(delta)
                }
              />
              {DisplayHPBar && (
                <span className="combatant__hp-bar">
                  <span
                    className="combatant__hp-bar--filled"
                    style={renderHPBarStyle(currentHPPercentage)}
                  />
                </span>
              )}
            </span>
            <span className="stat-label TemporaryHP">Temp HP</span>
            <span>
              <EditableStat
                value={currentTemporaryHP.toString()}
                ariaLabel={`Grant temporary HP to ${name}`}
                onCommit={amount =>
                  props.combatantViewModel.ApplyTemporaryHPGrant(amount)
                }
              />
            </span>
          </>
        )}
        {currentMana && (
          <>
            <span className="stat-label Mana">Mana</span>
            <span>
              <EditableStat
                value={currentMana}
                ariaLabel={`Spend or restore mana for ${name}`}
                onCommit={delta =>
                  props.combatantViewModel.ApplyManaDelta(delta)
                }
              />
              {DisplayHPBar && (
                <span className="combatant__hp-bar">
                  <span
                    className="combatant__hp-bar--filled"
                    style={renderHPBarStyle(currentManaPercentage)}
                  />
                </span>
              )}
            </span>
          </>
        )}
        {challengeOrLevel}
      </div>
      <div className="c-combatant-details__defense-resources">
        {StatBlock.ActsInPlayerPhase(statBlock) ? (
          <>
            <span className="stat-label">Defense</span>
            <span className="stat-value">{statBlock.AC.Value}</span>
          </>
        ) : (
          statBlock.Armor && (
            <>
              <span className="stat-label">Armor</span>
              <span className="stat-value">
                {StatBlock.ArmorDisplayNames[statBlock.Armor]}
              </span>
            </>
          )
        )}
        {props.showChallengeInfo && statBlock.CRRating && (
          <>
            <span className="stat-label CRRating">CR Rating</span>
            <span className="stat-value">{statBlock.CRRating}</span>
          </>
        )}
        {props.showChallengeInfo && statBlock.SaveDC != null && (
          <>
            <span className="stat-label SaveDC">Save DC</span>
            <span className="stat-value">{statBlock.SaveDC}</span>
          </>
        )}
        {currentResources && (
          <>
            <span className="stat-label Resources">Resources</span>
            <span>
              <EditableStat
                value={currentResources}
                ariaLabel={`Spend or restore resources for ${name}`}
                onCommit={delta =>
                  props.combatantViewModel.ApplyResourcesDelta(delta)
                }
              />
              {DisplayHPBar && (
                <span className="combatant__hp-bar">
                  <span
                    className="combatant__hp-bar--filled"
                    style={renderHPBarStyle(currentResourcesPercentage)}
                  />
                </span>
              )}
            </span>
          </>
        )}
      </div>
      {(currentHitDice || currentWounds) && (
        <div className="c-combatant-details__hitdice-wounds">
          {currentHitDice && (
            <>
              <span className="stat-label HitDice">
                Hit Dice
                {statBlock.HitDice?.Notes && ` (${statBlock.HitDice.Notes})`}
              </span>
              <span>
                <EditableStat
                  value={currentHitDice}
                  ariaLabel={`Spend or restore Hit Dice for ${name}`}
                  onCommit={delta =>
                    props.combatantViewModel.ApplyHitDiceDelta(delta)
                  }
                />
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderHPBarStyle(currentHitDicePercentage)}
                    />
                  </span>
                )}
              </span>
            </>
          )}
          {currentWounds && (
            <>
              <span className="stat-label Wounds">Wounds</span>
              <span>
                <EditableStat
                  value={currentWounds}
                  ariaLabel={`Add or heal wounds for ${name}`}
                  onCommit={delta =>
                    props.combatantViewModel.ApplyWoundsDelta(delta)
                  }
                />
                {DisplayHPBar && (
                  <span className="combatant__hp-bar">
                    <span
                      className="combatant__hp-bar--filled"
                      style={renderHPBarStyle(currentWoundsPercentage)}
                    />
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      )}
      {StatBlock.ActsInPlayerPhase(statBlock) && (
        <div className="c-combatant-details__speed-initiative">
          {statBlock.Speed.length > 0 && (
            <>
              <span className="stat-label Speed">Speed</span>
              <span className="stat-value">
                {statBlock.Speed.map((speed, i) => (
                  <span
                    className="stat-value__item"
                    key={"stat-value__speed-" + i}
                  >
                    {speed}
                  </span>
                ))}
              </span>
            </>
          )}
          {StatBlock.ActsInPlayerPhase(statBlock) && (
            <>
              <span className="stat-label Initiative">Initiative</span>
              <span className="stat-value">
                {toModifierString(initiativeBonus)}
              </span>
            </>
          )}
        </div>
      )}
      {tags.length > 0 && (
        <div className="c-combatant-details__tags">
          <span className="stat-label">Tags</span>{" "}
          <span className="stat-value">
            {tags.map((tag, index) => (
              <React.Fragment key={index}>
                <TagDetails tag={tag} />
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
      <div className="c-combatant-details__scrollable">
        {props.displayMode !== "status-only" && (
          <StatBlockComponent
            statBlock={statBlock}
            displayMode={props.displayMode}
            hideName
            hideTopRow
            hideAbilities
            abilityChargesUsed={abilityChargesUsed}
            onSetAbilityCharge={(abilityName, count) =>
              props.combatantViewModel.SetAbilityChargesUsed(
                abilityName,
                count
              )
            }
          />
        )}
        {renderedNotes && (
          <div className="c-combatant-details__notes">{renderedNotes}</div>
        )}
        {EnableInventory && items.length > 0 && (
          <>
            {props.displayMode === "status-only" && <hr />}
            <div className="c-combatant-details__items">
              <div className="c-combatant-details__items-header">
                <h4 className="stat-label">Inventory</h4>
                <span className="stat-value">
                  ({inventorySlotsUsed}/{maxInventorySlots} slots)
                </span>
                {props.onShowInventoryCard && (
                  <span
                    className="c-combatant-details__items-toggle fas fa-scroll fa-clickable"
                    title="Show Inventory in Player View"
                    onClick={() =>
                      props.onShowInventoryCard(
                        props.combatantViewModel.Combatant
                      )
                    }
                  />
                )}
              </div>
              <ul className="c-combatant-details__item-list">
                {items.map((item, index) => (
                  <ItemDetails
                    key={item.Name + index}
                    item={item}
                    index={index}
                    combatant={props.combatantViewModel.Combatant}
                    dragDropType={
                      "combatant-item-" + props.combatantViewModel.Combatant.Id
                    }
                    onRemoveItem={props.onRemoveItem}
                  />
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TagDetails(props: { tag: Tag }) {
  const notExpired = useSubscription(props.tag.NotExpired);
  const durationRemaining = useSubscription(props.tag.DurationRemaining);
  if (!notExpired) {
    return null;
  }
  if (props.tag.HasDuration) {
    return (
      <span className="stat-value__item">
        {props.tag.Text} ({durationRemaining} more rounds)
      </span>
    );
  }

  return <span className="stat-value__item">{props.tag.Text}</span>;
}

type ItemDragData = {
  type: string;
  index: number;
};

function ItemDetails(props: {
  item: InventoryItem;
  index: number;
  combatant: Combatant;
  dragDropType: string;
  onRemoveItem?: (combatant: Combatant, item: InventoryItem) => void;
}) {
  const { item, index, combatant, dragDropType } = props;
  const textEnricher = useContext(TextEnricherContext);

  const removeItem = () =>
    props.onRemoveItem
      ? props.onRemoveItem(combatant, item)
      : combatant.RemoveItem(item);

  const onQuantityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    if (isNaN(newQuantity) || newQuantity === item.Quantity) {
      e.target.value = item.Quantity.toString();
      return;
    }
    combatant.ApplyItemChange(
      item.Name,
      true,
      newQuantity - item.Quantity,
      item.SlotCost
    );
  };

  const [, drag] = useDrag({
    item: { index, type: dragDropType } as ItemDragData
  });

  const [collectedProps, drop] = useDrop({
    accept: dragDropType,
    drop: (dragItem: ItemDragData) => {
      if (dragItem.index !== index) {
        combatant.MoveItem(dragItem.index, index);
      }
    },
    collect: (monitor: DropTargetMonitor) => {
      if (!monitor.isOver() || monitor.getItemType() !== dragDropType) {
        return { draggedIndex: null };
      }
      return { draggedIndex: (monitor.getItem() as ItemDragData).index };
    }
  });

  const classNames = ["c-combatant-details__item"];
  if (collectedProps.draggedIndex !== null) {
    if (collectedProps.draggedIndex > index) {
      classNames.push("drop-before");
    } else if (collectedProps.draggedIndex < index) {
      classNames.push("drop-after");
    }
  }

  return (
    <li
      className={classNames.join(" ")}
      ref={node => drag(drop(node))}
    >
      <span
        className="c-combatant-details__item-grip fas fa-grip-vertical"
        aria-hidden="true"
      />
      {textEnricher.EnrichInlineText(item.Name)}
      {item.Stackable && (
        <>
          {" "}
          <input
            type="number"
            className="counter c-combatant-details__item-quantity"
            min={0}
            defaultValue={item.Quantity}
            onBlur={onQuantityBlur}
            aria-label={`${item.Name} quantity`}
          />
        </>
      )}
      <button
        aria-label={`Remove ${item.Name}`}
        className="c-combatant-details__item-remove fa-clickable fa-times"
        onClick={removeItem}
      ></button>
    </li>
  );
}

function renderHPBarStyle(currentHPPercentage) {
  return { width: currentHPPercentage };
}

// Click-to-edit numeric input, shared by HP/Temp HP/Mana/Resources/Hit
// Dice/Wounds in the right pane. Renders as plain text (matching the read-
// only look) until clicked; on blur, commits the typed number via
// props.onCommit - callers decide whether that's a delta (damage/healing,
// spend/restore) or an absolute grant (Temp HP).
function EditableStat(props: {
  value: string;
  ariaLabel: string;
  onCommit: (value: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const pendingValueRef = React.useRef("");
  const settledRef = React.useRef(false);

  const commitPending = () => {
    if (settledRef.current) {
      return;
    }
    settledRef.current = true;
    const value = parseInt(pendingValueRef.current);
    if (!isNaN(value) && value !== 0) {
      props.onCommit(value);
    }
  };

  React.useEffect(() => {
    if (!editing) {
      return;
    }
    // Explicit flush: CombatantDetails remounts via a changed `key` when the
    // selection changes, which can unmount this input without a blur event
    // ever firing. Reading from a plain ref (not the DOM node) means this
    // still works even though refs to the input itself may already be torn
    // down by the time this cleanup runs.
    return commitPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const startEditing = () => {
    pendingValueRef.current = "";
    settledRef.current = false;
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        type="number"
        className="c-combatant-details__stat-input"
        autoFocus
        aria-label={props.ariaLabel}
        onChange={e => {
          pendingValueRef.current = e.target.value;
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            settledRef.current = true;
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          commitPending();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className="c-combatant-details__stat-value--editable"
      tabIndex={0}
      role="button"
      aria-label={props.ariaLabel}
      onClick={startEditing}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
    >
      {props.value}
    </span>
  );
}
