/* ───────────────────────────────────────────────────────────────
   Vector PDF ports of MinimalTemplate1–5.
   ─────────────────────────────────────────────────────────────── */

import { Page, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ComponentType, ReactNode } from "react";

import type { TemplateData } from "@/components/templates/types";

import { INTER } from "../fonts";
import { tw } from "../palette";
import {
  BetweenRow,
  Bullets,
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

/* ═══ Minimal 1 — ultra clean, tracked labels ═════════════════ */

export function Minimal1Pdf({ data: d }: { data: TemplateData }) {
  const label: Style = {
    ...fsize(10),
    fontWeight: 500,
    color: tw.gray[400],
    letterSpacing: track(0.3, 10),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={label}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 24,
    title: { ...fsize(14, 20), fontWeight: 500, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[500] },
    meta: { ...fsize(10), color: tw.gray[400] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[600] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(40), backgroundColor: tw.white }}>
      <View style={{ gap: px(24) }}>
        <View style={{ paddingBottom: px(16) }}>
          <Text style={{ ...fsize(30, 36), fontWeight: 300, letterSpacing: track(0.025, 30), color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ flexDirection: "row", gap: px(24), marginTop: px(12) }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(12, 16), color: tw.gray[500] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[600] }}>{d.summary}</Text>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...label, marginBottom: px(16) }}>EXPERIENCE</Text>
            <View style={{ gap: px(20) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 500, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp, " — ")}
                    rightStyle={{ ...fsize(10), color: tw.gray[400] }}
                  />
                  <Text style={{ ...fsize(12, 16), color: tw.gray[500], marginTop: px(2) }}>{exp.company}</Text>
                  <Bullets
                    items={exp.bullets}
                    marker="dot-sm"
                    markerColor={tw.gray[300]}
                    gutterPx={12}
                    itemGapPx={4}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Text style={{ ...label, marginBottom: px(12) }}>EDUCATION</Text>
            {d.education.map((edu) => (
              <BetweenRow
                key={edu.id}
                style={{ marginBottom: px(8) }}
                left={
                  <View>
                    <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.gray[900] }}>{edu.degree}</Text>
                    <Text style={{ ...fsize(10), color: tw.gray[500] }}>{edu.school}</Text>
                  </View>
                }
                right={edu.graduationDate}
                rightStyle={{ ...fsize(10), color: tw.gray[400] }}
              />
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Head>Skills</Head>
            <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{d.skills.join("  ·  ")}</Text>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Minimal 2 — centered narrow column on gray ══════════════ */

export function Minimal2Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(12, 16),
    fontWeight: 600,
    color: tw.gray[900],
    letterSpacing: track(0.05, 12),
    textAlign: "center",
    marginBottom: px(12),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 24,
    title: { ...fsize(14, 20), fontWeight: 600, color: tw.gray[900] },
    sub: { ...fsize(10), color: tw.gray[500] },
    meta: { ...fsize(10), color: tw.gray[400] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[600] },
    chip: { bg: tw.white, color: tw.gray[700], radius: 4 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.gray[50] }}>
      {/* max-w-xl centered column */}
      <View style={{ width: px(576), alignSelf: "center", gap: px(24) }}>
        <View
          style={{
            alignItems: "center",
            paddingBottom: px(16),
            borderBottomWidth: px(1),
            borderBottomColor: tw.gray[200],
          }}
        >
          <Text style={{ ...fsize(24, 32), fontWeight: 600, color: tw.gray[900] }}>
            {d.contact.name || "Your Name"}
          </Text>
          <Text style={{ ...fsize(12, 16), color: tw.gray[500], marginTop: px(8) }}>
            {joinPresent([d.contact.email, d.contact.phone, d.contact.location], "  |  ")}
          </Text>
        </View>

        {d.summary ? (
          <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[600], textAlign: "center" }}>
            {d.summary}
          </Text>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(16) }}>WORK</Text>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} style={{ backgroundColor: tw.white, borderRadius: px(4), padding: px(16) }}>
                  <BetweenRow
                    left={
                      <View>
                        <Text style={{ ...fsize(14, 20), fontWeight: 600, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), color: tw.gray[500] }}>{exp.company}</Text>
                      </View>
                    }
                    right={dates(exp)}
                    rightStyle={{ ...fsize(10), color: tw.gray[400] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={4}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(12) }}>EDUCATION</Text>
            <View style={{ backgroundColor: tw.white, borderRadius: px(4), padding: px(16), gap: px(8) }}>
              {d.education.map((edu) => (
                <BetweenRow
                  key={edu.id}
                  left={
                    <View>
                      <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.gray[900] }}>{edu.degree}</Text>
                      <Text style={{ ...fsize(10), color: tw.gray[500] }}>{edu.school}</Text>
                    </View>
                  }
                  right={edu.graduationDate}
                  rightStyle={{ ...fsize(10), color: tw.gray[400] }}
                />
              ))}
            </View>
          </View>
        )}

        {d.skills.length > 0 && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ ...head, marginBottom: px(8) }}>SKILLS</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: px(8) }}>
              {d.skills.map((skill, i) => (
                <View
                  key={i}
                  style={{
                    paddingHorizontal: px(8),
                    paddingVertical: px(4),
                    backgroundColor: tw.white,
                    borderRadius: px(4),
                  }}
                >
                  <Text style={{ ...fsize(10), color: tw.gray[700] }}>{skill}</Text>
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

/* ═══ Minimal 3 — narrow gray left column ═════════════════════ */

export function Minimal3Pdf({ data: d }: { data: TemplateData }) {
  const LEFT_W = 794 / 4;
  const sideLabel: Style = {
    ...fsize(9),
    fontWeight: 500,
    color: tw.gray[400],
    letterSpacing: track(0.1, 9),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={{ ...sideLabel, marginBottom: px(16) }}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 500, color: tw.gray[900] },
    sub: { ...fsize(10), color: tw.gray[500] },
    meta: { ...fsize(9), color: tw.gray[400] },
    body: { ...fsize(10), lineHeight: 1.625, color: tw.gray[600] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(24), paddingBottom: px(24), backgroundColor: tw.white }}>
      <View
        fixed
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: px(LEFT_W), backgroundColor: tw.gray[100] }}
      />

      <View style={{ flexDirection: "row" }}>
        {/* Left rail */}
        <View style={{ width: px(LEFT_W), paddingHorizontal: px(24), gap: px(24) }}>
          <View>
            <Text style={sideLabel}>CONTACT</Text>
            <View style={{ gap: px(6) }}>
              {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
                <Text key={i} style={{ ...fsize(10), color: tw.gray[600] }}>
                  {v}
                </Text>
              ))}
            </View>
          </View>

          {d.skills.length > 0 && (
            <View>
              <Text style={sideLabel}>SKILLS</Text>
              <View style={{ gap: px(4) }}>
                {d.skills.map((skill, i) => (
                  <Text key={i} style={{ ...fsize(10), color: tw.gray[600] }}>
                    {skill}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {d.education.length > 0 && (
            <View>
              <Text style={sideLabel}>EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(12) }}>
                  <Text style={{ ...fsize(10), fontWeight: 500, color: tw.gray[700] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(9), color: tw.gray[500] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(9), color: tw.gray[400] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main */}
        <View style={{ flex: 1, paddingLeft: px(32), paddingRight: px(32), paddingTop: px(8), gap: px(20) }}>
          <View style={{ paddingBottom: px(12), borderBottomWidth: px(1), borderBottomColor: tw.gray[200] }}>
            <Text style={{ ...fsize(24, 32), fontWeight: 300, color: tw.gray[900] }}>
              {d.contact.name || "Your Name"}
            </Text>
          </View>

          {d.summary ? (
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[600] }}>{d.summary}</Text>
          ) : null}

          {d.experience.length > 0 && (
            <View>
              <Text style={{ ...sideLabel, marginBottom: px(16) }}>EXPERIENCE</Text>
              <View style={{ gap: px(16) }}>
                {d.experience.map((exp) => (
                  <View key={exp.id}>
                    <BetweenRow
                      left={<Text style={{ ...fsize(14, 20), fontWeight: 500, color: tw.gray[900] }}>{exp.title}</Text>}
                      right={dates(exp, " — ")}
                      rightStyle={{ ...fsize(9), color: tw.gray[400] }}
                    />
                    <Text style={{ ...fsize(10), color: tw.gray[500] }}>
                      {exp.company}
                      {exp.location ? `, ${exp.location}` : ""}
                    </Text>
                    <Bullets
                      items={exp.bullets}
                      marker="disc-outside"
                      itemGapPx={2}
                      style={{ marginTop: px(8) }}
                      textStyle={{ ...fsize(10), color: tw.gray[600] }}
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

/* ═══ Minimal 4 — black keyline utilitarian ═══════════════════ */

export function Minimal4Pdf({ data: d }: { data: TemplateData }) {
  const head: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.gray[900],
    letterSpacing: track(0.05, 12),
    marginBottom: px(12),
    paddingBottom: px(4),
    borderBottomWidth: px(1),
    borderBottomColor: tw.gray[300],
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={head}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 24,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.gray[500] },
    meta: { ...fsize(10), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(40), backgroundColor: tw.white }}>
      <View style={{ gap: px(24) }}>
        {/* Two-line header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: px(12),
            borderBottomWidth: px(1),
            borderBottomColor: tw.black,
          }}
        >
          <Text style={{ ...fsize(24, 32), fontWeight: 700, color: tw.gray[900], flex: 1, paddingRight: px(8) }}>
            {d.contact.name || "Your Name"}
          </Text>
          <View style={{ alignItems: "flex-end", gap: px(2) }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(10), color: tw.gray[600] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Experience</Head>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: px(8), flex: 1, paddingRight: px(8), flexWrap: "wrap" }}>
                      <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                      <Text style={{ ...fsize(12, 16), color: tw.gray[500] }}>at {exp.company}</Text>
                    </View>
                    <Text style={{ ...fsize(10), color: tw.gray[500], flexShrink: 0 }}>{dates(exp, "–")}</Text>
                  </View>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(6) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[600] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {d.education.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(8) }}>EDUCATION</Text>
            {d.education.map((edu) => (
              <BetweenRow
                key={edu.id}
                style={{ marginBottom: px(4) }}
                left={
                  <Text style={{ ...fsize(12, 16), color: tw.gray[800] }}>
                    <Text style={{ fontWeight: 700 }}>{edu.degree}</Text> — {edu.school}
                  </Text>
                }
                right={edu.graduationDate}
                rightStyle={{ ...fsize(10), color: tw.gray[500] }}
              />
            ))}
          </View>
        )}

        {d.skills.length > 0 && (
          <View>
            <Text style={{ ...head, marginBottom: px(4) }}>SKILLS</Text>
            <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>{d.skills.join(" • ")}</Text>
          </View>
        )}

        <ExtraSections data={d} t={extras} />
      </View>
    </Page>
  );
}

/* ═══ Minimal 5 — Swiss grid with side labels ═════════════════ */

export function Minimal5Pdf({ data: d }: { data: TemplateData }) {
  const CONTENT_W = 730;
  const gap = 16;
  const colTrack = (CONTENT_W - gap * 2) / 3;

  const label: Style = {
    ...fsize(9),
    fontWeight: 500,
    color: tw.gray[500],
    letterSpacing: track(0.1, 9),
    paddingTop: px(2),
  };
  const GridRow = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={{ flexDirection: "row", gap: px(gap) }}>
      <View style={{ width: px(colTrack) }}>
        <Text style={label}>{title.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={{ ...label, marginBottom: px(8) }}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(10), color: tw.gray[600] },
    meta: { ...fsize(9), color: tw.gray[500] },
    body: { ...fsize(10), lineHeight: 1.625, color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.neutral[50] }}>
      <View style={{ gap: px(20) }}>
        {/* Swiss header */}
        <View
          style={{
            flexDirection: "row",
            gap: px(gap),
            paddingBottom: px(16),
            borderBottomWidth: px(2),
            borderBottomColor: tw.black,
          }}
        >
          <View style={{ width: px(colTrack * 2 + gap) }}>
            <Text style={{ ...fsize(30, 30), fontWeight: 900, color: tw.gray[900] }}>
              {d.contact.name || "Your Name"}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: px(2) }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(10), color: tw.gray[600] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <GridRow title="Profile">
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </GridRow>
        ) : null}

        {d.experience.length > 0 && (
          <GridRow title="Experience">
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id}>
                  <BetweenRow
                    left={<Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>}
                    right={dates(exp, "—")}
                    rightStyle={{ ...fsize(9), color: tw.gray[500] }}
                  />
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{exp.company}</Text>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    gutterPx={12}
                    itemGapPx={2}
                    style={{ marginTop: px(6) }}
                    textStyle={{ ...fsize(10), color: tw.gray[600] }}
                  />
                </View>
              ))}
            </View>
          </GridRow>
        )}

        {d.education.length > 0 && (
          <GridRow title="Education">
            <View style={{ gap: px(4) }}>
              {d.education.map((edu) => (
                <BetweenRow
                  key={edu.id}
                  left={
                    <Text>
                      <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.gray[900] }}>{edu.degree}</Text>
                      <Text style={{ ...fsize(10), color: tw.gray[500] }}> — {edu.school}</Text>
                    </Text>
                  }
                  right={edu.graduationDate}
                  rightStyle={{ ...fsize(9), color: tw.gray[500] }}
                />
              ))}
            </View>
          </GridRow>
        )}

        {d.skills.length > 0 && (
          <GridRow title="Skills">
            <Text style={{ ...fsize(10), color: tw.gray[700] }}>{d.skills.join(", ")}</Text>
          </GridRow>
        )}

        {/* Extra sections keep the Swiss label column */}
        <GridRowExtras data={d} extras={extras} GridRow={GridRow} />
      </View>
    </Page>
  );
}

function GridRowExtras({
  data,
  extras,
  GridRow,
}: {
  data: TemplateData;
  extras: ExtrasTheme;
  GridRow: React.ComponentType<{ title: string; children: ReactNode }>;
}) {
  const has =
    data.projects?.length ||
    data.certifications?.length ||
    data.awards?.length ||
    data.publications?.length ||
    data.volunteer?.length ||
    data.languages?.length ||
    data.references?.length;
  if (!has) return null;
  return (
    <GridRow title="More">
      <ExtraSections data={data} t={extras} />
    </GridRow>
  );
}
