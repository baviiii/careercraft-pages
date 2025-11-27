import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Career Clarity",
    description: "Define your professional goals with precision and create a personalized roadmap to success.",
  },
  {
    icon: TrendingUp,
    title: "Growth Tracking",
    description: "Monitor your progress and celebrate milestones as you advance toward your career objectives.",
  },
  {
    icon: Users,
    title: "Expert Guidance",
    description: "Connect with mentors and industry professionals who understand your aspirations.",
  },
  {
    icon: Zap,
    title: "Smart Tools",
    description: "Leverage AI-powered insights and resources to accelerate your professional development.",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to
            <span className="block bg-hero-gradient bg-clip-text text-transparent mt-1">
              Craft Your Career
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to support your professional growth at every stage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50 hover:border-primary/30 bg-card"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <CardContent className="p-8 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-hero-gradient flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
