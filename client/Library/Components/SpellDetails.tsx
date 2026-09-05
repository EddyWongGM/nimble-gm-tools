import * as React from "react";
import { Spell } from "../../../common/Spell";
import { TextEnricherContext } from "../../TextEnricher/TextEnricher";
import { LoadingIndicator } from "../../Components/LoadingIndicator";

export function SpellDetails(props: { Spell: Spell; isLoading?: boolean }) {
  const textEnricher = React.useContext(TextEnricherContext);
  const spell = props.Spell;
  const isEquipment = spell.EntryType === "equipment";
  const isSimpleEntry = spell.EntryType === "rule" || isEquipment;

  if (props.isLoading) {
    return (
      <div className="spell">
        <h3>{spell.Name}</h3>
        <LoadingIndicator />
      </div>
    );
  }

  // The stat clause (Range/Reach) reads as a bold-labeled lead-in to the
  // description's first paragraph, not a separate line - fold it into the
  // same text passed to EnrichText.
  const statLine = !isSimpleEntry ? getStatLine(spell) : "";
  const descriptionText = statLine
    ? `${statLine} ${spell.Description}`
    : spell.Description;
  const hasUpcast = !isSimpleEntry && !!spell.Upcast;
  const hasCharges = isEquipment && spell.Charges !== undefined;

  return (
    <div className="spell">
      {!isSimpleEntry && <div className="spell-badge">{getTierBadge(spell)}</div>}
      {isEquipment && !!spell.Rarity && (
        <div className="spell-badge">{capitalizeWords(spell.Rarity)}</div>
      )}
      <h3>
        <span>{spell.Name}</span>
        {!isSimpleEntry && (
          <span className="spell-actions">{getActionsLabel(spell.Actions)}</span>
        )}
      </h3>
      {!isSimpleEntry && !!spell.CastCondition && (
        <p className="spell-condition">{spell.CastCondition}</p>
      )}
      <div className="spell-description">
        {textEnricher.EnrichText(descriptionText)}
      </div>
      <div className="spell-footer">
        {hasUpcast && (
          <p className="spell-upcast">
            <strong>{spell.Tier === 0 ? "High Levels" : "Upcast"}:</strong>{" "}
            {textEnricher.EnrichText(spell.Upcast)}
          </p>
        )}
        {hasCharges && (
          <p className="spell-charges">
            <strong>Charges:</strong> {spell.Charges}
            {!!spell.Recharge && ` (${spell.Recharge})`}
          </p>
        )}
        <div className="spell-source">
          Source: {spell.Source}
          {isEquipment && !!spell.Cost && ` · ${spell.Cost} gp`}
        </div>
      </div>
    </div>
  );
}

function getTierBadge(spell: Spell) {
  return spell.Tier === 0 ? "Cantrip" : `Tier ${spell.Tier}`;
}

function capitalizeWords(value: string) {
  return value.replace(/\b\w/g, char => char.toUpperCase());
}

function getActionsLabel(actions: number) {
  const value = actions || 0;
  return `${value} Action${value === 1 ? "" : "s"}`;
}

function getStatLine(spell: Spell) {
  const clauses: string[] = [];
  if (spell.Distance) {
    clauses.push(`**${spell.DistanceType}:** ${spell.Distance}.`);
  }
  return clauses.join(" ");
}
