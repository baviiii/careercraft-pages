import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  Heart,
  Users,
  TrendingUp,
  FileText,
  ExternalLink,
  Sparkles,
  Filter,
  ChevronRight,
  Globe,
  BookOpen,
  Award,
  Plane,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  count: number;
  color: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  url?: string;
  tags: string[];
  type: 'pdf' | 'web' | 'guide';
}

export default function ExploreSA() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const categories: Category[] = [
    { id: "jobs", name: "Job Listings", icon: Briefcase, description: "Current SA Government vacancies", count: 150, color: "from-blue-500 to-blue-600" },
    { id: "health", name: "Health Careers", icon: Heart, description: "Healthcare & nursing roles", count: 45, color: "from-rose-500 to-pink-600" },
    { id: "education", name: "Education", icon: GraduationCap, description: "Teaching & education sector", count: 38, color: "from-purple-500 to-violet-600" },
    { id: "public-sector", name: "Public Sector", icon: Building2, description: "Government administration", count: 62, color: "from-teal-500 to-cyan-600" },
    { id: "training", name: "Training Programs", icon: BookOpen, description: "Skills & professional development", count: 28, color: "from-orange-500 to-amber-600" },
    { id: "migration", name: "Migrant Support", icon: Plane, description: "Resources for skilled migrants", count: 22, color: "from-emerald-500 to-green-600" },
    { id: "career-guidance", name: "Career Guidance", icon: Award, description: "Resume, interview & application tips", count: 35, color: "from-indigo-500 to-blue-600" },
    { id: "regional", name: "Regional Jobs", icon: MapPin, description: "Opportunities outside Adelaide", count: 40, color: "from-yellow-500 to-orange-600" },
  ];

  const featuredResources: Resource[] = [
    {
      id: "1",
      title: "2025 SA Jobs & Skills Report",
      description: "Comprehensive overview of employment trends and in-demand occupations in South Australia",
      category: "workforce",
      source: "jobs_and_skills_report_2025.pdf",
      tags: ["trends", "skills", "employment"],
      type: "pdf",
    },
    {
      id: "2",
      title: "How to Write Selection Criteria",
      description: "Step-by-step guide to responding to selection criteria for government job applications",
      category: "career-guidance",
      source: "addressing-selection-criteria.pdf",
      tags: ["application", "tips", "government"],
      type: "pdf",
    },
    {
      id: "3",
      title: "SA Health Workforce Strategy",
      description: "Strategic plan for healthcare workforce development in South Australia",
      category: "health",
      source: "Workforce Strategy.pdf",
      tags: ["health", "strategy", "planning"],
      type: "pdf",
    },
    {
      id: "4",
      title: "Interview Preparation Guide",
      description: "Tips and strategies for successful job interviews in the public sector",
      category: "career-guidance",
      source: "interview-preparation-guide.pdf",
      tags: ["interview", "tips", "preparation"],
      type: "pdf",
    },
    {
      id: "5",
      title: "Career Education & Pathways Strategy",
      description: "Framework for career development and education pathways in SA",
      category: "education",
      source: "Career-Education-and-Pathways-Strategy.pdf",
      tags: ["education", "pathways", "career"],
      type: "pdf",
    },
    {
      id: "6",
      title: "Regional Jobs Support Program",
      description: "Incentive program for employment in regional South Australia",
      category: "regional",
      source: "Regional-Jobs-Support-and-Incentive-Program-Program-Guidelines_2022.pdf",
      tags: ["regional", "incentive", "support"],
      type: "pdf",
    },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    // This would call the RAG query API
    setTimeout(() => setIsSearching(false), 1000);
  };

  const quickSearches = [
    "Healthcare jobs in Adelaide",
    "How to apply for government jobs",
    "Training programs for migrants",
    "Selection criteria examples",
    "IT jobs in South Australia",
    "Education sector careers",
  ];

  return (
    <div className="space-y-6">
      {/* Hero Search Section */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-500" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
        
        <div className="relative px-6 py-12 md:px-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Globe className="w-8 h-8 text-white" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">Explore SA Careers</h1>
            </div>
            <p className="text-lg text-white/90 mb-8">
              Discover opportunities across South Australian government sectors, training programs, and career resources
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search jobs, careers, training programs..."
                    className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur border-0 rounded-xl shadow-lg focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-8 py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              
              {/* Quick Searches */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {quickSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearch();
                    }}
                    className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            Browse by Category
          </h2>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-slate-400 hover:text-white"
            >
              Clear filter
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`group relative p-5 cursor-pointer transition-all duration-300 overflow-hidden border-0 ${
                selectedCategory === category.id
                  ? "bg-gradient-to-br " + category.color + " scale-[1.02] shadow-lg"
                  : "bg-slate-900/50 hover:bg-slate-800/50"
              }`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${category.color} ${
                selectedCategory === category.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              } transition-opacity`} />
              
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedCategory === category.id 
                    ? "bg-white/20" 
                    : `bg-gradient-to-br ${category.color}`
                }`}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{category.name}</h3>
                  <p className={`text-sm ${selectedCategory === category.id ? "text-white/80" : "text-slate-400"} line-clamp-2`}>
                    {category.description}
                  </p>
                  <Badge className={`mt-2 ${
                    selectedCategory === category.id 
                      ? "bg-white/20 text-white" 
                      : "bg-slate-800 text-slate-300"
                  }`}>
                    {category.count} resources
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Resources */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          Featured Resources
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredResources
            .filter(r => !selectedCategory || r.category === selectedCategory)
            .map((resource) => (
            <Card
              key={resource.id}
              className="group relative p-5 bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  resource.type === 'pdf' 
                    ? "bg-red-500/20" 
                    : resource.type === 'web' 
                    ? "bg-blue-500/20" 
                    : "bg-purple-500/20"
                }`}>
                  <FileText className={`w-5 h-5 ${
                    resource.type === 'pdf' 
                      ? "text-red-400" 
                      : resource.type === 'web' 
                      ? "text-blue-400" 
                      : "text-purple-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {resource.title}
                  </h3>
                  <p className="text-xs text-slate-500">{resource.source}</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                {resource.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {resource.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "SA Government Jobs Portal", url: "https://jobs.sa.gov.au", icon: Briefcase, color: "blue" },
          { title: "Skills SA Training", url: "https://www.skills.sa.gov.au", icon: GraduationCap, color: "purple" },
          { title: "Migration SA", url: "https://www.migration.sa.gov.au", icon: Users, color: "teal" },
        ].map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${link.color}-500/20`}>
              <link.icon className={`w-6 h-6 text-${link.color}-400`} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">{link.title}</h3>
              <p className="text-sm text-slate-400">Official website</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

