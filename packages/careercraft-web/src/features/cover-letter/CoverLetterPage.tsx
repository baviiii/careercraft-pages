/* ───────────────────────────────────────────────────────────
   Cover letters — the stationery desk.

   The brief on the left (résumé, the ad, tone), the letter on a sheet of
   stationery on the right, saved letters as envelopes underneath. A letter
   written for a tracked application wears a stamp with the role and company,
   and saving it attaches it to that application.

   Styles: ./cover-letter.css, scoped under .cc-desk.
   ─────────────────────────────────────────────────────────── */

import "./cover-letter.css";

import { Loader2, Mail } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
} from "@/components/craft/AppPrimitives";
import { useToast } from "@/hooks/use-toast";
import { generateCoverLetter } from "@/lib/aiRewriter";

import { BriefPanel } from "./components/BriefPanel";
import { LetterLibrary } from "./components/LetterLibrary";
import { LetterSheet } from "./components/LetterSheet";
import { DeleteLetterDialog } from "./dialogs/DeleteLetterDialog";
import { LetterDetailsDialog } from "./dialogs/LetterDetailsDialog";
import { useCoverLetters } from "./hooks/useCoverLetters";
import { useLetterHandoff } from "./hooks/useLetterHandoff";
import { applicationLabel, firstLineOf, letterLabel } from "./lib/letterLabel";
import { resumeContentToText } from "./lib/resumeText";
import {
  toTone,
  type LetterApplication,
  type LetterDetails,
  type LetterTone,
  type SavedLetter,
} from "./types";

type DetailsTarget = { mode: "save" } | { mode: "edit"; letter: SavedLetter };

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "cover-letter";

