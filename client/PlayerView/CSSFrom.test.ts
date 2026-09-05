import { getDefaultSettings } from "../../common/Settings";
import { CSSFrom } from "./CSSFrom";

describe("CSSFrom", () => {
  const customStyles = getDefaultSettings().PlayerView.CustomStyles;

  test("a temporary background with no Fit specified defaults to cover", () => {
    const css = CSSFrom(customStyles, "http://example.com/scene.png");

    expect(css).toContain("background-image: url(http://example.com/scene.png)");
    expect(css).toContain("background-size: cover");
  });

  test("a temporary background with Fit: contain emits background-size: contain", () => {
    const css = CSSFrom(
      customStyles,
      "http://example.com/scene.png",
      "contain"
    );

    expect(css).toContain("background-size: contain");
    expect(css).not.toContain("background-size: cover");
  });

  test("the persistent default background does not get a background-size override", () => {
    const css = CSSFrom(
      { ...customStyles, backgroundUrl: "http://example.com/default.png" },
      undefined,
      undefined
    );

    expect(css).toContain(
      "background-image: url(http://example.com/default.png)"
    );
    expect(css).not.toContain("background-size");
  });

  test("no background at all emits neither background-image nor background-size", () => {
    const css = CSSFrom(customStyles);

    expect(css).not.toContain("background-image");
    expect(css).not.toContain("background-size");
  });

  test("a temporary background also targets #playerview.dark-mode, so it isn't hidden behind the static dark-mode texture rule", () => {
    const css = CSSFrom(customStyles, "http://example.com/scene.png");

    expect(css).toContain(
      "#playerview, #playerview.dark-mode { background-image: url(http://example.com/scene.png); }"
    );
  });

  test("below Epic Tier, stat colors are neutralized to --text-face at :root even with nothing customized", () => {
    const css = CSSFrom(customStyles, undefined, undefined, false);

    expect(css).toContain(
      ":root { --stat-hp: var(--text-face); --stat-mana: var(--text-face)"
    );
    expect(css).not.toMatch(/--stat-mana: #/);
  });

  test("below Epic Tier, .combatant--header/.c-toolbar are neutralized to --white, not --text-face (they're always a black bar)", () => {
    const css = CSSFrom(customStyles, undefined, undefined, false);

    expect(css).toContain(
      ".combatant--header { --stat-hp: var(--white); --stat-mana: var(--white)"
    );
    expect(css).toContain(
      ".c-toolbar { --stat-hp: var(--white); --stat-mana: var(--white)"
    );
  });

  test("below Epic Tier, any leftover customized color is ignored, not just unset fields", () => {
    const css = CSSFrom(
      { ...customStyles, manaColor: "#123456" },
      undefined,
      undefined,
      false
    );

    expect(css).toContain("--stat-mana: var(--text-face);");
    expect(css).not.toContain("#123456");
  });

  test("at Epic Tier with no stat colors chosen, no custom-property overrides are emitted (fixed colorful defaults show through)", () => {
    const css = CSSFrom(customStyles, undefined, undefined, true);

    expect(css).not.toContain("--stat-mana");
    expect(css).not.toContain("--stat-hp");
  });

  test("at Epic Tier, a chosen Mana color overrides --stat-mana at :root, .combatant--header, and .c-toolbar - never the shared --blue used elsewhere for unrelated UI", () => {
    const css = CSSFrom(
      { ...customStyles, manaColor: "#123456" },
      undefined,
      undefined,
      true
    );

    expect(css).toContain(":root { --stat-mana: #123456; }");
    expect(css).toContain(".combatant--header { --stat-mana: #123456; }");
    expect(css).toContain(".c-toolbar { --stat-mana: #123456; }");
    expect(css).not.toMatch(/[^-]--blue:/);
  });

  test("at Epic Tier, a chosen HP icon color overrides --stat-hp, with no matching value-color property", () => {
    const css = CSSFrom(
      { ...customStyles, hpIconColor: "#abcdef" },
      undefined,
      undefined,
      true
    );

    expect(css).toContain("--stat-hp: #abcdef;");
  });

  test("at Epic Tier, multiple chosen stat colors all appear in one declaration block", () => {
    const css = CSSFrom(
      { ...customStyles, manaColor: "#111111", goldColor: "#222222" },
      undefined,
      undefined,
      true
    );

    expect(css).toContain("--stat-mana: #111111;");
    expect(css).toContain("--stat-gold: #222222;");
  });
});
