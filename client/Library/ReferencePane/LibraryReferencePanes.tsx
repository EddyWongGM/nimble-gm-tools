import * as React from "react";
import { LibrariesCommander } from "../../Commands/LibrariesCommander";
import { Button } from "../../Components/Button";
import { Info } from "../../Components/Info";
import { Tabs } from "../../Components/Tabs";
import { env } from "../../Environment";
import { NotifyTutorialOfAction } from "../../Tutorial/NotifyTutorialOfAction";
import { SavedScene } from "../../../common/PlayerViewSettings";
import { LibraryFriendlyNames, LibraryType, Libraries } from "../Libraries";
import { EncounterLibraryReferencePane } from "./EncounterLibraryReferencePane";
import { PersistentCharacterLibraryReferencePane } from "./PersistentCharacterLibraryReferencePane";
import { SceneLibraryReferencePane } from "./SceneLibraryReferencePane";
import { SpellLibraryReferencePane } from "./SpellLibraryReferencePane";
import { StatBlockLibraryReferencePane } from "./StatBlockLibraryReferencePane";

// "Scenes" is deliberately not part of LibraryType: unlike its sibling
// tabs, it isn't backed by the Listing<T>/IndexedDB library machinery — it
// reads/writes Settings.PlayerView.SceneLibrary instead. Only this
// component's local selection state and tab map need to know about it.
type SelectableTab = LibraryType | "Scenes";

export interface LibraryReferencePanesProps {
  librariesCommander: LibrariesCommander;
  libraries: Libraries;
  applyScene: (imageUrl: string) => void;
  showScene: (scene: SavedScene) => void;
  dismissScene: () => void;
  activeSceneId: string | null;
  combatantsHidden: boolean;
  onToggleCombatantsHidden: () => void;
}

interface State {
  selectedLibrary: SelectableTab;
}

export class LibraryReferencePanes extends React.Component<
  LibraryReferencePanesProps,
  State
> {
  constructor(props) {
    super(props);
    this.state = {
      selectedLibrary: "StatBlocks"
    };
  }

  private hideLibraries = () => this.props.librariesCommander.HideLibraries();
  private selectLibrary = (library: SelectableTab) => {
    if (library == "PersistentCharacters") {
      NotifyTutorialOfAction("SelectCharactersTab");
    }
    this.setState({ selectedLibrary: library });
  };

  public render() {
    const libraries: Record<SelectableTab, JSX.Element> = {
      StatBlocks: (
        <StatBlockLibraryReferencePane
          librariesCommander={this.props.librariesCommander}
          library={this.props.libraries.StatBlocks}
        />
      ),
      PersistentCharacters: (
        <PersistentCharacterLibraryReferencePane
          librariesCommander={this.props.librariesCommander}
          library={this.props.libraries.PersistentCharacters}
        />
      ),
      Encounters: (
        <EncounterLibraryReferencePane
          librariesCommander={this.props.librariesCommander}
          library={this.props.libraries.Encounters}
        />
      ),
      Spells: (
        <SpellLibraryReferencePane
          librariesCommander={this.props.librariesCommander}
          library={this.props.libraries.Spells}
        />
      ),
      Scenes: (
        <SceneLibraryReferencePane
          applyScene={this.props.applyScene}
          showScene={this.props.showScene}
          dismissScene={this.props.dismissScene}
          activeSceneId={this.props.activeSceneId}
          addScene={this.props.librariesCommander.AddScene}
          editScene={this.props.librariesCommander.EditScene}
          deleteScene={this.props.librariesCommander.DeleteScene}
          combatantsHidden={this.props.combatantsHidden}
          onToggleCombatantsHidden={this.props.onToggleCombatantsHidden}
        />
      )
    };

    const selectedLibrary = libraries[this.state.selectedLibrary];
    const isScenesTab = this.state.selectedLibrary === "Scenes";

    return (
      <div className="libraries">
        <div className="libraries__header">
          <LibraryHeader selectedLibrary={this.state.selectedLibrary} />
          {!isScenesTab && (
            <Button
              additionalClassNames="button--library-manager"
              fontAwesomeIcon="book-open"
              onClick={() =>
                this.props.librariesCommander.OpenLibraryManagerPane(
                  this.state.selectedLibrary as LibraryType
                )
              }
              tooltip="Open Library Manager"
            />
          )}
          <Button
            additionalClassNames="button--close"
            fontAwesomeIcon="times"
            onClick={this.hideLibraries}
            tooltip="Close Library Reference Pane"
          />
        </div>
        <Tabs
          optionNamesById={tabNamesById}
          onChoose={this.selectLibrary}
          selected={this.state.selectedLibrary}
        />
        {selectedLibrary}
      </div>
    );
  }
}

const tabNamesById: Record<SelectableTab, string> = {
  ...LibraryFriendlyNames,
  Scenes: "Scenes"
};

function LibraryHeader(props: { selectedLibrary: SelectableTab }) {
  const headerTexts: Record<SelectableTab, string> = {
    StatBlocks: "Add Names",
    PersistentCharacters: "Add Names",
    Encounters: "Load Encounters",
    Spells: "Reference Spells",
    Scenes: "Manage Scenes"
  };

  const libraryInfos: Record<SelectableTab, string | null> = {
    StatBlocks:
      "When you add a Creature, a copy of its Stat Block joins the Encounter as a Name.",
    PersistentCharacters:
      "Each Character can each only be added to an Encounter once, and they will be persistent across different Encounters.",
    Encounters:
      "Loading an Encounter adds all of the Names saved in it. Characters who are already present are not duplicated.",
    Spells: null,
    Scenes:
      "Click a saved scene to set it as the Player View background image."
  };

  const hasAccountSync = env.HasStorage;
  return (
    <h2 style={{ flexGrow: 1, flexShrink: 1 }}>
      {hasAccountSync && (
        <span className="fas fa-cloud" title="Account Sync is enabled" />
      )}
      {" " + headerTexts[props.selectedLibrary]}
      {libraryInfos[props.selectedLibrary] !== null && (
        <Info
          children={libraryInfos[props.selectedLibrary]}
          tippyProps={{ placement: "right" }}
        />
      )}
    </h2>
  );
}
