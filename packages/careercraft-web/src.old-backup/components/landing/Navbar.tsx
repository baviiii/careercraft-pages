import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FileText, Menu, X, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavbarProps {
  session: Session | null;
}

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Pricing", href: "#pricing" },
];

export const Navbar = ({ session }: NavbarProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)"]
  );
  const backdropBlur = useTransform(
    scrollY,
    [0, 100],
    ["blur(0px)", "blur(12px)"]
  );

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  const scrollToSection = (href: string) => {
    setIsOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        style={{ 
          backgroundColor: hasScrolled ? "rgba(255, 255, 255, 0.8)" : "transparent",
        }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          hasScrolled ? "backdrop-blur-xl border-b border-border/50 shadow-sm" : ""
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img 
                src="/logo.png" 
                alt="CareerCraft" 
                className="w-10 h-10 rounded-xl shadow-lg object-contain"
              />
              <span className="text-xl font-bold text-slate-800">CareerCraft</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => scrollToSection(link.href)}
                  className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
                >
                  {link.name}
                </motion.button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {session ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard")}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/auth")}
                    >
                      Sign In
                    </Button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      variant="hero"
                      onClick={() => navigate("/auth")}
                      className="gap-2 shadow-glow"
                    >
                      <Sparkles className="w-4 h-4" />
                      Get Started
                    </Button>
                  </motion.div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-slate-800"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-40 lg:hidden"
      >
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 pt-24 pb-8">
            <div className="flex flex-col gap-6">
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => scrollToSection(link.href)}
                  className="text-2xl font-semibold text-slate-800 text-left"
                >
                  {link.name}
                </motion.button>
              ))}
              
              <div className="pt-6 border-t border-border flex flex-col gap-4">
                {session ? (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/dashboard");
                      }}
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => {
                        setIsOpen(false);
                        handleSignOut();
                      }}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/auth");
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/auth");
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Get Started Free
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
