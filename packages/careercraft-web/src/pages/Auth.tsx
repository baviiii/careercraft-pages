import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  ArrowUpRight,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimiter";
import { sanitizeEmail, sanitize } from "@/lib/security/sanitizers";
import { detectXSS } from "@/lib/security/xss";

const SESSION_TOKEN_KEY = "horus_session_token";

/* ─── validation ─── */
const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .max(254, "Email is too long")
  .transform((val) => val.toLowerCase().trim());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s\-']+$/, "Name contains invalid characters"),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

const resetEmailSchema = z.object({ email: emailSchema });

/* ─── provider marks ─── */
const GoogleMark = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const MicrosoftMark = () => (
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

type Mode = "signin" | "signup";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="mt-2 cc-font-mono text-[11px] tracking-wider uppercase text-[color:var(--cc-rust)] flex items-center gap-2">
      <AlertTriangle className="w-3 h-3" /> {msg}
    </p>
  ) : null;

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

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
  const [, setSession] = useState<Session | null>(null);

  /* Password strength */
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let s = 0;
    if (password.length >= 8) s += 20;
    if (/[A-Z]/.test(password)) s += 20;
    if (/[a-z]/.test(password)) s += 20;
    if (/[0-9]/.test(password)) s += 20;
    if (/[^A-Za-z0-9]/.test(password)) s += 20;
    setPasswordStrength(s);
  }, [password]);

  const strengthLabel =
    passwordStrength <= 20 ? "Very weak" :
    passwordStrength <= 40 ? "Weak" :
    passwordStrength <= 60 ? "Fair" :
    passwordStrength <= 80 ? "Good" : "Strong";

  /* Security checks */
  const checkInputSecurity = useCallback((value: string, fieldName: string): boolean => {
    if (fieldName === "email" || fieldName === "password") {
      if (/<script|javascript:|on\w+\s*=\s*["']/i.test(value)) {
        toast.error(`Invalid characters detected in ${fieldName}`);
        return false;
      }
      return true;
    }
    const xssResult = detectXSS(value);
    if (xssResult.detected) {
      toast.error(`Invalid characters detected in ${fieldName}`);
      return false;
    }
    return true;
  }, []);

  const checkAuthRateLimit = useCallback((): boolean => {
    const result = checkRateLimit("auth-attempt", RATE_LIMITS.AUTH);
    if (!result.allowed) {
      setIsRateLimited(true);
      const minutes = Math.ceil((result.retryAfter || 60) / 60);
      setRateLimitMessage(`Too many attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`);
      return false;
    }
    setIsRateLimited(false);
    setRateLimitMessage("");
    return true;
  }, []);

  const checkAdminAndRedirect = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (roleData) navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      console.error("Error checking admin status:", err);
      navigate("/dashboard");
    }
  };

  const trackAuthEvent = useCallback(
    async (
      eventType:
        | "login_success"
        | "login_failure"
        | "signup_success"
        | "signup_failure"
        | "password_reset_request",
      userEmail?: string | null,
      userId?: string | null,
      reason?: string
    ) => {
      try {
        const response = await supabase.functions.invoke("track-session", {
          body: {
            event: eventType,
            email: userEmail || undefined,
            userId: userId || undefined,
            userAgent: navigator.userAgent,
            reason: reason || undefined,
          },
        });
        if (!response.error && eventType === "login_success" && response.data?.sessionToken) {
          localStorage.setItem(SESSION_TOKEN_KEY, response.data.sessionToken);
        }
      } catch (err) {
        console.error("[Auth] Error tracking event:", err);
      }
    },
    []
  );

  useEffect(() => {
    let hasTrackedInitialSession = false;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isOAuthRedirect = urlParams.has("code") || hashParams.has("access_token");
        if (isOAuthRedirect && !hasTrackedInitialSession) {
          hasTrackedInitialSession = true;
          const isNewUser =
            currentSession.user.created_at &&
            new Date().getTime() - new Date(currentSession.user.created_at).getTime() < 60000;
          trackAuthEvent(isNewUser ? "signup_success" : "login_success", currentSession.user.email, currentSession.user.id);
        }
        checkAdminAndRedirect(currentSession.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession && event === "SIGNED_IN" && !hasTrackedInitialSession) {
        hasTrackedInitialSession = true;
        const isNewUser =
          currentSession.user.created_at &&
          new Date().getTime() - new Date(currentSession.user.created_at).getTime() < 60000;
        trackAuthEvent(isNewUser ? "signup_success" : "login_success", currentSession.user.email, currentSession.user.id);
        setTimeout(() => checkAdminAndRedirect(currentSession.user.id), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, trackAuthEvent]);

  /* ─── OAuth handlers ─── */
  const handleGoogleAuth = async () => {
    if (!checkAuthRateLimit()) return;
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      if (err.message?.includes("not enabled")) toast.error("Google sign-in is not configured. Please contact support.");
      else if (err.message?.includes("network") || err.message?.includes("connection")) toast.error("Connection error. Please check your internet and try again.");
      else toast.error(err.message || "Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleMicrosoftAuth = async () => {
    if (!checkAuthRateLimit()) return;
    setIsMicrosoftLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: { redirectTo: `${window.location.origin}/`, scopes: "email profile openid" },
      });
      if (error) throw error;
    } catch (err: any) {
      if (err.message?.includes("not enabled")) toast.error("Microsoft sign-in is not configured. Please contact support.");
      else if (err.message?.includes("network") || err.message?.includes("connection")) toast.error("Connection error. Please check your internet and try again.");
      else toast.error(err.message || "Failed to sign in with Microsoft. Please try again.");
      setIsMicrosoftLoading(false);
    }
  };

  /* ─── email/password handlers ─── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(fullName, "name")) return;
    if (!checkInputSecurity(email, "email")) return;

    const result = signupSchema.safeParse({ fullName, email, password });
    if (!result.success) {
      const f: ValidationErrors = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof ValidationErrors;
        if (!f[path]) f[path] = err.message;
      });
      setErrors(f);
      return;
    }

    setIsLoading(true);
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedName = sanitize(fullName);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: sanitizedName } },
      });
      if (error) {
        await trackAuthEvent("signup_failure", sanitizedEmail, null, error.message);
        throw error;
      }
      await trackAuthEvent("signup_success", sanitizedEmail, data.user?.id);
      toast.success("Account created! Please check your email to verify your account.");
      setEmail("");
      setPassword("");
      setFullName("");
      setErrors({});
    } catch (err: any) {
      if (err.message?.includes("already registered")) toast.error("An account with this email already exists. Please sign in instead.");
      else toast.error(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(email, "email")) return;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const f: ValidationErrors = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof ValidationErrors;
        if (!f[path]) f[path] = err.message;
      });
      setErrors(f);
      return;
    }

    setIsLoading(true);
    const sanitizedEmail = sanitizeEmail(email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });
      if (error) {
        await trackAuthEvent("login_failure", sanitizedEmail, null, error.message);
        throw error;
      }
      await trackAuthEvent("login_success", sanitizedEmail, data.user?.id);
      toast.success("Signed in successfully!");
    } catch (err: any) {
      if (err.message?.includes("Invalid login credentials")) toast.error("Invalid email or password. Please try again.");
      else if (err.message?.includes("Email not confirmed")) toast.error("Please verify your email address before signing in.");
      else toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuthRateLimit()) return;
    if (!checkInputSecurity(resetEmail, "email")) return;
    const result = resetEmailSchema.safeParse({ email: resetEmail });
    if (!result.success) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsResetLoading(true);
    const sanitizedEmail = sanitizeEmail(resetEmail);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      await trackAuthEvent("password_reset_request", sanitizedEmail);
      toast.success("Password reset link sent! Check your email inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setIsResetLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  /* ─── UI ─── */
  return (
    <main className="cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] overflow-x-hidden antialiased">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT — editorial marquee */}
        <aside className="relative lg:col-span-5 bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] px-6 md:px-10 py-12 md:py-16 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 cc-grain pointer-events-none" />
          <div className="relative">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-cream)] cc-link"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to the atelier
            </button>

            <div className="mt-14 md:mt-20">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 00 · The Gate</div>
              <h1 className="mt-4 cc-font-display leading-[0.86] tracking-[-0.035em] text-5xl md:text-6xl lg:text-7xl">
                <span className="block">Sign the</span>
                <span className="block cc-italic-wonk text-[color:var(--cc-rust)]">ledger.</span>
              </h1>
              <p className="mt-8 cc-font-editorial text-xl md:text-[22px] leading-[1.45] text-[color:var(--cc-cream)]/80 max-w-md">
                Enter the shop and the presses start warming. Résumé, interview
                and career map, all bound to live South Australian intelligence.
              </p>
            </div>
          </div>

          <div className="relative mt-16 grid grid-cols-3 gap-4 md:gap-6 border-t border-[color:var(--cc-cream)]/20 pt-6">
            <div>
              <div className="cc-label-sm text-[color:var(--cc-cream)]/55">Vol.</div>
              <div className="cc-font-display italic text-2xl md:text-3xl mt-1">I · MMXXVI</div>
            </div>
            <div>
              <div className="cc-label-sm text-[color:var(--cc-cream)]/55">Press</div>
              <div className="cc-font-display italic text-2xl md:text-3xl mt-1">Adelaide</div>
            </div>
            <div>
              <div className="cc-label-sm text-[color:var(--cc-cream)]/55">Free</div>
              <div className="cc-font-display italic text-2xl md:text-3xl mt-1">to begin</div>
            </div>
          </div>
        </aside>

        {/* RIGHT — form */}
        <section className="lg:col-span-7 flex items-start lg:items-center justify-center px-6 md:px-10 py-14 md:py-16">
          <div className="w-full max-w-md">
            {/* Rate limit banner */}
            <AnimatePresence>
              {isRateLimited && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-8 border-2 border-[color:var(--cc-rust)] bg-[color:var(--cc-cream)] p-4 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-[color:var(--cc-rust)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="cc-label text-[color:var(--cc-rust)]">Security Alert</p>
                    <p className="mt-1 cc-font-editorial text-[17px] text-[color:var(--cc-ink-soft)]">{rateLimitMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {showForgotPassword ? (
              /* ─── Reset password panel ─── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] cc-link mb-8"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>
                <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Reset</div>
                <h2 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
                  Reset your<br /><span className="cc-italic-wonk">password.</span>
                </h2>
                <p className="mt-5 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] leading-snug">
                  Enter your email — we'll post a secure reset link. Valid for one hour.
                </p>

                <form onSubmit={handleForgotPassword} className="mt-10 space-y-8">
                  <div>
                    <label htmlFor="reset-email" className="cc-label-sm text-[color:var(--cc-ash)]">Email address</label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="cc-input mt-2"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResetLoading || isRateLimited}
                    className="cc-btn cc-btn-primary w-full"
                  >
                    {isResetLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <>Send Reset Link <ArrowUpRight className="w-4 h-4 cc-arrow-up" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ─── Sign in / Sign up ─── */
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* Mode switch */}
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <div className="cc-label text-[color:var(--cc-rust)]">
                      {mode === "signin" ? "§ 01 · Return" : "§ 01 · First entry"}
                    </div>
                    <h2 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
                      {mode === "signin" ? (
                        <>Welcome<br /><span className="cc-italic-wonk">back.</span></>
                      ) : (
                        <>Open a<br /><span className="cc-italic-wonk">new file.</span></>
                      )}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-b border-[color:var(--cc-hair-strong)] mb-10">
                  {(["signin", "signup"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`pb-4 cc-label relative transition-colors ${
                        mode === m ? "text-[color:var(--cc-ink)]" : "text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Create account"}
                      {mode === m && (
                        <motion.span
                          layoutId="auth-underline"
                          className="absolute left-0 right-0 -bottom-px h-[2px] bg-[color:var(--cc-ink)]"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* OAuth */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="cc-btn cc-btn-ghost w-full"
                  >
                    {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={handleMicrosoftAuth}
                    disabled={isGoogleLoading || isMicrosoftLoading || isRateLimited}
                    className="cc-btn cc-btn-ghost w-full"
                  >
                    {isMicrosoftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftMark />}
                    Continue with Microsoft
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-[color:var(--cc-hair-strong)]" />
                  <span className="cc-label-sm text-[color:var(--cc-ash)]">or by hand</span>
                  <div className="flex-1 h-px bg-[color:var(--cc-hair-strong)]" />
                </div>

                {/* Email/password form */}
                {mode === "signin" ? (
                  <form onSubmit={handleSignIn} className="space-y-7">
                    <div>
                      <label htmlFor="signin-email" className="cc-label-sm text-[color:var(--cc-ash)]">Email</label>
                      <input
                        id="signin-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`cc-input mt-2 ${errors.email ? "cc-input-error" : ""}`}
                      />
                      <FieldError msg={errors.email} />
                    </div>

                    <div>
                      <label htmlFor="signin-password" className="cc-label-sm text-[color:var(--cc-ash)]">Password</label>
                      <div className="relative">
                        <input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          placeholder="your secret"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`cc-input mt-2 pr-10 ${errors.password ? "cc-input-error" : ""}`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-0 bottom-3 text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <FieldError msg={errors.password} />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isRateLimited}
                      className="cc-btn cc-btn-primary w-full"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                      ) : (
                        <>Sign In <ArrowUpRight className="w-4 h-4 cc-arrow-up" /></>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isRateLimited}
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full cc-label text-[color:var(--cc-ink)] cc-link"
                    >
                      Forgot your password?
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-7">
                    <div>
                      <label htmlFor="signup-name" className="cc-label-sm text-[color:var(--cc-ash)]">Full name</label>
                      <input
                        id="signup-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="e.g. Ada Lovelace"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`cc-input mt-2 ${errors.fullName ? "cc-input-error" : ""}`}
                      />
                      <FieldError msg={errors.fullName} />
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="cc-label-sm text-[color:var(--cc-ash)]">Email</label>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`cc-input mt-2 ${errors.email ? "cc-input-error" : ""}`}
                      />
                      <FieldError msg={errors.email} />
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="cc-label-sm text-[color:var(--cc-ash)]">Password</label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          placeholder="eight characters at least"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`cc-input mt-2 pr-10 ${errors.password ? "cc-input-error" : ""}`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-0 bottom-3 text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <FieldError msg={errors.password} />

                      {password && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between cc-label-sm">
                            <span className="text-[color:var(--cc-ash)]">Strength</span>
                            <span
                              className={
                                passwordStrength === 100
                                  ? "text-[color:var(--cc-ink)]"
                                  : "text-[color:var(--cc-rust)]"
                              }
                            >
                              {strengthLabel}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="h-1 flex-1"
                                style={{
                                  background:
                                    passwordStrength / 20 > i
                                      ? passwordStrength === 100
                                        ? "var(--cc-ink)"
                                        : "var(--cc-rust)"
                                      : "var(--cc-hair-strong)",
                                }}
                              />
                            ))}
                          </div>
                          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 cc-font-mono text-[11px] uppercase tracking-[0.18em]">
                            {[
                              { ok: password.length >= 8, t: "8+ chars" },
                              { ok: /[A-Z]/.test(password), t: "Uppercase" },
                              { ok: /[a-z]/.test(password), t: "Lowercase" },
                              { ok: /[0-9]/.test(password), t: "Number" },
                              { ok: /[^A-Za-z0-9]/.test(password), t: "Symbol" },
                            ].map((r, i) => (
                              <li
                                key={i}
                                className={`flex items-center gap-1.5 ${
                                  r.ok ? "text-[color:var(--cc-ink)]" : "text-[color:var(--cc-ash)]"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" /> {r.t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isRateLimited || passwordStrength < 100}
                      className="cc-btn cc-btn-primary w-full"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating file…</>
                      ) : (
                        <>Create Account <ArrowUpRight className="w-4 h-4 cc-arrow-up" /></>
                      )}
                    </button>

                    <p className="cc-label-sm text-[color:var(--cc-ash)] text-center">
                      Free to start · No card required
                    </p>
                  </form>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
