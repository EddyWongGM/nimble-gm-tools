import * as React from "react";

import axios from "axios";
import * as _ from "lodash";

import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { Account } from "../Account/Account";
import { AccountClient } from "../Account/AccountClient";
import { Store } from "../Utility/Store";
import { SavedEncounter } from "../../common/SavedEncounter";
import { UpdateLegacySavedEncounter } from "../Encounter/UpdateLegacySavedEncounter";
import { PersistentCharacter } from "../../common/PersistentCharacter";
import { Library, useLibrary } from "./useLibrary";
import { Listable, ListingMeta } from "../../common/Listable";
import {
  ImportOpen5eSpell,
  ImportOpen5eV2StatBlock
} from "../Importers/Open5eImporter";
import { Settings } from "../../common/Settings";

export type UpdatePersistentCharacter = (
  persistentCharacterId: string,
  updates: Partial<PersistentCharacter>
) => void;

export const LibraryFriendlyNames = {
  PersistentCharacters: "Heroes",
  StatBlocks: "Monsters",
  Encounters: "Encounters",
  Spells: "Compendium"
};

export const LibraryStoreNames: Record<LibraryType, string> = {
  StatBlocks: Store.StatBlocks,
  PersistentCharacters: Store.PersistentCharacters,
  Encounters: Store.SavedEncounters,
  Spells: Store.Spells
};

export type LibraryType = keyof typeof LibraryFriendlyNames;

export function GetDefaultForLibrary(libraryType: LibraryType): Listable {
  if (libraryType === "StatBlocks") {
    return StatBlock.Default();
  }
  if (libraryType === "PersistentCharacters") {
    return PersistentCharacter.Default();
  }
  if (libraryType === "Encounters") {
    return SavedEncounter.Default();
  }
  if (libraryType === "Spells") {
    return Spell.Default();
  }

  return null;
}

export interface Libraries {
  PersistentCharacters: Library<PersistentCharacter>;
  StatBlocks: Library<StatBlock>;
  Encounters: Library<SavedEncounter>;
  Spells: Library<Spell>;
}

function dummyLibrary<T extends Listable>(): Library<T> {
  return {
    AddListings: () => {},
    DeleteListing: () => Promise.resolve(),
    GetAllListings: () => [],
    GetOrCreateListingById: () => Promise.resolve(null),
    SaveEditedListing: () => Promise.resolve(null),
    SaveNewListing: () => Promise.resolve(null),
    UpdateListings: () => Promise.resolve()
  };
}

export const LibrariesContext = React.createContext<Libraries>({
  StatBlocks: dummyLibrary(),
  Encounters: dummyLibrary(),
  PersistentCharacters: dummyLibrary(),
  Spells: dummyLibrary()
});

export function useLibraries(
  settings: Settings,
  accountClient: AccountClient,
  allPersistentCharactersLoaded: () => void
): Libraries {
  const isLoadingComplete = React.useRef({
    localAsync: false,
    account: false
  });

  const signalLoadComplete = (loadSource: "localAsync" | "account") => {
    isLoadingComplete.current[loadSource] = true;
    if (
      isLoadingComplete.current.localAsync &&
      isLoadingComplete.current.account
    ) {
      allPersistentCharactersLoaded();
    }
  };

  const PersistentCharacters = useLibrary(
    Store.PersistentCharacters,
    "persistentcharacters",
    {
      createEmptyListing: PersistentCharacter.Default,
      accountSave: accountClient.SavePersistentCharacter,
      accountDelete: accountClient.DeletePersistentCharacter,
      getFilterDimensions: PersistentCharacter.GetFilterDimensions,
      getSearchHint: PersistentCharacter.GetSearchHint,
      signalLoadComplete,
      migrate: PersistentCharacter.Update
    }
  );
  const StatBlocks = useLibrary(Store.StatBlocks, "statblocks", {
    createEmptyListing: StatBlock.Default,
    accountSave: accountClient.SaveStatBlock,
    accountDelete: accountClient.DeleteStatBlock,
    getFilterDimensions: StatBlock.FilterDimensions,
    getSearchHint: StatBlock.GetSearchHint,
    migrate: StatBlock.Update
  });
  const Encounters = useLibrary(Store.SavedEncounters, "encounters", {
    createEmptyListing: SavedEncounter.Default,
    accountSave: accountClient.SaveEncounter,
    accountDelete: accountClient.DeleteEncounter,
    getFilterDimensions: () => ({}),
    getSearchHint: SavedEncounter.GetSearchHint
  });

  const Spells = useLibrary(Store.Spells, "spells", {
    createEmptyListing: Spell.Default,
    accountSave: accountClient.SaveSpell,
    accountDelete: accountClient.DeleteSpell,
    getFilterDimensions: Spell.GetFilterDimensions,
    getSearchHint: Spell.GetSearchHint,
    migrate: Spell.Update
  });

  const libraries: Libraries = {
    StatBlocks,
    PersistentCharacters,
    Encounters,
    Spells
  };

  React.useEffect(() => {
    preloadSpells(Spells, settings);
    preloadStatBlocks(StatBlocks, settings);
    preloadHeroes(PersistentCharacters, settings);
    preloadEncounters(Encounters, settings);

    syncAccountCharacters(accountClient, libraries, signalLoadComplete);
  }, []);

  return libraries;
}

