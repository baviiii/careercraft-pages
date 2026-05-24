/* ───────────────────────────────────────────────────────────────
   Vector resume PDF — true text, true vectors, real pagination.
   One Document, parameterised by a theme + layout variant.
   Built on @react-pdf/renderer using only built-in fonts so we
   never depend on cross-origin font loading.
   ─────────────────────────────────────────────────────────────── */

import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { TemplateData } from "@/components/templates/types";

import { getResumeTheme, type ResumeTheme } from "./themes";

interface ResumeDocumentProps {
  data: TemplateData;
  templateId?: string | null;
}

const PAGE_PAD = 36; // 0.5"
const SIDEBAR_W = 175;

export function ResumeDocument({ data, templateId }: ResumeDocumentProps) {
  const theme = getResumeTheme(templateId);

  return (
    <Document
      title={data.contact.name ? `${data.contact.name} — Résumé` : "Résumé"}
      author={data.contact.name || undefined}
      creator="CareerCraft"
      producer="CareerCraft"
    >
      <Page size="A4" style={pageStyles(theme).page}>
        {renderLayout(theme, data)}
      </Page>
    </Document>
  );
}

function renderLayout(theme: ResumeTheme, data: TemplateData) {
  switch (theme.layout) {
    case "sidebar":
      return <SidebarLayout theme={theme} data={data} />;
    case "accent":
      return <AccentLayout theme={theme} data={data} />;
    case "classic":
      return <ClassicLayout theme={theme} data={data} />;
    case "minimal":
    default:
      return <MinimalLayout theme={theme} data={data} />;
  }
}

/* ───────────────────────────────────────────────────────────────
   Layout: classic — centered name, serif, rule-divided sections
   ─────────────────────────────────────────────────────────────── */
