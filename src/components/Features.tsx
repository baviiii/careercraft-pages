import { motion } from "framer-motion";
import { FileSearch, Zap, Target, FileCheck, Sparkles, TrendingUp, FileText } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "ATS Compliance Check",
    description: "Instantly scan your resume for ATS compatibility issues and get a detailed score with actionable fixes.",
  },
  {
    icon: Sparkles,
    title: "AI Resume Rewriter",
    description: "Transform weak bullet points into achievement-driven statements that showcase your impact.",
  },
  {
    icon: FileText,
    title: "AI Cover Letter Builder",
    description: "Generate tailored cover letters in seconds with different tones - professional, confident, or casual.",
  },
  {
    icon: Target,
    title: "Job Description Matching",
    description: "Paste any job posting and we'll optimize your resume with relevant keywords and skills.",
  },
  {
    icon: FileCheck,
    title: "Multiple Export Formats",
    description: "Download ATS-friendly PDFs, DOCX files, or copy formatted text for any application.",
  },
  {
    icon: TrendingUp,
    title: "Real Recruiter Mode",
    description: "Get brutally honest feedback from AI trained on senior recruiter perspectives and hiring managers.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export const Features = () => {
  return (
    <section id="features" className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-hero bg-clip-text text-transparent"> Stand Out</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools to optimize your resume for both ATS systems and human recruiters
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative bg-card border border-border rounded-xl p-8 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
