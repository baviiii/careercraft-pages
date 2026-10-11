/* ───────────────────────────────────────────────────────────
   Jobs captured by the "Save to Faircopy" browser extension.

   The extension reads the job ad the user is looking at and opens
   /save-job#job=<base64url JSON>. The payload rides in the URL fragment,
   which browsers never send to a server, so the ad goes from their tab to
   their Faircopy tab and nowhere else. The extension holds no login: the
   web app saves it with its own session.

   /save-job is public, so a signed-out user doesn't lose the job on the way
   through sign-in: the payload waits in localStorage until the tracker picks
   it up.
   ─────────────────────────────────────────────────────────── */

import type { JobFormValues, JobType } from "../types";
import { JOB_TYPE_OPTIONS } from "../types";

export interface JobImport {
  title: string;
  company: string;
  location: string;
  workType: string;
  salary: string;
  url: string;
  description: string;
  /** Where it came from, e.g. "SEEK", "LinkedIn", or the site's host name. */
  source: string;
}

const KEY = "cc-pending-job-import";
const TTL_MS = 60 * 60 * 1000;

const LIMITS: Record<keyof JobImport, number> = {
  title: 200,
  company: 200,
  location: 200,
  workType: 60,
  salary: 120,
  url: 2000,
  description: 20_000,
  source: 60,
};

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.split("\u0000").join("").trim().slice(0, max) : "";

const safeUrl = (v: unknown) => {
  const s = clean(v, LIMITS.url);
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
};

/** Whitelist the fields, trim and cap them. Null when there's nothing usable. */
export function parseJobImport(raw: unknown): JobImport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const job: JobImport = {
    title: clean(r.title, LIMITS.title),
    company: clean(r.company, LIMITS.company),
    location: clean(r.location, LIMITS.location),
    workType: clean(r.workType, LIMITS.workType),
    salary: clean(r.salary, LIMITS.salary),
    url: safeUrl(r.url),
    description: clean(r.description, LIMITS.description),
    source: clean(r.source, LIMITS.source),
  };
  return job.title || job.description || job.url ? job : null;
}

/** Reads `#job=<base64url JSON>` (UTF-8). */
export function decodeJobImportHash(hash: string): JobImport | null {
  const match = hash.match(/(?:^#|&)job=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  try {
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return parseJobImport(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export function storePendingImport(job: JobImport): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ job, savedAt: Date.now() }));
  } catch {
    /* Private mode: the tracker just won't open pre-filled. */
  }
}

/** Reads and removes the pending import, if it's still fresh. */
export function takePendingImport(): JobImport | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { job, savedAt } = JSON.parse(raw) as { job: unknown; savedAt: number };
    if (typeof savedAt !== "number" || Date.now() - savedAt > TTL_MS) return null;
    return parseJobImport(job);
  } catch {
    return null;
  }
}

/* Boards say "Full time", "Full-time", "FULL_TIME" (schema.org) or
   "Contract/Temp". Only fill the field when it maps cleanly. */
function toJobType(workType: string): JobType | "" {
  const w = workType.toLowerCase().replace(/[_\s]+/g, "-");
  if (w.includes("part")) return "part-time";
  if (w.includes("full")) return "full-time";
  if (w.includes("contract") || w.includes("temp")) return "contract";
  const match = JOB_TYPE_OPTIONS.find((o) => w.includes(o.value));
  return match ? match.value : "";
}

/** The Add Job form, filled from a captured ad. Lands in Saved, not Applied. */
export function importToForm(job: JobImport): Partial<JobFormValues> {
  return {
    jobTitle: job.title,
    company: job.company,
    jobLocation: job.location,
    salaryRange: job.salary,
    jobType: toJobType(job.workType),
    jobUrl: job.url,
    jobDescription: job.description,
    status: "saved",
  };
}
