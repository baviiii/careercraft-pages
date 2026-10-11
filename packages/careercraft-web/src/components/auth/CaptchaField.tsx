// CaptchaField — Cloudflare Turnstile widget for the auth forms.
//
// WHY: every edge function is a public URL that accepts any valid account JWT,
// and a free account comes with a real AI budget. Nothing in the functions can
// tell a résumé from an essay, so the only place to stop someone minting
// accounts by the hundred is at signup. Turnstile forces each signup through
// a real browser; Supabase then verifies the token server-side when
// "Enable Captcha protection" is on in Authentication → Attack Protection.
//
// Behaviour:
//   - No VITE_TURNSTILE_SITE_KEY → renders nothing, `captchaEnabled` is false,
//     and callers send no token. Local dev keeps working as long as Supabase
//     captcha is off for that project.
//   - Tokens are single-use. Callers must `reset()` after every attempt,
//     successful or not, or the next submit fails with a stale token.
//
// The site key is public by design (it ships in the widget markup), which is
// why it is allowed to be a VITE_ variable. The SECRET key never leaves the
// Supabase dashboard.

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export const TURNSTILE_SITE_KEY = (
  import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
)?.trim();

/** True when the widget is configured and callers must send a token. */
export const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);

export interface CaptchaHandle {
  /** Clear the current token and request a fresh challenge. */
  reset: () => void;
}

interface CaptchaFieldProps {
  /** Receives the token when solved, null when it expires, errors or resets. */
  onToken: (token: string | null) => void;
  /** Turnstile "action" label — shows up in Cloudflare analytics. */
  action?: string;
  className?: string;
}

export const CaptchaField = forwardRef<CaptchaHandle, CaptchaFieldProps>(
  ({ onToken, action, className }, ref) => {
    const widget = useRef<TurnstileInstance | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          widget.current?.reset();
          onToken(null);
        },
      }),
      [onToken],
    );

    if (!TURNSTILE_SITE_KEY) return null;

    return (
      <div className={className}>
        <Turnstile
          ref={widget}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ action, theme: "light", size: "flexible" }}
          onSuccess={onToken}
          onExpire={() => onToken(null)}
          onError={() => onToken(null)}
        />
      </div>
    );
  },
);
CaptchaField.displayName = "CaptchaField";
