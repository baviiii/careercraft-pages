/* Building a study plan with the coach: the Study tab's plan form and the
   interview debrief's "Turn this into a study plan" both use this, so a
   plan is built, checked and reported the same way from either. */
import { useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { careerCoach, CoachUnavailableError, type Degradation, type LearningPathway } from "@/lib/careerCoach";

export interface BuiltPlan {
  id: string | null;
  pathway: LearningPathway;
  degraded: Degradation | null;
  description: string;
}

export function useBuild(onBuilt: (plan: BuiltPlan) => void) {
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);
  const build = async (input: { field?: string; explore?: string; weeks: number; hours: number }) => {
    setBuilding(true);
    try {
      const r = await careerCoach.getLearningPathway({
        field: input.field || undefined,
        explore: input.explore || undefined,
        weeks: input.weeks,
        hoursPerWeek: input.hours,
      });
      if (!r.pathway?.plan?.weeks?.length) {
        toast({ title: "No plan came back", description: "The coach answered without any weeks. Try again.", variant: "destructive" });
        return;
      }
      onBuilt({
        id: r.recommendationId,
        pathway: r.pathway,
        degraded: r._meta?.degraded ?? null,
        description: `${input.weeks}w · ${input.hours} h/week · ${r.pathway.field}`,
      });
    } catch (e) {
      toast({
        title: "Couldn't build a plan just now",
        description: e instanceof CoachUnavailableError ? e.message : "The coach didn't answer. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBuilding(false);
    }
  };
  return { building, build };
}
