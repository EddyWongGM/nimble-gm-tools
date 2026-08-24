import * as React from "react";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";

import { AbilityScores, StatBlockComponent } from "../Components/StatBlock";
import { StatBlock } from "../../common/StatBlock";
import { InventoryItem } from "../../common/CombatantState";
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
  const statBlock = useSubscription(
    props.combatantViewModel.Combatant.StatBlock
  );

  const { DisplayHPBar } = useContext(SettingsContext).TrackerView;
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
        {!StatBlock.ActsInPlayerPhase(statBlock) && challengeOrLevel}
        <span className="stat-label CurrentHP">HP</span>
        <span>
          {currentHp}
          {DisplayHPBar && (
            <span className="combatant__hp-bar">
              <span
                className="combatant__hp-bar--filled"
                style={renderHPBarStyle(currentHPPercentage)}
              />
            </span>
          )}
        </span>
        {currentMana && (
          <>
            <span className="stat-label Mana">Mana</span>
            <span>
              {currentMana}
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
        {StatBlock.ActsInPlayerPhase(statBlock) && challengeOrLevel}
      </div>
      {(currentResources || currentHitDice || currentWounds) && (
        <div className="c-combatant-details__resources-wounds">
          {currentResources && (
            <>
              <span className="stat-label Resources">Resources</span>
              <span>
                {currentResources}
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
          {currentHitDice && (
            <>
              <span className="stat-label HitDice">Hit Dice</span>
              <span>
                {currentHitDice}
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
                {currentWounds}
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
      <div className="HP AC speed Challenge">
        <span className="stat-label">Defense</span>
        <span className="stat-value">{statBlock.AC.Value}</span>
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
      </div>
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
          />
        )}
        {renderedNotes && (
          <div className="c-combatant-details__notes">{renderedNotes}</div>
        )}
        {items.length > 0 && (
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
                    title="Show Inventory as a Card"
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
      {item.Name}
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
