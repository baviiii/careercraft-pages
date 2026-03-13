import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Sparkles, FileText, Workflow, Wand2, ArrowRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import CareerCoach from "@/components/rag/CareerCoach";

const steps = [
  {
    id: 1,
    title: "Add your career documents",
    description: "Start with your resume, cover letters, and job descriptions. We'll use them as the source of truth.",
    icon: UploadCloud,
    actionLabel: "Open Resume Builder",
    actionPath: "/builder",
  },
  {
    id: 2,
    title: "Shape your career agent",
    description: "Pick a persona like ATS Critic, Career Storyteller, or Gap Finder and tell it what to focus on.",
    icon: Workflow,
    actionLabel: "Pick a Persona",
    actionPath: "#agent-config",
  },
  {
    id: 3,
    title: "Chat, iterate, export",
    description: "Ask questions, get rewrites and analysis with citations, then export or reuse the conversation.",
    icon: Wand2,
    actionLabel: "Start Chatting",
    actionPath: "#chat",
  },
];

export default function Playground() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <section className="border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-10 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm shadow-blue-500/20">
                <Sparkles className="h-3 w-3 text-blue-400" />
                Live Playground · Career Intelligence First
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
                Build your own{" "}
                <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                  Career Intelligence Assistant
                </span>{" "}
                — no code.
              </h1>
              <p className="max-w-xl text-sm sm:text-base text-slate-300">
                Upload your career documents, pick a persona, and chat with an agent that actually knows your story —
                powered by the same South Australian policy and workforce intelligence as the main platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-5 text-sm font-semibold shadow-lg shadow-blue-500/40 hover:bg-blue-500"
                  onClick={() => navigate("#chat")}
                >
                  Open Playground
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="inline-flex items-center gap-2 rounded-full border-slate-600 bg-slate-900/60 px-6 py-5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                  onClick={() => navigate("/builder")}
                >
                  Upload my resume
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Brain className="h-3 w-3 text-sky-400" />
                  Agentic + Graph RAG
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3 text-emerald-400" />
                  SA Government documents
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>No sign-up required in guest mode</span>
              </div>
            </div>

            <motion.div
              className="flex-1 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-4 shadow-2xl shadow-blue-900/40"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500">
                    <Brain className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Playground Preview
                    </p>
                    <p className="text-[11px] text-slate-500">Career Coach · Agentic RAG</p>
                  </div>
                </div>
              </div>
              <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-black/90">
                <CareerCoach />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/80 bg-slate-950 py-10 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          <div className="space-y-4" id="agent-config">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-50">
              How the Career Playground works
            </h2>
            <p className="text-sm text-slate-300">
              Follow the steps to get a personalised agent. You can always jump ahead and start chatting —
              the agent will learn from your questions and the documents you connect.
            </p>

            <div className="space-y-4">
              {steps.map((step) => (
                <Card
                  key={step.id}
                  className="border-slate-800 bg-slate-900/80 text-slate-50 shadow-lg shadow-slate-950/40"
                >
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-slate-50">
                      <span className="text-sm font-bold">{step.id}</span>
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <step.icon className="h-4 w-4 text-blue-400" />
                        {step.title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm text-slate-300">
                        {step.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 rounded-full border-slate-700 bg-slate-900/80 text-xs font-medium text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        if (step.actionPath.startsWith("#")) {
                          const el = document.querySelector(step.actionPath);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        } else {
                          navigate(step.actionPath);
                        }
                      }}
                    >
                      {step.actionLabel}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div id="chat">
            <Card className="h-full border-slate-800 bg-slate-900/90 text-slate-50 shadow-2xl shadow-slate-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    Live Career Chat
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-300">
                    This is the same Horus chat you’ll use inside the platform — in guest mode, focused on careers.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-300">Live</span>
                </div>
              </CardHeader>
              <CardContent className="h-[520px] p-2 sm:p-4">
                <CareerCoach />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

