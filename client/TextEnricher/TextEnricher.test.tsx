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

  test("Escaped Spell Reference renders as plain, non-clickable text", async () => {
    const referenceSpellListing = jest.fn();
    const textEnricher = new TextEnricher(
      () => {},
      referenceSpellListing,
      () => {},
      () => [getTestSpell()],
      () =>
        concatenatedStringRegex([getTestSpell().Meta().Name], {
          allowEscape: true
        }),
      new DefaultRules()
    );

    const inputText =
      "The creature can cast \\Test Spell at will as a bonus action.";

    const enrichedText = textEnricher.EnrichText(inputText);

    const tree = render(enrichedText);
    expect(tree.container.textContent).toContain("Test Spell");
    expect(tree.container.querySelector(".spell-reference")).toBeNull();
    expect(referenceSpellListing).not.toHaveBeenCalled();
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

  test("Compound expression sums two tags into one rollable total", () => {
    const rollDice = jest.fn();
    const textEnricher = new TextEnricher(
      rollDice,
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const statBlock = {
      ...StatBlock.Default(),
      Challenge: "3",
      Abilities: { Str: 0, Dex: 2, Int: 0, Wis: 0 }
    };
    const enrichedText = textEnricher.EnrichText(
      "Reach [DEX]+[LVL]",
      undefined,
      statBlock
    );
    const tree = render(enrichedText);

    expect(() => tree.getByText("5")).not.toThrow();
    expect(() => tree.getByText("(DEX+LVL)")).not.toThrow();
    expect(tree.queryByText("[DEX]")).toBeNull();

    act(() => {
      tree.getByText("5").click();
    });
    expect(rollDice).toHaveBeenCalledWith("+5");
  });

  test("Compound expression multiplies a coefficient into one rollable total", () => {
    const rollDice = jest.fn();
    const textEnricher = new TextEnricher(
      rollDice,
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const statBlock = {
      ...StatBlock.Default(),
      Abilities: { Str: 0, Dex: 0, Int: 0, Wis: 2 }
    };
    const enrichedText = textEnricher.EnrichText(
      "Uses 2×[WIL]",
      undefined,
      statBlock
    );
    const tree = render(enrichedText);

    expect(() => tree.getByText("4")).not.toThrow();
    expect(() => tree.getByText("(2×WIL)")).not.toThrow();

    act(() => {
      tree.getByText("4").click();
    });
    expect(rollDice).toHaveBeenCalledWith("+4");
  });

  test("Compound expression falls back to plain text without a stat block", () => {
    const textEnricher = new TextEnricher(
      () => {},
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const enrichedText = textEnricher.EnrichText("Reach [DEX]+[LVL]");
    const tree = render(enrichedText);

    expect(() => tree.getByText("Reach [DEX]+[LVL]")).not.toThrow();
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
      Abilities: { Str: 0, Dex: 0, Int: 0, Wis: 5 }
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

  test("A paragraph starting with a hand-typed bullet gets a hanging-indent class", () => {
    const textEnricher = new TextEnricher(
      () => {},
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const bulletTree = render(
      textEnricher.EnrichText("· A long bulleted line.")
    );
    expect(
      bulletTree.getByText(/A long bulleted line/).className
    ).toContain("text-enricher-bullet-line");

    const plainTree = render(
      textEnricher.EnrichText("A plain paragraph.")
    );
    expect(
      plainTree.getByText(/A plain paragraph/).className
    ).not.toContain("text-enricher-bullet-line");
  });

  test("Multiple hand-typed bullet lines authored as one soft-wrapped paragraph each get their own hanging-indent line", () => {
    const textEnricher = new TextEnricher(
      () => {},
      () => {},
      () => {},
      () => [],
      () => new RegExp("asdf"),
      new DefaultRules()
    );

    const tree = render(
      textEnricher.EnrichText(
        "· First bullet line.\nA plain continuation line.\n· Second bullet line."
      )
    );

    expect(tree.getByText(/First bullet line/).className).toContain(
      "text-enricher-bullet-line"
    );
    expect(
      tree.getByText(/plain continuation line/).className
    ).not.toContain("text-enricher-bullet-line");
    expect(tree.getByText(/Second bullet line/).className).toContain(
      "text-enricher-bullet-line"
    );

    // Every split line, bullet or not, still needs to actually start a new
    // line - not just the bulleted ones.
    expect(
      tree.getByText(/plain continuation line/).className
    ).toContain("text-enricher-line");
  });
});
