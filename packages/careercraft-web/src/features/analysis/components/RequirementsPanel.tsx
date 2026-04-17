import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface RequirementsPanelProps {
  analysis: ATSAIAnalysis;
}

export const RequirementsPanel = ({ analysis }: RequirementsPanelProps) => {
  const r = analysis.jobRequirements;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Block
        kicker="§ Mandatory"
        title="Must-have skills"
        items={r.mandatorySkills}
        emphasis="rust"
      />
      <Block
        kicker="§ Preferred"
        title="Nice-to-have"
        items={r.preferredSkills}
      />
      <Block
        kicker="§ Technical"
        title="Technical keywords"
        items={r.technicalKeywords}
      />
      <Block
        kicker="§ Soft"
        title="Soft skills"
        items={r.softSkills}
      />
      <Block
        kicker="§ Tools"
        title="Tools & tech"
        items={r.tools}
      />
      <section className="cc-card p-6">
        <div className="cc-label text-[color:var(--cc-rust)]">§ Tenure</div>
        <h4 className="mt-2 cc-font-display text-xl leading-tight">
          Required <span className="cc-italic-wonk">experience</span>
        </h4>
        <p className="mt-4 cc-font-editorial italic text-[color:var(--cc-ink-soft)] text-[17px] leading-relaxed">
          {r.requiredExperience || "—"}
        </p>
      </section>
      {r.certifications && r.certifications.length > 0 && (
        <Block
          kicker="§ Papers"
          title="Certifications"
          items={r.certifications}
        />
      )}
    </div>
  );
};

const Block = ({
  kicker,
  title,
  items,
  emphasis,
}: {
  kicker: string;
  title: string;
  items: string[];
  emphasis?: "rust";
}) => (
  <section className="cc-card p-6">
    <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
    <h4 className="mt-2 cc-font-display text-xl leading-tight">{title}</h4>
    <div className="mt-4 flex flex-wrap gap-1.5">
      {items.length === 0 ? (
        <span className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          —
        </span>
      ) : (
        items.map((item, i) => (
          <span
            key={i}
            className={`cc-pill ${
              emphasis === "rust" ? "cc-pill-rust" : ""
            }`}
          >
            {item}
          </span>
        ))
      )}
    </div>
  </section>
);
