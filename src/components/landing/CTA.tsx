import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Rocket, Shield, Clock } from "lucide-react";

// Magnetic button effect
const MagneticButton = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springConfig = { stiffness: 300, damping: 30 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    x.set(distanceX * 0.2);
    y.set(distanceY * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative group"
    >
      {children}
    </motion.button>
  );
};

// Floating badge component
const FloatingBadge = ({ 
  icon: Icon, 
  text, 
  delay,
  position 
}: { 
  icon: typeof Rocket; 
  text: string; 
  delay: number;
  position: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className={`absolute ${position} hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-elegant z-20`}
  >
    <Icon className="w-4 h-4 text-primary" />
    <span className="text-sm font-medium">{text}</span>
  </motion.div>
);

export const CTA = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <section ref={ref} className="py-32 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ 
            background: [
              "radial-gradient(ellipse at 30% 50%, hsl(195 92% 48% / 0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 70% 50%, hsl(195 92% 48% / 0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 30% 50%, hsl(195 92% 48% / 0.15) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
        />
      </div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              delay: Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Floating badges */}
          <FloatingBadge icon={Rocket} text="Instant Results" delay={0.5} position="top-0 -left-20" />
          <FloatingBadge icon={Shield} text="Privacy First" delay={0.7} position="top-20 -right-16" />
          <FloatingBadge icon={Clock} text="24/7 Available" delay={0.9} position="bottom-20 -left-16" />
          
          {/* Main content card */}
          <div className="relative bg-white border border-slate-200/50 rounded-3xl p-12 lg:p-16 text-center overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-glow/5" />
            
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary-glow/10 rounded-full blur-3xl" />
            
            {/* Content */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                Get Started in Seconds
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-6 tracking-tight"
              >
                Ready to Transform
                <br />
                <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                  Your Career?
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 }}
                className="text-base md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-4"
              >
                Upload your resume and get instant AI-powered feedback. 
                Optimize for ATS systems and start landing more interviews.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
              >
                <MagneticButton onClick={() => navigate("/auth")}>
                  <div className="relative px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-primary to-primary-glow text-white text-base sm:text-lg font-semibold rounded-xl shadow-glow hover:shadow-[0_0_80px_hsl(195_92%_48%/0.5)] transition-all duration-500 flex items-center gap-3">
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                  </div>
                </MagneticButton>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-10 py-6 rounded-xl border-2 hover:bg-accent/50 transition-all duration-300"
                  onClick={() => navigate("/template")}
                >
                  Build from Template
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap justify-center gap-6 text-sm text-slate-600"
              >
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Free ATS score
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Instant results
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Cancel anytime
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
