import React, { useState } from 'react';
import { ProductionBatch, Recipe, RawMaterial } from '../types';
import { 
  Scale, 
  TrendingUp, 
  AlertOctagon, 
  CheckCircle2, 
  FileText, 
  BarChart4, 
  HelpCircle,
  Lightbulb,
  Cpu,
  RefreshCw,
  Gauge,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface YieldReportsProps {
  batches: ProductionBatch[];
  recipes: Recipe[];
  materials: RawMaterial[];
  onAddSimulatedBatches?: () => void;
}

export default function YieldReports({ batches, recipes, materials, onAddSimulatedBatches }: YieldReportsProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [filterRecipeId, setFilterRecipeId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');

  // Filter packed batches
  const packedBatches = batches.filter(b => b.status === 'Packed');

  // Filter based on recipe selection
  const filteredBatches = packedBatches.filter(b => {
    if (filterRecipeId === 'all') return true;
    return b.recipeId === filterRecipeId;
  });

  // Calculate yield statistics
  let totalTheoretical = 0;
  let totalActual = 0;
  let highLossBatchesCount = 0;
  let totalLossCost = 0;

  filteredBatches.forEach(b => {
    const recipe = recipes.find(r => r.id === b.recipeId);
    if (!recipe) return;

    Object.keys(b.expectedYieldPackets).forEach(sizeId => {
      const theoretical = b.expectedYieldPackets[sizeId] || 0;
      const actual = b.actualYieldPackets[sizeId] || 0;
      totalTheoretical += theoretical;
      totalActual += actual;

      const sizeConfig = recipe.packagingSizes.find(ps => ps.id === sizeId);
      if (sizeConfig) {
        const loss = theoretical - actual;
        if (loss > 0) {
          // Approximate cost of loss based on MRP or pouch cost
          totalLossCost += loss * (sizeConfig.mrp * 0.6); // 60% of MRP represents approximate cost of goods sold
        }
      }
    });

    // Check if high loss (>3%)
    let batchTheoretical = 0;
    let batchActual = 0;
    Object.keys(b.expectedYieldPackets).forEach(sizeId => {
      batchTheoretical += b.expectedYieldPackets[sizeId] || 0;
      batchActual += b.actualYieldPackets[sizeId] || 0;
    });
    if (batchTheoretical > 0) {
      const lossPct = ((batchTheoretical - batchActual) / batchTheoretical) * 100;
      if (lossPct > 3) {
        highLossBatchesCount++;
      }
    }
  });

  const overallEfficiency = totalTheoretical > 0 ? (totalActual / totalTheoretical) * 100 : 100;
  const overallLossPct = Math.max(0, 100 - overallEfficiency);

  // Generate dynamic diagnosis for a selected batch
  const getBatchDiagnosis = (batch: ProductionBatch, recipe: Recipe) => {
    let diagnosisList: { category: string; description: string; impact: string }[] = [];

    let batchTheo = 0;
    let batchAct = 0;
    Object.keys(batch.expectedYieldPackets).forEach(sizeId => {
      batchTheo += batch.expectedYieldPackets[sizeId] || 0;
      batchAct += batch.actualYieldPackets[sizeId] || 0;
    });

    const diff = batchAct - batchTheo;
    const diffPct = batchTheo > 0 ? (diff / batchTheo) * 100 : 0;

    if (diffPct < -5) {
      // High Loss (> 5%)
      diagnosisList.push({
        category: "Equipment Calibration Error (High Risk)",
        description: "The volumetric filling machine is likely over-dispensing product per pouch (e.g. scale is drifting positive, feeding 53g instead of 50g target). Workers are packing heavier bags than intended, leading to immediate yield shortages.",
        impact: "Severe portion control loss. Leads to profit leakage despite high physical quality."
      });
      diagnosisList.push({
        category: "Heat Sealer & Packaging Rejection",
        description: "Improper heating jaw alignment or incorrect temperature calibration on the packaging machine. This results in weak or burned seals, leading to immediate rejection of bags on the line.",
        impact: "Pouch material wastage and line downtime. Increased scrap plastic."
      });
      diagnosisList.push({
        category: "Material Spillage / Conveyor Loss",
        description: "Snack material is spilling off the high-frequency vibratory feeder or packing chute. Murukku or Kara Sev crumbs may be separating during fast transport, collecting in the crumb catchers instead of entering bags.",
        impact: "Physical product loss of ingredients. High cleaning frequency needed."
      });
    } else if (diffPct < -1) {
      // Standard Loss (1% - 5%)
      diagnosisList.push({
        category: "Moisture Evaporation Variance",
        description: "Moisture content in ingredients evaporated at a higher rate during deep frying than estimated in the baseline recipe formula. This results in lighter cooked bulk food density.",
        impact: "Acceptable physical variance. Can be optimized by adjusting frying heat curve durations."
      });
      diagnosisList.push({
        category: "Portion Dispensation Tolerance",
        description: "Standard worker hand-packing variation or multi-head scale weight tolerances. Minor over-fill buffer (+1g or +2g per pouch) to avoid legal underweight violations.",
        impact: "Normal operational buffer."
      });
    } else if (diffPct > 2) {
      // Significant Over-Yielding (Under-filling)
      diagnosisList.push({
        category: "Severe Under-filling Calibration Hazard",
        description: "The pouch filling nozzle is under-dispensing snack material (packing lighter than label weights, e.g. 47g in 50g pouches). While this raises bag counts, it violates legal consumer weights and trade description acts.",
        impact: "Critical risk of legal fines, customer complaints, and distributor brand rejection."
      });
      diagnosisList.push({
        category: "Bulk Food Density Inconsistency",
        description: "The cooked snack batch expanded excessively (over-puffed) or absorbed less oil than standard, making the bulk product lighter in density. The volume-based filler filled bags to capacity visually but with lower actual weight.",
        impact: "Product consistency issue. Check oil absorption and mixing parameters."
      });
    } else {
      // Optimal Yield
      diagnosisList.push({
        category: "Calibration & Yield in Perfect Alignment",
        description: "Weighing scales, portion control depositors, and conveyor vibrations are working in perfect harmony. Moisture retention is exactly on-target with recipe standards.",
        impact: "Maximized profit margins and compliance."
      });
    }

    return {
      diff,
      diffPct,
      diagnosisList
    };
  };

  const selectedBatch = filteredBatches.find(b => b.id === selectedBatchId);
  const selectedRecipe = selectedBatch ? recipes.find(r => r.id === selectedBatch.recipeId) : null;
  const selectedDiagnosis = selectedBatch && selectedRecipe ? getBatchDiagnosis(selectedBatch, selectedRecipe) : null;

  const handleExportExcel = () => {
    const exportData = filteredBatches.map((b) => {
      const r = recipes.find(rec => rec.id === b.recipeId);
      let theo = 0;
      let act = 0;
      Object.keys(b.expectedYieldPackets || {}).forEach(k => {
        theo += b.expectedYieldPackets[k] || 0;
        act += b.actualYieldPackets[k] || 0;
      });
      const diff = act - theo;
      const diffPct = theo > 0 ? ((diff / theo) * 100).toFixed(1) + '%' : '0%';
      const eff = theo > 0 ? ((act / theo) * 100).toFixed(1) + '%' : '100%';
      const diag = r ? getBatchDiagnosis(b, r) : null;
      const mainReason = diag && diag.diagnosisList.length > 0 ? diag.diagnosisList[0].category : 'Normal / Within Tolerance';

      return {
        'Batch Number': b.batchNumber,
        'Date': b.date,
        'Recipe Name': r?.name || 'Unknown Recipe',
        'Batch Size (g)': b.batchSizeGrams,
        'Expected Packets': theo,
        'Actual Packets': act,
        'Variance (Packets)': diff,
        'Variance (%)': diffPct,
        'Yield Efficiency': eff,
        'Primary Diagnosis / Root Cause': mainReason,
        'Notes': b.notes || '-'
      };
    });
    exportToExcel(exportData, `Yield_Variance_Report_${new Date().toISOString().split('T')[0]}`, 'Yield Analysis');
  };

  return (
    <div className="space-y-6" id="yield-reports-view">
      
      {/* Title Header */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20">
              Analytical Suite
            </span>
            <span className="text-slate-400 text-xs">• Real-time Portion Control Tracking</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
            Yield Variance & Calibration Report
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            Compares theoretical expectations based on batch weight against actual filled bags. Pinpoint spillage, sealing errors, scale drift, and portion control anomalies.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all duration-150 flex items-center space-x-1.5 shadow-sm cursor-pointer"
            title="Export yield variance analysis to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          {packedBatches.length === 0 && onAddSimulatedBatches && (
            <button
              onClick={onAddSimulatedBatches}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all duration-150 flex items-center space-x-2 shadow-md cursor-pointer animate-pulse"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Load Demo Batch Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytical KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Overall Efficiency */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className={`p-3.5 rounded-lg ${overallEfficiency >= 98 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Yield Efficiency</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5 font-mono">
              {overallEfficiency.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overallEfficiency >= 98 ? 'Optimal line performance' : 'Actionable loss detected'}
            </p>
          </div>
        </div>

        {/* KPI 2: Overall Loss Rate */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className={`p-3.5 rounded-lg ${overallLossPct < 2 ? 'bg-slate-50 text-slate-500' : 'bg-rose-50 text-rose-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Loss %</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5 font-mono">
              {overallLossPct.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overallLossPct > 2 ? 'Exceeds 2% plant threshold' : 'Within normal limits'}
            </p>
          </div>
        </div>

        {/* KPI 3: Gaps flagged */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className={`p-3.5 rounded-lg ${highLossBatchesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Variances</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5 font-mono">
              {highLossBatchesCount} Batches
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              With yield losses &gt; 3%
            </p>
          </div>
        </div>

        {/* KPI 4: Financial waste value */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-lg">
            <span className="font-bold text-lg">₹</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Spillage Cost</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5 font-mono">
              ₹{(totalLossCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Approximate cost of goods wasted
            </p>
          </div>
        </div>

      </div>

      {/* Main Content Splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Batches Table & Visual Indicator */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Table Header Filter controls */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-2">
                <BarChart4 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Batch-Wise Deviation</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium font-sans">Filter Recipe:</span>
                <select
                  value={filterRecipeId}
                  onChange={(e) => setFilterRecipeId(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium cursor-pointer text-slate-700"
                >
                  <option value="all">All Recipes</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Batches Table List */}
            {filteredBatches.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No completed (Packed) production batches found.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Go to <strong>Production Cooking</strong>, start a cooking batch, and then click <strong>"Pack Into Pouches"</strong> to log the actual filled quantities! Alternatively, click the green button above to load demo batch records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Batch Reference</th>
                      <th className="px-5 py-3">Recipe</th>
                      <th className="px-5 py-3 text-right">Batch Weight</th>
                      <th className="px-5 py-3 text-right">Expected Bags</th>
                      <th className="px-5 py-3 text-right">Actual Bags</th>
                      <th className="px-5 py-3 text-right">Deviation</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredBatches.map((b) => {
                      const recipe = recipes.find(r => r.id === b.recipeId);
                      const isSelected = selectedBatchId === b.id;

                      // Aggregate theoretical bags vs actual bags
                      let theoTotal = 0;
                      let actTotal = 0;
                      Object.keys(b.expectedYieldPackets).forEach(sizeId => {
                        theoTotal += b.expectedYieldPackets[sizeId] || 0;
                        actTotal += b.actualYieldPackets[sizeId] || 0;
                      });

                      const diff = actTotal - theoTotal;
                      const diffPct = theoTotal > 0 ? (diff / theoTotal) * 100 : 0;

                      // Status tag
                      let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      let statusText = "Optimal";

                      if (diffPct < -3) {
                        badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                        statusText = "Severe Loss";
                      } else if (diffPct < 0) {
                        badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                        statusText = "Acceptable Loss";
                      } else if (diffPct > 2) {
                        badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                        statusText = "Over-Yielding";
                      }

                      return (
                        <tr 
                          key={b.id} 
                          onClick={() => setSelectedBatchId(b.id)}
                          className={`hover:bg-slate-50 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/50 font-medium' : ''}`}
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-bold text-slate-900">{b.batchNumber}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{b.date}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-800">
                            {recipe?.name || 'Unknown Recipe'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                            {(b.batchSizeGrams / 1000).toFixed(1)} kg
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                            {theoTotal}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-900 font-bold">
                            {actTotal}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-mono font-bold ${
                            diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diffPct.toFixed(1)}%)
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Plant Standards Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Normal Frying Waste Allowance</span>
              <p className="text-sm font-semibold text-slate-700">1.0% - 1.5%</p>
              <p className="text-[10px] text-slate-500 leading-normal">Moisture cooling loss and structural crumbles during handling.</p>
            </div>
            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
              <span className="text-[10px] font-bold uppercase text-slate-400">Packaging Seal Failure Target</span>
              <p className="text-sm font-semibold text-slate-700">&lt; 0.5%</p>
              <p className="text-[10px] text-slate-500 leading-normal">Thermal sealing discrepancies, pouch trimming cuts and test sacks.</p>
            </div>
            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
              <span className="text-[10px] font-bold uppercase text-slate-400">Filling Scale Discretion</span>
              <p className="text-sm font-semibold text-slate-700">+/- 0.8g max</p>
              <p className="text-[10px] text-slate-500 leading-normal">Permissible electronic multihead weigher calibration variance.</p>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Selected Batch Live Diagnosis & Action Suggestions */}
        <div className="space-y-4">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 min-h-[380px]">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Yield Diagnostic Console</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Select a batch from the table to diagnose portion control calibration errors.</p>
            </div>

            {!selectedBatch ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold leading-relaxed">No batch selected.<br />Click on any batch row to view dynamic diagnostic root causes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Selected batch summary */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Batch {selectedBatch.batchNumber}</span>
                    <span className="text-[10px] text-slate-500">{selectedBatch.date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>Recipe: <strong className="text-slate-950">{selectedRecipe?.name}</strong></div>
                    <div>Batch size: <strong className="text-slate-950 font-mono">{(selectedBatch.batchSizeGrams / 1000).toFixed(0)}kg</strong></div>
                  </div>
                </div>

                {/* Variance score */}
                <div className="space-y-1.5 text-center p-3 rounded-lg border bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Measured Deviation Rate</span>
                  <div className={`text-2xl font-black font-mono ${
                    (selectedDiagnosis?.diffPct || 0) < 0 ? 'text-rose-600' : (selectedDiagnosis?.diffPct || 0) > 0 ? 'text-blue-600' : 'text-emerald-600'
                  }`}>
                    {(selectedDiagnosis?.diffPct || 0).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-sans">
                    {Math.abs(selectedDiagnosis?.diff || 0)} bags {(selectedDiagnosis?.diff || 0) < 0 ? 'short of theoretical expectation' : 'above target'}
                  </div>
                </div>

                {/* Diagnostic list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Potential Causes & Recommendations</h4>
                  
                  {selectedDiagnosis?.diagnosisList.map((diag, index) => (
                    <div key={index} className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100/50 space-y-1">
                      <div className="flex items-start space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <h5 className="text-[11px] font-bold text-indigo-950">{diag.category}</h5>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-normal font-sans">{diag.description}</p>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">
                        <strong>Impact:</strong> {diag.impact}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Remark line */}
                {selectedBatch.notes && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-normal">
                    <strong>Logged worker remark:</strong> "{selectedBatch.notes}"
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
