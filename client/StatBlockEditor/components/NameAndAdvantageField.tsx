import { ArrayHelpers, Field } from "formik";
import * as React from "react";
import { useDrag } from "react-dnd";
import { useFocusIfEmpty } from "./useFocus";

interface NameAndAdvantageFieldProps {
  arrayHelpers: ArrayHelpers;
  modifierType: string;
  index: number;
  trailingAddButton?: JSX.Element;
}

export function NameAndAdvantageField(props: NameAndAdvantageFieldProps) {
  const nameInput = useFocusIfEmpty();

  const [, drag, preview] = useDrag({
    item: { index: props.index, type: props.modifierType }
  });

  return (
    <div className="inline" ref={preview}>
      <div className="grab-handle fas fa-grip-horizontal" ref={drag} />
      <Field
        type="text"
        className="name"
        name={`${props.modifierType}[${props.index}].Name`}
        innerRef={nameInput}
        autoComplete="off"
      />
      <Field
        component="select"
        className="advantage"
        name={`${props.modifierType}[${props.index}].Advantage`}
      >
        <option value="----">---- Disadvantage x4</option>
        <option value="---">--- Disadvantage x3</option>
        <option value="--">-- Disadvantage x2</option>
        <option value="-">- Disadvantage</option>
        <option value="">Normal</option>
        <option value="+">+ Advantage</option>
        <option value="++">++ Advantage x2</option>
        <option value="+++">+++ Advantage x3</option>
        <option value="++++">++++ Advantage x4</option>
      </Field>
      <span
        className="fa-clickable fa-trash"
        onClick={() => props.arrayHelpers.remove(props.index)}
      />
      {props.trailingAddButton}
    </div>
  );
}
