import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, Quote, ChevronLeft, ChevronRight, Verified } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Software Engineer",
    company: "Google",
    image: "SC",
    rating: 5,
    text: "I was skeptical at first, but after using CareerCraft, I got callbacks from 4 out of 5 applications. The ATS optimization is incredibly accurate. Landed my dream job at Google!",
    highlight: "4 out of 5 callbacks",
  },
  {
    id: 2,
    name: "Marcus Johnson",
    role: "Product Manager",
    company: "Microsoft",
    image: "MJ",
    rating: 5,
    text: "The AI rewriter transformed my generic bullet points into powerful achievement statements. My resume went from being ignored to getting interviews at top tech companies.",
    highlight: "Top tech interviews",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Data Scientist",
    company: "Amazon",
    image: "ER",
    rating: 5,
    text: "As a career changer, I struggled to present my skills effectively. CareerCraft helped me highlight transferable skills and I got hired at Amazon within 3 weeks!",
    highlight: "Hired in 3 weeks",
  },
  {
    id: 4,
    name: "David Park",
    role: "UX Designer",
    company: "Airbnb",
    image: "DP",
    rating: 5,
    text: "The job description matching feature is a game-changer. It automatically tailored my resume for each application. My interview rate increased by 300%.",
    highlight: "300% more interviews",
  },
  {
    id: 5,
    name: "Lisa Thompson",
    role: "Marketing Director",
    company: "Spotify",
    image: "LT",
    rating: 5,
    text: "I've used many resume tools, but CareerCraft is on another level. The recruiter mode feedback was brutally honest and exactly what I needed to improve.",
    highlight: "Brutally honest feedback",
  },
  {
    id: 6,
    name: "James Wilson",
    role: "DevOps Engineer",
    company: "Netflix",
    image: "JW",
    rating: 5,
    text: "From upload to optimized resume in under 2 minutes. The AI suggestions were spot-on and helped me land a senior role with a 40% salary increase.",
    highlight: "40% salary increase",
  },
];

// Star rating component
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}`}
      />
    ))}
  </div>
);

// Individual testimonial card
const TestimonialCard = ({ testimonial, index, inView }: { 
  testimonial: typeof testimonials[0]; 
  index: number;
  inView: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="group relative"
    >
      <div className="relative h-full bg-card border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all duration-500 hover:shadow-elegant overflow-hidden">
        {/* Quote icon */}
        <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />
        
        {/* Rating */}
        <div className="mb-4">
          <StarRating rating={testimonial.rating} />
        </div>
        
        {/* Testimonial text */}
        <p className="text-foreground leading-relaxed mb-6">
          "{testimonial.text}"
        </p>
        
        {/* Highlight badge */}
        <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
          {testimonial.highlight}
        </div>
        
        {/* Author info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold">
            {testimonial.image}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
              <Verified className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {testimonial.role} at <span className="font-medium">{testimonial.company}</span>
            </p>
          </div>
        </div>
        
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
      </div>
    </motion.div>
  );
};

// Carousel navigation
const CarouselNav = ({ 
  currentPage, 
  totalPages, 
  onPrev, 
  onNext 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPrev: () => void; 
  onNext: () => void;
}) => (
  <div className="flex items-center justify-center gap-4 mt-12">
    <Button
      variant="outline"
      size="icon"
      onClick={onPrev}
      disabled={currentPage === 0}
      className="rounded-full"
    >
      <ChevronLeft className="w-5 h-5" />
    </Button>
    
    <div className="flex gap-2">
      {[...Array(totalPages)].map((_, i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === currentPage ? 'bg-primary' : 'bg-muted'
          }`}
          animate={{ scale: i === currentPage ? 1.2 : 1 }}
        />
      ))}
    </div>
    
    <Button
      variant="outline"
      size="icon"
      onClick={onNext}
      disabled={currentPage === totalPages - 1}
      className="rounded-full"
    >
      <ChevronRight className="w-5 h-5" />
    </Button>
  </div>
);

export const Testimonials = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);

  const visibleTestimonials = testimonials.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <section ref={ref} className="py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary rounded-full blur-3xl"
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
            <Star className="w-4 h-4 fill-current" />
            Success Stories
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
            Loved by <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">50,000+</span> Professionals
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            See how CareerCraft has helped job seekers land their dream roles at top companies worldwide.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleTestimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={testimonial.id} 
              testimonial={testimonial} 
              index={index}
              inView={isInView}
            />
          ))}
        </div>

        {/* Carousel navigation */}
        <CarouselNav
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage(p => Math.max(0, p - 1))}
          onNext={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
        />

        {/* Overall rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-card border border-border rounded-2xl">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground">4.9 out of 5</p>
              <p className="text-sm text-muted-foreground">Based on 2,847 reviews</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
