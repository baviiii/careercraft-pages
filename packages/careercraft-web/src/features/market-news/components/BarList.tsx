import type { ReactNode } from "react";

export interface BarRow {
  label: string;
  value: number;
  /** Shown after the label, e.g. "in your tracker". */
  tag?: ReactNode;
  /** The one row the text above is about; its bar is drawn darker. */
  marked?: boolean;
}

/**
 * A ranked list with a bar per row. Every value is printed at the bar's tip,
 * so nothing has to be hovered to be read; the row's title repeats it for a
 * pointer. One series, so one colour and no legend.
 */
export const BarList = ({
  rows,
  format,
  label,
}: {
  rows: BarRow[];
  format: (n: number) => string;
  /** What the list is, for screen readers. */
  label: string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="cc-bars" aria-label={label}>
      {rows.map((r) => (
        <li key={r.label} className="cc-bars__row" title={`${r.label}: ${format(r.value)}`}>
          <span className="cc-bars__label">
            <span className="truncate">{r.label}</span>
            {r.tag}
          </span>
          <span className="cc-bars__track">
            <span
              className={`cc-bars__bar ${r.marked ? "is-marked" : ""}`}
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="cc-bars__value cc-tabular">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
};
