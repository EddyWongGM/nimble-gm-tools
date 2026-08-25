import { Field, FieldProps } from "formik";
import * as React from "react";

import { Combatant } from "../Combatant/Combatant";
import { SubmitButton } from "../Components/Button";
import { AutocompleteTextInput } from "../StatBlockEditor/components/AutocompleteTextInput";
import { PromptProps } from "./PendingPrompts";

export interface ItemModel {
  itemName: string;
  stackable: boolean;
  quantity: string;
  slotCost: string;
  showInventoryCard: boolean;
}

function ItemPromptFields(props: {
  targetDisplayNames: string;
  autoCompleteOptions: string[];
  showInventoryCardShortcut: boolean;
}) {
  return (
    <div className="add-item">
      <label className="add-item__label" htmlFor="itemName">
        Add an item for {props.targetDisplayNames}
      </label>
      <div className="add-item__row">
        <AutocompleteTextInput
          fieldName="itemName"
          options={props.autoCompleteOptions}
          autoFocus
        />
        <label className="add-item__stackable-label">
          <Field type="checkbox" name="stackable" />
          Stackable
        </label>
        <Field name="stackable">
          {(fieldApi: FieldProps) =>
            fieldApi.field.value ? (
              <label className="add-item__quantity-label">
                Quantity (+/-)
                <Field type="number" name="quantity" />
              </label>
            ) : (
              <label className="add-item__slot-cost-label">
                Slot Cost
                <Field type="number" name="slotCost" />
              </label>
            )
          }
        </Field>
        <SubmitButton />
        {props.showInventoryCardShortcut && (
          <SubmitButton
            fontAwesomeIcon="scroll"
            submitIntent={["showInventoryCard", true]}
            tooltip="Show Inventory in Player View"
          />
        )}
      </div>
    </div>
  );
}

export function submitItemPrompt(
  model: ItemModel,
  targetCombatants: Combatant[],
  targetDisplayNames: string,
  logEvent: (message: string) => void,
  onShowInventoryCard?: () => void
): boolean {
  if (model.showInventoryCard) {
    onShowInventoryCard();
    return true;
  }

  const itemName = model.itemName.trim();
  if (itemName.length == 0) {
    return true;
  }

  const quantityDelta = model.stackable ? parseInt(model.quantity) : 0;
  const slotCost = parseInt(model.slotCost);

  if (model.stackable && (isNaN(quantityDelta) || quantityDelta == 0)) {
    return true;
  }

  for (const combatant of targetCombatants) {
    combatant.ApplyItemChange(
      itemName,
      model.stackable,
      quantityDelta,
      isNaN(slotCost) ? 1 : slotCost
    );
  }

  if (model.stackable) {
    const verb = quantityDelta > 0 ? "Added" : "Removed";
    logEvent(
      `${verb} ${Math.abs(quantityDelta)} ${itemName} for ${targetDisplayNames}.`
    );
  } else {
    logEvent(`Added ${itemName} for ${targetDisplayNames}.`);
  }

  return true;
}

export function ItemPrompt(
  targetCombatants: Combatant[],
  logEvent: (message: string) => void,
  onShowInventoryCard?: () => void
): PromptProps<ItemModel> {
  const targetDisplayNames = targetCombatants
    .map(c => c.DisplayName())
    .join(", ");

  const autoCompleteOptions = Array.from(
    new Set(targetCombatants.flatMap(c => c.Items().map(i => i.Name)))
  );

  return {
    initialValues: {
      itemName: "",
      stackable: false,
      quantity: "1",
      slotCost: "1",
      showInventoryCard: false
    },

    autoFocusSelector: "input",

    children: (
      <ItemPromptFields
        targetDisplayNames={targetDisplayNames}
        autoCompleteOptions={autoCompleteOptions}
        showInventoryCardShortcut={!!onShowInventoryCard}
      />
    ),

    onSubmit: (model: ItemModel) =>
      submitItemPrompt(
        model,
        targetCombatants,
        targetDisplayNames,
        logEvent,
        onShowInventoryCard
      )
  };
}
