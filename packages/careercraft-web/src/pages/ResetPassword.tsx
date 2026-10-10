import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Shield, CheckCircle2, Sparkles, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimiter";
import { usePageMeta } from "@/hooks/usePageMeta";

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  usePageMeta({ title: "Reset password · Faircopy", noindex: true });
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  
  const { trackEvent } = useSessionTracking(null);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          setIsValidSession(false);
          toast.error("Invalid or expired reset link. Please request a new one.");
          return;
        }

        // Check if this is a recovery session
        if (session) {
          setIsValidSession(true);
          setUserEmail(session.user.email || null);
        } else {
          setIsValidSession(false);
          toast.error("Invalid or expired reset link. Please request a new one.");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    // Listen for password recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsCheckingSession(false);
        setUserEmail(session?.user.email || null);
      } else if (event === "SIGNED_IN" && !isCheckingSession) {
        // User successfully updated password and is now signed in
        navigate("/");
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, [navigate, isCheckingSession]);

  useEffect(() => {
    // Calculate password strength
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

  const checkAuthRateLimit = (): boolean => {
    const result = checkRateLimit('password-reset', RATE_LIMITS.AUTH);
    if (!result.allowed) {
      setIsRateLimited(true);
      const minutes = Math.ceil((result.retryAfter || 60) / 60);
      setRateLimitMessage(`Too many attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`);
      return false;
    }
    setIsRateLimited(false);
    setRateLimitMessage("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Check rate limit
    if (!checkAuthRateLimit()) return;

    // Validate password
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        // Track failed password reset
        await trackEvent('password_reset_failure', { 
          email: userEmail, 
          reason: error.message 
        });
        throw error;
      }

      // Track successful password reset
      await trackEvent('password_reset_complete', { 
        email: userEmail 
      });

      toast.success("Password updated successfully! Signing you in...");
      
      // Small delay to show success message, then navigate
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      console.error("Password update error:", error);
      if (error.message?.includes("same as")) {
        toast.error("New password must be different from your old password");
      } else if (error.message?.includes("weak")) {
        toast.error("Password is too weak. Please choose a stronger password.");
      } else {
        toast.error(error.message || "Failed to update password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-600 font-medium">Verifying reset link...</p>
        </motion.div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-md border-2 border-red-100/50 shadow-xl bg-white/95 backdrop-blur-xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-600">Invalid Reset Link</CardTitle>
              <CardDescription className="text-slate-600">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
                <p className="mb-2">This could happen because:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The link has expired (links are valid for 1 hour)</li>
                  <li>The link has already been used</li>
                  <li>The link was copied incorrectly</li>
                </ul>
              </div>
              <Button 
                onClick={() => navigate("/auth")} 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50 p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -top-40 -left-40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-sky-400/15 rounded-full blur-3xl top-1/3 -right-40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-center text-slate-800">
              Set New Password
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              Create a strong, secure password for your account
            </CardDescription>
            {userEmail && (
              <p className="text-center text-sm text-slate-500">
                Resetting password for: <span className="font-medium">{userEmail}</span>
              </p>
            )}
            
            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield className="w-3 h-3 text-green-500" />
              <span>Your password is encrypted end-to-end</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-slate-700 font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`h-12 pr-12 border-2 ${errors.password ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  <div className="space-y-2">
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`h-12 pr-12 border-2 ${errors.confirmPassword ? 'border-red-300' : 'border-blue-100'} focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Passwords match
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300" 
                  disabled={isLoading || passwordStrength < 100 || isRateLimited}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Set New Password
                    </>
                  )}
                </Button>
              </motion.div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>After setting your password, you'll be automatically signed in.</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
