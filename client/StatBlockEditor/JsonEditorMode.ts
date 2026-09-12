// Shared by StatBlockEditor and SavedEncounterEditor's optional
// "Standard vs JSON" editor mode. In both, Id/Name/Path (+ Version) always
// come from the always-visible standard fields regardless of which mode is
// active, so those are stripped here rather than round-tripped through the
// JSON textarea, and merged back in by each editor's own save handler.

export function getAnonymizedJSON(
  value: Record<string, unknown>,
  excludeKeys: string[]
): string {
  const clone = { ...value };
  for (const key of excludeKeys) {
    delete clone[key];
  }
  return JSON.stringify(clone, null, 2);
}

// Returns an error message if the text isn't valid JSON, undefined otherwise.
export function validateEditedJSON(jsonText: string): string | undefined {
  try {
    JSON.parse(jsonText);
    return undefined;
  } catch (e) {
    return e.message;
  }
}
