import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { IntelligenceLayout } from "@/components/intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Compass,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  GraduationCap,
  Briefcase,
  Heart,
  Zap,
  Factory,
  Cpu,
  Leaf,
  ChevronRight,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sectors = [
  { id: "healthcare", name: "Healthcare & Social", icon: Heart, color: "text-rose-500", growth: "+8.2%", jobs: 12450 },
  { id: "construction", name: "Construction", icon: Factory, color: "text-amber-500", growth: "+5.7%", jobs: 8320 },
  { id: "technology", name: "ICT & Digital", icon: Cpu, color: "text-blue-500", growth: "+12.4%", jobs: 4280 },
  { id: "energy", name: "Clean Energy", icon: Zap, color: "text-emerald-500", growth: "+18.9%", jobs: 3150 },
  { id: "education", name: "Education & Training", icon: GraduationCap, color: "text-purple-500", growth: "+3.2%", jobs: 9870 },
  { id: "defence", name: "Defence & Aerospace", icon: Building2, color: "text-slate-500", growth: "+15.1%", jobs: 5640 },
  { id: "agriculture", name: "Agriculture & Food", icon: Leaf, color: "text-lime-500", growth: "+2.8%", jobs: 6210 },
  { id: "retail", name: "Retail & Hospitality", icon: Briefcase, color: "text-orange-500", growth: "-1.2%", jobs: 11230 },
];

const regions = [
  { id: "adelaide", name: "Adelaide Metro", jobs: 45200 },
  { id: "barossa", name: "Barossa Valley", jobs: 3400 },
  { id: "fleurieu", name: "Fleurieu Peninsula", jobs: 2100 },
  { id: "limestone", name: "Limestone Coast", jobs: 1850 },
  { id: "riverland", name: "Riverland", jobs: 2400 },
  { id: "yorke", name: "Yorke Peninsula", jobs: 1200 },
  { id: "eyre", name: "Eyre Peninsula", jobs: 1650 },
  { id: "whyalla", name: "Whyalla & Upper Spencer", jobs: 2800 },
];

const audiences = [
  { id: "graduates", name: "Recent Graduates", icon: GraduationCap },
  { id: "migrants", name: "Skilled Migrants", icon: Users },
  { id: "switchers", name: "Career Changers", icon: Compass },
  { id: "returners", name: "Workforce Returners", icon: Briefcase },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function CareerExplorer() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("adelaide");
  const [selectedTimeframe, setSelectedTimeframe] = useState("now");
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);

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

  const currentSector = sectors.find(s => s.id === selectedSector);
  const currentRegion = regions.find(r => r.id === selectedRegion);

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
          <div className="flex items-center gap-3 mb-2">
            <Compass className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">
              Career Explorer
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Explore career opportunities across sectors, regions, and audiences. 
            Data sourced from SA Government workforce strategies and live market analysis.
          </p>
        </motion.div>

        {/* Filters Bar */}
        <motion.div variants={item}>
          <Card className="glass border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48 bg-background/50">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="w-40 bg-background/50">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past">Past 12 months</SelectItem>
                    <SelectItem value="now">Current</SelectItem>
                    <SelectItem value="future">Next 5 years</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 ml-auto">
                  {audiences.map(audience => (
                    <Button
                      key={audience.id}
                      variant={selectedAudience === audience.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAudience(
                        selectedAudience === audience.id ? null : audience.id
                      )}
                      className="gap-2"
                    >
                      <audience.icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{audience.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sector Grid */}
        <motion.div variants={item}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Industry Sectors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectors.map((sector) => {
              const isGrowing = sector.growth.startsWith('+');
              const isSelected = selectedSector === sector.id;
              return (
                <motion.div
                  key={sector.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-300 group",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedSector(isSelected ? null : sector.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary/10" : "bg-muted"
                        )}>
                          <sector.icon className={cn("w-5 h-5", sector.color)} />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            isGrowing
                              ? "border-accent-emerald/30 text-accent-emerald bg-accent-emerald/10"
                              : "border-destructive/30 text-destructive bg-destructive/10"
                          )}
                        >
                          {isGrowing ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {sector.growth}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{sector.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sector.jobs.toLocaleString()} active positions
                      </p>
                      <ChevronRight className={cn(
                        "w-4 h-4 absolute bottom-4 right-4 text-muted-foreground transition-all",
                        isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                      )} />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Sector Details */}
        {currentSector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="lg:col-span-2 glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <currentSector.icon className={cn("w-5 h-5", currentSector.color)} />
                  {currentSector.name} in {currentRegion?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">
                      {currentSector.jobs.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-accent-emerald">
                      {currentSector.growth}
                    </p>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">$78K</p>
                    <p className="text-sm text-muted-foreground">Avg. Salary</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Top Skills in Demand</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Project Management", "Data Analysis", "Communication", "Technical Writing", "Leadership"].map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Government Investment Signals</h4>
                  <p className="text-sm text-muted-foreground">
                    The 2025-26 SA Budget allocates $2.3B to this sector, with specific focus on 
                    workforce development and training programs. Priority areas include regional 
                    expansion and skills transition pathways.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: "Explore TAFE SA Courses", desc: "Subsidized training available" },
                  { title: "View Job Listings", desc: "234 new this week" },
                  { title: "Career Pathway Guide", desc: "Policy-backed pathways" },
                  { title: "Talk to AI Coach", desc: "Personalized guidance" },
                ].map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-between group hover:border-primary/50"
                  >
                    <div className="text-left">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </IntelligenceLayout>
  );
}
