import { CombatantState, TagState } from "../../common/CombatantState";
import { EncounterState } from "../../common/EncounterState";
import { SavedEncounter } from "../../common/SavedEncounter";
import { StatBlock } from "../../common/StatBlock";
import { probablyUniqueString } from "../../common/Toolbox";
import { AccountClient } from "../Account/AccountClient";

function updateLegacySavedCombatant(savedCombatant: any) {
  if (!savedCombatant.StatBlock) {
    savedCombatant.StatBlock = savedCombatant["Statblock"];
  }
  savedCombatant.StatBlock = StatBlock.Update(savedCombatant.StatBlock);
  if (!savedCombatant.Id) {
    savedCombatant.Id = probablyUniqueString();
  }
  if (!savedCombatant.RevealedAC) {
    savedCombatant.RevealedAC = false;
  }
  if (savedCombatant.RevealedGold === undefined) {
    savedCombatant.RevealedGold = true;
  }
  if (savedCombatant.RevealedHitDice === undefined) {
    savedCombatant.RevealedHitDice = true;
  }
  if (savedCombatant.MaxHP) {
    savedCombatant.StatBlock.HP.Value = savedCombatant.MaxHP;
  }
  if (savedCombatant.Tags) {
    savedCombatant.Tags = savedCombatant.Tags.map((tag: string | TagState) => {
      if (typeof tag == "string") {
        const tagState: TagState = {
          Text: tag,
          DurationRemaining: 0,
          DurationTiming: null,
          DurationCombatantId: ""
        };
        return tagState;
      }
      return tag;
    });
  } else {
    savedCombatant.Tags = [];
  }
  if (savedCombatant.CurrentHP === undefined) {
    savedCombatant.CurrentHP = savedCombatant.StatBlock.HP.Value;
  }
  if (savedCombatant.TemporaryHP === undefined) {
    savedCombatant.TemporaryHP = 0;
  }
  if (savedCombatant.Initiative === undefined) {
    savedCombatant.Initiative = 0;
  }
  if (savedCombatant.Hidden === undefined) {
    savedCombatant.Hidden = false;
  }
}

function getActiveCombatantId(savedEncounter: any): string | null {
  if (savedEncounter.ActiveCombatantId) {
    return savedEncounter.ActiveCombatantId;
  }

  const legacyCombatantIndex = savedEncounter.ActiveCreatureIndex;
  if (legacyCombatantIndex !== undefined && legacyCombatantIndex != -1) {
    return savedEncounter.Creatures[legacyCombatantIndex].Id;
  }

  return null;
}

export function UpdateLegacySavedEncounter(
  savedEncounter: any
): SavedEncounter {
  const someName = probablyUniqueString();

  const updatedEncounter: SavedEncounter = {
    Version: savedEncounter.Version || "legacy",
    Id:
      savedEncounter.Id ||
      AccountClient.MakeId(savedEncounter.Name || someName),
    Combatants: savedEncounter.Combatants || savedEncounter.Creatures || [],
    Name: savedEncounter.Name || someName,
    Path: savedEncounter.Path || "",
    BackgroundImageUrl: savedEncounter.BackgroundImageUrl || undefined
  };

  updatedEncounter.Combatants.forEach(updateLegacySavedCombatant);

  return updatedEncounter;
}

export function UpdateLegacyEncounterState(
  encounterState: any
): EncounterState<CombatantState> {
  const updatedEncounter: EncounterState<CombatantState> = {
    Combatants: encounterState.Combatants || encounterState.Creatures || [],
    RoundCounter: encounterState.RoundCounter || 0,
    ElapsedSeconds: encounterState.ElapsedSeconds || 0,
    ActiveCombatantId: null,
    BackgroundImageUrl: encounterState.BackgroundImageUrl,
    SaveEncounterDefaults: encounterState.SaveEncounterDefaults || null
  };

  updatedEncounter.Combatants.forEach(updateLegacySavedCombatant);
  updatedEncounter.ActiveCombatantId = getActiveCombatantId(encounterState);

  return updatedEncounter;
}
