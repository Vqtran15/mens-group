"use client";

import { useEffect, useRef } from "react";
import { TextB, TextItalic, ListBullets, ListNumbers } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { richTextContentClass } from "@/lib/richTextStyles";
import { sanitizeRichText } from "@/lib/sanitizeRichText";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

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

  function exec(command: string) {
    document.execCommand(command, false);
    ref.current?.focus();
    handleInput();
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex gap-1 border-b border-border/60 p-1.5">
        <ToolbarButton onClick={() => exec("bold")} label="Bold">
          <TextB size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} label="Italic">
          <TextItalic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Bullet list">
          <ListBullets size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} label="Numbered list">
          <ListNumbers size={16} />
        </ToolbarButton>
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
