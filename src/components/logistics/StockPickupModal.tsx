import React, { useState } from 'react';
import { Package, Plus, MapPin, Bot, Phone, User, Clock, X, Check, Crosshair, Trash2, Edit3, Boxes, Download } from 'lucide-react';
import { StockPickupPoint } from '../../types/logisticsNetwork';

interface StockPickupModalProps {
  pickupPoints: StockPickupPoint[];
  isOpen: boolean;
  onClose: () => void;
  onSavePoint: (point: StockPickupPoint) => void;
  onDeletePoint: (pointId: string) => void;
  onStartPinDropForPoint: (pointId: string) => void;
  onTriggerRobotGpsForPoint: (pointId: string) => void;
  onZoomToPoint?: (point: StockPickupPoint) => void;
  isCapturingGps?: boolean;
}

export const StockPickupModal: React.FC<StockPickupModalProps> = ({
  pickupPoints,
  isOpen,
  onClose,
  onSavePoint,
  onDeletePoint,
  onStartPinDropForPoint,
  onTriggerRobotGpsForPoint,
  onZoomToPoint,
  isCapturingGps = false,
}) => {
  const [editingPoint, setEditingPoint] = useState<StockPickupPoint | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<StockPickupPoint['pointType']>('Factory Frying / Oven');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<number>(9.92750);
  const [formLng, setFormLng] = useState<number>(78.12150);
  const [formAccuracy, setFormAccuracy] = useState<number>(2.0);
  const [formStockItemsText, setFormStockItemsText] = useState('Fresh Murukku, Mixture, Ribbon Pakoda');
  const [formCapacityKg, setFormCapacityKg] = useState<number>(2500);
  const [formSupervisor, setFormSupervisor] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWindow, setFormWindow] = useState('04:30 AM - 09:30 AM');
  const [formNotes, setFormNotes] = useState('');

  if (!isOpen) return null;

  const handleExportPickupPointsCSV = () => {
    if (pickupPoints.length === 0) {
      alert('No stock pickup points to export.');
      return;
    }
    const headers = ['Code', 'Name', 'Point Type', 'Stock Items', 'Dispatch Capacity (kg)', 'Address', 'Latitude', 'Longitude', 'Theta Bearing', 'Accuracy (m)', 'Supervisor', 'Contact Phone', 'Dispatch Window', 'Active'];
    const rows = pickupPoints.map(p => [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.pointType}"`,
      `"${p.stockItems.join('; ').replace(/"/g, '""')}"`,
      p.dispatchCapacityKg,
      `"${p.address.replace(/"/g, '""')}"`,
      p.latitude.toFixed(6),
      p.longitude.toFixed(6),
      p.thetaBearing !== undefined ? `${p.thetaBearing}°` : 'N/A',
      p.accuracyMeters || 2,
      `"${p.supervisorName.replace(/"/g, '""')}"`,
      `"${p.contactPhone.replace(/"/g, '""')}"`,
      `"${p.dispatchWindow}"`,
      p.active ? 'Yes' : 'No',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Pickup_Points_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setEditingPoint(null);
    setFormName('');
    setFormCode(`STK-${Date.now().toString().slice(-4)}`);
    setFormType('Factory Frying / Oven');
    setFormAddress('Industrial Estate Loading Dock, Madurai');
    setFormLat(9.92750);
    setFormLng(78.12150);
    setFormAccuracy(2.0);
    setFormStockItemsText('Fresh Murukku, Ribbon Pakoda, Karasev');
    setFormCapacityKg(2000);
    setFormSupervisor('');
    setFormPhone('');
    setFormWindow('05:00 AM - 10:00 AM');
    setFormNotes('');
  };

  const handleOpenEdit = (pt: StockPickupPoint) => {
    setEditingPoint(pt);
    setIsCreatingNew(false);
    setFormName(pt.name);
    setFormCode(pt.code);
    setFormType(pt.pointType);
    setFormAddress(pt.address);
    setFormLat(pt.latitude);
    setFormLng(pt.longitude);
    setFormAccuracy(pt.accuracyMeters || 2.0);
    setFormStockItemsText(pt.stockItems.join(', '));
    setFormCapacityKg(pt.dispatchCapacityKg);
    setFormSupervisor(pt.supervisorName);
    setFormPhone(pt.contactPhone);
    setFormWindow(pt.dispatchWindow);
    setFormNotes(pt.notes || '');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsArray = formStockItemsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const savedPoint: StockPickupPoint = {
      id: editingPoint ? editingPoint.id : `pickup_${Date.now()}`,
      name: formName,
      code: formCode || `STK-${Date.now().toString().slice(-4)}`,
      pointType: formType,
      address: formAddress,
      latitude: Number(formLat),
      longitude: Number(formLng),
      accuracyMeters: Number(formAccuracy) || 2.0,
      stockItems: itemsArray.length > 0 ? itemsArray : ['All Stock Items'],
      dispatchCapacityKg: Number(formCapacityKg) || 0,
      supervisorName: formSupervisor,
      contactPhone: formPhone,
      dispatchWindow: formWindow,
      active: true,
      notes: formNotes,
    };

    onSavePoint(savedPoint);
    setIsCreatingNew(false);
    setEditingPoint(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white flex justify-between items-center shrink-0 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Stock Pickup Points Directory</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {pickupPoints.length} Pickup Points
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Mark where fresh oven snacks, bulk packets, and raw materials are picked up for delivery lines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCreatingNew && !editingPoint && (
              <>
                <button
                  type="button"
                  onClick={handleExportPickupPointsCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Export all stock pickup points with coordinates to CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Mark Pickup Point</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Add / Edit Form Modal Sub-view */}
          {(isCreatingNew || editingPoint) ? (
            <form onSubmit={handleSaveForm} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase text-amber-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>{editingPoint ? `Edit: ${editingPoint.name}` : 'Mark New Stock Pickup Point'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingPoint(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Cancel Edit
                </button>
              </div>

              {/* Geo Location Pin & Robot GPS Capture Bar */}
              <div className="bg-white border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Coordinates & Robot GPS Sync</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Capture exact loading bay coordinates with sub-meter robot precision.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingPoint) {
                        onClose();
                        onStartPinDropForPoint(editingPoint.id);
                      } else {
                        alert('Please save the point first, or pick coordinates below.');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pick on Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingPoint) {
                        onTriggerRobotGpsForPoint(editingPoint.id);
                      } else {
                        onTriggerRobotGpsForPoint('new');
                      }
                    }}
                    disabled={isCapturingGps}
                    className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                    <span>{isCapturingGps ? 'Locking...' : '🤖 Robot GPS'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pickup Point Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Oven & Hot Fryer Dispatch Bay #1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Point Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="Factory Frying / Oven">🔥 Factory Frying / Oven</option>
                    <option value="Packaging Shed">📦 Packaging Shed</option>
                    <option value="Raw Flour & Spices">🌾 Raw Flour & Spices</option>
                    <option value="Third-Party Supplier">🤝 Third-Party Supplier</option>
                    <option value="Central Loading Dock">🚚 Central Loading Dock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Physical Loading Address *
                </label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Bay 1, Frying Section, Industrial Estate, Madurai"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Accuracy</label>
                  <div className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700">
                    ±{Number(formAccuracy).toFixed(1)}m
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-amber-600" />
                    <span>Stocks Available (Comma separated) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formStockItemsText}
                    onChange={(e) => setFormStockItemsText(e.target.value)}
                    placeholder="e.g. Fresh Murukku, Mixture, Ribbon Pakoda"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Daily Dispatch Capacity (Kg)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formCapacityKg}
                    onChange={(e) => setFormCapacityKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Supervisor Incharge</span>
                  </label>
                  <input
                    type="text"
                    value={formSupervisor}
                    onChange={(e) => setFormSupervisor(e.target.value)}
                    placeholder="e.g. P. Ramanathan"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Contact Phone</span>
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 97890 22331"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Loading Window</span>
                  </label>
                  <input
                    type="text"
                    value={formWindow}
                    onChange={(e) => setFormWindow(e.target.value)}
                    placeholder="04:30 AM - 09:30 AM"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingPoint(null);
                  }}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPoint ? 'Update Pickup Point' : 'Save Pickup Point'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* List of existing pickup points */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pickupPoints.map((pt) => (
                <div
                  key={pt.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 bg-white hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-base shadow-2xs">
                        📦
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{pt.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {pt.pointType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onZoomToPoint && (
                        <button
                          type="button"
                          onClick={() => {
                            onZoomToPoint(pt);
                            onClose();
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Center and zoom on map"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(pt)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit pickup point details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete pickup point "${pt.name}"?`)) {
                            onDeletePoint(pt.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete pickup point"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1">{pt.address}</p>

                  {/* Stock Items Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {pt.stockItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* Metrics & Operations */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Capacity</span>
                      <span className="font-mono font-bold text-slate-900">{pt.dispatchCapacityKg.toLocaleString()} kg/day</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Dispatch Window</span>
                      <span className="font-semibold text-slate-700">{pt.dispatchWindow}</span>
                    </div>
                  </div>

                  {/* Supervisor & Pin Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-600 font-medium truncate max-w-[180px]">
                      👤 {pt.supervisorName || 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onStartPinDropForPoint(pt.id);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 cursor-pointer"
                      >
                        📍 Pin Map
                      </button>
                      <button
                        type="button"
                        onClick={() => onTriggerRobotGpsForPoint(pt.id)}
                        className="text-[10px] text-cyan-700 hover:text-cyan-900 font-bold bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200 cursor-pointer flex items-center gap-1"
                      >
                        <Bot className="w-3 h-3" />
                        <span>Robot GPS</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Stock pickup points represent oven, packing, and inward hubs where stocks are gathered before distribution.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
