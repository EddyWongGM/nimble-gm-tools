import * as React from "react";
import {
  PlayerViewCustomStyles,
  SceneImageFit
} from "../../../common/PlayerViewSettings";
import { CSSFrom } from "../CSSFrom";

export class CustomStyles extends React.Component<{
  CustomCSS: string;
  CustomStyles: PlayerViewCustomStyles;
  TemporaryBackgroundImageUrl?: string;
  TemporaryBackgroundImageFit?: SceneImageFit;
  HasEpicInitiative: boolean;
}> {
  public render() {
    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: CSSFrom(
              this.props.CustomStyles,
              this.props.TemporaryBackgroundImageUrl,
              this.props.TemporaryBackgroundImageFit,
              this.props.HasEpicInitiative
            )
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: this.props.CustomCSS }} />
      </>
    );
  }
}
