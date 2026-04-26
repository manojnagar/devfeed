/**
 * @file Minimal RSS / Atom feed parser.
 *
 * Pulls just the fields we need (title, link, guid, summary,
 * publishedAt, author) using regular expressions instead of a full XML
 * library. Keeps the dependency footprint small and the surface area
 * easy to test against fixtures.
 *
 * Real-world feeds are messy; the parser is intentionally forgiving —
 * malformed items are skipped, not thrown.
 */

export interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string | null;
  summary: string | null;
  author: string | null;
  publishedAt: string;
}

export interface ParsedFeed {
  items: ParsedFeedItem[];
  channelTitle: string | null;
  isAtom: boolean;
}

const ITEM_RX = /<item[\s>][\s\S]*?<\/item>/gi;
const ENTRY_RX = /<entry[\s>][\s\S]*?<\/entry>/gi;
const TAG = (name: string) =>
  new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function getTag(block: string, tag: string): string | null {
  const m = block.match(TAG(tag));
  return m ? decodeHtml(m[1]) : null;
}

function getAtomLink(block: string): string | null {
  const m = block.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
  return m ? m[1] : null;
}

function parseDate(input: string | null): string {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseItems(blocks: string[], isAtom: boolean): ParsedFeedItem[] {
  const out: ParsedFeedItem[] = [];
  for (const block of blocks) {
    const title = getTag(block, "title");
    const link = isAtom ? getAtomLink(block) : getTag(block, "link");
    if (!title || !link) continue;
    const summary =
      getTag(block, "description") ?? getTag(block, "summary") ?? getTag(block, "content");
    const author =
      getTag(block, "author") ??
      getTag(block, "dc:creator") ??
      (isAtom ? getTag(block, "name") : null);
    const published =
      getTag(block, "pubDate") ?? getTag(block, "published") ?? getTag(block, "updated");
    const guid = getTag(block, "guid") ?? getTag(block, "id");
    out.push({
      title,
      link,
      guid,
      summary,
      author,
      publishedAt: parseDate(published),
    });
  }
  return out;
}

/**
 * Parse a feed body. Detects RSS vs Atom by tag shape.
 *
 * @param body Raw response text from the feed URL.
 */
export function parseFeed(body: string): ParsedFeed {
  const isAtom = /<feed[\s>]/i.test(body);
  const blocks = isAtom ? body.match(ENTRY_RX) ?? [] : body.match(ITEM_RX) ?? [];
  return {
    isAtom,
    channelTitle: getTag(body, isAtom ? "title" : "title"),
    items: parseItems(blocks, isAtom),
  };
}
