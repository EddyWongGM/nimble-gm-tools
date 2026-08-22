import * as Enzyme from "enzyme";
import * as React from "react";

import { InventoryDisplayNotice } from "./InventoryDisplayNotice";

describe("InventoryDisplayNotice", () => {
  test("shows the combatant's name and a checked checkbox", () => {
    const notice = Enzyme.shallow(
      <InventoryDisplayNotice combatantName="Aria" onDismiss={jest.fn()} />
    );

    expect(notice.text()).toContain("Aria");
    expect(notice.find('input[type="checkbox"]').prop("checked")).toBe(true);
  });

  test("unchecking the checkbox calls onDismiss", () => {
    const onDismiss = jest.fn();
    const notice = Enzyme.shallow(
      <InventoryDisplayNotice combatantName="Aria" onDismiss={onDismiss} />
    );

    notice.find('input[type="checkbox"]').simulate("change");

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
