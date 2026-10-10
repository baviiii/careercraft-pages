import {
  AlertTriangle,
  BriefcaseIcon,
  FileCheck,
  FileOutput,
  LayoutGrid,
  ListChecks,
  PenLine,
  Search,
} from "lucide-react";

import type { ResultTab, ResultTabId } from "../types";

const TABS: ResultTab[] = [
  { id: "overview", icon: LayoutGrid, label: "Overview" },
  { id: "requirements", icon: BriefcaseIcon, label: "Job brief" },
  { id: "keywords", icon: Search, label: "Keywords" },
  { id: "quality", icon: FileCheck, label: "Writing" },
  { id: "redflags", icon: AlertTriangle, label: "Red flags" },
  { id: "improvements", icon: ListChecks, label: "Fixes" },
  { id: "enhance", icon: PenLine, label: "Rewrite" },
  { id: "coverletter", icon: FileOutput, label: "Cover letter" },
];

interface ResultTabsProps {
  active: ResultTabId;
  onChange: (id: ResultTabId) => void;
  /** Small count shown on a tab, e.g. keywords missing. Hidden at 0. */
  counts?: Partial<Record<ResultTabId, number>>;
}

export const ResultTabs = ({ active, onChange, counts = {} }: ResultTabsProps) => (
  <div className="sticky top-14 z-20 -mx-2 mt-8 bg-[rgba(247,247,244,0.88)] px-2 py-2 backdrop-blur-md">
    <nav className="cc-tabs" role="tablist" aria-label="Results">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`cc-tab ${isActive ? "is-active" : ""}`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {!!count && <span className="cc-tab__hint">{count}</span>}
          </button>
        );
      })}
    </nav>
  </div>
);
