import { useField } from "formik";
import * as React from "react";

// Ctrl/Cmd+B/I/U/Shift+X toggle these markers around the current selection,
// matching the shortcuts authors expect from other text editors -
// TextEnricher already renders "**bold**"/"*italic*" via CommonMark and
// "<u>...</u>"/"<s>...</s>" via its sanitize allowlist. Strikethrough has no
// single-key convention across editors, so this follows Slack/Discord's
// Ctrl/Cmd+Shift+X rather than colliding with the browser's Ctrl+S (save).
const formatShortcuts: {
  key: string;
  shiftKey: boolean;
  open: string;
  close: string;
}[] = [
  { key: "b", shiftKey: false, open: "**", close: "**" },
  { key: "i", shiftKey: false, open: "*", close: "*" },
  { key: "u", shiftKey: false, open: "<u>", close: "</u>" },
  { key: "x", shiftKey: true, open: "<s>", close: "</s>" }
];

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

// Wires Ctrl/Cmd+B/I/U/Shift+X (see formatShortcuts above) into a Formik
// textarea field, so any multi-line rich-text field (Description, a
// Power's Content) gets the same bold/italic/underline/strikethrough
// shortcuts TextEnricher can render.
export function useFormattableTextareaField(fieldName: string) {
  const [field, , helpers] = useField(fieldName);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key.toLowerCase();
    const shortcut = formatShortcuts.find(
      s => s.key === key && s.shiftKey === e.shiftKey
    );
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !shortcut) {
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

  return {
    name: fieldName,
    value: field.value ?? "",
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      helpers.setValue(e.target.value),
    onBlur: field.onBlur,
    onKeyDown
  };
}
