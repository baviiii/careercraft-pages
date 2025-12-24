import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Eye, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: FileText,
      title: "Information We Collect",
      content: [
        "Personal information you provide (name, email, resume data)",
        "Usage data and analytics to improve our services",
        "Cookies and similar tracking technologies",
        "Information from third-party services when you connect accounts",
      ],
    },
    {
      icon: Lock,
      title: "How We Use Your Information",
      content: [
        "To provide and improve our career intelligence services",
        "To personalize your experience and recommendations",
        "To communicate with you about your account and our services",
        "To analyze usage patterns and improve our platform",
        "To comply with legal obligations",
      ],
    },
    {
      icon: Shield,
      title: "Data Security",
      content: [
        "We use industry-standard encryption to protect your data",
        "All data is stored securely in encrypted databases",
        "Regular security audits and updates",
        "Access controls and authentication measures",
        "We never sell your personal information to third parties",
      ],
    },
    {
      icon: Eye,
      title: "Your Rights",
      content: [
        "Access your personal data at any time",
        "Request correction of inaccurate information",
        "Request deletion of your account and data",
        "Opt-out of marketing communications",
        "Export your data in a portable format",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50">
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent"
            >
              Privacy Policy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-slate-600"
            >
              Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
            </motion.p>
          </div>

          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 mb-12"
          >
            <p className="text-lg text-slate-600 leading-relaxed">
              At CareerCraft, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our platform. By using CareerCraft, 
              you agree to the collection and use of information in accordance with this policy.
            </p>
          </motion.div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-8 border border-blue-200 text-center"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4">Questions About Privacy?</h3>
            <p className="text-slate-600 mb-6">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@careercraft.com" className="text-blue-600 hover:text-blue-700 font-semibold">
                privacy@careercraft.com
              </a>
            </p>
            <Button onClick={() => navigate("/contact")} variant="outline">
              Contact Us
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

