/**
 * Logos for companies and tools: a tile for an awarding body (its initials
 * when there's no logo), and a small mark beside a line of text or a skill
 * (nothing when the text names nothing we know). See lib/brandLogos.ts.
 */
import { useState } from "react";
import { brandSite, initials, logoUrl } from "@/lib/brandLogos";
import "./brand.css";

export function BrandLogo({ issuer, name, domain }: { issuer: string; name: string; domain: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return (
      <span className="cc-brand-logo cc-brand-logo--initials" aria-hidden>
        {initials(issuer || name)}
      </span>
    );
  }
  return (
    <span className="cc-brand-logo" aria-hidden>
      <img src={logoUrl(domain)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </span>
  );
}

export function BrandMark({ text, className = "" }: { text: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = brandSite(text);
  if (!domain || failed) return null;
  return (
    <span className={`cc-brand-mark ${className}`} aria-hidden>
      <img src={logoUrl(domain)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </span>
  );
}
