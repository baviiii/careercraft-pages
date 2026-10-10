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
import { AuthExperience } from "@/components/auth/AuthExperience";
import { peekGuestReturn } from "@/features/resume-builder/lib/guestDraft";
import { resolvePostAuthDestination } from "@/lib/postAuthDestination";
import { usePageMeta } from "@/hooks/usePageMeta";

const SESSION_TOKEN_KEY = "horus_session_token";
const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();

const getAppBaseUrl = () => {
  if (PUBLIC_APP_URL) {
    return PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  return window.location.origin;
};

const getAppRedirectUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
};

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

/* ─── why a builder guest was sent here ─── */
/* Mirrors ACCOUNT_GATE_COPY in useResumeBuilder, but phrased for someone who
   has already arrived and is looking at a form, rather than for the moment
   they clicked. Keyed by AccountGateReason. */
const GATE_NOTICE: Record<string, { title: string; body: string }> = {
  export: {
    title: "Create your account to download",
    body: "Your résumé is saved and comes with you — it'll be open and ready the moment you're in.",
  },
  "ai-read-file": {
    title: "Create your account to read that file",
    body: "AI reading works on PDFs, Word files and photos. Your draft is saved; you'll just need to pick the file again once you're in.",
  },
  "ai-smart-import": {
    title: "Smart import needs an account",
    body: "AI reads the whole file and fills every field. Your draft is saved; choose the file again once you're in.",
  },
  "ai-rewrite": {
    title: "Create your account to rewrite bullets",
    body: "Your draft comes with you — nothing you've typed is lost.",
  },
  "continue-ats": {
    title: "Create your account for ATS check",
    body: "Your draft comes with you — then you can score it against a job ad.",
  },
  "continue-jobs": {
    title: "Create your account to browse jobs",
    body: "Your draft comes with you — then you can open roles across Australia.",
  },
  "continue-news": {
    title: "Create your account for market news",
    body: "Your draft comes with you — then you can see hiring and pay by sector.",
  },
  "continue-chat": {
    title: "Create your account for career chat",
    body: "Your draft comes with you — then you can ask with sources attached.",
  },
};

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
  usePageMeta({ title: "Sign in · Faircopy", noindex: true });
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

  /* Why this visitor is here, if they were sent by a gate in the builder.
     Read once on mount and NOT consumed — the redirect resolver is the only
     consumer, and eating the record here would break the return trip.

     This is page text rather than a toast on purpose: it has to stay legible
     for as long as it takes to fill in a signup form, and two of the three
     signup flows reload the page, which wipes toast state entirely. */
  const [gateNotice] = useState(() => {
    const pending = peekGuestReturn();
    if (!pending?.intent) return null;
    return GATE_NOTICE[pending.intent] ?? null;
  });

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

  /* Claiming the guest draft and picking the landing page used to live here.
     It moved to postAuthDestination because this page is only mounted for one
     of the three signup flows — OAuth and email-confirmation links both come
     back to "/", so anything that only runs here never ran for them. The
     success message moved too: it is written as a note and shown wherever the
     visitor actually lands, since a toast does not survive a page reload. */
  const redirectAfterAuth = async (userId: string) => {
    const destination = await resolvePostAuthDestination(userId);
    navigate(destination, { replace: true });
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
    let cancelled = false;
    const pending = new Set<number>();

    /* Same wait as the homepage. The callback (and a getSession that
       resolves in the same turn) still holds Supabase's auth lock. Filing
       the guest draft before that lock drops is what made a first sign-in
       report the résumé as lost. */
    const finishSignIn = (currentSession: Session) => {
      const timer = window.setTimeout(() => {
        pending.delete(timer);
        if (cancelled) return;
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
        void redirectAfterAuth(currentSession.user.id);
      }, 0);
      pending.add(timer);
    };

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) finishSignIn(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession && event === "SIGNED_IN" && !hasTrackedInitialSession) {
        hasTrackedInitialSession = true;
        const isNewUser =
          currentSession.user.created_at &&
          new Date().getTime() - new Date(currentSession.user.created_at).getTime() < 60000;
        const timer = window.setTimeout(() => {
          pending.delete(timer);
          if (cancelled) return;
          trackAuthEvent(isNewUser ? "signup_success" : "login_success", currentSession.user.email, currentSession.user.id);
          void redirectAfterAuth(currentSession.user.id);
        }, 0);
        pending.add(timer);
      }
    });

    return () => {
      cancelled = true;
      pending.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
    };
  }, [navigate, trackAuthEvent]);

  /* ─── OAuth handlers ─── */
  const handleGoogleAuth = async () => {
    if (!checkAuthRateLimit()) return;
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAppRedirectUrl("/"),
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
        options: { redirectTo: getAppRedirectUrl("/"), scopes: "email profile openid" },
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
        options: { emailRedirectTo: getAppRedirectUrl("/"), data: { full_name: sanitizedName } },
      });
      if (error) {
        await trackAuthEvent("signup_failure", sanitizedEmail, null, error.message);
        throw error;
      }
      await trackAuthEvent("signup_success", sanitizedEmail, data.user?.id);

      /* Whether a confirmation email exists is a project setting, not
         something this form can assume. signUp returns a session when
         confirmations are OFF — in that case they are already signed in and
         the auth listener is about to redirect them, so telling them to go
         and check their inbox sends them looking for mail that will never
         arrive. Only promise an email when there is no session. */
      if (data.session) {
        toast.success("Account created", { description: "Taking you to your work…" });
      } else {
        toast.success("Account created!", {
          description: "Check your email to verify your account.",
        });
      }

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
        redirectTo: getAppRedirectUrl("/reset-password"),
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

  return (
    <AuthExperience
      mode={mode}
      setMode={switchMode}
      showForgotPassword={showForgotPassword}
      setShowForgotPassword={setShowForgotPassword}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      fullName={fullName}
      setFullName={setFullName}
      resetEmail={resetEmail}
      setResetEmail={setResetEmail}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      errors={errors}
      passwordStrength={passwordStrength}
      strengthLabel={strengthLabel}
      isLoading={isLoading}
      isGoogleLoading={isGoogleLoading}
      isMicrosoftLoading={isMicrosoftLoading}
      isResetLoading={isResetLoading}
      isRateLimited={isRateLimited}
      rateLimitMessage={rateLimitMessage}
      gateNotice={gateNotice}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onForgotPassword={handleForgotPassword}
      onGoogleAuth={handleGoogleAuth}
      onMicrosoftAuth={handleMicrosoftAuth}
      onBackHome={() => navigate("/")}
    />
  );
};

export default Auth;
