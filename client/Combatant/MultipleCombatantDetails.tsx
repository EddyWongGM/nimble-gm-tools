import * as React from "react";
import { TextEnricher } from "../TextEnricher/TextEnricher";
import { CombatantDetails } from "./CombatantDetails";
import { CombatantViewModel } from "./CombatantViewModel";
import { Combatant } from "./Combatant";
import { InventoryItem } from "../../common/CombatantState";

interface MultipleCombatantDetailsProps {
  combatants: CombatantViewModel[];
  onRemoveItem?: (combatant: Combatant, item: InventoryItem) => void;
  onShowInventoryCard?: (combatant: Combatant) => void;
}

export class MultipleCombatantDetails extends React.Component<MultipleCombatantDetailsProps> {
  public render() {
    return (
      <div className="c-multiple-combatant-details">
        {this.props.combatants.map(c => (
          <CombatantDetails
            combatantViewModel={c}
            displayMode="status-only"
            key={c.Combatant.Id}
            onRemoveItem={this.props.onRemoveItem}
            onShowInventoryCard={this.props.onShowInventoryCard}
          />
        ))}
      </div>
    );
  }
}
