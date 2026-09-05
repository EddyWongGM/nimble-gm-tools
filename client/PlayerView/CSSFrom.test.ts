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

  test("no stat colors set emits no custom-property overrides", () => {
    const css = CSSFrom(customStyles);

    expect(css).not.toContain("--blue");
    expect(css).not.toContain("--green");
  });

  test("a chosen Mana color overrides --blue at :root, .combatant--header, and .c-toolbar", () => {
    const css = CSSFrom({ ...customStyles, manaColor: "#123456" });

    expect(css).toContain(":root { --blue: #123456; }");
    expect(css).toContain(".combatant--header { --blue: #123456; }");
    expect(css).toContain(".c-toolbar { --blue: #123456; }");
  });

  test("a chosen HP icon color overrides --green, with no matching value-color property", () => {
    const css = CSSFrom({ ...customStyles, hpIconColor: "#abcdef" });

    expect(css).toContain("--green: #abcdef;");
  });

  test("multiple chosen stat colors all appear in one declaration block", () => {
    const css = CSSFrom({
      ...customStyles,
      manaColor: "#111111",
      goldColor: "#222222"
    });

    expect(css).toContain("--blue: #111111;");
    expect(css).toContain("--gold: #222222;");
  });
});
