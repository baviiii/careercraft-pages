import { CraftSection, CraftTextarea, LabelledField } from "./FormField";

interface SummaryFormProps {
  summary: string;
  onChange: (value: string) => void;
}

export const SummaryForm = ({ summary, onChange }: SummaryFormProps) => {
  const words = summary.split(/\s+/).filter(Boolean).length;

  return (
    <CraftSection
      title="Summary"
      sub="Two or three sentences on who you are and what you're after."
    >
      <LabelledField
        label="Your summary"
        hint={
          <span className="cc-tabular">
            {words} word{words === 1 ? "" : "s"} · 50 to 150 reads well
          </span>
        }
      >
        <CraftTextarea
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Data analyst with two years in health reporting. I turn messy data into clear dashboards, and I'm looking for a role in a public-sector team."
          className="min-h-[200px]"
        />
      </LabelledField>
    </CraftSection>
  );
};
