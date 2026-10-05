import React, { useState } from 'react';
import { Warehouse, MapPin, Bot, Phone, User, Clock, Package, X, Check, Crosshair, Trash2 } from 'lucide-react';
import { GodownFacility } from '../../types/logisticsNetwork';

interface GodownModalProps {
  godown: GodownFacility;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: GodownFacility) => void;
  onStartPinDrop: () => void;
  onTriggerRobotGps: () => void;
  isCapturingGps?: boolean;
}

export const GodownModal: React.FC<GodownModalProps> = ({
  godown,
  isOpen,
  onClose,
  onSave,
  onStartPinDrop,
  onTriggerRobotGps,
  isCapturingGps = false,
}) => {
  const [form, setForm] = useState<GodownFacility>(godown);

  // Sync internal form when godown prop updates
  React.useEffect(() => {
    setForm(godown);
  }, [godown]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      stockCapacityKg: Number(form.stockCapacityKg) || 0,
      stockCapacityPackets: Number(form.stockCapacityPackets) || 0,
      loadingBays: Number(form.loadingBays) || 1,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Central Godown & Main Warehouse</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Primary Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Mark factory godown, coordinate origin, warehouse capacity, and dispatch timing
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Action Banner: Pin Drop & Robot GPS */}
          <div className="bg-gradient-to-r from-amber-500/10 via-indigo-50 to-cyan-500/10 border border-amber-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Godown Geo-Positioning & Calibration</span>
              </span>
              <span className="text-[11px] text-slate-600 block">
                Sync with robot-grade high accuracy GPS at factory or click map to mark location.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartPinDrop();
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Click on the map to place the Godown location"
              >
                <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
                <span>📍 Pick on Map</span>
              </button>
              <button
                type="button"
                onClick={onTriggerRobotGps}
                disabled={isCapturingGps}
                className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                title="Sync Godown location using multi-satellite robot GPS lock"
              >
                <Bot className="w-3.5 h-3.5 animate-pulse" />
                <span>{isCapturingGps ? 'Locking GPS...' : '🤖 Sync Robot GPS'}</span>
              </button>
            </div>
          </div>

          {/* Godown Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Godown Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Madurai Central Godown & Depot"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Godown / Hub Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. GDN-MDU-01"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Godown Address (Optional)
              </label>
              {form.address && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, address: '' })}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                  title="Delete address of the main godown"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Address</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address deleted / blank (or type custom address)"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {form.address && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, address: '' })}
                  className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  title="Clear address"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Coordinates & Accuracy */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                Latitude (N)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                Longitude (E)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                GPS Accuracy
              </label>
              <div className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-emerald-700 flex items-center gap-1">
                <span>±{form.accuracyMeters ? form.accuracyMeters.toFixed(1) : '2.1'}m</span>
                <span className="text-[9px] text-slate-400">Lock</span>
              </div>
            </div>
          </div>

          {/* Warehouse Operations & Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Warehouse Manager / Incharge</span>
              </label>
              <input
                type="text"
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                placeholder="e.g. M. Senthil Kumar"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Contact Phone</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. +91 98421 88770"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Capacities & Dispatch Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>Stock Capacity (Kg)</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.stockCapacityKg}
                onChange={(e) => setForm({ ...form, stockCapacityKg: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Capacity (Packets)</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.stockCapacityPackets}
                onChange={(e) => setForm({ ...form, stockCapacityPackets: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Operating Hours</span>
              </label>
              <input
                type="text"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                placeholder="04:30 AM - 09:30 PM"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Godown Dispatch Instructions / Notes
            </label>
            <textarea
              rows={2}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Early morning van loading begins 05:00 AM. Route vans park at Bay 1 to 4."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Marked Godown</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
