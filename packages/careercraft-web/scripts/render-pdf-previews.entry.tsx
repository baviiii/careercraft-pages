/* Renders every PDF template with rich sample data into
   tmp/pdf-previews/<id>.pdf so the output can be eyeballed
   against the on-screen templates. Run via render-pdf-previews.mjs. */

import ReactPDF from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { TemplateData } from "@/components/templates/types";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { ResumeDocument } from "@/lib/pdf/ResumeDocument";
import { PDF_TEMPLATES } from "@/lib/pdf/templates";

const here = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(here, "../src/assets/fonts");
const outDir = path.resolve(here, "../tmp/pdf-previews");

registerPdfFonts({
  interLight: path.join(fontsDir, "Inter-Light.ttf"),
  interRegular: path.join(fontsDir, "Inter-Regular.ttf"),
  interItalic: path.join(fontsDir, "Inter-Italic.ttf"),
  interMedium: path.join(fontsDir, "Inter-Medium.ttf"),
  interSemiBold: path.join(fontsDir, "Inter-SemiBold.ttf"),
  interBold: path.join(fontsDir, "Inter-Bold.ttf"),
  interExtraBold: path.join(fontsDir, "Inter-ExtraBold.ttf"),
  interBlack: path.join(fontsDir, "Inter-Black.ttf"),
  gelasioRegular: path.join(fontsDir, "Gelasio-Regular.ttf"),
  gelasioBold: path.join(fontsDir, "Gelasio-Bold.ttf"),
});

const sample: TemplateData = {
  contact: {
    name: "Alexandra Martínez-Chen",
    email: "alex.martinez@example.com",
    phone: "(555) 867-5309",
    location: "Melbourne, VIC",
    linkedin: "linkedin.com/in/alexmartinez",
    website: "alexmartinez.dev",
  },
  summary:
    "Product-minded senior software engineer with 9+ years building data-intensive web platforms. Known for pairing deep technical judgment with clear communication — leading teams through ambiguous problems, shipping measurable wins, and mentoring engineers into senior roles.",
  experience: [
    {
      id: "e1",
      title: "Staff Software Engineer, Platform & Developer Experience",
      company: "Northwind Analytics",
      location: "Melbourne, VIC",
      startDate: "Mar 2022",
      endDate: "",
      current: true,
      bullets: [
        "Led a 7-engineer team re-architecting the ingestion pipeline to an event-driven design, cutting p99 latency from 4.2s to 310ms while doubling daily volume to 2.1B events",
        "Drove adoption of typed API contracts across 14 services; production incidents attributable to schema drift dropped 83% year-over-year",
        "Designed the internal deployment platform used by 60+ engineers, reducing median time-to-production from 3 days to 40 minutes",
      ],
    },
    {
      id: "e2",
      title: "Senior Software Engineer",
      company: "Beacon Health Technologies",
      location: "Sydney, NSW",
      startDate: "Jul 2019",
      endDate: "Feb 2022",
      current: false,
      bullets: [
        "Built the patient-scheduling engine (React/TypeScript + Postgres) serving 400k monthly bookings across 3 countries",
        "Introduced contract testing and trunk-based development, lifting deploy frequency from weekly to 11×/day",
        "Mentored 4 engineers; 2 promoted to senior within 18 months",
      ],
    },
    {
      id: "e3",
      title: "Software Engineer",
      company: "Fjord Digital Studio",
      location: "Auckland, NZ",
      startDate: "Jan 2016",
      endDate: "Jun 2019",
      current: false,
      bullets: [
        "Delivered 20+ client web applications end-to-end, from discovery workshops to production hand-off",
        "Created a shared component library adopted by 6 project teams, trimming average build time by 30%",
      ],
    },
  ],
  education: [
    {
      id: "ed1",
      degree: "B.E. (Hons) Software Engineering",
      school: "University of Auckland",
      location: "Auckland, NZ",
      graduationDate: "2015",
      gpa: "3.9",
    },
    {
      id: "ed2",
      degree: "Graduate Certificate in Data Science",
      school: "RMIT University",
      location: "Melbourne, VIC",
      graduationDate: "2021",
      gpa: "",
    },
  ],
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Kafka",
    "AWS (ECS, Lambda, RDS)",
    "Terraform",
    "GraphQL",
    "Observability (Grafana, OTel)",
    "Team Leadership",
  ],
  certifications: [
    { id: "c1", name: "AWS Solutions Architect – Professional", issuer: "Amazon Web Services", date: "2024" },
    { id: "c2", name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2023" },
  ],
  languages: [
    { id: "l1", language: "English", proficiency: "Native" },
    { id: "l2", language: "Spanish", proficiency: "Professional" },
    { id: "l3", language: "Mandarin", proficiency: "Conversational" },
  ],
  projects: [
    {
      id: "p1",
      name: "OpenTelemetry Cost Sampler",
      description: "Open-source adaptive trace sampler that cut tracing spend 60% at two mid-size companies.",
      technologies: ["Go", "OpenTelemetry", "ClickHouse"],
    },
  ],
  awards: [
    {
      id: "a1",
      title: "Engineering Excellence Award",
      issuer: "Northwind Analytics",
      date: "2024",
      description: "Company-wide award for the ingestion re-architecture.",
    },
  ],
};

async function main() {
  const ids = Object.keys(PDF_TEMPLATES);
  for (const id of ids) {
    const doc = <ResumeDocument data={sample} templateId={id} />;
    const file = path.join(outDir, `${id}.pdf`);
    await ReactPDF.renderToFile(doc, file);
    console.log(`rendered ${id}`);
  }
  console.log(`done: ${ids.length} PDFs in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
