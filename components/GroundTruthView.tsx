'use client';

import React from 'react';
import { CaseReport, CandidateVessel } from '@/lib/types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Target,
  Compass,
  AlertOctagon
} from 'lucide-react';

interface GroundTruthViewProps {
  report: CaseReport;
  candidates: CandidateVessel[];
  onSelectVessel: (vessel: CandidateVessel) => void;
}

export default function GroundTruthView({
  report,
  candidates,
  onSelectVessel,
}: GroundTruthViewProps) {
  const gt = report.ground_truth_evaluation;
  const roseBalsam = candidates.find((c) => c.MMSI === '356144000');
  const voyager = candidates.find((c) => c.MMSI === '366996020');
  const bwOak = candidates.find((c) => c.MMSI === '235101304');
  const thor = candidates.find((c) => c.rank === 1);

  return (
    <div id="ground-truth-view" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Quarantined Ground-Truth Evaluation</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          The attribution scoring pipeline strictly quarantined ground truth to prevent circular evaluation. 
          The evaluation below benchmarks the unguided pipeline results against the known Galveston Bay collision reality.
        </p>
      </div>

      {/* Top Level Summary Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded">
            VALIDATION RESULT
          </span>
          <span className="text-xs font-mono text-slate-400 ml-auto">Houston Ship Channel (2019-05-10)</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-sm font-bold text-emerald-400">Ground truth recovered: 2/2</div>
            <div className="text-[11px] text-slate-400 mt-0.5">incident vessels in Top 4</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/40">
            <div className="text-sm font-bold text-rose-400">Mismatch under baseline</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Top-1 attribution weighting</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-amber-900/40">
            <div className="text-sm font-bold text-amber-400">Heading dominance</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Failure mode: low aspect-ratio geometry</div>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed pt-2">
          On May 10, 2019 at 20:20 UTC, the outbound bulk carrier <strong>ROSE BALSAM</strong> collided with the towing vessel <strong>VOYAGER</strong>. The resulting slick was simulated at 23:20 UTC (3.0 hours later). The pipeline evaluated 553 vessels without access to this truth.
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Model Results & Limitations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
              MODEL-RANKED CANDIDATE
            </span>
          </div>

          <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded">
                  Algorithm Headline Output
                </span>
                <span className="font-mono font-bold text-indigo-400 text-sm">Rank #1</span>
              </div>
              <h4 className="text-base font-bold text-white">{thor?.name || 'THOR'}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">MMSI: {thor?.MMSI || '367300350'} • IMO {thor?.imo || '9350551'}</p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tug/towing vessel that the unguided baseline model mistakenly ranked highest. Not involved in the incident.
              </p>

              <div className="mt-3 space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Composite Score:</span>
                  <strong className="font-mono text-indigo-300">{thor?.composite_score?.toFixed(4) || '0.7461'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heading Score:</span>
                  <strong className="font-mono text-rose-400">{thor?.score_heading?.toFixed(4) || '0.9960'} (Over-indexed)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched Slick Age:</span>
                  <strong className="font-mono text-slate-300">{thor?.matched_age_h?.toFixed(1) || '2.5'} h</strong>
                </div>
              </div>
            </div>

            {thor && (
              <button
                onClick={() => onSelectVessel(thor)}
                className="mt-4 w-full py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Inspect Telemetry & Track
              </button>
            )}
          </div>

          <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950 px-2 py-0.5 border border-rose-900 rounded">
                MODEL LIMITATION
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                The synthetic spill polygon has an aspect ratio of only <strong>1.25</strong>. It is nearly circular, making its elongation axis physically meaningless.
              </p>
              <p>
                Despite this, the baseline model applies a fixed <strong>30% weight</strong> to the heading score. THOR was traveling on a course (247.2°) that perfectly aligned with this random axis (72.3°), artificially inflating its composite score to #1.
              </p>
              <p>
                When heading is correctly ablated from the model due to low scene confidence, <strong>ROSE BALSAM jumps to Rank #1</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Ground Truth */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
              KNOWN GROUND-TRUTH VESSEL
            </span>
          </div>

          {/* ROSE BALSAM */}
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                  Incident Participant
                </span>
                <span className="font-mono font-bold text-amber-400 text-sm">Rank #3</span>
              </div>
              <h4 className="text-base font-bold text-white">ROSE BALSAM</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">MMSI: 356144000 • IMO 9478937</p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Outbound bulk carrier that struck the tow. Later drifted Not Under Command (NUC).
              </p>

              <div className="mt-3 space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Composite Score:</span>
                  <strong className="font-mono text-cyan-300">0.6822</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched Slick Age:</span>
                  <strong className="font-mono text-emerald-400">3.0 h (Exact Match)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin Dist:</span>
                  <strong className="font-mono text-slate-200">144.3 m</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">No-Heading Sensitivity:</span>
                  <strong className="font-mono text-amber-300">Jumps to Rank #1 (0.7927)</strong>
                </div>
              </div>
            </div>

            {roseBalsam && (
              <button
                onClick={() => onSelectVessel(roseBalsam)}
                className="mt-4 w-full py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Inspect Telemetry & Track
              </button>
            )}
          </div>

          {/* VOYAGER */}
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                  Incident Participant
                </span>
                <span className="font-mono font-bold text-amber-400 text-sm">Rank #4</span>
              </div>
              <h4 className="text-base font-bold text-white">VOYAGER</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">MMSI: 366996020 • IMO 8424549</p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Towing vessel pushing the breached reformate tank barge.
              </p>

              <div className="mt-3 space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Composite Score:</span>
                  <strong className="font-mono text-cyan-300">0.6659</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched Slick Age:</span>
                  <strong className="font-mono text-emerald-400">3.0 h (Exact Match)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin Dist:</span>
                  <strong className="font-mono text-slate-200">292.2 m</strong>
                </div>
              </div>
            </div>

            {voyager && (
              <button
                onClick={() => onSelectVessel(voyager)}
                className="mt-4 w-full py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Inspect Telemetry & Track
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
