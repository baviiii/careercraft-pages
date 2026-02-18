/**
 * DataTableVisualizer
 *
 * Renders structured tables extracted from PDFs during process-pdfs.ps1.
 * Fetches chunkType='table_row' chunks from the Azure Search index and
 * displays them as beautiful, sortable, filterable tables with optional
 * bar-chart conversion for numeric columns.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table2,
  BarChart3,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { callRAGMetadata } from '@/lib/azureFunctions';

export interface ExtractedTable {
  id: string;
  documentId: string;
  title: string;
  pageNumber?: number;
  category?: string;
  sector?: string;
  headers: string[];
  data: string[][];
}

interface DataTableVisualizerProps {
  query?: string;
  sector?: string;
  category?: string;
  maxTables?: number;
}

const CHART_COLORS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#3b82f6', '#84cc16', '#f97316', '#a855f7',
];

function isNumeric(val: string): boolean {
  const cleaned = val.replace(/[$,%\s]/g, '').replace(/[,]/g, '');
  return !isNaN(parseFloat(cleaned)) && cleaned.length > 0;
}

function parseNumber(val: string): number {
  return parseFloat(val.replace(/[$,%\s,]/g, '')) || 0;
}

function SingleTable({ table }: { table: ExtractedTable }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Detect numeric columns for chart mode
  const numericCols = useMemo(() => {
    return table.headers.map((_, ci) => {
      const vals = table.data.map(r => r[ci] || '');
      const numCount = vals.filter(v => isNumeric(v)).length;
      return numCount >= Math.max(2, vals.length * 0.5);
    });
  }, [table]);

  const hasNumericCols = numericCols.some(Boolean);

  // First numeric column index for chart
  const firstNumCol = numericCols.findIndex(Boolean);
  // First text column for chart labels
  const labelCol = numericCols.findIndex(v => !v);

  const filteredData = useMemo(() => {
    let rows = [...table.data];
    if (filter.trim()) {
      const q = filter.toLowerCase();
      rows = rows.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      rows.sort((a, b) => {
        const av = a[sortCol] || '';
        const bv = b[sortCol] || '';
        const an = isNumeric(av) ? parseNumber(av) : null;
        const bn = isNumeric(bv) ? parseNumber(bv) : null;
        if (an !== null && bn !== null) {
          return sortDir === 'asc' ? an - bn : bn - an;
        }
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  }, [table.data, filter, sortCol, sortDir]);

  const chartData = useMemo(() => {
    if (firstNumCol === -1) return [];
    return filteredData.slice(0, 20).map((row, i) => ({
      name: (labelCol >= 0 ? row[labelCol] : `Row ${i + 1}`) || `Row ${i + 1}`,
      value: parseNumber(row[firstNumCol] || '0'),
      label: table.headers[firstNumCol],
    }));
  }, [filteredData, firstNumCol, labelCol, table.headers]);

  const handleSort = (ci: number) => {
    if (sortCol === ci) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(ci);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ ci }: { ci: number }) => {
    if (sortCol !== ci) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-purple-400" />
      : <ChevronDown className="w-3 h-3 text-purple-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Table2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-white truncate">{table.title}</span>
            {table.pageNumber && (
              <Badge className="text-[10px] bg-white/10 text-white/60 border-0 flex-shrink-0">
                p.{table.pageNumber}
              </Badge>
            )}
            {table.sector && (
              <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-400/30 flex-shrink-0">
                {table.sector}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 truncate">{table.documentId}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasNumericCols && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode(v => v === 'table' ? 'chart' : 'table')}
              className="h-7 px-2 text-[11px] text-white/60 hover:text-white hover:bg-white/10"
            >
              {viewMode === 'table'
                ? <><BarChart3 className="w-3 h-3 mr-1" />Chart</>
                : <><Table2 className="w-3 h-3 mr-1" />Table</>
              }
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter rows..."
            className="h-7 pl-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400/50"
          />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'chart' && chartData.length > 0 ? (
          <motion.div
            key="chart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4"
          >
            <p className="text-[11px] text-white/40 mb-3">
              {table.headers[firstNumCol]} by {labelCol >= 0 ? table.headers[labelCol] : 'row'}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1b4b',
                    border: '1px solid rgba(139,92,246,0.4)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [val.toLocaleString(), table.headers[firstNumCol]]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-x-auto max-h-[480px] overflow-y-auto"
          >
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white/8 backdrop-blur-sm">
                  {table.headers.map((h, ci) => (
                    <th
                      key={ci}
                      onClick={() => handleSort(ci)}
                      className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 cursor-pointer hover:text-white whitespace-nowrap border-b border-white/10 select-none"
                    >
                      <span className="flex items-center gap-1">
                        {h}
                        <SortIcon ci={ci} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {table.headers.map((_, ci) => {
                      const cell = row[ci] ?? '';
                      const isNum = isNumeric(cell);
                      return (
                        <td
                          key={ci}
                          className={`px-3 py-2 text-[11px] leading-relaxed align-top ${isNum ? 'text-right font-mono text-emerald-300 whitespace-nowrap' : 'text-white/80 whitespace-normal break-words'} max-w-[320px]`}
                          title={cell}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={table.headers.length} className="px-3 py-4 text-center text-white/30 text-xs">
                      No rows match filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/30">
          {filteredData.length} of {table.data.length} rows · {table.headers.length} columns
        </span>
        {table.data.length > filteredData.length && (
          <span className="text-[10px] text-purple-400">{table.data.length - filteredData.length} filtered</span>
        )}
      </div>
    </motion.div>
  );
}

export function DataTableVisualizer({ query, sector, category, maxTables = 20 }: DataTableVisualizerProps) {
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await callRAGMetadata<{ tables: ExtractedTable[]; total: number }>('fetch-tables', {
          query: query || '*',
          filters: {
            ...(sector ? { sector } : {}),
            ...(category ? { category } : {}),
          },
          top: maxTables,
        });
        if (result.success && result.data?.tables) {
          setTables(result.data.tables);
        } else {
          setError(result.error || 'Failed to load tables');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [query, sector, category, maxTables]);

  const visibleTables = useMemo(() => {
    if (!globalFilter.trim()) return tables;
    const q = globalFilter.toLowerCase();
    return tables.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.documentId.toLowerCase().includes(q) ||
      (t.sector || '').toLowerCase().includes(q) ||
      t.headers.some(h => h.toLowerCase().includes(q))
    );
  }, [tables, globalFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-white/50">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading tables from index...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No tables found in the index</p>
        <p className="text-xs text-white/25 mt-1">
          Tables are extracted when PDFs are processed with <code className="text-purple-400">process-pdfs.ps1</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search tables..."
            className="h-8 pl-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400/50"
          />
        </div>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
          {visibleTables.length} table{visibleTables.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Tables */}
      <div className="space-y-3">
        {visibleTables.map(table => (
          <SingleTable key={table.id} table={table} />
        ))}
      </div>
    </div>
  );
}

export default DataTableVisualizer;
