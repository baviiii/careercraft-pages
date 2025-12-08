import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    name: "Free",
    description: "Perfect for trying out our ATS checker",
    price: { monthly: 0, yearly: 0 },
    icon: Zap,
    color: "from-slate-500 to-slate-600",
    features: [
      "1 Resume Analysis",
      "Basic ATS Score",
      "Format Compatibility Check",
      "PDF Export",
      "Email Support",
    ],
    limitations: [
      "No AI Rewriting",
      "No Job Matching",
      "No Cover Letters",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    description: "For serious job seekers ready to land interviews",
    price: { monthly: 19, yearly: 15 },
    icon: Sparkles,
    color: "from-primary to-primary-glow",
    features: [
      "Unlimited Resume Analyses",
      "Advanced ATS Score + Breakdown",
      "AI Resume Rewriter",
      "Job Description Matching",
      "AI Cover Letter Builder",
      "Multiple Export Formats",
      "Recruiter Mode Feedback",
      "Priority Support",
    ],
    limitations: [],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For teams and career services",
    price: { monthly: 49, yearly: 39 },
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    features: [
      "Everything in Pro",
      "Team Dashboard",
      "Bulk Resume Processing",
      "Custom Branding",
      "API Access",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
  },
];

// Pricing card component
const PricingCard = ({ 
  plan, 
  index, 
  inView, 
  isYearly 
}: { 
  plan: typeof plans[0]; 
  index: number; 
  inView: boolean;
  isYearly: boolean;
}) => {
  const navigate = useNavigate();
  const price = isYearly ? plan.price.yearly : plan.price.monthly;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={`relative group ${plan.popular ? 'lg:-mt-8 lg:mb-8' : ''}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <div className={`px-4 py-1.5 bg-gradient-to-r ${plan.color} text-white text-sm font-bold rounded-full shadow-lg`}>
            Most Popular
          </div>
        </motion.div>
      )}
      
      <div className={`relative h-full bg-card border rounded-2xl p-8 overflow-hidden transition-all duration-500 ${
        plan.popular 
          ? 'border-primary shadow-glow hover:shadow-[0_0_80px_hsl(195_92%_48%/0.3)]' 
          : 'border-border/50 hover:border-primary/30 hover:shadow-elegant'
      }`}>
        {/* Background gradient for popular */}
        {plan.popular && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        )}
        
        {/* Header */}
        <div className="relative mb-8">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} mb-4 shadow-lg`}>
            <plan.icon className="w-7 h-7 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
          <p className="text-muted-foreground">{plan.description}</p>
        </div>
        
        {/* Price */}
        <div className="relative mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-foreground">
              ${price}
            </span>
            {price > 0 && (
              <span className="text-muted-foreground">/month</span>
            )}
          </div>
          {isYearly && price > 0 && (
            <p className="text-sm text-primary mt-1">
              Save ${(plan.price.monthly - plan.price.yearly) * 12}/year
            </p>
          )}
        </div>
        
        {/* CTA Button */}
        <Button
          variant={plan.popular ? "hero" : "outline"}
          size="lg"
          className={`w-full mb-8 group/btn ${plan.popular ? 'shadow-glow' : ''}`}
          onClick={() => navigate("/auth")}
        >
          {plan.cta}
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
        
        {/* Features */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">What's included:</p>
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mt-0.5`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </motion.li>
            ))}
          </ul>
          
          {/* Limitations */}
          {plan.limitations.length > 0 && (
            <ul className="space-y-3 pt-4 border-t border-border">
              {plan.limitations.map((limitation, i) => (
                <li key={i} className="flex items-start gap-3 opacity-50">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <span className="text-xs">✕</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{limitation}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const Pricing = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section ref={ref} id="pricing" className="py-16 md:py-32 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-80 h-80 border border-primary/10 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-60 -left-60 w-[500px] h-[500px] border border-primary/5 rounded-full"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Simple Pricing
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
            Choose Your Plan
          </h2>
          
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 px-4">
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
          
          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-muted rounded-full">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">
              Save 20%
            </span>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard 
              key={plan.name} 
              plan={plan} 
              index={index} 
              inView={isInView}
              isYearly={isYearly}
            />
          ))}
        </div>

        {/* Money-back guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-full">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">30-Day Money-Back Guarantee</p>
              <p className="text-sm text-muted-foreground">Not satisfied? Get a full refund, no questions asked.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
