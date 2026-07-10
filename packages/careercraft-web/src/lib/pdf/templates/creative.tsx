/* ───────────────────────────────────────────────────────────────
   Vector PDF ports of CreativeTemplate1–7 — gradients, dark
   themes and geometric decorations reproduced with SVG fills.
   ─────────────────────────────────────────────────────────────── */

import { Page, Polygon, Svg, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

import type { TemplateData } from "@/components/templates/types";

import { INTER } from "../fonts";
import { flatten, mix, tw } from "../palette";
import {
  BetweenRow,
  Bullets,
  Diamond,
  FixedGradient,
  GradientFill,
  GradientText,
  IconStar4,
  PAGE_SIZE,
  Tint,
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

/* ═══ Creative 1 — purple/pink gradient, skill bars ═══════════ */

export function Creative1Pdf({ data: d }: { data: TemplateData }) {
  const CONTENT_W = 730;
  const gap = 16;
  const colTrack = (CONTENT_W - gap * 4) / 5;
  const leftW = colTrack * 2 + gap;

  const Head = ({ children }: { children: string }) => (
    <Text
      minPresenceAhead={40}
      style={{
        ...fsize(14, 20),
        fontWeight: 900,
        color: tw.purple[900],
        marginBottom: px(12),
        paddingBottom: px(8),
        borderBottomWidth: px(2),
        borderBottomColor: tw.purple[300],
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 16,
    title: { ...fsize(14, 20), fontWeight: 900, color: tw.purple[900] },
    sub: { ...fsize(12, 16), fontWeight: 700, color: tw.purple[700] },
    meta: { ...fsize(12, 16), fontWeight: 700, color: tw.purple[600] },
    body: { ...fsize(12, 16), color: tw.gray[700] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32) }}>
      <FixedGradient
        id="c1bg"
        direction="to-br"
        stops={[
          { offset: "0%", color: tw.purple[50] },
          { offset: "50%", color: tw.white },
          { offset: "100%", color: tw.pink[50] },
        ]}
      />
      <View style={{ gap: px(24) }}>
        {/* Asymmetric header with page-edge gradient bar */}
        <View style={{ position: "relative" }}>
          <View style={{ position: "absolute", left: px(-32), top: 0, width: px(8), height: px(96) }}>
            <GradientFill
              id="c1bar"
              direction="to-b"
              stops={[
                { offset: "0%", color: tw.purple[600] },
                { offset: "100%", color: tw.pink[600] },
              ]}
            />
          </View>
          <View style={{ paddingLeft: px(16) }}>
            <GradientText
              id="c1name"
              text={(d.contact.name || "YOUR NAME").toUpperCase()}
              stops={[
                { offset: "0%", color: tw.purple[600] },
                { offset: "100%", color: tw.pink[600] },
              ]}
              fontSizePx={36}
              heightPx={44}
              widthPx={CONTENT_W - 16}
              fontWeight={900}
            />
            <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.purple[800], marginTop: px(4) }}>
              {d.experience[0]?.title || "Professional Title"}
            </Text>
            <Text style={{ ...fsize(12, 16), color: tw.gray[600], marginTop: px(4) }}>
              {joinPresent([d.contact.email, d.contact.phone, d.contact.location], " • ")}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: px(gap) }}>
          {/* Left — skills bars + education cards */}
          <View style={{ width: px(leftW), gap: px(16) }}>
            {d.skills.length > 0 && (
              <View style={{ borderRadius: px(8), overflow: "hidden", padding: px(16) }}>
                <GradientFill
                  id="c1skills"
                  direction="to-br"
                  stops={[
                    { offset: "0%", color: tw.purple[100] },
                    { offset: "100%", color: tw.pink[100] },
                  ]}
                />
                <Text style={{ ...fsize(14, 20), fontWeight: 900, color: tw.purple[900], marginBottom: px(12) }}>
                  SKILLS
                </Text>
                <View style={{ gap: px(8) }}>
                  {d.skills.slice(0, 5).map((skill, i) => (
                    <View key={i}>
                      <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.purple[800], marginBottom: px(4) }}>
                        {skill}
                      </Text>
                      <View
                        style={{
                          height: px(6),
                          backgroundColor: tw.purple[200],
                          borderRadius: px(3),
                          overflow: "hidden",
                        }}
                      >
                        <View style={{ width: `${90 - i * 10}%`, height: px(6), position: "relative" }}>
                          <GradientFill
                            id={`c1bar${i}`}
                            stops={[
                              { offset: "0%", color: tw.purple[600] },
                              { offset: "100%", color: tw.pink[600] },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {d.education.length > 0 && (
              <View style={{ borderRadius: px(8), overflow: "hidden", padding: px(16) }}>
                <GradientFill
                  id="c1edu"
                  direction="to-br"
                  stops={[
                    { offset: "0%", color: tw.pink[100] },
                    { offset: "100%", color: tw.purple[100] },
                  ]}
                />
                <Text style={{ ...fsize(14, 20), fontWeight: 900, color: tw.purple[900], marginBottom: px(8) }}>
                  EDUCATION
                </Text>
                {d.education.map((edu) => (
                  <View key={edu.id} style={{ marginBottom: px(8) }}>
                    <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.purple[800] }}>{edu.degree}</Text>
                    <Text style={{ ...fsize(12, 16), color: tw.gray[700] }}>{edu.school}</Text>
                    <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.purple[600] }}>
                      {edu.graduationDate}
                      {edu.gpa ? ` • GPA ${edu.gpa}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right — experience timeline */}
          <View style={{ flex: 1, gap: px(16) }}>
            {d.experience.length > 0 && (
              <View>
                <Head>Experience</Head>
                <View style={{ gap: px(16) }}>
                  {d.experience.map((exp) => (
                    <View key={exp.id} style={{ position: "relative", paddingLeft: px(24) }}>
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          top: px(4),
                          width: px(16),
                          height: px(16),
                          borderRadius: px(8),
                          overflow: "hidden",
                        }}
                      >
                        <GradientFill
                          id={`c1dot${exp.id}`}
                          direction="to-br"
                          stops={[
                            { offset: "0%", color: tw.purple[600] },
                            { offset: "100%", color: tw.pink[600] },
                          ]}
                        />
                      </View>
                      <BetweenRow
                        style={{ marginBottom: px(4) }}
                        left={
                          <Text style={{ ...fsize(14, 20), fontWeight: 900, color: tw.purple[900] }}>{exp.title}</Text>
                        }
                        right={dates(exp)}
                        rightStyle={{ ...fsize(12, 16), fontWeight: 700, color: tw.purple[600] }}
                      />
                      <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.purple[700], marginBottom: px(8) }}>
                        {exp.company}
                      </Text>
                      <Bullets
                        items={exp.bullets}
                        marker="disc-inside"
                        itemGapPx={4}
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
      </View>
    </Page>
  );
}

/* ═══ Creative 2 — black + orange geometric ═══════════════════ */

export function Creative2Pdf({ data: d }: { data: TemplateData }) {
  const Head = ({ children }: { children: string }) => (
    <View
      minPresenceAhead={40}
      style={{ flexDirection: "row", alignItems: "center", marginBottom: px(16) }}
    >
      <View style={{ flex: 1, height: px(1), backgroundColor: tw.orange[500], marginRight: px(12) }} />
      <Text
        style={{
          ...fsize(12, 16),
          fontWeight: 900,
          color: tw.orange[500],
          letterSpacing: track(0.1, 12),
        }}
      >
        {children.toUpperCase()}
      </Text>
    </View>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 900, color: tw.white },
    sub: { ...fsize(12, 16), fontWeight: 700, color: tw.orange[500] },
    meta: { ...fsize(12, 16), fontWeight: 700, color: tw.gray[400] },
    body: { ...fsize(12, 16), color: tw.gray[300] },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.black, color: tw.white }}>
      <View style={{ gap: px(24) }}>
        {/* Header with rotated square decoration */}
        <View
          style={{
            position: "relative",
            paddingBottom: px(24),
            borderBottomWidth: px(4),
            borderBottomColor: tw.orange[500],
          }}
        >
          <Diamond
            sizePx={64}
            color={tw.orange[500]}
            opacity={0.2}
            style={{ position: "absolute", top: px(-16), left: px(-16) }}
          />
          <Text
            style={{
              ...fsize(48, 48),
              fontWeight: 900,
              color: tw.white,
              letterSpacing: track(-0.025, 48),
              marginBottom: px(4),
            }}
          >
            {(d.contact.name || "YOUR NAME").toUpperCase()}
          </Text>
          <Text
            style={{
              ...fsize(18, 28),
              fontWeight: 700,
              color: tw.orange[500],
              letterSpacing: track(0.025, 18),
            }}
          >
            {(d.experience[0]?.title || "PROFESSIONAL TITLE").toUpperCase()}
          </Text>
          <Text style={{ ...fsize(12, 16), color: tw.gray[400], marginTop: px(8) }}>
            {joinPresent([d.contact.email, d.contact.phone, d.contact.location], " • ")}
          </Text>
        </View>

        <View style={{ gap: px(20) }}>
          {d.summary ? (
            <View
              style={{
                position: "relative",
                padding: px(16),
                borderLeftWidth: px(4),
                borderLeftColor: tw.orange[500],
              }}
            >
              <GradientFill
                id="c2about"
                stops={[
                  { offset: "0%", color: tw.orange[500], opacity: 0.2 },
                  { offset: "100%", color: tw.orange[500], opacity: 0 },
                ]}
              />
              <Text
                style={{
                  ...fsize(12, 16),
                  fontWeight: 900,
                  color: tw.orange[500],
                  letterSpacing: track(0.1, 12),
                  marginBottom: px(8),
                }}
              >
                ABOUT
              </Text>
              <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[300] }}>{d.summary}</Text>
            </View>
          ) : null}

          {d.experience.length > 0 && (
            <View>
              <Head>Experience</Head>
              <View style={{ gap: px(16) }}>
                {d.experience.map((exp) => (
                  <View
                    key={exp.id}
                    style={{
                      position: "relative",
                      paddingLeft: px(32),
                      paddingBottom: px(16),
                      borderLeftWidth: px(2),
                      borderLeftColor: tw.gray[700],
                    }}
                  >
                    <Diamond
                      sizePx={16}
                      color={tw.orange[500]}
                      style={{ position: "absolute", left: px(-8), top: 0 }}
                    />
                    <View
                      style={{
                        position: "relative",
                        padding: px(12),
                        borderRadius: px(4),
                        borderWidth: px(1),
                        borderColor: tw.gray[800],
                      }}
                    >
                      <Tint color={tw.gray[900]} opacity={0.5} radius={4} />
                      <BetweenRow
                        style={{ marginBottom: px(8) }}
                        left={
                          <View>
                            <Text style={{ ...fsize(14, 20), fontWeight: 900, color: tw.white }}>{exp.title}</Text>
                            <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.orange[500] }}>
                              {exp.company}
                            </Text>
                          </View>
                        }
                        right={dates(exp)}
                        rightStyle={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[400] }}
                      />
                      <Bullets
                        items={exp.bullets}
                        marker="triangle"
                        markerColor={tw.orange[500]}
                        itemGapPx={4}
                        gutterPx={14}
                        textStyle={{ ...fsize(12, 16), color: tw.gray[300] }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {d.skills.length > 0 && (
            <View>
              <Head>Skills</Head>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(8) }}>
                {d.skills.slice(0, 9).map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      width: (px(730) - px(16)) / 3,
                      backgroundColor: tw.gray[900],
                      borderWidth: px(1),
                      borderColor: flatten(tw.orange[500], 0.3, tw.black),
                      padding: px(8),
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.white }}>{skill}</Text>
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

/* ═══ Creative 3 — violet/fuchsia glass cards ═════════════════ */

export function Creative3Pdf({ data: d }: { data: TemplateData }) {
  const glassCard: Style = {
    position: "relative",
    borderRadius: px(12),
    borderWidth: px(1),
    borderColor: tw.violet[100],
    padding: px(16),
  };
  const headStyle: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.violet[600],
    letterSpacing: track(0.1, 12),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={headStyle}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), color: tw.fuchsia[600] },
    meta: { ...fsize(10), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: mix(tw.violet[100], tw.fuchsia[100]), color: tw.violet[700], radius: 999 },
  };
  const contactBits = [d.contact.email, d.contact.phone, d.contact.location].filter(Boolean);

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32) }}>
      <FixedGradient
        id="c3bg"
        direction="to-br"
        stops={[
          { offset: "0%", color: tw.violet[50] },
          { offset: "100%", color: tw.fuchsia[50] },
        ]}
      />
      <View style={{ gap: px(20) }}>
        {/* Gradient-tinted header */}
        <View style={{ position: "relative", borderRadius: px(12), overflow: "hidden" }}>
          <GradientFill
            id="c3head"
            stops={[
              { offset: "0%", color: tw.violet[500], opacity: 0.1 },
              { offset: "100%", color: tw.fuchsia[500], opacity: 0.1 },
            ]}
          />
          <View style={{ padding: px(20), alignItems: "center" }}>
            <GradientText
              id="c3name"
              text={d.contact.name || "Your Name"}
              stops={[
                { offset: "0%", color: tw.violet[600] },
                { offset: "100%", color: tw.fuchsia[600] },
              ]}
              fontSizePx={30}
              heightPx={36}
              widthPx={650}
              fontWeight={800}
              align="center"
            />
            <View style={{ flexDirection: "row", justifyContent: "center", gap: px(12), marginTop: px(8) }}>
              {contactBits.map((v, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: px(12) }}>
                  {i > 0 && <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>•</Text>}
                  <Text style={{ ...fsize(12, 16), color: tw.gray[600] }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {d.summary ? (
          <View style={glassCard}>
            <Tint color={tw.white} opacity={0.6} radius={12} />
            <Text style={headStyle}>✨ ABOUT ME</Text>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...headStyle, marginBottom: px(12) }}>💼 EXPERIENCE</Text>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} style={glassCard}>
                  <Tint color={tw.white} opacity={0.6} radius={12} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: px(8) }}>
                      <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                      <Text style={{ ...fsize(12, 16), color: tw.fuchsia[600] }}>{exp.company}</Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: tw.violet[100],
                        paddingHorizontal: px(8),
                        paddingVertical: px(2),
                        borderRadius: px(999),
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ ...fsize(10), color: tw.gray[500] }}>{dates(exp)}</Text>
                    </View>
                  </View>
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(16) }}>
          {d.education.length > 0 && (
            <View style={{ ...glassCard, flex: 1 }}>
              <Tint color={tw.white} opacity={0.6} radius={12} />
              <Text style={headStyle}>🎓 EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.fuchsia[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ ...glassCard, flex: 1 }}>
              <Tint color={tw.white} opacity={0.6} radius={12} />
              <Text style={headStyle}>⚡ SKILLS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: mix(tw.violet[100], tw.fuchsia[100]),
                      borderRadius: px(999),
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.violet[700] }}>{skill}</Text>
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

/* ═══ Creative 4 — retro amber, badge headings ════════════════ */

export function Creative4Pdf({ data: d }: { data: TemplateData }) {
  const Badge = ({ sizePx, color, starPx }: { sizePx: number; color: string; starPx: number }) => (
    <View
      style={{
        width: px(sizePx),
        height: px(sizePx),
        backgroundColor: color,
        borderRadius: px(4),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconStar4 sizePx={starPx} color={tw.white} />
    </View>
  );
  const Head = ({ children }: { children: string }) => (
    <View
      minPresenceAhead={40}
      style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(12) }}
    >
      <Badge sizePx={24} color={tw.amber[500]} starPx={11} />
      <Text style={{ ...fsize(14, 20), fontWeight: 900, color: tw.amber[700] }}>{children.toUpperCase()}</Text>
    </View>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontWeight: 600, color: tw.orange[600] },
    meta: { ...fsize(10), fontWeight: 500, color: tw.amber[700] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: mix(tw.amber[200], tw.orange[200]), color: tw.amber[800], radius: 4 },
  };
  const card: Style = {
    position: "relative",
    borderRadius: px(8),
    borderWidth: px(1),
    borderColor: tw.amber[200],
    padding: px(16),
  };
  const contactBits = [
    d.contact.email ? ([d.contact.email, tw.amber[400]] as const) : null,
    d.contact.phone ? ([d.contact.phone, tw.orange[400]] as const) : null,
    d.contact.location ? ([d.contact.location, tw.red[400]] as const) : null,
  ].filter(Boolean) as ReadonlyArray<readonly [string, string]>;

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), backgroundColor: tw.amber[50] }}>
      <View style={{ gap: px(20) }}>
        {/* Retro header with gradient top strip */}
        <View style={{ position: "relative", paddingBottom: px(16) }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: px(4) }}>
            <GradientFill
              id="c4strip"
              stops={[
                { offset: "0%", color: tw.amber[400] },
                { offset: "50%", color: tw.orange[500] },
                { offset: "100%", color: tw.red[500] },
              ]}
            />
          </View>
          <View style={{ paddingTop: px(20) }}>
            <Text
              style={{ ...fsize(30, 36), fontWeight: 900, letterSpacing: track(-0.025, 30), color: tw.gray[900] }}
            >
              {d.contact.name || "Your Name"}
            </Text>
            <View style={{ flexDirection: "row", gap: px(12), marginTop: px(8) }}>
              {contactBits.map(([value, borderColor], i) => (
                <View key={i} style={{ borderBottomWidth: px(1), borderBottomColor: borderColor }}>
                  <Text style={{ ...fsize(12, 16), color: tw.amber[800] }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {d.summary ? (
          <View
            style={{
              position: "relative",
              borderLeftWidth: px(4),
              borderLeftColor: tw.amber[500],
              paddingLeft: px(16),
              paddingVertical: px(8),
            }}
          >
            <Tint color={tw.white} opacity={0.5} />
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700], fontStyle: "italic" }}>
              {d.summary}
            </Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Head>Work Experience</Head>
            <View style={{ gap: px(16) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} style={card}>
                  <Tint color={tw.white} opacity={0.7} radius={8} />
                  <BetweenRow
                    left={
                      <View>
                        <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.orange[600] }}>{exp.company}</Text>
                      </View>
                    }
                    right={dates(exp, " → ")}
                    rightStyle={{ ...fsize(10), fontWeight: 500, color: tw.amber[700] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(16) }}>
          {d.education.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Tint color={tw.white} opacity={0.7} radius={8} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(8) }}>
                <Badge sizePx={16} color={tw.orange[500]} starPx={8} />
                <Text style={{ ...fsize(12, 16), fontWeight: 900, color: tw.amber[700] }}>EDUCATION</Text>
              </View>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.amber[600] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Tint color={tw.white} opacity={0.7} radius={8} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(8) }}>
                <Badge sizePx={16} color={tw.red[500]} starPx={8} />
                <Text style={{ ...fsize(12, 16), fontWeight: 900, color: tw.amber[700] }}>SKILLS</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: mix(tw.amber[200], tw.orange[200]),
                      borderRadius: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(10), fontWeight: 500, color: tw.amber[800] }}>{skill}</Text>
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

/* ═══ Creative 5 — dark neon cyan ═════════════════════════════ */

export function Creative5Pdf({ data: d }: { data: TemplateData }) {
  const darkMid = mix(tw.blue[900], tw.indigo[900]);
  const cardBorder = flatten(tw.cyan[500], 0.2, darkMid);
  const card: Style = {
    position: "relative",
    borderRadius: px(8),
    borderWidth: px(1),
    borderColor: cardBorder,
    padding: px(16),
  };
  const headStyle: Style = {
    ...fsize(12, 16),
    fontWeight: 700,
    color: tw.cyan[400],
    letterSpacing: track(0.1, 12),
    marginBottom: px(8),
  };
  const Head = ({ children }: { children: string }) => (
    <Text minPresenceAhead={40} style={headStyle}>
      {children.toUpperCase()}
    </Text>
  );
  const extras: ExtrasTheme = {
    Head,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.white },
    sub: { ...fsize(12, 16), color: tw.cyan[400] },
    meta: { ...fsize(10), color: tw.blue[300] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[300] },
    chip: {
      bg: flatten(tw.cyan[500], 0.2, darkMid),
      color: tw.cyan[300],
      borderColor: flatten(tw.cyan[500], 0.3, darkMid),
      radius: 4,
    },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, padding: px(32), color: tw.white }}>
      <FixedGradient
        id="c5bg"
        direction="to-br"
        stops={[
          { offset: "0%", color: tw.cyan[900] },
          { offset: "50%", color: tw.blue[900] },
          { offset: "100%", color: tw.indigo[900] },
        ]}
      />
      <View style={{ gap: px(20) }}>
        {/* Neon header */}
        <View
          style={{
            alignItems: "center",
            paddingBottom: px(16),
            borderBottomWidth: px(1),
            borderBottomColor: flatten(tw.cyan[500], 0.3, tw.cyan[900]),
          }}
        >
          <GradientText
            id="c5name"
            text={d.contact.name || "Your Name"}
            stops={[
              { offset: "0%", color: tw.cyan[400] },
              { offset: "100%", color: tw.blue[400] },
            ]}
            fontSizePx={30}
            heightPx={36}
            widthPx={730}
            fontWeight={700}
            align="center"
          />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: px(16), marginTop: px(8) }}>
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ ...fsize(12, 16), color: tw.cyan[300] }}>
                {v}
              </Text>
            ))}
          </View>
        </View>

        {d.summary ? (
          <View style={card}>
            <Tint color={tw.white} opacity={0.05} radius={8} />
            <Text style={headStyle}>PROFILE</Text>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[300] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <Text style={{ ...headStyle, marginBottom: px(12) }}>EXPERIENCE</Text>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} style={card}>
                  <Tint color={tw.white} opacity={0.05} radius={8} />
                  <BetweenRow
                    left={
                      <View>
                        <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.white }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), color: tw.cyan[400] }}>{exp.company}</Text>
                      </View>
                    }
                    right={dates(exp)}
                    rightStyle={{ ...fsize(10), color: tw.blue[300] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[300] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(16) }}>
          {d.education.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Tint color={tw.white} opacity={0.05} radius={8} />
              <Text style={headStyle}>EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.white }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[400] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.cyan[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ ...card, flex: 1 }}>
              <Tint color={tw.white} opacity={0.05} radius={8} />
              <Text style={headStyle}>SKILLS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: flatten(tw.cyan[500], 0.2, darkMid),
                      borderWidth: px(1),
                      borderColor: flatten(tw.cyan[500], 0.3, darkMid),
                      borderRadius: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.cyan[300] }}>{skill}</Text>
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

/* ═══ Creative 6 — green sidebar with avatar + skill bars ═════ */

export function Creative6Pdf({ data: d }: { data: TemplateData }) {
  const SIDEBAR_W = 794 / 3;
  const sideHead: Style = {
    ...fsize(10),
    fontWeight: 600,
    color: tw.green[200],
    letterSpacing: track(0.1, 10),
    marginBottom: px(8),
  };
  const mainHead: Style = {
    ...fsize(14, 20),
    fontWeight: 700,
    color: tw.green[700],
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
    sub: { ...fsize(12, 16), color: tw.green[600] },
    meta: { ...fsize(10), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
  };
  const initials = (d.contact.name || "YN")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const whiteCard: Style = { backgroundColor: tw.white, borderRadius: px(8), padding: px(16) };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(20), paddingBottom: px(20), backgroundColor: tw.stone[100] }}>
      <View fixed style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: px(SIDEBAR_W) }}>
        <GradientFill
          id="c6side"
          direction="to-b"
          stops={[
            { offset: "0%", color: tw.green[600] },
            { offset: "100%", color: tw.emerald[700] },
          ]}
        />
      </View>

      <View style={{ flexDirection: "row" }}>
        {/* Sidebar */}
        <View style={{ width: px(SIDEBAR_W), paddingHorizontal: px(20) }}>
          <View
            style={{
              width: px(64),
              height: px(64),
              borderRadius: px(32),
              backgroundColor: flatten(tw.white, 0.2, tw.green[600]),
              alignItems: "center",
              justifyContent: "center",
              marginBottom: px(16),
            }}
          >
            <Text style={{ ...fsize(20, 28), fontWeight: 700, color: tw.white }}>{initials}</Text>
          </View>

          <Text style={{ ...fsize(18, 22.5), fontWeight: 700, color: tw.white, marginBottom: px(16) }}>
            {d.contact.name || "Your Name"}
          </Text>

          <View style={{ gap: px(8), marginBottom: px(24) }}>
            {[
              d.contact.email ? `📧 ${d.contact.email}` : null,
              d.contact.phone ? `📱 ${d.contact.phone}` : null,
              d.contact.location ? `📍 ${d.contact.location}` : null,
            ]
              .filter(Boolean)
              .map((v, i) => (
                <Text key={i} style={{ ...fsize(12, 16), color: tw.green[100] }}>
                  {v}
                </Text>
              ))}
          </View>

          {d.skills.length > 0 && (
            <View>
              <Text style={sideHead}>SKILLS</Text>
              <View style={{ gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                    <View
                      style={{
                        flex: 1,
                        height: px(6),
                        backgroundColor: tw.green[800],
                        borderRadius: px(3),
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${85 - i * 5}%`,
                          height: px(6),
                          backgroundColor: tw.green[300],
                          borderRadius: px(3),
                        }}
                      />
                    </View>
                    <Text
                      maxLines={1}
                      style={{ ...fsize(9), color: tw.green[200], width: px(64) }}
                    >
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {d.education.length > 0 && (
            <View style={{ marginTop: px(24) }}>
              <Text style={sideHead}>EDUCATION</Text>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(12) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 600, color: tw.white }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.green[200] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.green[300] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main */}
        <View style={{ flex: 1, paddingLeft: px(24), paddingRight: px(24), paddingTop: px(4), gap: px(20) }}>
          {d.summary ? (
            <View style={whiteCard}>
              <Text style={mainHead}>ABOUT ME</Text>
              <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
            </View>
          ) : null}

          {d.experience.length > 0 && (
            <View>
              <Head>Work Experience</Head>
              <View style={{ gap: px(12) }}>
                {d.experience.map((exp) => (
                  <View key={exp.id} style={whiteCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, paddingRight: px(8) }}>
                        <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), color: tw.green[600] }}>{exp.company}</Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: tw.green[50],
                          paddingHorizontal: px(8),
                          paddingVertical: px(2),
                          borderRadius: px(4),
                          flexShrink: 0,
                        }}
                      >
                        <Text style={{ ...fsize(10), color: tw.gray[500] }}>{dates(exp)}</Text>
                      </View>
                    </View>
                    <Bullets
                      items={exp.bullets}
                      marker="disc-outside"
                      itemGapPx={2}
                      style={{ marginTop: px(8) }}
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

/* ═══ Creative 7 — sunset banner with notch ═══════════════════ */

export function Creative7Pdf({ data: d }: { data: TemplateData }) {
  const PAD = 28;
  const DashHead = ({ children }: { children: string }) => (
    <View
      minPresenceAhead={40}
      style={{ flexDirection: "row", alignItems: "center", gap: px(8), marginBottom: px(12) }}
    >
      <View style={{ width: px(24), height: px(2), position: "relative" }}>
        <GradientFill
          id={`c7dash-${children.replace(/[^a-zA-Z0-9]/g, "")}`}
          stops={[
            { offset: "0%", color: tw.pink[500] },
            { offset: "100%", color: tw.yellow[500] },
          ]}
        />
      </View>
      <Text
        style={{ ...fsize(12, 16), fontWeight: 700, color: tw.pink[600], letterSpacing: track(0.1, 12) }}
      >
        {children.toUpperCase()}
      </Text>
    </View>
  );
  const extras: ExtrasTheme = {
    Head: DashHead,
    gapPx: 20,
    title: { ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] },
    sub: { ...fsize(12, 16), fontWeight: 500, color: tw.red[600] },
    meta: { ...fsize(10), color: tw.gray[500] },
    body: { ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] },
    chip: { bg: tw.white, color: tw.orange[700], borderColor: tw.orange[200], radius: 4 },
  };

  return (
    <Page size={PAGE_SIZE} style={{ ...base, paddingTop: px(PAD), paddingBottom: px(PAD), backgroundColor: tw.white }}>
      {/* Full-bleed sunset banner */}
      <View style={{ marginTop: -px(PAD), height: px(96), position: "relative" }}>
        <GradientFill
          id="c7banner"
          stops={[
            { offset: "0%", color: tw.pink[500] },
            { offset: "50%", color: tw.red[500] },
            { offset: "100%", color: tw.yellow[500] },
          ]}
        />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: px(16), justifyContent: "center" }}>
          <Text
            style={{
              ...fsize(24, 32),
              fontWeight: 900,
              color: tw.white,
              letterSpacing: track(0.025, 24),
              textAlign: "center",
            }}
          >
            {(d.contact.name || "YOUR NAME").toUpperCase()}
          </Text>
          <Text style={{ ...fsize(12, 16), color: flatten(tw.white, 0.9, tw.red[500]), textAlign: "center", marginTop: px(4) }}>
            {joinPresent([d.contact.email, d.contact.phone], "  |  ")}
          </Text>
        </View>
        {/* White diagonal notch */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: px(16) }}>
          <Svg width="100%" height="100%" viewBox="0 0 794 16" preserveAspectRatio="none">
            <Polygon points="0,16 794,16 794,0" fill={tw.white} />
          </Svg>
        </View>
      </View>

      <View style={{ paddingHorizontal: px(32), paddingTop: px(16), gap: px(20) }}>
        {d.summary ? (
          <View style={{ position: "relative", paddingLeft: px(16) }}>
            <View
              style={{
                position: "absolute",
                left: px(-8),
                top: 0,
                bottom: 0,
                width: px(4),
                borderRadius: px(2),
                overflow: "hidden",
              }}
            >
              <GradientFill
                id="c7sumbar"
                direction="to-b"
                stops={[
                  { offset: "0%", color: tw.pink[500] },
                  { offset: "100%", color: tw.yellow[500] },
                ]}
              />
            </View>
            <Text
              style={{
                ...fsize(12, 16),
                fontWeight: 700,
                color: tw.pink[600],
                letterSpacing: track(0.1, 12),
                marginBottom: px(4),
              }}
            >
              PROFILE
            </Text>
            <Text style={{ ...fsize(12, 16), lineHeight: 1.625, color: tw.gray[700] }}>{d.summary}</Text>
          </View>
        ) : null}

        {d.experience.length > 0 && (
          <View>
            <DashHead>Experience</DashHead>
            <View style={{ gap: px(12) }}>
              {d.experience.map((exp) => (
                <View key={exp.id} style={{ position: "relative", borderRadius: px(8), overflow: "hidden", padding: px(16) }}>
                  <GradientFill
                    id={`c7xp${exp.id}`}
                    stops={[
                      { offset: "0%", color: tw.pink[50] },
                      { offset: "100%", color: tw.yellow[50] },
                    ]}
                  />
                  <BetweenRow
                    left={
                      <View>
                        <Text style={{ ...fsize(14, 20), fontWeight: 700, color: tw.gray[900] }}>{exp.title}</Text>
                        <Text style={{ ...fsize(12, 16), fontWeight: 500, color: tw.red[600] }}>{exp.company}</Text>
                      </View>
                    }
                    right={dates(exp)}
                    rightStyle={{ ...fsize(10), color: tw.gray[500] }}
                  />
                  <Bullets
                    items={exp.bullets}
                    marker="disc-outside"
                    itemGapPx={2}
                    style={{ marginTop: px(8) }}
                    textStyle={{ ...fsize(12, 16), color: tw.gray[700] }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: px(16) }}>
          {d.education.length > 0 && (
            <View style={{ flex: 1, position: "relative", borderRadius: px(8), overflow: "hidden", padding: px(16) }}>
              <GradientFill
                id="c7edu"
                direction="to-br"
                stops={[
                  { offset: "0%", color: tw.pink[50] },
                  { offset: "100%", color: tw.red[50] },
                ]}
              />
              <Text
                style={{
                  ...fsize(12, 16),
                  fontWeight: 700,
                  color: tw.pink[600],
                  letterSpacing: track(0.1, 12),
                  marginBottom: px(8),
                }}
              >
                EDUCATION
              </Text>
              {d.education.map((edu) => (
                <View key={edu.id} style={{ marginBottom: px(8) }}>
                  <Text style={{ ...fsize(12, 16), fontWeight: 700, color: tw.gray[900] }}>{edu.degree}</Text>
                  <Text style={{ ...fsize(10), color: tw.gray[600] }}>{edu.school}</Text>
                  <Text style={{ ...fsize(10), color: tw.red[500] }}>{edu.graduationDate}</Text>
                </View>
              ))}
            </View>
          )}

          {d.skills.length > 0 && (
            <View style={{ flex: 1, position: "relative", borderRadius: px(8), overflow: "hidden", padding: px(16) }}>
              <GradientFill
                id="c7skills"
                direction="to-br"
                stops={[
                  { offset: "0%", color: tw.yellow[50] },
                  { offset: "100%", color: tw.orange[50] },
                ]}
              />
              <Text
                style={{
                  ...fsize(12, 16),
                  fontWeight: 700,
                  color: tw.orange[600],
                  letterSpacing: track(0.1, 12),
                  marginBottom: px(8),
                }}
              >
                SKILLS
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6) }}>
                {d.skills.map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      paddingHorizontal: px(8),
                      paddingVertical: px(2),
                      backgroundColor: tw.white,
                      borderWidth: px(1),
                      borderColor: tw.orange[200],
                      borderRadius: px(4),
                    }}
                  >
                    <Text style={{ ...fsize(10), color: tw.orange[700] }}>{skill}</Text>
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
