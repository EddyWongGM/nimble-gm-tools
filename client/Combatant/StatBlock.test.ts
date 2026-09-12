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

  describe("IsHeroCountScaled", () => {
    test("is true for a Legendary monster", () => {
      expect(
        StatBlock.IsHeroCountScaled({
          ...StatBlock.Default(),
          Player: "legendary"
        })
      ).toBe(true);
    });

    test("is true for a Normal monster with ScalesWithHeroCount set", () => {
      expect(
        StatBlock.IsHeroCountScaled({
          ...StatBlock.Default(),
          Player: "",
          ScalesWithHeroCount: true
        })
      ).toBe(true);
    });

    test("is false for a Normal monster without ScalesWithHeroCount", () => {
      expect(
        StatBlock.IsHeroCountScaled({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });

    test("is false for a companion with ScalesWithHeroCount set (not a valid combination, but should be ignored)", () => {
      expect(
        StatBlock.IsHeroCountScaled({
          ...StatBlock.Default(),
          Player: "companion",
          ScalesWithHeroCount: true
        })
      ).toBe(false);
    });
  });

  describe("IsCountScaledByHeroes", () => {
    test("is true for a Normal monster with ScalesCountWithHeroCount set", () => {
      expect(
        StatBlock.IsCountScaledByHeroes({
          ...StatBlock.Default(),
          Player: "",
          ScalesCountWithHeroCount: true
        })
      ).toBe(true);
    });

    test("is false for a Normal monster without ScalesCountWithHeroCount", () => {
      expect(
        StatBlock.IsCountScaledByHeroes({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });

    test("is false for a Legendary monster with ScalesCountWithHeroCount set (Normal only)", () => {
      expect(
        StatBlock.IsCountScaledByHeroes({
          ...StatBlock.Default(),
          Player: "legendary",
          ScalesCountWithHeroCount: true
        })
      ).toBe(false);
    });
  });

  describe("GetHeroScaledMonsterCount", () => {
    test("returns 1 for a monster that isn't count-scaled, regardless of hero count", () => {
      expect(
        StatBlock.GetHeroScaledMonsterCount(
          { ...StatBlock.Default(), Player: "" },
          4
        )
      ).toBe(1);
    });

    test("multiplies MonstersPerHero by hero count for a whole ratio", () => {
      expect(
        StatBlock.GetHeroScaledMonsterCount(
          {
            ...StatBlock.Default(),
            Player: "",
            ScalesCountWithHeroCount: true,
            MonstersPerHero: 2
          },
          4
        )
      ).toBe(8);
    });

    test("rounds a fractional ratio down, in favor of the heroes", () => {
      expect(
        StatBlock.GetHeroScaledMonsterCount(
          {
            ...StatBlock.Default(),
            Player: "",
            ScalesCountWithHeroCount: true,
            MonstersPerHero: 0.5
          },
          3
        )
      ).toBe(1); // floor(0.5 * 3) = 1, not 2
    });

    test("never returns less than 1, even when the ratio rounds to zero", () => {
      expect(
        StatBlock.GetHeroScaledMonsterCount(
          {
            ...StatBlock.Default(),
            Player: "",
            ScalesCountWithHeroCount: true,
            MonstersPerHero: 0.5
          },
          1
        )
      ).toBe(1); // floor(0.5 * 1) = 0, clamped up to 1
    });

    test("defaults MonstersPerHero to 1 when unset", () => {
      expect(
        StatBlock.GetHeroScaledMonsterCount(
          {
            ...StatBlock.Default(),
            Player: "",
            ScalesCountWithHeroCount: true,
            MonstersPerHero: undefined
          },
          5
        )
      ).toBe(5);
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
