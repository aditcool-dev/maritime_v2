'use client';

import React, { useEffect, useRef, useState } from 'react';
import type LType from 'leaflet';
import type { Map as LeafletMap, LayerGroup, Layer as LeafletLayer } from 'leaflet';
import { CanonicalCaseData, CandidateVessel, BacktrackLocusPoint } from '@/lib/types';
import { 
  Layers, 
  Compass, 
  MapPin, 
  Maximize2, 
  Crosshair, 
  Sliders, 
  Info,
  Clock,
  Waves,
  Wind,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface SpillMapProps {
  caseData: CanonicalCaseData;
  selectedVessel: CandidateVessel | null;
  onSelectVessel: (vessel: CandidateVessel) => void;
  highlightedAge: number;
  onAgeChange: (age: number) => void;
  leewayFactor?: number;
  onLeewayChange?: (alpha: number) => void;
  coriolisAngle?: number;
  onCoriolisChange?: (angle: number) => void;
}

export default function SpillMap({
  caseData,
  selectedVessel,
  onSelectVessel,
  highlightedAge,
  onAgeChange,
  leewayFactor = 0.032,
  onLeewayChange,
  coriolisAngle = 4.5,
  onCoriolisChange,
}: SpillMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const layersRef = useRef<{
    spillLayer: LayerGroup | null;
    locusLayer: LayerGroup | null;
    uncertaintyLayer: LayerGroup | null;
    vesselLayer: LayerGroup | null;
    stationLayer: LayerGroup | null;
    groundTruthLayer: LayerGroup | null;
    baseTiles: Record<string, LeafletLayer>;
  }>({
    spillLayer: null,
    locusLayer: null,
    uncertaintyLayer: null,
    vesselLayer: null,
    stationLayer: null,
    groundTruthLayer: null,
    baseTiles: {},
  });

  const [activeBasemap, setActiveBasemap] = useState<'dark' | 'light' | 'topo' | 'satellite'>('dark');
  const [showSpill, setShowSpill] = useState(true);
  const [showLocus, setShowLocus] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showGroundTruth, setShowGroundTruth] = useState(true);
  const [isPlayingTime, setIsPlayingTime] = useState(false);
  const [showLeewayHUD, setShowLeewayHUD] = useState(true);

  // Internal drift parameters if callbacks not provided
  const [internalAlpha, setInternalAlpha] = useState(leewayFactor);
  const [internalAngle, setInternalAngle] = useState(coriolisAngle);

  const effectiveAlpha = onLeewayChange ? leewayFactor : internalAlpha;
  const effectiveAngle = onCoriolisChange ? coriolisAngle : internalAngle;

  const handleAlphaChange = (val: number) => {
    if (onLeewayChange) onLeewayChange(val);
    else setInternalAlpha(val);
  };

  const handleAngleChange = (val: number) => {
    if (onCoriolisChange) onCoriolisChange(val);
    else setInternalAngle(val);
  };

  // Real-time Leeway Vector Breakdown
  const currentSpeed = caseData.report.environment.current.vector_mean_speed_ms;
  const currentDir = caseData.report.environment.current.vector_mean_toward_deg;
  const windSpeed = caseData.report.environment.wind.vector_mean_speed_ms;
  const windDir = caseData.report.environment.wind.vector_mean_toward_deg;

  const windRad = ((90 - windDir) * Math.PI) / 180;
  const windU = windSpeed * Math.cos(windRad);
  const windV = windSpeed * Math.sin(windRad);

  const coriolisRad = (effectiveAngle * Math.PI) / 180;
  const windUDeflected = windU * Math.cos(coriolisRad) - windV * Math.sin(coriolisRad);
  const windVDeflected = windU * Math.sin(coriolisRad) + windV * Math.cos(coriolisRad);

  const currentRad = ((90 - currentDir) * Math.PI) / 180;
  const currentU = currentSpeed * Math.cos(currentRad);
  const currentV = currentSpeed * Math.sin(currentRad);

  const netU = currentU + effectiveAlpha * windUDeflected;
  const netV = currentV + effectiveAlpha * windVDeflected;
  const netDriftSpeed = Math.hypot(netU, netV);
  const netDriftHeading = (90 - (Math.atan2(netV, netU) * 180) / Math.PI + 360) % 360;

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const initMap = async () => {
      try {
        const leafletModule = await import('leaflet');
        const L = (leafletModule.default || leafletModule) as typeof LType;
        if (!isMounted || !mapContainerRef.current) return;

        leafletRef.current = L;

        const map = L.map(mapContainerRef.current, {
          center: [29.581041, -94.940062],
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Clean Open Cartography Layers (100% Free - NO API keys, NO watermarks)
        // 1. Dark Gray Navigation Base + Labels
        const darkBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 16,
          detectRetina: true,
          attribution: '© Esri, DeLorme, NAVTEQ',
        });
        const darkLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 16,
          detectRetina: true,
        });
        const darkGroup = L.layerGroup([darkBase, darkLabels]);

        // 2. Light Gray Base + Labels
        const lightBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 16,
          detectRetina: true,
          attribution: '© Esri, DeLorme, NAVTEQ',
        });
        const lightLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 16,
          detectRetina: true,
        });
        const lightGroup = L.layerGroup([lightBase, lightLabels]);

        // 3. World Topographic & Marine Coastal
        const topoTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          detectRetina: true,
          attribution: '© Esri, USGS, NOAA',
        });

        // 4. World Imagery Satellite + Boundaries
        const satBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          detectRetina: true,
          attribution: '© Esri, Maxar, Earthstar Geographics',
        });
        const satLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          detectRetina: true,
        });
        const satGroup = L.layerGroup([satBase, satLabels]);

        darkGroup.addTo(map);

        layersRef.current.baseTiles = {
          'dark': darkGroup,
          'light': lightGroup,
          'topo': topoTiles,
          'satellite': satGroup,
        };

        // Create LayerGroups
        layersRef.current.spillLayer = L.layerGroup().addTo(map);
        layersRef.current.locusLayer = L.layerGroup().addTo(map);
        layersRef.current.uncertaintyLayer = L.layerGroup().addTo(map);
        layersRef.current.vesselLayer = L.layerGroup().addTo(map);
        layersRef.current.stationLayer = L.layerGroup().addTo(map);
        layersRef.current.groundTruthLayer = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        // Draw initial static layers
        renderStaticLayers(map, L);
        renderDynamicLayers(map, L);

        // Invalidate size immediately and after layout stabilization
        map.invalidateSize();
        resizeTimer = setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);

        // Observe container size changes
        if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        setIsMapReady(true);
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.baseTiles) return;

    Object.values(layersRef.current.baseTiles).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });

    const targetTile = layersRef.current.baseTiles[activeBasemap];
    if (targetTile) targetTile.addTo(map);
  }, [activeBasemap]);

  // Re-render dynamic layers when selectedVessel or highlightedAge changes
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return;
    renderDynamicLayers(mapInstanceRef.current);
  }, [selectedVessel, highlightedAge, showSpill, showLocus, showUncertainty, showVessels, showStations, showGroundTruth]);

  // Track age in ref for playback interval
  const ageRef = useRef(highlightedAge);
  useEffect(() => {
    ageRef.current = highlightedAge;
  }, [highlightedAge]);

  // Timeline playback loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlayingTime) {
      interval = setInterval(() => {
        const next = Math.round((ageRef.current + 0.5) * 10) / 10;
        onAgeChange(next > 12.0 ? 0.5 : next);
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTime, onAgeChange]);

  const renderStaticLayers = (map: LeafletMap, customL?: typeof LType) => {
    const L = customL || leafletRef.current;
    if (!L) return;

    // 1. Environmental Stations
    if (layersRef.current.stationLayer) {
      layersRef.current.stationLayer.clearLayers();
      
      // Eagle Point Wind Station
      const windStation = caseData.report.environment.wind_station;
      const windMarker = L.marker([windStation.lat, windStation.lon], {
        icon: L.divIcon({
          className: 'custom-wind-station',
          html: `<div class="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 text-sky-400 border border-sky-500/40 rounded shadow-lg text-xs font-semibold backdrop-blur whitespace-nowrap">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
            <span>NOAA Wind: ${windStation.id}</span>
          </div>`,
          iconSize: [140, 24],
          iconAnchor: [70, 12],
        }),
      }).bindPopup(`
        <div class="p-2 text-slate-800 text-xs">
          <strong class="text-sm font-bold block mb-1 text-slate-950">${windStation.name}</strong>
          <p class="text-slate-600 mb-1">NOAA CO-OPS Station #${windStation.id}</p>
          <div class="bg-sky-50 p-1.5 rounded border border-sky-200 text-sky-900 space-y-0.5">
            <div>Vector Mean Speed: <strong>${caseData.report.environment.wind.vector_mean_speed_ms} m/s</strong></div>
            <div>Direction-Toward: <strong>${caseData.report.environment.wind.vector_mean_toward_deg}°</strong></div>
            <div>Samples: ${caseData.report.environment.wind.n_samples}</div>
          </div>
        </div>
      `);
      layersRef.current.stationLayer.addLayer(windMarker);

      // Fred Hartman Current Station
      const currentStation = caseData.report.environment.current_station;
      const currentMarker = L.marker([currentStation.lat, currentStation.lon], {
        icon: L.divIcon({
          className: 'custom-current-station',
          html: `<div class="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 text-teal-400 border border-teal-500/40 rounded shadow-lg text-xs font-semibold backdrop-blur whitespace-nowrap">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
            <span>NOAA Current: ${currentStation.id}</span>
          </div>`,
          iconSize: [150, 24],
          iconAnchor: [75, 12],
        }),
      }).bindPopup(`
        <div class="p-2 text-slate-800 text-xs">
          <strong class="text-sm font-bold block mb-1 text-slate-950">${currentStation.name}</strong>
          <p class="text-slate-600 mb-1">NOAA CO-OPS Station #${currentStation.id} (Bin ${currentStation.bin}, Depth ${currentStation.bin_depth_m}m)</p>
          <div class="bg-teal-50 p-1.5 rounded border border-teal-200 text-teal-900 space-y-0.5">
            <div>Vector Mean Speed: <strong>${caseData.report.environment.current.vector_mean_speed_ms} m/s</strong></div>
            <div>Direction-Toward: <strong>${caseData.report.environment.current.vector_mean_toward_deg}°</strong></div>
            <div>Samples: ${caseData.report.environment.current.n_samples}</div>
          </div>
        </div>
      `);
      layersRef.current.stationLayer.addLayer(currentMarker);
    }

    // 2. Ground Truth Collision Site
    if (layersRef.current.groundTruthLayer) {
      layersRef.current.groundTruthLayer.clearLayers();
      const gt = caseData.report.ground_truth_evaluation.release;
      const gtMarker = L.marker([gt.lat, gt.lon], {
        icon: L.divIcon({
          className: 'custom-gt-marker',
          html: `<div class="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/95 text-amber-300 border-2 border-amber-400 rounded-md shadow-xl text-xs font-bold backdrop-blur animate-pulse">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>True Release: 20:20 UTC</span>
          </div>`,
          iconSize: [165, 26],
          iconAnchor: [82, 13],
        }),
      }).bindPopup(`
        <div class="p-2.5 text-slate-800 text-xs">
          <div class="flex items-center gap-1 text-amber-700 font-bold text-sm mb-1">
            <span>Known Incident Release Origin</span>
          </div>
          <p class="text-slate-600 mb-1 leading-relaxed">${gt.note}</p>
          <div class="bg-amber-50 border border-amber-200 rounded p-1.5 space-y-1 text-amber-900">
            <div>Time: <strong>${gt.time_utc}</strong> (3.0h before observation)</div>
            <div>Coordinates: <strong>${gt.lat.toFixed(5)}°N, ${gt.lon.toFixed(5)}°W</strong></div>
            <div>Duration: <strong>${gt.release_duration_min} min</strong></div>
            <div class="border-t border-amber-200 pt-1 mt-1 text-[11px] text-amber-800">
              * Quarantined Ground Truth (VOYAGER & ROSE BALSAM collision point)
            </div>
          </div>
        </div>
      `);
      layersRef.current.groundTruthLayer.addLayer(gtMarker);
    }
  };

  const renderDynamicLayers = (map: LeafletMap, customL?: typeof LType) => {
    const L = customL || leafletRef.current;
    if (!L) return;
    // 1. Spill Polygon
    if (layersRef.current.spillLayer) {
      layersRef.current.spillLayer.clearLayers();
      if (showSpill && caseData.spill_observation) {
        // Render polygon
        const geojsonLayer = L.geoJSON(caseData.spill_observation as any, {
          style: {
            color: '#ef4444',
            weight: 2.5,
            opacity: 0.9,
            fillColor: '#dc2626',
            fillOpacity: 0.35,
          },
        }).bindPopup(`
          <div class="p-2 text-slate-800 text-xs">
            <strong class="text-sm font-bold text-red-600 block mb-1">Spill Observation (Synthetic)</strong>
            <p class="text-slate-600 mb-1">Observed Time: <strong>${caseData.report.scene.observation_time_utc} UTC</strong></p>
            <div class="bg-red-50 p-1.5 rounded border border-red-200 text-red-900 space-y-0.5">
              <div>Area: <strong>${caseData.report.scene.area_km2} km²</strong></div>
              <div>Perimeter: <strong>${caseData.report.scene.perimeter_km} km</strong></div>
              <div>Elongation: <strong>${caseData.report.scene.elongation.aspect_ratio}x</strong> @ <strong>${caseData.report.scene.elongation.axis_azimuth_deg}°</strong></div>
              <div>Centroid: <strong>${caseData.report.scene.centroid_lat.toFixed(4)}, ${caseData.report.scene.centroid_lon.toFixed(4)}</strong></div>
            </div>
            <p class="text-[10px] text-slate-500 mt-1 italic">Generated via forward Lagrangian simulation stand-in for SAR</p>
          </div>
        `);
        layersRef.current.spillLayer.addLayer(geojsonLayer);

        // Centroid marker
        const centroid = [caseData.report.scene.centroid_lat, caseData.report.scene.centroid_lon] as [number, number];
        const centroidMarker = L.circleMarker(centroid, {
          radius: 5,
          color: '#ffffff',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 1,
        }).bindTooltip('Slick Centroid at Observation Time (23:20 UTC)', {
          permanent: false,
          direction: 'top',
        });
        layersRef.current.spillLayer.addLayer(centroidMarker);
      }
    }

    // 2. Backtrack Locus Trajectory & Uncertainty
    if (layersRef.current.locusLayer && layersRef.current.uncertaintyLayer) {
      layersRef.current.locusLayer.clearLayers();
      layersRef.current.uncertaintyLayer.clearLayers();

      if (showLocus && caseData.backtrack?.locus) {
        const locusPoints = caseData.backtrack.locus;
        const latLngs = locusPoints.map((p) => [p.origin_lat, p.origin_lon] as [number, number]);

        // Drift line connecting points
        const locusPolyline = L.polyline(
          [[caseData.report.scene.centroid_lat, caseData.report.scene.centroid_lon], ...latLngs],
          {
            color: '#38bdf8',
            weight: 2.5,
            dashArray: '5, 5',
            opacity: 0.8,
          }
        );
        layersRef.current.locusLayer.addLayer(locusPolyline);

        // Individual candidate origin points along trajectory
        locusPoints.forEach((pt) => {
          const isSelectedAge = Math.abs(pt.age_h - highlightedAge) < 0.1;
          const marker = L.circleMarker([pt.origin_lat, pt.origin_lon], {
            radius: isSelectedAge ? 8 : 4,
            color: isSelectedAge ? '#f59e0b' : '#38bdf8',
            weight: isSelectedAge ? 3 : 1.5,
            fillColor: isSelectedAge ? '#fbbf24' : '#0284c7',
            fillOpacity: isSelectedAge ? 1 : 0.8,
          });

          marker.on('click', () => {
            onAgeChange(pt.age_h);
          });

          marker.bindTooltip(`Origin ${pt.age_h}h: ${pt.origin_time_utc.slice(11, 16)} UTC`, {
            direction: 'right',
            offset: [8, 0],
          });

          layersRef.current.locusLayer!.addLayer(marker);

          // Render Uncertainty Circle for selected age (or all if toggle enabled)
          if (showUncertainty && isSelectedAge) {
            const circle = L.circle([pt.origin_lat, pt.origin_lon], {
              radius: pt.uncertainty_radius_m,
              color: '#f59e0b',
              weight: 2,
              fillColor: '#f59e0b',
              fillOpacity: 0.15,
              dashArray: '4, 4',
            }).bindTooltip(`Uncertainty: ±${pt.uncertainty_radius_m.toFixed(0)}m (Age ${pt.age_h}h)`, {
              permanent: true,
              direction: 'center',
              className: 'uncertainty-tooltip bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/50 text-[11px]',
            });
            layersRef.current.uncertaintyLayer!.addLayer(circle);
          }
        });
      }
    }

    // 3. Candidate Vessels
    if (layersRef.current.vesselLayer) {
      layersRef.current.vesselLayer.clearLayers();

      if (showVessels && caseData.candidates) {
        // Show top 25 candidates + selected vessel
        const vesselsToDisplay = caseData.candidates.slice(0, 25);
        if (selectedVessel && !vesselsToDisplay.some((v) => v.MMSI === selectedVessel.MMSI)) {
          vesselsToDisplay.push(selectedVessel);
        }

        vesselsToDisplay.forEach((vessel) => {
          if (!vessel.approach_lat || !vessel.approach_lon) return;

          const isSelected = selectedVessel?.MMSI === vessel.MMSI;
          const isTopCandidate = vessel.rank === 1;
          const isCollisionGroundTruth = vessel.MMSI === '356144000' || vessel.MMSI === '366996020';

          let pinColor = '#94a3b8'; // default slate
          let borderColor = '#475569';
          let textColor = '#ffffff';

          if (isTopCandidate) {
            pinColor = '#3b82f6'; // Blue for THOR (#1)
            borderColor = '#60a5fa';
          } else if (isCollisionGroundTruth) {
            pinColor = '#f59e0b'; // Amber for ROSE BALSAM & VOYAGER
            borderColor = '#fbbf24';
          } else if (vessel.rank <= 5) {
            pinColor = '#10b981'; // Emerald for top 5
            borderColor = '#34d399';
          }

          const markerHtml = `
            <div class="relative group cursor-pointer transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
              <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2" style="background-color: ${pinColor}; border-color: ${borderColor};">
                <span class="text-[11px] font-bold text-white leading-none">#${vessel.rank}</span>
              </div>
              ${isSelected ? '<div class="absolute -inset-1 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>' : ''}
            </div>
          `;

          const marker = L.marker([vessel.approach_lat, vessel.approach_lon], {
            icon: L.divIcon({
              className: 'custom-vessel-marker',
              html: markerHtml,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
            zIndexOffset: isSelected ? 1000 : isTopCandidate || isCollisionGroundTruth ? 500 : 100,
          });

          marker.on('click', () => {
            onSelectVessel(vessel);
          });

          const popupContent = `
            <div class="p-2 text-slate-900 text-xs min-w-[210px]">
              <div class="flex items-center justify-between border-b pb-1 mb-1.5">
                <span class="font-bold text-sm text-slate-950">${vessel.name || '(unnamed)'}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${pinColor}">
                  Rank #${vessel.rank}
                </span>
              </div>
              <div class="text-slate-600 mb-1 space-y-0.5">
                <div>Type: <strong>${vessel.type_label}</strong> (${vessel.length_m ? vessel.length_m + 'm' : 'N/A'})</div>
                <div>MMSI: <code class="bg-slate-100 px-1 py-0.5 rounded text-[11px]">${vessel.MMSI}</code></div>
                ${vessel.imo ? `<div>IMO: <code>${vessel.imo}</code></div>` : ''}
              </div>
              <div class="bg-slate-50 p-1.5 rounded border border-slate-200 mb-1.5 space-y-1">
                <div class="flex justify-between">
                  <span>Composite Score:</span>
                  <strong class="text-indigo-600">${vessel.composite_score.toFixed(4)}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Matched Slick Age:</span>
                  <strong>${vessel.matched_age_h.toFixed(1)} h</strong>
                </div>
                <div class="flex justify-between">
                  <span>Dist. at Origin:</span>
                  <strong>${vessel.dist_at_origin_time_m.toFixed(0)} m</strong>
                </div>
                <div class="flex justify-between">
                  <span>Speed Over Ground:</span>
                  <strong>${vessel.sog_at_approach_kn ? vessel.sog_at_approach_kn.toFixed(1) + ' kn' : '0.0 kn'}</strong>
                </div>
              </div>
              ${
                isCollisionGroundTruth
                  ? `<div class="bg-amber-100 text-amber-900 text-[10px] p-1 rounded border border-amber-300 font-semibold">
                      * Known Houston Ship Channel Collision Participant
                    </div>`
                  : ''
              }
              <button id="popup-select-btn-${vessel.MMSI}" class="mt-2 w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold text-center transition">
                Inspect Candidate Telemetry
              </button>
            </div>
          `;

          marker.bindPopup(popupContent);

          // Add listener to popup button after open
          marker.on('popupopen', () => {
            const btn = document.getElementById(`popup-select-btn-${vessel.MMSI}`);
            if (btn) {
              btn.onclick = () => {
                onSelectVessel(vessel);
                marker.closePopup();
              };
            }
          });

          layersRef.current.vesselLayer!.addLayer(marker);
        });
      }
    }
  };

  // Center on specific targets
  const handleZoomToSpill = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([caseData.report.scene.centroid_lat, caseData.report.scene.centroid_lon], 14, {
      duration: 1.2,
    });
  };

  const handleZoomToGroundTruth = () => {
    if (!mapInstanceRef.current) return;
    const gt = caseData.report.ground_truth_evaluation.release;
    mapInstanceRef.current.flyTo([gt.lat, gt.lon], 14, {
      duration: 1.2,
    });
  };

  const handleZoomToFitAll = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([29.59, -94.945], 12.5, {
      duration: 1.2,
    });
  };

  return (
    <div id="spill-map-container" className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2">
        {/* Basemap Switcher (100% Free - No API key) */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/70 rounded-lg p-1 flex items-center shadow-lg text-xs">
          <button
            id="basemap-dark-btn"
            onClick={() => setActiveBasemap('dark')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeBasemap === 'dark'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dark Nav
          </button>
          <button
            id="basemap-light-btn"
            onClick={() => setActiveBasemap('light')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeBasemap === 'light'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Light
          </button>
          <button
            id="basemap-topo-btn"
            onClick={() => setActiveBasemap('topo')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeBasemap === 'topo'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Maritime Coastal Topography & Channel Depths"
          >
            Topo / Marine
          </button>
          <button
            id="basemap-sat-btn"
            onClick={() => setActiveBasemap('satellite')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeBasemap === 'satellite'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Leaflet Free Engine Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700/70 text-[11px] text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400 font-mono text-[10px]">OPEN-SOURCE ENGINE</span>
          <span className="text-slate-400 text-[10px]">Leaflet • Public Cartography</span>
        </div>

        {/* Quick Zoom Presets */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/70 rounded-lg p-1 flex items-center gap-1 shadow-lg text-xs">
          <button
            id="zoom-overview-btn"
            onClick={handleZoomToFitAll}
            className="px-2.5 py-1 rounded text-slate-300 hover:bg-slate-800 transition flex items-center gap-1"
            title="Overview (Galveston Bay)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            id="zoom-spill-btn"
            onClick={handleZoomToSpill}
            className="px-2.5 py-1 rounded text-slate-300 hover:bg-slate-800 transition flex items-center gap-1"
            title="Focus on Spill Polygon"
          >
            <Crosshair className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Spill Polygon</span>
          </button>
          <button
            id="zoom-gt-btn"
            onClick={handleZoomToGroundTruth}
            className="px-2.5 py-1 rounded text-slate-300 hover:bg-slate-800 transition flex items-center gap-1"
            title="Focus on Collision Site (Ground Truth)"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Collision Site</span>
          </button>
        </div>
      </div>

      {/* Top Right Layer Toggles */}
      <div className="absolute top-14 right-3 z-[400]">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/70 rounded-lg p-2 shadow-lg text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 pb-1 border-b border-slate-800">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showSpill}
              onChange={(e) => setShowSpill(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block"></span>
              Spill Geometry
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showLocus}
              onChange={(e) => setShowLocus(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block"></span>
              Backtrack Locus
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showUncertainty}
              onChange={(e) => setShowUncertainty(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-400/20 inline-block"></span>
              Origin Uncertainty
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showVessels}
              onChange={(e) => setShowVessels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              Candidate AIS (#1-#25)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showStations}
              onChange={(e) => setShowStations(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-400 inline-block"></span>
              NOAA Stations
            </span>
          </label>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div
        id="leaflet-map-canvas"
        ref={mapContainerRef}
        className="relative w-full flex-1 min-h-[350px] lg:min-h-0 h-full overflow-hidden bg-[#0b132b] z-0"
      >
        {!isMapReady && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Initializing Maritime Geospatial Engine...</span>
          </div>
        )}
      </div>

      {/* Floating Windage Drift Factor & Leeway HUD */}
      <div className="absolute bottom-16 left-3 z-[400] max-w-sm w-[92vw] sm:w-auto">
        {showLeewayHUD ? (
          <div className="bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-2.5 sm:min-w-[310px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-xs">Leeway Drift Equation</span>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800 px-1 rounded">
                  α={(effectiveAlpha * 100).toFixed(1)}%
                </span>
              </div>
              <button
                onClick={() => setShowLeewayHUD(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Collapse Leeway Physics HUD"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Formula badge */}
            <div className="font-mono text-[10px] text-cyan-300 bg-slate-950/80 p-1.5 rounded border border-slate-800 text-center">
              u_slick = u_current + α · R(θ) · u_wind
            </div>

            {/* Interactive sliders */}
            <div className="space-y-2 text-[11px]">
              {/* Leeway Alpha */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Leeway Factor (α):</span>
                  <span className="font-mono text-sky-300 font-bold">{(effectiveAlpha * 100).toFixed(1)}% ({effectiveAlpha.toFixed(3)})</span>
                </div>
                <input
                  type="range"
                  aria-label="Windage leeway factor alpha"
                  min="0.020"
                  max="0.050"
                  step="0.001"
                  value={effectiveAlpha}
                  onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>2.0%</span>
                  <span className="text-amber-400">Std: 3.0%–3.5%</span>
                  <span>5.0%</span>
                </div>
              </div>

              {/* Coriolis Theta */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Coriolis Deflection (θ):</span>
                  <span className="font-mono text-emerald-300 font-bold">{effectiveAngle.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  aria-label="Coriolis deflection angle theta"
                  min="0"
                  max="10"
                  step="0.5"
                  value={effectiveAngle}
                  onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-400 focus-visible:ring-1 focus-visible:ring-emerald-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>0°</span>
                  <span className="text-emerald-400">Std: 3°–5° Right</span>
                  <span>10°</span>
                </div>
              </div>
            </div>

            {/* Dynamic Result Readout */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px] font-mono space-y-0.5">
              <div className="flex justify-between text-slate-400">
                <span>Surface Current:</span>
                <span className="text-teal-300">{currentSpeed.toFixed(2)} m/s @ {currentDir.toFixed(0)}°</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Deflected Leeway:</span>
                <span className="text-sky-300">{(windSpeed * effectiveAlpha).toFixed(3)} m/s (+{effectiveAngle}°)</span>
              </div>
              <div className="flex justify-between text-slate-200 border-t border-slate-800 pt-1 font-bold">
                <span className="text-cyan-400">Net Slick Advection:</span>
                <span className="text-amber-300">{netDriftSpeed.toFixed(3)} m/s @ {netDriftHeading.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLeewayHUD(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-sky-500/50 hover:bg-slate-800 active:scale-[0.98] text-slate-200 rounded-lg shadow-xl text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>Drift Physics: α={(effectiveAlpha * 100).toFixed(1)}%, θ={effectiveAngle}°</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Bottom Slick Age Scrubber Bar */}
      <div className="z-[400] bg-slate-900/95 backdrop-blur border-t border-slate-800 p-3 px-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <button
              id="timeline-play-btn"
              onClick={() => setIsPlayingTime(!isPlayingTime)}
              className={`p-1.5 rounded-md border font-semibold text-xs transition active:scale-[0.98] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isPlayingTime
                  ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title={isPlayingTime ? 'Pause Time Animation' : 'Play Time Animation'}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isPlayingTime ? 'Pause' : 'Play'}</span>
            </button>
            <div className="text-xs">
              <span className="text-slate-400 mr-1">Candidate Age:</span>
              <strong className="text-amber-400 text-sm font-mono tabular-nums">{highlightedAge.toFixed(1)} h</strong>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Origin Time: <span className="text-slate-200 font-mono font-medium">
              {caseData.backtrack?.locus?.find((p) => Math.abs(p.age_h - highlightedAge) < 0.1)?.origin_time_utc || '2019-05-10 20:20:00'} UTC
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="flex-1 w-full max-w-xl flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono">0.5h</span>
          <input
            id="slick-age-slider"
            aria-label="Slick origin candidate age in hours"
            type="range"
            min="0.5"
            max="12.0"
            step="0.5"
            value={highlightedAge}
            onChange={(e) => onAgeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          <span className="text-[11px] text-slate-400 font-mono">12.0h</span>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-xs text-slate-400 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>#1 Top (THOR)</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Collision Ground Truth</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Top 5 Candidates</span>
          </div>
        </div>
      </div>
    </div>
  );
}
