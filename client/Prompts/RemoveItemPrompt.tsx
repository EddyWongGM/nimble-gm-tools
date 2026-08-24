import * as React from "react";

import { InventoryItem } from "../../common/CombatantState";
import { Combatant } from "../Combatant/Combatant";
import { SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

type RemoveItemModel = { confirmed: boolean };

export function RemoveItemPrompt(
  combatant: Combatant,
  item: InventoryItem,
  logEvent: (message: string) => void
): PromptProps<RemoveItemModel> {
  return {
    autoFocusSelector: ".cancel",
    children: (
      <StandardPromptLayout
        label={`Remove ${item.Name} from ${combatant.DisplayName()}'s inventory?`}
        fieldsDoSubmit
      >
        <SubmitButton
          text="Cancel"
          fontAwesomeIcon="ban"
          additionalClassNames="cancel"
        />
        <SubmitButton
          text="Remove"
          fontAwesomeIcon="trash"
          submitIntent={["confirmed", true]}
        />
      </StandardPromptLayout>
    ),
    initialValues: { confirmed: false },
    onSubmit: model => {
      if (model.confirmed) {
        combatant.RemoveItem(item);
        logEvent(`Removed ${item.Name} from ${combatant.DisplayName()}.`);
      }
      return true;
    }
  };
}
