import * as React from "react";

import { PlayerViewCombatantState } from "../../../common/PlayerViewCombatantState";
import { SpentReactionIndicator } from "./SpentReactionIndicator";

interface PlayerViewCombatantProps {
  combatant: PlayerViewCombatantState;
  isActive: boolean;
  portraitColumnVisible: boolean;
  acColumnVisible: boolean;
  manaColumnVisible: boolean;
  resourcesColumnVisible: boolean;
  hitDiceColumnVisible: boolean;
  woundsColumnVisible: boolean;
  inventoryColumnVisible: boolean;
  goldColumnVisible: boolean;
  reactionTrackerVisible: boolean;
  colorVisible: boolean;
  areSuggestionsAllowed: boolean;
  showPortrait: (state: PlayerViewCombatantState) => void;
  suggestDamage: (combatant: PlayerViewCombatantState) => void;
  suggestTag?: (combatant: PlayerViewCombatantState) => void;
}

export class PlayerViewCombatant extends React.Component<PlayerViewCombatantProps> {
  public render() {
    const classNames = ["combatant"];
    if (this.props.isActive) {
      classNames.push("active");
    }
    if (this.props.combatant.IsPlayerCharacter) {
      classNames.push("playercharacter");
    }
    if (this.props.combatant.IsCompanion) {
      classNames.push("companion");
    }
    if (this.props.combatant.IsLegendary) {
      classNames.push("legendary");
    }
    if (this.props.combatant.IsTitan) {
      classNames.push("titan");
    }
    const hasColor =
      this.props.combatant.Color && this.props.combatant.Color.length > 0;
    return (
      <li className={classNames.join(" ")}>
        {this.props.portraitColumnVisible && (
          <div className="combatant__portrait">
            {this.props.combatant.ImageURL && (
              <img
                src={this.props.combatant.ImageURL}
                onClick={() => this.props.showPortrait(this.props.combatant)}
              />
            )}
          </div>
        )}
        <div
          className={
            "combatant__name" +
            (this.props.combatant.HasTakenTurn
              ? " combatant__name--taken-turn"
              : "")
          }
        >
          {this.props.combatant.Color && hasColor && (
            <span
              className="combatant__color fas fa-circle"
              style={{ color: this.props.combatant.Color }}
            />
          )}
          {this.props.combatant.HasTakenTurn && (
            <span className="combatant__has-taken-turn-icon fas fa-check" />
          )}
          {this.props.combatant.IndexLabel !== undefined && (
            <strong className="combatant__index-label">
              {this.props.combatant.IndexLabel}
            </strong>
          )}
          {baseCombatantName(this.props.combatant)}
        </div>
        <div
          className={
            "combatant__hp combatant__hp-outer" +
            (this.props.areSuggestionsAllowed ? " show-hover" : "")
          }
        >
          <span
            className="combatant__hp-inner"
            style={{ color: this.props.combatant.HPColor }}
            onClick={() => this.props.suggestDamage(this.props.combatant)}
            dangerouslySetInnerHTML={{ __html: this.props.combatant.HPDisplay }}
          />
        </div>
        {this.props.manaColumnVisible && (
          <div className="combatant__mana">
            <span
              style={{ color: this.props.combatant.ManaColor }}
              dangerouslySetInnerHTML={{
                __html: this.props.combatant.ManaDisplay || ""
              }}
            />
          </div>
        )}
        {this.props.resourcesColumnVisible && (
          <div className="combatant__resources">
            <span
              style={{ color: this.props.combatant.ResourcesColor }}
              dangerouslySetInnerHTML={{
                __html: this.props.combatant.ResourcesDisplay || ""
              }}
            />
          </div>
        )}
        {this.props.hitDiceColumnVisible && (
          <div className="combatant__hitdice">
            <span
              style={{ color: this.props.combatant.HitDiceColor }}
              dangerouslySetInnerHTML={{
                __html: this.props.combatant.HitDiceDisplay || ""
              }}
            />
          </div>
        )}
        {this.props.woundsColumnVisible && (
          <div className="combatant__wounds">
            <span
              style={{ color: this.props.combatant.WoundsColor }}
              dangerouslySetInnerHTML={{
                __html: this.props.combatant.WoundsDisplay || ""
              }}
            />
          </div>
        )}
        {this.props.inventoryColumnVisible && (
          <div className="combatant__inventory">
            <span
              style={{ color: this.props.combatant.InventoryColor }}
              dangerouslySetInnerHTML={{
                __html: this.props.combatant.InventoryDisplay || ""
              }}
            />
          </div>
        )}
        {this.props.acColumnVisible && (
          <div className="combatant__ac">{this.props.combatant.AC || ""}</div>
        )}
        {this.props.goldColumnVisible && (
          <div
            className="combatant__gold"
            style={{ color: this.props.combatant.GoldColor }}
          >
            {this.props.combatant.GoldDisplay || ""}
          </div>
        )}
        <div className="combatant__tags">
          {this.props.combatant.Tags.map((tag, index) => (
            <div
              className="tag"
              data-tag={tag.Text.toLocaleLowerCase()}
              key={tag.Text + index}
            >
              {tag.Text}
            </div>
          ))}
          {this.props.suggestTag && (
            <div className="combatant__add-tag-button">
              <span
                className="fas fa-tag fa-clickable"
                title="Suggest a Tag"
                onClick={() => this.props.suggestTag(this.props.combatant)}
              />
            </div>
          )}
        </div>
        {this.props.reactionTrackerVisible &&
          this.props.combatant.ReactionsSpent > 0 && <SpentReactionIndicator />}
        {this.props.combatant.AbilityCharges &&
          this.props.combatant.AbilityCharges.length > 0 && (
            <div className="combatant__ability-charges">
              {this.props.combatant.AbilityCharges.map((charge, index) => (
                <div
                  className="ability-charge"
                  key={charge.Name + index}
                  title={charge.Name}
                >
                  {charge.Name} ({charge.Max - charge.Used}/{charge.Max})
                </div>
              ))}
            </div>
          )}
      </li>
    );
  }
}

function baseCombatantName(combatant: PlayerViewCombatantState): string {
  if (combatant.IndexLabel === undefined) {
    return combatant.Name;
  }
  const indexSuffix = ` ${combatant.IndexLabel}`;
  return combatant.Name.endsWith(indexSuffix)
    ? combatant.Name.slice(0, -indexSuffix.length)
    : combatant.Name;
}
