import * as React from "react";
import { Button } from "../../Components/Button";
import { env } from "../../Environment";
import { Metrics } from "../../Utility/Metrics";
import { RebuildServer } from "../../Utility/RebuildServer";
import { ConfirmAndShutdownServer } from "../../Utility/ShutdownServer";
import { TipCarousel } from "./TipCarousel";

interface AboutProps {
  repeatTutorial: () => void;
  reviewPrivacyPolicy: () => void;
}

type RebuildStatus = "idle" | "building" | "success" | "error";

interface AboutState {
  rebuildStatus: RebuildStatus;
  rebuildError?: string;
}

export class About extends React.Component<AboutProps, AboutState> {
  public state: AboutState = { rebuildStatus: "idle" };

  private rebuildServer = async () => {
    this.setState({ rebuildStatus: "building", rebuildError: undefined });
    try {
      await RebuildServer();
      this.setState({ rebuildStatus: "success" });
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 409
          ? "A build is already in progress."
          : err.response?.data?.output || err.message;
      this.setState({ rebuildStatus: "error", rebuildError: message });
    }
  };

  public render() {
    const { rebuildStatus, rebuildError } = this.state;
    return (
      <div className="tab-content about">
        <div>
          <p>
            Nimble RPG App is an independent product published under the Nimble
            3rd Party Creator License. Nimble © Nimble Co.
          </p>
          <p>
            <strong>Nimble RPG App</strong>
            {" was created by "}
            <a href="https://github.com/EddyWongGM" target="_blank">
              Eddy Wong
            </a>
            {". All Nimble content provided under terms of the "}
            <a href="https://nimblerpg.com/pages/creators" target="_blank">
              Nimble 3rd Party Creator License v2.0
            </a>
            {"."}
          </p>
          <p>
            This app is free to use for anyone who already owns the content, is
            trying the system out, or cannot afford to buy it right now. If you
            enjoy Nimble and are able, please support the game by purchasing the
            official content at{" "}
            <a href="https://nimblerpg.com/" target="_blank">
              nimbleRPG.com
            </a>
            .
          </p>
        </div>
        <div className="support">
          Love Nimble RPG App?
          <div
            className="fb-like"
            data-href="https://www.facebook.com/improvedinitiativeapp/"
            data-layout="button"
            data-action="recommend"
            data-size="large"
            data-show-faces="false"
            data-share="false"
          />
          <a
            className="pledge"
            href="https://www.patreon.com/join/NimbleRPGApp"
            target="_blank"
            onClick={() =>
              Metrics.TrackPatreonSignupIntent(
                Metrics.LeadSource.AboutTabSupporterBenefits,
                {
                  link_url: "https://www.patreon.com/join/NimbleRPGApp"
                }
              )
            }
          >
            <img src="/img/become_a_patron_button.png" />
          </a>
        </div>
        <h2>Did you know?</h2>
        <TipCarousel />
        <div className="commands">
          <span
            className="button review-privacy"
            onClick={this.props.reviewPrivacyPolicy}
          >
            Review Privacy Policy
          </span>
          <Button
            additionalClassNames="repeat-tutorial"
            fontAwesomeIcon="hat-wizard"
            text="Repeat Tutorial"
            onClick={this.props.repeatTutorial}
          />
          {env.CanRebuildServer && (
            <Button
              additionalClassNames="rebuild-server"
              fontAwesomeIcon="hammer"
              text={
                rebuildStatus === "building" ? "Building…" : "Rebuild Client"
              }
              disabled={rebuildStatus === "building"}
              onClick={this.rebuildServer}
            />
          )}
          {env.CanShutdownServer && (
            <Button
              additionalClassNames="shutdown-server"
              fontAwesomeIcon="power-off"
              text="Shut Down Server"
              onClick={ConfirmAndShutdownServer}
            />
          )}
        </div>
        {rebuildStatus === "success" && (
          <p className="rebuild-status rebuild-status--success">
            Build complete. Refresh to see changes.
          </p>
        )}
        {rebuildStatus === "error" && (
          <p className="rebuild-status rebuild-status--error">
            Build failed: {rebuildError}
          </p>
        )}
        <div className="about__version">
          Version {process.env.VERSION || "unknown"}
        </div>
      </div>
    );
  }
}
