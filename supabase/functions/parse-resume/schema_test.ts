import { PARSED_RESUME_JSON_SCHEMA, ParsedResumeSchema } from "./schema.ts";

const clean = {
  personalInfo: {
    fullName: "Alex Nguyen",
    email: "alex@example.com",
    phone: "0400 000 000",
    location: "Adelaide, SA",
    linkedin: null,
    website: null,
    summary: "Registered nurse.",
  },
  workExperience: [{
    company: "Royal Adelaide Hospital",
    title: "Registered Nurse",
    location: "Adelaide, SA",
    startDate: "2020-03",
    endDate: null,
    current: true,
    bullets: ["Managed a ward"],
  }],
  education: [],
  skills: [{ category: "Clinical", items: ["Wound Care"] }],
  certifications: [],
  languages: [],
  projects: [],
  references: [],
  awards: [],
  volunteer: [],
  publications: [],
  confidence: 0.8,
};

Deno.test("a clean résumé passes through unchanged", () => {
  const parsed = ParsedResumeSchema.parse(clean);
  if (JSON.stringify(parsed) !== JSON.stringify(clean)) {
    throw new Error(JSON.stringify(parsed));
  }
});

Deno.test("string fields accept arrays, numbers and omitted nulls", () => {
  const parsed = ParsedResumeSchema.parse({
    personalInfo: {
      fullName: "Alex Nguyen",
      phone: 400000000,
      summary: ["Registered nurse.", "AHPRA registered"],
    },
    workExperience: [{
      company: ["Royal Adelaide Hospital"],
      title: "Registered Nurse",
      location: ["Adelaide", "SA"],
      current: "yes",
      bullets: "Managed a ward",
    }],
    projects: {
      name: "Handover tool",
      description: ["Cut handover time", "Rolled out to two wards"],
      technologies: "HL7",
    },
    skills: ["Wound Care", "MYOB"],
    languages: ["English"],
    confidence: "85%",
  });

  if (parsed.personalInfo.email !== null) throw new Error("missing email should be null");
  if (parsed.personalInfo.phone !== "400000000") throw new Error(parsed.personalInfo.phone ?? "phone");
  if (parsed.personalInfo.summary !== "Registered nurse.\nAHPRA registered") {
    throw new Error(parsed.personalInfo.summary ?? "summary");
  }
  if (parsed.workExperience[0].company !== "Royal Adelaide Hospital") {
    throw new Error(parsed.workExperience[0].company);
  }
  if (parsed.workExperience[0].location !== "Adelaide\nSA") {
    throw new Error(parsed.workExperience[0].location ?? "location");
  }
  if (parsed.workExperience[0].current !== true) throw new Error("current");
  if (parsed.workExperience[0].bullets[0] !== "Managed a ward") throw new Error("bullets");
  if (parsed.projects[0].description !== "Cut handover time\nRolled out to two wards") {
    throw new Error(parsed.projects[0].description ?? "description");
  }
  if (parsed.projects[0].technologies[0] !== "HL7") throw new Error("technologies");
  if (parsed.skills[0].items.join(",") !== "Wound Care,MYOB") throw new Error("skills");
  if (parsed.languages[0].language !== "English") throw new Error("languages");
  if (parsed.confidence !== 0.85) throw new Error(String(parsed.confidence));
});

Deno.test("a required field that is an object still fails", () => {
  const parsed = ParsedResumeSchema.safeParse({
    ...clean,
    workExperience: [{
      company: { name: "Royal Adelaide Hospital" },
      title: "Registered Nurse",
      current: true,
    }],
  });
  if (parsed.success) throw new Error("object company should fail");
});

Deno.test("the schema sent to Horus still asks for strings, with its hints", () => {
  type Field = { type: string | string[]; description?: string };
  const schema = PARSED_RESUME_JSON_SCHEMA as {
    properties: {
      personalInfo: { properties: { summary: Field } };
      workExperience: { items: { properties: { startDate: Field } } };
      projects: { items: { properties: { description: Field } } };
    };
  };
  const summary = schema.properties.personalInfo.properties.summary;
  const description = schema.properties.projects.items.properties.description;
  for (const { type } of [summary, description]) {
    const names = Array.isArray(type) ? type : [type];
    if (!names.includes("string")) throw new Error(JSON.stringify(type));
    if (names.includes("array")) throw new Error(JSON.stringify(type));
  }
  if (!summary.description?.includes("summary")) throw new Error(JSON.stringify(summary));
  const startDate = schema.properties.workExperience.items.properties.startDate;
  if (!startDate.description?.includes("YYYY-MM")) throw new Error(JSON.stringify(startDate));
});
