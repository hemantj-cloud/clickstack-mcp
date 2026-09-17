'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { GitCompare, Filter, ArrowRight, Check, Zap } from 'lucide-react';

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
  const { data, callTool } = useClickStackWidget(DEFAULT_DELTAS);
  const [selectedAttr, setSelectedAttr] = useState<any>(data?.divergences?.[0]);

  const handleFilterToAttribute = (attr: any) => {
    callTool('clickstack_search', {
      sourceId: data.sourceId,
      where: `${attr.attribute} = '${attr.targetTopValues[0]?.value}'`,
      whereLanguage: 'sql',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200">Event Deltas: Target vs Baseline</h1>
            <div className="text-[11px] font-mono text-slate-400">
              Comparing outlier group against normal traffic
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Target: {data.targetFilter}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Baseline: {data.baselineFilter}
          </span>
        </div>
      </div>

      {/* Divergence Ranking List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
        {data.divergences.map((item: any) => {
          const isSelected = selectedAttr?.attribute === item.attribute;
          const scorePercent = Math.round(item.divergenceScore * 100);

          return (
            <div
              key={item.attribute}
              onClick={() => setSelectedAttr(item)}
              className={`p-3 rounded-lg border transition cursor-pointer ${
                isSelected ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-200">{item.attribute}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Divergence Score:</span>
                  <span className={`font-bold ${scorePercent > 70 ? 'text-rose-400' : scorePercent > 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {scorePercent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  style={{ width: `${scorePercent}%` }}
                  className={`h-full rounded-full ${scorePercent > 70 ? 'bg-rose-500' : scorePercent > 30 ? 'bg-amber-500' : 'bg-slate-600'}`}
                />
              </div>

              {/* Target vs Baseline breakdown */}
              <div className="mt-2.5 grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="bg-slate-950/60 p-2 rounded border border-rose-500/20">
                  <div className="text-rose-400 text-[10px] font-bold uppercase">Target Group Proportion</div>
                  <div className="text-slate-200 mt-1 truncate">
                    {item.targetTopValues[0]?.value || 'None'}
                    <strong className="text-rose-400 ml-1.5">({item.targetTopValues[0]?.percent}%)</strong>
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-emerald-500/20">
                  <div className="text-emerald-400 text-[10px] font-bold uppercase">Baseline Proportion</div>
                  <div className="text-slate-200 mt-1 truncate">
                    {item.baselineTopValues[0]?.value || 'None'}
                    <strong className="text-emerald-400 ml-1.5">({item.baselineTopValues[0]?.percent}%)</strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Action Bar */}
      {selectedAttr && (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="font-mono text-xs">
            <span className="text-slate-400">Differentiating Dimension: </span>
            <strong className="text-indigo-400">{selectedAttr.attribute}</strong>
          </div>
          <button
            onClick={() => handleFilterToAttribute(selectedAttr)}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-50 font-semibold rounded text-xs transition flex items-center gap-1.5"
          >
            <Filter className="w-3 h-3" /> Filter Queries to this Outlier
          </button>
        </div>
      )}
    </div>
  );
}
