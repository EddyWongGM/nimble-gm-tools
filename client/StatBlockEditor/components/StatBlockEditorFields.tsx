import { ArrayHelpers, Field, FormikProps, useField } from "formik";
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

// Ctrl/Cmd+B/I/U toggle these markers around the current selection, matching
// the shortcuts authors expect from other text editors - TextEnricher
// already renders "**bold**"/"*italic*" via CommonMark and "<u>...</u>"
// via its sanitize allowlist.
const formatShortcuts: Record<string, { open: string; close: string }> = {
  b: { open: "**", close: "**" },
  i: { open: "*", close: "*" },
  u: { open: "<u>", close: "</u>" }
};

function toggleWrapMarkers(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  open: string,
  close: string
): { newValue: string; newStart: number; newEnd: number } {
  const before = value.slice(
    Math.max(0, selectionStart - open.length),
    selectionStart
  );
  const after = value.slice(selectionEnd, selectionEnd + close.length);
  const selected = value.slice(selectionStart, selectionEnd);

  if (before === open && after === close) {
    // Selection is already wrapped by surrounding markers - remove them.
    return {
      newValue:
        value.slice(0, selectionStart - open.length) +
        selected +
        value.slice(selectionEnd + close.length),
      newStart: selectionStart - open.length,
      newEnd: selectionEnd - open.length
    };
  }

  if (
    selected.length >= open.length + close.length &&
    selected.startsWith(open) &&
    selected.endsWith(close)
  ) {
    // The markers themselves were part of the selection - remove them.
    const stripped = selected.slice(open.length, selected.length - close.length);
    return {
      newValue:
        value.slice(0, selectionStart) + stripped + value.slice(selectionEnd),
      newStart: selectionStart,
      newEnd: selectionStart + stripped.length
    };
  }

  return {
    newValue:
      value.slice(0, selectionStart) +
      open +
      selected +
      close +
      value.slice(selectionEnd),
    newStart: selectionStart + open.length,
    newEnd: selectionEnd + open.length
  };
}

export const DescriptionField = (props: { large?: boolean }) => {
  const [field, , helpers] = useField("Description");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const shortcut = formatShortcuts[e.key.toLowerCase()];
    if (!(e.ctrlKey || e.metaKey) || !shortcut) {
      return;
    }
    e.preventDefault();

    const textarea = e.currentTarget;
    const { newValue, newStart, newEnd } = toggleWrapMarkers(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      shortcut.open,
      shortcut.close
    );
    helpers.setValue(newValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = newStart;
      textarea.selectionEnd = newEnd;
    });
  };

  return (
    <label className="c-statblock-editor__description">
      <div className="c-statblock-editor__label">Description</div>
      <div className="inline">
        <textarea
          className={
            "c-statblock-editor__textarea" +
            (props.large ? " c-statblock-editor__textarea--large" : "")
          }
          name="Description"
          value={field.value ?? ""}
          onChange={e => helpers.setValue(e.target.value)}
          onBlur={field.onBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </label>
  );
};

