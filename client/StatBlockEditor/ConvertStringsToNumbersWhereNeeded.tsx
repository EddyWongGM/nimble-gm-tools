import { StatBlock } from "../../common/StatBlock";

export const ConvertStringsToNumbersWhereNeeded = (statBlock: StatBlock) => {
  StatBlock.VisibleAbilityNames.forEach(
    a => (statBlock.Abilities[a] = castToNumberOrZero(statBlock.Abilities[a]))
  );
  statBlock.HP.Value = castToNumberOrZero(statBlock.HP.Value);
  statBlock.AC.Value = castToNumberOrZero(statBlock.AC.Value);
  if (statBlock.HPMediumArmor) {
    statBlock.HPMediumArmor.Value = castToNumberOrZero(
      statBlock.HPMediumArmor.Value
    );
  }
  if (statBlock.HPHeavyArmor) {
    statBlock.HPHeavyArmor.Value = castToNumberOrZero(
      statBlock.HPHeavyArmor.Value
    );
  }
  if (statBlock.LastStageHP) {
    statBlock.LastStageHP.Value = castToNumberOrZero(
      statBlock.LastStageHP.Value
    );
  }
  if (statBlock.Mana) {
    statBlock.Mana.Value = castToNumberOrZero(statBlock.Mana.Value);
  }
  if (statBlock.Resources) {
    statBlock.Resources.Value = castToNumberOrZero(statBlock.Resources.Value);
  }
  if (statBlock.HitDice) {
    statBlock.HitDice.Value = castToNumberOrZero(statBlock.HitDice.Value);
  }
  if (statBlock.Wounds) {
    statBlock.Wounds.Value = castToNumberOrZero(statBlock.Wounds.Value);
  }
  statBlock.InitiativeModifier = castToNumberOrZero(
    statBlock.InitiativeModifier
  );
  if (statBlock.SaveDC !== undefined) {
    statBlock.SaveDC =
      (statBlock.SaveDC as unknown) === ""
        ? undefined
        : castToNumberOrZero(statBlock.SaveDC);
  }
};

function castToNumberOrZero(value?: any) {
  if (!value) {
    return 0;
  }
  try {
    const parsedValue = parseInt(value.toString(), 10);
    if (isNaN(parsedValue)) {
      return 0;
    }
    return parsedValue;
  } catch {
    return 0;
  }
}
