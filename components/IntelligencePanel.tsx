'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CandidateVessel, CaseReport } from '@/lib/types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Ship, 
  Anchor, 
  Clock, 
  Compass, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  HelpCircle,
  X,
  RotateCcw
} from 'lucide-react';

interface IntelligencePanelProps {
  candidates: CandidateVessel[];
  report: CaseReport;
  selectedVessel: CandidateVessel | null;
  onSelectVessel: (vessel: CandidateVessel) => void;
  onOpenInspector: (vessel: CandidateVessel) => void;
}

export default function IntelligencePanel({
  candidates,
  report,
  selectedVessel,
  onSelectVessel,
  onOpenInspector,
}: IntelligencePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'proximity' | 'heading' | 'temporal' | 'dist' | 'age'>('score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Pressing '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter & Sort candidates
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((vessel) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !query ||
          vessel.name.toLowerCase().includes(query) ||
          vessel.MMSI.includes(query) ||
          (vessel.imo && vessel.imo.toLowerCase().includes(query));

        const matchesType =
          selectedType === 'ALL' ||
          vessel.type_label.toLowerCase() === selectedType.toLowerCase() ||
          (selectedType === 'TUG' && vessel.type_label.includes('tug'));

        return matchesQuery && matchesType;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortBy === 'score') {
          valA = a.composite_score;
          valB = b.composite_score;
        } else if (sortBy === 'proximity') {
          valA = a.score_proximity;
          valB = b.score_proximity;
        } else if (sortBy === 'heading') {
          valA = a.score_heading;
          valB = b.score_heading;
        } else if (sortBy === 'temporal') {
          valA = a.score_temporal;
          valB = b.score_temporal;
        } else if (sortBy === 'dist') {
          valA = a.dist_at_origin_time_m;
          valB = b.dist_at_origin_time_m;
        } else if (sortBy === 'age') {
          valA = a.matched_age_h;
          valB = b.matched_age_h;
        }
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [candidates, searchQuery, selectedType, sortBy, sortOrder]);

  const topVessel = candidates.find((c) => c.rank === 1) || candidates[0];

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSortBy('score');
    setSortOrder('desc');
    searchInputRef.current?.focus();
  };

  return (
    <div id="intelligence-panel" className="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="text-base font-bold text-slate-100 tracking-tight">Candidate Intelligence</h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-mono tabular-nums">
            {filteredCandidates.length} of {candidates.length} Scored
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Ranked using Lagrangian backward drift & 4-factor multi-metric proximity scoring.
        </p>
      </div>

      {/* Headline #1 Candidate Card */}
      {topVessel && !searchQuery && selectedType === 'ALL' && (
        <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Top Investigative Priority
            </span>
            <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded tabular-nums">
              Score: {topVessel.composite_score.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{topVessel.name}</span>
                <span className="text-xs font-normal text-slate-400 capitalize bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                  {topVessel.type_label}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono truncate">
                <span>MMSI: {topVessel.MMSI}</span>
                {topVessel.imo && <span>• {topVessel.imo}</span>}
              </div>
            </div>

            <button
              id="inspect-top-candidate-btn"
              onClick={() => onOpenInspector(topVessel)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-150 shadow-md shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>Inspect</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Matched Age</div>
              <div className="font-bold text-slate-200 mt-0.5 font-mono tabular-nums">{topVessel.matched_age_h.toFixed(1)} h</div>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Origin Dist.</div>
              <div className="font-bold text-slate-200 mt-0.5 font-mono tabular-nums">{topVessel.dist_at_origin_time_m.toFixed(0)} m</div>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Heading Delta</div>
              <div className="font-bold text-cyan-300 mt-0.5 font-mono tabular-nums">{topVessel.heading_axis_delta_deg.toFixed(1)}°</div>
            </div>
          </div>
          
          <div className="mt-2 text-[11px] text-slate-400 italic">
            * Note: Top attribution score indicates candidate priority, not proven legal responsibility.
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 shrink-0" />
          <input
            ref={searchInputRef}
            id="vessel-search-input"
            type="text"
            placeholder="Search candidate vessel or MMSI (press '/' to focus)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5 rounded transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 select-none">
              /
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Vessel Type Filter */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {['ALL', 'TUG', 'cargo', 'tanker', 'other'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] capitalize whitespace-nowrap font-medium transition-all duration-150 ${
                  selectedType === type
                    ? 'bg-slate-700 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {type === 'TUG' ? 'Tugs/Towing' : type}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-1 shrink-0">
            <select
              id="vessel-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            >
              <option value="score">Composite Score</option>
              <option value="proximity">Proximity Subscore</option>
              <option value="heading">Heading Subscore</option>
              <option value="temporal">Temporal Subscore</option>
              <option value="dist">Distance to Origin</option>
              <option value="age">Matched Slick Age</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
              title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Vessel List or Empty State */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
        {filteredCandidates.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">No vessels match criteria</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                No AIS candidates match query <span className="font-mono text-cyan-400">"{searchQuery || selectedType}"</span>. Try clearing your filters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Search & Filters</span>
            </button>
          </div>
        ) : (
          filteredCandidates.map((vessel) => {
            const isSelected = selectedVessel?.MMSI === vessel.MMSI;
            const isCollisionGroundTruth = vessel.MMSI === '356144000' || vessel.MMSI === '366996020';

            return (
              <div
                key={vessel.MMSI}
                id={`candidate-card-${vessel.MMSI}`}
                onClick={() => onSelectVessel(vessel)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all duration-150 border text-xs ${
                  isSelected
                    ? 'bg-slate-800/95 border-cyan-500 shadow-md ring-1 ring-cyan-500/40 translate-x-0.5'
                    : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 font-mono ${
                        vessel.rank === 1
                          ? 'bg-cyan-600 text-white'
                          : isCollisionGroundTruth
                          ? 'bg-amber-600 text-white ring-1 ring-amber-400'
                          : vessel.rank <= 5
                          ? 'bg-emerald-700 text-emerald-100'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{vessel.rank}
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="font-bold text-slate-100 text-sm truncate">{vessel.name || '(unnamed)'}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5 capitalize shrink-0">({vessel.type_label})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-cyan-300 tabular-nums">
                        {vessel.composite_score.toFixed(4)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInspector(vessel);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition active:scale-[0.98]"
                      title="View Full Telemetry"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Special Badge if Ground Truth Collision Vessel */}
                {isCollisionGroundTruth && (
                  <div className="mb-1.5 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                    <span>★ Known Houston Ship Channel Collision Vessel</span>
                  </div>
                )}

                {/* Subscores Bar Breakdown */}
                <div className="space-y-1 my-1.5">
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 font-mono">
                    <div>Prox: <span className="text-slate-200 tabular-nums">{vessel.score_proximity.toFixed(2)}</span></div>
                    <div>Head: <span className="text-slate-200 tabular-nums">{vessel.score_heading.toFixed(2)}</span></div>
                    <div>Temp: <span className="text-slate-200 tabular-nums">{vessel.score_temporal.toFixed(2)}</span></div>
                    <div>AIS: <span className="text-slate-200 tabular-nums">{vessel.score_ais_continuity.toFixed(2)}</span></div>
                  </div>

                  {/* Visual Composite Bar */}
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${vessel.score_proximity * 40}%` }}
                      className="bg-blue-500 h-full transition-all duration-200"
                      title={`Proximity: ${(vessel.score_proximity * 0.4).toFixed(3)}`}
                    />
                    <div
                      style={{ width: `${vessel.score_heading * 30}%` }}
                      className="bg-indigo-500 h-full transition-all duration-200"
                      title={`Heading: ${(vessel.score_heading * 0.3).toFixed(3)}`}
                    />
                    <div
                      style={{ width: `${vessel.score_temporal * 20}%` }}
                      className="bg-amber-500 h-full transition-all duration-200"
                      title={`Temporal: ${(vessel.score_temporal * 0.2).toFixed(3)}`}
                    />
                    <div
                      style={{ width: `${vessel.score_ais_continuity * 10}%` }}
                      className="bg-rose-500 h-full transition-all duration-200"
                      title={`AIS: ${(vessel.score_ais_continuity * 0.1).toFixed(3)}`}
                    />
                  </div>
                </div>

                {/* Telemetry Summary */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>Matched: <strong className="text-slate-300 tabular-nums">{vessel.matched_age_h.toFixed(1)}h</strong></span>
                  <span>Dist: <strong className="text-slate-300 tabular-nums">{vessel.dist_at_origin_time_m.toFixed(0)}m</strong></span>
                  <span>SOG: <strong className="text-slate-300 tabular-nums">{vessel.sog_at_approach_kn ? vessel.sog_at_approach_kn.toFixed(1) : 0} kn</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

