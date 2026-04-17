/**
 * TryUs - Guest mode page for trying the AI Career Coach
 * Allows visitors to experience the core chat feature without signing up.
 */

import { motion } from "framer-motion";
import { MessageSquareText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import CareerCoach from "@/components/rag/CareerCoach";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TryUs() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-bold text-white">CareerCraft</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
              Guest Mode
            </Badge>
            <Link to="/auth">
              <Button size="sm" variant="outline" className="text-xs">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageSquareText className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">AI Career Coach</h1>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto">
            Ask questions about careers, jobs, training programs, and government budget allocations
            in South Australia. Powered by Hours and real government documents.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
          style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
        >
          <CareerCoach />
        </motion.div>
      </main>
    </div>
  );
}
