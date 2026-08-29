import * as React from "react";
import { InventoryDisplayPayload } from "../../../common/InventoryDisplay";

export class InventoryDisplayPopup extends React.Component<InventoryDisplayProps> {
  public render() {
    const items = this.props.inventory.items;
    return (
      <form className="inventory-display-popup">
        <div className="inventory-display">
          <div className="inventory-display__header">
            <h4>{this.props.inventory.combatantName}&rsquo;s Inventory</h4>
          </div>
          {items.length > 0 ? (
            <ul className="inventory-display__items">
              {items.map((item, index) => (
                <li key={index}>
                  {item.Stackable && !this.props.hideNumbers
                    ? `${item.Name} ×${item.Quantity}`
                    : item.Name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="inventory-display__empty">No items.</p>
          )}
        </div>
      </form>
    );
  }
}

interface InventoryDisplayProps {
  inventory: InventoryDisplayPayload;
  hideNumbers?: boolean;
}
