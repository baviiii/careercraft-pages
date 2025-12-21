import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { IntelligenceLayout } from "@/components/intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  FileText,
  ExternalLink,
  DollarSign,
  Building2,
  GraduationCap,
  Briefcase,
  Zap,
  Heart,
  Factory,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Treemap } from "recharts";

const budgetData = [
  { name: "Healthcare", value: 8.2, growth: 12, color: "hsl(346, 77%, 50%)" },
  { name: "Education", value: 5.4, growth: 8, color: "hsl(262, 83%, 58%)" },
  { name: "Infrastructure", value: 4.1, growth: 15, color: "hsl(25, 95%, 53%)" },
  { name: "Defence", value: 3.8, growth: 22, color: "hsl(215, 70%, 50%)" },
  { name: "Clean Energy", value: 2.6, growth: 45, color: "hsl(142, 71%, 45%)" },
  { name: "Technology", value: 1.9, growth: 28, color: "hsl(200, 98%, 48%)" },
  { name: "Social Services", value: 1.5, growth: 5, color: "hsl(340, 75%, 55%)" },
];

const investmentTimeline = [
  { year: "2021-22", total: 18.2, healthcare: 6.8, education: 4.2, energy: 1.2 },
  { year: "2022-23", total: 21.5, healthcare: 7.2, education: 4.8, energy: 1.8 },
  { year: "2023-24", total: 24.1, healthcare: 7.8, education: 5.1, energy: 2.2 },
  { year: "2024-25", total: 26.3, healthcare: 8.0, education: 5.3, energy: 2.5 },
  { year: "2025-26", total: 28.5, healthcare: 8.2, education: 5.4, energy: 2.6 },
];

const policyConnections = [
  {
    policy: "SA Workforce Strategy 2024",
    investment: "$450M",
    skills: ["Digital Literacy", "Green Skills", "Healthcare"],
    jobs: 12500,
    icon: Briefcase,
  },
  {
    policy: "Education Future Fund",
    investment: "$280M",
    skills: ["STEM", "Vocational Training", "Languages"],
    jobs: 8200,
    icon: GraduationCap,
  },
  {
    policy: "Hydrogen Jobs Plan",
    investment: "$593M",
    skills: ["Engineering", "Technical Trades", "Safety"],
    jobs: 4100,
    icon: Zap,
  },
  {
    policy: "Health Workforce Plan",
    investment: "$1.2B",
    skills: ["Nursing", "Allied Health", "Mental Health"],
    jobs: 15600,
    icon: Heart,
  },
  {
    policy: "Advanced Manufacturing",
    investment: "$380M",
    skills: ["Automation", "Robotics", "Quality Control"],
    jobs: 3800,
    icon: Factory,
  },
];

const careerPathways = [
  { from: "Government Investment", to: "Skills Programs", value: 100 },
  { from: "Skills Programs", to: "TAFE SA Courses", value: 60 },
  { from: "Skills Programs", to: "University Pathways", value: 40 },
  { from: "TAFE SA Courses", to: "Apprenticeships", value: 35 },
  { from: "TAFE SA Courses", to: "Direct Employment", value: 25 },
  { from: "University Pathways", to: "Graduate Programs", value: 30 },
  { from: "Apprenticeships", to: "Skilled Workforce", value: 35 },
  { from: "Graduate Programs", to: "Skilled Workforce", value: 30 },
  { from: "Direct Employment", to: "Skilled Workforce", value: 25 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function PolicyVisualizer() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("2025-26");
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <IntelligenceLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </IntelligenceLayout>
    );
  }

  return (
    <IntelligenceLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <FileText className="w-3 h-3 mr-1" />
                  Policy Data
                </Badge>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Policy & Investment Visualizer
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Understand how SA Government investments translate into skills, jobs, and career opportunities.
                Data sourced from official budget documents and workforce strategies.
              </p>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {investmentTimeline.map(y => (
                  <SelectItem key={y.year} value={y.year}>{y.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Budget Overview */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent-gold" />
                Budget Allocation by Sector ({selectedYear})
              </CardTitle>
              <CardDescription>
                Billions AUD allocated to key sectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `$${val}B`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${value}B`, "Allocation"]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent-emerald" />
                Growth Leaders
              </CardTitle>
              <CardDescription>
                YoY investment growth by sector
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetData
                  .sort((a, b) => b.growth - a.growth)
                  .slice(0, 5)
                  .map((sector, i) => (
                    <div key={sector.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: sector.color }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{sector.name}</p>
                        <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(sector.growth / 50) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: sector.color }}
                          />
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        +{sector.growth}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Investment Timeline */}
        <motion.div variants={item}>
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>5-Year Investment Trajectory</CardTitle>
              <CardDescription>
                Historical and projected government spending across key sectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={investmentTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `$${val}B`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="healthcare" name="Healthcare" stackId="a" fill="hsl(346, 77%, 50%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="education" name="Education" stackId="a" fill="hsl(262, 83%, 58%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="energy" name="Clean Energy" stackId="a" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Policy to Career Connections */}
        <motion.div variants={item}>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Policy → Skills → Jobs Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policyConnections.map((policy) => {
              const isExpanded = expandedPolicy === policy.policy;
              return (
                <motion.div
                  key={policy.policy}
                  layout
                  className={cn(
                    "cursor-pointer",
                    isExpanded && "md:col-span-2 lg:col-span-3"
                  )}
                >
                  <Card
                    className={cn(
                      "transition-all duration-300",
                      isExpanded ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
                    )}
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.policy)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <policy.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{policy.policy}</h3>
                            <ChevronDown className={cn(
                              "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
                              isExpanded && "rotate-180"
                            )} />
                          </div>
                          <div className="flex items-center gap-4 text-sm mb-3">
                            <span className="text-accent-gold font-semibold">{policy.investment}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-accent-emerald">{policy.jobs.toLocaleString()} jobs</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {policy.skills.slice(0, isExpanded ? undefined : 2).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {!isExpanded && policy.skills.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{policy.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Investment Flow</p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">Policy</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Training</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Employment</span>
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Training Providers</p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">TAFE SA</Badge>
                                <Badge variant="outline" className="text-xs">UniSA</Badge>
                                <Badge variant="outline" className="text-xs">Adelaide Uni</Badge>
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Timeline</p>
                              <p className="text-sm font-medium">2024-2028 (4 year program)</p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <Button variant="default" size="sm" className="gap-2">
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Policy Document
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Info className="w-3.5 h-3.5" />
                              AI Summary
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Source Attribution */}
        <motion.div variants={item}>
          <Card className="glass border-border/50 bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>
                  Data sources: SA Budget Papers 2025-26, SA Workforce Strategy, SA Skills Commission Reports.
                  Last updated: December 2024.
                </span>
                <Button variant="link" size="sm" className="ml-auto text-primary p-0 h-auto">
                  View all sources →
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </IntelligenceLayout>
  );
}
