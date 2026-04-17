import { CraftAppStats } from "@/components/craft/AppPrimitives";

interface JobStatsStripProps {
  total: number;
  applied: number;
  interview: number;
  offer: number;
}

/** Four-up editorial stats strip for the job tracker. */
export const JobStatsStrip = ({
  total,
  applied,
  interview,
  offer,
}: JobStatsStripProps) => (
  <CraftAppStats
    stats={[
      { label: "Total on the ledger", value: total, note: "logged" },
      { label: "Dispatches sent", value: applied, note: "awaiting" },
      { label: "Replies received", value: interview, note: "in play" },
      { label: "Offers on the table", value: offer, note: "decide" },
    ]}
  />
);
