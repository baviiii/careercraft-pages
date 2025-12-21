import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { IntelligenceLayout } from "@/components/intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  GraduationCap,
  DollarSign,
  MapPin,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

const trendData = [
  { month: "Jul", jobs: 4200, skills: 340, salary: 72000 },
  { month: "Aug", jobs: 4350, skills: 355, salary: 73500 },
  { month: "Sep", jobs: 4100, skills: 360, salary: 73200 },
  { month: "Oct", jobs: 4600, skills: 380, salary: 74100 },
  { month: "Nov", jobs: 4800, skills: 395, salary: 75200 },
  { month: "Dec", jobs: 4450, skills: 410, salary: 75800 },
];

const emergingRoles = [
  { title: "AI/ML Engineer", growth: "+245%", demand: "Very High", salary: "$145K", category: "Technology" },
  { title: "Renewable Energy Technician", growth: "+180%", demand: "High", salary: "$85K", category: "Energy" },
  { title: "Data Analyst", growth: "+120%", demand: "High", salary: "$95K", category: "Technology" },
  { title: "Cybersecurity Specialist", growth: "+95%", demand: "High", salary: "$130K", category: "Technology" },
  { title: "Healthcare Data Manager", growth: "+87%", demand: "Medium", salary: "$92K", category: "Healthcare" },
  { title: "Electric Vehicle Mechanic", growth: "+156%", demand: "Medium", salary: "$78K", category: "Trade" },
];

const decliningRoles = [
  { title: "Data Entry Clerk", decline: "-32%", risk: "High", reason: "Automation" },
  { title: "Retail Cashier", decline: "-28%", risk: "High", reason: "Self-checkout adoption" },
  { title: "Bank Teller", decline: "-24%", risk: "Medium", reason: "Digital banking" },
  { title: "Print Media Designer", decline: "-18%", risk: "Medium", reason: "Digital shift" },
];

const skillsTrending = [
  { name: "Python", growth: "+45%", category: "Technical" },
  { name: "Cloud Architecture", growth: "+38%", category: "Technical" },
  { name: "Project Management", growth: "+22%", category: "Business" },
  { name: "Data Visualization", growth: "+35%", category: "Technical" },
  { name: "Agile Methodology", growth: "+28%", category: "Business" },
  { name: "UX Design", growth: "+32%", category: "Creative" },
  { name: "Sustainability", growth: "+52%", category: "Emerging" },
  { name: "AI Literacy", growth: "+68%", category: "Emerging" },
];

const regionalShortages = [
  { region: "Adelaide Northern", roles: ["Aged Care Workers", "Nurses", "Teachers"], severity: "Critical" },
  { region: "Limestone Coast", roles: ["GPs", "Allied Health", "Trades"], severity: "High" },
  { region: "Riverland", roles: ["Agriculture Workers", "Engineers"], severity: "Medium" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function MarketTrends() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90");

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
                <TrendingUp className="w-6 h-6 text-primary" />
                <Badge variant="outline" className="border-accent-emerald/50 text-accent-emerald bg-accent-emerald/10">
                  <span className="w-1.5 h-1.5 bg-accent-emerald rounded-full mr-1.5 animate-pulse" />
                  Live
                </Badge>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Market Trends
              </h1>
              <p className="text-muted-foreground mt-2">
                Real-time analysis of job market movements, emerging skills, and workforce shifts in South Australia.
              </p>
            </div>
            <div className="flex gap-2">
              {["30", "90", "180"].map((days) => (
                <Button
                  key={days}
                  variant={timeRange === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(days)}
                >
                  {days}d
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Overview Charts */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Job Postings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area type="monotone" dataKey="jobs" stroke="hsl(var(--primary))" fill="url(#jobsGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Total Active</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  4,800 <TrendingUp className="w-3.5 h-3.5 text-accent-emerald" />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Skills in Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="skills" fill="hsl(var(--accent-emerald))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Trending Skills</span>
                <span className="font-semibold text-foreground">410+</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Salary Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, "Avg Salary"]}
                    />
                    <Line type="monotone" dataKey="salary" stroke="hsl(var(--accent-gold))" strokeWidth={2} dot={{ r: 3 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Avg. Change</span>
                <span className="font-semibold text-accent-gold flex items-center gap-1">
                  +5.3% <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="emerging" className="w-full">
            <TabsList className="w-full max-w-lg mb-6 bg-muted/50 p-1">
              <TabsTrigger value="emerging" className="flex-1 gap-2">
                <TrendingUp className="w-4 h-4" />
                Emerging Roles
              </TabsTrigger>
              <TabsTrigger value="declining" className="flex-1 gap-2">
                <TrendingDown className="w-4 h-4" />
                Declining Roles
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex-1 gap-2">
                <Zap className="w-4 h-4" />
                Skills Trending
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emerging">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emergingRoles.map((role, i) => (
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="group cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {role.category}
                          </Badge>
                          <Badge className="bg-accent-emerald/20 text-accent-emerald border-0">
                            {role.growth}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{role.title}</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Demand: {role.demand}</span>
                          <span className="font-medium text-foreground">{role.salary}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">AI insights available</span>
                          <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="declining">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decliningRoles.map((role, i) => (
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <Badge variant="outline" className="border-destructive/30 text-destructive">
                              {role.risk} Risk
                            </Badge>
                          </div>
                          <Badge className="bg-destructive/20 text-destructive border-0">
                            {role.decline}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{role.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Primary factor: {role.reason}
                        </p>
                        <Button variant="link" className="p-0 h-auto mt-3 text-primary">
                          View transition pathways →
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="skills">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {skillsTrending.map((skill, i) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="hover:border-primary/30 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <Badge variant="outline" className="mb-2 text-xs">
                          {skill.category}
                        </Badge>
                        <h3 className="font-semibold text-foreground">{skill.name}</h3>
                        <p className="text-lg font-bold text-accent-emerald mt-1">{skill.growth}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Regional Shortages */}
        <motion.div variants={item}>
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-destructive" />
                Regional Workforce Shortages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {regionalShortages.map((region) => (
                  <div key={region.region} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{region.region}</h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          region.severity === "Critical"
                            ? "border-destructive/50 text-destructive"
                            : region.severity === "High"
                            ? "border-amber-500/50 text-amber-500"
                            : "border-muted-foreground/50 text-muted-foreground"
                        )}
                      >
                        {region.severity}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {region.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </IntelligenceLayout>
  );
}
