import * as React from "react";
import {
  ToggleFullscreen,
  FullscreenSupported
} from "../../Commands/ToggleFullscreen";

export const PlayerViewCombatantHeader = (props: {
  portraitColumnVisible: boolean;
  acColumnVisible: boolean;
  manaColumnVisible: boolean;
  resourcesColumnVisible: boolean;
  hitDiceColumnVisible: boolean;
  woundsColumnVisible: boolean;
  inventoryColumnVisible: boolean;
  goldColumnVisible: boolean;
}) => (
  <div className="combatant--header">
    {props.portraitColumnVisible && <div className="combatant__portrait" />}
    <div className="combatant__name">Name</div>
    <div className="combatant__hp">
      <span className="fas fa-heart" style={{ color: "var(--stat-hp)" }} />
    </div>
    {props.manaColumnVisible && (
      <div className="combatant__mana">
        <span className="fas fa-tint" style={{ color: "var(--stat-mana)" }} />
      </div>
    )}
    {props.resourcesColumnVisible && (
      <div className="combatant__resources">
        <span
          className="fas fa-bolt"
          style={{ color: "var(--stat-resources)" }}
        />
      </div>
    )}
    {props.hitDiceColumnVisible && (
      <div className="combatant__hitdice">
        <span
          className="fas fa-dice-d6"
          style={{ color: "var(--stat-hitdice)" }}
        />
      </div>
    )}
    {props.woundsColumnVisible && (
      <div className="combatant__wounds">
        <span
          className="fas fa-skull"
          style={{ color: "var(--stat-wounds)" }}
        />
      </div>
    )}
    {props.inventoryColumnVisible && (
      <div className="combatant__inventory">
        <span
          className="fas fa-scroll"
          style={{ color: "var(--stat-inventory)" }}
        />
      </div>
    )}
    {props.acColumnVisible && (
      <div className="combatant__ac">
        <span className="fas fa-shield-alt" />
      </div>
    )}
    {props.goldColumnVisible && (
      <div className="combatant__gold">
        <span className="fas fa-coins" style={{ color: "var(--stat-gold)" }} />
      </div>
    )}
    <div className="combatant__tags">
      <span className="fas fa-tag" />
      {FullscreenSupported() && (
        <span
          className="fas fa-expand fa-clickable"
          title="Toggle Full Screen"
          onClick={ToggleFullscreen}
        />
      )}
    </div>
  </div>
);
