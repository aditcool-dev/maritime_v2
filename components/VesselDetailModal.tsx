'use client';

import React, { useEffect } from 'react';
import { CandidateVessel, CaseReport } from '@/lib/types';
import { 
  X, 
  Ship, 
  MapPin, 
  Clock, 
  Compass, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Gauge, 
  Layers, 
  Radio, 
  Info
} from 'lucide-react';

interface VesselDetailModalProps {
  vessel: CandidateVessel | null;
  report: CaseReport;
  onClose: () => void;
}

export default function VesselDetailModal({
  vessel,
  report,
  onClose,
}: VesselDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!vessel) return null;

  const isCollisionGroundTruth = vessel.MMSI === '356144000' || vessel.MMSI === '366996020';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vessel-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                vessel.rank === 1
                  ? 'bg-cyan-600 text-white'
                  : isCollisionGroundTruth
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              #{vessel.rank}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="vessel-modal-title" className="text-lg font-bold text-slate-100">
                  {vessel.name || '(No broadcast name)'}
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded capitalize">
                  {vessel.type_label}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>MMSI: {vessel.MMSI}</span>
                {vessel.imo && <span>• IMO: {vessel.imo}</span>}
                {vessel.callsign && <span>• Callsign: {vessel.callsign}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-[0.96] transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Collision Ground Truth Banner */}
          {isCollisionGroundTruth && (
            <div className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-lg text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block mb-0.5 text-sm">Quarantined Ground-Truth Collision Vessel</strong>
                <p className="leading-relaxed">
                  {vessel.MMSI === '356144000'
                    ? 'ROSE BALSAM (IMO 9478937): Outbound bulk carrier that collided with the tank tow in the Houston Ship Channel at 20:20 UTC. Later reported Not Under Command (NUC).'
                    : 'VOYAGER (IMO 8424549): Towing vessel pushing the reformate gasoline blendstock tank barge that was breached during the collision at 20:20 UTC.'}
                </p>
              </div>
            </div>
          )}

          {/* Composite Score Breakdown Card */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-slate-200">Attribution Composite Score</span>
              </div>
              <span className="text-base font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800">
                {vessel.composite_score.toFixed(4)}
              </span>
            </div>

            {/* Formula visualization */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Proximity (40%)</span>
                <span className="font-mono text-sm font-bold text-blue-400 block mt-0.5">
                  {vessel.score_proximity.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  +{(vessel.score_proximity * 0.4).toFixed(3)}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Heading (30%)</span>
                <span className="font-mono text-sm font-bold text-indigo-400 block mt-0.5">
                  {vessel.score_heading.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  +{(vessel.score_heading * 0.3).toFixed(3)}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Temporal (20%)</span>
                <span className="font-mono text-sm font-bold text-amber-400 block mt-0.5">
                  {vessel.score_temporal.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  +{(vessel.score_temporal * 0.2).toFixed(3)}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">AIS Continuity (10%)</span>
                <span className="font-mono text-sm font-bold text-rose-400 block mt-0.5">
                  {vessel.score_ais_continuity.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  +{(vessel.score_ais_continuity * 0.1).toFixed(3)}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
              <div style={{ width: `${vessel.score_proximity * 40}%` }} className="bg-blue-500 h-full" />
              <div style={{ width: `${vessel.score_heading * 30}%` }} className="bg-indigo-500 h-full" />
              <div style={{ width: `${vessel.score_temporal * 20}%` }} className="bg-amber-500 h-full" />
              <div style={{ width: `${vessel.score_ais_continuity * 10}%` }} className="bg-rose-500 h-full" />
            </div>
          </div>

          {/* Telemetry & Spatial Fit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Origin Fit */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 border-b border-slate-800 pb-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Matched Backward Drift Origin</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Best Slick Age:</span>
                  <strong className="font-mono">{vessel.matched_age_h.toFixed(1)} hours</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched Origin Time:</span>
                  <span className="font-mono">{vessel.matched_origin_time_utc} UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin Coordinates:</span>
                  <span className="font-mono">{vessel.matched_origin_lat.toFixed(5)}°, {vessel.matched_origin_lon.toFixed(5)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dist. at Origin Time:</span>
                  <strong className="font-mono text-cyan-300">{vessel.dist_at_origin_time_m.toFixed(1)} m</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin Uncertainty Radius:</span>
                  <span className="font-mono">±{vessel.matched_origin_r_unc_m.toFixed(0)} m</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Inside Uncertainty Envelope:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    vessel.within_origin_uncertainty
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {vessel.within_origin_uncertainty ? 'YES (Within Radius)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Approach Telemetry */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 border-b border-slate-800 pb-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Closest Approach & Motion</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Approach Timestamp:</span>
                  <span className="font-mono">{vessel.approach_time_utc} UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nearest Approach Dist:</span>
                  <span className="font-mono">{vessel.dist_nearest_approach_m.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approach Coordinates:</span>
                  <span className="font-mono">{vessel.approach_lat.toFixed(5)}°, {vessel.approach_lon.toFixed(5)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed Over Ground (SOG):</span>
                  <strong className="font-mono">{vessel.sog_at_approach_kn ? vessel.sog_at_approach_kn.toFixed(1) : 0} knots</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course Over Ground (COG):</span>
                  <span className="font-mono">{vessel.cog_at_approach_deg ? vessel.cog_at_approach_deg.toFixed(1) : 0}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delta to Elongation Axis:</span>
                  <span className="font-mono text-indigo-300">{vessel.heading_axis_delta_deg.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* AIS Archive Tracking Metadata */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 border-b border-slate-800 pb-1.5">
              <Radio className="w-4 h-4 text-teal-400" />
              <span>AIS Track Continuity & Marine Cadastre Provenance</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
              <div>
                <span className="text-slate-400 block">Total AIS Fixes:</span>
                <strong className="font-mono">{vessel.n_fixes} reports</strong>
              </div>
              <div>
                <span className="text-slate-400 block">First Fix in Archive:</span>
                <span className="font-mono">{vessel.t_first}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Fix in Archive:</span>
                <span className="font-mono">{vessel.t_last}</span>
              </div>
              <div>
                <span className="text-slate-400 block">First 2km Arrival:</span>
                <span className="font-mono">{vessel.first_arrival_within_2km_utc || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">AIS Gap Length:</span>
                <span className="font-mono">{Number(vessel.ais_gap_len_s) > 0 ? `${Number(vessel.ais_gap_len_s).toFixed(0)} s` : 'None detected'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Crossed Slick Polygon:</span>
                <span className="font-mono">{vessel.crossed_slick_polygon ? 'YES' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Scientific Caveat Footer */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This score represents investigative ranking based on spatial-temporal correlation with the estimated backward drift locus. It is an algorithmic decision-support aid and must not be interpreted as definitive proof of legal liability.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-md font-semibold text-xs transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
