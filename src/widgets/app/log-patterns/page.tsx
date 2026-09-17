'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { Terminal, ShieldAlert, Sparkles, Filter, Copy, Check, Search } from 'lucide-react';

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
  const { data, callTool } = useClickStackWidget(DEFAULT_PATTERNS);
  const [denoise, setDenoise] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const displayedPatterns = denoise
    ? (data?.patterns || []).filter((p: any) => !p.isSpam)
    : (data?.patterns || []);

  const handleCopy = (snippet: string) => {
    navigator.clipboard?.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleInspectRaw = (whereSnippet: string) => {
    callTool('clickstack_search', {
      sourceId: data.sourceId,
      where: whereSnippet,
      limit: 50,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200">Log Pattern Explorer & Denoise Stream</h1>
            <div className="text-[11px] font-mono text-slate-400">
              Drain algorithm clustering across {data.sampleSize.toLocaleString()} sampled events
            </div>
          </div>
        </div>

        {/* Denoise Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDenoise(!denoise)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold transition border ${
              denoise
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Denoise: {denoise ? 'ACTIVE (Spam Hidden)' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Patterns List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
        {displayedPatterns.map((p: any, idx: number) => {
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition ${
                p.isAnomaly
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : p.isSpam
                  ? 'bg-slate-900/30 border-slate-800/60 opacity-70'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">#{idx + 1}</span>
                  {p.isAnomaly && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Anomaly Template
                    </span>
                  )}
                  {p.isSpam && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                      High-Volume Spam
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">{p.sampleCount.toLocaleString()} events</span>
                  <span className="font-bold text-indigo-400">{p.percentage}%</span>
                </div>
              </div>

              {/* Template Body */}
              <div className="mt-2 font-mono text-[11px] text-slate-200 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                {p.template}
              </div>

              {/* Action Bar */}
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                <div className="text-slate-500 truncate max-w-md">
                  Filter: <code className="text-slate-400">{p.whereSnippet}</code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(p.whereSnippet)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition"
                  >
                    {copiedSnippet === p.whereSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy Filter
                  </button>
                  <button
                    onClick={() => handleInspectRaw(p.whereSnippet)}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-slate-50 font-semibold rounded text-[10px] flex items-center gap-1 transition"
                  >
                    <Search className="w-3 h-3" /> Browse Raw Rows
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
