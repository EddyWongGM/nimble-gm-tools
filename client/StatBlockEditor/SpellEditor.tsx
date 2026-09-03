import * as React from "react";

import { Formik, Form, useFormikContext } from "formik";
import { Listable } from "../../common/Listable";
import { Spell } from "../../common/Spell";
import { probablyUniqueString } from "../../common/Toolbox";
import { useState, useRef } from "react";
import { Button, SubmitButton } from "../Components/Button";
import { Listing } from "../Library/Listing";
import { SpellDetails } from "../Library/Components/SpellDetails";
import { EnumToggle } from "./EnumToggle";
import { DescriptionField } from "./components/StatBlockEditorFields";
import { TextField } from "./components/TextField";
import { IdentityFields } from "./components/IdentityFields";

export type SpellEditorProps = {
  spell: Spell;
  onSave: (newSpell: Spell) => void;
  onDelete: (id: string) => void;
  onSaveAsCopy?: (newSpell: Spell) => void;
  onClose: () => void;
  currentListings?: Listing<Listable>[];
};

export function SpellEditor(props: SpellEditorProps) {
  const [editorMode, setEditorMode] = useState<"standard" | "json">("standard");
  const jsonEditor = useRef<HTMLTextAreaElement>(null);

  if (!props.spell) {
    return null;
  }

  const formValues = {
    ...props.spell,
    EntryType: props.spell.EntryType || "spell",
    AllClasses: props.spell.Classes.join(", "),
    SaveAs: false
  };

  const validate = (values: typeof formValues) => {
    const errors: { PathAndName?: string } = {};

    if (!values.SaveAs) {
      return errors;
    }

    const path = values.Path || "";
    const name = values.Name || "";
    const originalPath = props.spell.Path || "";
    const originalName = props.spell.Name || "";

    if (path === originalPath && name === originalName) {
      errors.PathAndName = "Error: Save as a copy requires a different name.";
    } else if (
      props.currentListings?.some(
        l => l.Meta().Path === path && l.Meta().Name === name
      )
    ) {
      errors.PathAndName =
        "Error: This copy will overwrite an existing entry. Please change the name or folder.";
    }

    return errors;
  };

  return (
    <Formik
      validate={validate}
      onSubmit={submittedValues => {
        let spell: Spell;
        if (editorMode === "standard") {
          const { AllClasses, SaveAs, ...standardSpell } = submittedValues;

          standardSpell.Classes = AllClasses.split(",").map(c => c.trim());
          standardSpell.Tier = castToNumberOrZero(standardSpell.Tier);
          standardSpell.Actions = castToNumberOrZero(standardSpell.Actions);

          spell = standardSpell;
        } else {
          const parsedSpellFromJSON = JSON.parse(jsonEditor.current?.value);
          spell = {
            ...Spell.Default(),
            ...parsedSpellFromJSON
          };
        }

        if (submittedValues.SaveAs && props.onSaveAsCopy) {
          spell.Id = probablyUniqueString();
          props.onSaveAsCopy(spell);
        } else {
          props.onSave(spell);
        }

        props.onClose();
      }}
      initialValues={formValues}
    >
      {api => (
        <Form autoComplete="false" className="spell-editor" translate="no">
          <div className="c-statblock-editor__title-row">
            <h2 className="c-statblock-editor__title">Edit Entry</h2>
            {buttons(props)}
          </div>
          <div className="c-statblock-editor__identity">
            <IdentityFields
              formApi={api}
              allowFolder
              allowSaveAsCopy={props.onSaveAsCopy !== undefined}
              allowSaveAsCharacter={false}
              currentListings={props.currentListings}
              setEditorMode={setEditorMode}
            />
          </div>
          {editorMode === "standard" && (
            <div className="c-spell-editor__body">
              <div className="c-spell-editor__fields">
                <StandardEditor />
              </div>
              <SpellEditorPreview />
            </div>
          )}
          {editorMode === "json" && (
            <textarea
              className="json-editor"
              spellCheck={false}
              ref={jsonEditor}
              defaultValue={JSON.stringify(props.spell, null, 2)}
            />
          )}
          <div className="buttons">{buttons(props)}</div>
        </Form>
      )}
    </Formik>
  );
}

function buttons(props: SpellEditorProps) {
  return (
    <>
      <Button
        tooltip="Cancel and revert entry"
        fontAwesomeIcon="times"
        onClick={props.onClose}
      />
      <Button
        tooltip="Delete entry"
        fontAwesomeIcon="trash"
        onClick={() => {
          if (confirm("Delete Entry?")) {
            props.onDelete(props.spell.Id);
            props.onClose();
          }
        }}
      />
      <SubmitButton tooltip="Save changes to entry" fontAwesomeIcon="save" />
    </>
  );
}

function StandardEditor() {
  const { values } = useFormikContext<{ EntryType: "spell" | "rule"; Tier: any }>();
  const isRule = values.EntryType === "rule";
  const isCantrip = castToNumberOrZero(values.Tier) === 0;

  return (
    <>
      <div className="c-statblock-editor__headers">
        <EnumToggle
          labelsByOption={{ spell: "Spell", rule: "Rule" }}
          fieldName="EntryType"
        />
        <TextField label="Source" fieldName="Source" />
        {!isRule && (
          <>
            <TextField label="School" fieldName="School" />
            <div className="c-spell-editor__small-fields">
              <TextField label="Tier" fieldName="Tier" />
              <TextField label="Actions" fieldName="Actions" />
            </div>
            <TextField label="Cast Condition" fieldName="CastCondition" />
            <div className="c-spell-editor__distance">
              <EnumToggle
                labelsByOption={{ Range: "Range", Reach: "Reach" }}
                fieldName="DistanceType"
              />
              <TextField label="" fieldName="Distance" />
            </div>
          </>
        )}
      </div>
      <DescriptionField />
      {!isRule && (
        <TextField
          label={isCantrip ? "High Levels" : "Upcast"}
          fieldName="Upcast"
        />
      )}
    </>
  );
}

function SpellEditorPreview() {
  const { values } = useFormikContext<Record<string, any>>();

  const spell: Spell = {
    ...Spell.Default(),
    ...values,
    Tier: castToNumberOrZero(values.Tier),
    Actions: castToNumberOrZero(values.Actions)
  };

  return (
    <div className="spell-preview">
      <SpellDetails Spell={spell} />
    </div>
  );
}

function castToNumberOrZero(value: any) {
  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? 0 : parsedValue;
}
