// Shared types for Job Market News components

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  imageUrl?: string;
  readTime?: string;
}

export interface TrendItem {
  id: string;
  topic: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  volume: string;
  description: string;
  relatedTerms?: string[];
  timeframe: string;
}

export interface MarketInsight {
  title: string;
  value: string;
  change: string;
  direction: "up" | "down" | "stable";
  description: string;
  icon: string;
}

export interface SkillDemand {
  skill: string;
  demand: number;
  growth: number;
  avgSalary: string;
  jobCount: number;
}

export interface TopIndustry {
  industry: string;
  jobCount: number;
  percentage: number;
}

export interface TopCompany {
  name: string;
  jobCount: number;
}

// Categories for news filtering
export const NEWS_CATEGORIES = [
  { name: "All News", value: "all", icon: "Newspaper" },
  { name: "Hiring Trends", value: "hiring", icon: "Users" },
  { name: "Tech Industry", value: "tech", icon: "Zap" },
  { name: "Salary Reports", value: "salary", icon: "DollarSign" },
  { name: "Remote Work", value: "remote", icon: "Globe" },
  { name: "AI & Automation", value: "ai", icon: "Sparkles" },
  { name: "Layoffs", value: "layoffs", icon: "AlertTriangle" },
  { name: "Innovation", value: "innovation", icon: "Lightbulb" },
  { name: "Immigration", value: "immigration", icon: "Globe" },
] as const;

export const INDUSTRIES = [
  "All",
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Construction",
  "Retail",
  "Marketing",
  "Legal",
] as const;

export const EXPERIENCE_LEVELS = [
  "All",
  "Junior",
  "Mid",
  "Senior",
  "Lead",
] as const;
