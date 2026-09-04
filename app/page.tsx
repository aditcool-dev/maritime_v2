'use client';

import React, { useEffect, useState } from 'react';
import { CanonicalCaseData, CandidateVessel } from '@/lib/types';
import { fetchCanonicalCaseData } from '@/lib/data-loader';
import SpillMap from '@/components/SpillMap';
import IntelligencePanel from '@/components/IntelligencePanel';
import VesselDetailModal from '@/components/VesselDetailModal';
import WeightSimulator from '@/components/WeightSimulator';
import GroundTruthView from '@/components/GroundTruthView';
import AblationView from '@/components/AblationView';
import PipelineFlow from '@/components/PipelineFlow';
import ReportView from '@/components/ReportView';
import ProvenanceModal from '@/components/ProvenanceModal';
import EvidenceDossierModal from '@/components/EvidenceDossierModal';
import IndianOceanModal from '@/components/IndianOceanModal';
import { 
  Compass, 
  Layers, 
  ShieldCheck, 
  Sliders, 
  FileText, 
  GitFork, 
  Activity, 
  HelpCircle, 
  AlertTriangle,
  Loader2,
  Anchor,
  Ship,
  Sparkles,
  ChevronRight,
  Globe2,
  ShieldAlert,
  Printer
} from 'lucide-react';