async function preloadStatBlocks(
  StatBlocks: Library<StatBlock>,
  settings: Settings
) {
  const enabledSources = _.pickBy(
    settings.PreloadedStatBlockSources,
    isEnabled => isEnabled
  );
  for (const sourceSlug in enabledSources) {
    if (sourceSlug === "local-basic-rules") {
      try {
        const response = await axios.get("/statblocks/");
        const localListings: ListingMeta[] = response.data;
        StatBlocks.AddListings(localListings, "server");
      } catch (error) {
        console.warn(`Problem loading local Basic Rules StatBlocks: ${error}`);
      }
      continue;
    }

    if (sourceSlug === "monster-builder-set") {
      try {
        const response = await axios.get("/monster-builder-set/");
        const localListings: ListingMeta[] = response.data;
        StatBlocks.AddListings(localListings, "server");
      } catch (error) {
        console.warn(`Problem loading Monster Builder Set: ${error}`);
      }
      continue;
    }

    try {
      const response = await axios.get(`/open5e/${sourceSlug}/`);
      const open5eListings: ListingMeta[] = response.data;
      StatBlocks.AddListings(
        open5eListings,
        ["srd-2014", "srd-2024"].includes(sourceSlug)
          ? "open5e"
          : "open5e-additional",
        ImportOpen5eV2StatBlock
      );
    } catch (error) {
      console.warn(`Problem loading StatBlocks from ${sourceSlug}: ${error}`);
    }
  }
}

async function preloadHeroes(
  PersistentCharacters: Library<PersistentCharacter>,
  settings: Settings
) {
  const enabledSources = _.pickBy(
    settings.PreloadedHeroSources,
    isEnabled => isEnabled
  );
  for (const sourceSlug in enabledSources) {
    if (sourceSlug === "heroes-tutorial-set") {
      try {
        const response = await axios.get("/heroes-tutorial-set/");
        const localListings: ListingMeta[] = response.data;
        PersistentCharacters.AddListings(
          localListings,
          "server",
          PersistentCharacter.Initialize
        );
      } catch (error) {
        console.warn(`Problem loading Heroes Tutorial Set: ${error}`);
      }
    }

    if (sourceSlug === "local-basic-rules") {
      try {
        const response = await axios.get("/heroes-starter-set/");
        const localListings: ListingMeta[] = response.data;
        PersistentCharacters.AddListings(
          localListings,
          "server",
          PersistentCharacter.Initialize
        );
      } catch (error) {
        console.warn(`Problem loading Heroes Starter Set: ${error}`);
      }
    }
  }
}

export async function loadTutorialHeroes(
  PersistentCharacters: Library<PersistentCharacter>
) {
  const alreadyLoaded = PersistentCharacters.GetAllListings().some(
    l => l.Origin === "server"
  );
  if (alreadyLoaded) {
    return;
  }

  try {
    const response = await axios.get("/heroes-tutorial-set/");
    const localListings: ListingMeta[] = response.data;
    PersistentCharacters.AddListings(
      localListings,
      "server",
      PersistentCharacter.Initialize
    );
  } catch (error) {
    console.warn(`Problem loading Heroes Tutorial Set: ${error}`);
  }
}

