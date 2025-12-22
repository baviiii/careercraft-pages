import { motion } from "framer-motion";
import { Brain, TrendingUp, BookOpen, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill {
  name: string;
  demand: number; // 0-100
  growth: number;
  sector: string;
  category: "technical" | "soft" | "emerging";
}

interface TrainingProgram {
  name: string;
  provider: string;
  skills: string[];
  duration: string;
  funding?: string;
}

const topSkills: Skill[] = [
  { name: "Digital Literacy", demand: 95, growth: 18.5, sector: "Technology", category: "technical" },
  { name: "Project Management", demand: 88, growth: 12.3, sector: "All Sectors", category: "soft" },
  { name: "Data Analysis", demand: 92, growth: 22.1, sector: "Technology", category: "technical" },
  { name: "Communication", demand: 85, growth: 8.2, sector: "All Sectors", category: "soft" },
  { name: "AI & Machine Learning", demand: 78, growth: 35.6, sector: "Technology", category: "emerging" },
  { name: "Healthcare Administration", demand: 82, growth: 15.4, sector: "Healthcare", category: "technical" },
  { name: "Green Energy Skills", demand: 75, growth: 28.9, sector: "Renewable Energy", category: "emerging" },
  { name: "Customer Service", demand: 80, growth: 6.5, sector: "All Sectors", category: "soft" },
];

const trainingPrograms: TrainingProgram[] = [
  {
    name: "Digital Skills Bootcamp",
    provider: "TAFE SA",
    skills: ["Digital Literacy", "Data Analysis", "Cloud Computing"],
    duration: "12 weeks",
    funding: "Fee-free for eligible students",
  },
  {
    name: "Healthcare Career Pathways",
    provider: "SA Health",
    skills: ["Healthcare Administration", "Patient Care", "Medical Records"],
    duration: "6 months",
    funding: "Subsidized training available",
  },
  {
    name: "Project Management Certificate",
    provider: "University of Adelaide",
    skills: ["Project Management", "Leadership", "Risk Management"],
    duration: "12 months",
  },
  {
    name: "Renewable Energy Training",
    provider: "TafeSA",
    skills: ["Green Energy Skills", "Solar Installation", "Energy Efficiency"],
    duration: "8 weeks",
    funding: "Government funded",
  },
];

export function SkillsDashboard() {
  const emergingSkills = topSkills.filter(s => s.category === "emerging");
  const technicalSkills = topSkills.filter(s => s.category === "technical");
  const softSkills = topSkills.filter(s => s.category === "soft");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Skills Intelligence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            In-demand skills and training opportunities in South Australia
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Brain className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-500">Skills Analysis</span>
        </div>
      </div>

      {/* Skills by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Technical Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-display text-lg font-semibold text-foreground">Technical Skills</h3>
          </div>
          <div className="space-y-3">
            {technicalSkills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                  <span className="text-xs font-semibold text-accent-emerald">
                    +{skill.growth}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.demand}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{skill.sector}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Soft Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-500" />
            <h3 className="font-display text-lg font-semibold text-foreground">Soft Skills</h3>
          </div>
          <div className="space-y-3">
            {softSkills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                  <span className="text-xs font-semibold text-accent-emerald">
                    +{skill.growth}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.demand}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{skill.sector}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Emerging Skills */}
        <div className="card-intelligence p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-display text-lg font-semibold text-foreground">Emerging Skills</h3>
          </div>
          <div className="space-y-3">
            {emergingSkills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                  <span className="text-xs font-semibold text-green-500">
                    +{skill.growth}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.demand}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{skill.sector}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Training Programs */}
      <div className="card-intelligence p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-accent-emerald" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Available Training Programs
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainingPrograms.map((program, index) => (
            <motion.div
              key={program.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-accent-emerald/30 transition-colors"
            >
              <h4 className="font-semibold text-foreground mb-1">{program.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{program.provider}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {program.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 text-xs rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{program.duration}</span>
                {program.funding && (
                  <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 font-medium">
                    {program.funding}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

