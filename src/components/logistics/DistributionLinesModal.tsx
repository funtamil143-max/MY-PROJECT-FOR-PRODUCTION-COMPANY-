import React from 'react';
import { Route, Navigation, Warehouse, Boxes, Store, X, Check, Eye, Zap, ArrowRight, Share2, Layers, Download } from 'lucide-react';
import { GodownFacility, StockPickupPoint, DistributionLine } from '../../types/logisticsNetwork';
import { StoreLocation } from '../../types';

interface DistributionLinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  godown: GodownFacility;
  pickupPoints: StockPickupPoint[];
  stores: StoreLocation[];
  distributionLineMode: 'all' | 'primary_supply' | 'retail_beat' | 'none';
  onSetDistributionLineMode: (mode: 'all' | 'primary_supply' | 'retail_beat' | 'none') => void;
  onStartDrawCustomLine?: () => void;
}

export const DistributionLinesModal: React.FC<DistributionLinesModalProps> = ({
  isOpen,
  onClose,
  godown,
  pickupPoints,
  stores,
  distributionLineMode,
  onSetDistributionLineMode,
  onStartDrawCustomLine,
}) => {
  if (!isOpen) return null;

  // Compute supply feeder lines statistics (Pickup Points -> Godown)
  const feederLines = pickupPoints.map(pt => {
    // Haversine distance
    const R = 6371;
    const dLat = ((godown.latitude - pt.latitude) * Math.PI) / 180;
    const dLon = ((godown.longitude - pt.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pt.latitude * Math.PI) / 180) *
        Math.cos((godown.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = Math.round(R * c * 100) / 100;
    return {
      point: pt,
      distanceKm: distKm,
      estMinutes: Math.round(distKm * 2.2 + 5),
    };
  });

  const totalFeederKm = Number(feederLines.reduce((acc, l) => acc + l.distanceKm, 0).toFixed(1));

  // Compute retail distribution beat lines (Godown -> Stores)
  let totalRetailKm = 0;
  let currentLat = godown.latitude;
  let currentLng = godown.longitude;

  stores.forEach(st => {
    const R = 6371;
    const dLat = ((st.location.latitude - currentLat) * Math.PI) / 180;
    const dLon = ((st.location.longitude - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((st.location.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalRetailKm += R * c;
    currentLat = st.location.latitude;
    currentLng = st.location.longitude;
  });

  const totalNetworkKm = Number((totalFeederKm + totalRetailKm).toFixed(1));

  const handleExportDistributionLinesCSV = () => {
    const headers = ['Line Type', 'Origin Facility', 'Destination Facility', 'Transit Distance (km)', 'Estimated Travel (mins)', 'Line Style', 'Origin Lat', 'Origin Lng', 'Dest Lat', 'Dest Lng'];
    const rows: any[][] = [];

    // Feeder lines
    feederLines.forEach(fl => {
      rows.push([
        'Primary Inward Feeder Line',
        `"${fl.point.name}"`,
        `"${godown.name}"`,
        fl.distanceKm,
        fl.estMinutes,
        'Dashed Amber',
        fl.point.latitude.toFixed(6),
        fl.point.longitude.toFixed(6),
        godown.latitude.toFixed(6),
        godown.longitude.toFixed(6),
      ]);
    });

    // Retail beat lines
    let prevName = godown.name;
    let prevLat = godown.latitude;
    let prevLng = godown.longitude;
    stores.forEach((st, idx) => {
      const R = 6371;
      const dLat = ((st.location.latitude - prevLat) * Math.PI) / 180;
      const dLon = ((st.location.longitude - prevLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prevLat * Math.PI) / 180) *
          Math.cos((st.location.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c * 100) / 100;

      rows.push([
        `Secondary Retail Beat #${idx + 1}`,
        `"${prevName}"`,
        `"${st.shopName}"`,
        dist,
        Math.round(dist * 2.5 + 4),
        'Solid Indigo',
        prevLat.toFixed(6),
        prevLng.toFixed(6),
        st.location.latitude.toFixed(6),
        st.location.longitude.toFixed(6),
      ]);
      prevName = st.shopName;
      prevLat = st.location.latitude;
      prevLng = st.location.longitude;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Distribution_Network_Lines_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white flex justify-between items-center shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Distribution Lines & Supply Arteries</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Active Network
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Visualizing physical stock flows from pickup bays into central godown, and out to retail shops
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Network Metrics KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Network</span>
              <span className="text-lg font-black font-mono text-slate-900">{totalNetworkKm} km</span>
              <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">End-to-end corridor</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Primary Feeders</span>
              <span className="text-lg font-black font-mono text-amber-900">{totalFeederKm} km</span>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">{pickupPoints.length} Pickup Points</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Retail Beat Arteries</span>
              <span className="text-lg font-black font-mono text-indigo-900">{totalRetailKm.toFixed(1)} km</span>
              <span className="text-[10px] text-indigo-700 font-semibold block mt-0.5">{stores.length} Retail Shops</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Daily Stock Flow</span>
              <span className="text-lg font-black font-mono text-emerald-900">
                {pickupPoints.reduce((acc, p) => acc + p.dispatchCapacityKg, 0).toLocaleString()} kg
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Dispatched Daily</span>
            </div>
          </div>

          {/* Map Layer Mode Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Map Layer Display Mode</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: '⚡ All Distribution Lines', desc: 'Primary supply + retail beat lines' },
                { id: 'primary_supply', label: '📦 Primary Supply Only', desc: 'Pickup bays to Godown' },
                { id: 'retail_beat', label: '🏪 Retail Beats Only', desc: 'Godown to retail shop counters' },
                { id: 'none', label: '🚫 Hidden', desc: 'Hide distribution lines on map' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSetDistributionLineMode(opt.id as any)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    distributionLineMode === opt.id
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Primary Stock Supply Lines (Pickup Point -> Godown) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>Primary Inward Supply Lines (Pickup Bay → Godown)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Dashed Amber Flow
              </span>
            </div>

            <div className="space-y-2">
              {feederLines.map(({ point, distanceKm, estMinutes }) => (
                <div
                  key={point.id}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{point.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-extrabold text-slate-800">{godown.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Items: {point.stockItems.join(', ')} • Window: {point.dispatchWindow}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <span className="font-mono font-bold text-amber-900 text-xs block">{distanceKm} km</span>
                      <span className="text-[10px] text-slate-400">~{estMinutes} mins transit</span>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-amber-200/60 text-amber-900 text-[10px] font-bold">
                      {point.dispatchCapacityKg.toLocaleString()} kg cap
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Secondary Retail Distribution Beat Lines */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>Secondary Retail Distribution Arteries (Godown → Retail Counters)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Solid Indigo Artery
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Delivers loaded fresh snack boxes from Central Godown through each store along the scheduled daily delivery beat.
            </p>

            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Warehouse className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{godown.name} (Origin)</span>
                  <span className="text-[11px] text-slate-500">
                    Dispatches to {stores.length} registered retail outlets across Madurai beat network
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-indigo-900 text-xs block">{totalRetailKm.toFixed(1)} km Total</span>
                <span className="text-[10px] text-slate-400">Daily Retail Circuit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDistributionLinesCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Download all feeder supply lines and delivery beats as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Network (CSV)</span>
            </button>
            {onStartDrawCustomLine && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartDrawCustomLine();
                }}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Route className="w-3.5 h-3.5" />
                <span>✏️ Draw Custom Line</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Apply & View on Map
          </button>
        </div>
      </div>
    </div>
  );
};
