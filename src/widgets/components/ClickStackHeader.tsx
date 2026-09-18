'use client';

import React from 'react';
import {
  Zap,
  Play,
  Clock,
  Code2,
  Bookmark,
  Bell,
  ChevronDown,
  Layers,
  Search,
} from 'lucide-react';

interface ClickStackHeaderProps {
  sourceName?: string;
  sourceIcon?: React.ReactNode;
  sqlQuery?: string;
  searchFilter?: string;
  elapsedMs?: number | string;
  timeRange?: string;
  isLiveTail?: boolean;
  onLiveTailToggle?: () => void;
  onRun?: () => void;
  actionButtonText?: string;
  actionButtonIcon?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export function ClickStackHeader({
  sourceName = 'Logs',
  sourceIcon,
  sqlQuery = 'SELECT Timestamp, ServiceName, SeverityText, Body',
  searchFilter,
  elapsedMs = 18,
  timeRange = '15m',
  isLiveTail = true,
  onLiveTailToggle,
  onRun,
  actionButtonText = 'Run',
  actionButtonIcon = <Play className="w-3 h-3 fill-current" />,
  secondaryActions,
}: ClickStackHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0e141d] border-b border-[#1c2432] text-xs select-none">
      {/* Left: Source selector & SQL chip */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Source Dropdown Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131924] border border-[#222c3d] rounded-md text-slate-200 font-medium">
          {sourceIcon || <Layers className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{sourceName}</span>
          <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
        </div>

        {/* Monospace SQL Expression */}
        {sqlQuery && (
          <div className="hidden md:flex items-center px-2.5 py-1 bg-[#090d13] border border-[#1b2330] rounded-md font-mono text-[11px] text-slate-300 max-w-md truncate">
            <span className="text-slate-500 font-semibold mr-1.5">SQL:</span>
            <span className="text-rose-400">SELECT </span>
            <span className="text-slate-300 truncate">{sqlQuery.replace(/^SELECT\s+/i, '')}</span>
          </div>
        )}
      </div>

      {/* Right Controls: Query Bar / Live Tail / Time / Run */}
      <div className="flex items-center gap-2">
        {/* Search Filter Chip (if present) */}
        {searchFilter && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#090d13] border border-[#1b2330] rounded-md text-slate-400 font-mono text-[11px]">
            <Search className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 truncate max-w-[200px]">{searchFilter}</span>
          </div>
        )}

        {/* Live Tail Toggle */}
        <button
          onClick={onLiveTailToggle}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            isLiveTail
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
              : 'bg-[#131924] text-slate-400 border-[#222c3d] hover:text-slate-200'
          }`}
          title="Toggle live tail streaming"
        >
          <Zap className={`w-3 h-3 ${isLiveTail ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-500'}`} />
          <span>Live Tail</span>
        </button>

        {/* Time Range Pill */}
        <div className="flex items-center gap-1 px-2 py-1 bg-[#131924] border border-[#222c3d] rounded-md text-slate-300 font-mono text-[11px]">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{timeRange}</span>
        </div>

        {/* Query Elapsed Badge */}
        <div className="hidden sm:flex items-center text-[11px] text-slate-400 font-mono">
          <span>Elapsed: </span>
          <span className="text-emerald-400 font-semibold ml-1">{elapsedMs}ms</span>
          <Code2 className="w-3 h-3 text-slate-600 ml-1" />
        </div>

        {secondaryActions}

        {/* Primary Run Button */}
        {onRun && (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-[#090d13] font-semibold text-xs rounded-md shadow-sm transition-all"
          >
            {actionButtonIcon}
            <span>{actionButtonText}</span>
          </button>
        )}
      </div>
    </header>
  );
}
