import DOMPurify from "dompurify";

// Topic descriptions are stored as raw HTML (from the contentEditable rich
// text editor) and later rendered with dangerouslySetInnerHTML. Anyone with a
// valid session can write to topics.description directly via the Supabase
// API (not just through this app's UI), so this must be sanitized on both the
// write path and again defensively before render - trusting only the client
// UI to produce safe HTML would allow stored XSS via a crafted API call.
const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "ul", "ol", "li", "br", "p", "div", "span", "a", "blockquote"];
const ALLOWED_ATTR = ["style", "href", "target", "rel"];

// Only the CSS the toolbar actually produces (span color/background-color/
// font-size, Chrome's default indent-via-blockquote margin) - restricting
// the style attribute to this allowlist means a direct API write can't use
// it to smuggle in arbitrary CSS (position, huge font sizes, etc.) even
// though DOMPurify already strips the actively dangerous constructs
// (expression(), javascript: urls, etc.) from any style value.
const ALLOWED_STYLE_PROPS = ["color", "background-color", "font-size", "margin", "margin-left", "border", "padding"];

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  data.attrValue = data.attrValue
    .split(";")
    .map((rule) => rule.trim())
    .filter((rule) => ALLOWED_STYLE_PROPS.includes(rule.split(":")[0]?.trim().toLowerCase()))
    .join("; ");
});

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
