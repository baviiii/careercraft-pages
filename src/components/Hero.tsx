import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle, Sparkles, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@supabase/supabase-js";
import heroImage from "@/assets/hero-career.jpg";

interface HeroProps {
  session: Session | null;
}

export const Hero = ({ session }: HeroProps) => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                AI-Powered Resume Optimization
              </motion.div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Beat the ATS.
                <br />
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Land Your Dream Job.
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Transform your resume into an ATS-optimized masterpiece. Our AI analyzes, 
                scores, and rewrites your resume to get past automated systems and into 
                human hands.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {session ? (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="group"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Briefcase className="w-5 h-5 mr-2" />
                    My Resumes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="group"
                    onClick={() => navigate("/auth")}
                  >
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Get Started Free
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate("/auth")}
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Sign In
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Free ATS Check</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Instant Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">AI Rewrite</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-elegant hover:shadow-glow transition-shadow duration-500">
              <img
                src={heroImage}
                alt="Professional ATS-optimized resume preview"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>

            {/* Floating Score Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -bottom-6 -left-6 bg-card border border-border rounded-xl p-6 shadow-elegant"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.87)}`}
                      className="text-success transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">87</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">ATS Score</p>
                  <p className="text-xs text-muted-foreground">Excellent Match</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
