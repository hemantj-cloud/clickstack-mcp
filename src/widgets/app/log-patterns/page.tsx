'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  Terminal,
  Filter,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

const DEFAULT_PATTERNS = {
  sourceId: 'src_log_prod_01',
  sampleSize: 20000,
  patterns: [
    {
      template: 'HealthCheck ping received from IP <*>, status: 200 OK',
      sampleCount: 14640,
      percentage: 73.2,
      whereSnippet: 'Body:"HealthCheck ping received"',
      isSpam: true,
    },
    {
      template: 'HTTP <method> <path> completed in <ms>ms, status: 200',
      sampleCount: 3620,
      percentage: 18.1,
      whereSnippet: 'Body:"HTTP" AND Body:"completed in"',
    },
    {
      template: 'DB connection lock timeout waiting for row in table <*>',
      sampleCount: 840,
      percentage: 4.2,
      whereSnippet: 'Body:"lock timeout waiting for row"',
      isAnomaly: true,
    },
    {
      template: 'JWT token verification failed for user <*>',
      sampleCount: 42,
      percentage: 0.21,
      whereSnippet: 'Body:"JWT token verification failed"',
      isAnomaly: true,
    },
  ],
};

const SAMPLE_LOG_ROWS = [
  {
    timestamp: '2026-09-18 16:22:00.100',
    serviceName: 'checkout-service',
    severityText: 'INFO',
    body: 'Order checkout initiated for cart #84210, customerId: usr_94821',
  },
  {
    timestamp: '2026-09-18 16:22:01.400',
    serviceName: 'inventory-service',
    severityText: 'INFO',
    body: 'Acquiring lock on row #9842 in inventory table for order checkout',
  },
  {
    timestamp: '2026-09-18 16:22:02.350',
    serviceName: 'inventory-service',
    severityText: 'WARN',
    body: 'Transaction wait timeout exceeded (>2000ms) on row lock product_id 9842',
  },
  {
    timestamp: '2026-09-18 16:22:02.400',
    serviceName: 'checkout-service',
    severityText: 'ERROR',
    body: 'Order processing failed due to downstream database lock timeout in inventory table',
  },
  {
    timestamp: '2026-09-18 16:25:12.000',
    serviceName: 'ingress-nginx',
    severityText: 'INFO',
    body: 'HealthCheck ping received from IP 10.0.4.12, status: 200 OK',
  },
];

