"use client";

import { useEffect, useRef } from "react";
import {
  TextB,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  TextIndent,
  TextOutdent,
  Link,
  TextAa,
  TextT,
  Highlighter,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { richTextContentClass } from "@/lib/richTextStyles";
import { sanitizeRichText } from "@/lib/sanitizeRichText";

const FONT_SIZES = [
  { label: "Small", value: "13px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "Huge", value: "28px" },
];

// execCommand("fontSize", ...) only ever accepts the legacy 1-7 keyword
// sizes, never an arbitrary px value - "7" here is just a distinctive
// marker so the <font size="7"> it produces can be found and swapped for a
// <span style="font-size:Npx"> with the size actually requested.
const FONT_SIZE_MARKER = "7";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The font-size <select> and color <input type="color"> both take native
  // focus away from the contentEditable to open their own UI, which
  // collapses whatever text was selected - saved here on mousedown (while
  // the selection is still live) and restored right before the resulting
  // command runs, so it still lands on the text the user actually picked.
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    // Only sync in from `value` once on mount - contentEditable owns the DOM
    // after that, so overwriting innerHTML on every render would reset the
    // cursor position while the user is typing.
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeRichText(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput() {
    if (!ref.current) return;
    const isEmpty = ref.current.textContent?.trim().length === 0;
    onChange(isEmpty ? "" : sanitizeRichText(ref.current.innerHTML));
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current && ref.current.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedRangeRef.current;
    if (!range || !ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    ref.current?.focus();
    handleInput();
  }

  // TypeScript's execCommand types only accept a string third argument, but
  // styleWithCSS genuinely needs a real boolean - browsers truthy-check it
  // internally, so passing the *string* "false" would be truthy and
  // incorrectly behave as true.
  function setStyleWithCSS(enabled: boolean) {
    document.execCommand("styleWithCSS", false, enabled as unknown as string);
  }

  // foreColor/hiliteColor default to producing a legacy <font> tag - forcing
  // styleWithCSS on for just this one call gets a plain <span style="..."> instead,
  // which is what's allowlisted. Reset immediately after so it doesn't leak into
  // the next Bold/Italic click (which would otherwise start producing
  // <span style="font-weight:bold"> instead of <strong>).
  function execAsStyle(command: string, value: string) {
    restoreSelection();
    setStyleWithCSS(true);
    document.execCommand(command, false, value);
    setStyleWithCSS(false);
    ref.current?.focus();
    handleInput();
  }

  function setFontSize(px: string) {
    restoreSelection();
    document.execCommand("fontSize", false, FONT_SIZE_MARKER);
    ref.current?.querySelectorAll(`font[size="${FONT_SIZE_MARKER}"]`).forEach((el) => {
      const span = document.createElement("span");
      span.style.fontSize = px;
      while (el.firstChild) span.appendChild(el.firstChild);
      el.replaceWith(span);
    });
    ref.current?.focus();
    handleInput();
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    const normalized = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
    document.execCommand("createLink", false, normalized);

    // createLink doesn't hand back the element it just created - find it via
    // the current selection so target/rel can be set (opens in a new tab
    // instead of navigating away from the app).
    const anchorNode = window.getSelection()?.anchorNode;
    const container = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
    const linkEl = container?.closest("a");
    if (linkEl) {
      linkEl.setAttribute("target", "_blank");
      linkEl.setAttribute("rel", "noopener noreferrer");
    }
    ref.current?.focus();
    handleInput();
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 p-1.5">
        <ToolbarButton onClick={() => exec("bold")} label="Bold">
          <TextB size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} label="Italic">
          <TextItalic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} label="Underline">
          <TextUnderline size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Bullet list">
          <ListBullets size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} label="Numbered list">
          <ListNumbers size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("outdent")} label="Decrease indent">
          <TextOutdent size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("indent")} label="Increase indent">
          <TextIndent size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={insertLink} label="Insert link">
          <Link size={16} />
        </ToolbarButton>

        <Divider />

        <div className="relative flex items-center">
          <TextAa size={16} className="pointer-events-none absolute left-1.5 text-secondary" />
          <select
            aria-label="Text size"
            defaultValue="16px"
            onMouseDown={saveSelection}
            onChange={(e) => setFontSize(e.target.value)}
            className="appearance-none rounded-md bg-transparent py-1.5 pl-6 pr-1.5 text-xs text-secondary outline-none transition-colors hover:bg-surface-muted"
          >
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        <ColorSwatch
          label="Text color"
          icon={<TextT size={16} />}
          defaultValue="#264653"
          onOpen={saveSelection}
          onChange={(color) => execAsStyle("foreColor", color)}
        />
        <ColorSwatch
          label="Highlight color"
          icon={<Highlighter size={16} />}
          defaultValue="#fef08a"
          onOpen={saveSelection}
          onChange={(color) => execAsStyle("hiliteColor", color)}
        />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className={cn("min-h-[120px] px-3 py-2.5 text-base outline-none", richTextContentClass)}
      />
    </div>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border/60" />;
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep the contentEditable selection alive - a normal click would blur
      // it before the command runs, applying to nothing.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-secondary transition-colors hover:bg-surface-muted"
    >
      {children}
    </button>
  );
}

function ColorSwatch({
  label,
  icon,
  defaultValue,
  onOpen,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  defaultValue: string;
  onOpen: () => void;
  onChange: (color: string) => void;
}) {
  return (
    <label
      aria-label={label}
      title={label}
      // The native color input's own swatch is tiny and unstyled by default -
      // this wraps it so only the icon shows; the input itself is invisible
      // but still fully clickable/functional underneath it.
      className="relative flex cursor-pointer items-center rounded-md p-1.5 text-secondary transition-colors hover:bg-surface-muted"
    >
      {icon}
      <input
        type="color"
        defaultValue={defaultValue}
        // No preventDefault here (unlike ToolbarButton) - the picker needs
        // its default mousedown behavior to actually open. Saving the
        // selection here instead, before focus moves to the picker.
        onMouseDown={onOpen}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
