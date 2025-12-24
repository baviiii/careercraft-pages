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
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent"
            >
              About CareerCraft
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto"
            >
              Empowering South Australians with AI-powered career intelligence and verified government data.
            </motion.p>
          </div>

          {/* Mission Statement */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Our Mission</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed">
                At CareerCraft, we're dedicated to democratizing access to career intelligence for all South Australians. 
                We combine cutting-edge AI technology with verified government data to provide job seekers, students, 
                migrants, and career changers with the insights they need to make informed career decisions.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mt-4">
                Our platform transforms complex government documents, workforce strategies, and policy data into 
                actionable insights, helping users understand where South Australia is investing, which jobs are 
                emerging, and how to align their career path with the state's economic priorities.
              </p>
            </div>
          </motion.section>

          {/* Values */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">What We Stand For</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 hover:shadow-xl transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-6`}>
                    <value.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{value.title}</h3>
                  <p className="text-slate-600">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* What Makes Us Different */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">What Makes Us Different</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-8 border border-blue-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 mb-2">{item.role}</p>
                  <p className="text-slate-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Stats */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-sky-600 rounded-3xl p-12 text-white"
          >
            <h2 className="text-3xl font-bold text-center mb-12">Our Impact</h2>
            <div className="grid md:grid-cols-4 gap-8">
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
                  <stat.icon className="w-10 h-10 mx-auto mb-4 opacity-90" />
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-blue-100">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

