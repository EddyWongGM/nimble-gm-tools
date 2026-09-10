import { Formik, FormikProps } from "formik";
import * as React from "react";
import { Button } from "../Components/Button";

export interface PromptProps<T extends object> {
  onSubmit: (submittedValues: T) => boolean;
  children: React.ReactChild;
  autoFocusSelector: string;
  initialValues: T;
  validate?: (values: T) => void | object | Promise<any>;
  // Called when the prompt is dismissed without submitting (Escape) -
  // for side effects that should happen on any dismissal, not just a
  // successful submit.
  onCancel?: () => void;
  // Set when this prompt's own submit button already just dismisses it
  // unconditionally (onSubmit always returns true with no other effect) -
  // the separate Cancel (X) button would be a redundant, visually
  // colliding duplicate of that same action rather than a distinct choice.
  hideCancelButton?: boolean;
}

class Prompt<T extends object> extends React.Component<
  PromptProps<T> & {
    onCancel: () => void;
  }
> {
  private formElement: HTMLFormElement;

  public render() {
    return (
      <Formik
        initialValues={this.props.initialValues || {}}
        validate={this.props.validate}
        onSubmit={values => {
          this.props.onSubmit(values);
        }}
      >
        {(props: FormikProps<any>) => (
          <form
            ref={r => (this.formElement = r)}
            className={
              "prompt" +
              (this.props.hideCancelButton ? "" : " prompt--has-cancel")
            }
            onSubmit={props.handleSubmit}
            onKeyUp={(e: React.KeyboardEvent<HTMLFormElement>) => {
              if (e.key == "Escape") {
                this.props.onCancel();
              }
            }}
          >
            {
              // Escape has always been the only way to cancel a prompt
              // without submitting it - fine with a keyboard, but touch
              // devices have no Escape key and no way to trigger this.
              // Visible on every prompt (not just phone width) since the
              // gap exists on desktop too, just masked there by Escape.
              // Skipped when the prompt's own submit button already does
              // the exact same thing (see hideCancelButton).
            }
            {!this.props.hideCancelButton && (
              <Button
                additionalClassNames="prompt__cancel"
                fontAwesomeIcon="times"
                tooltip="Cancel"
                onClick={() => this.props.onCancel()}
              />
            )}
            {this.props.children}
          </form>
        )}
      </Formik>
    );
  }

  public componentDidMount() {
    setTimeout(this.delaySoAutoFocusedFieldDoesntSwallowHotkey);
  }

  private delaySoAutoFocusedFieldDoesntSwallowHotkey = () => {
    if (!this.formElement) {
      return;
    }

    //prevent mounted element from swallowing hotkey
    const element: HTMLInputElement = this.formElement.querySelector(
      this.props.autoFocusSelector
    );

    if (!element) {
      return;
    }

    if (element.focus) {
      element.focus();
    }
    if (element.select) {
      element.select();
    }
  };
}

interface PendingPromptsProps {
  promptsAndIds: [PromptProps<object>, string][];
  removePrompt: (promptId: string) => void;
}

export class PendingPrompts extends React.Component<PendingPromptsProps> {
  public render() {
    const emptyClassName =
      this.props.promptsAndIds.length == 0 ? " empty" : " tutorial-focus";
    return (
      <div className={"prompts" + emptyClassName}>
        {this.props.promptsAndIds.map(promptAndId => {
          const [prompt, promptId] = promptAndId;

          return (
            <Prompt
              key={promptId}
              {...prompt}
              onSubmit={values => {
                const shouldResolve = prompt.onSubmit(values);
                if (shouldResolve) {
                  this.props.removePrompt(promptId);
                }
                return shouldResolve;
              }}
              onCancel={() => {
                prompt.onCancel?.();
                this.props.removePrompt(promptId);
              }}
            />
          );
        })}
      </div>
    );
  }
}
