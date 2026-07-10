/* ───────────────────────────────────────────────────────────────
   Vector PDF ports of ProfessionalTemplate 1–6.
   Serif accents use Gelasio (metric twin of the browser's
   Georgia-class `font-serif` stack).
   ─────────────────────────────────────────────────────────────── */

import { Page, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

import type { TemplateData } from "@/components/templates/types";

import { GELASIO, INTER } from "../fonts";
import { tw } from "../palette";
import {
  BetweenRow,
  Bullets,
  Dot,
  IconEnvelope,
  IconHouse,
  IconPhone,
  IconStar,
  PAGE_SIZE,
  fsize,
  joinPresent,
  px,
  track,
} from "../primitives";
import { ExtraSections, type ExtrasTheme } from "./extras";

const base: Style = {
  fontFamily: INTER,
  fontWeight: 400,
  color: tw.black,
};

function dates(exp: { startDate: string; endDate: string; current: boolean }, sep = " - "): string {
  return `${exp.startDate}${sep}${exp.current && !exp.endDate ? "Present" : exp.endDate}`;
}

/* ═══ Professional 1 — classic serif, black rules ═════════════ */

export function Professional1Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(14, 20),
    fontWeight: 700,
    color: tw.black,
    letterSpacing: track(0.05, 14),
    marginBottom: px(8),
    paddingBottom: px(4),
    borderBottomWidth: px(1),
    borderBottomColor: tw.gray[400],
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.black },
    sub: { ...fsize(12, 16), fontWeight: 600, color: tw.gray[700] },
    meta: { ...fsize(12, 16), color: tw.gray[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[800] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        <View
          style={{
            alignItems: "center",
            paddingBottom: px(12),
            borderBottomWidth: px(2),
            borderBottomColor: tw.black,
          }}
        >
          <Text style={{ ...fsize(30, 36), fontFamily: GELASIO, fontWeight: 700, color: tw.black, marginBottom: px(4) }}>
            {(d.contact.name || "YOUR NAME").toUpperCase()}
          </Text>
          <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>
            {joinPresent([d.contact.email, d.contact.phone, d.contact.location], " • ")}
          </Text>
        </View>

        {d.summary ? (
          <View>
            <Head>Professional Summary</Head>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[800] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Professional Experience</Head>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <BetweenRow
                    style={{ marginBottom: px(4) }}
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.black }}>{exp.title}</Text>}
                    right={dates(exp)}
                    rightStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                  />
                  <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.gray[700], marginBottom: px(4) }}>
                    {exp.company}
                    {exp.location ? `, ${exp.location}` : ""}
                  </Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[800] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Head>Education</Head>
            {d.education.map((edu) => (
              <View key={edu.id} style={{ marginBottom: px(8) }}>
                <BetweenRow
                  left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.black }}>{edu.degree}</Text>}
                  right={edu.graduationDate}
                  rightStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                />
                <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>
                  {edu.school}
                  {edu.location ? `, ${edu.location}` : ""}
                  {edu.gpa ? ` • GPA: ${edu.gpa}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Technical Skills</Head>
            <Text style={{ ...fsize(12, 16), color: tw.gray[800] }}>{d.skills.join(" • ")}</Text>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Professional 2 — traditional, square bullets ════════════ */

export function Professional2Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(14, 20),
    fontWeight: 700,
    color: tw.gray[800],
    letterSpacing: track(0.025, 14),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[700] },
    meta: { ...fsize(12, 16), fontStyle: "italic", color: tw.gray[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        <View style={{ paddingBottom: px(16), borderBottomWidth: px(1), borderBottomColor: tw.gray[300] }}>
          <Text style={{ ...fsize(24, 32), fontFamily: GELASIO, color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ flexDirection: "row", gap: px(16), marginTop: px(8) }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <View>
            <Head>Objective</Head>
            <Text
              style={{
                ...fsize(12, 16),
                lineHeight: 1.625,
                color: tw.gray[700],
                paddingLeft: px(16),
                borderLeftWidth: px(2),
                borderLeftColor: tw.gray[200],
              }}
            >
              {d.summary}
            </Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>PROFESSIONAL EXPERIENCE</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <BetweenRow
                    left={
                      <View>
                        <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>
                          {joinPresent([exp.company, exp.location], ", ")}
                        </Text>
                      </View>
                    }
                    right={dates(exp)}
                    rightStyle={{ ...fsize(12, 16), fontStyle: "italic", color: tw.gray[600] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="square"
                    itemGapPx={4}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>EDUCATION</Text>
            {d.education.map((edu) => (
              <BetweenRow
                key={edu.id}
                style={{ marginBottom: px(8) }}
                left={
                  <View>
                    <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                    <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                      {joinPresent([edu.school, edu.location], ", ")}
                    </Text>
                  </View>
                }
                right={`${edu.graduationDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`}
                rightStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
              />
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Core Competencies</Head>
            <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>{d.skills.join(" | ")}</Text>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Professional 3 — navy banner, dotted skills ═════════════ */

export function Professional3Pdf({ data: d }: { data: TemplateData }) {
  const PAD = 28;
  const head: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.slate[800],
    letterSpacing: track(0.1, 12),
    marginBottom: px(8),
    paddingBottom: px(4),
    borderBottomWidth: px(2),
    borderBottomColor: tw.slate[800],
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontWeight: 600, color: tw.slate[600] },
    meta: { ...fsize(12, 16), color: tw.gray[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(PAD), paddingBottom: px(PAD), backgroundColor: tw.white }}>
      <View
        style={{
          marginTop: -px(PAD),
          backgroundColor: tw.slate[800],
          paddingHorizontal: px(32),
          paddingVertical: px(20),
        }}
      >
        <Text style={{ ...fsize(24, 32), fontWeight: 700, color: tw.white }}>
          {(d.contact.name || "YOUR NAME").toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", gap: px(16), marginTop: px(6) }}>
          {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
            <Text key={i} style={{ ...fsize(12, 16), color: tw.slate[300] }}>
              {v}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: px(32), paddingTop: px(32), gap: px(20) }}>
        {d.summary ? (
          <View>
            <Head>Executive Summary</Head>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>PROFESSIONAL HISTORY</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp, " — ")}
                    rightStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                  />
                  <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.slate[600] }}>
                    {joinPresent([exp.company, exp.location], " | ")}
                  </Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={4}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(24) }}>
          {d.education.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Education</Head>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[500] }}>
                    {edu.graduationDate}
                    {edu.gpa ? ` • GPA: ${edu.gpa}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Key Skills</Head>
              <View style={{ gap: px(2) }}>
                {d.skills.map((skill, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                    <Dot sizePx={6} color={tw.slate[400]} />
                    <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Professional 4 — centered serif traditional ═════════════ */

export function Professional4Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(14, 20),
    fontFamily: GELASIO,
    fontWeight: 700,
    color: tw.gray[800],
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontStyle: "italic", color: tw.gray[600] },
    meta: { ...fsize(12, 16), color: tw.gray[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        <View
          style={{
            alignItems: "center",
            paddingBottom: px(16),
            borderBottomWidth: px(1),
            borderBottomColor: tw.gray[400],
          }}
        >
          <Text
            style={{
              ...fsize(30, 36),
              fontFamily: GELASIO,
              fontWeight: 700,
              letterSpacing: track(0.025, 30),
              color: tw.gray[900],
            }}
          >
            {d.contact.name || "Your Name"}
          </Text>
          <Text style={{ ...fsize(12, 16), color: tw.gray[600], marginTop: px(8) }}>
            {joinPresent([d.contact.location, d.contact.phone, d.contact.email], " · ")}
          </Text>
          {d.contact.linkedin ? (
            <Text style={{ ...fsize(12, 16), color: tw.gray[500], marginTop: px(4) }}>{d.contact.linkedin}</Text>
          ) : null}
        </View>

        {d.summary ? (
          <View>
            <Head>Profile</Head>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>EXPERIENCE</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(12, 16), fontStyle: "italic", color: tw.gray[600], flex: 1, paddingRight: px(8) }}>
                      {joinPresent([exp.company, exp.location], ", ")}
                    </Text>
                    <Text style={{ ...fsize(12, 16), color: tw.gray[600], flexShrink: 0 }}>{dates(exp, " – ")}</Text>
                  </View>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Head>Education</Head>
            {d.education.map((edu) => (
              <View key={edu.id} style={{ marginBottom: px(8) }}>
                <BetweenRow
                  left={<Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>}
                  right={edu.graduationDate}
                  rightStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                />
                <Text style={{ ...fsize(12, 16), fontStyle: "italic", color: tw.gray[600] }}>
                  {joinPresent([edu.school, edu.location], ", ")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Skills</Head>
            <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>{d.skills.join(", ")}</Text>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Professional 5 — left rail, star badges ═════════════════ */

export function Professional5Pdf({ data: d }: { data: TemplateData }) {
  const StarBadge = ({ sizePx, starPx }: { sizePx: number; starPx: number }) => (
    <View
      style={{
        width: px(sizePx),
        height: px(sizePx),
        backgroundColor: tw.gray[800],
        borderRadius: px(2),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconStar sizePx={starPx} color={tw.white} />
    </View>
  );
  const Head = ({ children }: { children: string }) => (
    <View
      minPresenceAhead={40}
      style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(12) }}
    >
      <StarBadge sizePx={16} starPx={9} />
      <Text
        style={{
          ...fsize(14, 20),
          fontWeight: 700,
          color: tw.gray[800],
          letterSpacing: track(0.025, 14),
        }}
      >
        {children.toUpperCase()}
      </Text>
    </View>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontWeight: 500, color: tw.gray[600] },
    meta: { ...fsize(12, 16), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };
  const contactBits = [
    d.contact.email ? ([IconEnvelope, d.contact.email] as const) : null,
    d.contact.phone ? ([IconPhone, d.contact.phone] as const) : null,
    d.contact.location ? ([IconHouse, d.contact.location] as const) : null,
  ].filter(Boolean) as ReadonlyArray<readonly [typeof IconEnvelope, string]>;

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(32), paddingBottom: px(32), backgroundColor: tw.white }}>
      {/* Thin dark rail on every page */}
      <View
        fixed
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: px(8), backgroundColor: tw.gray[800] }}
      />

      <View style={{ paddingLeft: px(8 + 32), paddingRight: px(32), gap: px(20) }}>
        <View style={{ paddingBottom: px(12), borderBottomWidth: px(2), borderBottomColor: tw.gray[200] }}>
          <Text style={{ ...fsize(24, 32), fontWeight: 700, color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(12), marginTop: px(8) }}>
            {contactBits.map(([Icon, value], i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: px(4) }}>
                <Icon sizePx={11} color={tw.gray[600]} />
                <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {d.summary ? (
          <View
            style={{
              backgroundColor: tw.gray[50],
              padding: px(16),
              borderRadius: px(4),
              borderLeftWidth: px(4),
              borderLeftColor: tw.gray[800],
            }}
          >
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Work History</Head>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View
                  key={exp.id}
                  style={{ paddingLeft: px(16), borderLeftWidth: px(1), borderLeftColor: tw.gray[300] }}
                >
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp)}
                    rightStyle={{ ...fsize(12, 16), color: tw.gray[500] }}
                  />
                  <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.gray[600] }}>
                    {exp.company}
                    {exp.location ? `, ${exp.location}` : ""}
                  </Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(6) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(24) }}>
          {d.education.length > 0 && (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(8) }}>
                <StarBadge sizePx={16} starPx={9} />
                <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[800], letterSpacing: track(0.025, 14) }}>
                  EDUCATION
                </Text>
              </View>
              {d.education.map((edu) => (
                <View
                  key={edu.id}
                  style={{
                    marginBottom: px(8),
                    paddingLeft: px(16),
                    borderLeftWidth: px(1),
                    borderLeftColor: tw.gray[300],
                  }}
                >
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(8) }}>
                <StarBadge sizePx={16} starPx={9} />
                <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[800], letterSpacing: track(0.025, 14) }}>
                  EXPERTISE
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: tw.gray[100],
                      borderWidth: px(1),
                      borderColor: tw.gray[200],
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.gray[700] }}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Professional 6 — monogram + numbered history ════════════ */

