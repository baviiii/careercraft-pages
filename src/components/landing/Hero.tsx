import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, ArrowRight, Play, Shield, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

interface HeroProps {
  session: Session | null;
}

// Floating particle component
const FloatingParticle = ({ delay, duration, size, x, y }: { 
  delay: number; 
  duration: number; 
  size: number; 
  x: number; 
  y: number;
}) => (
  <motion.div
    className="absolute rounded-full bg-gradient-to-r from-primary/30 to-primary-glow/30 blur-sm"
    style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, 0],
      opacity: [0.3, 0.8, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated gradient orb
const GradientOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated text with gradient reveal
const AnimatedText = ({ children, delay = 0 }: { children: string; delay?: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="inline-block"
  >
    {children}
  </motion.span>
);

// 3D Tilt Card Component
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Resume preview mockup
const ResumeMockup = () => (
  <div className="relative w-full max-w-md mx-auto">
    <TiltCard className="perspective-1000">
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Resume content mockup */}
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold text-xl">
              JD
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-foreground/80 rounded w-3/4" />
              <div className="h-4 bg-muted-foreground/40 rounded w-1/2" />
            </div>
          </div>
          
          {/* Score badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
            className="absolute -top-3 -right-3 bg-gradient-to-r from-success to-emerald-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            ATS Score: 94
          </motion.div>
          
          {/* Content lines */}
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
          
          {/* Skills section */}
          <div className="space-y-3">
            <div className="h-4 bg-foreground/60 rounded w-1/4" />
            <div className="flex flex-wrap gap-2">
              {["React", "TypeScript", "Node.js", "AWS"].map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + i * 0.1 }}
                  className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-medium"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>
          
          {/* Experience section */}
          <div className="space-y-3">
            <div className="h-4 bg-foreground/60 rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-11/12" />
              <div className="h-3 bg-muted rounded w-4/5" />
            </div>
          </div>
        </div>
        
        {/* Animated scan line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </TiltCard>
    
    {/* Floating elements around the mockup */}
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.8 }}
      className="absolute -left-16 top-1/4 bg-card border border-border rounded-xl p-4 shadow-elegant"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold">ATS Optimized</p>
          <p className="text-xs text-muted-foreground">100% Compatible</p>
        </div>
      </div>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2 }}
      className="absolute -right-12 bottom-1/4 bg-card border border-border rounded-xl p-4 shadow-elegant"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Enhanced</p>
          <p className="text-xs text-muted-foreground">Smart Rewrite</p>
        </div>
      </div>
    </motion.div>
  </div>
);

export const Hero = ({ session }: HeroProps) => {
  const navigate = useNavigate();
  
  // Generate particles - reduced for mobile performance
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    duration: 4 + Math.random() * 4,
    size: 4 + Math.random() * 8,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GradientOrb className="w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/20 -top-20 md:-top-40 -left-20 md:-left-40" />
        <GradientOrb className="w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary-glow/15 -bottom-40 md:-bottom-60 -right-40 md:-right-60" delay={2} />
        <GradientOrb className="hidden md:block w-[400px] h-[400px] bg-success/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" delay={4} />
        
        {/* Floating particles */}
        {particles.map((particle) => (
          <FloatingParticle key={particle.id} {...particle} />
        ))}
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                             linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent/80 backdrop-blur-sm rounded-full text-accent-foreground text-sm font-medium border border-accent-foreground/10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <span>AI-Powered Resume Optimization</span>
              <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">NEW</span>
            </motion.div>

            {/* Main heading */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                <AnimatedText delay={0.2}>Beat the ATS.</AnimatedText>
                <br />
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient"
                >
                  Land Your Dream Job.
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-base sm:text-lg lg:text-2xl text-muted-foreground leading-relaxed max-w-xl"
              >
                Transform your resume into an ATS-optimized masterpiece. Our AI analyzes, 
                scores, and rewrites your resume to get past automated systems and into 
                human hands.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {session ? (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="group text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-xl shadow-glow hover:shadow-[0_0_80px_hsl(195_92%_48%/0.5)] transition-all duration-500"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="group text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-xl shadow-glow hover:shadow-[0_0_80px_hsl(195_92%_48%/0.5)] transition-all duration-500"
                    onClick={() => navigate("/auth")}
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-xl border-2 hover:bg-accent/50 transition-all duration-300"
                    onClick={() => navigate("/auth")}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </>
              )}
            </motion.div>

          </div>

          {/* Right Content - Resume Mockup */}
          <div className="relative hidden lg:block">
            <ResumeMockup />
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-sm">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
