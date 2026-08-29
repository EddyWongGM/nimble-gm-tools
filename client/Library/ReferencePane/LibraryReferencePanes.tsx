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
      selectedLibrary: "PersistentCharacters"
    };
  }

  private hideLibraries = () => this.props.librariesCommander.HideLibraries();
  private selectLibrary = (library: SelectableTab) => {
    if (library == "StatBlocks") {
      NotifyTutorialOfAction("SelectMonstersTab");
    }
    this.setState({ selectedLibrary: library });
  };

  public render() {
    const hasMythic = env.HasMythic;

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
      ...(hasMythic && {
        Scenes: (
          <SceneLibraryReferencePane
            applyScene={this.props.applyScene}
            showScene={this.props.showScene}
            dismissScene={this.props.dismissScene}
            activeSceneId={this.props.activeSceneId}
            addScene={this.props.librariesCommander.AddScene}
            editScene={this.props.librariesCommander.EditScene}
            deleteScene={this.props.librariesCommander.DeleteScene}
            exportScenes={this.props.librariesCommander.ExportScenes}
            importScenes={this.props.librariesCommander.ImportScenes}
            combatantsHidden={this.props.combatantsHidden}
            onToggleCombatantsHidden={this.props.onToggleCombatantsHidden}
          />
        )
      })
    };

    const effectiveSelectedLibrary: SelectableTab =
      this.state.selectedLibrary === "Scenes" && !hasMythic
        ? "StatBlocks"
        : this.state.selectedLibrary;
    const selectedLibrary = libraries[effectiveSelectedLibrary];
    const isScenesTab = effectiveSelectedLibrary === "Scenes";

    const tabNamesById: Record<string, string> = hasMythic
      ? { ...LibraryFriendlyNames, Scenes: "Scenes" }
      : { ...LibraryFriendlyNames };

    return (
      <div className="libraries">
        <div className="libraries__header">
          <LibraryHeader selectedLibrary={effectiveSelectedLibrary} />
          {!isScenesTab && (
            <Button
              additionalClassNames="button--library-manager"
              fontAwesomeIcon="book-open"
              onClick={() =>
                this.props.librariesCommander.OpenLibraryManagerPane(
                  effectiveSelectedLibrary as LibraryType
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
          optionIconsById={hasMythic ? tabIconsById : undefined}
          onChoose={this.selectLibrary}
          selected={effectiveSelectedLibrary}
        />
        {selectedLibrary}
      </div>
    );
  }
}

const tabIconsById: Record<SelectableTab, string> = {
  StatBlocks: "dragon",
  PersistentCharacters: "user",
  Encounters: "skull-crossbones",
  Spells: "book",
  Scenes: "image"
};

function LibraryHeader(props: { selectedLibrary: SelectableTab }) {
  const headerTexts: Record<SelectableTab, string> = {
    StatBlocks: "Add Names",
    PersistentCharacters: "Add Names",
    Encounters: "Load Encounters",
    Spells: "Browse Compendium",
    Scenes: "Manage Scenes"
  };

  const libraryInfos: Record<SelectableTab, string | null> = {
    StatBlocks:
      "When you add a Monster, a copy of its Stat Block joins the Encounter as a Name.",
    PersistentCharacters:
      "Each Hero can each only be added to the View once, and they will be persistent across different Encounters.",
    Encounters:
      "Loading an Encounter adds all of the Names saved in it. Heroes who are already present are not duplicated.",
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