function ClassicLayout({ theme, data }: { theme: ResumeTheme; data: TemplateData }) {
  const s = styles(theme);
  return (
    <View>
      <View style={s.classicHeader}>
        <Text style={s.classicName}>{formatName(theme, data.contact.name)}</Text>
        <Text style={s.classicContact}>
          {contactLine(data.contact, " • ")}
        </Text>
      </View>

      <Sections theme={theme} data={data} compact={false} />
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────
   Layout: accent — left vertical bar, name in accent, modern look
   ─────────────────────────────────────────────────────────────── */
function AccentLayout({ theme, data }: { theme: ResumeTheme; data: TemplateData }) {
  const s = styles(theme);
  return (
    <View>
      <View style={s.accentHeader}>
        <View style={s.accentBar} />
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={s.accentName}>{formatName(theme, data.contact.name)}</Text>
          <Text style={s.accentContact}>
            {contactLine(data.contact, "  |  ")}
          </Text>
        </View>
      </View>

      <Sections theme={theme} data={data} compact={false} />
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────
   Layout: minimal — left aligned, lots of whitespace, fine type
   ─────────────────────────────────────────────────────────────── */
function MinimalLayout({ theme, data }: { theme: ResumeTheme; data: TemplateData }) {
  const s = styles(theme);
  return (
    <View>
      <View style={s.minimalHeader}>
        <Text style={s.minimalName}>{formatName(theme, data.contact.name)}</Text>
        <Text style={s.minimalContact}>
          {contactLine(data.contact, "   ")}
        </Text>
      </View>

      <Sections theme={theme} data={data} compact />
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────
   Layout: sidebar — left fixed sidebar (skills, education, etc),
   right main column (summary, experience).
   ─────────────────────────────────────────────────────────────── */
function SidebarLayout({ theme, data }: { theme: ResumeTheme; data: TemplateData }) {
  const s = styles(theme);
  const hasContact = data.contact.email || data.contact.phone || data.contact.location;

  return (
    <View style={s.sidebarRow}>
      <View style={s.sidebar}>
        <Text style={s.sidebarName}>{formatName(theme, data.contact.name)}</Text>

        {hasContact && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sidebarSectionHead}>Contact</Text>
            {data.contact.email && <Text style={s.sidebarLine}>{data.contact.email}</Text>}
            {data.contact.phone && <Text style={s.sidebarLine}>{data.contact.phone}</Text>}
            {data.contact.location && <Text style={s.sidebarLine}>{data.contact.location}</Text>}
            {data.contact.linkedin && (
              <Link src={normaliseUrl(data.contact.linkedin)} style={s.sidebarLink}>
                {data.contact.linkedin}
              </Link>
            )}
            {data.contact.website && (
              <Link src={normaliseUrl(data.contact.website)} style={s.sidebarLink}>
                {data.contact.website}
              </Link>
            )}
          </View>
        )}

        {data.skills.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sidebarSectionHead}>Skills</Text>
            {data.skills.map((skill, i) => (
              <Text key={i} style={s.sidebarLine}>• {skill}</Text>
            ))}
          </View>
        )}

        {data.education.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sidebarSectionHead}>Education</Text>
            {data.education.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 8 }}>
                <Text style={s.sidebarItemBold}>{edu.degree}</Text>
                <Text style={s.sidebarLine}>{edu.school}</Text>
                {edu.location && <Text style={s.sidebarLine}>{edu.location}</Text>}
                <Text style={s.sidebarLine}>{edu.graduationDate}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {data.certifications && data.certifications.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sidebarSectionHead}>Certifications</Text>
            {data.certifications.map((c) => (
              <View key={c.id} style={{ marginBottom: 6 }}>
                <Text style={s.sidebarItemBold}>{c.name}</Text>
                {(c.issuer || c.date) && (
                  <Text style={s.sidebarLine}>
                    {[c.issuer, c.date].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {data.languages && data.languages.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sidebarSectionHead}>Languages</Text>
            {data.languages.map((l) => (
              <Text key={l.id} style={s.sidebarLine}>
                {l.language} · {l.proficiency}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={s.main}>
        {data.summary && (
          <View style={{ marginBottom: 14 }}>
            <SectionHead theme={theme}>Profile</SectionHead>
            <Text style={s.body}>{data.summary}</Text>
          </View>
        )}

        <ExperienceBlock theme={theme} data={data} />

        <OptionalAfterExperience theme={theme} data={data} hideEducation hideSkills hideCertifications hideLanguages />
      </View>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────
   Sections used by classic/accent/minimal (single-column layouts).
   ─────────────────────────────────────────────────────────────── */
function Sections({
  theme,
  data,
  compact,
}: {
  theme: ResumeTheme;
  data: TemplateData;
  compact: boolean;
}) {
  const s = styles(theme);
  return (
    <View>
      {data.summary && (
        <View style={{ marginTop: compact ? 12 : 18 }}>
          <SectionHead theme={theme}>Profile</SectionHead>
          <Text style={s.body}>{data.summary}</Text>
        </View>
      )}

      <ExperienceBlock theme={theme} data={data} />

      {data.education.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Education</SectionHead>
          {data.education.map((edu) => (
            <View key={edu.id} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{edu.degree}</Text>
                <Text style={s.itemSub}>
                  {[edu.school, edu.location].filter(Boolean).join(", ")}
                  {edu.gpa ? `  ·  GPA ${edu.gpa}` : ""}
                </Text>
              </View>
              {edu.graduationDate && (
                <Text style={s.itemDate}>{edu.graduationDate}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {data.skills.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Skills</SectionHead>
          <SkillsBlock theme={theme} skills={data.skills} />
        </View>
      )}

      <OptionalAfterExperience theme={theme} data={data} />
    </View>
  );
}

function ExperienceBlock({ theme, data }: { theme: ResumeTheme; data: TemplateData }) {
  if (data.experience.length === 0) return null;
  const s = styles(theme);
  return (
    <View style={s.sectionWrap}>
      <SectionHead theme={theme}>Experience</SectionHead>
      {data.experience.map((exp) => (
        <View key={exp.id} style={{ marginBottom: 10 }} wrap>
          <View style={s.itemRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.itemTitle}>{exp.title}</Text>
              <Text style={s.itemSub}>
                {[exp.company, exp.location].filter(Boolean).join(", ")}
              </Text>
            </View>
            <Text style={s.itemDate}>
              {[exp.startDate, exp.current ? "Present" : exp.endDate].filter(Boolean).join(" – ")}
            </Text>
          </View>
          {exp.bullets.filter((b) => b.trim()).map((bullet, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletMark}>•</Text>
              <Text style={s.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function OptionalAfterExperience({
  theme,
  data,
  hideEducation = false,
  hideSkills = false,
  hideCertifications = false,
  hideLanguages = false,
}: {
  theme: ResumeTheme;
  data: TemplateData;
  hideEducation?: boolean;
  hideSkills?: boolean;
  hideCertifications?: boolean;
  hideLanguages?: boolean;
}) {
  const s = styles(theme);
  return (
    <View>
      {data.projects && data.projects.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Projects</SectionHead>
          {data.projects.map((p) => (
            <View key={p.id} style={{ marginBottom: 8 }}>
              <Text style={s.itemTitle}>{p.name}</Text>
              {p.description && <Text style={s.body}>{p.description}</Text>}
              {p.technologies.length > 0 && (
                <Text style={s.itemSub}>{p.technologies.join(" · ")}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {!hideCertifications && data.certifications && data.certifications.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Certifications</SectionHead>
          {data.certifications.map((c) => (
            <View key={c.id} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{c.name}</Text>
                {c.issuer && <Text style={s.itemSub}>{c.issuer}</Text>}
              </View>
              {c.date && <Text style={s.itemDate}>{c.date}</Text>}
            </View>
          ))}
        </View>
      )}

      {data.awards && data.awards.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Awards</SectionHead>
          {data.awards.map((a) => (
            <View key={a.id} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{a.title}</Text>
                {a.issuer && <Text style={s.itemSub}>{a.issuer}</Text>}
                {a.description && <Text style={s.body}>{a.description}</Text>}
              </View>
              {a.date && <Text style={s.itemDate}>{a.date}</Text>}
            </View>
          ))}
        </View>
      )}

      {data.publications && data.publications.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Publications</SectionHead>
          {data.publications.map((p) => (
            <View key={p.id} style={{ marginBottom: 6 }}>
              <Text style={s.itemTitle}>{p.title}</Text>
              <Text style={s.itemSub}>
                {[p.publisher, p.date].filter(Boolean).join(" · ")}
              </Text>
              {p.description && <Text style={s.body}>{p.description}</Text>}
              {p.url && (
                <Link src={normaliseUrl(p.url)} style={s.link}>
                  {p.url}
                </Link>
              )}
            </View>
          ))}
        </View>
      )}

      {data.volunteer && data.volunteer.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Volunteer</SectionHead>
          {data.volunteer.map((v) => (
            <View key={v.id} style={{ marginBottom: 6 }}>
              <View style={s.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{v.role}</Text>
                  <Text style={s.itemSub}>
                    {[v.organization, v.location].filter(Boolean).join(", ")}
                  </Text>
                </View>
                {(v.startDate || v.endDate) && (
                  <Text style={s.itemDate}>
                    {[v.startDate, v.current ? "Present" : v.endDate].filter(Boolean).join(" – ")}
                  </Text>
                )}
              </View>
              {v.description && <Text style={s.body}>{v.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {!hideLanguages && data.languages && data.languages.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>Languages</SectionHead>
          <Text style={s.body}>
            {data.languages.map((l) => `${l.language} (${l.proficiency})`).join("  ·  ")}
          </Text>
        </View>
      )}

      {data.references && data.references.length > 0 && (
        <View style={s.sectionWrap}>
          <SectionHead theme={theme}>References</SectionHead>
          {data.references.map((r) => (
            <View key={r.id} style={{ marginBottom: 6 }}>
              <Text style={s.itemTitle}>{r.name}</Text>
              {(r.title || r.company) && (
                <Text style={s.itemSub}>
                  {[r.title, r.company].filter(Boolean).join(" · ")}
                </Text>
              )}
              {(r.email || r.phone) && (
                <Text style={s.itemSub}>
                  {[r.email, r.phone].filter(Boolean).join(" · ")}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Avoid lint warnings */}
      {hideEducation || hideSkills ? null : null}
    </View>
  );
}

function SectionHead({
  theme,
  children,
}: {
  theme: ResumeTheme;
  children: string;
}) {
  const s = styles(theme);

  if (theme.sectionHeader === "bar") {
    return (
      <View style={s.sectionHeadBar}>
        <View style={s.sectionHeadBarFill} />
        <Text style={s.sectionHeadBarText}>{children.toUpperCase()}</Text>
      </View>
    );
  }

  if (theme.sectionHeader === "underline") {
    return (
      <View style={s.sectionHeadUnderline}>
        <Text style={s.sectionHeadUnderlineText}>{children.toUpperCase()}</Text>
        <View style={s.sectionHeadUnderlineRule} />
      </View>
    );
  }

  if (theme.sectionHeader === "rule") {
    return (
      <View style={s.sectionHeadRule}>
        <Text style={s.sectionHeadRuleText}>{children.toUpperCase()}</Text>
        <View style={s.sectionHeadRuleLine} />
      </View>
    );
  }

  // caps-tracked default
  return <Text style={s.sectionHeadCaps}>{children.toUpperCase()}</Text>;
}

function SkillsBlock({
  theme,
  skills,
}: {
  theme: ResumeTheme;
  skills: string[];
}) {
  const s = styles(theme);

  if (theme.skills === "chip") {
    return (
      <View style={s.chipRow}>
        {skills.map((skill, i) => (
          <View key={i} style={s.chip}>
            <Text style={s.chipText}>{skill}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (theme.skills === "bullet") {
    return (
      <View>
        {skills.map((skill, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{skill}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (theme.skills === "dotted") {
    return <Text style={s.body}>{skills.join("  ·  ")}</Text>;
  }

  // inline
  return <Text style={s.body}>{skills.join(" • ")}</Text>;
}

/* ───────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────── */
function formatName(theme: ResumeTheme, name: string): string {
  const n = name || "Your Name";
  return theme.uppercaseName ? n.toUpperCase() : n;
}

function contactLine(contact: TemplateData["contact"], sep: string): string {
  return [
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
    contact.website,
  ]
    .filter(Boolean)
    .join(sep);
}

function normaliseUrl(href: string): string {
  if (!href) return "#";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^(www\.|linkedin\.com|github\.com)/i.test(href)) return `https://${href}`;
  return `https://${href}`;
}

/* ───────────────────────────────────────────────────────────────
   Theme-aware styles
   ─────────────────────────────────────────────────────────────── */
function pageStyles(theme: ResumeTheme) {
  return StyleSheet.create({
    page: {
      paddingTop: PAGE_PAD,
      paddingBottom: PAGE_PAD,
      paddingLeft: theme.layout === "sidebar" ? 0 : PAGE_PAD,
      paddingRight: theme.layout === "sidebar" ? 0 : PAGE_PAD,
      backgroundColor: theme.bg,
      fontFamily: theme.font,
      color: theme.ink,
      fontSize: 10,
      lineHeight: 1.4,
    },
  });
}

function styles(theme: ResumeTheme) {
  return StyleSheet.create({
    // ── shared ────────────────────────────────────────────
    body: {
      fontSize: 10,
      color: theme.ink,
      lineHeight: 1.45,
    },
    sectionWrap: { marginTop: 14 },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    itemTitle: {
      fontSize: 11,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.ink,
    },
    itemSub: {
      fontSize: 10,
      color: theme.mute,
      marginTop: 1,
    },
    itemDate: {
      fontSize: 9,
      color: theme.mute,
      paddingLeft: 6,
    },
    bulletRow: {
      flexDirection: "row",
      marginTop: 3,
      paddingLeft: 4,
    },
    bulletMark: {
      width: 10,
      fontSize: 10,
      color: theme.accent,
      lineHeight: 1.4,
    },
    bulletText: {
      flex: 1,
      fontSize: 10,
      color: theme.ink,
      lineHeight: 1.4,
    },
    link: {
      fontSize: 10,
      color: theme.accent,
      textDecoration: "none",
    },

    // ── section heads ─────────────────────────────────────
    sectionHeadCaps: {
      fontSize: 9,
      fontFamily: theme.font,
      fontWeight: "bold",
      letterSpacing: 2,
      color: theme.accent,
      marginBottom: 6,
    },
    sectionHeadBar: {
      backgroundColor: theme.accent,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    sectionHeadBarFill: { width: 0 },
    sectionHeadBarText: {
      fontSize: 10,
      fontFamily: theme.font,
      fontWeight: "bold",
      letterSpacing: 1.5,
      color: theme.bg,
    },
    sectionHeadUnderline: {
      marginBottom: 6,
    },
    sectionHeadUnderlineText: {
      fontSize: 11,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.accent,
      marginBottom: 3,
    },
    sectionHeadUnderlineRule: {
      height: 1.5,
      backgroundColor: theme.accent,
    },
    sectionHeadRule: {
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.hair,
      paddingBottom: 3,
    },
    sectionHeadRuleText: {
      fontSize: 10,
      fontFamily: theme.font,
      fontWeight: "bold",
      letterSpacing: 1.5,
      color: theme.accent,
    },
    sectionHeadRuleLine: { height: 0 },

    // ── chips ─────────────────────────────────────────────
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    chip: {
      backgroundColor: theme.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 3,
      marginRight: 5,
      marginBottom: 5,
    },
    chipText: {
      fontSize: 9,
      color: theme.accent,
      fontWeight: "bold",
    },

    // ── classic layout ────────────────────────────────────
    classicHeader: {
      borderBottomWidth: 1.5,
      borderBottomColor: theme.accent,
      paddingBottom: 8,
      alignItems: "center",
    },
    classicName: {
      fontSize: 22,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.headerName,
      letterSpacing: theme.uppercaseName ? 2 : 0,
    },
    classicContact: {
      marginTop: 5,
      fontSize: 9,
      color: theme.mute,
    },

    // ── accent layout ─────────────────────────────────────
    accentHeader: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: 4,
    },
    accentBar: {
      width: 4,
      backgroundColor: theme.accent,
      borderRadius: 2,
    },
    accentName: {
      fontSize: 24,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.headerName,
      letterSpacing: theme.uppercaseName ? 1.5 : 0,
    },
    accentContact: {
      marginTop: 4,
      fontSize: 9,
      color: theme.mute,
    },

    // ── minimal layout ────────────────────────────────────
    minimalHeader: {
      paddingBottom: 6,
    },
    minimalName: {
      fontSize: 22,
      fontFamily: theme.font,
      fontWeight: theme.uppercaseName ? "bold" : "normal",
      color: theme.headerName,
      letterSpacing: theme.uppercaseName ? 3 : 0.5,
    },
    minimalContact: {
      marginTop: 8,
      fontSize: 9,
      color: theme.mute,
      letterSpacing: 0.3,
    },

    // ── sidebar layout ────────────────────────────────────
    sidebarRow: {
      flexDirection: "row",
      minHeight: "100%",
    },
    sidebar: {
      width: SIDEBAR_W,
      backgroundColor: theme.sidebarBg,
      color: theme.sidebarInk,
      paddingHorizontal: 18,
      paddingVertical: 24,
    },
    main: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    sidebarName: {
      fontSize: 18,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.sidebarInk,
      letterSpacing: theme.uppercaseName ? 1 : 0,
    },
    sidebarSectionHead: {
      fontSize: 9,
      fontFamily: theme.font,
      fontWeight: "bold",
      letterSpacing: 1.5,
      color: theme.sidebarInk,
      marginBottom: 5,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: hairlineForSidebar(theme),
    },
    sidebarLine: {
      fontSize: 9,
      color: theme.sidebarInk,
      marginBottom: 2,
      lineHeight: 1.4,
    },
    sidebarItemBold: {
      fontSize: 9.5,
      fontFamily: theme.font,
      fontWeight: "bold",
      color: theme.sidebarInk,
      marginBottom: 1,
    },
    sidebarLink: {
      fontSize: 9,
      color: theme.sidebarInk,
      textDecoration: "none",
      marginBottom: 2,
    },
  });
}

function hairlineForSidebar(theme: ResumeTheme): string {
  // dark sidebar bg ⇒ light divider, light sidebar bg ⇒ accent divider
  const isDark = isDarkColor(theme.sidebarBg);
  return isDark ? "rgba(255,255,255,0.25)" : theme.accent;
}

function isDarkColor(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.5;
}
