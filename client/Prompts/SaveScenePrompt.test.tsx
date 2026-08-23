import { SavedScene } from "../../common/PlayerViewSettings";
import { SaveScenePrompt, validateSceneFields } from "./SaveScenePrompt";

class SucceedingImage {
  onload: () => void;
  onerror: () => void;
  set src(_value: string) {
    this.onload();
  }
}

class FailingImage {
  onload: () => void;
  onerror: () => void;
  set src(_value: string) {
    this.onerror();
  }
}

describe("validateSceneFields", () => {
  const originalImage = global.Image;

  beforeEach(() => {
    global.Image = SucceedingImage as any;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  test("requires a name", async () => {
    const errors = await validateSceneFields({
      Name: "",
      ImageUrl: "http://example.com/scene.png",
      Path: "",
      Fit: "cover",
      SaveMode: "update"
    });

    expect(errors.Name).toBeTruthy();
  });

  test("requires an image URL", async () => {
    const errors = await validateSceneFields({
      Name: "Tavern",
      ImageUrl: "",
      Path: "",
      Fit: "cover",
      SaveMode: "update"
    });

    expect(errors.ImageUrl).toBeTruthy();
  });

  test("rejects an image URL that fails to load", async () => {
    global.Image = FailingImage as any;

    const errors = await validateSceneFields({
      Name: "Tavern",
      ImageUrl: "http://example.com/broken.png",
      Path: "",
      Fit: "cover",
      SaveMode: "update"
    });

    expect(errors.ImageUrl).toBeTruthy();
  });

  test("accepts a name and an image URL that loads successfully", async () => {
    const errors = await validateSceneFields({
      Name: "Tavern",
      ImageUrl: "http://example.com/scene.png",
      Path: "",
      Fit: "cover",
      SaveMode: "update"
    });

    expect(errors.Name).toBeFalsy();
    expect(errors.ImageUrl).toBeFalsy();
  });

  test("accepts a relative, locally-hosted image path (no scheme/host)", async () => {
    const errors = await validateSceneFields({
      Name: "Tavern",
      ImageUrl: "/scenes/toa/LV2_Cellar/Book.jpg",
      Path: "",
      Fit: "cover",
      SaveMode: "update"
    });

    expect(errors.ImageUrl).toBeFalsy();
  });
});

describe("SaveScenePrompt", () => {
  const existingScene: SavedScene = {
    Id: "scene-1",
    Name: "Cellar Entrance",
    ImageUrl: "http://example.com/cellar.png",
    Path: "Tomb of Annihilation/LV 2 Cellar",
    Fit: "cover"
  };

  test("Add Scene (no existing scene) does not offer Save as Copy", () => {
    const prompt = SaveScenePrompt(null, jest.fn(), 0, []);

    expect((prompt.children as any).props.showSaveAsCopy).toBe(false);
  });

  test("Edit Scene (existing scene) offers Save as Copy", () => {
    const prompt = SaveScenePrompt(existingScene, jest.fn(), 0, []);

    expect((prompt.children as any).props.showSaveAsCopy).toBe(true);
  });

  test("submitting normally on an existing scene updates it in place (keeps its Id)", () => {
    const saveScene = jest.fn();
    const prompt = SaveScenePrompt(existingScene, saveScene, 0, []);

    prompt.onSubmit({ ...prompt.initialValues, Name: "Renamed" });

    expect(saveScene).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "scene-1", Name: "Renamed" })
    );
  });

  test("submitting with SaveMode 'copy' creates a new scene with a different Id", () => {
    const saveScene = jest.fn();
    const prompt = SaveScenePrompt(existingScene, saveScene, 0, []);

    prompt.onSubmit({
      ...prompt.initialValues,
      Name: "Cellar Entrance (Alt)",
      SaveMode: "copy"
    });

    const savedScene = saveScene.mock.calls[0][0];
    expect(savedScene.Id).not.toBe("scene-1");
    expect(savedScene.Name).toBe("Cellar Entrance (Alt)");
    // The folder carries over, so duplicating within the same folder needs
    // no retyping.
    expect(savedScene.Path).toBe("Tomb of Annihilation/LV 2 Cellar");
  });

  test("does not mutate the original scene when saving a copy", () => {
    const saveScene = jest.fn();
    const prompt = SaveScenePrompt(existingScene, saveScene, 0, []);

    prompt.onSubmit({
      ...prompt.initialValues,
      Name: "Different Name",
      SaveMode: "copy"
    });

    expect(existingScene.Name).toBe("Cellar Entrance");
  });

  describe("blank Add Scene form acts as Cancel", () => {
    test("validate returns no errors for an untouched Add Scene form", async () => {
      const prompt = SaveScenePrompt(null, jest.fn(), 0, []);

      const errors = await prompt.validate(prompt.initialValues);

      expect(errors).toEqual({});
    });

    test("submitting an untouched Add Scene form closes without saving anything", () => {
      const saveScene = jest.fn();
      const prompt = SaveScenePrompt(null, saveScene, 0, []);

      const shouldClose = prompt.onSubmit(prompt.initialValues);

      expect(shouldClose).toBe(true);
      expect(saveScene).not.toHaveBeenCalled();
    });

    test("a partially filled Add Scene form still validates normally", async () => {
      const prompt = SaveScenePrompt(null, jest.fn(), 0, []);

      const errors = await prompt.validate({
        ...prompt.initialValues,
        Name: "Tavern"
      });

      expect(errors.ImageUrl).toBeTruthy();
    });

    test("an untouched Edit Scene form still validates normally (blank-cancel is Add-only)", async () => {
      const prompt = SaveScenePrompt(
        { ...existingScene, Name: "", ImageUrl: "" },
        jest.fn(),
        0,
        []
      );

      const errors = await prompt.validate(prompt.initialValues);

      expect(errors.Name).toBeTruthy();
      expect(errors.ImageUrl).toBeTruthy();
    });
  });
});
