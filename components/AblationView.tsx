'use client';

import React from 'react';
import { CaseReport, AgeResolvedItem } from '@/lib/types';
import { 
  GitFork, 
  Clock, 
  AlertTriangle, 
  ArrowDownRight, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  XCircle,
  HelpCircle
} from 'lucide-react';

interface AblationViewProps {
  report: CaseReport;
  ageResolved: AgeResolvedItem[];
  onAgeSelect?: (age: number) => void;
}

export default function AblationView({
  report,
  ageResolved,
  onAgeSelect,
}: AblationViewProps) {
  const ablation = report.ablation_no_backtrack;

  return (
    <div id="ablation-view" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <GitFork className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Ablation & Age-Resolved Trajectory Analysis</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Comparing the full Lagrangian backward drift pipeline against an ablated model without drift, 
          plus the complete temporal matrix across all 24 candidate slick origin ages.
        </p>
      </div>

      {/* No-Backtrack Ablation Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">No-Backtrack Ablation Study</h3>
            <p className="text-xs text-slate-400">
              Testing attribution if the backward drift trajectory step is omitted (origin = slick centroid at observation time).
            </p>
          </div>
          <span className="text-xs font-mono bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-0.5 rounded">
            Hypothesis: Drift is mathematically critical
          </span>
        </div>

        {/* Impact Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Top Vessel Without Drift</span>
            <div className="text-base font-bold text-white mt-1">MR HAPPY</div>
            <div className="text-xs text-rose-400 font-mono mt-0.5">Score: 0.5013 (Proximity: 0.0026)</div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Completely unrelated pleasure craft ranks #1 purely due to proximity to observation centroid at 23:20 UTC.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-rose-900/40">
            <span className="text-[10px] text-slate-400 uppercase block">ROSE BALSAM (Collision Ship)</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-emerald-400">Rank #3 (0.6822)</span>
              <span className="text-slate-500">→</span>
              <span className="text-base font-bold text-rose-400">Rank #447 (0.0649)</span>
            </div>
            <div className="text-xs text-rose-400 font-mono mt-0.5">▼ Plummets 444 rank positions</div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Distance to origin jumps to 7,389m. Without drift, the true vessel is totally lost in the noise.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-rose-900/40">
            <span className="text-[10px] text-slate-400 uppercase block">VOYAGER (Collision Tow)</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-emerald-400">Rank #4 (0.6659)</span>
              <span className="text-slate-500">→</span>
              <span className="text-base font-bold text-rose-400">Rank #307 (0.2253)</span>
            </div>
            <div className="text-xs text-rose-400 font-mono mt-0.5">▼ Plummets 303 rank positions</div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Distance to origin jumps to 5,057m. Proves backward drift advection is essential.
            </p>
          </div>
        </div>

        {/* Ablation Top 8 Table */}
        <div className="overflow-x-auto pt-2">
          <span className="text-xs font-semibold text-slate-300 block mb-2">Top Vessels Under No-Drift Ablation:</span>
          <table className="w-full text-left text-xs bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
            <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Ablated Rank</th>
                <th className="py-2.5 px-3">Vessel Name</th>
                <th className="py-2.5 px-3">MMSI</th>
                <th className="py-2.5 px-3 text-right">Composite Score</th>
                <th className="py-2.5 px-3 text-right">Proximity Subscore</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ablation.top8.map((v) => (
                <tr key={v.MMSI} className="hover:bg-slate-900/80 transition-colors duration-150">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-300">#{v.rank}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{v.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{v.MMSI}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-rose-300 font-semibold">{v.composite_score.toFixed(4)}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-400">{v.score_proximity.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">False positive (spurious proximity)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Age-Resolved Top Candidates Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Age-Resolved Candidate Trajectory Matrix</h3>
            </div>
            <p className="text-xs text-slate-400">
              Top 3 candidate vessels evaluated across all 24 candidate slick ages (0.5h to 12.0h in 30-min steps).
            </p>
          </div>
          <span className="text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
            True Age: 3.0 h
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
            <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Candidate Age</th>
                <th className="py-2.5 px-3">Origin Time (UTC)</th>
                <th className="py-2.5 px-3">Top 1 Candidate</th>
                <th className="py-2.5 px-3">Top 2 Candidate</th>
                <th className="py-2.5 px-3">Top 3 Candidate</th>
                <th className="py-2.5 px-3 text-right">Vessels Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {ageResolved.map((item) => {
                const isTrueAge = Math.abs(Number(item.age_h) - 3.0) < 0.1;
                return (
                  <tr
                    key={item.age_h}
                    onClick={() => onAgeSelect && onAgeSelect(Number(item.age_h))}
                    className={`cursor-pointer transition ${
                      isTrueAge
                        ? 'bg-amber-950/40 hover:bg-amber-950/60 ring-1 ring-inset ring-amber-500/50'
                        : 'hover:bg-slate-900/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{Number(item.age_h).toFixed(1)} h</span>
                      {isTrueAge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-sans font-bold">
                          TRUE AGE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{item.origin_time_utc}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-cyan-300">{item.top1}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">{item.top2}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">{item.top3}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{item.n_vessels_scored}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
