import { ArrayHelpers, Field, FormikProps } from "formik";
import * as React from "react";

import { StatBlock } from "../../../common/StatBlock";
import { Info } from "../../Components/Info";
import { KeywordField } from "./KeywordField";
import { NameAndAdvantageField } from "./NameAndAdvantageField";
import { PowerField } from "./PowerField";
import { SortableList } from "./SortableList";

type FormApi = FormikProps<any>;

export const ValueAndNotesField = (props: {
  label: string;
  fieldName: string;
  hideNotes?: boolean;
  startsEmptyFieldName?: string;
}) => (
  <label className="c-statblock-editor__text">
    <span className="c-statblock-editor__label">{props.label}</span>
    <div className="inline">
      <Field
        type="number"
        className="value"
        name={`${props.fieldName}.Value`}
      />
      {!props.hideNotes && (
        <Field
          type="text"
          className="notes"
          name={`${props.fieldName}.Notes`}
          autoComplete="off"
        />
      )}
      {props.startsEmptyFieldName && (
        <label className="c-statblock-editor__checkbox-label">
          <Field type="checkbox" name={props.startsEmptyFieldName} />
          Starts at 0
        </label>
      )}
    </div>
  </label>
);

const HitDieSizes = ["d4", "d6", "d8", "d10", "d12"];

export const HitDiceField = () => (
  <label className="c-statblock-editor__text">
    <span className="c-statblock-editor__label">Hit Dice</span>
    <div className="inline">
      <Field type="number" className="value" name="HitDice.Value" />
      <Field
        component="select"
        className="c-statblock-editor__hitdice-size"
        name="HitDice.Notes"
      >
        <option value="">-</option>
        {HitDieSizes.map(size => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </Field>
    </div>
  </label>
);

export const NumberField = (props: { label: string; fieldName: string }) => (
  <label className="c-text-field inline">
    <div className="label">{props.label}</div>
    <Field type="number" name={props.fieldName} autoComplete="off" />
  </label>
);

export const InitiativeField = () => (
  <div className="c-statblock-editor__text">
    <label className="c-statblock-editor__label" htmlFor="InitiativeModifier">
      Initiative Modifier
      <Info>Additional modifier that stacks with Dexterity bonus</Info>
    </label>
    <div className="inline">
      <Field
        type="number"
        className="c-field__value"
        id="InitiativeModifier"
        name="InitiativeModifier"
      />
      <label className="c-statblock-editor__initiative-special-roll">
        <Field component="select" name="InitiativeSpecialRoll">
          <option value="">-</option>
          <option value="advantage">Roll with Advantage</option>
          <option value="disadvantage">Roll with Disadvantage</option>
          <option value="take-ten">Take 10</option>
        </Field>
      </label>
    </div>
  </div>
);

export const abilityScoreField = (
  abilityName: string,
  showSaveAdvantage?: boolean
) => (
  <div key={abilityName} className="c-statblock-editor__ability">
    <div className="c-statblock-editor__ability-score">
      <label className="c-statblock-editor__label" htmlFor={`ability-${abilityName}`}>
        {StatBlock.AbilityDisplayNames[abilityName] || abilityName}
      </label>
      <Field
        type="number"
        id={`ability-${abilityName}`}
        name={`Abilities.${abilityName}`}
      />
    </div>
    {showSaveAdvantage && (
      <Field
        component="select"
        className="c-statblock-editor__save-advantage"
        name={`SaveAdvantages.${abilityName}`}
        title="Save Advantage"
      >
        <option value="">Normal</option>
        <option value="-">Disadvantage</option>
        <option value="+">Advantage</option>
      </Field>
    )}
  </div>
);

export const NameAndAdvantageFields = (props: {
  api: FormApi;
  modifierType: string;
}) => {
  return (
    <SortableList
      api={props.api}
      listType={props.modifierType}
      makeComponent={(
        index: number,
        arrayHelpers: ArrayHelpers,
        trailingAddButton?: JSX.Element
      ) => (
        <NameAndAdvantageField
          key={index}
          arrayHelpers={arrayHelpers}
          modifierType={props.modifierType}
          index={index}
          trailingAddButton={trailingAddButton}
        />
      )}
      makeNew={() => ({ Name: "", Advantage: "" })}
    />
  );
};

export const KeywordFields = (props: {
  api: FormApi;
  keywordType: string;
  label?: string;
}) => {
  return (
    <SortableList
      api={props.api}
      listType={props.keywordType}
      label={props.label}
      makeComponent={(
        index: number,
        arrayHelpers: ArrayHelpers,
        trailingAddButton?: JSX.Element
      ) => (
        <KeywordField
          key={index}
          arrayHelpers={arrayHelpers}
          keywordType={props.keywordType}
          index={index}
          trailingAddButton={trailingAddButton}
        />
      )}
      makeNew={() => ""}
    />
  );
};

export function PowerFields(props: {
  api: FormApi;
  powerType: string;
  label?: string;
}) {
  return (
    <SortableList
      api={props.api}
      listType={props.powerType}
      label={props.label}
      makeComponent={(
        index: number,
        arrayHelpers: ArrayHelpers,
        trailingAddButton?: JSX.Element
      ) => (
        <PowerField
          key={index}
          remove={arrayHelpers.remove}
          move={arrayHelpers.move}
          powerType={props.powerType}
          index={index}
          trailingAddButton={trailingAddButton}
        />
      )}
      makeNew={() => ({ Name: "", Content: "", Usage: "" })}
    />
  );
}

export const DescriptionField = () => (
  <label className="c-statblock-editor__description">
    <div className="c-statblock-editor__label">Description</div>
    <div className="inline">
      <Field
        className="c-statblock-editor__textarea"
        component="textarea"
        name="Description"
      />
    </div>
  </label>
);

export const getAnonymizedStatBlockJSON = (statBlock: StatBlock) => {
  const { Name, Path, Id, ...anonymizedStatBlock } = statBlock;
  return JSON.stringify(anonymizedStatBlock, null, 2);
};
