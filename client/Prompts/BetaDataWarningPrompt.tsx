import * as React from "react";
import { LegacySynchronousLocalStore } from "../Utility/LegacySynchronousLocalStore";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";
import { SubmitButton } from "../Components/Button";

const promptClassName = "p-beta-data-warning";

export function BetaDataWarningPrompt(): PromptProps<{}> {
  return {
    autoFocusSelector: "." + promptClassName + "-acknowledge",
    children: (
      <StandardPromptLayout
        className={promptClassName}
        fieldsDoSubmit
        label={
          <>
            Nimble RPG App is in a beta state. Your Heroes, Monsters, and
            Encounters are saved only in this browser unless you export them
            or set up Account Sync. Export your data periodically from
            <br />
            <strong>Settings &gt; Account</strong> to avoid losing it.
          </>
        }
      >
        <SubmitButton
          additionalClassNames={promptClassName + "-acknowledge"}
          text="Got it"
        />
      </StandardPromptLayout>
    ),
    initialValues: {},
    onSubmit: () => {
      LegacySynchronousLocalStore.Save(
        LegacySynchronousLocalStore.User,
        "AcknowledgedBetaWarning",
        true
      );
      return true;
    }
  };
}
