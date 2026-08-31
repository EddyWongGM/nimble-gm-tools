export interface Listable {
  Id: string;
  Version: string;
  Name: string;
  Path: string;
  LastUpdateMs?: number;
}

// Listings can be grouped or filtered by their FilterDimensions.
export interface FilterDimensions {
  // StatBlocks: Challenge Rating.
  Level?: string;
  // Spells: spell Tier (cantrips are Tier 0).
  Tier?: string;
  Source?: string;
  Type?: string;
  Category?: string;
}

export interface ListingMeta {
  Id: string;
  Link: string;
  Name: string;
  SearchHint: string;
  FilterDimensions: FilterDimensions;
  Path: string;
  LastUpdateMs: number;
}
