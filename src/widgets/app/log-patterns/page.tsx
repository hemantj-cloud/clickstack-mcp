'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import {
  Terminal,
  ShieldAlert,
  Sparkles,
  Filter,
  Copy,
  Check,
  Search,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Layers,
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
    },
  ],
};

export default function LogPatternsPage() {
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_PATTERNS);
  const data = rawData || DEFAULT_PATTERNS;

  const [denoise, setDenoise] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (snippet: string) => {
    navigator.clipboard?.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // 1. RAW LOGS SEARCH STREAM VIEW (clickstack_search)
  if (data?.rows && Array.isArray(data.rows)) {
    const rows = data.rows;
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">Raw Log Events Stream</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/60">
                  {rows.length} events
                </span>
                {data.denoised && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-semibold">
                    Denoised
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time telemetry event stream from ClickHouse table
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              callTool('clickstack_event_patterns', {
                sourceId: data.sourceId || 'src_log_prod_01',
                sampleSize: 5000,
              });
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Cluster Into Patterns
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 font-mono text-xs">
          {rows.map((r: any, idx: number) => {
            const isError = r.SeverityText === 'ERROR' || r.level === 'error';
            const isWarn = r.SeverityText === 'WARN' || r.level === 'warn';

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all ${
                  isError
                    ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/40 text-rose-200'
                    : isWarn
                    ? 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-950/40 text-amber-200'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        isError
                          ? 'bg-rose-900/80 text-rose-300'
                          : isWarn
                          ? 'bg-amber-900/80 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {r.SeverityText || r.level || 'INFO'}
                    </span>
                    <span className="font-bold text-slate-200">{r.ServiceName || r.service || 'app'}</span>
                  </div>
                  <span>{r.Timestamp || r.time}</span>
                </div>
                <div className="text-slate-100 leading-relaxed font-sans">{r.Body || r.message}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. EMERGING SIGNALS NOVELTY VIEW (clickstack_emerging_signals)
  if (data?.emerging || data?.disappeared) {
    const emerging = data.emerging || [];
    const disappeared = data.disappeared || [];

    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">Emerging Signals Diff</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-900/50 text-rose-300 border border-rose-700/60">
                  {emerging.length} new signals
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                  {disappeared.length} disappeared
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Two-window Drain log novelty comparison (Current vs Baseline)
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 mt-4 overflow-hidden">
          {/* Emerging / New Signals */}
          <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs pb-2 border-b border-slate-800">
              <ArrowUpRight className="w-4 h-4" />
              <span>Emerging Novel Templates ({emerging.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {emerging.map((item: any, i: number) => (
                <div key={i} className="p-3 bg-slate-950/80 border border-rose-900/50 rounded-lg text-xs space-y-2">
                  <div className="font-mono text-rose-300 font-medium">{item.pattern}</div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Baseline: {item.baselineShare}</span>
                    <span className="text-rose-400 font-bold">Current: {item.currentShare}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disappeared Signals */}
          <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs pb-2 border-b border-slate-800">
              <TrendingDown className="w-4 h-4" />
              <span>Disappeared Templates ({disappeared.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {disappeared.map((item: any, i: number) => (
                <div key={i} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-2">
                  <div className="font-mono text-slate-300">{item.pattern}</div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Baseline: {item.baselineShare}</span>
                    <span>Current: {item.currentShare}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. DRAIN CLUSTERING PATTERNS VIEW (clickstack_event_patterns)
  const patterns = data.patterns || DEFAULT_PATTERNS.patterns;
  const displayedPatterns = denoise
    ? patterns.filter((p: any) => !p.isSpam)
    : patterns;

  const handleInspectRaw = (whereSnippet: string) => {
    callTool('clickstack_search', {
      sourceId: data.sourceId || 'src_log_prod_01',
      where: whereSnippet,
      limit: 50,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">Drain Log Pattern Clustering</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/60">
                {patterns.length} templates
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Sample: {(data.sampleSize || 20000).toLocaleString()} logs analyzed
            </div>
          </div>
        </div>

        <button
          onClick={() => setDenoise(!denoise)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            denoise
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {denoise ? 'Denoised (Spam Hidden)' : 'Filter Spam Templates'}
        </button>
      </div>

      {/* Pattern List */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
        {displayedPatterns.map((p: any, idx: number) => {
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                p.isAnomaly
                  ? 'bg-rose-950/30 border-rose-800/60 shadow-md shadow-rose-950/20'
                  : p.isSpam
                  ? 'bg-slate-950 border-slate-900 opacity-60'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                  {p.isAnomaly && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/80 text-rose-300 border border-rose-700">
                      <ShieldAlert className="w-3 h-3" /> ANOMALY
                    </span>
                  )}
                  {p.isSpam && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                      SPAM (70%+)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">{p.sampleCount.toLocaleString()} events</span>
                  <span className="font-bold text-indigo-300">{p.percentage}%</span>
                </div>
              </div>

              {/* Template Body */}
              <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-200 select-text">
                {p.template}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60">
                <div className="text-[11px] font-mono text-slate-500">
                  Filter snippet: <span className="text-slate-400">{p.whereSnippet}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(p.whereSnippet)}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                    title="Copy Lucene filter"
                  >
                    {copiedSnippet === p.whereSnippet ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleInspectRaw(p.whereSnippet)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-md text-xs font-medium transition"
                  >
                    <Search className="w-3 h-3" /> Browse Stream
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
