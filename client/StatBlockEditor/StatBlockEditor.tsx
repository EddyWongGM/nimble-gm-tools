import { Field, Form, Formik, FormikProps } from "formik";
import * as _ from "lodash";
import * as moment from "moment";

import * as React from "react";
import { Listable } from "../../common/Listable";
import { StatBlock } from "../../common/StatBlock";
import { probablyUniqueString } from "../../common/Toolbox";
import { Button, SubmitButton } from "../Components/Button";
import { Info } from "../Components/Info";
import { Listing } from "../Library/Listing";
import { ConvertStringsToNumbersWhereNeeded } from "./ConvertStringsToNumbersWhereNeeded";
import { EnumToggle } from "./EnumToggle";
import { IdentityFields } from "./components/IdentityFields";
import {
  abilityScoreField,
  getAnonymizedStatBlockJSON,
  DescriptionField,
  InitiativeField,
  KeywordFields,
  NameAndAdvantageFields,
  NumberField,
  PowerFields,
  ValueAndNotesField
} from "./components/StatBlockEditorFields";
import { TextField } from "./components/TextField";
import { SettingsContext } from "../Settings/SettingsContext";

export type StatBlockEditorTarget =
  | "library"
  | "combatant"
  | "persistentcharacter";

export interface StatBlockEditorProps {
  statBlock: StatBlock;
  onSave: (statBlock: StatBlock) => void;
  onDelete?: () => void;
  onSaveAsCopy?: (statBlock: StatBlock) => void;
  onSaveAsCharacter?: (statBlock: StatBlock) => void;
  onClose: () => void;
  editorTarget: StatBlockEditorTarget;
  currentListings?: Listing<Listable>[];
}

interface StatBlockEditorState {
  editorMode: "standard" | "json";
  renderError?: string;
}

export class StatBlockEditor extends React.Component<
  StatBlockEditorProps,
  StatBlockEditorState
