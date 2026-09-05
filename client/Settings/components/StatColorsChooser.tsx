import { Field, FieldProps } from "formik";
import * as React from "react";
import { ColorResult, SketchPicker } from "react-color";
import { STAT_COLOR_CSS_VARS, StatColorField } from "../../PlayerView/CSSFrom";
import { Button } from "../../Components/Button";
import { ColorBlock } from "./ColorBlock";

const STAT_LABELS: Record<StatColorField, string> = {
  hpIconColor: "HP Icon",
  manaColor: "Mana",
  resourcesColor: "Resources",
  hitDiceColor: "Hit Dice",
  woundsColor: "Wounds",
  inventoryColor: "Inventory",
  goldColor: "Gold"
};

/** The color a stat's row shows before the GM has picked anything - today's
 * fixed identity color for that stat, read live off the page so it's
 * already theme-correct (light/dark) with no hardcoded hex to keep in sync.
 * Purely a display default: nothing is written to settings until the GM
 * actually changes a color, so anyone who never touches a row keeps
 * tracking the shipped default if it's ever changed later. */
function currentFixedDefault(cssVar: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
}

interface StatColorsChooserState {
  selectedStat: StatColorField;
}

export class StatColorsChooser extends React.Component<
  {},
  StatColorsChooserState
> {
  constructor(props: {}) {
    super(props);
    this.state = { selectedStat: "manaColor" };
  }

  public render() {
    const selectedEntry = STAT_COLOR_CSS_VARS.find(
      ([field]) => field === this.state.selectedStat
    );
    const selectedCssVar = selectedEntry ? selectedEntry[1] : "";

    return (
      <div className="c-styles-chooser-colors">
        <div className="c-styles-chooser-slot-chooser">
          <h4>Stat Colors</h4>
          {STAT_COLOR_CSS_VARS.map(([field, cssVar]) =>
            this.getLabelAndColorBlock(STAT_LABELS[field], field, cssVar)
          )}
        </div>
        <Field name={"PlayerView.CustomStyles." + this.state.selectedStat}>
          {(fieldProps: FieldProps) => (
            <div className="c-styles-chooser-color-wheel">
              <SketchPicker
                presetColors={[]}
                color={fieldProps.field.value || currentFixedDefault(selectedCssVar)}
                onChangeComplete={color =>
                  this.handleChangeComplete(color, fieldProps)
                }
              />
              <Button
                fontAwesomeIcon="tint-slash"
                text="Clear"
                onClick={() => this.clearSelectedStat(fieldProps)}
              />
            </div>
          )}
        </Field>
      </div>
    );
  }

  private getLabelAndColorBlock(
    label: string,
    field: StatColorField,
    cssVar: string
  ) {
    const labelSelectedClass =
      this.state.selectedStat == field ? " s-selected" : "";

    return (
      <Field name={"PlayerView.CustomStyles." + field} key={field}>
        {(fieldProps: FieldProps) => (
          <div
            className={"c-label-and-color-block" + labelSelectedClass}
            onClick={this.bindClickToSelectStat(field)}
          >
            <span>{label}</span>
            <ColorBlock
              color={fieldProps.field.value || currentFixedDefault(cssVar)}
              click={this.bindClickToSelectStat(field)}
            />
          </div>
        )}
      </Field>
    );
  }

  private handleChangeComplete = (
    color: ColorResult,
    fieldProps: FieldProps
  ) => {
    const { r, g, b, a } = color.rgb;
    const colorString = `rgba(${r},${g},${b},${a})`;
    const fieldName = "PlayerView.CustomStyles." + this.state.selectedStat;
    fieldProps.form.setFieldValue(fieldName, colorString);
  };

  private bindClickToSelectStat(field: StatColorField) {
    return () => this.setState({ selectedStat: field });
  }

  private clearSelectedStat = (fieldProps: FieldProps) => {
    const fieldName = "PlayerView.CustomStyles." + this.state.selectedStat;
    fieldProps.form.setFieldValue(fieldName, "");
  };
}
