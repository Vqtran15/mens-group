import DOMPurify from "dompurify";

// Topic descriptions are stored as raw HTML (from the contentEditable rich
// text editor) and later rendered with dangerouslySetInnerHTML. Anyone with a
// valid session can write to topics.description directly via the Supabase
// API (not just through this app's UI), so this must be sanitized on both the
// write path and again defensively before render - trusting only the client
// UI to produce safe HTML would allow stored XSS via a crafted API call.
const ALLOWED_TAGS = ["b", "strong", "i", "em", "ul", "ol", "li", "br", "p", "div"];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}