export default function LogPatternsPage() {
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_PATTERNS);
  const data = rawData || DEFAULT_PATTERNS;

  const [mode, setMode] = useState<'table' | 'patterns'>('patterns');
  const [denoise, setDenoise] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (snippet: string) => {
    navigator.clipboard?.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const patterns = (data.patterns || []).filter((p: any) => !denoise || !p.isSpam);
  const logRows = data.rows && Array.isArray(data.rows) ? data.rows : SAMPLE_LOG_ROWS;

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Logs"
        sqlQuery="SELECT Timestamp, ServiceName, SeverityText, Body ORDER BY Timestamp DESC LIMIT 100"
        elapsedMs={18}
        timeRange="15m"
      />

      {/* Main Analysis Mode Split (Exact match to ClickStack / HyperDX UI) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Analysis Mode & Filters */}
        <div className="w-56 bg-[#0e141d] border-r border-[#1c2432] p-3 flex flex-col justify-between text-xs">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Analysis Mode
              </div>
              <div className="space-y-1 font-medium">
                {/* Results Table Tab */}
                <button
                  onClick={() => setMode('table')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-sm flex items-center justify-between text-xs transition-colors ${
                    mode === 'table'
                      ? 'bg-[#131924] text-slate-100 border-l-2 border-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
                  }`}
                >
                  <span>Results Table</span>
                  <span className="text-[10px] text-slate-500 font-mono">{logRows.length}</span>
                </button>

                {/* Event Patterns Tab */}
                <button
                  onClick={() => setMode('patterns')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-sm flex items-center justify-between text-xs transition-colors ${
                    mode === 'patterns'
                      ? 'bg-[#131924] text-slate-100 border-l-2 border-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
                  }`}
                >
                  <span>Event Patterns</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Drain 3</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Filters
              </div>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#131924] border border-[#222c3d] text-slate-300 cursor-pointer text-xs hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={denoise}
                  onChange={(e) => setDenoise(e.target.checked)}
                  className="rounded border-[#1c2432] bg-[#090d13] text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Denoise Results</span>
              </label>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#121824] border border-[#1c2432] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-slate-500 uppercase text-[9px] font-sans font-semibold">
              Drain Log Clustering
            </div>
            <div>Scanned: <span className="text-slate-200 font-bold">{data.sampleSize?.toLocaleString() || '20,000'}</span></div>
            <div>Templates: <span className="text-emerald-400 font-bold">{patterns.length}</span></div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0f15]">
          {/* Timeline Bar Indicator */}
          <div className="h-6 bg-[#0e141d] border-b border-[#1c2432] flex items-center justify-between px-4 text-[10px] font-mono text-slate-500">
            <span>{patterns.length} Clustered Patterns Found</span>
            <span>ClickHouse Drain Algorithm</span>
          </div>

          {mode === 'patterns' ? (
            /* Patterns List View */
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
              {patterns.map((p: any, idx: number) => {
                const isAnomaly = p.isAnomaly;
                const isSpam = p.isSpam;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border transition-all ${
                      isAnomaly
                        ? 'bg-[#141219] border-rose-800/60 hover:border-rose-600'
                        : isSpam
                        ? 'bg-[#0e141d] border-[#1c2432] opacity-75'
                        : 'bg-[#0e141d] border-[#1c2432] hover:border-[#2b374d]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">#{idx + 1}</span>
                          {isAnomaly && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                              ANOMALY
                            </span>
                          )}
                          {isSpam && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[10px]">
                              NOISY RECURRING
                            </span>
                          )}
                          <span className="text-slate-400 text-[11px]">
                            {p.sampleCount?.toLocaleString()} occurrences ({p.percentage}%)
                          </span>
                        </div>

                        {/* Template with ClickStack token highlights */}
                        <div className="text-slate-200 text-xs font-mono leading-relaxed break-all bg-[#090d13] p-2 rounded border border-[#18212e]">
                          {p.template.split(/(<\*?>|<[^>]+>)/g).map((segment: string, sIdx: number) =>
                            segment.startsWith('<') && segment.endsWith('>') ? (
                              <span
                                key={sIdx}
                                className="px-1 py-0.5 mx-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-bold text-[11px]"
                              >
                                {segment}
                              </span>
                            ) : (
                              <span key={sIdx}>{segment}</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(p.whereSnippet)}
                          className="px-2 py-1 bg-[#131924] hover:bg-[#1c2432] border border-[#222c3d] rounded text-[11px] text-slate-300 flex items-center gap-1 transition-colors"
                          title="Copy Lucene Filter Snippet"
                        >
                          {copiedSnippet === p.whereSnippet ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                          <span>Copy Filter</span>
                        </button>

                        <button
                          onClick={() => {
                            callTool('clickstack_search', {
                              sourceId: data.sourceId || 'src_log_prod_01',
                              where: p.whereSnippet,
                            });
                          }}
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 rounded text-[11px] text-emerald-300 flex items-center gap-1 transition-colors"
                        >
                          <Search className="w-3 h-3" />
                          <span>Filter Events</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Results Table View (Exact match to ClickStack table in screenshot) */
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3 border-r border-[#1c2432] w-52">Timestamp (Local)</th>
                      <th className="py-2.5 px-3 border-r border-[#1c2432] w-40">ServiceName</th>
                      <th className="py-2.5 px-3 border-r border-[#1c2432] w-28">SeverityText</th>
                      <th className="py-2.5 px-3">Body</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2432]">
                    {logRows.map((row: any, rIdx: number) => {
                      const isError = row.severityText === 'ERROR';
                      const isWarn = row.severityText === 'WARN';

                      return (
                        <tr key={rIdx} className="hover:bg-[#131924] transition-colors">
                          <td className="py-2 px-3 border-r border-[#1c2432] text-slate-400 text-[11px] whitespace-nowrap">
                            {row.timestamp}
                          </td>
                          <td className="py-2 px-3 border-r border-[#1c2432]">
                            <span className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-emerald-400 text-[11px]">
                              {row.serviceName}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-[#1c2432]">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isError
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : isWarn
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {row.severityText}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-200 break-all text-[11px]">
                            {row.body}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
