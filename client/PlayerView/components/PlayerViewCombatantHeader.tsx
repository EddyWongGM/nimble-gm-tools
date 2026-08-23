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
      <span className="fas fa-heart" style={{ color: "var(--green)" }} />
    </div>
    {props.manaColumnVisible && (
      <div className="combatant__mana">
        <span className="fas fa-tint" style={{ color: "var(--blue)" }} />
      </div>
    )}
    {props.resourcesColumnVisible && (
      <div className="combatant__resources">
        <span className="fas fa-bolt" style={{ color: "var(--yellow)" }} />
      </div>
    )}
    {props.hitDiceColumnVisible && (
      <div className="combatant__hitdice">
        <span className="fas fa-dice-d20" style={{ color: "var(--orange)" }} />
      </div>
    )}
    {props.woundsColumnVisible && (
      <div className="combatant__wounds">
        <span
          className="fas fa-skull"
          style={{ color: "var(--wound-red)" }}
        />
      </div>
    )}
    {props.inventoryColumnVisible && (
      <div className="combatant__inventory">
        <span
          className="fas fa-dice-d6"
          style={{ color: "var(--white)", position: "relative", top: "2px" }}
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
        <span className="fas fa-coins" style={{ color: "var(--gold)" }} />
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
