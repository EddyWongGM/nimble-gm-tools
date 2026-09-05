import * as React from "react";
import { SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

type SafeRestModel = {
  accept: boolean;
};

export function SafeRestPrompt(
  performSafeRest: () => void
): PromptProps<SafeRestModel> {
  return {
    autoFocusSelector: ".accept",
    children: (
      <StandardPromptLayout label="Take a Safe Rest?" fieldsDoSubmit>
        <SubmitButton fontAwesomeIcon="times" />
        <SubmitButton
          additionalClassNames="accept"
          submitIntent={["accept", true]}
        />
      </StandardPromptLayout>
    ),
    initialValues: { accept: false },
    onSubmit: model => {
      if (model.accept) {
        performSafeRest();
      }
      return true;
    }
  };
}
