import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { LegacySynchronousLocalStore } from "./LegacySynchronousLocalStore";
import { Store } from "./Store";

describe("Store", () => {
  it("Saves, Loads, and Deletes", async () => {
    await Store.Save("TestList", "TestKey", "TestValue");
    const item = await Store.Load("TestList", "TestKey");
    expect(item).toEqual("TestValue");
    await Store.Delete("TestList", "TestKey");
    const emptyList = await Store.LoadAllAndUpdateIds("TestList");
    expect(emptyList).toEqual([]);
  });

  it("Handles nested objects", async () => {
    await Store.Save("TestList", "TestKey", {
      Label: "SomeValue",
      Amount: 5
    });

    const item = await Store.Load("TestList", "TestKey");
    expect(item).toEqual({ Label: "SomeValue", Amount: 5 });
  });
});

describe("Store.importList", () => {
  const listName = "ImportTestList";

  afterEach(async () => {
    await Store.Delete(listName, "existing-key");
  });

  it("saves when no existing record exists", async () => {
    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "New", LastUpdateMs: 100 }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("New");
  });

  it("skips when the existing record is newer", async () => {
    await Store.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 200
    });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported", LastUpdateMs: 100 }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved).toEqual({ Name: "Local", LastUpdateMs: 200 });
  });

  it("skips when the existing record has an equal timestamp", async () => {
    await Store.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 150
    });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported", LastUpdateMs: 150 }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("Local");
  });

  it("overwrites when the imported record is newer", async () => {
    await Store.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 100
    });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported", LastUpdateMs: 200 }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("Imported");
  });

  it("treats a missing LastUpdateMs as 0 on both sides and skips", async () => {
    await Store.Save(listName, "existing-key", { Name: "Local" });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported" }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("Local");
  });

  it("overwrites when only the existing record has no LastUpdateMs", async () => {
    await Store.Save(listName, "existing-key", { Name: "Local" });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported", LastUpdateMs: 50 }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("Imported");
  });

  it("skips when only the imported record has no LastUpdateMs", async () => {
    await Store.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 100
    });

    await Store.importList(listName, {
      [`${listName}.existing-key`]: { Name: "Imported" }
    });

    const saved = await Store.Load<any>(listName, "existing-key");
    expect(saved.Name).toEqual("Local");
  });
});

describe("LegacySynchronousLocalStore", () => {
  it("Saves, Lists, Loads, and Deletes", () => {
    LegacySynchronousLocalStore.Save("TestList", "TestKey", "TestValue");
    const list = LegacySynchronousLocalStore.List("TestList");
    expect(list).toEqual(["TestKey"]);
    const item = LegacySynchronousLocalStore.Load("TestList", "TestKey");
    expect(item).toEqual("TestValue");
    LegacySynchronousLocalStore.Delete("TestList", "TestKey");
    const emptyList = LegacySynchronousLocalStore.List("TestList");
    expect(emptyList).toEqual([]);
  });

  it("Handles nested objects", () => {
    LegacySynchronousLocalStore.Save("TestList", "TestKey", {
      Label: "SomeValue",
      Amount: 5
    });

    const item = LegacySynchronousLocalStore.Load("TestList", "TestKey");
    expect(item).toEqual({ Label: "SomeValue", Amount: 5 });
  });

  it("Migrates statblocks to the new store", async () => {
    const statBlock = { ...StatBlock.Default(), Name: "Saved Statblock" };
    LegacySynchronousLocalStore.Save(Store.StatBlocks, statBlock.Id, statBlock);

    await LegacySynchronousLocalStore.MigrateItemsToStore();

    const migratedStatBlock = await Store.Load(Store.StatBlocks, statBlock.Id);
    expect(migratedStatBlock).toEqual(statBlock);

    const legacyListings = LegacySynchronousLocalStore.List(Store.StatBlocks);
    expect(legacyListings).toEqual([]);
  });

  it("Migrates spells to the new store", async () => {
    const spell = { ...Spell.Default(), Name: "Saved Spell" };
    LegacySynchronousLocalStore.Save(Store.Spells, spell.Id, spell);

    await LegacySynchronousLocalStore.MigrateItemsToStore();

    const migratedSpell = await Store.Load(Store.Spells, spell.Id);
    expect(migratedSpell).toEqual(spell);

    const legacyListings = LegacySynchronousLocalStore.List(Store.Spells);
    expect(legacyListings).toEqual([]);
  });
});

describe("LegacySynchronousLocalStore.importList", () => {
  const listName = "LegacyImportTestList";
  const prefix = "ImprovedInitiative";

  function buildImportSource(key: string, listing: any) {
    return {
      [`${prefix}.${listName}`]: JSON.stringify([key]),
      [`${prefix}.${listName}.${key}`]: JSON.stringify(listing)
    };
  }

  afterEach(() => {
    LegacySynchronousLocalStore.Delete(listName, "existing-key");
  });

  it("saves when no existing record exists", () => {
    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", { Name: "New", LastUpdateMs: 100 })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("New");
  });

  it("skips when the existing record is newer", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 200
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", {
        Name: "Imported",
        LastUpdateMs: 100
      })
    );

    const saved = LegacySynchronousLocalStore.Load(listName, "existing-key");
    expect(saved).toEqual({ Name: "Local", LastUpdateMs: 200 });
  });

  it("skips when the existing record has an equal timestamp", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 150
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", {
        Name: "Imported",
        LastUpdateMs: 150
      })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("Local");
  });

  it("overwrites when the imported record is newer", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 100
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", {
        Name: "Imported",
        LastUpdateMs: 200
      })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("Imported");
  });

  it("treats a missing LastUpdateMs as 0 on both sides and skips", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local"
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", { Name: "Imported" })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("Local");
  });

  it("overwrites when only the existing record has no LastUpdateMs", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local"
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", { Name: "Imported", LastUpdateMs: 50 })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("Imported");
  });

  it("skips when only the imported record has no LastUpdateMs", () => {
    LegacySynchronousLocalStore.Save(listName, "existing-key", {
      Name: "Local",
      LastUpdateMs: 100
    });

    LegacySynchronousLocalStore.importList(
      listName,
      buildImportSource("existing-key", { Name: "Imported" })
    );

    const saved: any = LegacySynchronousLocalStore.Load(
      listName,
      "existing-key"
    );
    expect(saved.Name).toEqual("Local");
  });
});
