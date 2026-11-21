/* One role's market figures from job-news (market_snapshot), for Market
   news' "Your market" and the market band on Browse jobs. The function
   keeps each role for a day for everyone; this keeps the answer for the
   visit too, so moving between the two pages, or searching the same role
   in another city, doesn't ask again. */

import { supabase } from "@/integrations/supabase/client";
import { asQuotaError, quotaMessage, readErrorBody } from "@/lib/quota";
import { sanitize } from "@/lib/security/sanitizers";

import { roleKey, type MarketSnapshot } from "./market";

/** How long an answer is reused in this tab. */
const KEEP_MS = 30 * 60 * 1000;

const kept = new Map<string, { at: number; answer: Promise<MarketSnapshot> }>();

/** job-news has paused new lookups (its ration, so job search keeps the job
    board's allowance). Roles looked up before still answer. */
export class MarketResting extends Error {}

/** The person's own allowance for job and market data is spent; the message says which and why. */
export class MarketQuota extends Error {}

export function loadMarketSnapshot(role: string): Promise<MarketSnapshot> {
  const query = sanitize(role.trim(), { maxLength: 120, sqlSafe: false });
  const key = roleKey(query);
  // Answers past their time go, so a tab open all day doesn't keep them all.
  for (const [k, entry] of kept) if (Date.now() - entry.at >= KEEP_MS) kept.delete(k);
  const hit = kept.get(key);
  if (hit) return hit.answer;

  const answer = (async () => {
    const { data, error } = await supabase.functions.invoke("job-news", {
      body: { action: "market_snapshot", query },
    });
    if (error) {
      if ((await readErrorBody(error))?.code === "MARKET_RESTING") throw new MarketResting(error.message);
      const quota = await asQuotaError(error);
      if (quota) throw new MarketQuota(quotaMessage(quota));
      throw error;
    }
    return data as MarketSnapshot;
  })();
  kept.set(key, { at: Date.now(), answer });
  // A failure isn't kept: the next ask tries again.
  answer.catch(() => {
    if (kept.get(key)?.answer === answer) kept.delete(key);
  });
  return answer;
}
