import * as React from "react";

import { TutorialSteps } from "./TutorialSteps";
import { useState, useEffect, useLayoutEffect } from "react";
import { Button } from "../Components/Button";
import { NotifyTutorialOfAction } from "./NotifyTutorialOfAction";
import { useCallback } from "react";
import { Metrics } from "../Utility/Metrics";

export function Tutorial(props: {
  onClose: () => void;
  onLoadSampleEncounter?: () => void;
  librariesVisible?: boolean;
  onHideLibraries?: () => void;
  isCombatantSelected?: boolean;
  onDeselectCombatant?: () => void;
}): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const close = useCallback(() => {
    document
      .querySelectorAll(".tutorial-focus")
      .forEach(e => e.classList.remove("tutorial-focus"));
    props.onClose();
  }, [props.onClose]);

  const advance = () => {
    if (stepIndex == 0) {
      Metrics.TrackEvent(Metrics.Event.TutorialBegin);
    }
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex >= TutorialSteps.length) {
      Metrics.TrackEvent(Metrics.Event.TutorialComplete);
      return close();
    }
    setStepIndex(nextStepIndex);
  };

  const endEarly = useCallback(() => {
    Metrics.TrackEvent(Metrics.Event.TutorialAbandoned, {
      step_index: stepIndex,
      step_count: TutorialSteps.length
    });
    close();
  }, [close, stepIndex]);

  const loadSampleEncounter = useCallback(() => {
    Metrics.TrackEvent(Metrics.Event.SampleEncounterLoaded, {
      source: "tutorial_welcome"
    });
    props.onLoadSampleEncounter();
    close();
  }, [close, props.onLoadSampleEncounter]);

  const step = TutorialSteps[stepIndex];

  useEffect(() => {
    Metrics.TrackEvent(Metrics.Event.TutorialStepViewed, {
      step_index: stepIndex,
      step_count: TutorialSteps.length
    });
  }, [stepIndex]);

  useEffect(() => {
    const subscription = NotifyTutorialOfAction.subscribe(action => {
      if (step.AwaitAction === action) {
        advance();
      }
    });

    return () => subscription.dispose();
  }, [stepIndex]);

  useEffect(() => {
    if (step.HideLibrariesOnEnter) {
      props.onHideLibraries?.();
    }
    if (step.DeselectCombatantOnEnter) {
      props.onDeselectCombatant?.();
    }
  }, [stepIndex]);

  useLayoutEffect(() => {
    document
      .querySelectorAll(".tutorial-focus")
      .forEach(e => e.classList.remove("tutorial-focus"));

    const focusSelector = step.RaiseSelector;
    const focusedElements =
      document.querySelectorAll<HTMLElement>(focusSelector);
    if (focusedElements.length === 0) {
      console.error("Tutorial binding broken");
      return;
    }
    focusedElements.forEach(e => e.classList.add("tutorial-focus"));
    const position = step.CalculatePosition(focusedElements);
    const tutorialWidget = document.querySelector<HTMLElement>(".tutorial");
    if (!tutorialWidget) {
      return;
    }
    tutorialWidget.style.setProperty("left", position.left + "px");
    tutorialWidget.style.setProperty("top", position.top + "px");
    // librariesVisible/isCombatantSelected are included so a step that hides
    // the Library pane or clears the selection (see the effect above)
    // re-measures once that change actually lands and the Combatants list's
    // real layout is in the DOM, instead of measuring against the stale
    // (still-hidden) layout from this render.
  }, [stepIndex, props.librariesVisible, props.isCombatantSelected]);

  return (
    <div className="tutorial">
      {stepIndex === 0 && (
        <>
          <h3>Welcome to Nimble RPG App!</h3>
          <p className="tutorial__free-notice">
            This app is free to use for anyone who already owns the content,
            is trying the system out, or cannot afford to buy it right now.
            If you enjoy Nimble and are able, please support the game by
            purchasing the official content at{" "}
            <a href="https://nimblerpg.com/" target="_blank">
              nimbleRPG.com
            </a>
            .
          </p>
        </>
      )}
      <p dangerouslySetInnerHTML={{ __html: step.Message }} />
      <Button
        onClick={advance}
        text="Next"
        additionalClassNames="next"
        disabled={step.AwaitAction !== undefined}
        key={"next-button-" + stepIndex}
      />
      {stepIndex === 0 && props.onLoadSampleEncounter && (
        <Button
          onClick={loadSampleEncounter}
          text="Load a Sample Encounter Instead"
          tooltip="Skip the guided steps and jump straight into a ready-made Encounter to explore on your own."
        />
      )}
      <Button onClick={endEarly} text="End Tutorial" />
    </div>
  );
}