> {
  constructor(props) {
    super(props);
    this.state = { editorMode: "standard" };
  }

  public componentDidCatch(error, info) {
    this.setState({
      editorMode: "json",
      renderError: error.toString()
    });
  }

  public render() {
    if (!this.props.statBlock) {
      return null;
    }

    const header =
      {
        combatant: "Edit Name Statblock",
        library: "Edit Monster Statblock",
        persistentcharacter: "Edit Hero Statblock"
      }[this.props.editorTarget] || "Edit StatBlock";

    const buttons = (
      <>
        <Button
          onClick={this.close}
          fontAwesomeIcon="times"
          tooltip="Close Editor"
        />
        {this.props.onDelete && (
          <Button
            onClick={this.delete}
            fontAwesomeIcon="trash"
            tooltip="Delete StatBlock"
          />
        )}
        <SubmitButton fontAwesomeIcon="save" tooltip="Save Changes" />
      </>
    );

    return (
      <SettingsContext.Consumer>
        {settings => {
          const customFields = settings.StatBlock.CustomFields.map(
            fieldSetting => {
              const existingField = this.props.statBlock.CustomFields?.find(
                f => f.Name === fieldSetting.name
              );
              return (
                existingField || {
                  Name: fieldSetting.name,
                  Content: fieldSetting.defaultValue
                }
              );
            }
          );

          const initialValues = {
            ...this.props.statBlock,
            CustomFields: customFields,
            StatBlockJSON: getAnonymizedStatBlockJSON(this.props.statBlock)
          };

          return (
            <Formik
              onSubmit={this.saveAndClose}
              initialValues={initialValues}
              validate={this.validate}
              validateOnBlur
            >
              {api => (
                <Form
                  className="c-statblock-editor"
                  autoComplete="false"
                  translate="no"
                >
                  <div className="c-statblock-editor__title-row">
                    <h2 className="c-statblock-editor__title">{header}</h2>
                    {buttons}
                  </div>
                  <div className="c-statblock-editor__identity">
                    <IdentityFields
                      formApi={api}
                      allowFolder={
                        this.props.editorTarget === "library" ||
                        this.props.editorTarget === "persistentcharacter"
                      }
                      allowSaveAsCopy={this.props.onSaveAsCopy !== undefined}
                      allowSaveAsCharacter={
                        this.props.onSaveAsCharacter !== undefined
                      }
                      currentListings={this.props.currentListings}
                      setEditorMode={(editorMode: "standard" | "json") =>
                        this.setState({ editorMode })
                      }
                    />
                  </div>
                  {this.state.editorMode == "standard"
                    ? this.fieldEditor(api)
                    : this.jsonEditor(api)}
                  <div className="c-statblock-editor__buttons">{buttons}</div>
                </Form>
              )}
            </Formik>
          );
        }}
      </SettingsContext.Consumer>
    );
  }

  // Built as a flat list, then chunked into pairs of 2 for the 2-column
  // stats layout - so when an optional field (Hit Dice, Wounds) doesn't
  // apply, later fields (notably Initiative) shift up to fill the gap
  // instead of leaving an empty cell and an extra near-empty row below.
  private statFields = (player: string): JSX.Element[][] => {
    const actsInPlayerPhase = player == "player" || player == "companion";

    const fields: JSX.Element[] = [
      <TextField
        key="level"
        label={player == "player" ? "Level" : "Challenge"}
        fieldName="Challenge"
      />
    ];

    if (!actsInPlayerPhase) {
      fields.push(<NumberField key="savedc" label="Save DC" fieldName="SaveDC" />);
    }

    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField key="defense" label="Defense" fieldName="AC" />,
        <ValueAndNotesField key="hp" label="Hit Points" fieldName="HP" />
      );
    } else {
      fields.push(
        <ValueAndNotesField key="hp" label="HP (No Armor)" fieldName="HP" />,
        <ValueAndNotesField
          key="hpmediumarmor"
          label="HP (M Armor)"
          fieldName="HPMediumArmor"
        />,
        <ValueAndNotesField
          key="hpheavyarmor"
          label="HP (H Armor)"
          fieldName="HPHeavyArmor"
        />
      );
    }

    if (player === "legendary") {
      fields.push(
        <ValueAndNotesField
          key="laststagehp"
          label="Last Stage HP"
          fieldName="LastStageHP"
        />
      );
    }

    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField key="mana" label="Mana" fieldName="Mana" />,
        <ValueAndNotesField key="resources" label="Resources" fieldName="Resources" />
      );
    }

    if (player == "player") {
      fields.push(
        <ValueAndNotesField key="hitdice" label="Hit Dice" fieldName="HitDice" />
      );
    }
    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField key="wounds" label="Wounds" fieldName="Wounds" />,
        <InitiativeField key="initiative" />
      );
    }

    const rows: JSX.Element[][] = [];
    for (let i = 0; i < fields.length; i += 2) {
      rows.push(fields.slice(i, i + 2));
    }
    return rows;
  };

  private fieldEditor = (api: FormikProps<any>) => {
    const settings = React.useContext(SettingsContext);
    return (
      <>
        <div className="c-statblock-editor__headers">
          <TextField label="Portrait URL" fieldName="ImageURL" />
          {api.errors.ImageURL && (
            <p className="c-statblock-editor__error">{api.errors.ImageURL}</p>
          )}
          <TextField label="Source" fieldName="Source" />
          <TextField label="Type" fieldName="Type" />
          {this.props.editorTarget == "persistentcharacter" && (
            <EnumToggle
              labelsByOption={{
                "": "Non Player Character",
                player: "Player Character",
                companion: "Companion"
              }}
              fieldName="Player"
            />
          )}
          {(this.props.editorTarget == "library" ||
            this.props.editorTarget == "combatant") && (
            <EnumToggle
              labelsByOption={{
                "": "Normal",
                legendary: "Legendary",
                titan: "Titan"
              }}
              fieldName="Player"
            />
          )}
          {api.values.Player === "legendary" && (
            <Info>
              A Legendary monster's max HP is multiplied by the number of
              heroes already in the encounter, calculated once when it's
              added to the tracker. Add heroes to the encounter first, or
              the multiplier will under-count.
            </Info>
          )}
          {(this.props.editorTarget == "library" ||
            this.props.editorTarget == "combatant") &&
            api.values.Player !== "player" &&
            api.values.Player !== "companion" && (
              <EnumToggle
                labelsByOption={StatBlock.ArmorDisplayNames}
                fieldName="Armor"
              />
            )}
          {(this.props.editorTarget == "library" ||
            this.props.editorTarget == "combatant") &&
            api.values.Player === "" && (
              <TextField label="CR Rating" fieldName="CRRating" />
            )}
        </div>
        {api.values.Player === "player" && (
          <div className="c-statblock-editor__abilityscores">
            {StatBlock.VisibleAbilityNames.map(abilityScoreField)}
          </div>
        )}
        <div className="c-statblock-editor__stats">
          {this.statFields(api.values.Player).map((pair, i) => (
            <div className="c-statblock-editor__stats-row" key={i}>
              {pair}
            </div>
          ))}
        </div>
        {settings.StatBlock.CustomFields.length > 0 && (
          <div className="c-statblock-editor__custom-fields">
            <h2>Custom Fields</h2>
            {settings.StatBlock.CustomFields.map(fieldSetting => {
              const fieldIndex = api.values.CustomFields?.findIndex(
                f => f.Name === fieldSetting.name
              );
              return (
                <TextField
                  key={fieldSetting.name}
                  label={fieldSetting.name}
                  fieldName={`CustomFields[${fieldIndex}].Content`}
                />
              );
            })}
          </div>
        )}
        {api.values.Player !== "player" && api.values.Player !== "companion" && (
          <>
            <div className="c-statblock-editor__saves">
              <NameAndAdvantageFields api={api} modifierType="Saves" />
            </div>
            <div className="c-statblock-editor__skills">
              <NameAndAdvantageFields api={api} modifierType="Skills" />
            </div>
          </>
        )}
        <div className="c-statblock-editor__keywords">
          {[
            { type: "Speed", label: "Speed" },
            { type: "Senses", label: "Senses" },
            { type: "DamageVulnerabilities", label: "Damage Vulnerabilities" },
            { type: "DamageResistances", label: "Damage Resistances" },
            { type: "DamageImmunities", label: "Damage Immunities" },
            { type: "ConditionImmunities", label: "Condition Immunities" },
            { type: "Languages", label: "Languages" }
          ].map(({ type, label }) => (
            <div key={type} className="c-statblock-editor__keyword-group">
              <KeywordFields api={api} keywordType={type} label={label} />
            </div>
          ))}
        </div>
        <div className="c-statblock-editor__powers">
          {[
            { type: "Traits", label: "Traits" },
            { type: "Actions", label: "Actions" },
            // Only clutter the form with Special once the statblock is
            // marked Legendary or Titan, or already has some (e.g. imported
            // from a source that doesn't use this toggle). Field name stays
            // "LegendaryActions" so it keeps matching the stored data shape
            // and shared styling - only the visible label changes, same as
            // Other/MythicActions below.
            ...(api.values.Player === "legendary" ||
            api.values.Player === "titan" ||
            api.values.LegendaryActions?.length > 0
              ? [{ type: "LegendaryActions", label: "Special" }]
              : []),
            // name stays "MythicActions" so the field/className keeps
            // matching the shared styling and stored data shape - only the
            // visible label changes, same as the read-only StatBlock view.
            { type: "MythicActions", label: "Other" }
          ].map(({ type, label }) => (
            <div key={type} className="c-statblock-editor__power-group">
              <PowerFields api={api} powerType={type} label={label} />
            </div>
          ))}
        </div>
        <DescriptionField />
      </>
    );
  };

  private jsonEditor = api => (
    <div className="c-statblock-editor__json-section">
      {this.state.renderError && (
        <p className="c-statblock-editor__error">
          There was a problem with your statblock JSON, falling back to JSON
          editor.
        </p>
      )}
      {api.errors.JSONParseError && (
        <p className="c-statblock-editor__error">{api.errors.JSONParseError}</p>
      )}
      <label className="c-statblock-editor__text">
        <div className="c-statblock-editor__label">JSON</div>
        <Field
          className="c-statblock-editor__json-textarea"
          component="textarea"
          name="StatBlockJSON"
        />
      </label>
    </div>
  );

  private saveAndClose = submittedValues => {
    const { SaveAs, SaveAsCharacter, StatBlockJSON, ...submittedStatBlock } =
      submittedValues;

    let statBlockFromActiveEditor: StatBlock;
    if (this.state.editorMode == "standard") {
      statBlockFromActiveEditor = submittedStatBlock;
    } else {
      statBlockFromActiveEditor = JSON.parse(StatBlockJSON);
    }

    const editedStatBlock: StatBlock = StatBlock.Update({
      ...StatBlock.Default(),
      ...statBlockFromActiveEditor,
      Id: submittedStatBlock.Id,
      Name: submittedStatBlock.Name,
      Path: submittedStatBlock.Path,
      Version: process.env.VERSION || "unknown"
    });

    ConvertStringsToNumbersWhereNeeded(editedStatBlock);

    if (SaveAsCharacter && this.props.onSaveAsCharacter) {
      editedStatBlock.Id = probablyUniqueString();
      this.props.onSaveAsCharacter(editedStatBlock);
    } else if (SaveAs && this.props.onSaveAsCopy) {
      editedStatBlock.Id = probablyUniqueString();
      this.props.onSaveAsCopy(editedStatBlock);
    } else {
      this.props.onSave(editedStatBlock);
    }

    this.props.onClose();
  };

  private close = () => {
    this.props.onClose();
  };

  private delete = () => {
    if (
      this.props.onDelete &&
      confirm(`Delete Statblock for ${this.props.statBlock.Name}?`)
    ) {
      this.props.onDelete();
      this.props.onClose();
    }
  };

  private willOverwriteStatBlock = _.memoize(
    (path: string, name: string) =>
      this.props.currentListings?.some(
        l => l.Meta().Path == path && l.Meta().Name == name
      ),
    (path: string, name: string) => JSON.stringify({ path, name })
  );

  private validate = async values => {
    const errors: any = {};

    if (_.isEmpty(values.Name)) {
      errors.NameMissing = "Error: Name is required.";
    }

    if (!_.isEmpty(values.ImageURL)) {
      try {
        const url = new URL(values.ImageURL);
        // attempt to create img element and load it to see if it's valid
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => reject();
          img.src = url.toString();
        });
      } catch {
        errors.ImageURL = "Error: Portrait URL could not be loaded.";
      }
    }

    if (this.state.editorMode === "json") {
      try {
        JSON.parse(values.StatBlockJSON);
      } catch (e) {
        errors.JSONParseError = e.message;
      }
    }

    if (!values.SaveAs) {
      return errors;
    }

    const path = values.Path || "";
    const name = values.Name || "";

    const originalPath = this.props.statBlock.Path || "";
    const originalName = this.props.statBlock.Name || "";

    if (path === originalPath && name === originalName) {
      errors.PathAndName = "Error: Save as a copy requires a different name.";
    } else if (this.willOverwriteStatBlock(path, name)) {
      errors.PathAndName =
        "Error: This copy will overwrite an existing statblock. Please change the name or folder.";
    }

    return errors;
  };
}
