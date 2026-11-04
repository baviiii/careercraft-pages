// The list prices that turn tokens into an estimated dollar figure.
//
// Each ledger row is priced by the longest pattern that matches its model, so
// a specific row ("gpt-4o-mini%") beats a general one ("gpt-4o%"), and "%"
// prices anything nothing else claims. Edits apply to every view at once —
// costs are computed when read, not stored.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  addModelPrice,
  deleteModelPrice,
  fetchModelPrices,
  updateModelPrice,
  type ModelPrice,
} from '@/lib/aiUsage';
import { formatDay } from './usageHelpers';

/** Saves on blur or Enter, like the limit cells on Plans & Limits. */
function EditCell({
  value,
  onSave,
  numeric,
  className = '',
}: {
  value: string;
  onSave: (next: string) => void;
  numeric?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      value={draft ?? value}
      inputMode={numeric ? 'decimal' : undefined}
      className={`h-8 text-sm ${className}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const next = draft.trim();
        setDraft(null);
        if (next !== value) onSave(next);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

/**
 * A blank box is "no price", not $0 — Number('') is 0, and a model saved at
 * 0/0 would make every call to it look free.
 */
function parsePrice(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, '');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ModelPricesEditor({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ label: '', pattern: '', input: '', output: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchModelPrices());
    } catch (err) {
      console.error('Error loading prices:', err);
      toast.error('Failed to load model prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (pattern: string, patch: Parameters<typeof updateModelPrice>[1]) => {
    try {
      await updateModelPrice(pattern, patch);
      toast.success('Price updated');
      await load();
      onChanged?.();
    } catch (err) {
      console.error('Error saving price:', err);
      toast.error('Failed to save price');
    }
  };

  const add = async () => {
    const input = parsePrice(draft.input);
    const output = parsePrice(draft.output);
    if (!draft.label.trim() || !draft.pattern.trim() || input === null || output === null) {
      toast.error('Give the price a name, a model pattern, and both rates');
      return;
    }
    try {
      await addModelPrice({
        label: draft.label.trim(),
        pattern: draft.pattern.trim(),
        input_usd_per_mtok: input,
        output_usd_per_mtok: output,
        notes: null,
      });
      setDraft({ label: '', pattern: '', input: '', output: '' });
      toast.success('Price added');
      await load();
      onChanged?.();
    } catch (err) {
      console.error('Error adding price:', err);
      toast.error('Failed to add price. Is that pattern already listed?');
    }
  };

  const remove = async (pattern: string) => {
    try {
      await deleteModelPrice(pattern);
      toast.success('Price removed');
      await load();
      onChanged?.();
    } catch (err) {
      console.error('Error removing price:', err);
      toast.error('Failed to remove price');
    }
  };

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Costs on these screens are estimates: tokens × these rates. They start at
        list prices, but Bedrock and Azure bill on their own price sheets, so set
        them from a real invoice. A model is priced by the longest pattern that
        matches it (<code>%</code> matches anything). Changes apply to past
        calls too, because costs are worked out when you look, not stored.
      </p>

      <div className="usage-scroll rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead>Name</TableHead>
              <TableHead>Model pattern</TableHead>
              <TableHead className="text-right">US$ per 1M input</TableHead>
              <TableHead className="text-right">US$ per 1M output</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.pattern} className="border-border/50">
                <TableCell>
                  <EditCell value={r.label} className="w-44" onSave={(v) => v && save(r.pattern, { label: v })} />
                </TableCell>
                <TableCell>
                  <code className="text-xs">{r.pattern}</code>
                </TableCell>
                <TableCell className="text-right">
                  <EditCell
                    numeric
                    className="ml-auto w-24 text-right"
                    value={String(r.input_usd_per_mtok)}
                    onSave={(v) => {
                      const n = parsePrice(v);
                      if (n === null) return toast.error('Enter a price like 3.00');
                      void save(r.pattern, { input_usd_per_mtok: n });
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <EditCell
                    numeric
                    className="ml-auto w-24 text-right"
                    value={String(r.output_usd_per_mtok)}
                    onSave={(v) => {
                      const n = parsePrice(v);
                      if (n === null) return toast.error('Enter a price like 15.00');
                      void save(r.pattern, { output_usd_per_mtok: n });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <EditCell value={r.notes ?? ''} className="w-64" onSave={(v) => save(r.pattern, { notes: v || null })} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDay(r.updated_at)}</TableCell>
                <TableCell>
                  {/* The fallback stays: without it an unknown model would cost nothing. */}
                  {r.pattern !== '%' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${r.label}`}
                      onClick={() => remove(r.pattern)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {loading ? 'Loading…' : 'No prices yet.'}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="border-border/50">
              <TableCell>
                <Input
                  placeholder="e.g. Claude Sonnet 5"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  className="h-8 w-44 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="%claude-sonnet-5%"
                  value={draft.pattern}
                  onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
                  className="h-8 w-48 font-mono text-xs"
                />
              </TableCell>
              <TableCell className="text-right">
                <Input
                  placeholder="0.00"
                  inputMode="decimal"
                  value={draft.input}
                  onChange={(e) => setDraft({ ...draft, input: e.target.value })}
                  className="ml-auto h-8 w-24 text-right text-sm"
                />
              </TableCell>
              <TableCell className="text-right">
                <Input
                  placeholder="0.00"
                  inputMode="decimal"
                  value={draft.output}
                  onChange={(e) => setDraft({ ...draft, output: e.target.value })}
                  className="ml-auto h-8 w-24 text-right text-sm"
                />
              </TableCell>
              <TableCell colSpan={3}>
                <Button size="sm" onClick={add}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add price
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
