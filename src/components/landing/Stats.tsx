import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Users, FileCheck, TrendingUp, Clock, Award, Zap } from "lucide-react";

const stats = [
  { 
    value: 50, 
    suffix: "+", 
    label: "ATS Checks",
    description: "Comprehensive compatibility analysis",
    icon: FileCheck,
    color: "from-emerald-500 to-teal-500"
  },
  { 
    value: 100, 
    suffix: "%", 
    label: "Free to Start",
    description: "No credit card required",
    icon: Users,
    color: "from-blue-500 to-cyan-500"
  },
  { 
    value: 6, 
    suffix: "+", 
    label: "AI Features",
    description: "Rewrite, analyze, optimize & more",
    icon: TrendingUp,
    color: "from-purple-500 to-pink-500"
  },
  { 
    value: 30, 
    suffix: "sec", 
    label: "Average Analysis",
    description: "Lightning-fast AI processing",
    icon: Zap,
    color: "from-orange-500 to-amber-500"
  },
];

// Animated number counter with easing
const AnimatedNumber = ({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    
    let startTime: number;
    const duration = 2500;
    
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      setCount(Math.floor(easedProgress * value));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [inView, value]);

  return (
    <span className="tabular-nums">{count}{suffix}</span>
  );
};

// Individual stat card with animations
const StatCard = ({ stat, index, inView }: { stat: typeof stats[0]; index: number; inView: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="relative group"
    >
      <div className="relative bg-card border border-border/50 rounded-2xl p-8 text-center overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-elegant">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
        
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15, 
            delay: index * 0.15 + 0.3 
          }}
          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} mb-6 shadow-lg`}
        >
          <stat.icon className="w-7 h-7 text-white" />
        </motion.div>
        
        {/* Number */}
        <div className={`text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
          <AnimatedNumber value={stat.value} suffix={stat.suffix} inView={inView} />
        </div>
        
        {/* Label */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {stat.label}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {stat.description}
        </p>
        
        {/* Decorative ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: index * 0.15 + 0.5 }}
          className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full border-2 border-dashed opacity-10 ${stat.color.includes('emerald') ? 'border-emerald-500' : stat.color.includes('blue') ? 'border-blue-500' : stat.color.includes('purple') ? 'border-purple-500' : 'border-orange-500'}`}
        />
      </div>
    </motion.div>
  );
};

export const Stats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-muted/50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-primary-glow/5 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6">
            <Award className="w-4 h-4" />
            Platform Highlights
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4">
            Built for Job Seekers
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto px-4">
            Everything you need to optimize your resume and land more interviews.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} inView={isInView} />
          ))}
        </div>

      </div>
    </section>
  );
};
