import * as React from "react";
import { Spell } from "../../../common/Spell";
import { TextEnricherContext } from "../../TextEnricher/TextEnricher";
import { LoadingIndicator } from "../../Components/LoadingIndicator";

export function SpellDetails(props: { Spell: Spell; isLoading?: boolean }) {
  const textEnricher = React.useContext(TextEnricherContext);
  const isRule = props.Spell.EntryType === "rule";
  if (props.isLoading) {
    <div className="spell">
      <h3>{props.Spell.Name}</h3>
      {!isRule && <div className="spell-type">{getSpellType(props.Spell)}</div>}
      <LoadingIndicator />
    </div>;
  }

  return (
    <div className="spell">
      <h3>{props.Spell.Name}</h3>
      {!isRule && <div className="spell-type">{getSpellType(props.Spell)}</div>}
      {!isRule && <div className="spell-type">{getSpellCost(props.Spell)}</div>}
      <div className="spell-description">
        {textEnricher.EnrichText(props.Spell.Description)}
      </div>
      <div className="spell-source">Source: {props.Spell.Source}</div>
    </div>
  );
}

function getSpellType(spell: Spell) {
  if (spell.Tier === 0) {
    return "Cantrip";
  }

  return `Tier ${spell.Tier}`;
}

function getSpellCost(spell: Spell) {
  const parts: string[] = [];
  if (spell.Mana) {
    parts.push(`Mana ${spell.Mana}`);
  }
  if (spell.Distance) {
    parts.push(`${spell.DistanceType} ${spell.Distance}`);
  }
  return parts.join(" · ");
}
