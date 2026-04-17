/* ───────────────────────────────────────────────────────────
   AstralTabs — minimal accessible pill tab control.
   Usage:
     <AstralTabs
       value={activeTab}
       onChange={setActiveTab}
       items={[
         { id: "overview", label: "Overview", icon: <LayoutDashboard/> },
         ...
       ]}
     />
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode } from "react";

export interface AstralTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface AstralTabsProps {
  value: string;
  onChange: (id: string) => void;
  items: AstralTabItem[];
  className?: string;
}

export const AstralTabs = memo(function AstralTabs({
  value,
  onChange,
  items,
  className = "",
}: AstralTabsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`as-tabs ${className}`}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            data-state={active ? "active" : "inactive"}
            className="as-tab"
            onClick={() => onChange(item.id)}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && <span className="ml-1">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
});
