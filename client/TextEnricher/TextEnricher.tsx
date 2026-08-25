import * as _ from "lodash";
import { isArray, isString } from "lodash";
import * as React from "react";
import { SpecialComponents } from "react-markdown/lib/ast-to-react";
import { NormalComponents } from "react-markdown/lib/complex-types";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import * as ReactReplace from "react-string-replace-recursively";
import remarkBreaks from "remark-breaks";

import { AbilityScores, StatBlock } from "../../common/StatBlock";
import { Spell } from "../../common/Spell";
import {
  concatenatedStringRegex,
  toModifierString
} from "../../common/Toolbox";
import { Listing } from "../Library/Listing";
import { Conditions2025 } from "../Rules/Conditions";
import { Dice } from "../Rules/Dice";

import { IRules, DefaultRules } from "../Rules/Rules";
import { BeanCounter, Counter } from "./Counter";

const conditionsRegex = concatenatedStringRegex(_.keys(Conditions2025));

// "Wil" is Nimble's display name for the Wis field (see
// StatBlock.AbilityDisplayNames) - accept it as an alias so [WIL] works the
// same as [WIS] when tagging an ability in Action/Trait text.
const abilityFieldsByAlias: Record<string, keyof AbilityScores> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  wil: "Wis",
  cha: "Cha"
};

interface ReplaceConfig {
  [name: string]: {
    pattern: RegExp;
    matcherFn: (rawText: string, processed: string, key: string) => JSX.Element;
    ignore?: string[];
  };
}

export class TextEnricher {
  constructor(
    private rollDice: (diceExpression: string) => void,
    private referenceSpellListing: (listing: Listing<Spell>) => void,
    private referenceCondition: (condition: string) => void,
    private getSpellListings: () => Listing<Spell>[],
    private getSpellsByNameRegex: () => RegExp,
    private rules: IRules
  ) {}

  private referenceSpell = (spellName: string) => {
    const name = spellName.toLocaleLowerCase();
    const listing = _.find(
      this.getSpellListings(),
      s => s.Meta().Name.toLocaleLowerCase() == name
    );
    if (listing) {
      this.referenceSpellListing(listing);
    }
  };

  public GetEnrichedModifierFromAbilityScore = (score: number): JSX.Element => {
    const modifier = this.rules.GetModifierFromScore(score);
    return this.EnrichModifier(modifier);
  };

  public EnrichModifier = (modifier: number): JSX.Element => {
    const modifierString = toModifierString(modifier);
    return (
      <span className="rollable" onClick={() => this.rollDice(modifierString)}>
        {modifierString}
      </span>
    );
  };

  // Shared render for [Str]/[Dex]/etc., [KEY], and [LVL] - a bare,
  // clickable value followed by a smaller, lighter superscript naming
  // where it came from.
  private renderTagWithLabel = (
    key: string,
    displayValue: React.ReactNode,
    rollExpression: string,
    label: string
  ): JSX.Element => {
    return (
      <span key={key} className="ability-tag">
        <span className="rollable" onClick={() => this.rollDice(rollExpression)}>
          {displayValue}
        </span>
        <span className="ability-tag__label">({label})</span>
      </span>
    );
  };

  private renderAbilityTag = (
    key: string,
    score: number,
    label: string
  ): JSX.Element => {
    const modifier = this.rules.GetModifierFromScore(score);
    return this.renderTagWithLabel(
      key,
      modifier,
      toModifierString(modifier),
      label
    );
  };

  public EnrichText = (
    text: string,
    updateTextSource?: (newText: string) => void,
    statBlock?: StatBlock
  ): JSX.Element => {
    const replacer = this.buildReactReplacer(text, updateTextSource, statBlock);

    const components: Partial<
      Omit<NormalComponents, keyof SpecialComponents> & SpecialComponents
    > = {
      p: ({ children }) => {
        return <p>{this.applyReplacer(replacer, children)}</p>;
      },
      li: ({ children }) => {
        return <li>{this.applyReplacer(replacer, children)}</li>;
      },
      strong: ({ children }) => {
        return <strong>{this.applyReplacer(replacer, children)}</strong>;
      },
      em: ({ children }) => {
        return <em>{this.applyReplacer(replacer, children)}</em>;
      }
    };

    return (
      <ReactMarkdown
        children={preserveBlankLines(text)}
        components={components}
        remarkPlugins={[remarkBreaks]}
        rawSourcePos
      />
    );
  };

