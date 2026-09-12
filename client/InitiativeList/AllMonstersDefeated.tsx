import * as React from "react";
import { CommandContext } from "./CommandContext";
import { Button } from "../Components/Button";
import Mousetrap = require("mousetrap");

export const AllMonstersDefeated = (props: { allMonstersDefeated: boolean }) => {
  const { CleanEncounter } = React.useContext(CommandContext);
  const [dismissed, setDismissed] = React.useState(false);

  // Re-arms the card the next time every monster is defeated again, rather
  // than leaving it dismissed for the rest of the session.
  React.useEffect(() => {
    if (!props.allMonstersDefeated) {
      setDismissed(false);
    }
  }, [props.allMonstersDefeated]);

  const showCard = props.allMonstersDefeated && !dismissed;

  const cleanEncounter = React.useCallback(() => {
    CleanEncounter();
  }, [CleanEncounter]);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
  }, []);

  React.useEffect(() => {
    if (!showCard) {
      return;
    }
    Mousetrap.bind("x", cleanEncounter);
    Mousetrap.bind("v", dismiss);
    return () => {
      Mousetrap.unbind("x");
      Mousetrap.unbind("v");
    };
  }, [showCard, cleanEncounter, dismiss]);

  if (!showCard) {
    return null;
  }

  return (
    <div className="all-monsters-defeated">
      <span>All monsters defeated. Clean up the encounter?</span>
      <Button
        onClick={cleanEncounter}
        text="Clean Encounter (X)"
        additionalClassNames="all-monsters-defeated__confirm"
      />
      <Button onClick={dismiss} text="Not Yet (V)" />
    </div>
  );
};
