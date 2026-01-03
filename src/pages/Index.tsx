import { useEffect, useState, memo, lazy, Suspense, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView } from "framer-motion";
import { useRef } from "react";
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
  Briefcase,
  Zap,
  ChevronDown,
  Play,
  CheckCircle2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pricing } from "@/components/landing/Pricing";
import { HowItWorks } from "@/components/landing/HowItWorks";

// Lazy load SplashCursor for performance
const SplashCursor = lazy(() => import("@/components/landing/SplashCursor"));

// Floating orb component - optimized with will-change
const FloatingOrb = memo(({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    style={{ willChange: 'transform, opacity' }}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
));

// Animated grid background - optimized
const AnimatedGrid = memo(() => (
  <div className="absolute inset-0 overflow-hidden" style={{ willChange: 'transform' }}>
    <motion.div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(to right, hsl(217 91% 50%) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(217 91% 50%) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        willChange: 'background-position'
      }}
      animate={{
        backgroundPosition: ['0px 0px', '60px 60px'],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  </div>
));

// Particle field - optimized with fewer particles
const ParticleField = memo(() => {
  const particles = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            willChange: 'transform, opacity'
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});

// Glowing text component
const GlowingText = memo(({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`relative inline-block ${className || ''}`}>
    <span className="relative z-10">{children}</span>
    <motion.span
      className="absolute inset-0 bg-gradient-to-r from-blue-400 via-sky-400 to-blue-500 blur-2xl opacity-50 -z-10"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
  </span>
));

// Animated counter
const AnimatedCounter = memo(({ value, suffix = "" }: { value: string; suffix?: string }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 10 }}
      className="inline-block"
    >
      {value}{suffix}
    </motion.span>
  );
});

