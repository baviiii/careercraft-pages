/**
 * Which organisation a skill, certification, tool or line of advice is about,
 * as a website whose small icon we can show.
 *
 * The coach answers that for any field (useBrandSite below): nursing
 * registration → ahpra.gov.au, CPA → cpaaustralia.com.au. Names on a page are
 * asked about together, once, and the answers kept in this browser for 30
 * days. The list here is only the backup: it shows a logo straight away for
 * well-known names while the coach answers, and when the coach can't.
 *
 * The icon itself comes from DuckDuckGo's icon service, which is sent only
 * the website's address (the privacy page says so). Nothing recognised means
 * no logo: initials where a tile must show something, nothing in a line of
 * text. Patterns match whole words, so "Java" never matches "JavaScript".
 */
import { useEffect, useSyncExternalStore } from "react";

import { careerCoach, CAREER_COACH_AVAILABLE } from "@/lib/careerCoach";

const BRANDS: Array<[RegExp, string]> = [
  // Awarding bodies and the platforms their exams cover.
  [/amazon web services|\baws\b/i, "aws.amazon.com"],
  [/microsoft|azure|\b(?:az|dp|ai|pl|sc|ms|md|mb)-\d{3}\b|power bi|\bfabric\b|\bexcel\b|sharepoint|\bc#|\.net\b|sql server/i, "microsoft.com"],
  [/google|\bgcp\b/i, "cloud.google.com"],
  [/comptia/i, "comptia.org"],
  [/cisco|\bccna\b/i, "cisco.com"],
  [/project management institute|\bpmi\b|\bpmp\b/i, "pmi.org"],
  [/isc2|\(isc\)|\bcissp\b/i, "isc2.org"],
  [/isaca|\bcism\b|\bcisa\b/i, "isaca.org"],
  [/kubernetes/i, "kubernetes.io"],
  [/linux foundation|\bcncf\b|\bckad\b|\bcka\b/i, "linuxfoundation.org"],
  [/hashicorp|terraform/i, "hashicorp.com"],
  [/oracle/i, "oracle.com"],
  [/salesforce/i, "salesforce.com"],
  [/red hat/i, "redhat.com"],
  [/scrum\.org|professional scrum/i, "scrum.org"],
  [/scrum alliance/i, "scrumalliance.org"],
  [/peoplecert|axelos|prince2|\bitil\b/i, "peoplecert.org"],
  [/databricks/i, "databricks.com"],
  [/snowflake/i, "snowflake.com"],
  [/ahpra|nursing and midwifery board/i, "ahpra.gov.au"],
  [/cpa australia/i, "cpaaustralia.com.au"],
  [/chartered accountants/i, "charteredaccountantsanz.com"],
  [/coursera/i, "coursera.org"],
  [/\bedx\b/i, "edx.org"],
  [/nvidia/i, "nvidia.com"],
  [/\bibm\b/i, "ibm.com"],
  [/\bsap\b/i, "sap.com"],
  [/servicenow/i, "servicenow.com"],
  // Tools and languages, for skills.
  [/\bpython\b/i, "python.org"],
  [/mlflow/i, "mlflow.org"],
  [/supabase/i, "supabase.com"],
  [/splunk/i, "splunk.com"],
  [/openai|chatgpt/i, "openai.com"],
  [/\breact\b/i, "react.dev"],
  [/next\.?js/i, "nextjs.org"],
  [/typescript/i, "typescriptlang.org"],
  [/node\.?js/i, "nodejs.org"],
  [/\bvue\b/i, "vuejs.org"],
  [/angular/i, "angular.dev"],
  [/tailwind/i, "tailwindcss.com"],
  [/graphql/i, "graphql.org"],
  [/docker/i, "docker.com"],
  [/postgres/i, "postgresql.org"],
  [/mysql/i, "mysql.com"],
  [/mongodb/i, "mongodb.com"],
  [/\bredis\b/i, "redis.io"],
  [/kafka/i, "kafka.apache.org"],
  [/\bspark\b/i, "spark.apache.org"],
  [/airflow/i, "airflow.apache.org"],
  [/\bdbt\b/i, "getdbt.com"],
  [/github/i, "github.com"],
  [/gitlab/i, "gitlab.com"],
  [/\bgit\b/i, "git-scm.com"],
  [/\bjira\b|confluence|atlassian/i, "atlassian.com"],
  [/figma/i, "figma.com"],
  [/tableau/i, "tableau.com"],
  [/pytorch/i, "pytorch.org"],
  [/tensorflow/i, "tensorflow.org"],
  [/pandas/i, "pandas.pydata.org"],
  [/scikit-learn|sklearn/i, "scikit-learn.org"],
  [/langchain/i, "langchain.com"],
  [/hugging ?face/i, "huggingface.co"],
  [/\bjava\b/i, "java.com"],
  [/\bphp\b/i, "php.net"],
  [/ruby on rails|\brails\b/i, "rubyonrails.org"],
  [/\bruby\b/i, "ruby-lang.org"],
  [/\brust\b/i, "rust-lang.org"],
  [/\bgolang\b|\bgo \(lang/i, "go.dev"],
  [/\bswift\b/i, "swift.org"],
  [/kotlin/i, "kotlinlang.org"],
  [/flutter/i, "flutter.dev"],
  [/vercel/i, "vercel.com"],
  [/datadog/i, "datadoghq.com"],
  [/grafana/i, "grafana.com"],
  [/jenkins/i, "jenkins.io"],
  [/ansible/i, "ansible.com"],
];

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** The company or tool a piece of text names first ("AZ-104 … or Google Cloud …" → Microsoft). */
export function brandSite(text: string | null | undefined): string | null {
  if (!text) return null;
  let best: { at: number; site: string } | null = null;
  for (const [re, site] of BRANDS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at)) best = { at: m.index, site };
  }
  return best?.site ?? null;
}

