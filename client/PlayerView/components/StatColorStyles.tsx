import * as React from "react";
import { PlayerViewCustomStyles } from "../../../common/PlayerViewSettings";
import { StatColorCSSFrom } from "../CSSFrom";

/**
 * DM tracker equivalent of <CustomStyles>'s stat-color override, so an Epic
 * Tier GM's chosen stat colors (see plans/private/COLOR_CUSTOMIZATION.md)
 * apply to the tracker too, not just Player View. Deliberately only emits
 * the stat-color subset of CSSFrom, not the GM's freeform
 * PlayerView.CustomCSS/CustomStyles fields - those are Player-View-only by
 * design and shouldn't leak into the DM's own screen.
 *
 * Always mounted (not conditional on hasEpicInitiative at the call site) -
 * StatColorCSSFrom itself decides whether to neutralize or allow color
 * based on the flag, since it needs to actively override the fixed colorful
 * defaults with a neutral color below Epic Tier, not just skip overriding.
 */
export function StatColorStyles(props: {
  customStyles: PlayerViewCustomStyles;
  hasEpicInitiative: boolean;
}) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: StatColorCSSFrom(props.customStyles, props.hasEpicInitiative)
      }}
    />
  );
}
