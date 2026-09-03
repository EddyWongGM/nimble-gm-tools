import { Library } from "./library";
import { Listable } from "../common/Listable";

interface TestItem extends Listable {
  Source: string;
  Challenge: string;
}

function buildLibrary(items: Partial<TestItem>[]): Library<TestItem> {
  const library = new Library<TestItem>(
    "/statblocks/",
    () => "",
    () => ({})
  );
  (library as any).Add(items);
  return library;
}

describe("Library", () => {
  test("assigns distinct Ids to same-Name/same-Source entries instead of overwriting each other", () => {
    const library = buildLibrary([
      { Name: "Goblin", Source: "Nimble GMG", Challenge: "Minion" },
      { Name: "Goblin", Source: "Nimble GMG", Challenge: "1/2" }
    ]);

    const listings = library.GetListings();
    expect(listings).toHaveLength(2);

    const ids = listings.map(l => l.Id);
    expect(new Set(ids).size).toBe(2);

    const byId = ids.map(id => library.GetById(id));
    expect(byId.map(item => item.Challenge).sort()).toEqual(["1/2", "Minion"]);
  });

  test("keeps the same Id for a Name+Source pair that doesn't collide with anything", () => {
    const library = buildLibrary([
      { Name: "Zombie", Source: "Nimble GMG", Challenge: "1" }
    ]);

    expect(library.GetListings()[0].Id).toBe("nimble-gmg.zombie");
    expect(library.GetById("nimble-gmg.zombie").Challenge).toBe("1");
  });
});
