import { Field, FieldArray, Form, Formik } from "formik";
import * as React from "react";

import { SavedEncounter } from "../../common/SavedEncounter";
import { Button } from "../Components/Button";
import { env } from "../Environment";
import { ListingButton } from "../Library/Components/ListingButton";
import { getAnonymizedJSON, validateEditedJSON } from "./JsonEditorMode";
import { TextField } from "./components/TextField";

type EditorMode = "standard" | "json";

export function SavedEncounterEditor(props: {
  savedEncounter: SavedEncounter;
  onSave: (newSavedEncounter: SavedEncounter) => void;
  onClose: () => void;
}) {
  const [editorMode, setEditorMode] = React.useState<EditorMode>("standard");

  const initialValues = {
    ...props.savedEncounter,
    SavedEncounterJSON: getAnonymizedJSON(props.savedEncounter, [
      "Name",
      "Path",
      "Id"
    ])
  };

  const saveAndClose = submittedValues => {
    const { SavedEncounterJSON, ...submittedSavedEncounter } =
      submittedValues;

    const savedEncounterFromActiveEditor: SavedEncounter =
      editorMode === "standard"
        ? submittedSavedEncounter
        : JSON.parse(SavedEncounterJSON);

    props.onSave({
      ...SavedEncounter.Default(),
      ...savedEncounterFromActiveEditor,
      Id: submittedSavedEncounter.Id,
      Name: submittedSavedEncounter.Name,
      Path: submittedSavedEncounter.Path,
      Version: process.env.VERSION || "unknown"
    });
  };

  const validate = values => {
    const errors: any = {};
    if (editorMode === "json") {
      const jsonError = validateEditedJSON(values.SavedEncounterJSON);
      if (jsonError) {
        errors.JSONParseError = jsonError;
      }
    }
    return errors;
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={saveAndClose}
      validate={validate}
      children={api => {
        return (
          <Form
            className="c-statblock-editor"
            autoComplete="false"
            translate="no"
            onSubmit={api.handleSubmit}
          >
            <div className="c-statblock-editor__title-row">
              <h2 className="c-statblock-editor__title">
                Edit Saved Adventure
              </h2>
              <Button
                onClick={props.onClose}
                tooltip="Cancel"
                fontAwesomeIcon="times"
              />
              <Button
                onClick={api.submitForm}
                tooltip="Save"
                fontAwesomeIcon="save"
              />
            </div>

            <TextField label="Saved Adventure Name" fieldName="Name" />
            <TextField label="Folder" fieldName="Path" />

            <div className="c-statblock-editor__mode-toggle">
              <label>Editor Mode:</label>
              <Button
                onClick={() => setEditorMode("standard")}
                text="Standard"
              />
              <Button
                additionalClassNames="c-statblock-editor__json-button"
                onClick={() => setEditorMode("json")}
                text="JSON"
              />
            </div>

            {editorMode === "standard" ? (
              <>
                {env.HasEpicInitiative && (
                  <TextField
                    label="Background Image URL"
                    fieldName="BackgroundImageUrl"
                  />
                )}
                <FieldArray name="Combatants">
                  {fieldArrayApi => {
                    return api.values.Combatants.map((combatant, index) => (
                      <div className="inline">
                        <ListingButton
                          onClick={() => fieldArrayApi.remove(index)}
                          buttonClass="remove"
                          faClass="times"
                        />
                        {combatant.StatBlock.Name}
                      </div>
                    ));
                  }}
                </FieldArray>
              </>
            ) : (
              <div className="c-statblock-editor__json-section">
                {api.errors.JSONParseError && (
                  <p className="c-statblock-editor__error">
                    {api.errors.JSONParseError}
                  </p>
                )}
                <label className="c-statblock-editor__text">
                  <div className="c-statblock-editor__label">JSON</div>
                  <Field
                    className="c-statblock-editor__json-textarea"
                    component="textarea"
                    name="SavedEncounterJSON"
                  />
                </label>
              </div>
            )}
          </Form>
        );
      }}
    />
  );
}
