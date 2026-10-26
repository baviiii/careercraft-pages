/* Pieces every tool page layout uses: the sign-in aware "try it" link, the
   account line and the structured data. Kept apart from ToolPage so the
   layouts can share them without importing each other. */

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { setGuestReturnTo } from "@/features/resume-builder/lib/guestDraft";
import { supabase } from "@/integrations/supabase/client";
import publicPages from "@/seo/public-pages.json";

import type { Tool } from "./data/tools";

export const SITE = publicPages.site;
/** "faircopy.au", for the screenshot frame's address bar. */
export const HOST = SITE.replace(/^https?:\/\/(www\.)?/, "");

export const ACCOUNT_LINE: Record<Tool["account"], string> = {
  partial: "No account needed to start. A free account lets you download and keep it.",
  free: "Needs a free account. No card, no trial that runs out.",
};

/** Whether someone is signed in. False on the server and at first paint, so
    the prerendered buttons are the signed-out ones. */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

/** The "try it" button: straight to the tool when signed in (or when it needs
    no account); otherwise to sign-up, which brings them back to the tool. */
export function StartLink({ tool, signedIn, className, children }: { tool: Tool; signedIn: boolean; className: string; children: ReactNode }) {
  const direct = signedIn || tool.account === "partial";
  return (
    <Link
      to={direct ? tool.appPath : "/auth"}
      onClick={direct ? undefined : () => setGuestReturnTo(tool.appPath)}
      className={className}
    >
      {children}
    </Link>
  );
}

/** Structured data: what the tool is, where the page sits, and its questions. */
function jsonLd(tool: Tool, title: string, description: string) {
  const url = `${SITE}/tools/${tool.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: `Faircopy ${tool.name}`,
        url,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-AU",
        offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Faircopy", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools` },
          { "@type": "ListItem", position: 3, name: tool.name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      { "@type": "WebPage", "@id": url, url, name: title, isPartOf: { "@id": `${SITE}/#website` } },
    ],
  };
}

export function ToolJsonLd({ tool, title, description }: { tool: Tool; title: string; description: string }) {
  return (
    <script
      type="application/ld+json"
      // Static data from data/tools.ts, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(tool, title, description)) }}
    />
  );
}

/** The heading with its accent phrase picked out, when the tool names one. */
export function splitHeading(tool: Tool): [string, string] {
  const accent = tool.accent;
  if (!accent || !tool.h1.endsWith(accent)) return [tool.h1, ""];
  return [tool.h1.slice(0, tool.h1.length - accent.length).trimEnd(), accent];
}
