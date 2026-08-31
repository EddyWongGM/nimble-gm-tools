import * as Enzyme from "enzyme";
import * as React from "react";

import { StatBlock } from "../../common/StatBlock";
import { StatBlockComponent } from "./StatBlock";

describe("StatBlock component", () => {
  test("Shows the statblock's name", () => {
    const component = Enzyme.render(
      <StatBlockComponent
        statBlock={{ ...StatBlock.Default(), Name: "Snarglebargle" }}
        displayMode="default"
      />
    );
    const headerText = component.find("h3").text();
    expect(headerText).toEqual("Snarglebargle");
  });

  test("Shows Save DC for a monster when it's set", () => {
    const component = Enzyme.render(
      <StatBlockComponent
        statBlock={{ ...StatBlock.Default(), SaveDC: 15 }}
        displayMode="default"
      />
    );
    expect(component.text()).toContain("Save DC");
    expect(component.text()).toContain("15");
  });

  test("Hides Save DC when it's unset", () => {
    const component = Enzyme.render(
      <StatBlockComponent
        statBlock={{ ...StatBlock.Default() }}
        displayMode="default"
      />
    );
    expect(component.text()).not.toContain("Save DC");
  });

  test("Shows Saves and Skills advantage tags, filtering out entries with no advantage", () => {
    const component = Enzyme.render(
      <StatBlockComponent
        statBlock={{
          ...StatBlock.Default(),
          Saves: [
            { Name: "Int", Advantage: "+" },
            { Name: "Str", Advantage: "" }
          ],
          Skills: [{ Name: "Perception", Advantage: "++" }]
        }}
        displayMode="default"
      />
    );
    expect(component.text()).toContain("Int+");
    expect(component.text()).not.toContain("Str");
    expect(component.text()).toContain("Perception++");
  });
});
