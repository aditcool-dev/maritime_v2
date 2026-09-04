'use client';

import React, { useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, Info, ExternalLink } from 'lucide-react';

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProvenanceModal({ isOpen, onClose }: ProvenanceModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-xl w-full p-6 text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 id="provenance-modal-title" className="text-base font-bold text-white">
              Scientific Provenance & Ethical Attribution Guidelines
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-[0.96] transition focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          {/* Critical Distinction */}
          <div className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-3 space-y-1.5">
            <strong className="text-amber-300 block text-sm">Critical Scientific Provenance Distinction:</strong>
            <p>
              The spill polygon is <strong>SYNTHETIC</strong>, created via forward Lagrangian particle advection (3000 particles) to act as a realistic stand-in for Sentinel-1/SAR remote sensing segmentation during this feasibility trial.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">✓ 100% Real:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>Incident release point/time</li>
                  <li>NOAA CO-OPS observed winds</li>
                  <li>NOAA CO-OPS observed currents</li>
                  <li>Marine Cadastre AIS tracks</li>
                </ul>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block mb-0.5">⚠ Synthetic:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>Spill polygon boundary</li>
                  <li>SAR front-end stand-in</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal / Ethical Language */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-slate-200 block">Responsible Presentation Protocol:</strong>
            <p className="text-slate-400">
              The algorithm&apos;s headline top-ranked vessel is <strong>THOR</strong> (due to alignment with the weak 1.25 aspect-ratio elongation axis), while the known collision vessels are <strong>ROSE BALSAM</strong> and <strong>VOYAGER</strong>. Therefore, this decision-support system strictly uses terminology like:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">Attribution Confidence</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">Investigative Priority</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">Model-Ranked Candidate</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1 italic">
              Terms like &quot;culprit&quot;, &quot;guilty&quot;, or &quot;responsible vessel&quot; are forbidden, as model scores do not establish legal liability.
            </p>
          </div>

          {/* Environmental Model Limits */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-slate-200 block">Environmental Drift Limits:</strong>
            <p className="text-slate-400">
              Backward advection uses single-point wind (Eagle Point 8771013) and single-point mid-depth current (Fred Hartman Bridge g08010) as spatially uniform fields without coastline boundary reflection, bathymetry friction, or spatial shear.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Understood & Acknowledged
          </button>
        </div>
      </div>
    </div>
  );
}
