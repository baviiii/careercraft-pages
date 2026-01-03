import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Sparkles, ArrowRight, Shield, CheckCircle2, ArrowLeft, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimiter";
import { sanitizeEmail, sanitize } from "@/lib/security/sanitizers";
import { detectXSS } from "@/lib/security/xss";

// Validation schemas
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')
  .transform((val) => val.toLowerCase().trim());

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

const signupSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

const resetEmailSchema = z.object({
  email: emailSchema,
});

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#00A4EF" d="M1 13h10v10H1z" />
    <path fill="#7FBA00" d="M13 1h10v10H13z" />
    <path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);

interface ValidationErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  
  const { trackEvent } = useSessionTracking(null);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    setPasswordStrength(strength);
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 20) return "bg-red-500";
    if (passwordStrength <= 40) return "bg-orange-500";
    if (passwordStrength <= 60) return "bg-yellow-500";
    if (passwordStrength <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 20) return "Very Weak";
    if (passwordStrength <= 40) return "Weak";
    if (passwordStrength <= 60) return "Fair";
    if (passwordStrength <= 80) return "Good";
    return "Strong";
  };

  // Security: Check for XSS in inputs
  const checkInputSecurity = useCallback((value: string, fieldName: string): boolean => {
    if (detectXSS(value)) {
      toast.error(`Invalid characters detected in ${fieldName}`);
      return false;
    }
    return true;
  }, []);

  // Security: Check rate limits
  const checkAuthRateLimit = useCallback((): boolean => {
    const result = checkRateLimit('auth-attempt', RATE_LIMITS.AUTH);
    if (!result.allowed) {
      setIsRateLimited(true);
      const minutes = Math.ceil((result.retryAfter || 60) / 60);
      setRateLimitMessage(`Too many attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`);
      return false;
    }
    setIsRateLimited(false);
    setRateLimitMessage("");
    return true;
  }, []);

  // Helper function to check if user is admin and redirect accordingly
  const checkAdminAndRedirect = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleData) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate("/");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAdminAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        trackEvent('login_success', { email: session.user.email, userId: session.user.id });
        
        setTimeout(() => {
          checkAdminAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleAuth = async () => {
    if (!checkAuthRateLimit()) return;
    
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  };

  const handleMicrosoftAuth = async () => {
    if (!checkAuthRateLimit()) return;
    
    setIsMicrosoftLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'email profile openid',
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Microsoft");
      setIsMicrosoftLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Security checks
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(fullName, 'name')) return;
    if (!checkInputSecurity(email, 'email')) return;

    // Validate inputs
    const validationResult = signupSchema.safeParse({ fullName, email, password });
    if (!validationResult.success) {
      const fieldErrors: ValidationErrors = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path[0] as keyof ValidationErrors;
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedName = sanitize(fullName);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizedName,
          },
        },
      });

      if (error) {
        await trackEvent('signup_failure', { email: sanitizedEmail, reason: error.message });
        throw error;
      }

      // Track successful signup
      await trackEvent('signup_success', { email: sanitizedEmail, userId: data.user?.id });

      toast.success("Account created! Please check your email to verify your account.");
      setEmail("");
      setPassword("");
      setFullName("");
      setErrors({});
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message || "Failed to sign up");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Security checks
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(email, 'email')) return;

    // Validate inputs
    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const fieldErrors: ValidationErrors = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path[0] as keyof ValidationErrors;
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        await trackEvent('login_failure', { email: sanitizedEmail, reason: error.message });
        throw error;
      }

      await trackEvent('login_success', { email: sanitizedEmail, userId: data.user?.id });
      
      toast.success("Signed in successfully!");
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error("Please verify your email address before signing in.");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security checks
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(resetEmail, 'email')) return;

    // Validate email
    const validationResult = resetEmailSchema.safeParse({ email: resetEmail });
    if (!validationResult.success) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setIsResetLoading(true);
    
    // Sanitize email
    const sanitizedEmail = sanitizeEmail(resetEmail);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // Track password reset request
      await trackEvent('password_reset_request', { email: sanitizedEmail });

      toast.success("Password reset link sent! Check your email inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsResetLoading(false);
    }
  };

  const Divider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-blue-100" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-3 text-slate-500 font-medium">Or continue with</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -top-40 -left-40"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-sky-400/15 rounded-full blur-3xl top-1/3 -right-40"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl bottom-0 left-1/3"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 4 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Rate Limit Warning */}
        {isRateLimited && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Security Alert</p>
              <p className="text-sm text-red-600">{rateLimitMessage}</p>
            </div>
          </motion.div>
        )}

        <Card className="w-full border-2 border-blue-100/50 shadow-2xl shadow-blue-500/10 bg-white/95 backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-2"
            >
              <img 
                src="/logo.png" 
                alt="Horus Intelligence" 
                className="w-12 h-12 rounded-xl shadow-lg shadow-blue-500/30 object-contain"
              />
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                Horus Intelligence
              </CardTitle>
            </motion.div>
            <CardDescription className="text-center text-base text-slate-600">
              Intelligence-powered platform for understanding policy, workforce, and opportunities
            </CardDescription>
            
            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield className="w-3 h-3 text-green-500" />
              <span>Enterprise-grade security</span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-blue-50/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-semibold"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-semibold"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                {/* OAuth Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="w-full h-12 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 font-semibold transition-all duration-300 group"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}
                    <span className="ml-3">Continue with Google</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMicrosoftAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="w-full h-12 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 font-semibold transition-all duration-300 group"
                  >
                    {isMicrosoftLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <MicrosoftIcon />
                    )}
                    <span className="ml-3">Continue with Microsoft</span>
                  </Button>
                </motion.div>

                <Divider />

                <form onSubmit={handleSignIn} className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signin-email" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={`h-12 border-2 ${errors.email ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signin-password" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className={`h-12 pr-12 border-2 ${errors.password ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.password}
                      </p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3"
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300" 
                      disabled={isLoading || isRateLimited}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      disabled={isRateLimited}
                    >
                      Forgot your password?
                    </button>
                  </motion.div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                {/* OAuth Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="w-full h-12 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 font-semibold transition-all duration-300 group"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}
                    <span className="ml-3">Continue with Google</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMicrosoftAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="w-full h-12 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 font-semibold transition-all duration-300 group"
                  >
                    {isMicrosoftLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <MicrosoftIcon />
                    )}
                    <span className="ml-3">Continue with Microsoft</span>
                  </Button>
                </motion.div>

                <Divider />

                <form onSubmit={handleSignUp} className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signup-name" className="text-slate-700 font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      className={`h-12 border-2 ${errors.fullName ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signup-email" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={`h-12 border-2 ${errors.email ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signup-password" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className={`h-12 pr-12 border-2 ${errors.password ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.password}
                      </p>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Password strength</span>
                          <span className={`text-xs font-medium ${passwordStrength === 100 ? 'text-green-600' : 'text-slate-500'}`}>
                            {getStrengthText()}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${getStrengthColor()}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> 8+ characters
                          </div>
                          <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> Uppercase
                          </div>
                          <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> Lowercase
                          </div>
                          <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> Number
                          </div>
                          <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> Special char
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300" 
                      disabled={isLoading || isRateLimited || passwordStrength < 100}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Create Account
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50 rounded-lg p-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span>Free to start • No credit card required</span>
                    </div>
                  </motion.div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md border-2 border-blue-100/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Enter your email address and we'll send you a secure link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-slate-700 font-semibold">
                Email Address
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 border-2 border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>A secure reset link will be sent to your email. The link expires in 1 hour.</span>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 h-12 border-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isResetLoading || isRateLimited}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
              >
                {isResetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-5 w-5" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
