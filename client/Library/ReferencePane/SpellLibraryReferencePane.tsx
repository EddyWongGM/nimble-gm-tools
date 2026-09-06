import * as React from "react";
import {
  EquipmentRarities,
  EquipmentRarity,
  Spell
} from "../../../common/Spell";
import { linkComponentToObservables } from "../../Combatant/linkComponentToObservables";
import { LibrariesCommander } from "../../Commands/LibrariesCommander";
import { TextEnricher } from "../../TextEnricher/TextEnricher";
import { GetAlphaSortableLevelString } from "../../Utility/GetAlphaSortableLevelString";
import { Listing } from "../Listing";
import { ListingGroup } from "../Components/BuildListingTree";
import { LibraryReferencePane } from "./LibraryReferencePane";
import { ListingRow } from "../Components/ListingRow";
import { SpellDetails } from "../Components/SpellDetails";
import { Library } from "../useLibrary";

export type SpellLibraryReferencePaneProps = {
  librariesCommander: LibrariesCommander;
  library: Library<Spell>;
};

type SpellListing = Listing<Spell>;

export class SpellLibraryReferencePane extends React.Component<SpellLibraryReferencePaneProps> {
  constructor(props: SpellLibraryReferencePaneProps) {
    super(props);
    linkComponentToObservables(this);
  }

  public render(): JSX.Element {
    return (
      <LibraryReferencePane
        listings={this.props.library.GetAllListings()}
        renderListingRow={this.renderListingRow}
        defaultItem={Spell.Default()}
        addNewItem={this.props.librariesCommander.CreateAndEditSpell}
        renderPreview={this.renderPreview}
        listingGroups={this.listingGroups}
        sortComparator={CompareByTierThenName}
      />
    );
  }

  private listingGroups: ListingGroup[] = [
    {
      label: "Folder",
      groupFn: l => ({ key: l.Meta().Path })
    },
    {
      label: "Tier",
      filterFn: l => l.Meta().FilterDimensions.Category === "Spell",
      groupFn: l => ({
        label: TierOrCantrip(l.Meta().FilterDimensions.Tier),
        key: GetAlphaSortableLevelString(l.Meta().FilterDimensions.Tier)
      })
    },
    {
      label: "School",
      hideUngrouped: true,
      groupFn: l => ({ key: l.Meta().FilterDimensions.Type })
    },
    {
      label: "Type",
      groupFn: l => {
        const { Category, Rarity } = l.Meta().FilterDimensions;
        if (Category === "Equipment" && Rarity) {
          // Prefix with rarity rank so subfolders sort by rarity instead of
          // alphabetically, while keeping the displayed label readable.
          const rank = EquipmentRarities.indexOf(Rarity as EquipmentRarity);
          return {
            key: `Equipment/${rank}_${Rarity}`,
            label: `Equipment/${CapitalizeRarity(Rarity)}`
          };
        }
        return { key: Category };
      }
    }
  ];

  private renderListingRow = (l: Listing<Spell>, onPreview, onPreviewOut) => {
    const listingMeta = l.Meta();
    return (
      <ListingRow
        key={listingMeta.Id + listingMeta.Path + listingMeta.Name}
        name={listingMeta.Name}
        onAdd={this.loadSavedSpell}
        onEdit={this.editSpell}
        onPreview={onPreview}
        onPreviewOut={onPreviewOut}
        listing={l}
      />
    );
  };

  private renderPreview = (spell: Spell, isLoading: boolean) => (
    <div className="spell-preview">
      <SpellDetails Spell={spell} isLoading={isLoading} />
    </div>
  );

  private loadSavedSpell = (listing: SpellListing) => {
    return this.props.librariesCommander.ReferenceSpell(listing);
  };

  private editSpell = (l: Listing<Spell>) => {
    l.Meta.subscribe(_ => this.forceUpdate());
    this.props.librariesCommander.EditSpell(l);
  };
}

function CapitalizeRarity(rarity: string) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function TierOrCantrip(levelString: string) {
  if (levelString == "0") {
    return "Cantrip";
  }
  return "Tier " + levelString;
}

function CompareByTierThenName(a: Listing<Spell>, b: Listing<Spell>) {
  const tierA = Number(a.Meta().FilterDimensions.Tier) || 0;
  const tierB = Number(b.Meta().FilterDimensions.Tier) || 0;
  if (tierA !== tierB) {
    return tierA - tierB;
  }
  return a.Meta().Name.localeCompare(b.Meta().Name);
}
