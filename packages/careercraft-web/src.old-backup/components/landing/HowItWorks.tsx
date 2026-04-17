import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Cpu, FileCheck, Download, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Resume",
    description: "Simply drag and drop your existing resume in PDF, DOCX, or paste text directly. Our system handles all formats.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Analysis",
    description: "Our advanced AI scans your resume against 50+ ATS systems, checking formatting, keywords, and structure.",
    color: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Smart Optimization",
    description: "Get personalized suggestions and let AI rewrite weak sections into powerful, achievement-focused content.",
    color: "from-orange-500 to-amber-500",
  },
  {
    number: "04",
    icon: Download,
    title: "Download & Apply",
    description: "Export your optimized resume in ATS-friendly formats and start landing more interviews immediately.",
    color: "from-emerald-500 to-teal-500",
  },
];

// Animated connection line between steps
const ConnectionLine = ({ index, inView }: { index: number; inView: boolean }) => (
  <motion.div
    initial={{ scaleX: 0 }}
    animate={inView ? { scaleX: 1 } : {}}
    transition={{ duration: 0.8, delay: 0.5 + index * 0.2 }}
    className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-border via-primary/30 to-border origin-left z-0"
    style={{ width: 'calc(100% - 2rem)' }}
  />
);

// Individual step card
const StepCard = ({ step, index, inView }: { step: typeof steps[0]; index: number; inView: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="relative group"
    >
      <div className="relative bg-white border border-slate-200/50 rounded-2xl p-8 text-center hover:border-blue-500/30 transition-all duration-500 hover:shadow-elegant overflow-hidden">
        {/* Step number badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={inView ? { scale: 1, rotate: 0 } : {}}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: index * 0.2 + 0.3
          }}
          className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
        >
          {step.number}
        </motion.div>
        
        {/* Icon container */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
          className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} mb-6 shadow-lg`}
        >
          <step.icon className="w-10 h-10 text-white" />
        </motion.div>
        
        {/* Content */}
        <h3 className="text-xl font-bold mb-3 text-slate-800">
          {step.title}
        </h3>
        <p className="text-slate-600 leading-relaxed">
          {step.description}
        </p>
        
        {/* Hover glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
      </div>
      
      {/* Connection line to next step */}
      {index < steps.length - 1 && <ConnectionLine index={index} inView={inView} />}
    </motion.div>
  );
};

// Animated arrow for mobile
const MobileArrow = ({ index, inView }: { index: number; inView: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ delay: 0.3 + index * 0.2 }}
    className="flex justify-center py-4 lg:hidden"
  >
    <motion.div
      animate={{ y: [0, 5, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <ArrowRight className="w-6 h-6 text-primary rotate-90" />
    </motion.div>
  </motion.div>
);

export const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 bg-gradient-to-br from-blue-50 via-blue-100/50 to-sky-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        {/* Floating shapes */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-20 w-40 h-40 border border-primary/10 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 w-60 h-60 border border-primary/5 rounded-full"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6">
            <FileCheck className="w-4 h-4" />
            Simple Process
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
            How It Works
          </h2>
          
          <p className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed px-4">
            Get your ATS-optimized resume in minutes, not hours. 
            Our streamlined process makes resume optimization effortless.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-4 relative">
          {steps.map((step, index) => (
            <div key={index}>
              <StepCard step={step} index={index} inView={isInView} />
              {index < steps.length - 1 && <MobileArrow index={index} inView={isInView} />}
            </div>
          ))}
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-600">
            Average time from upload to optimized resume: <span className="text-primary font-semibold">Under 2 minutes</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
