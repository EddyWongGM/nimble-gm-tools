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
import { getAnonymizedJSON, validateEditedJSON } from "./JsonEditorMode";
import { IdentityFields } from "./components/IdentityFields";
import {
  abilityScoreField,
  DescriptionField,
  HitDiceField,
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
  /** The statblock can't be saved in place (e.g. read-only bundled content) - force the "Save as a copy" toggle on and require a new name. */
  requireSaveAsCopy?: boolean;
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
  private formRef = React.createRef<HTMLFormElement>();

  constructor(props) {
    super(props);
    this.state = { editorMode: "standard" };
  }

  public componentDidMount() {
    // .c-statblock-editor scrolls its own overflow, but it also sits inside
    // ancestor scroll containers (e.g. the tracker's .center-column) that
    // don't remount alongside it and so keep whatever scroll position was
    // left over from before this editor opened - reset both so the editor
    // reliably opens at the top regardless of which container is scrolled.
    if (this.formRef.current) {
      this.formRef.current.scrollTop = 0;
      this.formRef.current.scrollIntoView?.({ block: "start" });
    }
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
            StatBlockJSON: getAnonymizedJSON(this.props.statBlock, [
              "Name",
              "Path",
              "Id"
            ]),
            SaveAs: this.props.requireSaveAsCopy
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
                  ref={this.formRef}
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
                      requireSaveAsCopy={this.props.requireSaveAsCopy}
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
  private statFields = (
    player: string,
    hasLastStand: boolean
  ): JSX.Element[][] => {
    const actsInPlayerPhase = player == "player" || player == "companion";

    const rows: JSX.Element[][] = [];

    const levelField = (
      <TextField
        key="level"
        label={player == "player" ? "Level" : "Challenge"}
        fieldName="Challenge"
      />
    );

    const fields: JSX.Element[] = actsInPlayerPhase ? [levelField] : [];

    // Chunks whatever's accumulated in `fields` so far into rows of 2 and
    // empties it out.
    const flushFieldsIntoRows = () => {
      rows.push(..._.chunk(fields, 2));
      fields.length = 0;
    };

    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField key="defense" label="Defense" fieldName="AC" />,
        <ValueAndNotesField
          key="hp"
          label="Hit Points"
          fieldName="HP"
          hideNotes
        />
      );
    } else {
      // Level/Challenge and Save DC are built as an explicit 3-wide row
      // (with an empty third cell) instead of the generic 2-up chunking, so
      // Save DC lines up in the same column as M Armor in the HP row below.
      // Monster armor tiers likewise read as one HP-by-armor-type row rather
      // than spilling HP (H Armor) onto its own line; their labels drop the
      // redundant "HP" prefix (row context already makes that clear) so
      // they fit on one line at this row's narrower per-field width.
      rows.push([
        levelField,
        <NumberField key="savedc" label="Save DC" fieldName="SaveDC" />,
        <div key="savedc-spacer" />
      ]);
      rows.push([
        <ValueAndNotesField
          key="hp"
          label="No Armor"
          fieldName="HP"
          hideNotes
        />,
        <ValueAndNotesField
          key="hpmediumarmor"
          label="M Armor"
          fieldName="HPMediumArmor"
          hideNotes
        />,
        <ValueAndNotesField
          key="hpheavyarmor"
          label="H Armor"
          fieldName="HPHeavyArmor"
          hideNotes
        />
      ]);
    }

    if (player === "legendary" || (player === "" && hasLastStand)) {
      fields.push(
        <ValueAndNotesField
          key="laststandhp"
          label="Last Stand HP"
          fieldName="LastStandHP"
          hideNotes
        />
      );
    }

    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField
          key="mana"
          label="Mana"
          fieldName="Mana"
          hideNotes
        />,
        <ValueAndNotesField
          key="resources"
          label="Resources"
          fieldName="Resources"
          hideNotes
          startsEmptyFieldName="ResourcesStartEmpty"
        />
      );
    }

    if (player == "player") {
      fields.push(<HitDiceField key="hitdice" />);
    }
    if (actsInPlayerPhase) {
      fields.push(
        <ValueAndNotesField key="wounds" label="Wounds" fieldName="Wounds" hideNotes />,
        <InitiativeField key="initiative" />
      );
    }

    flushFieldsIntoRows();
    return rows;
  };

  private fieldEditor = (api: FormikProps<any>) => {
    const settings = React.useContext(SettingsContext);
    // A Room isn't a monster - none of the combat-mechanic fields below
    // (stats, Saves/Skills, keywords, Traits/Actions/etc.) apply to it, so
    // hide them and lead with a larger Description field instead.
    const isRoom = api.values.Player === "room";
    return (
      <>
        <div className="c-statblock-editor__headers">
          <TextField label="Portrait URL" fieldName="ImageURL" />
          {api.errors.ImageURL && (
            <p className="c-statblock-editor__error">{api.errors.ImageURL}</p>
          )}
          <div className="c-statblock-editor__identity-grid">
            <TextField label="Type" fieldName="Type" />
            <TextField label="Source" fieldName="Source" />
            {(this.props.editorTarget == "library" ||
              this.props.editorTarget == "combatant") && (
              <>
                <div className="c-statblock-editor__type-and-armor">
                  {api.values.Player !== "player" &&
                    api.values.Player !== "companion" &&
                    api.values.Player !== "room" && (
                      <EnumToggle
                        labelsByOption={StatBlock.ArmorDisplayNames}
                        fieldName="Armor"
                      />
                    )}
                  <EnumToggle
                    labelsByOption={{
                      "": "Normal",
                      legendary: "Legendary",
                      titan: "Titan",
                      room: "Room"
                    }}
                    fieldName="Player"
                  />
                  {api.values.Player === "legendary" && (
                    <Info>
                      A Legendary monster's max HP is multiplied by the
                      number of heroes already in the encounter, calculated
                      once when it's added to the tracker. Add heroes to the
                      encounter first, or the multiplier will under-count.
                    </Info>
                  )}
                  {api.values.Player === "" && (
                    <label className="c-statblock-editor__checkbox-label">
                      <Field type="checkbox" name="ScalesWithHeroCount" />
                      Scalable (HP × Hero Count)
                    </label>
                  )}
                  {api.values.Player === "" &&
                    api.values.ScalesWithHeroCount && (
                      <Info>
                        This monster's max HP is multiplied by the number of
                        heroes already in the encounter, calculated once when
                        it's added to the tracker. Add heroes to the
                        encounter first, or the multiplier will under-count.
                      </Info>
                    )}
                  {api.values.Player === "" && (
                    <label className="c-statblock-editor__checkbox-label">
                      <Field type="checkbox" name="ScalesCountWithHeroCount" />
                      Scalable count (copies × Hero Count)
                    </label>
                  )}
                  {api.values.Player === "" &&
                    api.values.ScalesCountWithHeroCount && (
                      <>
                        <NumberField
                          label="Monsters per hero"
                          fieldName="MonstersPerHero"
                        />
                        <Info>
                          This monster is added as multiple copies, scaled by
                          the number of heroes already in the encounter:
                          copies = floor(Monsters per hero × heroes), rounded
                          down, minimum 1. Use 2 for a swarm (2 per hero), 0.5
                          for a tougher threat (1 per 2 heroes). Add heroes to
                          the encounter first, or the count will under-scale.
                        </Info>
                      </>
                    )}
                  {api.values.Player === "" && (
                    <label className="c-statblock-editor__checkbox-label">
                      <Field type="checkbox" name="HasLastStand" />
                      Last Stand (solo boss)
                    </label>
                  )}
                  {api.values.Player === "" && api.values.HasLastStand && (
                    <Info>
                      This monster gets a Legendary-style Last Stand: the
                      first time it would drop to 0 HP, it instead drops to
                      its Last Stand HP and keeps fighting. It's also exempt
                      from forced monster numbering and is judged solo
                      against the party's average level for encounter
                      difficulty, like a boss fight. Unlike Legendary, its
                      HP does not scale with hero count — author it as a
                      fixed number.
                    </Info>
                  )}
                  {api.values.Player === "room" && (
                    <Info>
                      A Room isn't a monster — it's an info card for
                      non-combat content (read-aloud text, GM notes). It
                      won't count toward encounter difficulty and will be
                      hidden from Player View by default. Its HP is not
                      shown.
                    </Info>
                  )}
                  {this.props.editorTarget == "combatant" &&
                    api.values.Player !== "player" &&
                    api.values.Player !== "companion" &&
                    api.values.Player !== "room" && (
                      <Info>
                        This Name's HP was already set for its Armor tier
                        when it entered combat. Changing Armor here won't
                        rescale current or max HP — edit the HP fields below
                        directly if needed.
                      </Info>
                    )}
                </div>
                {api.values.Player === "" && (
                  <TextField label="CR Rating" fieldName="CRRating" />
                )}
              </>
            )}
          </div>
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
        </div>
        {api.values.Player === "player" && (
          <div className="c-statblock-editor__abilityscores">
            {StatBlock.VisibleAbilityNames.map(name =>
              abilityScoreField(name, true)
            )}
          </div>
        )}
        {!isRoom && (
          <div className="c-statblock-editor__stats">
            {this.statFields(api.values.Player, api.values.HasLastStand).map((pair, i) => (
              <div className="c-statblock-editor__stats-row" key={i}>
                {pair}
              </div>
            ))}
          </div>
        )}
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
        {!isRoom &&
          api.values.Player !== "player" &&
          api.values.Player !== "companion" && (
            <>
              <div className="c-statblock-editor__saves">
                <NameAndAdvantageFields api={api} modifierType="Saves" />
              </div>
              <div className="c-statblock-editor__skills">
                <NameAndAdvantageFields api={api} modifierType="Skills" />
              </div>
            </>
          )}
        {!isRoom && (
          <div className="c-statblock-editor__keywords">
            {[
              { type: "Speed", label: "Speed" },
              { type: "Senses", label: "Senses" },
              {
                type: "DamageVulnerabilities",
                label: "Damage Vulnerabilities"
              },
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
        )}
        {!isRoom && (
          <div className="c-statblock-editor__powers">
            {[
              { type: "Traits", label: "Traits" },
              { type: "Actions", label: "Actions" },
              { type: "Reactions", label: "Reactions" },
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
        )}
        <DescriptionField large={isRoom} />
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

    // A Room isn't a monster - normalize Challenge/Armor at save time
    // (rather than live in the form, which would destroy a monster's
    // existing values the moment a GM previews "Room" on the cyclic
    // Player toggle and switches back) so it's excluded from difficulty
    // math (see StatBlock.IsRoomInfo) and doesn't inherit a stale
    // armor-tier HP value through StatBlock.ResolveArmorHP.
    if (StatBlock.IsRoomInfo(editedStatBlock)) {
      editedStatBlock.Challenge = "";
      editedStatBlock.Armor = "";
    }

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
    (path: string, name: string, challenge: string) =>
      this.props.currentListings?.some(
        l =>
          l.Meta().Path == path &&
          l.Meta().Name == name &&
          (l.Meta().FilterDimensions?.Level || "") == challenge
      ),
    (path: string, name: string, challenge: string) =>
      JSON.stringify({ path, name, challenge })
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
      const jsonError = validateEditedJSON(values.StatBlockJSON);
      if (jsonError) {
        errors.JSONParseError = jsonError;
      }
    }

    if (!values.SaveAs) {
      return errors;
    }

    const path = values.Path || "";
    const name = values.Name || "";

    const originalPath = this.props.statBlock.Path || "";
    const originalName = this.props.statBlock.Name || "";

    const challenge = values.Challenge || "";
    const originalChallenge = this.props.statBlock.Challenge || "";

    if (
      path === originalPath &&
      name === originalName &&
      challenge === originalChallenge
    ) {
      errors.PathAndName = "Error: Save as a copy requires a different name.";
    } else if (this.willOverwriteStatBlock(path, name, challenge)) {
      errors.PathAndName =
        "Error: This copy will overwrite an existing statblock. Please change the name or folder.";
    }

    return errors;
  };
}
