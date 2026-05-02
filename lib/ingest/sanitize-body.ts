/**
 * @file Shared HTML allow-list sanitizer for post bodies.
 *
 * Both the feed-supplied body path (`<content:encoded>` captured in
 * ingest) and the on-demand Readability extractor flow through this
 * before anything is stored on the post row OR rendered with
 * `dangerouslySetInnerHTML`. Defense in depth: we sanitize at write
 * AND at render so even tampered DB rows can't inject script tags.
 *
 * The allow-list is intentionally narrow:
 *   - Block-level: h2-h4, p, ul, ol, li, blockquote, pre, hr, figure,
 *     figcaption, table-related (engineering posts use tables a lot).
 *     We strip h1 because the page already renders the post title as
 *     an h1.
 *   - Inline:     em, strong, code, span, a, br, sub, sup.
 *   - Media:      img (src, alt, title only). iframes/scripts removed.
 *
 * Attribute filters force `<a>` to open in a new tab with
 * `rel="noopener noreferrer nofollow"` and reject non-http(s) URLs in
 * `href`/`src`. `data:` and `javascript:` are dropped on the floor.
 */

import sanitizeHtml from "sanitize-html";

const ALLOWED_PROTOCOLS = ["http", "https", "mailto"];

const ALLOWED_TAGS = [
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "em",
  "strong",
  "i",
  "b",
  "u",
  "br",
  "hr",
  "a",
  "img",
  "figure",
  "figcaption",
  "span",
  "sub",
  "sup",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  // `target` + `rel` are forced onto every link by `transformTags` below;
  // they have to be in the allow-list so sanitize-html doesn't strip
  // them after the transform runs.
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  code: ["class"],
  pre: ["class"],
  span: ["class"],
  th: ["scope"],
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ALLOWED_PROTOCOLS,
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // Force every link to open in a new tab and strip referrer/follow
    // signals. Keeping `target="_blank"` without `rel="noopener"` is a
    // classic reverse-tabnabbing vector.
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }),
    // Native lazy-load on every image and `loading="lazy"` for
    // performance — the body is rendered into a fixed-width container
    // so eager-loading every image would block the LCP.
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
  },
};

/**
 * Sanitize a candidate post body. Returns the cleaned HTML string.
 * Empty input or input that becomes empty after sanitization returns
 * an empty string — callers should skip the persist step in that case.
 */
export function sanitizePostBody(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = sanitizeHtml(input, SANITIZE_OPTIONS).trim();
  return cleaned;
}
