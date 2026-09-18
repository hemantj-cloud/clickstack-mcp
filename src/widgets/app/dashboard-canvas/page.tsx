'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  LayoutDashboard,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Table as TableIcon,
  Layers,
  Activity,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

const DEFAULT_DASHBOARD = {
  id: 'dash_api_overview',
  name: 'Production API & Reliability Overview',
  tags: ['production', 'api', 'golden-signals'],
  tiles: [
    {
      id: 'tile_kpi_error',
      name: '5xx Error Rate',
      displayType: 'number',
      value: '0.14%',
      target: '< 0.50%',
      status: 'ok',
    },
    {
      id: 'tile_kpi_reqs',
      name: 'Total Request Volume',
      displayType: 'number',
      value: '1.24M',
      target: 'Normal (15m)',
      status: 'ok',
    },
    {
      id: 'tile_p95_latency',
      name: 'P95 Latency by Endpoint',
      displayType: 'line',
      series: [
        { name: '/api/v1/checkout', value: '240 ms' },
        { name: '/v1/tokens/verify', value: '45 ms' },
        { name: '/v1/charges', value: '120 ms' },
      ],
      status: 'ok',
    },
    {
      id: 'tile_top_errors',
      name: 'Top Recurring Error Patterns',
      displayType: 'table',
      rows: [
        { pattern: 'DB lock timeout on inventory table', count: 840, trend: '+14%' },
        { pattern: 'Invalid JWT bearer authorization token', count: 42, trend: '-2%' },
      ],
      status: 'ok',
    },
  ],
};

export default function DashboardCanvasPage() {
  const { data: rawDash, callTool } = useClickStackWidget<any>(DEFAULT_DASHBOARD);
  const dash = rawDash || DEFAULT_DASHBOARD;
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = () => {
    setIsValidating(true);
    callTool('clickstack_query_tiles', {
      dashboardId: dash?.id || 'dash_api_overview',
    });
    setTimeout(() => setIsValidating(false), 800);
  };

  const tiles = dash.tiles || DEFAULT_DASHBOARD.tiles;

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Dashboards"
        sqlQuery="SELECT * FROM otel.dashboards WHERE id = 'dash_api_overview'"
        elapsedMs={20}
        actionButtonText={isValidating ? 'Executing...' : 'Query All Tiles'}
        actionButtonIcon={<RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />}
        onRun={handleValidate}
      />

      {/* Dashboard Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-100 text-sm">{dash.name}</span>
          <div className="flex items-center gap-1.5">
            {dash.tags?.map((tag: string) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-400 font-mono text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{tiles.length} Live Tiles</span>
        </div>
      </div>

      {/* Dashboard Canvas Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((tile: any) => {
            const isNumber = tile.displayType === 'number';
            const isLine = tile.displayType === 'line';
            const isTable = tile.displayType === 'table';

            return (
              <div
                key={tile.id}
                className={`p-3.5 rounded-md bg-[#0e141d] border border-[#1c2432] hover:border-[#2b374d] transition-colors flex flex-col justify-between ${
                  isTable || isLine ? 'lg:col-span-2' : ''
                }`}
              >
                {/* Tile Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#18212e]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-xs text-slate-200">{tile.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {tile.displayType}
                  </span>
                </div>

                {/* Tile Content */}
                <div className="py-3 flex-1 flex flex-col justify-center">
                  {isNumber && (
                    <div className="space-y-1">
                      <div className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                        {tile.value}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Target: <span className="text-emerald-400 font-medium">{tile.target}</span>
                      </div>
                    </div>
                  )}

                  {isLine && (
                    <div className="space-y-2 font-mono text-xs">
                      {tile.series?.map((s: any) => (
                        <div key={s.name} className="flex items-center justify-between">
                          <span className="text-slate-300 text-[11px]">{s.name}</span>
                          <span className="text-emerald-400 font-bold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isTable && (
                    <div className="divide-y divide-[#18212e] font-mono text-xs">
                      {tile.rows?.map((r: any, rIdx: number) => (
                        <div key={rIdx} className="py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 truncate max-w-[280px]">{r.pattern}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-100 font-bold">{r.count}</span>
                            <span className="text-rose-400 text-[10px]">{r.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tile Footer */}
                <div className="pt-2 border-t border-[#18212e] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Tile ID: {tile.id}</span>
                  <span className="text-emerald-400">Live</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
