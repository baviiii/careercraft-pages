// Australian work news for Market News and the dashboard feed, read straight
// from publishers' own RSS and Atom feeds.
//
// This replaced the Currents API. Its key stopped working in April 2026 and
// nothing noticed, because fetch_news quietly fell back to the cache, so the
// page served the same 102 articles for six months. Even while it worked,
// keyword search over the world's news returned Korean labour statistics,
// Nigerian business columns and Siemens job ads in Orlando. Feeds from
// Australian outlets need no key, have no quota, and are Australian by
// construction.
//
// Every stored story links to the publisher. We keep the headline, the
// publisher's own summary and the picture the feed offers, which is what
// these feeds are published for.

import { XMLParser } from "npm:fast-xml-parser@4";

export type NewsCategory =
  | "hiring"
  | "pay"
  | "layoffs"
  | "visas"
  | "ai"
  | "skills"
  | "workplace"
  | "general";

interface Feed {
  /** The publication, as shown on each story. */
  source: string;
  url: string;
  /**
   * Which stories to keep. An HR or labour-market outlet is about work in
   * every story; a business or news section needs the story to say so.
   */
  keep: "all" | "work" | "visas";
  /** False when the feed's summary is boilerplate (JSA's is the title, author and tags run together). */
  summary?: false;
}

export const FEEDS: Feed[] = [
  { source: "Jobs and Skills Australia", url: "https://www.jobsandskills.gov.au/rss.xml", keep: "all", summary: false },
  { source: "HCAMag", url: "https://www.hcamag.com/au/rss", keep: "all" },
  { source: "ABC News", url: "https://www.abc.net.au/news/feed/51892/rss.xml", keep: "work" },
  { source: "The Conversation", url: "https://theconversation.com/au/business/articles.atom", keep: "work" },
  { source: "The Conversation", url: "https://theconversation.com/au/education/articles.atom", keep: "work" },
  { source: "SmartCompany", url: "https://www.smartcompany.com.au/feed/", keep: "work" },
  { source: "iTnews", url: "https://www.itnews.com.au/RSS/rss.ashx", keep: "work" },
  { source: "Startup Daily", url: "https://www.startupdaily.net/feed/", keep: "work" },
  // The section also covers detention and asylum, which isn't career news.
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/australia-news/australian-immigration-and-asylum/rss",
    keep: "visas",
  },
];

/* Whole words only. The Currents filter matched substrings, so "king" threw
   out every story containing "working" and "league" every "colleague". */
const WORK =
  /\b(jobs?|employ(?:ment|ers?|ees?|ing)|unemploy\w*|hiring|recruit\w*|vacanc(?:y|ies)|workers?|workforce|workplaces?|staff(?:ing)?|wages?|salar(?:y|ies)|pay (?:rise|gap|deal|freeze|increase|cut|equity|transparency)|minimum wage|award (?:wage|rate)s?|fair work|enterprise (?:agreement|bargaining)|unions?|strikes?|industrial action|redundanc(?:y|ies)|lay-?offs?|laid off|job cuts?|apprentic\w+|tafe|graduates?|internships?|skills? shortages?|labour (?:market|force|shortage)s?|careers?|visas?|migration|skilled migrants?|four-day (?:work )?week|work from home|return to (?:the )?office|remote work\w*|hybrid work\w*)\b/i;

const VISAS =
  /\b(visas?|skilled (?:migration|migrants?|occupation\w*|workers?)|migration (?:program|system|strategy|cap)|work rights|sponsor(?:ship|ed)?|permanent residen\w+|international students?|working holiday)\b/i;

/** First match wins, so the order settles stories that touch two topics. */
const CATEGORY_RULES: Array<[NewsCategory, RegExp]> = [
  [
    "layoffs",
    /\b(lay-?offs?|laid off|redundanc(?:y|ies)|job cuts?|(?:cut|cuts|cutting|axe[sd]?|axing|shed|sheds|shedding|slash\w*)\b[^.]{0,40}?\b(?:jobs|staff|roles|positions|workers|employees|workforce)|retrench\w+|voluntary administration|into administration|receivership)\b/i,
  ],
  ["visas", VISAS],
  [
    "pay",
    /\b(wages?|salar(?:y|ies)|pay (?:rise|gap|deal|freeze|increase|cut|equity|transparency)|minimum wage|award (?:wage|rate)s?|penalty rates|superannuation|fair work|enterprise (?:agreement|bargaining)|wage theft|underpa\w+|strikes?|industrial action|unions?)\b/i,
  ],
  [
    "hiring",
    /\b(hiring|job ads?|vacanc(?:y|ies)|recruit\w*|unemployment|jobless|labour (?:market|force|shortage)s?|skills? shortages?|job ?(?:market|growth|seekers?|losses|openings)|out of work|back (?:in|into) work|part-time|full-time|participation rate|employment (?:data|figures|rate|growth)|shortage)\b/i,
  ],
  ["ai", /\b(ai|artificial intelligence|automat\w+|generative|chatgpt|copilot|machine learning|robots?)\b/i],
  [
    "skills",
    /\b(tafe|apprentic\w+|universit(?:y|ies)|graduates?|training|qualifications?|micro-?credentials?|skills?|students?|adult learning)\b/i,
  ],
  [
    "workplace",
    /\b(work from home|wfh|remote work\w*|hybrid|return to (?:the )?office|four-day (?:work )?week|flexible work\w*|burnout|wellbeing|discriminat\w+|harass\w+|bullying|right to disconnect|workplaces?|unfair dismissal|dismiss(?:al|ed)|sacked|fired|misconduct|whistleblow\w+|class action|tribunal|culture|leadership|hr|people and culture|employees?|workers?)\b/i,
  ],
];

