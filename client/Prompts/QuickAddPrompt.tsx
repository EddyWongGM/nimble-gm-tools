import * as React from "react";
import { StatBlock } from "../../common/StatBlock";
import { Metrics } from "../Utility/Metrics";
import { PromptProps } from "./PendingPrompts";
import { Field } from "formik";
import { StandardPromptLayout } from "./StandardPromptLayout";

type QuickAddModel = {
  Name: string;
  MaxHP: number;
  SaveDC: number;
  Initiative: number;
};

export function QuickAddPrompt(
  addStatBlock: (statBlock: StatBlock) => void
): PromptProps<QuickAddModel> {
  return {
    autoFocusSelector: "input[name='Name']",
    children: (
      <StandardPromptLayout className="p-quick-add" label="Quick Add Name">
        <Field name="Name" type="text" placeholder="Name" autoComplete="off" />
        <Field name="MaxHP" type="number" placeholder="HP" />
        <Field name="SaveDC" type="number" placeholder="Save DC" />
        <Field name="Initiative" type="number" placeholder="Init" />
      </StandardPromptLayout>
    ),
    initialValues: {
      Name: "",
      MaxHP: null,
      SaveDC: null,
      Initiative: null
    },
    onSubmit: model => {
      if (model.MaxHP == null) {
        return false;
      }

      const statBlock: StatBlock = {
        ...StatBlock.Default(),
        Name: model.Name || "New Name",
        HP: { Value: model.MaxHP, Notes: "" },
        SaveDC: model.SaveDC ?? undefined,
        InitiativeModifier: model.Initiative ?? 0
      };

      addStatBlock(statBlock);
      Metrics.TrackEvent(Metrics.Event.CombatantQuickAdded, {
        name: model.Name
      });
      return true;
    }
  };
}