export function Professional6Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.gray[500],
    letterSpacing: track(0.1, 12),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[600] },
    meta: { ...fsize(10), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };
  const initials = (d.contact.name || "YN")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        {/* Monogram header */}
        <View
          style={{
            flexDirection: "row",
            gap: px(16),
            paddingBottom: px(16),
            borderBottomWidth: px(1),
            borderBottomColor: tw.gray[300],
          }}
        >
          <View
            style={{
              width: px(56),
              height: px(56),
              backgroundColor: tw.gray[900],
              borderRadius: px(4),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ ...fsize(20, 28), fontWeight: 700, color: tw.white }}>{initials}</Text>
          </View>
          <View>
            <Text style={{ ...fsize(24, 32), fontWeight: 700, color: tw.gray[900] }}>
              {d.contact.name || "Your Name"}
            </Text>
            <Text style={{ ...fsize(12, 16), color: tw.gray[600], marginTop: px(4) }}>
              {joinPresent([d.contact.email, d.contact.phone, d.contact.location], " • ")}
            </Text>
          </View>
        </View>

        {d.summary ? (
          <View>
            <Text style={{ ...head, marginBottom: px(4) }}>PROFESSIONAL SUMMARY</Text>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>CAREER HISTORY</Text>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp, index) => (
                <View key={exp.id} style={{ flexDirection: "row", gap: px(16) }}>
                  <View style={{ width: px(24), alignItems: "center" }}>
                    <View
                      style={{
                        width: px(24),
                        height: px(24),
                        borderRadius: px(12),
                        backgroundColor: tw.gray[900],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ ...fsize(10, 10), fontWeight: 700, color: tw.white }}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <BetweenRow
                      left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                      right={dates(exp)}
                      rightStyle={{ ...fsize(10), color: tw.gray[500] }}
                    />
                    <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                      {exp.company}
                      {exp.location ? `, ${exp.location}` : ""}
                    </Text>
                    <Bullets
                      items={exp.bullets}
                      marker="disc-outside"
                      itemGapPx={2}
                      style={{ marginTop: px(6) }}
                      textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(24), paddingTop: px(8) }}>
          {d.education.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Education</Head>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Technical Skills</Head>
              <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>
                {d.skills.join(" · ")}
              </Text>
            </View>
          )}
        </View>

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}
