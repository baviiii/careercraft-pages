import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, ArrowRight, Play, Shield, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@supabase/supabase-js";
import { memo, useRef } from "react";

interface HeroProps {
  session: Session | null;
}

// Reduced animation variants for better performance
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

// Floating particle component - memoized
const FloatingParticle = memo(({ delay, size, x, y }: { 
  delay: number; 
  size: number; 
  x: number; 
  y: number;
}) => (
  <motion.div
    className="absolute rounded-full bg-gradient-to-r from-primary/20 to-primary-glow/20 blur-sm will-change-transform"
    style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
    animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
    transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
  />
));

// Animated gradient orb - memoized with CSS animation instead
const GradientOrb = memo(({ className }: { className: string }) => (
  <div className={`absolute rounded-full blur-3xl animate-pulse ${className}`} />
));

// Animated text - simplified
const AnimatedText = memo(({ children, delay = 0 }: { children: string; delay?: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="inline-block"
  >
    {children}
  </motion.span>
));

// Simplified Tilt Card - reduced motion tracking
const TiltCard = memo(({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 50 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 50 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Resume preview mockup - memoized
const ResumeMockup = memo(() => (
  <div className="relative w-full max-w-md mx-auto">
    <TiltCard className="perspective-1000">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative bg-white rounded-2xl border border-slate-200/50 shadow-2xl overflow-hidden will-change-transform"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold text-xl">JD</div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-foreground/80 rounded w-3/4" />
              <div className="h-4 bg-muted-foreground/40 rounded w-1/2" />
            </div>
          </div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.8, type: "spring" }}
            className="absolute -top-3 -right-3 bg-gradient-to-r from-success to-emerald-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            ATS Score: 94
          </motion.div>
          
          <div className="space-y-3">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
          </div>
          
          <div className="space-y-3">
            <div className="h-4 bg-slate-700/60 rounded w-1/4" />
            <div className="flex flex-wrap gap-2">
              {["React", "TypeScript", "Node.js", "AWS"].map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-medium"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" style={{ top: '50%' }} />
      </motion.div>
    </TiltCard>
    
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2 }}
      className="absolute -left-16 top-1/4 bg-white border border-slate-200 rounded-xl p-4 shadow-elegant hidden xl:block"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold">ATS Optimized</p>
          <p className="text-xs text-slate-600">100% Compatible</p>
        </div>
      </div>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.4 }}
      className="absolute -right-12 bottom-1/4 bg-white border border-slate-200 rounded-xl p-4 shadow-elegant hidden xl:block"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Enhanced</p>
          <p className="text-xs text-slate-600">Smart Rewrite</p>
        </div>
      </div>
    </motion.div>
  </div>
));

export const Hero = memo(({ session }: HeroProps) => {
  const navigate = useNavigate();
  
  // Reduced particles for performance
  const particles = [
    { id: 0, delay: 0, size: 6, x: 10, y: 20 },
    { id: 1, delay: 1, size: 8, x: 80, y: 30 },
    { id: 2, delay: 2, size: 5, x: 60, y: 70 },
    { id: 3, delay: 3, size: 7, x: 25, y: 80 },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100/50 to-sky-50">
      {/* Static background elements with CSS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GradientOrb className="w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/15 -top-20 md:-top-40 -left-20 md:-left-40" />
        <GradientOrb className="w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary-glow/10 -bottom-40 -right-40" />
        
        {/* Particles - only on desktop */}
        <div className="hidden lg:block">
          {particles.map((particle) => (
            <FloatingParticle key={particle.id} {...particle} />
          ))}
        </div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:60px_60px]" />
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
                className="text-base sm:text-lg lg:text-2xl text-slate-600 leading-relaxed max-w-xl"
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
          className="flex flex-col items-center gap-2 text-slate-600"
        >
          <span className="text-sm">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-slate-400/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
});