export function categorise(text: string): NewsCategory {
  for (const [category, rule] of CATEGORY_RULES) {
    if (rule.test(text)) return category;
  }
  return "general";
}

/** Old items stay in some feeds for years; Jobs and Skills Australia's goes back to 2023. */
const MAX_AGE_DAYS = 120;
const SUMMARY_MAX = 320;

/* Entities are decoded by decodeEntities below, not the parser: its cap of
   1,000 per document rejects whole feeds from The Conversation and The
   Guardian, where every apostrophe and dash is an entity. */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: false,
  isArray: (name) => name === "item" || name === "entry" || name === "link" || name === "media:content",
});

type Node = Record<string, unknown>;

/** A text node as a string, whether the parser gave a string, a number or { "#text" }. */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Node)["#text"]);
  return "";
}

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** A code point Postgres text will take: no NUL or other controls, no lone surrogates, nothing past Unicode. */
const storable = (n: number) =>
  Number.isInteger(n) && (n === 9 || n === 10 || n === 13 || (n >= 0x20 && n < 0xd800) || (n > 0xdfff && n <= 0x10ffff));

function decodeEntities(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return storable(n) ? String.fromCodePoint(n) : "";
      }
      return ENTITY[code.toLowerCase()] ?? m;
    })
    // Raw control characters break the save just as encoded ones would.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

/** Markup out, entities decoded. Twice, because some feeds encode their HTML once more. */
function plainText(html: string): string {
  const strip = (s: string) => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  return strip(decodeEntities(strip(html))).replace(/\s+/g, " ").trim();
}

/** Summary text: no markup, no WordPress footer, cut at a word. */
function summarise(html: string): string {
  const plain = plainText(html)
    .replace(/The post .+? appeared first on .+?\.?\s*$/i, "")
    // The Guardian's newsletter plug, mid-summary.
    .replace(/\s*Get our [^.]{0,120}?\bpodcast\b\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= SUMMARY_MAX) return plain;
  const cut = plain.slice(0, SUMMARY_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}

/** The link without tracking parameters, so the same story from two feeds is one row. */
function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    [...u.searchParams.keys()]
      .filter((k) => /^(utm_|fbclid|gclid|cmp|ref$|src$)/i.test(k))
      .forEach((k) => u.searchParams.delete(k));
    u.hash = "";
    return u.toString();
  } catch {
    return raw.trim();
  }
}

/** RSS gives the link as text; Atom as <link rel="alternate" href>. */
function linkOf(item: Node): string {
  const list = (Array.isArray(item.link) ? item.link : [item.link]).filter(Boolean) as Array<string | Node>;
  const plain = list.find((l): l is string => typeof l === "string" && l.trim() !== "");
  if (plain) return decodeEntities(plain);
  const nodes = list.filter((l): l is Node => typeof l === "object");
  const alt = nodes.find((l) => l["@_rel"] === "alternate" || !l["@_rel"]) ?? nodes[0];
  return alt ? decodeEntities(text(alt["@_href"]) || text(alt)) : "";
}

function imageOf(item: Node): string | null {
  const media = item["media:content"] as Node[] | undefined;
  const fromMedia = media?.find((m) => !m["@_medium"] || m["@_medium"] === "image")?.["@_url"];
  const thumb = (item["media:thumbnail"] as Node | undefined)?.["@_url"];
  const enclosure = item["enclosure"] as Node | undefined;
  const fromEnclosure = enclosure && String(enclosure["@_type"] ?? "").startsWith("image/") ? enclosure["@_url"] : null;
  const url = decodeEntities(text(fromMedia ?? thumb ?? fromEnclosure ?? ""));
  return /^https:\/\//.test(url) ? url : null;
}

export interface FeedStory {
  external_id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  category: NewsCategory;
  image_url: string | null;
  read_time: null;
  fetched_at: string;
  keywords: string[];
}