export function unloadTutorialHeroes(
  PersistentCharacters: Library<PersistentCharacter>
) {
  PersistentCharacters.GetAllListings()
    .filter(l => l.Origin === "server")
    .forEach(l => PersistentCharacters.DeleteListing(l.Meta().Id));
}

export async function loadBasicRulesHeroes(
  PersistentCharacters: Library<PersistentCharacter>
) {
  try {
    const response = await axios.get("/heroes-starter-set/");
    const localListings: ListingMeta[] = response.data;
    PersistentCharacters.AddListings(
      localListings,
      "server",
      PersistentCharacter.Initialize
    );
  } catch (error) {
    console.warn(`Problem loading Heroes Starter Set: ${error}`);
  }
}

async function preloadEncounters(
  Encounters: Library<SavedEncounter>,
  settings: Settings
) {
  const enabledSources = _.pickBy(
    settings.PreloadedEncounterSources,
    isEnabled => isEnabled
  );
  for (const sourceSlug in enabledSources) {
    if (sourceSlug === "local-basic-rules") {
      try {
        const response = await axios.get("/encounters-starter-set/");
        const localListings: ListingMeta[] = response.data;
        Encounters.AddListings(
          localListings,
          "server",
          UpdateLegacySavedEncounter
        );
      } catch (error) {
        console.warn(`Problem loading Encounters Starter Set: ${error}`);
      }
    }
  }
}

export const SAMPLE_HEROES_FOLDER_NAME = "Sample Heroes";

export const MONSTER_BUILDER_FOLDER_NAME = "Monster Builder";

async function preloadSpells(Spells: Library<Spell>, settings: Settings) {
  const enabledSources = _.pickBy(
    settings.PreloadedSpellSources,
    isEnabled => isEnabled
  );
  for (const sourceSlug in enabledSources) {
    if (sourceSlug === "local-basic-rules") {
      try {
        const response = await axios.get("/spells/");
        const localListings: ListingMeta[] = response.data;
        Spells.AddListings(localListings, "server");
      } catch (error) {
        console.warn(`Problem loading local Basic Rules Compendium: ${error}`);
      }
      continue;
    }

    try {
      const response = await axios.get(`/open5e-spells/${sourceSlug}/`);
      const open5eListings: ListingMeta[] = response.data;
      Spells.AddListings(
        open5eListings,
        "open5e-additional",
        ImportOpen5eSpell
      );
    } catch (error) {
      console.warn(`Problem loading Spells from ${sourceSlug}: ${error}`);
    }
  }
}

function syncAccountCharacters(
  accountClient: AccountClient,
  libraries: Libraries,
  signalLoadComplete: (string: "localAsync" | "account") => void
) {
  accountClient.GetAccount(async account => {
    console.log("[TutorialDebug] GetAccount resolved, account =", account);
    if (!account) {
      signalLoadComplete("account");
      return;
    }
    if (account.persistentcharacters.length == 0) {
      // Normally useLibrary will only call signalLoadComplete if at least one loaded listing is from the account
      console.log("[TutorialDebug] GetAccount: 0 persistentcharacters, signalLoadComplete(account) explicitly");
      signalLoadComplete("account");
    }

    handleAccountSync(account, accountClient, libraries);
  });
}

const handleAccountSync = (
  account: Account,
  accountClient: AccountClient,
  libraries: Libraries
) => {
  if (account.statblocks) {
    libraries.StatBlocks.AddListings(account.statblocks, "account");
  }

  if (account.persistentcharacters) {
    libraries.PersistentCharacters.AddListings(
      account.persistentcharacters,
      "account"
    );
  }

  if (account.spells) {
    libraries.Spells.AddListings(account.spells, "account");
  }

  if (account.encounters) {
    libraries.Encounters.AddListings(account.encounters, "account");
  }

  setTimeout(
    () => accountClient.SaveAllUnsyncedItems(libraries, () => {}),
    1000
  );
};