export default function CoverLetterPage() {
  const { toast } = useToast();
  const [, setParams] = useSearchParams();
  const {
    letters,
    resumes,
    loading,
    applicationsFor,
    saveLetter,
    updateLetter,
    deleteLetter,
    attachToApplication,
  } = useCoverLetters();

  /* The brief */
  const [resumeId, setResumeId] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [ad, setAd] = useState("");
  const [tone, setTone] = useState<LetterTone>("professional");

  /* The sheet */
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  /** The saved letter on the sheet, if it is one. */
  const [openId, setOpenId] = useState<string | null>(null);
  /** What the open letter looked like when last saved or loaded. */
  const [snapshot, setSnapshot] = useState<{ text: string; tone: LetterTone } | null>(null);
  /** The tracked application this letter is for: stamps the sheet, attaches on save. */
  const [forApp, setForApp] = useState<LetterApplication | null>(null);

  const [details, setDetails] = useState<DetailsTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedLetter | null>(null);

  const pickResume = useCallback(
    (id: string | null | undefined) => {
      const r = id ? resumes.find((x) => x.id === id) : undefined;
      if (!r) {
        setResumeId("");
        setResumeText("");
        return;
      }
      setResumeId(r.id);
      setResumeText(resumeContentToText(r.content));
    },
    [resumes],
  );

  const openLetter = useCallback(
    (letter: SavedLetter) => {
      const letterTone = toTone(letter.tone);
      setText(letter.content);
      setTone(letterTone);
      setAd(letter.job_description ?? "");
      if (letter.resume_id && resumes.some((r) => r.id === letter.resume_id)) {
        pickResume(letter.resume_id);
      }
      setOpenId(letter.id);
      setSnapshot({ text: letter.content, tone: letterTone });
      setForApp(applicationsFor(letter.id)[0] ?? null);
      setParams({ letter: letter.id }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [resumes, pickResume, applicationsFor, setParams],
  );

  useLetterHandoff(!loading, {
    onApplication: (app) => {
      setForApp(app);
      setAd(app.job_description ?? "");
      pickResume(app.resume_id ?? resumes[0]?.id);
    },
    onLetter: (id) => {
      const letter = letters.find((l) => l.id === id);
      if (letter) openLetter(letter);
      // openLetter only picks the letter's résumé when it still exists.
      if (!letter?.resume_id || !resumes.some((r) => r.id === letter.resume_id)) {
        pickResume(resumes[0]?.id);
      }
    },
    onResume: (id) => pickResume(id),
    onAts: ({ resumeText: atsText, jobDescription, resumeId: atsId }) => {
      if (atsId && resumes.some((r) => r.id === atsId)) pickResume(atsId);
      else if (atsText) {
        setResumeId("");
        setResumeText(atsText);
      }
      if (jobDescription) setAd(jobDescription);
    },
    onDefault: () => pickResume(resumes[0]?.id),
  });

  const startNew = () => {
    setText("");
    setOpenId(null);
    setSnapshot(null);
    setForApp(null);
    setParams({}, { replace: true });
  };

  const write = async () => {
    if (!resumeText.trim() || !ad.trim()) return;
    setGenerating(true);
    try {
      setText(
        await generateCoverLetter(
          resumeText,
          ad,
          tone,
          forApp ? { role: forApp.job_title, company: forApp.company } : undefined,
        ),
      );
    } catch (error) {
      toast({
        title: "Couldn't write the letter",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saved = openId !== null && snapshot?.text === text && snapshot.tone === tone;

  const save = async () => {
    if (!openId) {
      setDetails({ mode: "save" });
      return;
    }
    setSaving(true);
    try {
      await updateLetter(openId, {
        content: text,
        tone,
        job_description: ad.trim() || null,
        resume_id: resumeId || null,
      });
      setSnapshot({ text, tone });
      toast({ title: "Changes saved" });
    } catch (error) {
      console.error("Error updating cover letter:", error);
      toast({ title: "Couldn't save the changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async (d: LetterDetails) => {
    try {
      const id = await saveLetter({
        title: d.title || null,
        content: text,
        job_description: ad.trim() || null,
        tone,
        category: d.category || null,
        tags: d.tags.length ? d.tags : null,
        notes: d.notes.trim() || null,
        resume_id: resumeId || null,
      });
      if (forApp) await attachToApplication(forApp.id, id);
      setOpenId(id);
      setSnapshot({ text, tone });
      setParams({ letter: id }, { replace: true });
      setDetails(null);
      toast({
        title: forApp ? `Saved and attached to ${applicationLabel(forApp)}` : "Letter saved",
      });
    } catch (error) {
      console.error("Error saving cover letter:", error);
      toast({
        title: "Couldn't save the letter",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const saveDetails = async (letter: SavedLetter, d: LetterDetails) => {
    try {
      await updateLetter(letter.id, {
        title: d.title || null,
        category: d.category || null,
        tags: d.tags.length ? d.tags : null,
        notes: d.notes.trim() || null,
      });
      setDetails(null);
      toast({ title: "Details saved" });
    } catch (error) {
      console.error("Error updating cover letter details:", error);
      toast({ title: "Couldn't save the details", variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLetter(deleteTarget.id);
      if (deleteTarget.id === openId) {
        // Keep the words on the sheet; it's just no longer a saved letter.
        setOpenId(null);
        setSnapshot(null);
        setParams({}, { replace: true });
      }
      setDeleteTarget(null);
      toast({ title: "Letter deleted" });
    } catch (error) {
      console.error("Error deleting cover letter:", error);
      toast({ title: "Couldn't delete the letter", variant: "destructive" });
    }
  };

  const openLetterRow = letters.find((l) => l.id === openId);
  const sheetLabel = openLetterRow
    ? letterLabel(openLetterRow, forApp)
    : forApp
      ? applicationLabel(forApp)
      : (firstLineOf(ad) ?? "cover letter");

  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Copied" }))
      .catch(() => toast({ title: "Couldn't copy", variant: "destructive" }));
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(sheetLabel)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const categories = useMemo(
    () => Array.from(new Set(letters.map((l) => l.category).filter(Boolean) as string[])).sort(),
    [letters],
  );

  const detailsInitial: LetterDetails =
    details?.mode === "edit"
      ? {
          title: letterLabel(details.letter, applicationsFor(details.letter.id)[0]),
          category: details.letter.category ?? "",
          tags: details.letter.tags ?? [],
          notes: details.letter.notes ?? "",
        }
      : {
          title: forApp ? applicationLabel(forApp) : (firstLineOf(ad) ?? ""),
          category: "",
          tags: [],
          notes: "",
        };

  return (
    <CraftAppShell className="cc-desk">
      <CraftAppHeader
        kicker="Cover letters"
        title="Write a cover letter for a job."
        ctaLabel={text.trim() || openId ? "New letter" : undefined}
        onCta={text.trim() || openId ? startNew : undefined}
      />

      <CraftAppBody className="!pt-0">
        {loading ? (
          <div className="grid place-items-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-[color:var(--cc-ash)]" aria-label="Loading" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-5">
                <BriefPanel
                  resumes={resumes}
                  resumeId={resumeId}
                  onPickResume={pickResume}
                  resumeText={resumeText}
                  onResumeText={setResumeText}
                  ad={ad}
                  onAd={setAd}
                  tone={tone}
                  onTone={setTone}
                  onWrite={write}
                  generating={generating}
                  hasLetter={Boolean(text.trim())}
                  postingUrl={forApp?.job_url}
                />
              </div>

              <div className="lg:col-span-7">
                {forApp && (
                  <div className="mb-4 flex items-center gap-2 cc-label-sm text-[color:var(--cc-ink-soft)]">
                    <Mail className="w-3.5 h-3.5 text-[color:var(--cc-rust)]" />
                    For your application: {applicationLabel(forApp)}
                  </div>
                )}
                <LetterSheet
                  tone={tone}
                  text={text}
                  onChange={setText}
                  generating={generating}
                  stamp={forApp ? { role: forApp.job_title, company: forApp.company } : null}
                  onCopy={copy}
                  onDownload={download}
                  onSave={save}
                  saveLabel={openId ? "Save changes" : forApp ? "Save and attach" : "Save letter"}
                  saving={saving}
                  saved={saved}
                />
              </div>
            </div>

            <LetterLibrary
              letters={letters}
              applicationsFor={applicationsFor}
              activeId={openId}
              onOpen={openLetter}
              onDetails={(letter) => setDetails({ mode: "edit", letter })}
              onDelete={setDeleteTarget}
            />
          </>
        )}
      </CraftAppBody>

      <LetterDetailsDialog
        open={details !== null}
        onOpenChange={(o) => !o && setDetails(null)}
        mode={details?.mode ?? "save"}
        initial={detailsInitial}
        categories={categories}
        attachNote={
          details?.mode === "save" && forApp
            ? `It will be attached to ${applicationLabel(forApp)} in your tracker.`
            : null
        }
        onSubmit={(d) =>
          details?.mode === "edit" ? saveDetails(details.letter, d) : saveNew(d)
        }
      />

      <DeleteLetterDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        label={deleteTarget ? letterLabel(deleteTarget, applicationsFor(deleteTarget.id)[0]) : ""}
        attachedTo={deleteTarget ? applicationsFor(deleteTarget.id).length : 0}
        onConfirm={remove}
      />
    </CraftAppShell>
  );
}
