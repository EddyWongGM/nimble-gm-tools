import { act, renderHook } from "@testing-library/react-hooks";
import { StatBlock } from "../../common/StatBlock";
import { Store } from "../Utility/Store";
import { useLibrary } from "./useLibrary";

function buildGoblin(Id: string, Challenge: string): StatBlock {
  return {
    ...StatBlock.Default(),
    Id,
    Name: "Goblin",
    Path: "",
    Challenge
  };
}

describe("StatBlock Library", () => {
  beforeEach(() => {
    jest.spyOn(Store, "LoadAllAndUpdateIds").mockResolvedValue([]);
    jest.spyOn(Store, "Save").mockResolvedValue();
    jest.spyOn(Store, "Delete").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderStatBlockLibrary(accountSave: (s: StatBlock) => any) {
    return renderHook(() =>
      useLibrary<StatBlock>(Store.StatBlocks, "statblocks", {
        createEmptyListing: StatBlock.Default,
        accountSave,
        accountDelete: () => undefined,
        getSearchHint: StatBlock.GetSearchHint,
        getFilterDimensions: StatBlock.FilterDimensions,
        migrate: StatBlock.Update
      })
    );
  }

  // Regression test: editing and re-saving one same-named monster used to
  // wipe out a different-Challenge sibling's account-synced copy, because
  // SaveEditedListing's "clean up my stale account duplicate" fallback
  // matched on Path+Name alone.
  test("editing one same-name monster does not delete a different-Challenge sibling's account listing", async () => {
    const accountSave = jest.fn().mockResolvedValue(true);
    const { result } = renderStatBlockLibrary(accountSave);

    let minionListing;
    let halfListing;
    await act(async () => {
      minionListing = await result.current.SaveNewListing(
        buildGoblin("minion-id", "Minion")
      );
    });
    await act(async () => {
      halfListing = await result.current.SaveNewListing(
        buildGoblin("half-id", "1/2")
      );
    });

    // Each save should have produced both a localAsync listing and an
    // account-origin companion listing (accountSave resolved truthy).
    expect(
      result.current.GetAllListings().filter(l => l.Origin === "account")
    ).toHaveLength(2);

    await act(async () => {
      await result.current.SaveEditedListing(minionListing, {
        ...buildGoblin("minion-id", "Minion"),
        HP: { Value: 99, Notes: "" }
      });
    });

    const accountListings = result.current
      .GetAllListings()
      .filter(l => l.Origin === "account");
    expect(accountListings).toHaveLength(2);
    expect(accountListings.map(l => l.Meta().FilterDimensions.Level).sort()).toEqual(
      ["1/2", "Minion"]
    );
    expect(Store.Delete).not.toHaveBeenCalledWith(
      Store.StatBlocks,
      halfListing.Meta().Id
    );
  });

  test("editing still cleans up a same-Name/same-Challenge account copy that has a different Id", async () => {
    // An account-synced copy of the identical logical item can carry a
    // server-assigned Id distinct from the local one; SaveEditedListing's
    // Path+Name(+Level) fallback exists to reconcile that case, and must
    // still work for it after being made Level-aware.
    const accountSave = jest.fn().mockResolvedValue(false);
    const { result } = renderStatBlockLibrary(accountSave);

    let listing;
    await act(async () => {
      listing = await result.current.SaveNewListing(
        buildGoblin("local-id", "1")
      );
    });

    act(() => {
      result.current.AddListings(
        [
          {
            Id: "stale-account-id",
            Path: "",
            Name: "Goblin",
            SearchHint: "",
            FilterDimensions: { Level: "1" },
            Link: "/my/statblocks/stale-account-id",
            LastUpdateMs: 0
          }
        ],
        "account"
      );
    });
    expect(
      result.current.GetAllListings().filter(l => l.Origin === "account")
    ).toHaveLength(1);

    await act(async () => {
      await result.current.SaveEditedListing(listing, {
        ...buildGoblin("local-id", "1"),
        HP: { Value: 50, Notes: "" }
      });
    });

    expect(Store.Delete).toHaveBeenCalledWith(
      Store.StatBlocks,
      "stale-account-id"
    );
  });
});
