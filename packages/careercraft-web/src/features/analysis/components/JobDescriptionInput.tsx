interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const JobDescriptionInput = ({
  value,
  onChange,
}: JobDescriptionInputProps) => (
  <section className="cc-card p-7 md:p-8">
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · The brief</div>
        <h3 className="mt-3 cc-font-display text-2xl leading-tight">
          The <span className="cc-italic-wonk">posting</span> to match.
        </h3>
      </div>
      {value && <span className="cc-pill cc-pill-filled">Set</span>}
    </div>

    <textarea
      placeholder="Paste the full job description — requirements, responsibilities, all of it."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cc-textarea w-full min-h-[280px]"
    />
  </section>
);
