import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Upload,
  BarChart3,
  Edit,
  Sparkles,
  Mail,
  Briefcase,
  Layout,
  LogOut,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const features = [
    {
      icon: Upload,
      title: "Upload Resume",
      description: "Upload and parse your resume",
      path: "/upload",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: "ATS Analysis",
      description: "Analyze resume compatibility",
      path: "/analysis",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Edit,
      title: "Resume Editor",
      description: "Edit and customize your resume",
      path: "/editor",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Sparkles,
      title: "AI Rewrite",
      description: "Enhance with AI suggestions",
      path: "/rewrite",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Mail,
      title: "Cover Letter",
      description: "Generate cover letters",
      path: "/cover-letter",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      icon: Briefcase,
      title: "Job Tracker",
      description: "Track your applications",
      path: "/tracker",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: Layout,
      title: "Template Builder",
      description: "Create custom templates",
      path: "/templates",
      gradient: "from-teal-500 to-cyan-500",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
          >
            ResumeAI
          </button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome Back
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose a tool to enhance your job search
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="p-6 hover:shadow-elegant transition-all cursor-pointer group"
                  onClick={() => navigate(feature.path)}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
