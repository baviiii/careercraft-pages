import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  Database, 
  FileText, 
  TrendingUp, 
  Brain, 
  Search, 
  Building2, 
  GraduationCap, 
  Users,
  ArrowRight,
  Sparkles,
  Shield,
  BarChart3,
  Globe,
  BookOpen,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = memo(() => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSession(session)
    );

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Database,
      title: "Government Data Intelligence",
      description: "Access 50+ verified SA Government PDFs including budgets, workforce strategies, and education plans.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: TrendingUp,
      title: "Job Market Trends",
      description: "Real-time analysis of emerging roles, declining sectors, and salary movements across South Australia.",
      color: "from-sky-500 to-cyan-500"
    },
    {
      icon: Brain,
      title: "AI Career Coach",
      description: "Get personalized career advice backed by policy data, with full citations and evidence.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: FileText,
      title: "Resume & Interview Tools",
      description: "ATS-optimized resume analysis and interview prep aligned to SA workforce trends.",
      color: "from-teal-500 to-emerald-500"
    },
    {
      icon: Building2,
      title: "Policy & Investment Visualizer",
      description: "See where government is investing, which industries are prioritized, and how it affects careers.",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Search,
      title: "Career Explorer",
      description: "Interactive exploration by sector, region, and audience with policy-backed explanations.",
      color: "from-rose-500 to-pink-500"
    }
  ];

  const stats = [
    { value: "50+", label: "Government Documents", icon: FileText },
    { value: "12", label: "Industry Sectors", icon: Briefcase },
    { value: "100%", label: "SA Government Verified", icon: Shield },
    { value: "Live", label: "Market Intelligence", icon: TrendingUp }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-blue-100/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">SA Explorer</h1>
                <p className="text-xs text-muted-foreground">Career Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <Button 
                  onClick={() => navigate("/intelligence")}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/auth")}
                    className="text-foreground hover:bg-blue-50"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate("/auth")}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl -top-40 -left-40 animate-pulse" />
          <div className="absolute w-[500px] h-[500px] bg-sky-400/15 rounded-full blur-3xl top-1/3 -right-40 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl bottom-0 left-1/3 animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,hsl(217_91%_50%)_1px,transparent_1px),linear-gradient(to_bottom,hsl(217_91%_50%)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-full text-blue-700 text-sm font-medium border border-blue-200/50 mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>Powered by SA Government Data</span>
              <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">RAG AI</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              <span className="text-foreground">South Australia's</span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-sky-500 bg-clip-text text-transparent">
                Career Intelligence Hub
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Understand where SA is investing, which jobs are emerging, how policy affects careers — 
              all powered by verified government data and AI intelligence.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg"
                onClick={() => navigate(session ? "/intelligence" : "/auth")}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 px-8 py-6 text-lg rounded-xl"
              >
                <Brain className="w-5 h-5 mr-2" />
                Explore Intelligence
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate("/career-explorer")}
                className="border-2 border-blue-200 hover:bg-blue-50 text-foreground px-8 py-6 text-lg rounded-xl"
              >
                <Search className="w-5 h-5 mr-2" />
                Explore Careers
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-blue-300 flex justify-center pt-2"
          >
            <motion.div
              animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-blue-100/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Complete Career Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand SA's job market, powered by verified government data and AI.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-2xl p-6 border border-blue-100/50 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200/80 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Everyone
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Whether you're a job seeker, student, migrant, or career switcher — we've got you covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "Job Seekers", desc: "Find the right opportunities aligned to SA's growth sectors" },
              { icon: GraduationCap, title: "Students", desc: "Discover career paths with strong employment futures" },
              { icon: Globe, title: "Migrants", desc: "Understand visa-friendly roles and skill recognition" },
              { icon: BookOpen, title: "Career Changers", desc: "Identify transferable skills and new opportunities" }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <item.icon className="w-10 h-10 text-blue-200 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-blue-100 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/30">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Explore SA's Career Landscape?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Get actionable insights backed by verified government data. Make informed career decisions today.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate(session ? "/intelligence" : "/auth")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 px-10 py-6 text-lg rounded-xl"
            >
              Start Exploring
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">SA Explorer</h3>
                <p className="text-xs text-slate-400">Career Intelligence Platform</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Powered by verified South Australian Government data
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
});

Index.displayName = "Index";

export default Index;
