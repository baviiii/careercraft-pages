import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users, GraduationCap, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Investment {
  title: string;
  amount: string;
  sector: string;
  impact: string;
  icon: React.ReactNode;
  source: string;
}

const investments: Investment[] = [
  {
    title: "Health & Medical Research",
    amount: "$2.4B",
    sector: "Healthcare",
    impact: "15,000+ new jobs projected",
    icon: <Users className="w-5 h-5" />,
    source: "2025-26 SA Budget",
  },
  {
    title: "Defence Industry Growth",
    amount: "$1.8B",
    sector: "Defence",
    impact: "Naval shipbuilding expansion",
    icon: <Building2 className="w-5 h-5" />,
    source: "2025-26 SA Budget",
  },
  {
    title: "Renewable Energy Transition",
    amount: "$890M",
    sector: "Energy",
    impact: "Green hydrogen initiatives",
    icon: <TrendingUp className="w-5 h-5" />,
    source: "Climate Action Plan",
  },
  {
    title: "Skills & Training Boost",
    amount: "$450M",
    sector: "Education",
    impact: "TAFE SA modernisation",
    icon: <GraduationCap className="w-5 h-5" />,
    source: "Workforce Strategy",
  },
];

export function InvestmentHighlights() {
  return (
    <div className="card-intelligence p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-authority flex items-center justify-center shadow-lg shadow-primary/20">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">Government Investment</h2>
          <p className="text-sm text-muted-foreground">Key funding signals for careers</p>
        </div>
        <Link to="/australian-jobs">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {investments.map((investment, index) => (
          <motion.div
            key={investment.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-premium group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-premium">
              {investment.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">{investment.title}</h3>
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-accent-gold bg-accent-gold/10 rounded-full">
                  {investment.amount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{investment.impact}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{investment.source}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
