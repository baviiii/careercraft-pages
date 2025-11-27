import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTA = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Get Started in Seconds
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Resume?
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of job seekers who have increased their interview rate by 3x 
            with our AI-powered resume optimization.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hero" 
              size="lg" 
              className="group text-lg px-10"
              onClick={() => navigate("/upload")}
            >
              Upload Resume
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10"
              onClick={() => navigate("/template")}
            >
              Build from Template
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            No credit card required • Free ATS score • Instant results
          </p>
        </motion.div>
      </div>
    </section>
  );
};
