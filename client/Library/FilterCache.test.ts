import { StatBlock } from "../../common/StatBlock";
import { FilterCache } from "./FilterCache";
import { Listing } from "./Listing";

function makeStatBlockListing(partialStatblock: Partial<StatBlock>) {
  const statBlock = {
    ...StatBlock.Default(),
    ...partialStatblock
  };
  const listing = new Listing<StatBlock>(
    {
      ...statBlock,
      SearchHint: StatBlock.GetSearchHint(statBlock),
      FilterDimensions: StatBlock.FilterDimensions(statBlock),
      Link: "/",
      LastUpdateMs: 0
    },
    "localAsync"
  );

  return listing;
}

describe("FilterCache", () => {
  test("GetFilteredEntries", () => {
    const filterCache = new FilterCache<Listing<StatBlock>>([
      makeStatBlockListing({ Name: "Goblin" }),
      makeStatBlockListing({ Name: "Troll" })
    ]);

    const results = filterCache.GetFilteredEntries("goblin");

    expect(results.map(l => l.Meta().Name)).toEqual(["Goblin"]);
  });

  test("keeps same-Name listings at different Challenge ratings", () => {
    const filterCache = new FilterCache<Listing<StatBlock>>([
      makeStatBlockListing({ Name: "Goblin", Challenge: "1" }),
      makeStatBlockListing({ Name: "Goblin", Challenge: "2" })
    ]);

    const results = filterCache.GetFilteredEntries("goblin");

    expect(results).toHaveLength(2);
    expect(results.map(l => l.Meta().FilterDimensions.Level).sort()).toEqual([
      "1",
      "2"
    ]);
  });

  test("still dedupes same-Name listings at the same Challenge rating", () => {
    const filterCache = new FilterCache<Listing<StatBlock>>([
      makeStatBlockListing({ Name: "Goblin", Challenge: "1" }),
      makeStatBlockListing({ Name: "Goblin", Challenge: "1" })
    ]);

    const results = filterCache.GetFilteredEntries("goblin");

    expect(results).toHaveLength(1);
  });

  test("orders same-Name listings weakest to strongest, Minion first", () => {
    const filterCache = new FilterCache<Listing<StatBlock>>([
      makeStatBlockListing({ Name: "Goblin", Challenge: "1/2" }),
      makeStatBlockListing({ Name: "Goblin", Challenge: "Minion" })
    ]);

    const results = filterCache.GetFilteredEntries("goblin");

    expect(results.map(l => l.Meta().FilterDimensions.Level)).toEqual([
      "Minion",
      "1/2"
    ]);
  });
});
