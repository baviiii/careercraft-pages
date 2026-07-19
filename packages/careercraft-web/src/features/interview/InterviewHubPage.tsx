/**
 * Interview Prep hub — the calm side of the product. Overview, new session,
 * history, resources, plus the career-development panels. The live interview
 * itself happens in the full-screen room (/interview-prep/room).
 */
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import CraftAppLayout from "@/components/craft/CraftAppLayout";
import InterviewDashboard from "@/components/interview/InterviewDashboard";
import CareerProfilePanel from "@/components/career-dev/CareerProfilePanel";
import CareerGuidancePanel from "@/components/career-dev/CareerGuidancePanel";
import CertificationsPanel from "@/components/career-dev/CertificationsPanel";
import StudyPanel from "@/components/career-dev/StudyPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { ResourcesPanel } from "./components/ResourcesPanel";
import { SetupPanel } from "./components/SetupPanel";

type HubTab =
  | "overview"
  | "practice"
  | "history"
  | "resources"
  | "profile"
  | "career-coach"
  | "certifications"
  | "study";

const TABS: Array<{ id: HubTab; label: string; group: "prep" | "career" }> = [
  { id: "overview", label: "Overview", group: "prep" },
  { id: "practice", label: "New session", group: "prep" },
  { id: "history", label: "History", group: "prep" },
  { id: "resources", label: "Resources", group: "prep" },
  { id: "profile", label: "Profile", group: "career" },
  { id: "career-coach", label: "Career coach", group: "career" },
  { id: "certifications", label: "Certifications", group: "career" },
  { id: "study", label: "Study", group: "career" },
];

/** Old deep links (?tab=setup / ?tab=dashboard / ?tab=interview) still land somewhere sane. */
const LEGACY_TABS: Record<string, HubTab> = {
  dashboard: "overview",
  setup: "practice",
  interview: "practice",
  evaluation: "history",
};

function resolveTab(param: string | null): HubTab {
  if (!param) return "overview";
  if (TABS.some((t) => t.id === param)) return param as HubTab;
  return LEGACY_TABS[param] ?? "overview";
}

export default function InterviewHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveTab(searchParams.get("tab"));

  // Normalize legacy tab params in the URL once resolved.
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw && raw !== tab) setSearchParams({ tab }, { replace: true });
  }, [searchParams, tab, setSearchParams]);

  const setTab = (next: HubTab) => setSearchParams(next === "overview" ? {} : { tab: next });

  const groups = useMemo(
    () => [
      { label: "Prep", items: TABS.filter((t) => t.group === "prep") },
      { label: "Career", items: TABS.filter((t) => t.group === "career") },
    ],
    [],
  );

  return (
    <CraftAppLayout>
      {/* Masthead */}
      <div className="mb-8 border-b border-[color:var(--cc-ink)] pb-6">
        <p className="cc-label mb-3 text-[color:var(--cc-rust)]">Interview prep</p>
        <h1 className="cc-font-display text-4xl tracking-tight text-[color:var(--cc-ink)] md:text-5xl">
          Practice like it counts
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
          Structured mock interviews that adapt to how you answer, then a debrief that tells you
          exactly what to fix.
        </p>
      </div>

      {/* Tab nav */}
      <nav className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[color:var(--cc-hair-strong)]">
        {groups.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-x-6">
            {gi > 0 && <span className="hidden h-4 w-px bg-[color:var(--cc-hair-strong)] md:block" />}
            {group.items.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    "cc-label-sm -mb-px border-b-2 pb-3 transition-colors",
                    active
                      ? "border-[color:var(--cc-rust)] text-[color:var(--cc-rust)]"
                      : "border-transparent text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {tab === "overview" && <InterviewDashboard />}
      {tab === "practice" && <SetupPanel />}
      {tab === "history" && <HistoryPanel />}
      {tab === "resources" && <ResourcesPanel />}
      {tab === "profile" && <CareerProfilePanel onNavigate={(t) => setTab(resolveTab(t))} />}
      {tab === "career-coach" && <CareerGuidancePanel />}
      {tab === "certifications" && <CertificationsPanel />}
      {tab === "study" && <StudyPanel />}
    </CraftAppLayout>
  );
}
