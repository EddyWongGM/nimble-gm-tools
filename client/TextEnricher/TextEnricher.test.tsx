import { fireEvent, render } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { concatenatedStringRegex } from "../../common/Toolbox";
import { Listing } from "../Library/Listing";
import { DefaultRules } from "../Rules/Rules";
import { Store } from "../Utility/Store";
import { TextEnricher } from "./TextEnricher";

function getTestSpell() {
  const spell = {
    ...Spell.Default(),
    Name: "Test Spell"
  };

  const listing = new Listing(
    {
      ...spell,
      FilterDimensions: Spell.GetFilterDimensions(spell),
      SearchHint: Spell.GetSearchHint(spell),
      Link: Store.Spells,
      LastUpdateMs: 0
    },
    "localStorage",
    spell
  );

  return listing;
}

describe("TextEnricher", () => {
  test("Spell Reference", async () => {
    const textEnricher = new TextEnricher(
      () => {},
      spell => {
        expect(spell.Meta().Name).toEqual("Test Spell");
      },
      () => {},
      () => [getTestSpell()],
      () => concatenatedStringRegex([getTestSpell().Meta().Name]),
      new DefaultRules()
    );

    const inputText =
      "The creature can cast Test Spell at will as a bonus action.";

    const enrichedText = textEnricher.EnrichText(inputText);

    const tree = render(enrichedText);
    act(() => {
      tree.getByText("Test Spell").click();
    });
    expect.assertions(1);
  });

  test("Counter", async () => {
    const textEnricher = new TextEnricher(
      () => {},
      () => {},
      () => {},
      () => [getTestSpell()],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const inputText = "Gold [100/1000000] gp.";

    const writeBack = jest.fn();
    const enrichedText = textEnricher.EnrichText(inputText, writeBack);
    const tree = render(enrichedText);
    act(() => {
      const input = tree.getByDisplayValue("100") as HTMLInputElement;
      fireEvent.blur(input, { target: { value: 200 } });
    });

    expect(writeBack).toHaveBeenCalledWith("Gold [200/1000000] gp.");
  });

  test("LVL tag rolls the Challenge modifier for a whole-number Challenge", async () => {
    const rollDice = jest.fn();
    const textEnricher = new TextEnricher(
      rollDice,
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const statBlock = { ...StatBlock.Default(), Challenge: "3" };
    const enrichedText = textEnricher.EnrichText(
      "Level [LVL]",
      undefined,
      statBlock
    );
    const tree = render(enrichedText);

    act(() => {
      tree.getByText("3").click();
    });

    expect(rollDice).toHaveBeenCalledWith("+3");
  });

  test("LVL tag falls back to plain text for a fractional Challenge Rating", () => {
    const rollDice = jest.fn();
    const textEnricher = new TextEnricher(
      rollDice,
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    // Legacy imported monsters can have a fractional CR like "1/2" - this
    // used to silently roll a truncated "+1" (parseInt("1/2") === 1), or a
    // literal "NaN" for other non-numeric Challenge text.
    const statBlock = { ...StatBlock.Default(), Challenge: "1/2" };
    const enrichedText = textEnricher.EnrichText(
      "Level [LVL]",
      undefined,
      statBlock
    );
    const tree = render(enrichedText);

    expect(() => tree.getByText("Level [LVL]")).not.toThrow();
    expect(tree.queryByText("NaN")).toBeNull();
    expect(rollDice).not.toHaveBeenCalled();
  });

  test("KEY tag labels Wisdom as WIL, matching the app's Wis->Wil display name", () => {
    const textEnricher = new TextEnricher(
      () => {},
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const statBlock = {
      ...StatBlock.Default(),
      Abilities: { Str: 10, Dex: 10, Con: 10, Int: 10, Wis: 20, Cha: 10 }
    };
    const enrichedText = textEnricher.EnrichText(
      "Save DC [KEY]",
      undefined,
      statBlock
    );
    const tree = render(enrichedText);

    expect(() => tree.getByText("(WIL)")).not.toThrow();
    expect(tree.queryByText("(WIS)")).toBeNull();
  });
});
