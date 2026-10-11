/* /save-job#job=… — where the "Save to Faircopy" extension lands.

   Public on purpose: a signed-out user would otherwise lose the job on the way
   through sign-in. It parks the job, points the post-sign-in redirect at the
   tracker when needed, and moves on. The tracker opens Add Job pre-filled. */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { decodeJobImportHash, storePendingImport } from "@/features/job-tracker/lib/jobImport";
import { setGuestReturnTo } from "@/features/resume-builder/lib/guestDraft";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";

export default function SaveJob() {
  const navigate = useNavigate();
  usePageMeta({ title: "Save job · Faircopy", noindex: true });
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const job = decodeJobImportHash(window.location.hash);
    if (!job) {
      setInvalid(true);
      return;
    }
    storePendingImport(job);
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setGuestReturnTo("/tracker");
      navigate("/tracker", { replace: true });
    });
  }, [navigate]);

  return (
    <main className="cc-root cc-font-sans min-h-screen grid place-items-center bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] px-6">
      <div className="text-center max-w-md">
        <div className="cc-label text-[color:var(--cc-rust)]">Save job</div>
        {invalid ? (
          <>
            <h1 className="mt-4 cc-font-display text-3xl md:text-4xl tracking-tight">
              That link didn't include a job.
            </h1>
            <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">
              Try the extension again on the job ad, or add it to your tracker by hand.
            </p>
            <Link to="/tracker" className="mt-8 inline-flex cc-btn cc-btn-primary" style={{ padding: "0.9rem 1.2rem" }}>
              Open tracker
            </Link>
          </>
        ) : (
          <h1 className="mt-4 cc-font-display text-3xl md:text-4xl tracking-tight">
            Opening your tracker…
          </h1>
        )}
      </div>
    </main>
  );
}
