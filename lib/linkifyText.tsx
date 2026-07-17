import { cn } from "@/lib/utils";

const URL_REGEX = /((?:https?:\/\/|www\.)\S+)/g;
// Sentence punctuation right after a URL ("check this out: example.com.")
// reads as part of the sentence, not the link - stripped off the href/label
// and rendered back afterward as plain text instead.
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"]+$/;

// Splits message text on URLs (bare or http(s)-prefixed) and renders each
// as a real link, leaving everything else as plain text - chat messages are
// stored/displayed as plain strings, so this is done at render time rather
// than requiring senders to type markdown or HTML.
export function linkifyText(text: string, linkClassName?: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);

  return parts.map((part, i) => {
    if (!/^(https?:\/\/|www\.)/i.test(part)) return part;

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
  });
}
