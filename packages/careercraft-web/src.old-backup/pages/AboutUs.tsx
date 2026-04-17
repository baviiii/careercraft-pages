import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Target, Users, Lightbulb, Heart, ArrowLeft, Award, Globe, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To empower every job seeker in South Australia with AI-powered tools and verified government data, making career success accessible to all.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Lightbulb,
      title: "Our Vision",
      description: "A future where career decisions are data-driven, transparent, and accessible, helping South Australians build meaningful careers.",
      color: "from-sky-500 to-sky-600",
    },
    {
      icon: Heart,
      title: "Our Values",
      description: "Transparency, accessibility, innovation, and community. We believe everyone deserves the tools to succeed in their career journey.",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  const team = [
    {
      name: "Innovation",
      role: "Cutting-edge AI technology",
      description: "Leveraging the latest in artificial intelligence and machine learning",
    },
    {
      name: "Data Integrity",
      role: "Verified government sources",
      description: "All our data comes directly from verified South Australian government sources",
    },
    {
      name: "User-Centric",
      role: "Built for job seekers",
      description: "Every feature is designed with real job seekers' needs in mind",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4 sm:mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-4 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent"
            >
              About CareerCraft
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto px-4"
            >
              Empowering South Australians with AI-powered career intelligence and verified government data.
            </motion.p>
          </div>

          {/* Mission Statement */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-20"
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-blue-100">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Our Mission</h2>
              </div>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Hours Intelligence is dedicated to making policy, workforce, and investment intelligence accessible to everyone. 
                We combine cutting-edge AI technology with verified government data to provide real-time insights into policy decisions, 
                workforce trends, budget allocations, and career opportunities.
              </p>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mt-3 sm:mt-4">
                Our platform transforms complex government documents, budgets, workforce strategies, and policy data into
                actionable intelligence, helping users understand where investments are flowing, which sectors are
                growing, and how policy shapes opportunities. Plus personalized career tools to help you succeed.
              </p>
            </div>
          </motion.section>

          {/* Values */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-20"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 mb-8 sm:mb-12 px-4">What We Stand For</h2>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-lg border border-blue-100 hover:shadow-xl transition-all"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-4 sm:mb-6`}>
                    <value.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2 sm:mb-3">{value.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* What Makes Us Different */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-20"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 mb-8 sm:mb-12 px-4">What Makes Us Different</h2>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {team.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-blue-200"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">{item.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-600 mb-2">{item.role}</p>
                  <p className="text-sm sm:text-base text-slate-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Stats */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-sky-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-white"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { icon: Users, label: "Active Users", value: "10K+" },
                { icon: FileText, label: "Government Documents", value: "50+" },
                { icon: Globe, label: "Sectors Covered", value: "12" },
                { icon: Zap, label: "AI-Powered Insights", value: "24/7" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 sm:mb-4 opacity-90" />
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-blue-100">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

