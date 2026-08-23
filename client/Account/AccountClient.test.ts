import axios from "axios";

import { env } from "../Environment";
import { Listing, ListingOrigin } from "../Library/Listing";
import { LegacySynchronousLocalStore } from "../Utility/LegacySynchronousLocalStore";
import { Store } from "../Utility/Store";
import { AccountClient, getUnsyncedItemsFromListings } from "./AccountClient";

describe("AccountClient.GetAccount", () => {
  const previousHasStorage = env.HasStorage;

  beforeEach(() => {
    env.HasStorage = true;
  });

  afterEach(() => {
    env.HasStorage = previousHasStorage;
  });

  test("Should call back with the account on success", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { userId: "1" } });
    const callBack = jest.fn();

    new AccountClient().GetAccount(callBack);
    await flushPromises();

    expect(callBack).toHaveBeenCalledWith({ userId: "1" });
  });

  test("Should call back with null instead of hanging when the request fails", async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce(new Error("network error"));
    const callBack = jest.fn();

    new AccountClient().GetAccount(callBack);
    await flushPromises();

    expect(callBack).toHaveBeenCalledWith(null);
  });

  function flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
  }
});

async function fakeListing(
  id: string,
  name: string,
  listingOrigin: ListingOrigin
) {
  const listing = new Listing(
    {
      Id: id,
      Name: name,
      Link: "Test",
      FilterDimensions: {},
      Path: "",
      SearchHint: "",
      LastUpdateMs: 0
    },
    listingOrigin
  );
  if (listingOrigin == "localStorage") {
    LegacySynchronousLocalStore.Save("Test", id, { Id: id, Name: name });
  }
  if (listingOrigin == "localAsync") {
    await Store.Save("Test", id, { Id: id, Name: name });
  }
  return listing;
}

describe("getUnsyncedItemsFromListings", () => {
  test("Should find unsynced local items", async () => {
    const localListing = await fakeListing("item1", "Unsynced", "localStorage");
    const remoteListing = await fakeListing("item2", "Synced", "account");
    const unsyncedItems = await getUnsyncedItemsFromListings([
      localListing,
      remoteListing
    ]);
    expect(unsyncedItems).toEqual([
      {
        Id: "item1",
        Name: "Unsynced",
        Path: "",
        Version: "unknown"
      }
    ]);
  });

  test("Should find unsynced localAsync items", async () => {
    const localListing = await fakeListing("item1", "Unsynced", "localAsync");
    const remoteListing = await fakeListing("item2", "Synced", "account");
    const unsyncedItems = await getUnsyncedItemsFromListings([
      localListing,
      remoteListing
    ]);
    expect(unsyncedItems).toEqual([
      {
        Id: "item1",
        Name: "Unsynced",
        Path: "",
        Version: "unknown"
      }
    ]);
  });

  test("Should omit synced items", async () => {
    const localListing = await fakeListing("item1", "Synced", "localAsync");
    const remoteListing = await fakeListing("item1", "Synced", "account");

    const localUnsyncedListing = await fakeListing(
      "item2",
      "Unsynced",
      "localAsync"
    );

    const unsyncedItems = await getUnsyncedItemsFromListings([
      localListing,
      remoteListing,
      localUnsyncedListing
    ]);

    expect(unsyncedItems).toEqual([
      {
        Id: "item2",
        Name: "Unsynced",
        Path: "",
        Version: "unknown"
      }
    ]);
  });
});