/** One feed's XML as stories worth showing. Exported for the tests. */
export function parseFeed(xml: string, feed: Feed, now = Date.now()): FeedStory[] {
  const doc = parser.parse(xml) as Node;
  const channel = (doc.rss as Node | undefined)?.channel as Node | undefined;
  const items = ((channel?.item ?? (doc.feed as Node | undefined)?.entry ?? []) as Node[]);
  const fetchedAt = new Date(now).toISOString();
  const oldest = now - MAX_AGE_DAYS * 86_400_000;

  const stories: FeedStory[] = [];
  for (const item of items) {
    const title = plainText(text(item.title));
    const link = cleanUrl(linkOf(item));
    if (!title || !/^https?:\/\//.test(link)) continue;

    const when = new Date(text(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]));
    if (Number.isNaN(when.getTime()) || when.getTime() < oldest || when.getTime() > now + 86_400_000) continue;

    const description = feed.summary === false
      ? ""
      : summarise(text(item.description ?? item.summary ?? item.content ?? item["content:encoded"]));
    const haystack = `${title}. ${description}`;
    if (feed.keep === "work" && !WORK.test(haystack)) continue;
    if (feed.keep === "visas" && !VISAS.test(haystack)) continue;

    stories.push({
      external_id: text(item.guid ?? item.id) || link,
      title,
      description,
      url: link,
      source: feed.source,
      published_at: when.toISOString(),
      category: categorise(haystack),
      image_url: imageOf(item),
      read_time: null,
      fetched_at: fetchedAt,
      keywords: [feed.source],
    });
  }
  return stories;
}

const FEED_TIMEOUT_MS = 8000;

async function fetchFeed(feed: Feed): Promise<FeedStory[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FaircopyNews/1.0; +https://www.faircopy.au)",
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text(), feed);
  } finally {
    clearTimeout(timer);
  }
}

/** When this instance last started reading the feeds, successful or not. */
let lastAttemptAt = 0;

export interface RefreshResult {
  skipped: boolean;
  saved: number;
  /** Stories kept per feed, or the reason a feed failed. */
  byFeed: Record<string, number | string>;
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** When the feeds were last read, or null if never. */
export async function lastFetchedAt(db: Db): Promise<string | null> {
  const { data } = await db
    .from("news_articles")
    .select("fetched_at")
    // A DESC sort puts NULLs first; one such row would read as "never fetched".
    .not("fetched_at", "is", null)
    .order("fetched_at", { ascending: false })
    .limit(1);
  return data?.[0]?.fetched_at ?? null;
}

/**
 * Read every feed and store what's new. Rows already stored are refreshed
 * too, so `fetched_at` always says when we last looked, which is what
 * fetch_news uses to decide whether to look again.
 *
 * `minIntervalMs` stops two visitors (or a script) from re-reading every
 * publisher's feed back to back. Pass `lastFetched` when the caller has just
 * looked it up, to skip asking again.
 */
export async function refreshNews(
  db: Db,
  { minIntervalMs = 10 * 60_000, lastFetched }: { minIntervalMs?: number; lastFetched?: string | null } = {},
): Promise<RefreshResult> {
  /* A run that saves nothing (every feed down, or blocking us) leaves
     fetched_at where it was, so the table alone would say "stale" to every
     visitor and each would wait out the feed timeouts again. Remembering the
     attempt stops that, and taking the slot before any await stops two
     requests in this instance from both starting a run. It lives in this
     instance's memory, so a cold start may try once more, which is fine. */
  if (Date.now() - lastAttemptAt < minIntervalMs) return { skipped: true, saved: 0, byFeed: {} };
  lastAttemptAt = Date.now();

  const latest = lastFetched === undefined ? await lastFetchedAt(db) : lastFetched;
  const last = latest ? new Date(latest).getTime() : 0;
  if (Date.now() - last < minIntervalMs) return { skipped: true, saved: 0, byFeed: {} };

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const byFeed: Record<string, number | string> = {};
  const seen = new Set<string>();
  const groups: Array<{ feed: string; rows: FeedStory[] }> = [];
  results.forEach((r, i) => {
    const key = FEEDS[i].url;
    if (r.status === "rejected") {
      byFeed[key] = r.reason instanceof Error ? r.reason.message : String(r.reason);
      return;
    }
    byFeed[key] = r.value.length;
    // De-duplicated across feeds first: one upsert may not touch a URL twice.
    const rows = r.value.filter((s) => !seen.has(s.url) && seen.add(s.url));
    if (rows.length > 0) groups.push({ feed: key, rows });
  });

  /* One save per feed, so a row Postgres refuses costs that feed's stories,
     not everyone's. */
  let saved = 0;
  const failures: string[] = [];
  for (const { feed, rows } of groups) {
    const { error } = await db.from("news_articles").upsert(rows, { onConflict: "url" });
    if (error) {
      byFeed[feed] = `save failed: ${error.message}`;
      failures.push(error.message);
    } else saved += rows.length;
  }
  if (groups.length > 0 && saved === 0) throw new Error(`Saving news failed: ${failures[0]}`);

  console.log(`[news] refreshed: ${saved} stories`, byFeed);
  return { skipped: false, saved, byFeed };
}
