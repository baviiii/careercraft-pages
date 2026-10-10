import { Ready } from "./proof";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const JobDescriptionInput = ({
  value,
  onChange,
}: JobDescriptionInputProps) => (
  <section className="cc-surface p-6 md:p-8">
    <div className="flex items-center justify-between gap-4 mb-6">
      <h3 className="cc-font-display text-[22px] leading-tight text-[color:var(--cc-ink)]">
        Job description
      </h3>
      {value.trim() && <Ready>Added</Ready>}
    </div>

    <textarea
      placeholder="Paste the full job ad — requirements, responsibilities, all of it."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Job description"
      className="cc-textarea w-full min-h-[280px]"
    />
  </section>
);
