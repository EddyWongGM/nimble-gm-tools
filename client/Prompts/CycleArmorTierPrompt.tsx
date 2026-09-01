import * as React from "react";

import { ArmorTier, StatBlock } from "../../common/StatBlock";
import { Combatant } from "../Combatant/Combatant";
import { SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

type CycleArmorTierModel = {
  confirm: boolean;
};

export function CycleArmorTierPrompt(
  combatant: Combatant,
  nextTier: ArmorTier,
  onConfirm: () => void
): PromptProps<CycleArmorTierModel> {
  return {
    autoFocusSelector: ".confirm",
    children: (
      <StandardPromptLayout
        className="p-cycle-armor-tier"
        label={`Change ${combatant.DisplayName()}'s Armor to ${StatBlock.ArmorDisplayNames[nextTier]}? This won't change current or max HP.`}
        fieldsDoSubmit
      >
        <SubmitButton fontAwesomeIcon="times" />
        <SubmitButton
          additionalClassNames="confirm"
          submitIntent={["confirm", true]}
        />
      </StandardPromptLayout>
    ),
    initialValues: { confirm: false },
    onSubmit: model => {
      if (model.confirm) {
        onConfirm();
      }
      return true;
    }
  };
}
