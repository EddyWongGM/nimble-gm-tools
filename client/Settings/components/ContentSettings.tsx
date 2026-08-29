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
      <h2>Monsters</h2>
      <Toggle fieldName="PreloadedStatBlockSources.local-basic-rules">
        Basic (Local)
      </Toggle>
      {statblockSourceKeys.map((sourceName: string) => (
        <Toggle
          key={`toggle-monsters-${sourceName}`}
          fieldName={`PreloadedStatBlockSources.${sourceName}`}
        >
          {contentSources.data.monsterSources[sourceName]}
        </Toggle>
      ))}      
      <h2>Heroes</h2>
      <Toggle fieldName="PreloadedHeroSources.local-basic-rules">
        Basic (Local)
      </Toggle>
      <Toggle fieldName="PreloadedHeroSources.tutorial-heroes">
        Tutorial (Local)
      </Toggle>
      <h2>Spells</h2>
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