  // For short, single-line strings (e.g. a Power's Name) that shouldn't go
  // through the full markdown/paragraph pipeline EnrichText uses - applies
  // the same tag replacements directly to the raw string.
  public EnrichInlineText = (
    text: string,
    statBlock?: StatBlock
  ): React.ReactNode => {
    const replacer = this.buildReactReplacer(text, undefined, statBlock);
    return replacer(text);
  };

  private applyReplacer(
    replacer: any,
    children: React.ReactNode | React.ReactNode[]
  ) {
    if (!children) {
      return null;
    }
    if (isString(children)) {
      return replacer(children);
    }
    if (isArray(children)) {
      return children.map(child => {
        if (isString(child)) {
          return replacer(child);
        } else {
          return child;
        }
      });
    }
    return children;
  }

  private buildReactReplacer(
    originalText: string,
    updateTextSource?: (newText: string) => void,
    statBlock?: StatBlock
  ) {
    const replaceConfig: ReplaceConfig = {
      diceExpression: {
        pattern: Dice.GlobalDicePattern,
        matcherFn: (rawText, processed, key) => (
          <span
            className="rollable"
            key={key}
            onClick={() => this.rollDice(rawText)}
          >
            {rawText}
          </span>
        )
      },
      spells: {
        pattern: this.getSpellsByNameRegex(),
        matcherFn: (rawText, processed, key) => (
          <span
            className="spell-reference"
            key={key}
            onClick={() => this.referenceSpell(rawText)}
          >
            {rawText}
          </span>
        )
      },
      conditions: {
        pattern: conditionsRegex,
        matcherFn: (rawText, processed, key) => (
          <span
            className="condition-reference"
            key={key}
            onClick={() => this.referenceCondition(rawText)}
          >
            {rawText}
          </span>
        )
      },
      abilityTag: {
        pattern: /(\[(?:Str|Dex|Con|Int|Wis|Wil|Cha|LVL|KEY)\])/gi,
        matcherFn: (rawText, processed, key) => {
          const typedName = rawText.slice(1, -1);
          const upperName = typedName.toUpperCase();

          if (upperName === "LVL") {
            if (!statBlock?.Challenge) {
              return <React.Fragment key={key}>{rawText}</React.Fragment>;
            }
            // Challenge can be a fractional CR string (e.g. "1/2") on
            // legacy imported monsters, or other non-numeric text - only
            // treat it as a rollable modifier when it's a clean whole
            // number. Number() (unlike parseInt) rejects the whole string
            // rather than silently truncating "1/2" to 1, so this falls
            // back to plain, non-interactive text instead of rolling a
            // truncated or NaN modifier.
            const level = Number(statBlock.Challenge);
            if (!Number.isInteger(level)) {
              return <React.Fragment key={key}>{rawText}</React.Fragment>;
            }
            return this.renderTagWithLabel(
              key,
              statBlock.Challenge,
              toModifierString(level),
              "LVL"
            );
          }

          if (!statBlock?.Abilities) {
            return <React.Fragment key={key}>{rawText}</React.Fragment>;
          }

          if (upperName === "KEY") {
            const abilities = statBlock.Abilities;
            const highestField = StatBlock.VisibleAbilityNames.reduce(
              (best, name) => (abilities[name] > abilities[best] ? name : best)
            );
            return this.renderAbilityTag(
              key,
              abilities[highestField],
              StatBlock.AbilityDisplayNames[highestField].toUpperCase()
            );
          }

          const field = abilityFieldsByAlias[typedName.toLowerCase()];
          if (!field) {
            return <React.Fragment key={key}>{rawText}</React.Fragment>;
          }
          return this.renderAbilityTag(
            key,
            statBlock.Abilities[field],
            upperName
          );
        }
      },
      icon: {
        pattern: /(\bfa-[a-z0-9]+(?:-[a-z0-9]+)*\b)/g,
        matcherFn: (rawText, processed, key) => (
          <span
            className={"inline-icon fas " + rawText}
            key={key}
            title={rawText}
          />
        )
      },
      // [d4]/[d6]/[d8]/[d10]/[d12]/[d20] - shorthand for the matching
      // fa-dice-dN icon, easier to type than the full FontAwesome class name.
      diceIcon: {
        pattern: /(\[d(?:4|6|8|10|12|20)\])/gi,
        matcherFn: (rawText, processed, key) => {
          const die = rawText.slice(1, -1).toLowerCase();
          return (
            <span
              className={"inline-icon fas fa-dice-" + die}
              key={key}
              title={"fa-dice-" + die}
            />
          );
        }
      },
      // [A1]/[A2]/... - a circled number for Action cost. [R1]/[R2]/... -
      // the same circle, filled/inverted, for Mana/Resource cost. No
      // FontAwesome icon exists for this, so it's a plain CSS badge.
      costBadge: {
        pattern: /(\[[AR]\d+\])/gi,
        matcherFn: (rawText, processed, key) => {
          const inner = rawText.slice(1, -1);
          const kind = inner[0].toUpperCase();
          const value = inner.slice(1);
          return (
            <span
              key={key}
              className={
                "cost-badge" + (kind === "R" ? " cost-badge--resource" : "")
              }
              title={kind === "R" ? "Resource cost" : "Action cost"}
            >
              {value}
            </span>
          );
        }
      },
      // [tab]/[dash]/[bullet] - a hanging-indent spacer sized to match a
      // [A#]/[R#] cost badge's occupied width, so wrapped/continuation
      // lines can line up under the text that follows a badge on the line
      // above. [tab] is blank, [dash]/[bullet] show a leading glyph.
      indentTag: {
        pattern: /(\[(?:tab|dash|bullet)\])/gi,
        matcherFn: (rawText, processed, key) => {
          const kind = rawText.slice(1, -1).toLowerCase();
          const glyph = kind === "dash" ? "-" : kind === "bullet" ? "•" : "";
          return (
            <span key={key} className="indent-tag">
              {glyph}
            </span>
          );
        }
      },
      counter: {
        pattern: /(.+\[\d+\/\d+\])/g,
        matcherFn: (rawText, processed, key) => {
          let bracketedCounterMatch: RegExp;
          try {
            bracketedCounterMatch = new RegExp(
              /(?<label>.*)\[(?<current>\d+)\/(?<maximum>\d+)\]/,
              "gd"
            );
          } catch (err) {
            console.warn("Dynamic counters are not supported on your browser:");
            console.warn(err);
            return;
          }

          const matches = bracketedCounterMatch.exec(rawText);
          if (
            updateTextSource === undefined ||
            !matches ||
            matches.length < 2
          ) {
            return <span key={key}>{rawText}</span>;
          }

          const label = matches.groups["label"] || "";
          const current = parseInt(matches.groups["current"]);
          const maximum = parseInt(matches.groups["maximum"]);

          if (maximum < 1) {
            return <span key={key}>{rawText}</span>;
          }

          const counterProps = {
            current,
            maximum,
            onChange: (newValue: number) => {
              const matchStart = originalText.indexOf(rawText);
              const currentRange = _.get(
                matches,
                "indices.groups.current",
                null
              );
              if (!currentRange) {
                console.warn("Counter not found in matches");
                console.table(matches);
                return;
              }
              const [currentStart, currentEnd] = currentRange;

              const updatedText =
                originalText.slice(0, matchStart + currentStart) +
                newValue +
                originalText.slice(matchStart + currentEnd);
              updateTextSource(updatedText);
            }
          };

          if (maximum <= 9) {
            return (
              <span key={key}>
                {label}
                <BeanCounter {...counterProps} />
              </span>
            );
          }

          return (
            <span key={key}>
              {label}
              <Counter {...counterProps} />
            </span>
          );
        }
      }
    };

    return ReactReplace(replaceConfig);
  }
}

// CommonMark collapses any run of blank lines into a single paragraph
// break, so "\n\n" and "\n\n\n\n" render identically. Insert an empty
// (non-breaking-space) paragraph for each blank line beyond the first so
// extra blank lines the author typed show up as extra vertical gaps.
function preserveBlankLines(text: string): string {
  return text.replace(/\n{2,}/g, match => {
    const extraBlankLines = match.length - 2;
    return "\n\n" + "&nbsp;\n\n".repeat(extraBlankLines);
  });
}

export const TextEnricherContext = React.createContext(
  new TextEnricher(
    () => {},
    () => {},
    () => {},
    () => [],
    () => new RegExp("$^"),
    new DefaultRules()
  )
);
