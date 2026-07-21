import { cn } from "@/lib/utils";

const URL_PATTERN = "(?:https?:\\/\\/|www\\.)\\S+";
const URL_REGEX = new RegExp(`(${URL_PATTERN})`, "g");
// Sentence punctuation right after a URL ("check this out: example.com.")
// reads as part of the sentence, not the link - stripped off the href/label
// and rendered back afterward as plain text instead.
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"]+$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits message text on URLs (bare or http(s)-prefixed) and @mentions of
// known group members, rendering each specially and leaving everything else
// as plain text - chat messages are stored/displayed as plain strings, so
// this is done at render time rather than requiring senders to type markdown.
// Both patterns are matched in a single split rather than two passes, so a
// name that happens to overlap a URL-like string never gets double-wrapped.
export function linkifyText(text: string, linkClassName?: string, memberNames: string[] = []): React.ReactNode[] {
  const mentionAlternation =
    memberNames.length > 0
      ? [...memberNames].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")
      : null;
  const pattern = mentionAlternation
    ? new RegExp(`(${URL_PATTERN}|@(?:${mentionAlternation})\\b)`, "g")
    : URL_REGEX;
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      const trailingMatch = part.match(TRAILING_PUNCTUATION);
      const trailing = trailingMatch ? trailingMatch[0] : "";
      const label = trailing ? part.slice(0, part.length - trailing.length) : part;
      const href = /^https?:\/\//i.test(label) ? label : `https://${label}`;

      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn("underline underline-offset-2 break-all", linkClassName)}
          >
            {label}
          </a>
          {trailing}
        </span>
      );
    }

    if (mentionAlternation && new RegExp(`^@(?:${mentionAlternation})$`).test(part)) {
      return (
        <span key={i} className="rounded bg-highlight/30 px-1 font-medium">
          {part}
        </span>
      );
    }

    return part;
  });
}
