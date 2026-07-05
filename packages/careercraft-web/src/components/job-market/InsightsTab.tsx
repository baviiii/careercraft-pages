import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Lightbulb,
  Building2,
  Briefcase,
  DollarSign,
  Globe,
  Calendar,
  MapPin,
  PieChart,
  BarChart3,
  Sparkles,
  Cpu,
  Target,
  Rocket,
  Award,
  Crown,
  Gem,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { MarketInsight, TopIndustry, TopCompany } from "./types";

interface InsightsTabProps {
  insights: MarketInsight[];
  topIndustries: TopIndustry[];
  topCompanies: TopCompany[];
  loading?: boolean;
  rateIndustry?: (name: string) => { match: number } | null;
  rateCompany?: (name: string) => { match: number } | null;
}

const ForYouTag = () => (
  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] font-semibold">
    ★ For you
  </span>
);

export default function InsightsTab({
  insights,
  topIndustries,
  topCompanies,
  rateIndustry,
  rateCompany,
}: InsightsTabProps) {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "briefcase":
        return <Briefcase className="w-6 h-6" />;
      case "dollar":
        return <DollarSign className="w-6 h-6" />;
      case "globe":
        return <Globe className="w-6 h-6" />;
      case "clock":
        return <Calendar className="w-6 h-6" />;
      case "map":
        return <MapPin className="w-6 h-6" />;
      case "building":
        return <Building2 className="w-6 h-6" />;
      default:
        return <Briefcase className="w-6 h-6" />;
    }
  };

  const TrendIcon = ({ direction }: { direction: "up" | "down" | "stable" }) => {
    if (direction === "up") return <ArrowUpRight className="w-5 h-5 text-emerald-500" />;
    if (direction === "down") return <ArrowDownRight className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="space-y-8">
      {/* Insights Hero - Blue Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Lightbulb className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Market Insights</h2>
              <p className="text-white/80">Deep dive into Australian job market analytics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {insights.slice(0, 4).map((insight, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/20 rounded-lg">{renderIcon(insight.icon)}</div>
                </div>
                <p className="text-2xl md:text-3xl font-bold mb-1">{insight.value}</p>
                <p className="text-sm text-white/70 mb-2">{insight.title}</p>
                <div
                  className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                    insight.direction === "up"
                      ? "bg-emerald-500/30 text-emerald-200"
                      : insight.direction === "down"
                      ? "bg-rose-500/30 text-rose-200"
                      : "bg-amber-500/30 text-amber-200"
                  }`}
                >
                  <TrendIcon direction={insight.direction} />
                  {insight.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Insights Cards */}
      {insights.length > 4 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.slice(4).map((insight, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center shadow-lg ${
                    insight.direction === "up"
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30"
                      : insight.direction === "down"
                      ? "bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-500/30"
                      : "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
                  }`}
                >
                  <div className="text-white">{renderIcon(insight.icon)}</div>
                </div>
                <p className="text-4xl font-bold mb-2">{insight.value}</p>
                <p className="text-sm text-muted-foreground mb-3">{insight.title}</p>
                <div
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
                    insight.direction === "up"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : insight.direction === "down"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  }`}
                >
                  <TrendIcon direction={insight.direction} />
                  {insight.change}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Companies & Industries Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Hiring Companies - Blue Theme */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-950/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                    Top Hiring Companies
                  </h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    Most active recruiters
                  </p>
                </div>
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                <Award className="w-3 h-3 mr-1" /> Top 10
              </Badge>
            </div>
            <div className="space-y-3">
              {topCompanies.map((company, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-4 p-4 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-indigo-100 dark:border-indigo-800/30 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                          : i === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                          : i === 2
                          ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                          : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300"
                      }`}
                    >
                      {company.name.charAt(0)}
                    </div>
                    {i < 3 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                        {i === 0 ? (
                          <Crown className="w-3 h-3 text-amber-500" />
                        ) : i === 1 ? (
                          <Gem className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Award className="w-3 h-3 text-amber-600" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {company.name}
                      {rateCompany && rateCompany(company.name)?.match ? <ForYouTag /> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {company.jobCount} open positions
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top Industries - Blue Theme */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-indigo-950/30">
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                  <PieChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    Industry Breakdown
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Job distribution by sector
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                <BarChart3 className="w-3 h-3 mr-1" /> Analytics
              </Badge>
            </div>
            <div className="space-y-5">
              {topIndustries.map((ind, i) => {
                const colors = [
                  { bar: "from-blue-500 to-indigo-500", dot: "bg-blue-500" },
                  { bar: "from-indigo-500 to-blue-600", dot: "bg-indigo-500" },
                  { bar: "from-sky-500 to-blue-500", dot: "bg-sky-500" },
                  { bar: "from-blue-600 to-indigo-600", dot: "bg-blue-600" },
                  { bar: "from-indigo-600 to-blue-700", dot: "bg-indigo-600" },
                ];
                const color = colors[i % colors.length];
                return (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.dot}`} />
                        <span className="font-medium">{ind.industry}</span>
                        {rateIndustry && rateIndustry(ind.industry)?.match ? <ForYouTag /> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {ind.jobCount?.toLocaleString() || "0"} jobs
                        </span>
                        <span className="text-sm font-bold">{ind.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color.bar} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${ind.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Industries Tracked</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {topIndustries.length}+
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Summary - Blue Theme */}
      <Card className="relative overflow-hidden border-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative p-6 md:p-8 text-white">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold">AI Market Intelligence</h3>
                <Badge className="bg-white/20 text-white border-white/30">
                  <Cpu className="w-3 h-3 mr-1" /> Powered by AI
                </Badge>
              </div>
              <p className="text-white/70">Personalized insights based on current market data</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-300" />
                <h4 className="font-semibold">Key Opportunities</h4>
              </div>
              <ul className="space-y-3 text-white/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Tech sector showing <strong>12% growth</strong> in job postings this month
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Remote opportunities now represent <strong>23%</strong> of all listings
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Senior developer salaries up <strong>8% YoY</strong>
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-amber-300" />
                <h4 className="font-semibold">Recommended Actions</h4>
              </div>
              <ul className="space-y-3 text-white/90">
                <li className="flex items-start gap-2">
                  <Rocket className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Focus on <strong>cloud certifications</strong> (AWS, Azure) for maximum market
                    value
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Rocket className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Learn <strong>React & TypeScript</strong> - top demanded frontend skills
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Rocket className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Sydney & Melbourne offer <strong>highest compensation</strong> packages
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
