import { PlayerViewCombatantState } from "../../common/PlayerViewCombatantState";
import { StatBlock } from "../../common/StatBlock";
import { env } from "../Environment";
import { CurrentSettings } from "../Settings/Settings";
import { Combatant } from "./Combatant";

export function ToPlayerViewCombatantState(
  combatant: Combatant
): PlayerViewCombatantState {
  const sendImage = env.HasEpicInitiative;
  return {
    Name: combatant.DisplayName(),
    IndexLabel: GetIndexLabel(combatant),
    Id: combatant.Id,
    HPDisplay: GetHPDisplay(combatant),
    HPColor: GetHPColor(combatant),
    ManaDisplay: GetManaDisplay(combatant),
    ManaColor: GetManaColor(combatant),
    ResourcesDisplay: GetResourcesDisplay(combatant),
    ResourcesColor: GetResourcesColor(combatant),
    HitDiceDisplay: GetHitDiceDisplay(combatant),
    HitDiceColor: GetHitDiceColor(combatant),
    WoundsDisplay: GetWoundsDisplay(combatant),
    WoundsColor: GetWoundsColor(combatant),
    GoldDisplay: GetGoldDisplay(combatant),
    GoldColor: GetGoldColor(combatant),
    InventoryDisplay: GetInventoryDisplay(combatant),
    InventoryColor: GetInventoryColor(combatant),
    Initiative: combatant.Initiative(),
    IsPlayerCharacter: combatant.IsPlayerCharacter(),
    Tags: combatant
      .Tags()
      .filter(t => t.NotExpired() && !t.HiddenFromPlayerView)
      .map(t => {
        return {
          Text: t.Text,
          DurationRemaining: t.DurationRemaining(),
          DurationTiming: t.DurationTiming,
          DurationCombatantId: t.DurationCombatantId
        };
      }),
    ImageURL: sendImage ? combatant.StatBlock().ImageURL : "",
    AC:
      combatant.RevealedAC() && combatant.ActsInPlayerPhase()
        ? combatant.StatBlock().AC.Value
        : undefined,
    Color: combatant.Color(),
    ReactionsSpent: combatant.ReactionsSpent(),
    HasTakenTurn: combatant.HasTakenTurn()
  };
}

function GetIndexLabel(combatant: Combatant): number | undefined {
  if (combatant.Alias()) {
    return undefined;
  }
  if (
    CurrentSettings().Rules.AlwaysNumberMonsters &&
    !combatant.ActsInPlayerPhase() &&
    !StatBlock.IsLegendary(combatant.StatBlock())
  ) {
    return combatant.IndexLabel();
  }
  const name = combatant.StatBlock().Name;
  const combatantCount = combatant.Encounter.CombatantCountsByName()[name];
  if (combatantCount > 1) {
    return combatant.IndexLabel();
  }
  return undefined;
}

function GetHPDisplay(combatant: Combatant): string {
  const hpVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  const maxHP = combatant.MaxHP(),
    currentHP = combatant.CurrentHP(),
    temporaryHP = combatant.TemporaryHP();
  if (hpVerbosity == "Actual HP") {
    if (temporaryHP) {
      return `${currentHP}+${temporaryHP}/${maxHP}`;
    } else {
      return `${currentHP}/${maxHP}`;
    }
  }
  if (hpVerbosity == "Hide All") {
    return "";
  }
  if (hpVerbosity == "Damage Taken") {
    return (currentHP - maxHP).toString();
  }
  if (currentHP <= 0) {
    return "<span class='defeatedHP'>Defeated</span>";
  } else if (currentHP < maxHP / 2) {
    return "<span class='bloodiedHP'>Bloodied</span>";
  } else if (currentHP < maxHP) {
    return "<span class='hurtHP'>Hurt</span>";
  }
  return "<span class='healthyHP'>Healthy</span>";
}

function GetManaDisplay(combatant: Combatant): string | undefined {
  const maxMana = combatant.MaxMana();
  if (
    maxMana === undefined ||
    !CurrentSettings().Rules.EnableMana ||
    CurrentSettings().PlayerView.HideManaNumbers
  ) {
    return undefined;
  }

  const manaVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  const currentMana = combatant.CurrentMana();
  const temporaryMana = combatant.TemporaryMana();
  if (manaVerbosity == "Actual HP") {
    // Show current only - the max is DM-only information.
    if (temporaryMana) {
      return `${currentMana}+${temporaryMana}`;
    }
    return `${currentMana}`;
  }
  if (manaVerbosity == "Hide All") {
    return "";
  }
  if (manaVerbosity == "Damage Taken") {
    return (currentMana - maxMana).toString();
  }
  if (currentMana <= 0) {
    return "<span class='defeatedHP'>Empty</span>";
  } else if (currentMana < maxMana / 2) {
    return "<span class='bloodiedHP'>Low</span>";
  } else if (currentMana < maxMana) {
    return "<span class='hurtHP'>Reduced</span>";
  }
  return "<span class='healthyHP'>Full</span>";
}

