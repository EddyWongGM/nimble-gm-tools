import * as _ from "lodash";
import * as React from "react";
import { Listable } from "../../../common/Listable";
import {
  MONSTER_BUILDER_FOLDER_NAME,
  SAMPLE_HEROES_FOLDER_NAME
} from "../Libraries";
import { Listing } from "../Listing";
import { RenameResult } from "../RenameResult";
import { Folder } from "./Folder";

export type ListingGroup = {
  label?: string;
  // When set, listings with no value for this grouping's key (e.g. spells
  // with no School) are omitted entirely instead of falling back to the
  // ungrouped root list.
  hideUngrouped?: boolean;
  // When set, only listings matching this predicate are shown under this
  // grouping (e.g. Tier only makes sense for spells, not rules).
  filterFn?: (l: Listing<any>) => boolean;
  groupFn: (l: Listing<any>) => {
    label?: string;
    key: string;
    ignoreSlashes?: boolean;
  };
};

type FolderModel = {
  label: string;
  listings: Listing<any>[];
  subFoldersByKey: Record<string, FolderModel>;
};

/** Renames the folder identified by its complete slash-delimited path. */
export type RenameFolder = (
  path: string,
  newName: string
) => Promise<RenameResult>;

export function BuildListingTree<T extends Listable>(
  buildListingComponent: (
    listing: Listing<T>,
    index: number,
    array: Listing<T>[]
  ) => JSX.Element,
  listingGroup: ListingGroup,
  listings: Listing<T>[],
  onRenameFolder?: RenameFolder
): JSX.Element[] {
  const rootListingComponents: JSX.Element[] = [];

  const foldersByKey: Record<string, FolderModel> = {};

  const filteredListings = listingGroup.filterFn
    ? listings.filter(listingGroup.filterFn)
    : listings;

  filteredListings.forEach((listing, index, array) => {
    const group = listingGroup.groupFn(listing);
    if (group.key == "" || group.key === undefined) {
      if (listingGroup.hideUngrouped) {
        return;
      }

      const component = buildListingComponent(listing, index, array);

      rootListingComponents.push(component);
    } else {
      const innerFolder = ensureFolder(
        foldersByKey,
        group.key,
        group.label || group.key,
        group.ignoreSlashes || false
      );
      innerFolder.listings.push(listing);
    }
  });

  const folderComponents = buildFolderComponents<T>(
    foldersByKey,
    buildListingComponent,
    onRenameFolder,
    ""
  );

  return folderComponents.concat(rootListingComponents);
}

function buildFolderComponents<T extends Listable>(
  foldersByKey: Record<string, FolderModel>,
  buildListingComponent: (
    listing: Listing<T>,
    index: number,
    array: Listing<T>[]
  ) => JSX.Element,
  onRenameFolder: RenameFolder | undefined,
  parentPath: string
) {
  return Object.keys(foldersByKey)
    .sort((a, b) => {
      // Keep the preloaded sample folder below any folders the GM creates,
      // regardless of what they name them.
      if (a === SAMPLE_HEROES_FOLDER_NAME) return 1;
      if (b === SAMPLE_HEROES_FOLDER_NAME) return -1;
      // Keep the preloaded Monster Builder templates above any folders the
      // GM creates, regardless of what they name them.
      if (a === MONSTER_BUILDER_FOLDER_NAME) return -1;
      if (b === MONSTER_BUILDER_FOLDER_NAME) return 1;
      return a < b ? -1 : a > b ? 1 : 0;
    })
    .map(key => {
      const folder = foldersByKey[key];
      // Folder labels contain only one segment, while rename commands need the
      // complete path so the correct nested subtree can be updated.
      const path = parentPath ? `${parentPath}/${key}` : key;
      const listingComponents = folder.listings.map(buildListingComponent);
      return (
        <Folder
          key={key}
          name={folder.label}
          path={path}
          onRename={onRenameFolder}
        >
          {buildFolderComponents(
            folder.subFoldersByKey,
            buildListingComponent,
            onRenameFolder,
            path
          )}
          {listingComponents}
        </Folder>
      );
    });
}

function ensureFolder(
  outerFolder: Record<string, FolderModel>,
  keyString: string,
  labelString: string,
  ignoreSlashes: boolean
) {
  const pathDelimiter = ignoreSlashes ? undefined : "/";
  const path = keyString.split(pathDelimiter);
  let folderCursor = outerFolder;
  for (let i = 0; i < path.length; i++) {
    const folderName = path[i];
    if (folderCursor[folderName] === undefined) {
      folderCursor[folderName] = {
        label: labelString.split(pathDelimiter)[i],
        listings: [],
        subFoldersByKey: {}
      };
    }

    if (i === path.length - 1) {
      return folderCursor[folderName];
    }

    folderCursor = folderCursor[folderName].subFoldersByKey;
  }
}
