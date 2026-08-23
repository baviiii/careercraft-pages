import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export type AuthMode = "signin" | "signup";

interface ValidationErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

interface AuthExperienceProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  showForgotPassword: boolean;
  setShowForgotPassword: (show: boolean) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  resetEmail: string;
  setResetEmail: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  errors: ValidationErrors;
  passwordStrength: number;
  strengthLabel: string;
  isLoading: boolean;
  isGoogleLoading: boolean;
  isMicrosoftLoading: boolean;
  isResetLoading: boolean;
  isRateLimited: boolean;
  rateLimitMessage: string;
  onSignIn: (event: React.FormEvent) => void;
  onSignUp: (event: React.FormEvent) => void;
  onForgotPassword: (event: React.FormEvent) => void;
  onGoogleAuth: () => void;
  onMicrosoftAuth: () => void;
  onBackHome: () => void;
}

type FocusedField = "idle" | "name" | "email" | "password";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4";
const SECOND_SCENE_IMAGE =
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2200&q=88";

const GoogleMark = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const MicrosoftMark = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#00A4EF" d="M1 13h10v10H1z" />
    <path fill="#7FBA00" d="M13 1h10v10H13z" />
    <path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);

const Typewriter = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayText}
      <span className="cc-blink ml-0.5 text-[color:var(--cc-rust)]" aria-hidden="true">|</span>
    </span>
  );
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-2 flex items-center gap-2 cc-font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--cc-rust)]">
      <AlertTriangle className="h-3 w-3" /> {message}
    </p>
  ) : null;

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="cc-label-sm text-[color:var(--cc-ash)]">{label}</label>
    {children}
    <FieldError message={error} />
  </div>
);

const SubmitPill = ({
  loading,
  disabled,
  loadingText,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  loadingText: string;
  children: React.ReactNode;
}) => (
  <button
    type="submit"
    disabled={loading || disabled}
    className="group flex w-full items-center justify-between rounded-full bg-[color:var(--cc-ink)] py-1.5 pl-7 pr-1.5 text-sm font-semibold text-[#E1E0CC] transition-all duration-300 hover:bg-[color:var(--cc-rust)] disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span>{loading ? loadingText : children}</span>
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1E0CC] text-[color:var(--cc-ink)] transition-transform duration-500 group-hover:rotate-45">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
    </span>
  </button>
);