export default function Home() {
  const [caseData, setCaseData] = useState<CanonicalCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'console' | 'flow' | 'ground-truth' | 'sensitivity' | 'report'>('console');

  // Selected Vessel for detail modal
  const [selectedVessel, setSelectedVessel] = useState<CandidateVessel | null>(null);
  const [inspectingVessel, setInspectingVessel] = useState<CandidateVessel | null>(null);

  // Highlighted slick age for backtrack trajectory (0.5 to 12.0)
  const [highlightedAge, setHighlightedAge] = useState<number>(3.0); // Default to 3.0h (incident true age)

  // Pipeline flow step to open
  const [flowInitialStep, setFlowInitialStep] = useState<number>(0);

  // Provenance Modal state
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  // SIH Winner Edge Feature States
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isIndianOceanModalOpen, setIsIndianOceanModalOpen] = useState(false);
  const [operationalDomain, setOperationalDomain] = useState<'houston' | 'indian_ocean'>('houston');
  const [leewayFactor, setLeewayFactor] = useState(0.032);
  const [coriolisAngle, setCoriolisAngle] = useState(4.5);

  // Load canonical case data on mount
  useEffect(() => {
    fetchCanonicalCaseData()
      .then((data) => {
        setCaseData(data);
        if (data.candidates && data.candidates.length > 0) {
          setSelectedVessel(data.candidates[0]); // Default to #1 (THOR)
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load canonical case:', err);
        setError(err.message || 'Failed to load case data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6 select-none">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Branded Radar Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Compass className="w-5 h-5 animate-spin duration-3000" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-snug">
                Maritime Forensic Spill Attribution
              </h2>
              <p className="text-[11px] font-mono text-cyan-400">SIH26143 • Houston Ship Channel</p>
            </div>
          </div>

          {/* Telemetry Stage Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <div className="flex-1">
                <span className="text-slate-200 font-medium">Ingesting Sentinel-1 SAR Slick Geometry</span>
                <p className="text-[10px] text-slate-400 font-mono">EPSG:32615 UTM Zone 15N • 2.056 km²</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <div className="flex-1">
                <span className="text-slate-200 font-medium">Solving Lagrangian Backward Drift Physics</span>
                <p className="text-[10px] text-slate-400 font-mono">u_slick = u_current + α·R(θ)·u_wind (α=3.2%)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="flex-1">
                <span className="text-slate-200 font-medium">Indexing Candidate AIS Broadcasts</span>
                <p className="text-[10px] text-slate-400 font-mono">553 vessels scored • Houston Ship Channel</p>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full w-2/3 animate-pulse rounded-full" />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Initializing Telemetry Engine</span>
              <span>Readying Map Canvas</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="bg-slate-900 border border-rose-800/80 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-300">Unable to load case data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{error || 'Missing case files in public/data/'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition-all shadow-md focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Retry Loading Telemetry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-30 shrink-0 select-none">
        {/* Left Brand & Case Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                  Maritime Spill Attribution
                </h1>
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-cyan-400 border border-slate-700 px-1.5 py-0.2 rounded font-semibold hidden sm:inline-block">
                  SIH26143
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline-block leading-none mt-0.5">
                Lagrangian Drift & AIS Candidate Scoring
              </span>
            </div>
          </div>

          {/* Case metadata pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-xs font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Case: {caseData.report.case.case_id}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">2019-05-10 23:20 UTC</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80 text-xs">
          <button
            id="nav-console-tab"
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === 'console'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Investigation Console</span>
            <span className="md:hidden">Console</span>
          </button>

          <button
            id="nav-flow-tab"
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === 'flow'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Pipeline Flow</span>
            <span className="md:hidden">Pipeline</span>
          </button>

          <button
            id="nav-ground-truth-tab"
            onClick={() => setActiveTab('ground-truth')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === 'ground-truth'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Ground-Truth Validation</span>
            <span className="md:hidden">Validation</span>
          </button>

          <button
            id="nav-sensitivity-tab"
            onClick={() => setActiveTab('sensitivity')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === 'sensitivity'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Weight Simulator & Ablation</span>
            <span className="md:hidden">Simulator</span>
          </button>

          <button
            id="nav-report-tab"
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === 'report'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Case Report</span>
            <span className="md:hidden">Report</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Operational Domain: INCOIS & MOSDAC Modal Button */}
          <button
            id="domain-incois-btn"
            onClick={() => setIsIndianOceanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-950/70 hover:bg-orange-900/80 active:scale-[0.98] text-orange-300 border border-orange-600/50 text-xs font-semibold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-orange-400"
            title="National Maritime Operational Integration: INCOIS ROMS & ISRO MOSDAC"
          >
            <Globe2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline">INCOIS & MOSDAC</span>
            <span className="sm:hidden">INCOIS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          </button>

          {/* Admiralty & PSC Legal Dossier Export Button */}
          <button
            id="export-dossier-nav-btn"
            onClick={() => setIsDossierOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md ring-1 ring-emerald-400/40 focus-visible:ring-2 focus-visible:ring-emerald-400"
            title="Export Maritime Admiralty Court & Port State Control (PSC) Evidence Dossier"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Export Evidence Dossier (PDF)</span>
            <span className="sm:hidden">Dossier</span>
          </button>

          <button
            id="provenance-disclaimer-btn"
            onClick={() => setIsProvenanceOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 border border-slate-700 text-xs font-medium transition shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="Scientific Provenance & Ethical Attribution Guidelines"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xl:inline">Provenance</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 w-full overflow-hidden relative">
        {activeTab === 'console' && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Top Workspace Area: Map + Intelligence Panel */}
            <div className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Left/Center Interactive Map (approx 68% on desktop) */}
              <div className="w-full h-[55%] lg:h-full lg:w-[68%] relative">
                <SpillMap
                  caseData={caseData}
                  selectedVessel={selectedVessel}
                  onSelectVessel={(v) => {
                    setSelectedVessel(v);
                  }}
                  highlightedAge={highlightedAge}
                  onAgeChange={setHighlightedAge}
                  leewayFactor={leewayFactor}
                  onLeewayChange={setLeewayFactor}
                  coriolisAngle={coriolisAngle}
                  onCoriolisChange={setCoriolisAngle}
                />
              </div>

              {/* Right Candidate Intelligence Panel (approx 32% on desktop) */}
              <div className="w-full h-[45%] lg:h-full lg:w-[32%] overflow-hidden">
                <IntelligencePanel
                  candidates={caseData.candidates}
                  report={caseData.report}
                  selectedVessel={selectedVessel}
                  onSelectVessel={setSelectedVessel}
                  onOpenInspector={(v) => setInspectingVessel(v)}
                />
              </div>
            </div>

            {/* Bottom Pipeline Trail Bar: SATELLITE -> SPILL -> ORIGIN -> AIS -> ATTRIBUTION */}
            <div className="h-12 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-between z-20 shrink-0 select-none overflow-x-auto gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 text-slate-400 font-mono text-[11px] shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-semibold text-slate-300">PIPELINE TRAIL</span>
                </div>

                {/* Stage 1: SATELLITE */}
                <button
                  onClick={() => {
                    setFlowInitialStep(0);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0 group"
                  title="Satellite SAR scene loading (Stage 01)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-cyan-300">01</span>
                  <span className="font-semibold text-[11px]">SATELLITE</span>
                  <span className="text-[10px] text-slate-500 hidden xl:inline">2.06 km²</span>
                </button>

                <span className="text-slate-600 text-xs shrink-0">→</span>

                {/* Stage 2: SPILL */}
                <button
                  onClick={() => {
                    setFlowInitialStep(2);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0 group"
                  title="Synthetic spill polygon stand-in (Stage 03 • Click for pipeline flow)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-amber-300">02</span>
                  <span className="font-semibold text-[11px]">SPILL</span>
                  <span className="text-[10px] text-amber-500/80 font-mono hidden xl:inline">SYNTHETIC</span>
                </button>

                <span className="text-slate-600 text-xs shrink-0">→</span>

                {/* Stage 3: DRIFT PHYSICS (Leeway Eq.) */}
                <button
                  onClick={() => {
                    setFlowInitialStep(5);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0 group"
                  title="Standard Leeway Drift Equation: u_slick = u_current + α·R(θ)·u_wind (α ≈ 0.03–0.035, θ ∈ [0°, 10°] Coriolis)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-blue-300">03</span>
                  <span className="font-semibold text-[11px]">DRIFT PHYSICS</span>
                  <span className="text-[10px] text-sky-400 font-mono hidden xl:inline">α={(leewayFactor * 100).toFixed(1)}% Leeway</span>
                </button>

                <span className="text-slate-600 text-xs shrink-0">→</span>

                {/* Stage 4: AIS */}
                <button
                  onClick={() => {
                    setFlowInitialStep(7);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0 group"
                  title="Marine Cadastre AIS track harvesting (Stage 08)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-purple-300">04</span>
                  <span className="font-semibold text-[11px]">AIS</span>
                  <span className="text-[10px] text-slate-500 hidden xl:inline">553 vessels</span>
                </button>

                <span className="text-slate-600 text-xs shrink-0">→</span>

                {/* Stage 5: ATTRIBUTION */}
                <button
                  onClick={() => {
                    setFlowInitialStep(9);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0 group"
                  title="Multi-factor candidate scoring engine (Stage 10)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-emerald-300">05</span>
                  <span className="font-semibold text-[11px]">ATTRIBUTION</span>
                  <span className="text-[10px] text-emerald-400 font-mono hidden xl:inline">THOR (0.7461)</span>
                </button>
              </div>

              {/* Right Trail Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setFlowInitialStep(0);
                    setActiveTab('flow');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded text-xs font-semibold transition"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Inspect 10-Step Pipeline Architecture</span>
                  <span className="sm:hidden">Pipeline Flow</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="w-full h-full overflow-y-auto">
            <PipelineFlow 
              report={caseData.report} 
              initialStep={flowInitialStep}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </div>
        )}

        {activeTab === 'ground-truth' && (
          <div className="w-full h-full overflow-y-auto">
            <GroundTruthView
              report={caseData.report}
              candidates={caseData.candidates}
              onSelectVessel={(v) => {
                setSelectedVessel(v);
                setInspectingVessel(v);
              }}
            />
          </div>
        )}

        {activeTab === 'sensitivity' && (
          <div className="w-full h-full overflow-y-auto space-y-6">
            <WeightSimulator
              candidates={caseData.candidates}
              report={caseData.report}
              onSelectVessel={(v) => {
                setSelectedVessel(v);
                setInspectingVessel(v);
              }}
            />
            <AblationView
              report={caseData.report}
              ageResolved={caseData.ageResolved}
              onAgeSelect={(age) => {
                setHighlightedAge(age);
                setActiveTab('console');
              }}
            />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="w-full h-full overflow-y-auto">
            <ReportView 
              report={caseData.report} 
              onOpenDossier={() => setIsDossierOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Vessel Detail Inspector Modal */}
      {inspectingVessel && (
        <VesselDetailModal
          vessel={inspectingVessel}
          report={caseData.report}
          onClose={() => setInspectingVessel(null)}
        />
      )}

      {/* Scientific Provenance Modal */}
      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
      />

      {/* Admiralty & Port State Control Evidence Dossier Modal */}
      <EvidenceDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        caseData={caseData}
        selectedVessel={selectedVessel}
        leewayFactor={leewayFactor}
        coriolisAngle={coriolisAngle}
      />

      {/* National Operational Maritime Domain: INCOIS & MOSDAC Modal */}
      <IndianOceanModal
        isOpen={isIndianOceanModalOpen}
        onClose={() => setIsIndianOceanModalOpen(false)}
        activeDomain={operationalDomain}
        onSelectDomain={(domain) => setOperationalDomain(domain)}
      />
    </main>
  );
}
