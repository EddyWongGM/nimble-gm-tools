import { Field, FieldProps } from "formik";
import * as _ from "lodash";
import * as React from "react";
import {
  SavedScene,
  SceneImageFit,
  SCENE_LIBRARY_SOFT_CAP
} from "../../common/PlayerViewSettings";
import { probablyUniqueString } from "../../common/Toolbox";
import { SubmitButton } from "../Components/Button";
import { EnumToggle } from "../StatBlockEditor/EnumToggle";
import { AutocompleteTextInput } from "../StatBlockEditor/components/AutocompleteTextInput";
import { PromptProps } from "./PendingPrompts";

const FIT_LABELS: Record<SceneImageFit, string> = {
  cover: "Fill Screen (may crop)",
  contain: "Fit Whole Image (may letterbox)"
};

interface SaveScenePromptModel {
  Name: string;
  ImageUrl: string;
  Path: string;
  Fit: SceneImageFit;
  SaveMode: "update" | "copy";
}

function SaveScenePromptComponent(props: {
  showSoftCapWarning: boolean;
  autocompletePaths: string[];
  showSaveAsCopy: boolean;
}) {
  return (
    <>
      <div className="p-save-scene">
        {props.showSoftCapWarning && (
          <p className="p-save-scene__warning">
            {`You have ${SCENE_LIBRARY_SOFT_CAP}+ saved scenes. Consider deleting ones you no longer need to keep the list easy to browse.`}
          </p>
        )}
        <label>
          <div className="p-save-scene__label">Scene Name</div>
          <Field
            name="Name"
            className="response"
            type="text"
            autoComplete="off"
          />
        </label>
        <label>
          <div className="p-save-scene__label">Image URL</div>
          <Field name="ImageUrl" type="text" autoComplete="off" />
        </label>
        <Field name="ImageUrl">
          {(fieldApi: FieldProps) =>
            fieldApi.form.errors.ImageUrl ? (
              <p className="p-save-scene__error">
                {fieldApi.form.errors.ImageUrl as string}
              </p>
            ) : null
          }
        </Field>
        <label>
          <div className="p-save-scene__label">Folder</div>
          <AutocompleteTextInput
            fieldName="Path"
            options={props.autocompletePaths}
          />
        </label>
        <label>
          <div className="p-save-scene__label">Fit</div>
          <EnumToggle fieldName="Fit" labelsByOption={FIT_LABELS} />
        </label>
      </div>
      <div className="p-save-scene__submit-buttons">
        <SubmitButton />
        {props.showSaveAsCopy && (
          <SubmitButton
            text="Save as Copy"
            fontAwesomeIcon="clone"
            tooltip="Save these fields as a new scene, leaving the original untouched"
            submitIntent={["SaveMode", "copy"]}
          />
        )}
      </div>
    </>
  );
}

function isBlankNewScene(
  values: Pick<SaveScenePromptModel, "Name" | "ImageUrl">,
  existingScene: SavedScene | null
): boolean {
  return (
    !existingScene && !values.Name.trim() && !values.ImageUrl.trim()
  );
}

export async function validateSceneFields(values: SaveScenePromptModel) {
  const errors: Partial<Record<keyof SaveScenePromptModel, string>> = {};

  if (_.isEmpty(values.Name?.trim())) {
    errors.Name = "Error: Name is required.";
  }

  if (_.isEmpty(values.ImageUrl?.trim())) {
    errors.ImageUrl = "Error: Image URL is required.";
  } else {
    try {
      // Attempt to load the URL as an image to see if it's valid. No `new
      // URL()` base-parsing step here (unlike StatBlockEditor's portrait
      // validation) - a relative path like "/scenes/tavern.png" is a valid
      // <img src>, resolved against the page's own origin, but throws from
      // `new URL()` with no base argument.
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject();
        img.src = values.ImageUrl.trim();
      });
    } catch {
      errors.ImageUrl = "Error: Image URL could not be loaded.";
    }
  }

  return errors;
}

export function SaveScenePrompt(
  existingScene: SavedScene | null,
  saveScene: (scene: SavedScene) => void,
  currentLibrarySize: number,
  autocompletePaths: string[]
): PromptProps<SaveScenePromptModel> {
  return {
    initialValues: {
      Name: existingScene?.Name || "",
      ImageUrl: existingScene?.ImageUrl || "",
      Path: existingScene?.Path || "",
      Fit: existingScene?.Fit || "cover",
      SaveMode: "update"
    },
    autoFocusSelector: ".response",
    validate: (values: SaveScenePromptModel) =>
      isBlankNewScene(values, existingScene) ? {} : validateSceneFields(values),
    children: (
      <SaveScenePromptComponent
        showSoftCapWarning={
          !existingScene && currentLibrarySize >= SCENE_LIBRARY_SOFT_CAP
        }
        autocompletePaths={autocompletePaths}
        showSaveAsCopy={!!existingScene}
      />
    ),
    onSubmit: (model: SaveScenePromptModel) => {
      if (isBlankNewScene(model, existingScene)) {
        // Nothing was ever filled in - treat the submit button as Cancel
        // instead of blocking on required-field errors.
        return true;
      }

      const keepExistingId = existingScene && model.SaveMode !== "copy";
      saveScene({
        Id: keepExistingId ? existingScene.Id : probablyUniqueString(),
        Name: model.Name.trim(),
        ImageUrl: model.ImageUrl.trim(),
        Path: model.Path.trim(),
        Fit: model.Fit
      });
      return true;
    }
  };
}
