import * as React from "react";

import { Formik, Form, useFormikContext } from "formik";
import { Listable } from "../../common/Listable";
import { Spell } from "../../common/Spell";
import { probablyUniqueString } from "../../common/Toolbox";
import { useState, useRef } from "react";
import { Button, SubmitButton } from "../Components/Button";
import { Listing } from "../Library/Listing";
import { Toggle } from "../Settings/components/Toggle";
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

  return (
    <Formik
      onSubmit={submittedValues => {
        let spell: Spell;
        if (editorMode === "standard") {
          const { AllClasses, SaveAs, ...standardSpell } = submittedValues;

          standardSpell.Classes = AllClasses.split(",").map(c => c.trim());

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
          {editorMode === "standard" && <StandardEditor />}
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
  const { values } = useFormikContext<{ EntryType: "spell" | "rule" }>();
  const isRule = values.EntryType === "rule";

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
            <TextField label="Tier" fieldName="Level" />
            <TextField label="Classes" fieldName="AllClasses" />
            <div className="c-spell-editor__ritual">
              <Toggle fieldName="Ritual">Ritual</Toggle>
            </div>
          </>
        )}
      </div>
      {!isRule && (
        <div className="c-statblock-editor__headers">
          <TextField label="Casting Time" fieldName="CastingTime" />
          <TextField label="Range" fieldName="Range" />
          <TextField label="Duration" fieldName="Duration" />
          <TextField label="Components" fieldName="Components" />
        </div>
      )}
      <DescriptionField />
    </>
  );
}
