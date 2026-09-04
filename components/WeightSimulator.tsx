'use client';

import React, { useState, useMemo } from 'react';
import { CandidateVessel, CaseReport } from '@/lib/types';
import { Sliders, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Info, Wind, Waves, Compass, Sparkles } from 'lucide-react';

interface WeightSimulatorProps {
  candidates: CandidateVessel[];
  report: CaseReport;
  onSelectVessel: (vessel: CandidateVessel) => void;
}

export default function WeightSimulator({
  candidates,
  report,
  onSelectVessel,
}: WeightSimulatorProps) {
  const [wProx, setWProx] = useState(40);
  const [wHead, setWHead] = useState(30);
  const [wTemp, setWTemp] = useState(20);
  const [wAis, setWAis] = useState(10);

  // Leeway drift physics parameters
  const [leewayAlpha, setLeewayAlpha] = useState(0.032);
  const [coriolisAngle, setCoriolisAngle] = useState(4.5);

  const [resetToast, setResetToast] = useState(false);

  const presets = [
    {
      name: 'Canonical Baseline',
      desc: '40% Proximity / 30% Heading / 20% Temporal / 10% AIS',
      weights: { prox: 40, head: 30, temp: 20, ais: 10 },
    },
    {
      name: 'No-Heading Sensitivity',
      desc: 'Removes heading (slick aspect ratio 1.25). Rose Balsam becomes #1!',
      weights: { prox: 40, head: 0, temp: 20, ais: 10 },
    },
    {
      name: 'Proximity Dominant',
      desc: '70% Proximity / 10% Heading / 10% Temporal / 10% AIS',
      weights: { prox: 70, head: 10, temp: 10, ais: 10 },
    },
    {
      name: 'Temporal First',
      desc: '10% Proximity / 10% Heading / 70% Temporal / 10% AIS',
      weights: { prox: 10, head: 10, temp: 70, ais: 10 },
    },
  ];

  const totalRawWeight = wProx + wHead + wTemp + wAis;

  const normalizeWeights = () => {
    if (totalRawWeight === 0) {
      setWProx(25); setWHead(25); setWTemp(25); setWAis(25);
      return;
    }
    const factor = 100 / totalRawWeight;
    setWProx(Math.round(wProx * factor));
    setWHead(Math.round(wHead * factor));
    setWTemp(Math.round(wTemp * factor));
    setWAis(Math.round(wAis * factor));
  };

  const handleResetAll = () => {
    applyPreset(presets[0]);
    setLeewayAlpha(0.032);
    setCoriolisAngle(4.5);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2500);
  };

  // Re-rank candidates dynamically
  const reRankedCandidates = useMemo(() => {
    const totalWeight = (wProx + wHead + wTemp + wAis) || 1;
    const nwProx = wProx / totalWeight;
    const nwHead = wHead / totalWeight;
    const nwTemp = wTemp / totalWeight;
    const nwAis = wAis / totalWeight;

    const scored = candidates.map((v) => {
      const simulatedScore =
        v.score_proximity * nwProx +
        v.score_heading * nwHead +
        v.score_temporal * nwTemp +
        v.score_ais_continuity * nwAis;
      return {
        ...v,
        simulatedScore,
      };
    });

    scored.sort((a, b) => b.simulatedScore - a.simulatedScore);

    return scored.map((v, index) => ({
      ...v,
      newRank: index + 1,
      rankDelta: v.rank - (index + 1), // positive means climbed
    }));
  }, [candidates, wProx, wHead, wTemp, wAis]);

  const top10Simulated = reRankedCandidates.slice(0, 10);

  const applyPreset = (preset: typeof presets[0]) => {
    setWProx(preset.weights.prox);
    setWHead(preset.weights.head);
    setWTemp(preset.weights.temp);
    setWAis(preset.weights.ais);
  };

  const isNoHeading = wHead === 0;

  // Dynamic Leeway Drift Vector Calculation
  const driftPhysics = useMemo(() => {
    const currentSpeed = report.environment.current.vector_mean_speed_ms;
    const currentDir = report.environment.current.vector_mean_toward_deg;
    const windSpeed = report.environment.wind.vector_mean_speed_ms;
    const windDir = report.environment.wind.vector_mean_toward_deg;

    // Wind vector components (oceanographic toward direction)
    const windRad = ((90 - windDir) * Math.PI) / 180;
    const windU = windSpeed * Math.cos(windRad);
    const windV = windSpeed * Math.sin(windRad);

    // Apply Coriolis deflection angle theta to wind vector (rightward in Northern Hemisphere)
    const coriolisRad = (coriolisAngle * Math.PI) / 180;
    const windUDeflected = windU * Math.cos(coriolisRad) - windV * Math.sin(coriolisRad);
    const windVDeflected = windU * Math.sin(coriolisRad) + windV * Math.cos(coriolisRad);

    // Current vector components (toward direction)
    const currentRad = ((90 - currentDir) * Math.PI) / 180;
    const currentU = currentSpeed * Math.cos(currentRad);
    const currentV = currentSpeed * Math.sin(currentRad);

    // Net slick advection vector: u_slick = u_current + alpha * R(theta) * u_wind
    const netU = currentU + leewayAlpha * windUDeflected;
    const netV = currentV + leewayAlpha * windVDeflected;
    const netSpeed = Math.hypot(netU, netV);
    const netHeading = (90 - (Math.atan2(netV, netU) * 180) / Math.PI + 360) % 360;

    const windageSpeed = windSpeed * leewayAlpha;

    return {
      currentSpeed,
      currentDir,
      windSpeed,
      windDir,
      windageSpeed,
      netSpeed,
      netHeading,
    };
  }, [report.environment, leewayAlpha, coriolisAngle]);

  return (
    <div id="weight-simulator-view" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="text-xl font-bold tracking-tight text-white">Scoring Weight Simulator & Sensitivity Lab</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test how varying proximity, heading, temporal, and AIS continuity weights impacts candidate attribution rankings in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resetToast && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg animate-in fade-in duration-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Baseline Restored</span>
            </span>
          )}
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to Baseline</span>
          </button>
        </div>
      </div>

      {/* SIH Winner Edge: Drift Physics & Leeway Equation Controls */}
      <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 p-5 rounded-xl border border-sky-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-900/60 border border-sky-500/40 text-sky-400 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Windage Drift Factor & Standard Leeway Equation
                </h3>
                <span className="text-[10px] font-mono uppercase bg-sky-950 text-sky-300 border border-sky-700/60 px-2 py-0.5 rounded font-semibold">
                  Governing Physics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Governing law: <code className="font-mono text-cyan-300">u_slick = u_current + α · R(θ) · u_wind</code> (empirical leeway coefficient <code className="font-mono text-amber-300">α ≈ 0.030–0.035</code> and <code className="font-mono text-emerald-300">θ ∈ [0°, 10°]</code> Coriolis deflection).
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-sky-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Resultant Advection: </span>
            <strong>{driftPhysics.netSpeed.toFixed(3)} m/s</strong>
            <span className="text-slate-400"> @ {driftPhysics.netHeading.toFixed(1)}°</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Leeway Factor Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sky-400">Windage Factor (α)</span>
              <span className="font-mono font-bold bg-sky-950 px-2 py-0.5 rounded text-sky-300 border border-sky-800">
                {(leewayAlpha * 100).toFixed(1)}% ({leewayAlpha.toFixed(3)})
              </span>
            </div>
            <input
              type="range"
              min="0.020"
              max="0.050"
              step="0.001"
              value={leewayAlpha}
              onChange={(e) => setLeewayAlpha(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2.0%</span>
              <span className="text-amber-400 font-semibold">Standard: 3.0%–3.5%</span>
              <span>5.0%</span>
            </div>
          </div>

          {/* Coriolis Deflection Angle Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-400">Coriolis Deflection (θ)</span>
              <span className="font-mono font-bold bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-800">
                {coriolisAngle.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={coriolisAngle}
              onChange={(e) => setCoriolisAngle(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0° (None)</span>
              <span className="text-emerald-400 font-semibold">Standard: 3°–5° Right</span>
              <span>10° (Max)</span>
            </div>
          </div>

          {/* Current Vector Readout */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <Waves className="w-3.5 h-3.5" />
              <span>Hydrodynamic Current</span>
            </div>
            <div className="font-mono text-xs text-slate-200 mt-1">
              <div>Speed: <strong>{driftPhysics.currentSpeed.toFixed(3)} m/s</strong></div>
              <div>Heading: <strong>{driftPhysics.currentDir.toFixed(1)}° (toward)</strong></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">INCOIS ROMS / NOAA ADCP</div>
          </div>

          {/* Windage Contribution Readout */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Aerodynamic Windage</span>
            </div>
            <div className="font-mono text-xs text-slate-200 mt-1">
              <div>Wind: <strong>{driftPhysics.windSpeed.toFixed(2)} m/s</strong></div>
              <div>Leeway Drift: <strong>{driftPhysics.windageSpeed.toFixed(4)} m/s</strong></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">α · u_wind with R(θ) rotation</div>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.map((preset) => {
          const isActive =
            wProx === preset.weights.prox &&
            wHead === preset.weights.head &&
            wTemp === preset.weights.temp &&
            wAis === preset.weights.ais;

          return (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-lg border text-left transition ${
                isActive
                  ? 'bg-cyan-950/60 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="font-bold text-xs text-white flex items-center justify-between">
                <span>{preset.name}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">{preset.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Interactive Weight Sliders */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Adjust Component Weights</h3>
            <p className="text-xs text-slate-400">Move sliders to test algorithmic stability and sensitivity shifts.</p>
          </div>

          <div className="flex items-center gap-2">
            {totalRawWeight === 100 ? (
              <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Sum: 100% (Balanced)</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-300 bg-amber-950/70 border border-amber-500/30 px-2.5 py-1 rounded-md">
                  Sum: {totalRawWeight}% (Normalized in model)
                </span>
                <button
                  onClick={normalizeWeights}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-cyan-300 border border-slate-700 rounded-md text-[11px] font-semibold transition"
                  title="Scale weights proportionately to sum to exactly 100%"
                >
                  Normalize to 100%
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Proximity Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-400">Proximity</span>
              <span className="font-mono font-bold bg-blue-950 px-2 py-0.5 rounded text-blue-300 border border-blue-800">
                {wProx}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={wProx}
              onChange={(e) => setWProx(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] text-slate-500 block leading-tight">
              Scale: 1500m e-fold. Distance to origin.
            </span>
          </div>

          {/* Heading Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-indigo-400">Heading</span>
              <span className="font-mono font-bold bg-indigo-950 px-2 py-0.5 rounded text-indigo-300 border border-indigo-800">
                {wHead}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={wHead}
              onChange={(e) => setWHead(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[10px] text-slate-500 block leading-tight">
              Alignment with spill elongation axis (72.3°).
            </span>
          </div>

          {/* Temporal Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-amber-400">Temporal</span>
              <span className="font-mono font-bold bg-amber-950 px-2 py-0.5 rounded text-amber-300 border border-amber-800">
                {wTemp}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={wTemp}
              onChange={(e) => setWTemp(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 block leading-tight">
              Scale: 90min (5400s) e-fold from origin time.
            </span>
          </div>

          {/* AIS Continuity Slider */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-rose-400">AIS Continuity</span>
              <span className="font-mono font-bold bg-rose-950 px-2 py-0.5 rounded text-rose-300 border border-rose-800">
                {wAis}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={wAis}
              onChange={(e) => setWAis(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="text-[10px] text-slate-500 block leading-tight">
              Penalizes AIS transmission blackouts / gaps.
            </span>
          </div>
        </div>

        {/* Insight Notice */}
        {isNoHeading && (
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/50 rounded-lg text-xs text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-300 block mb-0.5">Sensitivity Finding (No Heading):</strong>
              <p className="leading-relaxed">
                Because this spill has an aspect ratio of only <strong>1.25</strong> (nearly circular slick), the elongation axis is mathematically ill-conditioned. Disabling the heading component moves <strong>ROSE BALSAM</strong> (the actual colliding outbound ship) straight to <strong>Rank #1</strong> with a composite score of <strong>0.7927</strong>!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Simulated Live Re-Ranking Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Live Top 10 Candidate Re-Ranking</h3>
            <p className="text-xs text-slate-400">Calculated over all 553 vessels using your active weights.</p>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-300">
            Active: {wProx}% P / {wHead}% H / {wTemp}% T / {wAis}% A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">New Rank</th>
                <th className="py-3 px-4">Baseline Rank</th>
                <th className="py-3 px-4">Vessel Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Simulated Score</th>
                <th className="py-3 px-4 text-right">Baseline Score</th>
                <th className="py-3 px-4 text-right">Proximity</th>
                <th className="py-3 px-4 text-right">Heading</th>
                <th className="py-3 px-4 text-right">Temporal</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {top10Simulated.map((vessel) => {
                const isCollisionVessel = vessel.MMSI === '356144000' || vessel.MMSI === '366996020';

                return (
                  <tr
                    key={vessel.MMSI}
                    className={`hover:bg-slate-800/60 transition ${
                      isCollisionVessel ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                            vessel.newRank === 1
                              ? 'bg-cyan-600 text-white font-bold'
                              : isCollisionVessel
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          #{vessel.newRank}
                        </span>
                        {vessel.rankDelta > 0 && (
                          <span className="text-emerald-400 font-mono text-[10px]">
                            ▲+{vessel.rankDelta}
                          </span>
                        )}
                        {vessel.rankDelta < 0 && (
                          <span className="text-rose-400 font-mono text-[10px]">
                            ▼{vessel.rankDelta}
                          </span>
                        )}
                        {vessel.rankDelta === 0 && (
                          <span className="text-slate-500 font-mono text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">#{vessel.rank}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{vessel.name}</span>
                        {isCollisionVessel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-500/40">
                            Ground Truth
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 capitalize">{vessel.type_label}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-cyan-300">
                      {vessel.simulatedScore.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {vessel.composite_score.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-400">
                      {vessel.score_proximity.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-400">
                      {vessel.score_heading.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-400">
                      {vessel.score_temporal.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectVessel(vessel)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
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