// Feature card with hover effects - optimized
const FeatureCard = memo(({ feature, index }: { feature: any; index: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 50 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 50 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ 
        rotateX, 
        rotateY, 
        transformStyle: "preserve-3d", 
        willChange: 'transform',
      }}
      className="group relative rounded-3xl pt-16 pb-8 px-8 border border-white/40 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 cursor-pointer overflow-visible min-h-[280px] bg-white/60 backdrop-blur-xl"
    >
      {/* Glassmorphism background gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/80 via-white/60 to-white/40" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-50/30 via-transparent to-sky-50/30" />
      
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 via-transparent to-sky-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      
      {/* Content wrapper with z-index */}
      <div className="relative z-10">
        {/* Icon with proper spacing - no clipping */}
        <div className="relative mb-6" style={{ transform: "translateZ(40px)" }}>
          <motion.div 
            className={`relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <feature.icon className="w-7 h-7 text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-white/20"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </div>
        
        <div className="relative overflow-visible" style={{ transform: "translateZ(30px)" }}>
          <h3 
            className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors leading-tight"
          >
            {feature.title}
          </h3>
          <p 
            className="text-slate-600 leading-relaxed"
          >
            {feature.description}
          </p>
        </div>
      </div>
      
      {/* Arrow indicator */}
      <motion.div
        className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/60 shadow-lg z-20"
        whileHover={{ scale: 1.1 }}
      >
        <ArrowRight className="w-5 h-5 text-blue-500" />
      </motion.div>
    </motion.div>
  );
});

// Optimized Audience Section Component
const AudienceSection = memo(() => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"
        animate={isInView ? {
          background: [
            "linear-gradient(135deg, hsl(217 91% 50%) 0%, hsl(217 91% 40%) 50%, hsl(245 60% 40%) 100%)",
            "linear-gradient(135deg, hsl(217 91% 45%) 0%, hsl(230 80% 45%) 50%, hsl(245 60% 45%) 100%)",
            "linear-gradient(135deg, hsl(217 91% 50%) 0%, hsl(217 91% 40%) 50%, hsl(245 60% 40%) 100%)",
          ]
        } : {}}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Floating shapes - reduced and optimized */}
      <div className="absolute inset-0 overflow-hidden" style={{ willChange: 'transform' }}>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full border border-white/10"
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
              willChange: 'transform, opacity'
            }}
            animate={isInView ? {
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.2, 0.1]
            } : {}}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Built for Everyone
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Whether you're a job seeker, student, migrant, or career switcher — we've got you covered.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Users, title: "Job Seekers", desc: "Find opportunities aligned to SA's growth sectors", gradient: "from-blue-400/20 to-blue-500/20" },
            { icon: GraduationCap, title: "Students", desc: "Discover career paths with strong futures", gradient: "from-sky-400/20 to-cyan-500/20" },
            { icon: Globe, title: "Migrants", desc: "Understand visa-friendly roles and skills", gradient: "from-indigo-400/20 to-purple-500/20" },
            { icon: BookOpen, title: "Career Changers", desc: "Identify transferable skills and new opportunities", gradient: "from-teal-400/20 to-emerald-500/20" }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`bg-gradient-to-br ${item.gradient} backdrop-blur-xl rounded-3xl p-8 border border-white/20 group cursor-pointer`}
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors"
              >
                <item.icon className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-blue-100">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
AudienceSection.displayName = "AudienceSection";

// Optimized CTA Section Component
const CTASection = memo(({ session, navigate }: { session: Session | null; navigate: any }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
      {isInView && <ParticleField />}
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl mb-8 shadow-2xl shadow-blue-500/40"
          >
            <BarChart3 className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to Understand
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
              South Australia?
            </span>
          </h2>
          
          <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
            Access policy intelligence, workforce analytics, and investment insights — plus personalized career tools. All backed by verified government data.
          </p>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              size="lg"
              onClick={() => navigate(session ? "/intelligence" : "/auth")}
              className="relative bg-white text-blue-600 hover:bg-blue-50 shadow-2xl px-12 py-8 text-xl rounded-2xl font-bold group overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              />
              Start Exploring Free
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
});

const Index = memo(() => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const deferredSession = useDeferredValue(session);
  
  // Parallax transforms - optimized
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const navBg = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]);

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
      title: "Policy Intelligence",
      description: "Real-time analysis of SA government policies, budgets, and strategic plans. Understand where investment is flowing.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Building2,
      title: "Investment & Budget Tracking",
      description: "Track government spending, sector priorities, and funding programs. See which industries are growing.",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: TrendingUp,
      title: "Workforce Analytics",
      description: "Live job market trends, emerging roles, sector growth, and skills demand across South Australia.",
      color: "from-sky-500 to-cyan-500"
    },
    {
      icon: Brain,
      title: "AI Intelligence Assistant",
      description: "Ask questions about SA policy, workforce, and opportunities. Get answers backed by verified government data.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: FileText,
      title: "Career Tools",
      description: "Resume builder, interview prep, and job search tools — all personalized using SA workforce intelligence.",
      color: "from-teal-500 to-emerald-500"
    },
    {
      icon: Search,
      title: "Live Job & News Feed",
      description: "Real-time job listings and market news from APIs, filtered and enhanced with SA intelligence context.",
      color: "from-rose-500 to-pink-500"
    }
  ];

  const stats = [
    { value: "50+", label: "Government Documents", icon: FileText },
    { value: "12", label: "Industry Sectors", icon: Briefcase },
    { value: "100%", label: "SA Verified Data", icon: Shield },
    { value: "24/7", label: "Live Intelligence", icon: Zap }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50 overflow-x-hidden">
      {/* Splash Cursor Effect */}
      <Suspense fallback={null}>
        <SplashCursor 
          SPLAT_RADIUS={0.15}
          SPLAT_FORCE={5000}
          DENSITY_DISSIPATION={3}
          VELOCITY_DISSIPATION={2}
          COLOR_UPDATE_SPEED={8}
        />
      </Suspense>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-blue-100/50 bg-white/80"
        style={{ backgroundColor: navBg }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img 
                src="/logo.png"
                alt="Horus Intelligence"
                className="w-11 h-11 rounded-xl shadow-lg shadow-blue-500/30 object-contain"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              />
              <div>
                <h1 className="font-bold text-lg text-slate-800">Horus Intelligence</h1>
                <p className="text-xs text-slate-600">Intelligence Platform</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              {session ? (
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 rounded-xl font-semibold"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/auth")}
                    className="text-slate-700 hover:text-slate-900 hover:bg-blue-50 rounded-xl font-semibold border border-slate-200"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate("/auth")}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 rounded-xl font-semibold"
                  >
                    Get Started
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <AnimatedGrid />
        <ParticleField />
        
        {/* Floating Orbs - reduced for performance */}
        <FloatingOrb className="w-[600px] h-[600px] bg-blue-400/20 -top-40 -left-40" delay={0} />
        <FloatingOrb className="w-[500px] h-[500px] bg-sky-400/15 top-1/3 -right-40" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-indigo-400/10 bottom-0 left-1/3" delay={4} />

        <motion.div 
          className="container mx-auto px-4 relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="max-w-5xl mx-auto text-center">
            {/* Animated Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-50 via-white to-sky-50 backdrop-blur-xl rounded-full text-sm font-bold border-2 border-blue-300/60 mb-8 shadow-xl shadow-blue-500/20"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.4)" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-blue-600" />
              </motion.div>
              <span className="font-extrabold bg-gradient-to-r from-blue-700 via-blue-800 to-sky-700 bg-clip-text text-transparent" style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'rgb(29, 78, 216)'
              }}>Powered by AI & Government Data</span>
              <motion.span 
                className="px-3 py-1 bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 text-white rounded-full text-xs font-extrabold shadow-lg"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                RAG AI
              </motion.span>
            </motion.div>

            {/* Main Heading with staggered animation */}
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.05] mb-4 tracking-tight"
            >
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="block drop-shadow-2xl"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: 'rgb(15, 23, 42)',
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}
              >
                South Australia's
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="block mt-3"
              >
                <span
                  className="relative inline-block"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 30%, rgb(14, 165, 233) 60%, rgb(2, 132, 199) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'rgb(37, 99, 235)',
                    display: 'inline-block',
                    textShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                    filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.2))'
                  }}
                >
                  Intelligence Platform
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 blur-3xl opacity-60 -z-10"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </span>
              </motion.span>
            </motion.h1>

            {/* Animated Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent flex-1 max-w-32"
                animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="flex items-center gap-3 px-7 py-3 bg-gradient-to-r from-blue-50/90 via-white to-sky-50/90 backdrop-blur-xl rounded-full border-2 border-blue-300/70 shadow-xl shadow-blue-500/20"
                whileHover={{ scale: 1.08, boxShadow: "0 15px 35px -8px rgba(59, 130, 246, 0.4)" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </motion.div>
                <span 
                  className="text-base font-extrabold"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    background: 'linear-gradient(135deg, rgb(29, 78, 216) 0%, rgb(37, 99, 235) 50%, rgb(14, 165, 233) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'rgb(29, 78, 216)'
                  }}
                >
                  Powered by AI & Government Data
                </span>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Brain className="w-5 h-5 text-sky-600" />
                </motion.div>
              </motion.div>
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent flex-1 max-w-32"
                animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              />
            </motion.div>

            {/* Live Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4 mb-8"
            >
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full border border-blue-200/50 shadow-lg shadow-blue-500/10"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-sm font-semibold text-slate-700">
                  <AnimatedCounter value="50+" suffix=" Documents" />
                </span>
              </motion.div>
              
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full border border-blue-200/50 shadow-lg shadow-blue-500/10"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <span className="text-sm font-semibold text-slate-700">
                  <AnimatedCounter value="12" suffix=" Sectors" />
                </span>
              </motion.div>
              
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full border border-blue-200/50 shadow-lg shadow-blue-500/10"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-amber-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                />
                <span className="text-sm font-semibold text-slate-700">
                  Live Updates
                </span>
              </motion.div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto mb-8 leading-relaxed font-semibold"
              style={{
                color: 'rgb(51, 65, 85)',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              Understand South Australia's policy landscape, workforce trends, and investment priorities — 
              <span 
                className="font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(14, 165, 233) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'rgb(37, 99, 235)'
                }}
              > powered by AI and verified government data</span>. Plus personalized career tools to help you succeed.
            </motion.p>

            {/* Live Activity Ticker */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="relative bg-gradient-to-r from-blue-50/80 via-white to-sky-50/80 backdrop-blur-xl rounded-2xl p-4 border border-blue-200/50 shadow-xl shadow-blue-500/5 overflow-hidden">
                {/* Animated background gradient */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-transparent to-sky-400/5"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="relative flex items-center gap-4">
                  <motion.div
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white text-xs font-bold whitespace-nowrap"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    LIVE
                  </motion.div>
                  
                  <div className="flex-1 overflow-hidden" style={{ willChange: 'transform' }}>
                    <motion.div
                      className="flex gap-6 whitespace-nowrap"
                      style={{ willChange: 'transform' }}
                      animate={{ x: ['0%', '-50%'] }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    >
                      {[
                        "📊 Healthcare sector sees 15% job growth",
                        "💼 New funding announced for tech startups",
                        "🎓 Education pathways updated for 2024",
                        "🏭 Manufacturing investments reach $2B",
                        "🌱 Green energy jobs on the rise",
                        "💡 AI skills in high demand across SA"
                      ].map((item, i) => (
                        <span key={i} className="text-sm font-medium text-slate-700 px-6">
                          {item}
                        </span>
                      ))}
                      {/* Duplicate for seamless loop */}
                      {[
                        "📊 Healthcare sector sees 15% job growth",
                        "💼 New funding announced for tech startups",
                        "🎓 Education pathways updated for 2024",
                        "🏭 Manufacturing investments reach $2B",
                        "🌱 Green energy jobs on the rise",
                        "💡 AI skills in high demand across SA"
                      ].map((item, i) => (
                        <span key={`dup-${i}`} className="text-sm font-medium text-slate-700 px-6">
                          {item}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                  
                  <motion.div
                    className="flex items-center gap-1 text-xs text-blue-600 font-semibold whitespace-nowrap"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="w-3 h-3" />
                    Updated Now
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              {!session ? (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg"
                      onClick={() => navigate("/auth")}
                      className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white shadow-2xl shadow-blue-500/30 px-10 py-7 text-lg rounded-2xl transition-all duration-500 group overflow-hidden font-bold"
                    >
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      />
                      <Sparkles className="w-5 h-5 mr-2" />
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/auth")}
                      className="border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50/80 text-slate-700 hover:text-slate-900 px-10 py-7 text-lg rounded-2xl backdrop-blur-sm font-semibold"
                    >
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    size="lg"
                    onClick={() => navigate("/intelligence")}
                    className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white shadow-2xl shadow-blue-500/30 px-10 py-7 text-lg rounded-2xl transition-all duration-500 group overflow-hidden font-bold"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                    <Brain className="w-5 h-5 mr-2" />
                    Explore Intelligence
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              {[
                { icon: Shield, text: "Government Verified" },
                { icon: Zap, text: "Real-time Updates" },
                { icon: CheckCircle2, text: "100% Free to Start" }
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4 text-blue-500" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-sm text-muted-foreground">Scroll to explore</span>
            <motion.div
              className="w-8 h-12 rounded-full border-2 border-blue-300/50 flex justify-center pt-2 backdrop-blur-sm"
              whileHover={{ borderColor: "hsl(217 91% 50%)" }}
            >
              <motion.div
                animate={{ y: [0, 16, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-blue-500"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1, type: "spring" }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-8 text-center border border-blue-100/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <motion.div 
                  className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform"
                  whileHover={{ rotate: 10 }}
                >
                  <stat.icon className="w-7 h-7 text-white" />
                </motion.div>
                <div className="text-4xl font-bold text-foreground mb-2">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4"
            >
              Powerful Features
            </motion.span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Complete SA Intelligence Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Policy insights, workforce analytics, and investment tracking — plus personalized career tools. All powered by verified government data and AI.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Audience Section - Optimized */}
      <AudienceSection />

      {/* Testimonials/Social proof */}
      <section className="py-24 bg-gradient-to-b from-white to-blue-50/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                </motion.div>
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Trusted by South Australians
            </h2>
            <p className="text-muted-foreground">
              Join thousands making smarter career decisions
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section - Optimized */}
      <CTASection session={deferredSession} navigate={navigate} />

      {/* Footer */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <img 
                src="/logo.png" 
                alt="Horus Intelligence" 
                className="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/30 object-contain"
              />
              <div>
                <h3 className="font-bold text-white">Horus Intelligence</h3>
                <p className="text-xs text-slate-400">Intelligence Platform</p>
              </div>
            </motion.div>
            
            <p className="text-sm text-slate-400 text-center">
              Intelligence-Powered South Australia — Policy, Workforce & Opportunity Insights
            </p>
            
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <motion.a 
                href="/privacy" 
                onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}
                className="hover:text-white transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                Privacy
              </motion.a>
              <motion.a 
                href="/about" 
                onClick={(e) => { e.preventDefault(); navigate("/about"); }}
                className="hover:text-white transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                About
              </motion.a>
              <motion.a 
                href="/contact" 
                onClick={(e) => { e.preventDefault(); navigate("/contact"); }}
                className="hover:text-white transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                Contact
              </motion.a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
});

Index.displayName = "Index";

export default Index;
