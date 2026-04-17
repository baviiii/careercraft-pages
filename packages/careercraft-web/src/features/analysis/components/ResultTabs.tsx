import {
  AlertTriangle,
  BriefcaseIcon,
  FileCheck,
  FileOutput,
  LayoutGrid,
  Lightbulb,
  Search,
  Wand2,
} from "lucide-react";

import type { ResultTab, ResultTabId } from "../types";

const TABS: ResultTab[] = [
  { id: "overview", icon: LayoutGrid, label: "Overview" },
  { id: "requirements", icon: BriefcaseIcon, label: "Job Brief" },
  { id: "keywords", icon: Search, label: "Keywords" },
  { id: "quality", icon: FileCheck, label: "Writing" },
  { id: "redflags", icon: AlertTriangle, label: "Red Flags" },
  { id: "improvements", icon: Lightbulb, label: "Redlines" },
  { id: "enhance", icon: Wand2, label: "Rewrite" },
  { id: "coverletter", icon: FileOutput, label: "Cover Letter" },
];

interface ResultTabsProps {
  active: ResultTabId;
  onChange: (id: ResultTabId) => void;
}

export const ResultTabs = ({ active, onChange }: ResultTabsProps) => (
  <nav className="border-y border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] mt-8">
    <div className="flex overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-5 py-3 cc-label whitespace-nowrap border-r border-[color:var(--cc-hair-strong)] transition-colors ${
              isActive
                ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                : "text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  </nav>
);
