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

  return (
    <div className="spell">
      <h3>{spell.Name}</h3>
      {!isRule && (
        <div className="spell-details">
          <p>
            <label>Tier</label>
            <span className="spell-value">{getTierValue(spell)}</span>
          </p>
          {spell.Mana != null && (
            <p>
              <label>Mana</label>
              <span className="spell-value">{spell.Mana}</span>
            </p>
          )}
          {!!spell.Distance && (
            <p>
              <label>{spell.DistanceType}</label>
              <span className="spell-value">{spell.Distance}</span>
            </p>
          )}
          {!!spell.Duration && (
            <p>
              <label>Duration</label>
              <span className="spell-value">{spell.Duration}</span>
            </p>
          )}
          {!!spell.CastingTime && (
            <p>
              <label>Requires</label>
              <span className="spell-value">{spell.CastingTime}</span>
            </p>
          )}
        </div>
      )}
      <div className="spell-description">
        {textEnricher.EnrichText(spell.Description)}
      </div>
      <div className="spell-source">Source: {spell.Source}</div>
    </div>
  );
}

function getTierValue(spell: Spell) {
  return spell.Tier === 0 ? "Cantrip" : spell.Tier;
}
