/**
 * Save · Started · Done on one resource, and a 1–5 rating once it's done.
 *
 * The coach records it (track_resource_progress, by link), and finishing a
 * resource counts once towards the skill it was recommended for. Finished
 * links stop being recommended. The buttons change straight away and go back
 * if the save fails.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Play, Star } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { careerCoach } from "@/lib/careerCoach";

import { MY_RESOURCES_KEY, type ResourceStatus } from "../lib/practiceData";

const STEPS: Array<{ id: ResourceStatus; label: string; icon: typeof Bookmark }> = [
  { id: "saved", label: "Save", icon: Bookmark },
  { id: "in_progress", label: "Started", icon: Play },
  { id: "completed", label: "Done", icon: Check },
];

export interface TrackableResource {
  url: string;
  title: string;
  provider?: string;
  /** The skill finishing it counts towards. */
  skill?: string;
}

export function ResourceProgress({
  resource,
  status: initialStatus,
  rating: initialRating = null,
}: {
  resource: TrackableResource;
  status?: ResourceStatus;
  rating?: number | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ResourceStatus | undefined>(initialStatus);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [busy, setBusy] = useState(false);

  // Their saved list can arrive after the card renders; take it when it does.
  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);
  useEffect(() => {
    if (initialRating !== null) setRating(initialRating);
  }, [initialRating]);

  const save = async (next: ResourceStatus, nextRating?: number) => {
    if (busy) return;
    const before = { status, rating };
    setStatus(next);
    if (nextRating !== undefined) setRating(nextRating);
    setBusy(true);
    try {
      const r = await careerCoach.trackResourceProgress({
        url: resource.url,
        title: resource.title,
        provider: resource.provider,
        skill: resource.skill,
        status: next,
        ...(nextRating !== undefined ? { rating: nextRating } : {}),
      });
      if (!r.persisted) throw new Error("not saved");
      if (r.skillsCredited.length) {
        toast({ title: "Marked as done", description: `Counted towards ${r.skillsCredited.join(", ")}.` });
      }
      void queryClient.invalidateQueries({ queryKey: MY_RESOURCES_KEY });
    } catch {
      setStatus(before.status);
      setRating(before.rating);
      toast({ title: "Couldn't save that", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div role="group" aria-label={`Your progress on ${resource.title}`} className="inline-flex overflow-hidden rounded-[0.7rem] border border-[color:var(--cc-hair-strong)]">
        {STEPS.map(({ id, label, icon: Icon }) => {
          const on = status === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() => void save(id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                on
                  ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                  : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {status === "completed" && (
        <div role="group" aria-label="Rate it" className="inline-flex items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              aria-label={`${n} out of 5`}
              aria-pressed={rating === n}
              onClick={() => void save("completed", n)}
              className="p-0.5 text-[color:var(--cc-wheat-deep)] disabled:opacity-60"
            >
              <Star className={`h-3.5 w-3.5 ${rating !== null && n <= rating ? "fill-current" : ""}`} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
