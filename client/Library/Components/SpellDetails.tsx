import * as React from "react";
import { Spell } from "../../../common/Spell";
import { TextEnricherContext } from "../../TextEnricher/TextEnricher";
import { LoadingIndicator } from "../../Components/LoadingIndicator";

export function SpellDetails(props: { Spell: Spell; isLoading?: boolean }) {
  const textEnricher = React.useContext(TextEnricherContext);
  const spell = props.Spell;
  const isRule = spell.EntryType === "rule";

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
  const statLine = !isRule ? getStatLine(spell) : "";
  const descriptionText = statLine
    ? `${statLine} ${spell.Description}`
    : spell.Description;
  const hasUpcast = !isRule && !!spell.Upcast;

  return (
    <div className="spell">
      {!isRule && <div className="spell-badge">{getTierBadge(spell)}</div>}
      <h3>
        <span>{spell.Name}</span>
        {!isRule && (
          <span className="spell-actions">{getActionsLabel(spell.Actions)}</span>
        )}
      </h3>
      {!isRule && !!spell.CastCondition && (
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
        <div className="spell-source">Source: {spell.Source}</div>
      </div>
    </div>
  );
}

function getTierBadge(spell: Spell) {
  return spell.Tier === 0 ? "Cantrip" : `Tier ${spell.Tier}`;
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
