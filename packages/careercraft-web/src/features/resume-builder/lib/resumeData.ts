/* ───────────────────────────────────────────────────────────
   Pure data helpers for the résumé builder:
   – createEmptyResumeData  — a blank slate
   – aiDataToResumeData     — shape-shift AI output to our form
   – parseTextToResumeData  — a best-effort plain-text parser
   – resumeToTemplateData   — preview/template-ready shape
   ─────────────────────────────────────────────────────────── */

import type { AIResumeData } from "@/lib/resumeParser";
import type { TemplateData } from "@/components/templates/types";

import type {
  Education,
  Experience,
  ResumeData,
} from "../types";

export const createEmptyResumeData = (): ResumeData => ({
  contact: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
});

export const aiDataToResumeData = (aiData: AIResumeData): ResumeData => ({
  contact: {
    name: aiData.contact.name || "",
    email: aiData.contact.email || "",
    phone: aiData.contact.phone || "",
    location: aiData.contact.location || "",
    linkedin: aiData.contact.linkedin || "",
    website: aiData.contact.website || "",
  },
  summary: aiData.summary || "",
  experience: aiData.experience.map((exp) => ({
    id: exp.id,
    title: exp.title || "",
    company: exp.company || "",
    location: exp.location || "",
    startDate: exp.startDate || "",
    endDate: exp.endDate || "",
    current: exp.current || false,
    bullets: exp.bullets || [""],
  })),
  education: aiData.education.map((edu) => ({
    id: edu.id,
    degree: edu.degree || "",
    school: edu.school || "",
    location: edu.location || "",
    graduationDate: edu.graduationDate || "",
    gpa: edu.gpa || "",
  })),
  skills: aiData.skills || [],
  projects: aiData.projects?.map((p) => ({
    id: p.id,
    name: p.name || "",
    description: p.description || "",
    technologies: p.technologies || [],
  })),
  certifications: aiData.certifications,
  references: aiData.references,
  languages: aiData.languages,
  awards: aiData.awards,
  volunteer: aiData.volunteer,
  publications: aiData.publications,
});

/** Best-effort plaintext → structured parse. Lossy, but good enough to seed Compose. */
export const parseTextToResumeData = (text: string): ResumeData => {
  const data = createEmptyResumeData();
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  const linkedinMatch = text.match(/(linkedin\.com\/in\/[\w-]+)/i);

  if (emailMatch) data.contact.email = emailMatch[0];
  if (phoneMatch) data.contact.phone = phoneMatch[0];
  if (linkedinMatch) data.contact.linkedin = linkedinMatch[0];

  for (const line of nonEmpty.slice(0, 5)) {
    if (
      !line.includes("@") &&
      !line.match(/^\d/) &&
      line.length > 2 &&
      line.length < 50 &&
      !line.includes("|")
    ) {
      data.contact.name = line;
      break;
    }
  }

  const locationMatch = text.match(
    /([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/
  );
  if (locationMatch) data.contact.location = locationMatch[0];

  // Sectioning
  let currentSection = "";
  const sectionLines: Record<string, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (lower.match(/^(professional\s+)?summary|^objective|^profile/)) {
      currentSection = "summary";
      continue;
    } else if (lower.match(/^(work\s+)?experience|^employment/)) {
      currentSection = "experience";
      continue;
    } else if (lower.match(/^education/)) {
      currentSection = "education";
      continue;
    } else if (lower.match(/^skills|^technical/)) {
      currentSection = "skills";
      continue;
    }

    if (currentSection && sectionLines[currentSection] && line) {
      sectionLines[currentSection].push(line);
    }
  }

  data.summary = sectionLines.summary.join(" ").trim();

  const skillsText = sectionLines.skills.join(" ");
  data.skills = skillsText
    .split(/[,•|·\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 50);

  // Experience
  const expLines = sectionLines.experience;
  let currentJob: Experience | null = null;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const jobMatch =
      line.match(/^(.+?)\s+at\s+(.+)$/i) ||
      line.match(/^(.+?)\s*[-–]\s*(.+)$/);
    const dateMatch = line.match(
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*[-–]\s*(Present|\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
    );

    if (jobMatch && !line.startsWith("•") && !line.startsWith("-")) {
      if (currentJob) data.experience.push(currentJob);
      currentJob = {
        id: `exp-${Date.now()}-${data.experience.length}`,
        title: jobMatch[1].trim(),
        company: jobMatch[2].trim(),
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: [],
      };
    } else if (dateMatch && currentJob) {
      const parts = line.split(/[-–]/);
      currentJob.startDate = parts[0]?.trim() || "";
      currentJob.endDate = parts[1]?.trim() || "Present";
      currentJob.current = currentJob.endDate.toLowerCase() === "present";
    } else if (
      (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) &&
      currentJob
    ) {
      currentJob.bullets.push(line.replace(/^[•\-*]\s*/, "").trim());
    } else if (currentJob && line.length > 20 && !dateMatch) {
      currentJob.bullets.push(line);
    }
  }
  if (currentJob) data.experience.push(currentJob);

  // Education
  const eduLines = sectionLines.education;
  let currentEdu: Education | null = null;

  for (const line of eduLines) {
    const degreeMatch = line.match(
      /(Bachelor|Master|PhD|Associate|BS|BA|MS|MA|MBA|B\.S\.|B\.A\.|M\.S\.|M\.A\.)/i
    );
    const dateMatch = line.match(
      /(Graduated|Class of|Expected)?\s*:?\s*(\d{4}|May|June|Dec)/i
    );

    if (degreeMatch || (line.includes(" - ") && !line.startsWith("•"))) {
      if (currentEdu) data.education.push(currentEdu);
      const parts = line.split(/\s*[-–]\s*/);
      currentEdu = {
        id: `edu-${Date.now()}-${data.education.length}`,
        degree: parts[0]?.trim() || line,
        school: parts[1]?.trim() || "",
        location: "",
        graduationDate: "",
        gpa: "",
      };
    } else if (dateMatch && currentEdu) {
      currentEdu.graduationDate = dateMatch[2] || dateMatch[0];
    } else if (currentEdu && line.toLowerCase().includes("gpa")) {
      const gpaMatch = line.match(/(\d+\.?\d*)\s*\/?\s*(\d+\.?\d*)?/);
      if (gpaMatch) currentEdu.gpa = gpaMatch[0];
    }
  }
  if (currentEdu) data.education.push(currentEdu);

  // Seed one empty entry if we found nothing — keeps forms navigable.
  if (data.experience.length === 0) {
    data.experience.push({
      id: `exp-${Date.now()}`,
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      bullets: [""],
    });
  }
  if (data.education.length === 0) {
    data.education.push({
      id: `edu-${Date.now()}`,
      degree: "",
      school: "",
      location: "",
      graduationDate: "",
      gpa: "",
    });
  }

  return data;
};

/** Shape the resume for consumption by template components. */
export const resumeToTemplateData = (resume: ResumeData): TemplateData => ({
  contact: resume.contact,
  summary: resume.summary,
  experience: resume.experience,
  education: resume.education,
  skills: resume.skills,
  certifications: resume.certifications,
  references: resume.references,
  languages: resume.languages,
  awards: resume.awards,
  volunteer: resume.volunteer,
  publications: resume.publications,
  projects: resume.projects,
});
