import { StatBlock } from "../../common/StatBlock";

describe("StatBlock", () => {
  describe("IsPlayerCharacter", () => {
    test("is true only for Player == 'player'", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "player" })
      ).toBe(true);
    });

    test("is false for a monster/NPC (empty Player)", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });

    test("is false for a companion", () => {
      expect(
        StatBlock.IsPlayerCharacter({
          ...StatBlock.Default(),
          Player: "companion"
        })
      ).toBe(false);
    });

    test("is false for the legacy 'npc' value", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "npc" })
      ).toBe(false);
    });
  });

  describe("IsCompanion", () => {
    test("is true only for Player == 'companion'", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "companion" })
      ).toBe(true);
    });

    test("is false for a player character", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "player" })
      ).toBe(false);
    });

    test("is false for a monster/NPC (empty Player)", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });
  });

  describe("ActsInPlayerPhase", () => {
    test("is true for a player character", () => {
      expect(
        StatBlock.ActsInPlayerPhase({ ...StatBlock.Default(), Player: "player" })
      ).toBe(true);
    });

    test("is true for a companion", () => {
      expect(
        StatBlock.ActsInPlayerPhase({
          ...StatBlock.Default(),
          Player: "companion"
        })
      ).toBe(true);
    });

    test("is false for a monster/NPC", () => {
      expect(
        StatBlock.ActsInPlayerPhase({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });
  });

  describe("Update", () => {
    test("converts old-shape raw D&D scores (with Con/Cha) to modifiers", () => {
      const legacyStatBlock = {
        ...StatBlock.Default(),
        Abilities: { Str: 16, Dex: 8, Con: 10, Cha: 10, Int: 14, Wis: 12 }
      };

      expect(StatBlock.Update(legacyStatBlock).Abilities).toEqual({
        Str: 3,
        Dex: -1,
        Int: 2,
        Wis: 1
      });
    });

    test("leaves already-current-shape data untouched", () => {
      const statBlock = {
        ...StatBlock.Default(),
        Abilities: { Str: 3, Dex: -1, Int: 2, Wis: 1 }
      };

      expect(StatBlock.Update(statBlock).Abilities).toEqual(
        statBlock.Abilities
      );
    });

    test("drops legacy Modifier-shaped Saves and Skills entries", () => {
      const legacyStatBlock = {
        ...StatBlock.Default(),
        Saves: [{ Name: "Con", Modifier: 3 }],
        Skills: [{ Name: "Perception", Modifier: 4 }]
      };

      const updated = StatBlock.Update(legacyStatBlock);
      expect(updated.Saves).toEqual([]);
      expect(updated.Skills).toEqual([]);
    });

    test("leaves current-shape Saves and Skills entries untouched", () => {
      const statBlock = {
        ...StatBlock.Default(),
        Saves: [{ Name: "Int", Advantage: "+" }],
        Skills: [{ Name: "Perception", Advantage: "++" }]
      };

      const updated = StatBlock.Update(statBlock);
      expect(updated.Saves).toEqual([{ Name: "Int", Advantage: "+" }]);
      expect(updated.Skills).toEqual([{ Name: "Perception", Advantage: "++" }]);
    });

    test("Update is idempotent for legacy Saves/Skills - safe to run twice", () => {
      const legacyStatBlock = {
        ...StatBlock.Default(),
        Saves: [{ Name: "Con", Modifier: 3 }]
      };

      const updatedOnce = StatBlock.Update(legacyStatBlock);
      const updatedTwice = StatBlock.Update(updatedOnce);
      expect(updatedTwice.Saves).toEqual([]);
    });
  });
});
