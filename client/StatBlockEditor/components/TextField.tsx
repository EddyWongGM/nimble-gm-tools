import { Field } from "formik";
import * as React from "react";

export const TextField = (props: { label: string; fieldName: string }) => (
  <label className="c-text-field inline">
    <div className="label">{props.label}</div>
    <Field type="text" name={props.fieldName} autoComplete="off" />
  </label>
);

// Same label/field layout as TextField, styled by the same .c-text-field
// rules, so a dropdown lines up with the text/number fields around it
// instead of needing its own one-off styling (unlike the Settings dialog's
// Dropdown component, which is only styled inside .settings).
export const SelectField = (props: {
  label: string;
  fieldName: string;
  options: string[];
}) => (
  <label className="c-text-field inline">
    <div className="label">{props.label}</div>
    <Field component="select" name={props.fieldName}>
      {props.options.map(option => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </Field>
  </label>
);