function GetManaColor(combatant: Combatant): string | undefined {
  const maxMana = combatant.MaxMana();
  if (
    maxMana === undefined ||
    !CurrentSettings().Rules.EnableMana ||
    CurrentSettings().PlayerView.HideManaNumbers
  ) {
    return undefined;
  }

  const manaVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  if (
    manaVerbosity == "Monochrome Label" ||
    manaVerbosity == "Hide All" ||
    manaVerbosity == "Damage Taken"
  ) {
    return "auto";
  }
  return "var(--blue)";
}

function GetResourcesDisplay(combatant: Combatant): string | undefined {
  const maxResources = combatant.MaxResources();
  if (
    maxResources === undefined ||
    !CurrentSettings().Rules.EnableResources ||
    CurrentSettings().PlayerView.HideResourcesNumbers
  ) {
    return undefined;
  }

  const resourcesVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  const currentResources = combatant.CurrentResources();
  const temporaryResources = combatant.TemporaryResources();
  if (resourcesVerbosity == "Actual HP") {
    // Show current only - the max is DM-only information.
    if (temporaryResources) {
      return `${currentResources}+${temporaryResources}`;
    }
    return `${currentResources}`;
  }
  if (resourcesVerbosity == "Hide All") {
    return "";
  }
  if (resourcesVerbosity == "Damage Taken") {
    return (currentResources - maxResources).toString();
  }
  if (currentResources <= 0) {
    return "<span class='defeatedHP'>Empty</span>";
  } else if (currentResources < maxResources / 2) {
    return "<span class='bloodiedHP'>Low</span>";
  } else if (currentResources < maxResources) {
    return "<span class='hurtHP'>Reduced</span>";
  }
  return "<span class='healthyHP'>Full</span>";
}

function GetResourcesColor(combatant: Combatant): string | undefined {
  const maxResources = combatant.MaxResources();
  if (
    maxResources === undefined ||
    !CurrentSettings().Rules.EnableResources ||
    CurrentSettings().PlayerView.HideResourcesNumbers
  ) {
    return undefined;
  }

  const resourcesVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  if (
    resourcesVerbosity == "Monochrome Label" ||
    resourcesVerbosity == "Hide All" ||
    resourcesVerbosity == "Damage Taken"
  ) {
    return "auto";
  }
  return "var(--magenta)";
}

function GetHitDiceDisplay(combatant: Combatant): string | undefined {
  const maxHitDice = combatant.MaxHitDice();
  const currentHitDice = combatant.CurrentHitDice();
  if (
    maxHitDice === undefined ||
    !combatant.RevealedHitDice() ||
    currentHitDice >= maxHitDice ||
    !CurrentSettings().Rules.EnableHitDice ||
    CurrentSettings().PlayerView.HideHitDiceNumbers
  ) {
    // Don't reveal the Hit Dice track in Player View while it's still full -
    // only show it once at least one has been spent.
    return undefined;
  }

  const hitDiceVerbosity = CurrentSettings().PlayerView.PlayerHPVerbosity;
  const temporaryHitDice = combatant.TemporaryHitDice();
  if (hitDiceVerbosity == "Actual HP") {
    // Show the remaining count, not the max (the max itself is DM-only
    // information) and not a delta from max - players want to know how
    // many Hit Dice they have left to spend, not how many they've used.
    if (temporaryHitDice) {
      return `${currentHitDice}+${temporaryHitDice}`;
    }
    return currentHitDice.toString();
  }
  if (hitDiceVerbosity == "Hide All") {
    return "";
  }
  if (hitDiceVerbosity == "Damage Taken") {
    return (currentHitDice - maxHitDice).toString();
  }
  if (currentHitDice <= 0) {
    return "<span class='defeatedHP'>Empty</span>";
  } else if (currentHitDice < maxHitDice / 2) {
    return "<span class='bloodiedHP'>Low</span>";
  } else if (currentHitDice < maxHitDice) {
    return "<span class='hurtHP'>Reduced</span>";
  }
  return "<span class='healthyHP'>Full</span>";
}

function GetHitDiceColor(combatant: Combatant): string | undefined {
  const maxHitDice = combatant.MaxHitDice();
  const currentHitDice = combatant.CurrentHitDice();
  if (
    maxHitDice === undefined ||
    !combatant.RevealedHitDice() ||
    currentHitDice >= maxHitDice ||
    !CurrentSettings().Rules.EnableHitDice ||
    CurrentSettings().PlayerView.HideHitDiceNumbers
  ) {
    return undefined;
  }

  const hitDiceVerbosity = CurrentSettings().PlayerView.PlayerHPVerbosity;
  if (
    hitDiceVerbosity == "Monochrome Label" ||
    hitDiceVerbosity == "Hide All" ||
    hitDiceVerbosity == "Damage Taken"
  ) {
    return "auto";
  }
  return "var(--orange)";
}

