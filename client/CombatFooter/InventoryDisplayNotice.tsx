import * as React from "react";

export function InventoryDisplayNotice(props: {
  combatantName: string;
  onDismiss: () => void;
}) {
  return (
    <label className="inventory-display-notice">
      <input type="checkbox" checked onChange={props.onDismiss} />
      Showing {props.combatantName}&rsquo;s inventory to players
    </label>
  );
}
