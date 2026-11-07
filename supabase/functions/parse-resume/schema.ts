// The shape of a parsed résumé: one schema, two uses.
//
// 1. It is turned into a JSON schema and sent to Horus, so the model is asked
//    for exactly this shape (strings, booleans, lists) instead of "some JSON
//    object". zodToJsonSchema describes the type under each repair step, so
//    the model is still asked for a string where a string belongs. The last
//    test in schema_test.ts fails if that ever stops being true.
// 2. It checks what comes back, repairing the near-misses models make: a
//    bullet list where one string belongs, one string where a list belongs,
//    "85%" for confidence. A present value of the wrong JSON type is coerced;
//    a missing required field, or an object where text belongs, still fails,
//    so the retry can correct it.

import { z } from "npm:zod@3";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3";

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** String field. Arrays become one string. Objects are returned untouched so
    a real mismatch still fails and the retry can correct it. */
function textFromParts(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return blankToNull(value);
  if (!Array.isArray(value)) return value;

  const parts: string[] = [];
  let foreign = false;
  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item == null || item === "") return;
    if (typeof item === "string" || typeof item === "number") {
      const text = textFromParts(item);
      if (typeof text === "string") parts.push(text);
      return;
    }
    foreign = true;
  };
  value.forEach(visit);
  if (foreign) return value;
  return parts.length ? parts.join("\n") : null;
}

function coerceNullableText(value: unknown): unknown {
  const text = textFromParts(value);
  return text === null ? null : text;
}

function coerceRequiredText(value: unknown): unknown {
  if (value == null) return value;
  const text = textFromParts(value);
  if (text === null) return "";
  return text;
}

function coerceStringList(value: unknown): unknown {
  if (value == null || value === "") return [];
  if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
    const text = textFromParts(value);
    return typeof text === "string" ? [text] : [];
  }
  if (!Array.isArray(value)) return value;
  if (value.some((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return value;
  }

  const items: string[] = [];
  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    const text = textFromParts(item);
    if (typeof text === "string") items.push(text);
  };
  value.forEach(visit);
  return items;
}

function coerceBool(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "y", "current", "present"].includes(text)) return true;
    if (["false", "no", "n", ""].includes(text)) return false;
  }
  if (value == null) return false;
  return value;
}

function coerceConfidence(value: unknown): unknown {
  if (value == null || value === "") return value;
  let numeric: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) numeric = value;
  else if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/%$/, ""));
    if (Number.isFinite(parsed)) numeric = parsed;
  }
  if (numeric == null) return 0.5;
  const scaled = numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, scaled));
}

function coerceObjectList(value: unknown): unknown {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.filter((item) => item != null && item !== "");
  if (typeof value === "object") return [value];
  return value;
}

/** A list of objects sometimes comes back as one object, or as plain strings. */
function coerceEntries(value: unknown, primaryKey: string): unknown {
  if (typeof value === "string" || typeof value === "number") {
    const text = blankToNull(String(value));
    return text ? [{ [primaryKey]: text }] : [];
  }
  const list = coerceObjectList(value);
  if (!Array.isArray(list) || list.length === 0) return list;
  if (!list.every((item) => typeof item === "string" || typeof item === "number")) return list;
  return list.flatMap((item) => {
    const text = blankToNull(String(item));
    return text ? [{ [primaryKey]: text }] : [];
  });
}

function coerceSkills(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "number") {
    const items = coerceStringList(value);
    return Array.isArray(items) && items.length ? [{ category: "Skills", items }] : [];
  }
  const list = coerceObjectList(value);
  if (!Array.isArray(list) || list.length === 0) return list;
  if (!list.every((item) => typeof item === "string" || typeof item === "number")) return list;
  const items = coerceStringList(list);
  return Array.isArray(items) && items.length ? [{ category: "Skills", items }] : [];
}

const nullableText = () =>
  z.preprocess(coerceNullableText, z.string().nullable()).default(null);

const requiredText = () => z.preprocess(coerceRequiredText, z.string());

const stringList = () =>
  z.preprocess(coerceStringList, z.array(z.string())).default([]);

const flag = () => z.preprocess(coerceBool, z.boolean()).default(false);

function entries<T extends z.ZodRawShape>(shape: T, primaryKey?: string) {
  const item = z.object(shape);
  const coerce = (value: unknown) =>
    primaryKey ? coerceEntries(value, primaryKey) : coerceObjectList(value);
  return z.preprocess(coerce, z.array(item)).default([]);
}

export const ParsedResumeSchema = z.object({
  personalInfo: z.object({
    fullName: nullableText(),
    email: nullableText(),
    phone: nullableText(),
    location: nullableText().describe("city, state/country"),
    linkedin: nullableText(),
    website: nullableText(),
    summary: nullableText().describe("Professional summary / objective text"),
  }),
  workExperience: entries({
    company: requiredText(),
    title: requiredText(),
    location: nullableText(),
    startDate: nullableText().describe("YYYY-MM or YYYY"),
    endDate: nullableText().describe("YYYY-MM or YYYY; null when current"),
    current: flag(),
    bullets: stringList(),
  }),
  education: entries({
    institution: requiredText(),
    degree: requiredText(),
    field: nullableText(),
    startDate: nullableText(),
    endDate: nullableText(),
    gpa: nullableText(),
    achievements: stringList(),
  }),
  skills: z.preprocess(coerceSkills, z.array(z.object({
    category: requiredText(),
    items: stringList(),
  }))).default([]),
  certifications: entries({
    name: requiredText(),
    issuer: nullableText(),
    date: nullableText(),
    expiryDate: nullableText(),
  }, "name"),
  languages: entries({
    language: requiredText(),
    proficiency: nullableText(),
  }, "language"),
  projects: entries({
    name: requiredText(),
    description: nullableText(),
    technologies: stringList(),
    url: nullableText(),
  }, "name"),
  references: entries({
    name: requiredText(),
    title: nullableText(),
    company: nullableText(),
    phone: nullableText(),
    email: nullableText(),
    relationship: nullableText(),
  }, "name"),
  awards: entries({
    title: requiredText(),
    issuer: nullableText(),
    date: nullableText(),
    description: nullableText(),
  }, "title"),
  volunteer: entries({
    role: requiredText(),
    organization: requiredText(),
    location: nullableText(),
    startDate: nullableText(),
    endDate: nullableText(),
    current: flag(),
    description: nullableText(),
  }),
  publications: entries({
    title: requiredText(),
    publisher: nullableText(),
    date: nullableText(),
    url: nullableText(),
    description: nullableText(),
  }, "title"),
  confidence: z.preprocess(coerceConfidence, z.number().min(0).max(1)),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

/* Sent with every parse, so the model fills exactly this shape instead of
   "some JSON object" — with no shape, a long answer can stop after its first
   section. */
const { $schema: _draft, ...PARSED_RESUME_JSON_SCHEMA } = zodToJsonSchema(ParsedResumeSchema, {
  $refStrategy: "none",
}) as Record<string, unknown>;

export { PARSED_RESUME_JSON_SCHEMA };
