export function interfacePriorityClass(
  centerColumnView: string,
  librariesVisible: boolean,
  hasPrompt: boolean,
  isACombatantSelected: boolean,
  encounterState: "active" | "inactive"
) {
  if (
    centerColumnView === "statblockeditor" ||
    centerColumnView === "spelleditor"
  ) {
    if (librariesVisible) {
      return "show-center-left-right";
    }
    return "show-center-right-left";
  }

  // A pending prompt (e.g. the privacy policy prompt, shown by default
  // alongside LibrariesVisible's own true-by-default state) must win over
  // the library pane - otherwise it renders in a center column that's
  // hidden at narrow widths, with no way to reach or dismiss it.
  if (hasPrompt) {
    if (isACombatantSelected) {
      return "show-center-right-left";
    }
    return "show-center-left-right";
  }

  if (librariesVisible) {
    return "show-left-center-right";
  }

  if (isACombatantSelected) {
    return "show-right-center-left";
  }

  if (encounterState == "active") {
    return "show-center-left-right";
  }

  return "show-center-right-left";
}
