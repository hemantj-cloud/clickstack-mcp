'use client';

import React, { useState, useEffect } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  SlidersHorizontal,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Layers,
  Database,
  Sliders,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_DELTAS = {
  sourceId: 'src_trace_prod_01',
  targetFilter: 'Duration >= 1500ms (Slow Spans)',
  baselineFilter: 'Duration < 500ms (Fast Spans)',
  divergences: [
    {
      attribute: "SpanAttributes['db.statement']",
      divergenceScore: 0.984,
      targetTopValues: [{ value: 'SELECT * FROM inventory FOR UPDATE', percent: 89.2 }],
      baselineTopValues: [{ value: 'SELECT * FROM inventory FOR UPDATE', percent: 2.1 }],
    },
    {
      attribute: "ResourceAttributes['k8s.pod.name']",
      divergenceScore: 0.521,
      targetTopValues: [{ value: 'checkout-service-78bf-x942', percent: 68.4 }],
      baselineTopValues: [{ value: 'checkout-service-78bf-x942', percent: 12.0 }],
    },
    {
      attribute: "SpanAttributes['http.status_code']",
      divergenceScore: 0.442,
      targetTopValues: [{ value: '504', percent: 42.0 }, { value: '500', percent: 38.0 }],
      baselineTopValues: [{ value: '200', percent: 99.4 }],
    },
    {
      attribute: "ResourceAttributes['cloud.region']",
      divergenceScore: 0.041,
      targetTopValues: [{ value: 'us-east-1', percent: 51.0 }],
      baselineTopValues: [{ value: 'us-east-1', percent: 49.8 }],
    },
  ],
};

export default function EventDeltasPage() {
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_DELTAS);
  const data = rawData || DEFAULT_DELTAS;

  const divergences: any[] = Array.isArray(data?.divergences)
    ? data.divergences
    : Array.isArray(data?.data?.divergences)
    ? data.data.divergences
    : DEFAULT_DELTAS.divergences;

  const [selectedAttr, setSelectedAttr] = useState<any>(divergences[0]);

  useEffect(() => {
    if (divergences.length > 0) {
      setSelectedAttr(divergences[0]);
    }
  }, [rawData]);

  const handleFilterToAttribute = (attr: any) => {
    callTool('clickstack_search', {
      sourceId: data?.sourceId || DEFAULT_DELTAS.sourceId,
      where: `${attr.attribute} = '${attr.targetTopValues?.[0]?.value || ''}'`,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Traces"
        sqlQuery="SELECT attribute, divergence(target, baseline) ORDER BY divergence DESC"
        elapsedMs={28}
        timeRange="Comparative"
      />

      {/* Target vs Baseline Comparison Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-400">Target (Slow):</span>
            <span className="text-rose-400 font-bold bg-[#141219] px-2 py-0.5 rounded border border-rose-900/60">
              {data.targetFilter}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#222c3d]" />

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Baseline (Fast):</span>
            <span className="text-emerald-400 font-bold bg-[#0d161a] px-2 py-0.5 rounded border border-emerald-900/60">
              {data.baselineFilter}
            </span>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          Statistical Divergence Ranking
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Ranked Divergences Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">RANK</th>
                  <th className="py-2.5 px-3">ATTRIBUTE</th>
                  <th className="py-2.5 px-3 w-48">DIVERGENCE SCORE</th>
                  <th className="py-2.5 px-3">TARGET TOP VALUE</th>
                  <th className="py-2.5 px-3">BASELINE TOP VALUE</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2432]">
                {divergences.map((item: any, idx: number) => {
                  const isSelected = selectedAttr?.attribute === item.attribute;
                  const isHigh = item.divergenceScore > 0.7;
                  const isMed = item.divergenceScore > 0.3;

                  return (
                    <tr
                      key={item.attribute}
                      onClick={() => setSelectedAttr(item)}
                      className={`hover:bg-[#131924] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#151c2a] border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-bold">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-200 font-semibold">{item.attribute}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#090d13] border border-[#1b2330] rounded-sm overflow-hidden">
                            <div
                              className={`h-full ${
                                isHigh
                                  ? 'bg-rose-500'
                                  : isMed
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(4, item.divergenceScore * 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold text-[11px] w-12 text-right ${
                              isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-slate-400'
                            }`}
                          >
                            {(item.divergenceScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-900/60 text-rose-300 text-[11px]">
                          {item.targetTopValues?.[0]?.value} ({item.targetTopValues?.[0]?.percent}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/60 text-emerald-300 text-[11px]">
                          {item.baselineTopValues?.[0]?.value} ({item.baselineTopValues?.[0]?.percent}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterToAttribute(item);
                          }}
                          className="px-2 py-1 bg-[#131924] hover:bg-[#1c2432] border border-[#222c3d] rounded text-[11px] text-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Search className="w-3 h-3 text-emerald-400" />
                          <span>Filter Events</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Attribute Divergence Inspection Drawer */}
        {selectedAttr && (
          <div className="w-80 bg-[#0e141d] border-l border-[#1c2432] p-4 flex flex-col justify-between font-mono text-xs">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">
                  Selected Divergence
                </div>
                <div className="text-slate-100 font-bold break-all text-xs">
                  {selectedAttr.attribute}
                </div>
                <div className="text-emerald-400 font-bold text-sm pt-1">
                  Score: {(selectedAttr.divergenceScore * 100).toFixed(1)}%
                </div>
              </div>

              {/* Target Breakdown */}
              <div className="p-2.5 rounded bg-[#090d13] border border-rose-900/40 space-y-1.5">
                <div className="text-rose-400 font-sans font-semibold text-[11px]">
                  Target Group Distribution
                </div>
                {selectedAttr.targetTopValues?.map((tv: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 truncate max-w-[180px]">{tv.value}</span>
                    <span className="text-rose-400 font-bold">{tv.percent}%</span>
                  </div>
                ))}
              </div>

              {/* Baseline Breakdown */}
              <div className="p-2.5 rounded bg-[#090d13] border border-emerald-900/40 space-y-1.5">
                <div className="text-emerald-400 font-sans font-semibold text-[11px]">
                  Baseline Group Distribution
                </div>
                {selectedAttr.baselineTopValues?.map((bv: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 truncate max-w-[180px]">{bv.value}</span>
                    <span className="text-emerald-400 font-bold">{bv.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleFilterToAttribute(selectedAttr)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-[#090d13] font-semibold text-xs rounded-md shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Apply Culprit Filter to Logs</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