function GetWoundsDisplay(combatant: Combatant): string | undefined {
  const maxWounds = combatant.MaxWounds();
  const currentWounds = combatant.CurrentWounds();
  if (
    maxWounds === undefined ||
    currentWounds <= 0 ||
    !CurrentSettings().Rules.EnableWounds ||
    CurrentSettings().PlayerView.HideWoundsNumbers
  ) {
    // Don't reveal the Wounds track in Player View until a wound has
    // actually been taken.
    return undefined;
  }

  const woundsVerbosity = CurrentSettings().PlayerView.PlayerHPVerbosity;
  const temporaryWounds = combatant.TemporaryWounds();
  if (woundsVerbosity == "Actual HP") {
    // Show current only - the max is DM-only information.
    if (temporaryWounds) {
      return `${currentWounds}+${temporaryWounds}`;
    }
    return `${currentWounds}`;
  }
  if (woundsVerbosity == "Hide All") {
    return "";
  }
  if (woundsVerbosity == "Damage Taken") {
    return currentWounds.toString();
  }
  if (currentWounds >= maxWounds) {
    return "<span class='defeatedHP'>Defeated</span>";
  } else if (currentWounds > maxWounds / 2) {
    return "<span class='bloodiedHP'>Wounded</span>";
  }
  return "<span class='hurtHP'>Hurt</span>";
}

function GetWoundsColor(combatant: Combatant): string | undefined {
  const maxWounds = combatant.MaxWounds();
  const currentWounds = combatant.CurrentWounds();
  if (
    maxWounds === undefined ||
    currentWounds <= 0 ||
    !CurrentSettings().Rules.EnableWounds ||
    CurrentSettings().PlayerView.HideWoundsNumbers
  ) {
    return undefined;
  }

  const woundsVerbosity = CurrentSettings().PlayerView.PlayerHPVerbosity;
  if (
    woundsVerbosity == "Monochrome Label" ||
    woundsVerbosity == "Hide All" ||
    woundsVerbosity == "Damage Taken"
  ) {
    return "auto";
  }
  return "var(--wound-red)";
}

function GetGoldDisplay(combatant: Combatant): string | undefined {
  if (
    !CurrentSettings().Rules.EnableGold ||
    !combatant.IsPlayerCharacter() ||
    CurrentSettings().PlayerView.HideGoldNumbers
  ) {
    return undefined;
  }

  return `${combatant.CurrentGold()}`;
}

function GetGoldColor(combatant: Combatant): string | undefined {
  if (
    !CurrentSettings().Rules.EnableGold ||
    !combatant.IsPlayerCharacter() ||
    CurrentSettings().PlayerView.HideGoldNumbers
  ) {
    return undefined;
  }

  return "var(--gold)";
}

function GetInventoryDisplay(combatant: Combatant): string | undefined {
  if (
    !CurrentSettings().Rules.EnableInventory ||
    !combatant.IsPlayerCharacter() ||
    CurrentSettings().PlayerView.HideInventoryNumbers
  ) {
    return undefined;
  }

  return `${combatant.InventorySlotsUsed()}/${combatant.MaxInventorySlots()}`;
}

function GetInventoryColor(combatant: Combatant): string | undefined {
  if (
    !CurrentSettings().Rules.EnableInventory ||
    !combatant.IsPlayerCharacter() ||
    CurrentSettings().PlayerView.HideInventoryNumbers
  ) {
    return undefined;
  }

  if (combatant.InventorySlotsUsed() > combatant.MaxInventorySlots()) {
    return "rgb(200,30,30)";
  }

  return "var(--parchment)";
}

function GetHPColor(combatant: Combatant) {
  const maxHP = combatant.MaxHP(),
    currentHP = combatant.CurrentHP();
  const hpVerbosity = combatant.IsPlayerCharacter()
    ? CurrentSettings().PlayerView.PlayerHPVerbosity
    : CurrentSettings().PlayerView.MonsterHPVerbosity;
  if (
    hpVerbosity == "Monochrome Label" ||
    hpVerbosity == "Hide All" ||
    hpVerbosity == "Damage Taken"
  ) {
    return "auto";
  }
  const green = Math.floor((currentHP / maxHP) * 170);
  const red = Math.floor(((maxHP - currentHP) / maxHP) * 170);
  return "rgb(" + red + "," + green + ",0)";
}
