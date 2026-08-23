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
});
