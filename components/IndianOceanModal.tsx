'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe2, 
  Satellite, 
  Waves, 
  Wind, 
  ShieldAlert, 
  ExternalLink, 
  CheckCircle2, 
  Database, 
  Server, 
  Radio, 
  Ship, 
  MapPin, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface IndianOceanModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDomain: 'houston' | 'indian_ocean';
  onSelectDomain: (domain: 'houston' | 'indian_ocean') => void;
}

export default function IndianOceanModal({
  isOpen,
  onClose,
  activeDomain,
  onSelectDomain,
}: IndianOceanModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'incois' | 'mosdac' | 'corridors'>('overview');

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
      aria-labelledby="indian-ocean-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[750] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="indian-ocean-title" className="text-sm font-bold text-white">
                  Indian Ocean National Integration: INCOIS & ISRO MOSDAC
                </h3>
                <span className="text-[10px] uppercase font-mono bg-orange-950 text-orange-300 border border-orange-700/60 px-1.5 py-0.5 rounded font-semibold">
                  SIH Competitive Edge
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operational integration with Indian National Centre for Ocean Information Services (INCOIS) and ISRO MOSDAC.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 active:scale-[0.96] transition focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Subtabs */}
        <div className="px-6 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs overflow-x-auto shrink-0 py-2">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeSubTab === 'overview'
                ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Operational Architecture</span>
          </button>

          <button
            onClick={() => setActiveSubTab('incois')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeSubTab === 'incois'
                ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-sky-400" />
            <span>INCOIS ROMS / OON Hydrodynamics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mosdac')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeSubTab === 'mosdac'
                ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Satellite className="w-3.5 h-3.5 text-amber-400" />
            <span>ISRO MOSDAC & Sentinel-1 SAR</span>
          </button>

          <button
            onClick={() => setActiveSubTab('corridors')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeSubTab === 'corridors'
                ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Indian EEZ High-Risk Corridors</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-xs leading-relaxed">
          
          {/* Subtab 1: Operational Architecture */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* Context Banner */}
              <div className="bg-gradient-to-r from-orange-950/40 via-slate-900 to-cyan-950/40 p-4 rounded-xl border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="font-bold text-orange-300 uppercase tracking-wider text-xs">
                    SIH Operational Reality: From US NOAA to Indian National Ocean Services
                  </span>
                </div>
                <p className="text-slate-300">
                  Judges from <strong>ISRO/NRSC</strong>, <strong>Indian Coast Guard (ICG)</strong>, and <strong>Directorate General of Shipping (DG Shipping)</strong> expect direct alignment with India&apos;s maritime monitoring infrastructure. Our architecture connects directly into the Indian National Center for Ocean Information Services (INCOIS, Hyderabad) and ISRO&apos;s Meteorological and Oceanographic Satellite Data Archival Centre (MOSDAC).
                </p>
              </div>

              {/* Architecture Triad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-600/40 text-sky-400 flex items-center justify-center">
                    <Waves className="w-4 h-4" />
                  </div>
                  <strong className="text-white block text-sm">1. INCOIS ROMS Currents</strong>
                  <p className="text-slate-400 text-[11px]">
                    Assimilation of Regional Ocean Modeling System (ROMS) 2.5km high-resolution hydrodynamic currents and OON moored buoy ADCP feeds.
                  </p>
                  <div className="text-[10px] font-mono text-sky-400 bg-sky-950/50 p-1.5 rounded border border-sky-800/40">
                    Endpoint: tds.incois.gov.in/las/
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-600/40 text-amber-400 flex items-center justify-center">
                    <Satellite className="w-4 h-4" />
                  </div>
                  <strong className="text-white block text-sm">2. ISRO MOSDAC SAR</strong>
                  <p className="text-slate-400 text-[11px]">
                    Near-real-time ingestion of Sentinel-1 C-Band and EOS-04 / RISAT-1A SAR imagery dark-spot segmentation over the Indian EEZ.
                  </p>
                  <div className="text-[10px] font-mono text-amber-400 bg-amber-950/50 p-1.5 rounded border border-amber-800/40">
                    Portal: mosdac.gov.in/sar-ocean
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <strong className="text-white block text-sm">3. ICG & DG Shipping AIS</strong>
                  <p className="text-slate-400 text-[11px]">
                    National Automatic Identification System (NAIS) network spanning 74 coastal radar/AIS stations and coastal surveillance networks.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 p-1.5 rounded border border-emerald-800/40">
                    Network: ICG MRCC / DG Shipping
                  </div>
                </div>
              </div>

              {/* Dual Mode Domain Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-200">Active Operational Maritime Domain</strong>
                  <span className="text-[11px] font-mono text-slate-400">Current: {activeDomain === 'houston' ? 'Ground-Truth Benchmark (Houston)' : 'Indian Ocean (INCOIS/MOSDAC)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => onSelectDomain('houston')}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      activeDomain === 'houston'
                        ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Canonical Ground-Truth Case</span>
                      {activeDomain === 'houston' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upper Galveston Bay collision benchmark (May 10, 2019). Known collision ground truth (THOR vs. ROSE BALSAM/VOYAGER) with real NOAA currents.
                    </p>
                  </button>

                  <button
                    onClick={() => onSelectDomain('indian_ocean')}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      activeDomain === 'indian_ocean'
                        ? 'bg-orange-950/70 border-orange-500 ring-1 ring-orange-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-orange-300">Indian EEZ Operational Domain</span>
                      {activeDomain === 'indian_ocean' && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Integrated INCOIS ROMS hydrodynamics + ISRO MOSDAC SAR streams + Indian Coast Guard Maritime Rescue Coordination Center protocols.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: INCOIS Hydrodynamics */}
          {activeSubTab === 'incois' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Waves className="w-4 h-4" />
                  <span>INCOIS Hydrodynamic ROMS & Ocean Observation Network (OON)</span>
                </div>
                <p className="text-slate-300">
                  INCOIS operational forecasting runs the Regional Ocean Modeling System (ROMS) configured over the Indian Ocean domain at <strong>2.5 km spatial resolution</strong>, driven by NCMRWF / ECMWF atmospheric winds and tides.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                  <span className="text-sky-400 font-bold uppercase text-[10px] block">INCOIS ROMS Integration Parameters</span>
                  <div className="text-slate-300 space-y-1">
                    <div>• Model: ROMS 3.8 (Regional Ocean Modeling System)</div>
                    <div>• Spatial Grid: 0.025° x 0.025° (~2.5 km resolution)</div>
                    <div>• Vertical Layers: 40 stretched terrain-following (sigma)</div>
                    <div>• Surface Layer Skin: Layer 40 used for slick advection</div>
                    <div>• Temporal Cadence: Hourly forecast cycles (00Z & 12Z)</div>
                    <div>• Data Protocol: OPeNDAP / THREDDS Data Server (TDS)</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                  <span className="text-emerald-400 font-bold uppercase text-[10px] block">In-Situ OON Buoy & Coastal ADCP Ingestion</span>
                  <div className="text-slate-300 space-y-1">
                    <div>• Moored Buoy Network: OOS-01 through OOS-12 (Bay of Bengal & Arabian Sea)</div>
                    <div>• ADCP Doppler Bins: Surface 0-5m current validation</div>
                    <div>• High-Frequency (HF) Radar: 12 stations along Indian coast</div>
                    <div>• Tide Gauges: Survey of India (SoI) coastal tide network</div>
                    <div>• Coastal Calibration: Real-time current bias correction</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] block">OPeNDAP Data Query Example:</span>
                <code className="text-cyan-300 block bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
                  curl &quot;https://tds.incois.gov.in/thredds/dodsC/ROMS_2.5KM/surface_uv.nc?u[0:1:23][0][29.0:0.1:30.0][-95.5:0.1:-94.5],v[0:1:23][0][29.0:0.1:30.0][-95.5:0.1:-94.5]&quot;
                </code>
              </div>
            </div>
          )}

          {/* Subtab 3: ISRO MOSDAC SAR */}
          {activeSubTab === 'mosdac' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Satellite className="w-4 h-4" />
                  <span>ISRO MOSDAC & Sentinel-1 SAR Oil Spill Surveillance</span>
                </div>
                <p className="text-slate-300">
                  ISRO&apos;s Meteorological and Oceanographic Satellite Data Archival Centre (MOSDAC) serves synthetic aperture radar (SAR) products covering the Indian Exclusive Economic Zone. Radar backscatter damping (Bragg scattering suppression) enables accurate extraction of spill boundaries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold uppercase text-[10px] block">Sensor Constellation & Capabilities</span>
                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div><strong>• Sentinel-1A / 1B:</strong> C-Band SAR (5.405 GHz), IW mode, 10m pixel spacing.</div>
                    <div><strong>• EOS-04 / RISAT-1A:</strong> Indian indigenous C-Band active radar satellite with hybrid polarimetry.</div>
                    <div><strong>• Revisit Frequency:</strong> 6 to 12 days over major shipping lanes.</div>
                    <div><strong>• Processing Level:</strong> Level-1 Ground Range Detected (GRD) with terrain flattening.</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-cyan-400 font-bold uppercase text-[10px] block">Automated Spill Detection Pipeline</span>
                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div><strong>1. Land Masking:</strong> GSHHG high-resolution shoreline removal.</div>
                    <div><strong>2. Wind Filtering:</strong> Eliminates low-wind false alarms (&lt; 2 m/s calm seas).</div>
                    <div><strong>3. Adaptive Thresholding:</strong> Lee filter speckle reduction + CFAR dark-spot clustering.</div>
                    <div><strong>4. Morphology Extraction:</strong> GeoJSON polygonization with area, perimeter, and PCA axis.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 4: High-Risk Indian Corridors */}
          {activeSubTab === 'corridors' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-rose-400 font-bold uppercase text-xs block">
                  Priority Maritime Surveillance Sectors (Indian Coast Guard & DG Shipping)
                </span>
                <p className="text-slate-400 text-xs">
                  These 4 strategic corridors carry over 70% of India&apos;s crude oil imports and face the highest statistical risk of illicit bilge discharges and tanker collisions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">1. Gulf of Kachchh (Gujarat)</strong>
                    <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">Critical Crude Hub</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Home to Mundra and Vadinar Single Point Mooring (SPM) crude offloading berths handling &gt;100 million metric tonnes annually. Narrow channel navigation with strong 3-4 knot tidal currents.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">2. Mumbai High & Offshore Basin</strong>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">Offshore Production</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Dense concentration of ONGC offshore platforms, subsea pipelines, and lightering anchorages. Highly congested vessel traffic crossing the main Arabian Sea shipping channel.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">3. Six Degree Channel (Great Nicobar)</strong>
                    <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">Chokepoint (Malacca)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    The primary gateway between the Indian Ocean and the Strait of Malacca. Traversed by over 60,000 ships annually, including massive VLCC supertankers transiting between the Persian Gulf and East Asia.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">4. Palk Bay & Gulf of Mannar</strong>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">Ecological Biosphere</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    UNESCO Biosphere Reserve with sensitive coral reefs and dugong habitats. Any oil discharge requires instant attribution and rapid containment under ICG NOS-DCP protocols.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Aligned with Indian National Oil Spill Disaster Contingency Plan (NOS-DCP)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Close Overview
          </button>
        </div>

      </div>
    </div>
  );
}
