/**
 * Logos for companies and tools: a tile for an awarding body (its initials
 * when there's no logo), and a small mark beside a line of text or a skill
 * (nothing when the text names nothing). The website comes from the coach,
 * which knows the bodies of every field, with the built-in list as the
 * backup while it answers. See lib/brandLogos.ts.
 */
import { useState } from "react";
import { brandSite, initials, issuerSite, logoUrl, useBrandSite, validDomain } from "@/lib/brandLogos";
import "./brand.css";

/**
 * `given` is a website the coach already named for it (a recommendation's
 * issuerDomain). `ask={false}` uses the list only: for text still being
 * typed, so each keystroke isn't a question to the coach.
 */
export function BrandLogo({
  issuer,
  name,
  given,
  ask = true,
}: {
  issuer: string;
  name: string;
  given?: string | null;
  ask?: boolean;
}) {
  // Which website's icon failed to load, so a different answer gets its own try.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const named = validDomain(given);
  const coach = useBrandSite(named || !ask ? null : issuer || name);
  const domain = named ?? coach ?? issuerSite(issuer, name);
  if (!domain || failedFor === domain) {
    return (
      <span className="cc-brand-logo cc-brand-logo--initials" aria-hidden>
        {initials(issuer || name)}
      </span>
    );
  }
  return (
    <span className="cc-brand-logo" aria-hidden>
      <img src={logoUrl(domain)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedFor(domain)} />
    </span>
  );
}

export function BrandMark({ text, className = "" }: { text: string; className?: string }) {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const coach = useBrandSite(text);
  const domain = coach ?? brandSite(text);
  if (!domain || failedFor === domain) return null;
  return (
    <span className={`cc-brand-mark ${className}`} aria-hidden>
      <img src={logoUrl(domain)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedFor(domain)} />
    </span>
  );
}