/** A website the coach gave, if it's a plain domain. */
export function validDomain(given: string | null | undefined): string | null {
  const d = (given ?? "").trim().toLowerCase();
  return DOMAIN.test(d) && d.length <= 100 ? d : null;
}

/** An awarding body's website: the one the coach named if it's a plain domain, else from the list. */
export function issuerSite(issuer: string, name: string, given?: string | null): string | null {
  return validDomain(given) ?? brandSite(issuer) ?? brandSite(name);
}

/* ── Asking the coach ─────────────────────────────────────────────────────── */

const STORE_KEY = "faircopy.brandSites";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_KEPT = 800;

type Entry = { d: string | null; t: number };

/** How a name is filed: trimmed, spaces collapsed, lower case (the coach files it the same way). */
const keyOf = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 300);

function load(): Record<string, Entry> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, Entry>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, e]) => e && now - e.t < KEEP_MS));
  } catch {
    return {};
  }
}

let store: Record<string, Entry> | null = null;
const known = () => (store ??= load());

function save(): void {
  try {
    const newest = Object.entries(known())
      .sort((a, b) => b[1].t - a[1].t)
      .slice(0, MAX_KEPT);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    /* storage blocked: the coach is just asked again next visit */
  }
}

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getVersion = () => version;

const queued = new Map<string, string>();
const asking = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Queue a name; everything queued in the same moment goes in one request (40 at most). */
function ask(text: string): void {
  const key = keyOf(text);
  if (!key || !CAREER_COACH_AVAILABLE) return;
  const hit = known()[key];
  if ((hit && Date.now() - hit.t < KEEP_MS) || asking.has(key) || queued.has(key)) return;
  queued.set(key, text.trim().slice(0, 300));
  timer ??= setTimeout(flush, 80);
}

async function flush(): Promise<void> {
  timer = null;
  const batch = [...queued.entries()].slice(0, 40);
  batch.forEach(([key]) => {
    queued.delete(key);
    asking.add(key);
  });
  if (queued.size) timer = setTimeout(flush, 80);
  try {
    const { sites } = await careerCoach.brandSites(batch.map(([, name]) => name));
    const now = Date.now();
    for (const [key, name] of batch) {
      if (name in sites) known()[key] = { d: validDomain(sites[name]), t: now };
    }
    save();
    version += 1;
    listeners.forEach((l) => l());
  } catch {
    /* coach unavailable or not signed in: the list stands in, and it's asked again next visit */
  } finally {
    batch.forEach(([key]) => asking.delete(key));
  }
}

/**
 * The coach's answer for a name: a website, null for "no organisation", or
 * undefined while it isn't known yet. Pass null to skip asking.
 */
export function useBrandSite(text: string | null | undefined): string | null | undefined {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(() => {
    if (text) ask(text);
  }, [text]);
  if (!text) return undefined;
  return known()[keyOf(text)]?.d;
}

export const logoUrl = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

/** "Amazon Web Services" → "AW"; "CompTIA" → "CO". */
export function initials(text: string): string {
  const words = text.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  const two = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
  return two.toUpperCase();
}
