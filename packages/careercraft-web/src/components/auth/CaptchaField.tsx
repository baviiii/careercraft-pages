// CaptchaField — Cloudflare Turnstile widget for the auth forms.
//
// WHY: every edge function is a public URL that accepts any valid account JWT,
// and a free account comes with a real AI budget. Nothing in the functions can
// tell a résumé from an essay, so the only place to stop someone minting
// accounts by the hundred is at signup. Turnstile forces each signup through
// a real browser; Supabase then verifies the token server-side because
// "Enable Captcha protection" is on in Authentication → Attack Protection.
//
// Behaviour:
//   - The site key is public by design (it ships in the widget markup), so it
//     lives here like the Supabase URL and anon key in
//     integrations/supabase/client.ts. VITE_TURNSTILE_SITE_KEY overrides it,
//     e.g. with Cloudflare's always-pass test key.
//   - Local dev talks to the same Supabase project, so it needs the widget
//     too; "localhost" is an allowed hostname on the Cloudflare widget.
//   - Tokens are single-use. Callers must `reset()` after every attempt,
//     successful or not, or the next submit fails with a stale token.
//   - If the widget can't load (an ad blocker, a network filter) the submit
//     button would sit disabled with no reason given, so we say what happened.
//
// The SECRET key never leaves the Cloudflare and Supabase dashboards.

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

/** The "faircopy" widget in Cloudflare (hostnames: faircopy.au, localhost). */
const FAIRCOPY_SITE_KEY = "0x4AAAAAAFTng5JLfUNom6Xu";

export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || FAIRCOPY_SITE_KEY;

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
    const [failed, setFailed] = useState(false);

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

    const fail = () => {
      setFailed(true);
      onToken(null);
    };

    return (
      <div className={className}>
        <Turnstile
          ref={widget}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ action, theme: "light", size: "flexible" }}
          scriptOptions={{ onError: fail }}
          onSuccess={(token) => {
            setFailed(false);
            onToken(token);
          }}
          onExpire={() => onToken(null)}
          onError={fail}
          onUnsupported={fail}
        />
        {failed && (
          <p role="alert" className="mt-2 cc-font-sans text-[13px] leading-snug text-[#9C3424]">
            The security check didn't load, so we can't sign you in yet. Refresh the page, or
            pause your ad blocker for faircopy.au and try again.
          </p>
        )}
      </div>
    );
  },
);
CaptchaField.displayName = "CaptchaField";