const ProviderButton = ({
  loading,
  disabled,
  onClick,
  icon,
  children,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[color:var(--cc-hair-strong)] bg-white/50 text-sm font-medium transition-all duration-300 hover:border-[color:var(--cc-ink)] hover:bg-[color:var(--cc-ink)] hover:text-[#E1E0CC] disabled:opacity-50"
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {children}
  </button>
);

export const AuthExperience = ({
  mode,
  setMode,
  showForgotPassword,
  setShowForgotPassword,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  resetEmail,
  setResetEmail,
  showPassword,
  setShowPassword,
  errors,
  passwordStrength,
  strengthLabel,
  isLoading,
  isGoogleLoading,
  isMicrosoftLoading,
  isResetLoading,
  isRateLimited,
  rateLimitMessage,
  onSignIn,
  onSignUp,
  onForgotPassword,
  onGoogleAuth,
  onMicrosoftAuth,
  onBackHome,
}: AuthExperienceProps) => {
  const [focusedField, setFocusedField] = useState<FocusedField>("idle");
  const busy = isLoading || isGoogleLoading || isMicrosoftLoading || isResetLoading;

  const scene = useMemo(() => {
    if (isResetLoading) return { eyebrow: "Secure dispatch", title: "Sending your way home.", line: "Preparing a protected reset link for your inbox.", accent: "reset" };
    if (isGoogleLoading) return { eyebrow: "Google hand-off", title: "Opening the next door.", line: "Connecting securely with Google.", accent: "provider" };
    if (isMicrosoftLoading) return { eyebrow: "Microsoft hand-off", title: "Opening the next door.", line: "Connecting securely with Microsoft.", accent: "provider" };
    if (isLoading && mode === "signup") return { eyebrow: "Creating your file", title: "A new chapter starts here.", line: "Setting up your calm career workspace.", accent: "success" };
    if (isLoading) return { eyebrow: "Welcome back", title: "Your work is waiting.", line: "Unlocking your résumés, practice and market signals.", accent: "success" };
    if (showForgotPassword) return { eyebrow: "Recovery", title: "Find your way back.", line: focusedField === "email" ? "Use the address connected to your CareerCraft file." : "A secure link. One hour. No fuss.", accent: "reset" };
    if (focusedField === "name") return { eyebrow: "First entry", title: "Put your name on the work.", line: "This is how your résumé, coach and recommendations will know you.", accent: "name" };
    if (focusedField === "email") return { eyebrow: mode === "signin" ? "Identity" : "Your address", title: "One place for every next move.", line: "We only use this to secure your workspace and important account notices.", accent: "email" };
    if (focusedField === "password" && mode === "signup") return { eyebrow: `Strength · ${strengthLabel}`, title: passwordStrength === 100 ? "Strong enough to travel." : "Build a stronger key.", line: passwordStrength === 100 ? "Every requirement is met. Your account is ready." : "Eight characters, upper and lowercase, a number and a symbol.", accent: "password" };
    if (focusedField === "password") return { eyebrow: "Private entry", title: "Quietly, securely, yours.", line: "Your password is encrypted and never shown to us.", accent: "password" };
    if (mode === "signup") return { eyebrow: "A fresh page", title: "Your next move starts here.", line: "Create one calm place for applications, résumés and practice.", accent: "signup" };
    return { eyebrow: "Return to your work", title: "Welcome back.", line: "Your career workspace remembers where you left off.", accent: "signin" };
  }, [
    focusedField,
    isGoogleLoading,
    isLoading,
    isMicrosoftLoading,
    isResetLoading,
    mode,
    passwordStrength,
    showForgotPassword,
    strengthLabel,
  ]);

  const switchMode = (next: AuthMode) => {
    setFocusedField("idle");
    setShowForgotPassword(false);
    setMode(next);
  };

  return (
    <main className="cc-root min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] antialiased">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.88fr)_minmax(560px,1.12fr)]">
        <section className="relative z-20 flex min-h-screen flex-col bg-[rgba(247,247,244,0.97)] px-6 py-7 md:px-12 lg:px-16">
          <div className="flex items-center justify-between">
            <button onClick={onBackHome} className="inline-flex items-center gap-2 cc-label-sm cc-link">
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
            <button onClick={onBackHome} className="flex items-center gap-3" aria-label="CareerCraft home">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cc-ink)]">
                <span className="cc-font-display text-xl font-bold text-[color:var(--cc-rust)]">c</span>
              </span>
              <span className="hidden cc-font-display text-xl font-semibold tracking-tight sm:block">CareerCraft</span>
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 items-center py-10">
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={showForgotPassword ? "reset" : mode}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {showForgotPassword ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setFocusedField("idle");
                        }}
                        className="mb-8 inline-flex items-center gap-2 cc-label-sm text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)]"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to sign in
                      </button>
                      <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Recovery</div>
                      <h1 className="mt-3 cc-font-display text-4xl leading-[0.92] tracking-[-0.04em] md:text-5xl">
                        Find your way<br /><span className="cc-italic-wonk">back in.</span>
                      </h1>
                      <p className="mt-5 max-w-sm text-base leading-relaxed text-[color:var(--cc-ink-soft)]">
                        Enter your account email and we’ll send a secure reset link.
                      </p>
                      <form onSubmit={onForgotPassword} className="mt-9 space-y-7">
                        <Field label="Email address">
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={resetEmail}
                            onChange={(event) => setResetEmail(event.target.value)}
                            onFocus={() => setFocusedField("email")}
                            onClick={() => setFocusedField("email")}
                            placeholder="you@example.com"
                            className="cc-input mt-2"
                          />
                        </Field>
                        <SubmitPill loading={isResetLoading} disabled={isRateLimited} loadingText="Sending link…">
                          Send reset link
                        </SubmitPill>
                      </form>
                    </>
                  ) : (
                    <>
                      <div className="cc-label text-[color:var(--cc-rust)]">
                        {mode === "signin" ? "§ 01 · Return" : "§ 01 · First entry"}
                      </div>
                      <h1 className="mt-3 cc-font-display text-4xl leading-[0.92] tracking-[-0.04em] md:text-5xl">
                        {mode === "signin" ? <>Welcome<br /><span className="cc-italic-wonk">back.</span></> : <>Open your<br /><span className="cc-italic-wonk">next chapter.</span></>}
                      </h1>
                      <p className="mt-5 text-base leading-relaxed text-[color:var(--cc-ink-soft)]">
                        {mode === "signin" ? "Return to your résumé, interview practice and career map." : "One account for every application, draft and next move."}
                      </p>

                      <div className="mt-7 grid grid-cols-2 rounded-full border border-[color:var(--cc-hair-strong)] p-1">
                        {(["signin", "signup"] as AuthMode[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => switchMode(item)}
                            className={`relative rounded-full px-3 py-2.5 cc-label-sm transition-colors ${mode === item ? "text-[#E1E0CC]" : "text-[color:var(--cc-ash)]"}`}
                          >
                            {mode === item && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-[color:var(--cc-ink)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                            <span className="relative">{item === "signin" ? "Sign in" : "Create account"}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-6 grid gap-2 sm:grid-cols-2">
                        <ProviderButton loading={isGoogleLoading} disabled={busy || isRateLimited} onClick={onGoogleAuth} icon={<GoogleMark />}>Google</ProviderButton>
                        <ProviderButton loading={isMicrosoftLoading} disabled={busy || isRateLimited} onClick={onMicrosoftAuth} icon={<MicrosoftMark />}>Microsoft</ProviderButton>
                      </div>

                      <div className="my-6 flex items-center gap-4">
                        <span className="h-px flex-1 bg-[color:var(--cc-hair-strong)]" />
                        <span className="cc-label-sm text-[color:var(--cc-ash)]">or by hand</span>
                        <span className="h-px flex-1 bg-[color:var(--cc-hair-strong)]" />
                      </div>

                      {mode === "signin" ? (
                        <form onSubmit={onSignIn} className="space-y-5">
                          <Field label="Email" error={errors.email}>
                            <input
                              type="email"
                              required
                              autoComplete="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              onFocus={() => setFocusedField("email")}
                              onClick={() => setFocusedField("email")}
                              placeholder="you@example.com"
                              className={`cc-input mt-2 ${errors.email ? "cc-input-error" : ""}`}
                            />
                          </Field>
                          <Field label="Password" error={errors.password}>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onFocus={() => setFocusedField("password")}
                                onClick={() => setFocusedField("password")}
                                placeholder="Your private key"
                                className={`cc-input mt-2 pr-11 ${errors.password ? "cc-input-error" : ""}`}
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute bottom-3 right-0 text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]" aria-label={showPassword ? "Hide password" : "Show password"}>
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </Field>
                          <SubmitPill loading={isLoading} disabled={isRateLimited} loadingText="Opening workspace…">Sign in</SubmitPill>
                          <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-center cc-label-sm text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)]">
                            Forgot your password?
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={onSignUp} className="space-y-4">
                          <Field label="Full name" error={errors.fullName}>
                            <input
                              type="text"
                              required
                              autoComplete="name"
                              value={fullName}
                              onChange={(event) => setFullName(event.target.value)}
                              onFocus={() => setFocusedField("name")}
                              onClick={() => setFocusedField("name")}
                              placeholder="e.g. Ada Lovelace"
                              className={`cc-input mt-1 ${errors.fullName ? "cc-input-error" : ""}`}
                            />
                          </Field>
                          <Field label="Email" error={errors.email}>
                            <input
                              type="email"
                              required
                              autoComplete="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              onFocus={() => setFocusedField("email")}
                              onClick={() => setFocusedField("email")}
                              placeholder="you@example.com"
                              className={`cc-input mt-1 ${errors.email ? "cc-input-error" : ""}`}
                            />
                          </Field>
                          <Field label="Password" error={errors.password}>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onFocus={() => setFocusedField("password")}
                                onClick={() => setFocusedField("password")}
                                placeholder="Eight characters at least"
                                className={`cc-input mt-1 pr-11 ${errors.password ? "cc-input-error" : ""}`}
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute bottom-3 right-0 text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]" aria-label={showPassword ? "Hide password" : "Show password"}>
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </Field>

                          <AnimatePresence>
                            {password && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="flex items-center justify-between cc-label-sm">
                                  <span className="text-[color:var(--cc-ash)]">Strength</span>
                                  <span className={passwordStrength === 100 ? "text-[color:var(--cc-signal)]" : "text-[color:var(--cc-rust)]"}>{strengthLabel}</span>
                                </div>
                                <div className="mt-2 flex gap-1.5">
                                  {[0, 1, 2, 3, 4].map((index) => (
                                    <motion.span key={index} className="h-1 flex-1 rounded-full" animate={{ backgroundColor: passwordStrength / 20 > index ? (passwordStrength === 100 ? "var(--cc-signal)" : "var(--cc-rust)") : "var(--cc-hair-strong)" }} />
                                  ))}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-1 cc-font-mono text-[9px] uppercase tracking-[0.15em]">
                                  {[
                                    [password.length >= 8, "8+ chars"],
                                    [/[A-Z]/.test(password), "Uppercase"],
                                    [/[a-z]/.test(password), "Lowercase"],
                                    [/[0-9]/.test(password), "Number"],
                                    [/[^A-Za-z0-9]/.test(password), "Symbol"],
                                  ].map(([okay, label]) => (
                                    <span key={String(label)} className={`flex items-center gap-1 ${okay ? "text-[color:var(--cc-signal)]" : "text-[color:var(--cc-ash)]"}`}>
                                      <CheckCircle2 className="h-3 w-3" /> {String(label)}
                                    </span>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <SubmitPill loading={isLoading} disabled={isRateLimited || passwordStrength < 100} loadingText="Creating your file…">Create account</SubmitPill>
                        </form>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {isRateLimited && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex gap-3 rounded-2xl border border-[color:var(--cc-rust)]/30 bg-[color:var(--cc-rust-soft)] p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-rust)]" />
                    <p className="text-sm text-[color:var(--cc-ink-soft)]">{rateLimitMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--cc-hair)] pt-4 cc-label-sm text-[color:var(--cc-ash)]">
            <span>Private by design</span>
            <span>Adelaide · 2026</span>
          </div>
        </section>

        <aside className="relative hidden min-h-screen overflow-hidden bg-[color:var(--cc-ink)] lg:block">
          <AnimatePresence initial={false} mode="sync">
            {mode === "signin" && !showForgotPassword ? (
              <motion.video
                key="returning-video"
                autoPlay
                muted
                loop
                playsInline
                src={HERO_VIDEO}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{
                  opacity: 1,
                  scale: focusedField === "password" ? 1.1 : 1.04,
                  x: focusedField === "email" ? -16 : 0,
                }}
                exit={{ opacity: 0, scale: 1.12 }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <motion.img
                key="new-beginning-image"
                src={SECOND_SCENE_IMAGE}
                alt=""
                initial={{ opacity: 0, scale: 1.16, x: 24 }}
                animate={{
                  opacity: 1,
                  scale: [1.12, 1.04, 1.1],
                  x: focusedField === "name" ? -22 : focusedField === "password" ? 18 : 0,
                  y: focusedField === "email" ? -12 : 0,
                }}
                exit={{ opacity: 0, scale: 1.18 }}
                transition={{
                  opacity: { duration: 1.1 },
                  x: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                  y: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: 18, repeat: Infinity, ease: "easeInOut" },
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </AnimatePresence>
          <motion.div
            className="absolute inset-0"
            animate={{
              background:
                scene.accent === "password"
                  ? "linear-gradient(150deg,rgba(14,12,10,.3),rgba(42,82,204,.22) 55%,rgba(14,12,10,.82))"
                  : scene.accent === "success"
                    ? "linear-gradient(150deg,rgba(47,91,68,.18),rgba(14,12,10,.22) 52%,rgba(14,12,10,.82))"
                    : "linear-gradient(150deg,rgba(14,12,10,.22),rgba(14,12,10,.08) 45%,rgba(14,12,10,.84))",
            }}
            transition={{ duration: 0.8 }}
          />
          <div className="cc-grain absolute inset-0 opacity-30 mix-blend-overlay" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center justify-between text-[#E1E0CC]">
              <span className="cc-label">A workspace for careers in motion</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${scene.accent}-${scene.title}`}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-3xl pb-8 text-[#E1E0CC]"
              >
                <div className="cc-label text-[#9CB4FF]">{scene.eyebrow}</div>
                <h2 className="mt-5 cc-font-display text-[clamp(4rem,7vw,8rem)] leading-[0.82] tracking-[-0.06em] text-balance">
                  {scene.title}
                </h2>
                <div className="mt-8 min-h-16 max-w-xl border-l border-[#E1E0CC]/35 pl-5 text-xl leading-relaxed text-[#E1E0CC]/85">
                  <Typewriter text={scene.line} />
                </div>
                <div className="mt-10 flex items-center gap-3 cc-label-sm text-[#E1E0CC]/65">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-[#9CB4FF]"
                    animate={{ scale: busy ? [1, 1.8, 1] : [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: busy ? 0.8 : 2.4, repeat: Infinity }}
                  />
                  {busy ? "Working securely" : "Every field changes the view"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </main>
  );
};
