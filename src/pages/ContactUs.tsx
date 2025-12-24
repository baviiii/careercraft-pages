import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

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
              Contact Us
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-2xl mx-auto"
            >
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Get in Touch</h2>
                <p className="text-slate-600 mb-8">
                  We're here to help! Reach out to us through any of these channels.
                </p>
              </div>

              <div className="space-y-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg border border-blue-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Email</h3>
                    <a href="mailto:support@careercraft.com" className="text-blue-600 hover:text-blue-700">
                      support@careercraft.com
                    </a>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg border border-blue-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Phone</h3>
                    <a href="tel:+611300000000" className="text-blue-600 hover:text-blue-700">
                      +61 1300 000 000
                    </a>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg border border-blue-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Address</h3>
                    <p className="text-slate-600">
                      Adelaide, South Australia<br />
                      Australia
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border border-blue-200">
                <h3 className="font-semibold text-slate-800 mb-2">Business Hours</h3>
                <p className="text-slate-600 text-sm">
                  Monday - Friday: 9:00 AM - 5:00 PM AEST<br />
                  Saturday - Sunday: Closed
                </p>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
                {submitted ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Message Sent!</h3>
                    <p className="text-slate-600">We'll get back to you soon.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-slate-700">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-2"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-slate-700">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-2"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject" className="text-slate-700">Subject</Label>
                      <Input
                        id="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="mt-2"
                        placeholder="What's this about?"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-slate-700">Message</Label>
                      <Textarea
                        id="message"
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="mt-2 min-h-[150px]"
                        placeholder="Tell us how we can help..."
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

