import { ReactNode } from "react";
import { IntelligenceNav } from "./IntelligenceNav";
import { IntelligenceProvider } from "@/contexts/IntelligenceContext";
import { cn } from "@/lib/utils";

interface IntelligenceLayoutProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function IntelligenceLayout({
  children,
  className,
  fullWidth = false
}: IntelligenceLayoutProps) {
  return (
    <IntelligenceProvider>
      <div className="min-h-screen bg-background">
        <IntelligenceNav />

        {/* Main Content Area */}
        <main className={cn(
          "lg:ml-72 min-h-screen",
          "pt-16 lg:pt-0", // Account for mobile header
          className
        )}>
          <div className={cn(
            "mx-auto",
            !fullWidth && "max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
          )}>
            {children}
          </div>
        </main>
      </div>
    </IntelligenceProvider>
  );
}
