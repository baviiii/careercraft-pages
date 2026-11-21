/* Which state or territory a searched place is in, so the market band can
   point at it ("312 in SA"), and where each one sits on the band's small
   tile map of Australia. A place that names its state, or is a state's
   capital, gets one. Anything else (a suburb, a regional town) gets none
   rather than a guess, and the band says where most ads are instead. */

import { STATE_NAMES } from "@/features/market-news/lib/market";

export type StateCode = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

/** [column, row, rows tall] on a 4 × 4 grid, roughly where each sits on the
    map: WA two tiles tall down the west, Tasmania under Victoria. */
export const TILE_AT: Record<StateCode, [number, number, number?]> = {
  WA: [0, 0, 2],
  NT: [1, 0],
  SA: [1, 1],
  QLD: [2, 0],
  NSW: [2, 1],
  ACT: [3, 1],
  VIC: [2, 2],
  TAS: [2, 3],
};

export const isStateCode = (code: string): code is StateCode => Object.prototype.hasOwnProperty.call(TILE_AT, code);

/** Each state by name, and by short form: "south australia", "sa". */
const STATES = new Map<string, StateCode>();
const SHORT = new Map<string, StateCode>();
for (const [name, code] of STATE_NAMES) {
  if (!isStateCode(code)) continue;
  STATES.set(name, code);
  SHORT.set(code.toLowerCase(), code);
}

/** Each state's capital, and the other places the search box offers
    (SearchSentence's PLACES). */
const CITIES = new Map<string, StateCode>([
  ["sydney", "NSW"],
  ["melbourne", "VIC"],
  ["brisbane", "QLD"],
  ["perth", "WA"],
  ["adelaide", "SA"],
  ["hobart", "TAS"],
  ["canberra", "ACT"],
  ["darwin", "NT"],
  ["gold coast", "QLD"],
  ["newcastle", "NSW"],
]);

/** Words that only say which part of a city: "Sydney CBD", "Greater Perth". */
const AROUND = /\b(cbd|city|region|greater|metro|inner|outer)\b/g;

export function stateOfPlace(place: string): StateCode | null {
  // Postcodes and punctuation out ("Melbourne VIC 3000" is "melbourne vic"),
  // then each comma part, without a last "Australia".
  const parts = place
    .toLowerCase()
    .replace(/[^a-z\s,]/g, " ")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts[parts.length - 1] === "australia") parts.pop();
  if (parts.length === 0) return null;

  // A part that is a state: "Victoria", "Mackay, Queensland", "Bondi, NSW".
  for (const part of [...parts].reverse()) {
    const code = STATES.get(part) ?? SHORT.get(part);
    if (code) return code;
  }
  // A short form at the end: "Perth WA", "Sydney NSW". Short forms only:
  // "Mount Victoria" is in New South Wales.
  const last = parts[parts.length - 1].split(" ");
  const tail = SHORT.get(last[last.length - 1]);
  if (last.length > 1 && tail) return tail;
  // A city, or a part of one: "Sydney CBD", "North Sydney", "East Perth".
  const first = parts[0].replace(AROUND, " ").replace(/\s+/g, " ").trim();
  const city = CITIES.get(first);
  if (city) return city;
  for (const [name, code] of CITIES) if (first.endsWith(` ${name}`)) return code;
  return null;
}
