/* ───────────────────────────────────────────────────────────────
   Vector PDF ports of ModernTemplate1–7 — 1:1 with the on-screen
   components (same geometry at px()×0.75, same Tailwind colours,
   same Inter weights).
   ─────────────────────────────────────────────────────────────── */

import { Page, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

import type { TemplateData } from "@/components/templates/types";

import { INTER } from "../fonts";
import { mix, tw } from "../palette";
import {
  BetweenRow,
  Bullets,
  Dot,
  FixedGradient,
  GradientFill,
  PAGE_SIZE,
  fsize,
  joinPresent,
  px,
  track,
  wrapEntry,
} from "../primitives";
import { ExtraSections, type ExtrasTheme } from "./extras";

const base: Style = {
  fontFamily: INTER,
  fontWeight: 400,
  color: tw.black,
};

function contactLine(d: TemplateData, sep: string): string {
  return joinPresent([d.contact.email, d.contact.phone, d.contact.location], sep);
}

function dates(exp: { startDate: string; endDate: string; current: boolean }, sep = " - "): string {
  return `${exp.startDate}${sep}${exp.current && !exp.endDate ? "Present" : exp.endDate}`;
}

/* ═══ Modern 1 — blue accent bar, chips ═══════════════════════ */

export function Modern1Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = { ...fsize(18, 28), fontWeight: 700, color: tw.blue[600], marginBottom: px(8) };
  const rule: Style = { height: px(1), backgroundColor: tw.blue[600], marginBottom: px(12) };
  const Head = ({ children }: { children: string }) => (
    <View minPresenceAhead={40}>
      <Text style={head}>{children.toUpperCase()}</Text>
      <View style={rule} />
    </View>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 24,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(14, 20), color: tw.gray[600] },
    meta: { ...fsize(12, 16), color: tw.gray[500] },
    body: { ...fsize(14, 20), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: tw.blue[100], color: tw.blue[700], radius: 4 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(24) }}>
        {/* Header — left blue bar */}
        <View style={{ borderLeftWidth: px(4), borderLeftColor: tw.blue[600], paddingLeft: px(16) }}>
          <Text style={{ ...fsize(30, 36), fontWeight: 700, color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <Text style={{ ...fsize(14, 20), color: tw.gray[600], marginTop: px(4) }}>
            {contactLine(d, " | ")}
          </Text>
        </View>

        {d.summary ? (
          <View>
            <Head>Professional Summary</Head>
            <Text style={{ ...fsize(14, 20), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Experience</Head>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} wrap={wrapEntry(exp)}>
                  <BetweenRow
                    left={
                      <View minPresenceAhead={36}>
                        <Text style={{ ...fsize(16, 19.2), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(14, 20), color: tw.gray[600] }}>
                          {exp.company}
                          {exp.location ? `, ${exp.location}` : ""}
                        </Text>
                      </View>
                    }
                    right={dates(exp)}
                    rightStyle={{ ...fsize(12, 16), color: tw.gray[500] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="disc-inside"
                    itemGapPx={4}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(14, 20), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Head>Education</Head>
            <View style={{ gap: px(8) }}>
              {d.education.map((edu) => (
                <BetweenRow
                  key={edu.id}
                  wrap={false}
                  left={
                    <View>
                      <Text style={{ ...fsize(16, 19.2), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                      <Text style={{ ...fsize(14, 20), color: tw.gray[600] }}>
                        {edu.school}
                        {edu.location ? `, ${edu.location}` : ""}
                      </Text>
                    </View>
                  }
                  right={edu.graduationDate}
                  rightStyle={{ ...fsize(12, 16), color: tw.gray[500] }}
                />
              ))}
            </View>
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Skills</Head>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(8) }}>
              {d.skills.map((skill, i) => (
                <View
                  key={i}
                  style={{
                    paddingHorizontal: px(12),
                    paddingVertical: px(4),
                    backgroundColor: tw.blue[100],
                    borderRadius: px(4),
                  }}
                >
                  <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.blue[700] }}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Modern 2 — slate gradient, centered, 1/3 + 2/3 grid ═════ */

export function Modern2Pdf({ data: d }: { data: TemplateData }) {
  const CONTENT_W = 730;
  const gap = 24;
  const trackW = (CONTENT_W - gap * 2) / 3;

  const colHead: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.slate[900],
    letterSpacing: track(0.025, 12),
    marginBottom: px(8),
    paddingBottom: px(4),
    borderBottomWidth: px(1),
    borderBottomColor: tw.slate[800],
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={colHead}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 16,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.slate[900] },
    sub: { ...fsize(12, 16), color: tw.slate[600] },
    meta: { ...fsize(12, 16), color: tw.slate[500] },
    body: { ...fsize(12, 16), color: tw.slate[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32) }}>
      <FixedGradient
        id="m2bg"
        direction="to-br"
        stops={[
          { offset: "0%", color: tw.slate[50] },
          { offset: "100%", color: tw.slate[100] },
        ]}
      />
      <View style={{ gap: px(24) }}>
        {/* Centered header */}
        <View
          style={{
            alignItems: "center",
            paddingBottom: px(16),
            borderBottomWidth: px(2),
            borderBottomColor: tw.slate[800],
          }}
        >
          <Text style={{ ...fsize(36, 40), fontWeight: 700, color: tw.slate[900], marginBottom: px(8) }}>
            {(d.contact.name || "YOUR NAME").toUpperCase()}
          </Text>
          <Text style={{ ...fsize(14, 20), color: tw.slate[600] }}>
            {d.summary ? `${d.summary.slice(0, 60)}${d.summary.length > 60 ? "..." : ""}` : "Professional Title"}
          </Text>
          <Text style={{ ...fsize(12, 16), color: tw.slate[500], marginTop: px(8) }}>
            {contactLine(d, " | ")}
          </Text>
        </View>

        {/* 1/3 + 2/3 columns */}
        <View style={{ flexDirection: "row", gap: px(gap) }}>
          <View style={{ width: px(trackW), gap: px(16) }}>
            {d.skills.length > 0 && (
              <View>
                <Head>Skills</Head>
                <View style={{ gap: px(4) }}>
                  {d.skills.slice(0, 8).map((skill, i) => (
                    <Text key={i} style={{ ...fsize(12, 16), color: tw.slate[700] }}>
                      • {skill}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {d.education.length > 0 && (
              <View>
                <Head>Education</Head>
                {d.education.map((edu) => (
                  <View key={edu.id} wrap={false} style={{ marginBottom: px(8) }}>
                    <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.slate[700] }}>{edu.degree}</Text>
                    <Text style={{ ...fsize(12, 16), color: tw.slate[600] }}>{edu.school}</Text>
                    <Text style={{ ...fsize(12, 16), color: tw.slate[500] }}>{edu.graduationDate}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: px(16) }}>
            {d.experience.length > 0 && (
              <View>
                <Text style={{ ...colHead, marginBottom: px(12) }}>EXPERIENCE</Text>
                <View style={{ gap: px(12) }}>
                  {d.experience.map((exp) => (
                    <View key={exp.id} wrap={wrapEntry(exp)}>
                      <BetweenRow
                        style={{ marginBottom: px(4) }}
                        left={
                          <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.slate[900] }}>{exp.title}</Text>
                        }
                        right={dates(exp)}
                        rightStyle={{ ...fsize(12, 16), color: tw.slate[500] }}
                      />
                      <Text style={{ ...fsize(12, 16), color: tw.slate[600], marginBottom: px(4) }}>
                        {exp.company}
                        {exp.location ? ` • ${exp.location}` : ""}
                      </Text>
                      <Bullets
                        items={exp.bullets}
                        marker="disc-inside"
                        itemGapPx={2}
                        textStyle={{ ...fsize(12, 16), color: tw.slate[700] }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <ExtraSections data={d} t={extras} />
          </View>
        </View>
      </View>
    </Page>
  );
}

/* ═══ Modern 3 — full-bleed teal banner ═══════════════════════ */

export function Modern3Pdf({ data: d }: { data: TemplateData }) {
  const PAD = 28; // page top/bottom padding for continuation pages
  const secHead: Style = {
    ...fsize(14, 20),
    fontWeight: 700,
    color: tw.teal[600],
    letterSpacing: track(0.1, 14),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={secHead}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[600] },
    meta: { ...fsize(12, 16), fontWeight: 500, color: tw.teal[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: tw.teal[50], color: tw.teal[700], radius: 4 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(PAD), paddingBottom: px(PAD), backgroundColor: tw.white }}>
      {/* Full-bleed teal header (pulls over the page's top padding) */}
      <View
        style={{
          marginTop: -px(PAD),
          backgroundColor: tw.teal[600],
          paddingHorizontal: px(32),
          paddingVertical: px(24),
        }}
      >
        <Text style={{ ...fsize(30, 36), fontWeight: 700, letterSpacing: track(-0.025, 30), color: tw.white }}>
          {d.contact.name || "Your Name"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(16), marginTop: px(8) }}>
          {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
            <Text key={i} style={{ ...fsize(14, 20), color: tw.teal[100] }}>
              {v}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: px(32), paddingTop: px(32), gap: px(20) }}>
        {d.summary ? (
          <View>
            <Head>About Me</Head>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...secHead, marginBottom: px(12) }}>WORK EXPERIENCE</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View
                  key={exp.id}
                  wrap={wrapEntry(exp)}
                  style={{ borderLeftWidth: px(2), borderLeftColor: tw.teal[200], paddingLeft: px(16) }}
                >
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp)}
                    rightStyle={{ ...fsize(12, 16), fontWeight: 500, color: tw.teal[600] }}
                  />
                  <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                    {exp.company}
                    {exp.location ? ` • ${exp.location}` : ""}
                  </Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-inside"
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
                <View key={edu.id} wrap={false} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(12, 16), color: tw.gray[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Skills</Head>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: tw.teal[50],
                      borderRadius: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(12, 16), color: tw.teal[700] }}>{skill}</Text>
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

/* ═══ Modern 4 — indigo split header, pill skills ═════════════ */

export function Modern4Pdf({ data: d }: { data: TemplateData }) {
  const Head = ({ children }: { children: string }) => (
    <View
      minPresenceAhead={40}
      style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(12) }}
    >
      <View style={{ width: px(32), height: px(2), backgroundColor: tw.indigo[600] }} />
      <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.indigo[600] }}>{children.toUpperCase()}</Text>
    </View>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontWeight: 500, color: tw.indigo[600] },
    meta: { ...fsize(12, 16), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: tw.white, color: tw.indigo[700], borderColor: tw.indigo[200], radius: 999 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        {/* Split header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: px(16),
            borderBottomWidth: px(2),
            borderBottomColor: tw.indigo[500],
          }}
        >
          <View style={{ flex: 1, paddingRight: px(12) }}>
            <Text style={{ ...fsize(30, 36), fontWeight: 800, color: tw.gray[900] }}>
              {d.contact.name || "Your Name"}
            </Text>
            {d.contact.linkedin ? (
              <Text style={{ ...fsize(12, 16), color: tw.indigo[600], marginTop: px(4) }}>{d.contact.linkedin}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <View style={{ backgroundColor: tw.indigo[50], padding: px(16), borderRadius: px(8) }}>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700], fontStyle: "italic" }}>
              {d.summary}
            </Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Experience</Head>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} wrap={wrapEntry(exp)}>
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp, " — ")}
                    rightStyle={{ ...fsize(12, 16), color: tw.gray[500] }}
                  />
                  <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.indigo[600] }}>
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

        {d.education.length > 0 && (
          <View>
            <Head>Education</Head>
            {d.education.map((edu) => (
              <BetweenRow
                key={edu.id}
                wrap={false}
                style={{ marginBottom: px(8) }}
                left={
                  <View>
                    <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                    <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>
                      {edu.school}
                      {edu.location ? `, ${edu.location}` : ""}
                    </Text>
                  </View>
                }
                right={edu.graduationDate}
                rightStyle={{ ...fsize(12, 16), color: tw.gray[500] }}
              />
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Skills</Head>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(8) }}>
              {d.skills.map((skill, i) => (
                <View
                  key={i}
                  style={{
                    paddingHorizontal: px(12),
                    paddingVertical: px(4),
                    borderWidth: px(1),
                    borderColor: tw.indigo[200],
                    borderRadius: px(999),
                  }}
                >
                  <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.indigo[700] }}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Modern 5 — emerald gradient sidebar + timeline ══════════ */

export function Modern5Pdf({ data: d }: { data: TemplateData }) {
  const SIDEBAR_W = 794 / 3;
  const sideHead: Style = {
    ...fsize(10),
    fontWeight: 600,
    color: tw.emerald[200],
    letterSpacing: track(0.1, 10),
    marginBottom: px(8),
  };
  const mainHead: Style = {
    ...fsize(14, 20),
    fontWeight: 700,
    color: tw.emerald[700],
    letterSpacing: track(0.025, 14),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={{ ...mainHead, marginBottom: px(12) }}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[600] },
    meta: { ...fsize(10), fontWeight: 500, color: tw.emerald[600] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(24), paddingBottom: px(24) }}>
      {/* Sidebar rail repeats on every page */}
      <View fixed style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: px(SIDEBAR_W) }}>
        <GradientFill
          id="m5side"
          direction="to-b"
          stops={[
            { offset: "0%", color: tw.emerald[600] },
            { offset: "100%", color: tw.emerald[800] },
          ]}
        />
      </View>

      <View style={{ flexDirection: "row" }}>
        {/* Sidebar content */}
        <View style={{ width: px(SIDEBAR_W), paddingHorizontal: px(24) }}>
          <Text style={{ ...fsize(20, 28), lineHeight: 1.25, fontWeight: 700, color: tw.white, marginBottom: px(24) }}>
            {d.contact.name || "Your Name"}
          </Text>

          <View style={{ gap: px(12), marginBottom: px(24) }}>
            <Text style={sideHead}>CONTACT</Text>
            {[d.contact.email, d.contact.phone, d.contact.location, d.contact.linkedin]
              .filter(Boolean)
              .map((v, i) => (
                <Text key={i} style={{ ...fsize(12, 16), color: tw.emerald[100] }}>
                  {v}
                </Text>
              ))}
          </View>

          {d.skills.length > 0 && (
            <View>
              <Text style={sideHead}>SKILLS</Text>
              <View style={{ gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingVertical: px(4),
                      borderBottomWidth: px(1),
                      borderBottomColor: mix(tw.emerald[500], mix(tw.emerald[600], tw.emerald[800]), 0.7),
                    }}
                  >
                    <Text style={{ ...fsize(12, 16), color: tw.emerald[100] }}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {d.education.length > 0 && (
            <View style={{ marginTop: px(24) }}>
              <Text style={sideHead}>EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} wrap={false} style={{ marginBottom: px(12) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.white }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.emerald[200] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: mix(tw.emerald[200], tw.emerald[400]) }}>
                    {edu.graduationDate}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main column */}
        <View style={{ flex: 1, paddingHorizontal: px(24), gap: px(20) }}>
          {d.summary ? (
            <View>
              <Text style={mainHead}>PROFILE</Text>
              <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
            </View>
          ) : null}

          {d.experience.length > 0 && (
            <View>
              <Text style={{ ...mainHead, marginBottom: px(12) }}>EXPERIENCE</Text>
              <View style={{ gap: px(16) }}>
                {d.experience.map((exp) => (
                  <View
                    key={exp.id}
                    wrap={wrapEntry(exp)}
                    style={{
                      position: "relative",
                      paddingLeft: px(16),
                      borderLeftWidth: px(2),
                      borderLeftColor: tw.emerald[200],
                    }}
                  >
                    <Dot
                      sizePx={12}
                      color={tw.emerald[500]}
                      style={{ position: "absolute", left: px(-7), top: 0 }}
                    />
                    <BetweenRow
                      left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                      right={dates(exp)}
                      rightStyle={{ ...fsize(10), fontWeight: 500, color: tw.emerald[600] }}
                    />
                    <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{exp.company}</Text>
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

          <ExtraSections data={d} t={extras} />
        </View>
      </View>
    </Page>
  );
}

/* ═══ Modern 6 — rose centered editorial ══════════════════════ */

export function Modern6Pdf({ data: d }: { data: TemplateData }) {
  const secHead: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.rose[500],
    letterSpacing: track(0.2, 12),
    textAlign: "center",
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={secHead}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900], textAlign: "center" },
    sub: { ...fsize(12, 16), fontWeight: 500, color: tw.rose[500], textAlign: "center" },
    meta: { ...fsize(10), color: tw.gray[500], textAlign: "center" },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700], textAlign: "center" },
  };
  const contactBits = [d.contact.email, d.contact.phone, d.contact.location].filter(Boolean);

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.white }}>
      <View style={{ gap: px(20) }}>
        {/* Centered header with dots */}
        <View style={{ alignItems: "center", paddingBottom: px(16) }}>
          <Text style={{ ...fsize(30, 36), fontWeight: 300, letterSpacing: track(0.025, 30), color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginTop: px(8) }}>
            {contactBits.map((v, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                {i > 0 && <Dot sizePx={5} color={tw.rose[400]} />}
                <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: px(4), marginTop: px(12) }}>
            <View style={{ width: px(48), height: px(2), backgroundColor: tw.rose[400] }} />
            <View style={{ width: px(12), height: px(2), backgroundColor: tw.rose[200] }} />
          </View>
        </View>

        {d.summary ? (
          <View>
            <Head>Summary</Head>
            <Text
              style={{
                ...fsize(12, 16),
                lineHeight: 1.625,
                color: tw.gray[700],
                textAlign: "center",
                maxWidth: px(512),
                alignSelf: "center",
              }}
            >
              {d.summary}
            </Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...secHead, marginBottom: px(12) }}>EXPERIENCE</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} wrap={wrapEntry(exp)} style={{ alignItems: "center" }}>
                  <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                  <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.rose[500] }}>{exp.company}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[500] }}>
                    {joinPresent([exp.location, dates(exp)], " | ")}
                  </Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8), maxWidth: px(448), alignSelf: "center", width: "100%" }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(32) }}>
          {d.education.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Education</Head>
              {d.education.map((edu) => (
                <View key={edu.id} wrap={false} style={{ alignItems: "center", marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1 }}>
              <Head>Skills</Head>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: tw.rose[50],
                      borderRadius: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.rose[600] }}>{skill}</Text>
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

/* ═══ Modern 7 — slate card stack with emoji contacts ═════════ */

export function Modern7Pdf({ data: d }: { data: TemplateData }) {
  const card: Style = {
    backgroundColor: tw.white,
    borderRadius: px(8),
    borderWidth: px(1),
    borderColor: tw.slate[200],
    padding: px(16),
  };
  const secLabel: Style = { ...fsize(12, 16), fontWeight: 700, color: tw.slate[500], marginBottom: px(8) };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={{ ...secLabel, marginBottom: px(12), paddingHorizontal: px(4) }}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.slate[800] },
    sub: { ...fsize(12, 16), fontWeight: 500, color: tw.cyan[600] },
    meta: { ...fsize(10), color: tw.slate[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.slate[700] },
    chip: { bg: tw.cyan[50], color: tw.cyan[700], borderColor: tw.cyan[200], radius: 999 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.slate[50] }}>
      <View style={{ gap: px(20) }}>
        {/* Header card */}
        <View style={{ ...card, padding: px(20) }}>
          <Text style={{ ...fsize(24, 32), fontWeight: 700, color: tw.slate[800] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(16), marginTop: px(8) }}>
            {[
              d.contact.email ? `📧 ${d.contact.email}` : null,
              d.contact.phone ? `📱 ${d.contact.phone}` : null,
              d.contact.location ? `📍 ${d.contact.location}` : null,
            ]
              .filter(Boolean)
              .map((v, i) => (
                <Text key={i} style={{ ...fsize(12, 16), color: tw.slate[600] }}>
                  {v}
                </Text>
              ))}
          </View>
        </View>

        {d.summary ? (
          <View style={card}>
            <Text style={secLabel}>ABOUT</Text>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.slate[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Experience</Head>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} wrap={wrapEntry(exp)} style={card}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: px(8) }}>
                      <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.slate[800] }}>{exp.title}</Text>
                      <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.cyan[600] }}>{exp.company}</Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: tw.slate[100],
                        paddingHorizontal: px(8),
                        paddingVertical: px(4),
                        borderRadius: px(4),
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ ...fsize(10), color: tw.slate[500] }}>{dates(exp)}</Text>
                    </View>
                  </View>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.slate[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(16) }}>
          {d.education.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Text style={secLabel}>EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} wrap={false} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.slate[800] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.slate[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.slate[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Text style={secLabel}>SKILLS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: tw.cyan[50],
                      borderWidth: px(1),
                      borderColor: tw.cyan[200],
                      borderRadius: px(999),
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.cyan[700] }}>{skill}</Text>
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
