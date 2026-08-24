import * as React from "react";

import { Combatant } from "../Combatant/Combatant";
import { SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";

export function InventoryCardPrompt(
  combatant: Combatant
): PromptProps<Record<string, never>> {
  const items = combatant.Items();

  return {
    autoFocusSelector: "button",
    initialValues: {},
    children: (
      <div className="p-inventory-card">
        <h3>{combatant.DisplayName()}&rsquo;s Inventory</h3>
        {items.length > 0 ? (
          <ul className="p-inventory-card__items">
            {items.map((item, index) => (
              <li key={item.Name + index}>
                {item.Stackable ? `${item.Name} ×${item.Quantity}` : item.Name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No items.</p>
        )}
        <SubmitButton />
      </div>
    ),
    onSubmit: () => true
  };
}
