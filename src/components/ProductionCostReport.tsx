import React, { useState } from 'react';
import { ProductionBatch, Recipe, RawMaterial } from '../types';
import { calculateDetailedProductionCost } from '../utils/calculations';
import { DollarSign, Flame, Droplet, Users, ShieldAlert, Printer, Download, Search, PieChart, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface ProductionCostReportProps {
  batches: ProductionBatch[];
  recipes: Recipe[];
  materials: RawMaterial[];
}

export default function ProductionCostReport({
  batches,
  recipes,
  materials,
}: ProductionCostReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState('all');

  const filteredBatches = batches.filter((b) => {
    const r = recipes.find((recipe) => recipe.id === b.recipeId);
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r && r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRecipe = selectedRecipeFilter === 'all' || b.recipeId === selectedRecipeFilter;
    return matchesSearch && matchesRecipe;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const exportData = filteredBatches.map((b) => {
      const r = recipes.find((recipe) => recipe.id === b.recipeId);
      if (!r) return null;

      const cost = calculateDetailedProductionCost(
        r,
        materials,
        b.batchSizeGrams,
        b.oilUsedLitresActual,
        b.oilCostPerLitreActual,
        b.fuelCostActual,
        b.laborCostActual,
        b.overheadCostActual
      );

      const totalPackedCount = Object.values(b.actualYieldPackets || {}).reduce((a, b) => a + b, 0);

      return {
        'Batch No': b.batchNumber,
        'Date': b.date,
        'Recipe Name': r.name,
        'Batch Size (Kg)': Number((b.batchSizeGrams / 1000).toFixed(1)),
        'Packed Packets Count': totalPackedCount,
        'Oil Used (L)': Number(cost.oilUsedLitres.toFixed(1)),
        'Oil Cost (₹)': Number(cost.oilCost.toFixed(2)),
        'Fuel Cost (₹)': Number(cost.fuelCost.toFixed(2)),
        'Labour Cost (₹)': Number(cost.laborCost.toFixed(2)),
        'Burden Cost (₹)': Number(cost.burdenCost.toFixed(2)),
        'Raw Ingredients Cost (₹)': Number(cost.ingredientsCost.toFixed(2)),
        'Total Production Cost (₹)': Number(cost.totalProductionCost.toFixed(2)),
        'Cost Per Unit (₹/Kg)': Number(cost.costPerKg.toFixed(2))
      };
    }).filter(Boolean) as Record<string, any>[];

    exportToExcel(exportData, `Production_Cost_Report_${new Date().toISOString().slice(0, 10)}`, 'Production Cost Analysis');
  };

  // Grand Totals across filtered batches
  const grandTotals = filteredBatches.reduce(
    (acc, b) => {
      const r = recipes.find((recipe) => recipe.id === b.recipeId);
      if (!r) return acc;

      const c = calculateDetailedProductionCost(
        r,
        materials,
        b.batchSizeGrams,
        b.oilUsedLitresActual,
        b.oilCostPerLitreActual,
        b.fuelCostActual,
        b.laborCostActual,
        b.overheadCostActual
      );

      return {
        batchSizeKg: acc.batchSizeKg + b.batchSizeGrams / 1000,
        oilLitres: acc.oilLitres + c.oilUsedLitres,
        oilCost: acc.oilCost + c.oilCost,
        fuelCost: acc.fuelCost + c.fuelCost,
        laborCost: acc.laborCost + c.laborCost,
        burdenCost: acc.burdenCost + c.burdenCost,
        rawCost: acc.rawCost + c.ingredientsCost,
        totalCost: acc.totalCost + c.totalProductionCost,
      };
    },
    { batchSizeKg: 0, oilLitres: 0, oilCost: 0, fuelCost: 0, laborCost: 0, burdenCost: 0, rawCost: 0, totalCost: 0 }
  );

  return (
    <div className="space-y-5" id="production-cost-report-module">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <PieChart className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Comprehensive Production Costing Report</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Detailed breakdown of Raw Material, Cooking Oil Litres, Gas/Firewood Fuel, Labour Wager, and Overhead Burden per batch
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export Production Cost Analysis to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Output</span>
            <span className="text-xs font-bold text-slate-700">Kg</span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{grandTotals.batchSizeKg.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Droplet className="w-3 h-3 text-amber-500" /> Oil Used</span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{grandTotals.oilLitres.toFixed(1)} <span className="text-xs font-normal">Litres</span></p>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">₹{(grandTotals.oilCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-orange-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Fuel Cost</span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">₹{(grandTotals.fuelCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-slate-400">Gas / Firewood</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3 text-blue-500" /> Labour Cost</span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">₹{(grandTotals.laborCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-slate-400">Worker Daily Wages</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-indigo-50/40 col-span-2 lg:col-span-1 border-indigo-200">
          <div className="flex items-center justify-between text-indigo-900 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Production Cost</span>
          </div>
          <p className="text-xl font-black text-indigo-950 font-mono">₹{(grandTotals.totalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
            Avg: ₹{(grandTotals.batchSizeKg > 0 ? grandTotals.totalCost / grandTotals.batchSizeKg : 0).toFixed(1)} / kg
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by recipe or batch number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedRecipeFilter}
          onChange={(e) => setSelectedRecipeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Recipes</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <th className="px-4 py-3">Batch & Date</th>
                <th className="px-4 py-3">Recipe Formula</th>
                <th className="px-4 py-3 text-right">Batch Size</th>
                <th className="px-4 py-3 text-right">Packed Qty</th>
                <th className="px-4 py-3 text-right">Raw Mat Cost</th>
                <th className="px-4 py-3 text-right">Oil (Litres / Cost)</th>
                <th className="px-4 py-3 text-right">Fuel Cost</th>
                <th className="px-4 py-3 text-right">Labour Cost</th>
                <th className="px-4 py-3 text-right">Burden Cost</th>
                <th className="px-4 py-3 text-right bg-indigo-50/70 text-indigo-950 font-black">Total Cost</th>
                <th className="px-4 py-3 text-right">Cost / Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 italic">
                    No production batch cost entries found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const r = recipes.find((recipe) => recipe.id === b.recipeId);
                  if (!r) return null;

                  const cost = calculateDetailedProductionCost(
                    r,
                    materials,
                    b.batchSizeGrams,
                    b.oilUsedLitresActual,
                    b.oilCostPerLitreActual,
                    b.fuelCostActual,
                    b.laborCostActual,
                    b.overheadCostActual
                  );

                  const totalPackedPackets = Object.values(b.actualYieldPackets || {}).reduce((sum, val) => sum + val, 0);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">{b.batchNumber}</div>
                        <div className="text-[10px] text-slate-400">{b.date}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {(b.batchSizeGrams / 1000).toFixed(1)} kg
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {totalPackedPackets > 0 ? `${totalPackedPackets} pkts` : <span className="text-slate-400 italic">Bulk</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        ₹{(cost.ingredientsCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-800">
                        <div>{cost.oilUsedLitres.toFixed(1)} L</div>
                        <div className="text-[10px] text-amber-600 font-semibold">₹{(cost.oilCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        ₹{(cost.fuelCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        ₹{(cost.laborCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        ₹{(cost.burdenCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold bg-indigo-50/30 text-indigo-950 text-sm">
                        ₹{(cost.totalProductionCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{cost.costPerKg.toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
