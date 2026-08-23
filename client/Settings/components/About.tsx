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
            <strong>Improved Initiative</strong>
            {" was created by "}
            <a href="mailto:improvedinitiativedev@gmail.com">Evan Bailey</a>
            {". All Wizards of the Coast content provided under terms of the "}
            <a href={env.BaseUrl + "/SRD-OGL_V1.1.pdf"} target="_blank">
              Open Gaming License Version 1.0a
            </a>
            {". Additional content provided by "}
            <a href="https://open5e.com/" target="_blank">
              Open5e
            </a>
            {"."}
          </p>
        </div>
        <div className="support">
          Love Improved Initiative?
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
            href="https://www.patreon.com/join/improvedinitiative"
            target="_blank"
            onClick={() =>
              Metrics.TrackPatreonSignupIntent(
                Metrics.LeadSource.AboutTabSupporterBenefits,
                {
                  link_url: "https://www.patreon.com/join/improvedinitiative"
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
