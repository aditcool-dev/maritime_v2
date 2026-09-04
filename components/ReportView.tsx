'use client';

import React, { useState } from 'react';
import { CaseReport } from '@/lib/types';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Wind, 
  Waves, 
  AlertCircle, 
  ShieldAlert, 
  BookOpen, 
  Terminal
} from 'lucide-react';

interface ReportViewProps {
  report: CaseReport;
  onOpenDossier?: () => void;
}

export default function ReportView({ report, onOpenDossier }: ReportViewProps) {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.case.case_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="report-audit-view" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400 shrink-0" />
            <h2 className="text-xl font-bold tracking-tight text-white">Investigation Case Report & Scientific Audit</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Canonical case <code className="font-mono text-cyan-300">{report.case.case_id}</code> • Comprehensive environmental, spatial, and scoring audit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenDossier && (
            <button
              id="export-dossier-pdf-btn"
              onClick={onOpenDossier}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition shadow-lg ring-1 ring-emerald-400/40 focus-visible:ring-2 focus-visible:ring-emerald-400"
              title="Open Maritime Admiralty Court & Port State Control (PSC) Legal Dossier"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Export Evidence Dossier (PDF)</span>
            </button>
          )}

          <button
            id="copy-report-json-btn"
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
          </button>

          <button
            id="download-report-json-btn"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition shadow focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>

          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showRawJson ? 'Hide JSON' : 'Raw JSON'}</span>
          </button>
        </div>
      </div>

      {/* Admiralty & PSC Legal Readiness Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Maritime Admiralty Court & PSC Legal Formatting
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Formalized evidentiary package complete with <strong>cryptographic SHA-256 chain of custody</strong>, <strong>ISO 6709 coordinates</strong> (<code className="font-mono text-cyan-300">+{report.scene.centroid_lat.toFixed(5)}{report.scene.centroid_lon.toFixed(5)}/</code>), <strong>MOSDAC/Sentinel-1 satellite scene acquisition IDs</strong>, and statutory signature blocks under Rule 65B Indian Evidence Act & Admiralty Claims standards.
          </p>
        </div>

        {onOpenDossier && (
          <button
            onClick={onOpenDossier}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-md shrink-0 flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Launch Evidence Dossier</span>
          </button>
        )}
      </div>

      {/* Case Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case & Incident Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Case Overview</span>
          </h3>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Incident Name:</span>
              <span className="font-semibold text-right max-w-xs">{report.case.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Observation Time:</span>
              <span className="font-mono">{report.case.observation_time_utc} UTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Centroid Coordinates:</span>
              <span className="font-mono">{report.scene.centroid_lat.toFixed(5)}°N, {report.scene.centroid_lon.toFixed(5)}°W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Observed Spill Area:</span>
              <span className="font-mono font-bold text-cyan-300">{report.scene.area_km2} km²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Perimeter:</span>
              <span className="font-mono">{report.scene.perimeter_km} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CRS:</span>
              <span className="font-mono">EPSG:{report.case.metric_epsg} (UTM Zone 15N)</span>
            </div>
          </div>
        </div>

        {/* Environmental Forcing Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-400" />
            <span>NOAA CO-OPS Environmental Forcing</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-sky-400 uppercase font-semibold block">Wind Observation</span>
              <div className="font-bold text-slate-200">{report.environment.wind_station.name.split(',')[0]}</div>
              <div className="text-slate-400 text-[11px]">Station #{report.environment.wind_station.id}</div>
              <div className="pt-1 text-[11px] font-mono text-slate-300">
                Vector Mean: <strong>{report.environment.wind.vector_mean_speed_ms} m/s</strong> @ <strong>{report.environment.wind.vector_mean_toward_deg}°</strong>
              </div>
              <div className="text-[10px] text-slate-500">{report.environment.wind.n_samples} samples</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-teal-400 uppercase font-semibold block">Current Observation</span>
              <div className="font-bold text-slate-200">{report.environment.current_station.name.split(',')[0]}</div>
              <div className="text-slate-400 text-[11px]">Station #{report.environment.current_station.id} (Bin {report.environment.current_station.bin})</div>
              <div className="pt-1 text-[11px] font-mono text-slate-300">
                Vector Mean: <strong>{report.environment.current.vector_mean_speed_ms} m/s</strong> @ <strong>{report.environment.current.vector_mean_toward_deg}°</strong>
              </div>
              <div className="text-[10px] text-slate-500">{report.environment.current.n_samples} samples</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            * {report.environment.limitation}
          </p>
        </div>
      </div>

      {/* Canonical Top 10 Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Official Pipeline Candidate Ranking (Top 10)</h3>
          <span className="text-xs text-slate-400 font-mono">553 vessels scored</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Vessel Name</th>
                <th className="py-2.5 px-3">MMSI</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Composite Score</th>
                <th className="py-2.5 px-3 text-right">Proximity (40%)</th>
                <th className="py-2.5 px-3 text-right">Heading (30%)</th>
                <th className="py-2.5 px-3 text-right">Temporal (20%)</th>
                <th className="py-2.5 px-3 text-right">Matched Age</th>
                <th className="py-2.5 px-3 text-right">Distance at Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {report.ranking_top10.map((v) => {
                const isCollisionVessel = v.MMSI === 356144000 || v.MMSI === 366996020 || v.MMSI === '356144000' || v.MMSI === '366996020';
                return (
                  <tr key={v.MMSI} className={`hover:bg-slate-850 transition ${isCollisionVessel ? 'bg-amber-950/20' : ''}`}>
                    <td className="py-2.5 px-3 font-bold font-mono">#{v.rank}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{v.name}</span>
                        {isCollisionVessel && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-900/60 text-amber-300 font-normal">
                            Incident Tow/Ship
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{v.MMSI}</td>
                    <td className="py-2.5 px-3 text-slate-300 capitalize">{v.type_label}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">{v.composite_score.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-400">{v.score_proximity.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-400">{v.score_heading.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{v.score_temporal.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">{v.matched_age_h.toFixed(1)} h</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">{v.dist_at_origin_time_m.toFixed(0)} m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Caveats & Limitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Scientific Caveats & Technical Limitations</span>
        </h3>
        <div className="space-y-2">
          {report.caveats.map((caveat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center shrink-0 text-[11px] font-bold">
                {idx + 1}
              </span>
              <p className="leading-relaxed">{caveat}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Raw JSON Audit Inspector */}
      {showRawJson && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Raw JSON Telemetry Stream ({report.case.case_id})</span>
            </h3>
            <button
              onClick={handleCopyJson}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 bg-slate-950 rounded border border-slate-800"
            >
              {copied ? 'Copied!' : 'Copy Stream'}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-96 leading-relaxed">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
