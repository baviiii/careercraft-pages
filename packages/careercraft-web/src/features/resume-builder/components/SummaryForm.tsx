import { CraftSection, CraftTextarea, LabelledField } from "./FormField";

interface SummaryFormProps {
  summary: string;
  onChange: (value: string) => void;
}

export const SummaryForm = ({ summary, onChange }: SummaryFormProps) => {
  const words = summary.split(/\s+/).filter(Boolean).length;

  return (
    <CraftSection
      kicker="§ Summary"
      title={
        <>
          The <span className="cc-italic-wonk">opening</span> line.
        </>
      }
      sub="Two or three sentences — the headline before the lede."
    >
      <LabelledField
        label="Professional summary"
        hint={
          <span className="cc-tabular">
            {words} word{words === 1 ? "" : "s"} · aim for 50–150
          </span>
        }
      >
        <CraftTextarea
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          placeholder="A brief note on your background, the work you're proudest of, and the direction you're heading…"
          className="min-h-[200px]"
        />
      </LabelledField>
    </CraftSection>
  );
};
