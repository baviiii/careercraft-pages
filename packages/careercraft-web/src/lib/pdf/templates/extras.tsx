/* ───────────────────────────────────────────────────────────────
   Optional resume sections (projects, certifications, awards,
   publications, volunteer, languages, references).

   The on-screen templates only show the five core sections; these
   extras are appended to the export so user-entered data is never
   silently dropped. Each template passes an ExtrasTheme so the
   extra sections inherit its exact typography and colours.
   ─────────────────────────────────────────────────────────────── */

import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ComponentType } from "react";

import type { TemplateData } from "@/components/templates/types";

import { BetweenRow, joinPresent, px } from "../primitives";

export interface ExtrasTheme {
  /** Section heading rendered in the template's own style. */
  Head: ComponentType<{ children: string }>;
  /** Vertical gap between extra sections (CSS px, matches the template). */
  gapPx: number;
  title: Style;
  sub: Style;
  meta: Style;
  body: Style;
  chip?: { bg: string; color: string; borderColor?: string; radius: number };
}

export function ExtraSections({ data, t }: { data: TemplateData; t: ExtrasTheme }) {
  const blocks: JSX.Element[] = [];
  const { Head } = t;

  if (data.projects?.length) {
    blocks.push(
      <View key="projects">
        <Head>Projects</Head>
        <View style={{ gap: px(8) }}>
          {data.projects.map((p) => (
            <View key={p.id}>
              <Text style={t.title}>{p.name}</Text>
              {p.description ? <Text style={t.body}>{p.description}</Text> : null}
              {p.technologies.length > 0 && (
                t.chip ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6), marginTop: px(4) }}>
                    {p.technologies.map((tech, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: t.chip!.bg,
                          borderRadius: px(t.chip!.radius),
                          paddingHorizontal: px(8),
                          paddingVertical: px(2),
                          ...(t.chip!.borderColor
                            ? { borderWidth: px(1), borderColor: t.chip!.borderColor }
                            : {}),
                        }}
                      >
                        <Text style={[t.meta, { color: t.chip!.color }]}>{tech}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={t.sub}>{p.technologies.join(" · ")}</Text>
                )
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (data.certifications?.length) {
    blocks.push(
      <View key="certifications">
        <Head>Certifications</Head>
        <View style={{ gap: px(6) }}>
          {data.certifications.map((c) => (
            <BetweenRow
              key={c.id}
              left={
                <View>
                  <Text style={t.title}>{c.name}</Text>
                  {c.issuer ? <Text style={t.sub}>{c.issuer}</Text> : null}
                </View>
              }
              right={c.date}
              rightStyle={t.meta}
            />
          ))}
        </View>
      </View>
    );
  }

  if (data.awards?.length) {
    blocks.push(
      <View key="awards">
        <Head>Awards</Head>
        <View style={{ gap: px(6) }}>
          {data.awards.map((a) => (
            <BetweenRow
              key={a.id}
              left={
                <View>
                  <Text style={t.title}>{a.title}</Text>
                  {a.issuer ? <Text style={t.sub}>{a.issuer}</Text> : null}
                  {a.description ? <Text style={t.body}>{a.description}</Text> : null}
                </View>
              }
              right={a.date}
              rightStyle={t.meta}
            />
          ))}
        </View>
      </View>
    );
  }

  if (data.publications?.length) {
    blocks.push(
      <View key="publications">
        <Head>Publications</Head>
        <View style={{ gap: px(6) }}>
          {data.publications.map((p) => (
            <View key={p.id}>
              <Text style={t.title}>{p.title}</Text>
              {(p.publisher || p.date) && (
                <Text style={t.sub}>{joinPresent([p.publisher, p.date], " · ")}</Text>
              )}
              {p.description ? <Text style={t.body}>{p.description}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (data.volunteer?.length) {
    blocks.push(
      <View key="volunteer">
        <Head>Volunteer</Head>
        <View style={{ gap: px(6) }}>
          {data.volunteer.map((v) => (
            <View key={v.id}>
              <BetweenRow
                left={
                  <View>
                    <Text style={t.title}>{v.role}</Text>
                    <Text style={t.sub}>{joinPresent([v.organization, v.location], ", ")}</Text>
                  </View>
                }
                right={joinPresent([v.startDate, v.current ? "Present" : v.endDate], " – ")}
                rightStyle={t.meta}
              />
              {v.description ? <Text style={t.body}>{v.description}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (data.languages?.length) {
    blocks.push(
      <View key="languages">
        <Head>Languages</Head>
        <Text style={t.body}>
          {data.languages.map((l) => `${l.language} (${l.proficiency})`).join("  ·  ")}
        </Text>
      </View>
    );
  }

  if (data.references?.length) {
    blocks.push(
      <View key="references">
        <Head>References</Head>
        <View style={{ gap: px(6) }}>
          {data.references.map((r) => (
            <View key={r.id}>
              <Text style={t.title}>{r.name}</Text>
              {(r.title || r.company) && (
                <Text style={t.sub}>{joinPresent([r.title, r.company], " · ")}</Text>
              )}
              {(r.email || r.phone) && (
                <Text style={t.sub}>{joinPresent([r.email, r.phone], " · ")}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (blocks.length === 0) return null;
  return <View style={{ gap: px(t.gapPx) }}>{blocks}</View>;
}
