import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Twitter, 
  Linkedin, 
  Github, 
  Mail,
  ArrowUpRight,
  Heart
} from "lucide-react";

const footerLinks = {
  product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "ATS Checker", href: "/upload" },
    { name: "Resume Builder", href: "/template" },
    { name: "Cover Letter", href: "/cover-letter" },
  ],
  resources: [
    { name: "Blog", href: "#" },
    { name: "Resume Examples", href: "#" },
    { name: "Career Guides", href: "#" },
    { name: "Interview Tips", href: "#" },
    { name: "Salary Calculator", href: "#" },
  ],
  company: [
    { name: "About Us", href: "#" },
    { name: "Careers", href: "#", badge: "Hiring" },
    { name: "Press Kit", href: "#" },
    { name: "Contact", href: "#" },
    { name: "Partners", href: "#" },
  ],
  legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" },
    { name: "GDPR", href: "#" },
  ],
};

const socialLinks = [
  { name: "Twitter", icon: Twitter, href: "#" },
  { name: "LinkedIn", icon: Linkedin, href: "#" },
  { name: "GitHub", icon: Github, href: "#" },
  { name: "Email", icon: Mail, href: "mailto:hello@careercraft.ai" },
];

// Footer link component
const FooterLink = ({ name, href, badge }: { name: string; href: string; badge?: string }) => {
  const navigate = useNavigate();
  const isExternal = href.startsWith("http");
  const isAnchor = href.startsWith("#");
  
  const handleClick = (e: React.MouseEvent) => {
    if (isAnchor) {
      e.preventDefault();
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    } else if (!isExternal) {
      e.preventDefault();
      navigate(href);
    }
  };
  
  return (
    <a
      href={href}
      onClick={handleClick}
      className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{name}</span>
      {badge && (
        <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
          {badge}
        </span>
      )}
      {isExternal && (
        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </a>
  );
};

// Footer section component
const FooterSection = ({ title, links }: { title: string; links: typeof footerLinks.product }) => (
  <div>
    <h4 className="font-semibold text-foreground mb-4">{title}</h4>
    <ul className="space-y-3">
      {links.map((link) => (
        <li key={link.name}>
          <FooterLink {...link} />
        </li>
      ))}
    </ul>
  </div>
);

// Newsletter signup
const Newsletter = () => (
  <div className="lg:col-span-2">
    <h4 className="font-semibold text-foreground mb-4">Stay Updated</h4>
    <p className="text-muted-foreground mb-4">
      Get the latest career tips and product updates delivered to your inbox.
    </p>
    <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder="Enter your email"
        className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
      >
        Subscribe
      </motion.button>
    </form>
    <p className="text-xs text-muted-foreground mt-2">
      No spam, unsubscribe anytime.
    </p>
  </div>
);

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-muted/30 border-t border-border">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">CareerCraft</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                AI-powered resume optimization that helps you beat ATS systems and land more interviews. 
                Built for job seekers who want to stand out.
              </p>
            </motion.div>
            
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>
          
          {/* Link columns */}
          <FooterSection title="Product" links={footerLinks.product} />
          <FooterSection title="Resources" links={footerLinks.resources} />
          <FooterSection title="Company" links={footerLinks.company} />
          
          {/* Newsletter */}
          <Newsletter />
        </div>
      </div>
      
      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>© {currentYear} CareerCraft. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <div className="flex gap-4">
                {footerLinks.legal.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Made with</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </motion.div>
              <span>for job seekers everywhere</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
