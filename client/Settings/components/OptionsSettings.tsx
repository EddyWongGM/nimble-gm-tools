import * as React from "react";

import { HpVerbosityOption } from "../../../common/PlayerViewSettings";
import { Info } from "../../Components/Info";
import { Dropdown } from "./Dropdown";
import { Toggle } from "./Toggle";
import { DisplaysToggle } from "./DisplaysToggle";
import { DisplaysToggleHeader } from "./DisplaysToggle";

export function OptionsSettings(props: {
  goToEpicInitiativeSettings: () => void;
}) {
  return (
    <div className="tab-content options">
      <h3>Rules</h3>
      {/* <Toggle fieldName="Rules.EnableBossAndMinionHP">
        Show Boss and Minion buttons
        <Info>
          Hover or preview a Creature in the Library Pane to reveal these
          buttons. The pawn icon will add a creature as a 1HP "minion" and the
          king icon will add it with the maximum possible HP roll.
        </Info>
      </Toggle> */}
      {/* <Toggle fieldName="Rules.AllowNegativeHP">
        Allow negative hit points
      </Toggle> */}
      <Toggle fieldName="Rules.AlwaysNumberMonsters">
        Always number Creatures and NPCs
        <Info>
          By default, a number only appears after a Name when there's more
          than one Creature or NPC sharing it (e.g. "Goblin 2"). Enable this
          to always number every Creature and NPC, based on the order they
          were added to the encounter, even when its Name is unique.
        </Info>
      </Toggle>
      <Toggle fieldName="Rules.AutoCheckConcentration">
        Prompt for concentration checks
        <Info>
          When a combatant has a tag with the text "Concentrating", a prompt
          with a suggested concentration check will appear if they receive
          damage. You can ignore the prompt or automatically clear the tag.
        </Info>
      </Toggle>

      <DisplaysToggleHeader />
      <DisplaysToggle fieldName="DarkMode">Dark Mode</DisplaysToggle>
      {/* <DisplaysToggle fieldName="DisplayRoundCounter">
        Round Counter
      </DisplaysToggle> */}
      <DisplaysToggle fieldName="DisplayCombatantColor">
        Name Colors
        <Info>Enables a widget to assign a color to each name.</Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableMana"
        playerViewFieldName="PlayerView.HideManaNumbers"
        invertPlayerView
      >
        Mana
        <Info>
          Encounter View toggle controls the Mana feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableResources"
        playerViewFieldName="PlayerView.HideResourcesNumbers"
        invertPlayerView
      >
        Resources
        <Info>
          Encounter View toggle controls the Resources feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableHitDice"
        playerViewFieldName="PlayerView.HideHitDiceNumbers"
        invertPlayerView
      >
        Hit Dice
        <Info>
          Encounter View toggle controls the Hit Dice feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableWounds"
        playerViewFieldName="PlayerView.HideWoundsNumbers"
        invertPlayerView
      >
        Wounds
        <Info>
          Encounter View toggle controls the Wounds feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableInventory"
        playerViewFieldName="PlayerView.HideInventoryNumbers"
        invertPlayerView
      >
        Inventory
        <Info>
          Encounter View toggle controls the Inventory feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle
        encounterViewFieldName="Rules.EnableGold"
        playerViewFieldName="PlayerView.HideGoldNumbers"
        invertPlayerView
      >
        Gold
        <Info>
          Encounter View toggle controls the Gold feature entirely.
        </Info>
      </DisplaysToggle>
      <DisplaysToggle fieldName="DisplayReactionTracker">
        Reaction Tracker
      </DisplaysToggle>      
      <DisplaysToggle
        fieldName="DisplayPortraits"
        requireEpicTierForPlayerViewToggle
      >
        Portraits
      </DisplaysToggle>      

      <h3>Encounter View</h3>
      {/* <Toggle fieldName="TrackerView.DisplayDifficulty">
        Display Encounter Difficulty
        <Info>
          Encounter Difficulty is calculated based on the guidelines in the
          Dungeon Master's Guide. It accounts for how many Player Characters are
          in the combat, or assumes 4 characters if none are present. All
          Creatures and Non Player Characters are counted as enemies.
        </Info>
      </Toggle> */}
      {/* <Toggle fieldName="TrackerView.DisplayHPBar">
        Display Indicators of Active or Selected Character
        <Info>
          Show a small HP, Mana, Resources, Hit Dice, and Wounds bar
          indicator for any selected combatant(s), as well as for the
          currently-active combatant.
        </Info>
      </Toggle> */}
      <Toggle fieldName="TrackerView.DisplayRestoreCombatants">
        Display Restore Names prompt
        <Info>
          This prompt appears when combatants are removed from the encounter,
          allowing you to restore them easily.
        </Info>
      </Toggle>
      <Toggle fieldName="TrackerView.HideRollableUnderline">
        Disable underline on rollable stats
        <Info>
          Removes the dashed underline from stats and damage values that roll
          dice when clicked. Spell and condition reference links keep their
          underline either way.
        </Info>
      </Toggle>
      <h3>Player View</h3>
      <Dropdown
        fieldName="PlayerView.PlayerHPVerbosity"
        options={HpVerbosityOption}
      >
        Heroes Verbosity
      </Dropdown>
      <Dropdown
        fieldName="PlayerView.MonsterHPVerbosity"
        options={HpVerbosityOption}
      >
        Monster Verbosity
        <Info>
          Control how Health is revealed in the Player View window. Colored Label will
          change from green to red, so keen-eyed players might deduce exact
          percentages.
        </Info>
      </Dropdown>
      <Toggle fieldName="PlayerView.AllowPlayerSuggestions">
        Allow players to suggest damage/healing
        <Info>
          Players can suggest damage (or healing, with a negative number) by
          clicking or tapping the current HP of any combatant in the Player
          View. You can accept the full or half amount of damage.
        </Info>
      </Toggle>
      {/* <p>
        {"Additional Player View customization options available with "}
        <a href="#" onClick={props.goToEpicInitiativeSettings}>
          Epic Tier
        </a>
      </p> */}
    </div>
  );
}
