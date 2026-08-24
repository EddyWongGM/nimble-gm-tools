import Tippy from "@tippyjs/react";
import * as React from "react";

export function Tabs<TKey extends string>(props: {
  optionNamesById: Record<TKey, string>;
  optionIconsById?: Partial<Record<TKey, string>>;
  selected?: TKey | string;
  onChoose: (option: TKey) => void;
}) {
  const buttonElements = Object.keys(props.optionNamesById).map(
    (key: TKey, i) => {
      const isSelected =
        props.selected == props.optionNamesById[key] || props.selected == key;
      const icon = props.optionIconsById?.[key];
      const button = (
        <button
          type="button"
          key={icon ? undefined : key}
          className={isSelected ? "c-tab s-selected" : "c-tab"}
          onClick={() => props.onChoose(key)}
        >
          {icon ? (
            <span className={`fas fa-${icon}`} />
          ) : (
            props.optionNamesById[key]
          )}
        </button>
      );

      return icon ? (
        <Tippy key={key} content={props.optionNamesById[key]}>
          {button}
        </Tippy>
      ) : (
        button
      );
    }
  );

  return <div className="c-tabs">{buttonElements}</div>;
}
