import * as React from "react";
import * as _ from "lodash";

import { Toggle } from "./Toggle";
import { useRequest } from "../../Utility/useRequest";

export function ContentSettings() {
  const contentSources = useRequest("/open5e/");
  if (contentSources.loading) {
    return <div className="tab-content content">Loading Sources...</div>;
  }
  if (contentSources.error) {
    return (
      <div className="tab-content content">
        Error loading sources: {contentSources.error}
      </div>
    );
  }

  const statblockSourceKeys = _.orderBy(
    Object.keys(contentSources.data.monsterSources),
    k => contentSources.data.monsterSources[k]
  );

  const spellSourceKeys = _.orderBy(
    Object.keys(contentSources.data.spellSources),
    k => contentSources.data.spellSources[k]
  );

  return (
    <div className="tab-content content">
      <h3>Preloaded Content</h3>
      <h2>Heroes</h2>
      <Toggle fieldName="PreloadedHeroSources.local-basic-rules">
        (WIP) Starter Set
      </Toggle>
      <Toggle fieldName="PreloadedHeroSources.tutorial-heroes">
        (WIP) Tutorial Set
      </Toggle>      
      <h2>Monsters</h2>
      <Toggle fieldName="PreloadedStatBlockSources.tutorial-monsters">
        (WIP) Monster Builder Set
      </Toggle>
      <Toggle fieldName="PreloadedStatBlockSources.local-basic-rules">
        (WIP) Starter Set
      </Toggle>
      {statblockSourceKeys.map((sourceName: string) => (
        <Toggle
          key={`toggle-monsters-${sourceName}`}
          fieldName={`PreloadedStatBlockSources.${sourceName}`}
        >
          {contentSources.data.monsterSources[sourceName]}
        </Toggle>
      ))}      
      <h2>Encounters</h2>
      <Toggle fieldName="PreloadedEncounterSources.local-basic-rules">
        (WIP) Starter Set
      </Toggle>
      <h2>Compendium</h2>
      <Toggle fieldName="PreloadedSpellSources.local-basic-rules">
        (WIP) Starter Set
      </Toggle>
      {spellSourceKeys.map((sourceName: string) => (
        <Toggle
          key={`toggle-spells-${sourceName}`}
          fieldName={`PreloadedSpellSources.${sourceName}`}
        >
          {contentSources.data.spellSources[sourceName]}
        </Toggle>
      ))}
    </div>
  );
}
