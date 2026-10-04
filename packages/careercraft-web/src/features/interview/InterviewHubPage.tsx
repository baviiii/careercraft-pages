/**
 * Interview Prep hub — practice-only.
 * Home (hero + start) · History · Resources. Career lives at /career-coach.
 * Live session: /interview-prep/room
 */
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Compass,
  History,
  Home,
  Library,
  UserCircle,
} from "lucide-react";
import CraftAppLayout from "@/components/craft/CraftAppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveRole } from "@/hooks/useActiveRole";
import ActiveRoleProvider from "@/components/career-dev/ActiveRoleProvider";
import TargetRoleChip from "@/components/career-dev/TargetRoleChip";
import InterviewHome from "@/components/interview/InterviewDashboard";
import { HistoryPanel } from "./components/HistoryPanel";
import { ResourcesPanel } from "./components/ResourcesPanel";
import { SetupPanel } from "./components/SetupPanel";
import CareerProfilePanel from "@/components/career-dev/CareerProfilePanel";
import CareerGuidancePanel from "@/components/career-dev/CareerGuidancePanel";
import CertificationsPanel from "@/components/career-dev/CertificationsPanel";
import StudyPanel from "@/components/career-dev/StudyPanel";

type HubTab =
  | "home"
  | "history"
  | "resources"
  | "profile"
  | "guidance"
  | "certifications"
  | "study";

/**
 * Practice first, then the long game. The career/study tabs are the MCP's
 * career.* and study.* tools — they live here rather than on their own route so
 * there's one destination for "getting ready", and no name collision with
 * /career-coach (the SA Government document chat, a different system entirely).
 */
const TABS: Array<{ id: HubTab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "history", label: "History", icon: History },
  { id: "resources", label: "Resources", icon: Library },
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "guidance", label: "Guidance", icon: Compass },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "study", label: "Study", icon: BookOpen },
];

/** Old deep links still land somewhere sane. */
const LEGACY_TABS: Record<string, HubTab> = {
  overview: "home",
  dashboard: "home",
  practice: "home",
  setup: "home",
  interview: "home",
  evaluation: "history",
  "career-coach": "guidance",
  roadmap: "guidance",
  certs: "certifications",
  learning: "study",
  pathway: "study",
};

const ease = [0.2, 0.8, 0.2, 1] as const;

function resolveTab(param: string | null): HubTab {
  if (!param) return "home";
  if (TABS.some((t) => t.id === param)) return param as HubTab;
  return LEGACY_TABS[param] ?? "home";
}

export default function InterviewHubPage() {
  return (
    <ActiveRoleProvider>
      <InterviewHub />
    </ActiveRoleProvider>
  );
}

function InterviewHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveTab(searchParams.get("tab"));
  const sessionId = searchParams.get("session");
  // One role for every tab: the profile's (from getting-started), or a just-this-once pick.
  const { role, level } = useActiveRole();
  const field = role ?? undefined;
  const seniority = level ?? undefined;
  // Every tab's results belong to one job (and level). Keying the panels on it
  // rebuilds them when it changes, so neither old results nor a request still
  // in flight for the old job can land under the new one.
  const roleKey = `${field ?? ""}|${seniority ?? ""}`;

  // Normalize legacy tab params in the URL.
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw && raw !== tab) {
      const next = new URLSearchParams(searchParams);
      if (tab === "home") next.delete("tab");
      else next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, tab, setSearchParams]);

  const setTab = (next: HubTab) => {
    const params = new URLSearchParams();
    if (next !== "home") params.set("tab", next);
    // Drop session when leaving history
    if (next === "history" && sessionId) params.set("session", sessionId);
    setSearchParams(params);
  };

  const scrollToSetup = () => {
    setTab("home");
    requestAnimationFrame(() => {
      document.getElementById("interview-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <CraftAppLayout
      topBarLeft={<div className="cc-label-sm text-[color:var(--cc-ash)]">Interview prep</div>}
      headerActions={
        <button type="button" onClick={scrollToSetup} className="cc-action cc-action--sm">
          Start practice <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        className="cc-hero text-[color:var(--cc-ink)]"
      >
        <div className="relative px-6 pb-8 pt-8 md:px-10 md:pt-10">
          <div className="cc-eyebrow cc-tone-cobalt">Judgment-free reps</div>
          <h1 className="mt-5 max-w-2xl cc-font-display text-[2.4rem] leading-[0.96] tracking-[-0.035em] md:text-[3.1rem]">
            Practice like it{" "}
            <span className="cc-italic-wonk text-[color:var(--cc-rust)]">counts.</span>
          </h1>
          <p className="mt-4 max-w-lg cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
            Pick a situation, sit the loop, then read a debrief that tells you exactly what to fix.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={scrollToSetup} className="cc-action">
              Practice your first interview
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className="cc-action cc-action--ghost"
            >
              View history
            </button>
          </div>
        </div>
      </motion.section>

      <div className="mt-8">
        <TargetRoleChip />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as HubTab)} className="mt-6 pb-16">
        <TabsList className="cc-tabs sticky top-2 z-20 h-auto justify-start p-[0.35rem]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="cc-tab rounded-[0.85rem] shadow-none data-[state=active]:bg-[color:var(--cc-rust-soft)] data-[state=active]:text-[color:var(--cc-rust-deep)] data-[state=active]:shadow-none"
            >
              <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="home" className="cc-tabs-panel mt-6 space-y-8 focus-visible:ring-0">
          <div id="interview-setup">
            <SetupPanel key={roleKey} role={field} level={seniority} />
          </div>
          <InterviewHome
            onOpenHistory={(id) => {
              const params = new URLSearchParams({ tab: "history" });
              if (id) params.set("session", id);
              setSearchParams(params);
            }}
            onStartPractice={scrollToSetup}
          />
        </TabsContent>

        <TabsContent value="history" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <HistoryPanel
            highlightId={sessionId}
            onStartPractice={scrollToSetup}
          />
        </TabsContent>

        <TabsContent value="resources" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <ResourcesPanel key={roleKey} field={field} />
        </TabsContent>

        <TabsContent value="profile" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <CareerProfilePanel onNavigate={(next) => setTab(resolveTab(next))} />
        </TabsContent>

        <TabsContent value="guidance" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <CareerGuidancePanel key={roleKey} field={field} />
        </TabsContent>

        <TabsContent value="certifications" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <CertificationsPanel key={roleKey} field={field} level={seniority} />
        </TabsContent>

        <TabsContent value="study" className="cc-tabs-panel mt-6 focus-visible:ring-0">
          <StudyPanel key={roleKey} field={field} />
        </TabsContent>
      </Tabs>
    </CraftAppLayout>
  );
}
