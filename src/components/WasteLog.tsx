import React, { useState } from 'react';
import { RawMaterial, WasteEntry } from '../types';
import { 
  Trash2, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  Info, 
  TrendingDown,
  Filter,
  Check,
  FileSpreadsheet,
  PlusCircle
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface WasteLogProps {
  materials: RawMaterial[];
  wasteEntries: WasteEntry[];
  onAddWaste: (newWaste: Omit<WasteEntry, 'id'>) => void;
  onDeleteWaste: (id: string) => void;
}

export default function WasteLog({ materials, wasteEntries, onAddWaste, onDeleteWaste }: WasteLogProps) {
  // Form State
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<number>(0);
  const [reason, setReason] = useState<'Expired' | 'Damaged' | 'Spilled' | 'Contaminated' | 'Other'>('Expired');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  
  // Filter States
  const [filterMaterialId, setFilterMaterialId] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  // Derive unit-specific labels & values
  const getUnitDisplay = (m?: RawMaterial) => {
    if (!m) return '';
    if (m.unit === 'kg') return 'kg';
    if (m.unit === 'L') return 'L';
    if (m.unit === 'packs') return 'packs';
    if (m.unit === 'bundle') return 'bundles';
    if (m.unit === 'pcs') return 'pcs';
    return 'g';
  };

  // Live calculation of financial loss
  const calculateLossCost = () => {
    if (!selectedMaterial || quantityInput <= 0) return 0;
    
    // In database, averageCostPerGram is:
    // - cost per gram if unit is kg, L, or g
    // - cost per piece/pack/bundle if unit is pcs, packs, or bundle
    
    let dbQuantity = quantityInput;
    if (selectedMaterial.unit === 'kg' || selectedMaterial.unit === 'L') {
      dbQuantity = quantityInput * 1000; // convert kg/L to grams
    }
    
    return dbQuantity * selectedMaterial.averageCostPerGram;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || quantityInput <= 0) {
      alert('Please select a valid material and enter a positive quantity.');
      return;
    }

    if (!selectedMaterial) return;

    // Check if stock is sufficient, warn if not
    let dbQuantity = quantityInput;
    if (selectedMaterial.unit === 'kg' || selectedMaterial.unit === 'L') {
      dbQuantity = quantityInput * 1000;
    }

    if (dbQuantity > selectedMaterial.currentStockGrams) {
      const confirmLog = confirm(
        `Warning: Wasted quantity (${quantityInput} ${getUnitDisplay(selectedMaterial)}) exceeds current inventory stock (${
          selectedMaterial.unit === 'kg' || selectedMaterial.unit === 'L'
            ? (selectedMaterial.currentStockGrams / 1000).toFixed(2)
            : selectedMaterial.currentStockGrams
        } ${getUnitDisplay(selectedMaterial)}). Do you still want to log this loss?`
      );
      if (!confirmLog) return;
    }

    const calculatedCost = calculateLossCost();

    onAddWaste({
      materialId: selectedMaterialId,
      quantityGrams: dbQuantity,
      cost: Number(calculatedCost.toFixed(2)),
      reason,
      date,
      notes: notes.trim()
    });

    // Reset Form
    setSelectedMaterialId('');
    setQuantityInput(0);
    setNotes('');
    setReason('Expired');
  };

  // Filtered waste logs
  const filteredEntries = wasteEntries.filter((entry) => {
    const matchesMaterial = filterMaterialId === 'all' || entry.materialId === filterMaterialId;
    const matchesReason = filterReason === 'all' || entry.reason === filterReason;
    return matchesMaterial && matchesReason;
  });

  // Analytics
  const totalWastedCost = filteredEntries.reduce((sum, item) => sum + item.cost, 0);
  const totalWasteRecords = filteredEntries.length;

  // Breakdown by Reason
  const reasonBreakdown = filteredEntries.reduce((acc, curr) => {
    acc[curr.reason] = (acc[curr.reason] || 0) + curr.cost;
    return acc;
  }, {} as Record<string, number>);

  const handleExportExcel = () => {
    const exportData = filteredEntries.map((entry) => {
      const mat = materials.find((m) => m.id === entry.materialId);
      const displayQty = mat?.unit === 'kg' || mat?.unit === 'L'
        ? `${(entry.quantityGrams / 1000).toFixed(2)} ${mat.unit}`
        : `${entry.quantityGrams} ${mat?.unit || 'g'}`;
      return {
        'Date': entry.date,
        'Ingredient / Material': mat?.name || 'Unknown Item',
        'Category': mat?.category || '-',
        'Qty Lost': displayQty,
        'Reason': entry.reason,
        'Value Loss (₹)': entry.cost,
        'Notes': entry.notes || '-'
      };
    });
    exportToExcel(exportData, `Waste_Logs_${new Date().toISOString().split('T')[0]}`, 'Waste Logs');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" id="waste-entry-container">
      {/* Header Banner */}
      <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-sans leading-tight">Non-Production Waste Logs</h3>
            <p className="text-slate-400 text-xs">Record damaged goods, spoilage, or raw material expiration to correct stock levels</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold border border-rose-500/30">OUTFLOW</span>
        </div>
      </div>

      <div className="p-6">
        {/* Analytics Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 tracking-tight uppercase">Total Waste Financial Loss</p>
              <h4 className="text-2xl font-extrabold text-rose-950 font-mono mt-1">
                ₹{totalWastedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <p className="text-[10px] text-rose-500 mt-1">Direct material write-off costs (cumulative)</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 tracking-tight uppercase">Total Waste Occurrences</p>
              <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                {totalWasteRecords} <span className="text-xs text-slate-400 font-normal">logs</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">Non-production stock corrections logged</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
            <p className="text-xs font-semibold text-amber-700 tracking-tight uppercase">Loss Breakdown by Reason</p>
            <div className="mt-2 space-y-1 text-xs font-mono">
              {Object.keys(reasonBreakdown).length === 0 ? (
                <p className="text-slate-400 italic text-[11px] mt-2">No loss logged yet.</p>
              ) : (
                Object.entries(reasonBreakdown).map(([r, cost]) => (
                  <div key={r} className="flex justify-between text-[11px]">
                    <span className="text-slate-600">{r}:</span>
                    <span className="font-bold text-amber-900">₹{cost.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Side - 5 columns */}
          <div className="lg:col-span-5 bg-slate-50/60 border border-slate-200 p-6 rounded-2xl" id="add-waste-form-container">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-rose-500" />
              <span>Log Non-Production Loss</span>
            </h4>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Select Wasted Material <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => {
                    setSelectedMaterialId(e.target.value);
                    setQuantityInput(0);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500"
                  required
                >
                  <option value="">-- Choose Raw Material or Packaging --</option>
                  {materials.map((m) => {
                    const displayStock = m.unit === 'kg' || m.unit === 'L' 
                      ? (m.currentStockGrams / 1000).toFixed(2)
                      : m.currentStockGrams;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category}) - Stock: {displayStock} {getUnitDisplay(m)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Wasted Quantity {selectedMaterial ? `(${getUnitDisplay(selectedMaterial)})` : ''} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantityInput || ''}
                    onChange={(e) => setQuantityInput(Math.max(0, Number(e.target.value)))}
                    disabled={!selectedMaterialId}
                    placeholder={selectedMaterial ? `e.g. 1.5` : "Enter quantity"}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 font-mono disabled:bg-slate-100 disabled:text-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Reason For Loss <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500"
                    required
                  >
                    <option value="Expired">Expired (பாழானது / காலாவதி)</option>
                    <option value="Damaged">Damaged (சேதமடைந்தது)</option>
                    <option value="Spilled">Spilled / Wasted (சிதறியது / கழிவு)</option>
                    <option value="Contaminated">Contaminated (அசுத்தமானது)</option>
                    <option value="Other">Other (இதர காரணங்கள்)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Date of Loss Record <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Calendar className="w-4 h-4" /></span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Investigation / Description Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Mold detected due to humidity, bag torn during storage shift..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500"
                />
              </div>

              {/* Dynamic Financial Estimation Summary */}
              {selectedMaterial && quantityInput > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-rose-900 font-mono">
                    <span>Average material cost:</span>
                    <span className="font-bold">
                      {selectedMaterial.unit === 'kg' || selectedMaterial.unit === 'L'
                        ? `₹${(selectedMaterial.averageCostPerGram * 1000).toFixed(2)} / ${getUnitDisplay(selectedMaterial)}`
                        : `₹${selectedMaterial.averageCostPerGram.toFixed(2)} / ${getUnitDisplay(selectedMaterial)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-900 font-mono">
                    <span>Loss quantity:</span>
                    <span>{quantityInput} {getUnitDisplay(selectedMaterial)}</span>
                  </div>
                  <div className="h-px bg-rose-200/50 my-1" />
                  <div className="flex justify-between text-sm text-rose-950 font-mono font-bold">
                    <span>Estimated Financial Write-off:</span>
                    <span>₹{calculateLossCost().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Waste Correction & Correct Stock</span>
              </button>
            </form>
          </div>

          {/* History List Side - 7 columns */}
          <div className="lg:col-span-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h4 className="text-sm font-bold text-slate-800">
                Waste Correction Logs History ({filteredEntries.length})
              </h4>
              
              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filterMaterialId}
                    onChange={(e) => setFilterMaterialId(e.target.value)}
                    className="bg-transparent border-none focus:outline-hidden text-slate-700 font-semibold text-[11px]"
                  >
                    <option value="all">All Materials</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                  <select
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="bg-transparent border-none focus:outline-hidden text-slate-700 font-semibold text-[11px]"
                  >
                    <option value="all">All Reasons</option>
                    <option value="Expired">Expired</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Spilled">Spilled</option>
                    <option value="Contaminated">Contaminated</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Export waste logs to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Logs List Table */}
            {filteredEntries.length === 0 ? (
              <div className="border border-dashed border-slate-200 p-12 text-center rounded-2xl bg-slate-50/30">
                <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">No waste correction logs found</p>
                <p className="text-xs text-slate-400 mt-1">Select a material on the left to start correcting stock levels</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Ingredient / Material</th>
                        <th className="px-4 py-3">Qty Lost</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3 text-right">Value Loss</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map((entry) => {
                        const mat = materials.find((m) => m.id === entry.materialId);
                        const displayQty = mat?.unit === 'kg' || mat?.unit === 'L'
                          ? (entry.quantityGrams / 1000).toFixed(2)
                          : entry.quantityGrams;
                        
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                              {entry.date}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800 block">
                                {mat?.name || 'Unknown Ingredient'}
                              </span>
                              {entry.notes && (
                                <span className="text-[10px] text-slate-400 block italic leading-tight mt-0.5 max-w-xs truncate" title={entry.notes}>
                                  "{entry.notes}"
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {displayQty} {getUnitDisplay(mat)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                entry.reason === 'Expired' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                  : entry.reason === 'Damaged' 
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : entry.reason === 'Spilled'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                {entry.reason}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                              ₹{entry.cost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
                                  if (confirm(`Do you want to delete this loss entry and RESTORE raw stock level of ${mat?.name} (+${displayQty} ${getUnitDisplay(mat)})?`)) {
                                    onDeleteWaste(entry.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                                title="Delete Log & Restore Stock"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-4.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-indigo-950">Aesthetic Portion Adjustment Guidance</h5>
                <p className="text-[11px] text-indigo-800 leading-relaxed mt-0.5">
                  Logging raw stock waste directly reduces the <strong>Current Stock</strong> level of the selected item, immediately correcting the inventory valuation displayed on your main raw stock dashboard. Restoring or deleting a waste log returns those ingredients safely back to inventory.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
