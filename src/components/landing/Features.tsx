import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { 
  FileSearch, 
  Sparkles, 
  Target, 
  FileCheck, 
  TrendingUp, 
  FileText,
  Brain,
  Rocket,
  Shield,
  Wand2
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "ATS Compliance Check",
    description: "Instantly scan your resume for ATS compatibility issues and get a detailed score with actionable fixes.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Sparkles,
    title: "AI Resume Rewriter",
    description: "Transform weak bullet points into achievement-driven statements that showcase your impact.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: FileText,
    title: "AI Cover Letter Builder",
    description: "Generate tailored cover letters in seconds with different tones - professional, confident, or casual.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Target,
    title: "Job Description Matching",
    description: "Paste any job posting and we'll optimize your resume with relevant keywords and skills.",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: FileCheck,
    title: "Multiple Export Formats",
    description: "Download ATS-friendly PDFs, DOCX files, or copy formatted text for any application.",
    color: "from-rose-500 to-red-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: TrendingUp,
    title: "Real Recruiter Mode",
    description: "Get brutally honest feedback from AI trained on senior recruiter perspectives and hiring managers.",
    color: "from-indigo-500 to-violet-500",
    bgColor: "bg-indigo-500/10",
  },
];

// 3D Tilt Feature Card
const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

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
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ 
        rotateX: isHovered ? rotateX : 0, 
        rotateY: isHovered ? rotateY : 0, 
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      className="group relative"
    >
      <div className="relative h-full bg-card border border-border/50 rounded-2xl p-5 md:p-8 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-elegant">
        {/* Gradient background on hover */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
        />
        
        {/* Glow effect */}
        <motion.div
          className={`absolute -inset-px bg-gradient-to-r ${feature.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}
          style={{ transform: "translateZ(-10px)" }}
        />
        
        {/* Icon */}
        <motion.div
          className={`relative mb-6 inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.bgColor} group-hover:scale-110 transition-transform duration-500`}
          style={{ transform: "translateZ(20px)" }}
        >
          <feature.icon className={`w-7 h-7 bg-gradient-to-r ${feature.color} bg-clip-text`} style={{ color: 'transparent', background: `linear-gradient(to right, var(--tw-gradient-stops))`, WebkitBackgroundClip: 'text' }} />
          <feature.icon className={`w-7 h-7 absolute`} style={{ 
            background: `linear-gradient(135deg, ${feature.color.includes('blue') ? '#3b82f6' : feature.color.includes('purple') ? '#a855f7' : feature.color.includes('emerald') ? '#10b981' : feature.color.includes('orange') ? '#f97316' : feature.color.includes('rose') ? '#f43f5e' : '#6366f1'}, ${feature.color.includes('cyan') ? '#06b6d4' : feature.color.includes('pink') ? '#ec4899' : feature.color.includes('teal') ? '#14b8a6' : feature.color.includes('amber') ? '#f59e0b' : feature.color.includes('red') ? '#ef4444' : '#8b5cf6'})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }} />
        </motion.div>
        
        {/* Content */}
        <motion.div style={{ transform: "translateZ(30px)" }}>
          <h3 className="text-xl font-bold mb-3 text-card-foreground group-hover:text-foreground transition-colors">
            {feature.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80 transition-colors">
            {feature.description}
          </p>
        </motion.div>
        
        {/* Decorative corner */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-5 rounded-bl-full`} />
      </div>
    </motion.div>
  );
};

// Animated background shapes
const BackgroundShapes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      className="absolute -top-40 -right-40 w-80 h-80 border border-primary/10 rounded-full"
    />
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-60 -left-60 w-[500px] h-[500px] border border-primary/5 rounded-full"
    />
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.2, 0.1]
      }}
      transition={{ duration: 8, repeat: Infinity }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl"
    />
  </div>
);

export const Features = () => {
  return (
    <section id="features" className="py-16 md:py-32 bg-background relative overflow-hidden">
      <BackgroundShapes />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6"
          >
            <Wand2 className="w-4 h-4" />
            Powerful Features
          </motion.div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Stand Out
            </span>
          </h2>
          
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Comprehensive tools to optimize your resume for both ATS systems and human recruiters. 
            Powered by advanced AI trained on millions of successful resumes.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex flex-wrap justify-center items-center gap-4 md:gap-8 px-4 md:px-8 py-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">GPT-4 Powered</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Instant Results</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Privacy First</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
