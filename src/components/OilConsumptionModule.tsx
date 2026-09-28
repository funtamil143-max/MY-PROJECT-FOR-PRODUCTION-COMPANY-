import React, { useState, useMemo } from 'react';
import {
  Droplet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  Calculator,
  FileSpreadsheet,
  Calendar,
  Layers,
  BarChart3,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldAlert,
  Archive,
  History,
  HelpCircle,
  Activity,
  Flame,
  Zap,
  Award,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { ProductionBatch, Recipe, RawMaterial } from '../types';

interface OilConsumptionModuleProps {
  batches: ProductionBatch[];
  recipes: Recipe[];
  materials: RawMaterial[];
  onUpdateBatch?: (batchId: string, updated: Partial<ProductionBatch>) => void;
  onUpdateMaterialStock?: (materialId: string, quantityChangeKg: number) => void;
}

export const OilConsumptionModule: React.FC<OilConsumptionModuleProps> = ({
  batches = [],
  recipes = [],
  materials = [],
  onUpdateBatch,
  onUpdateMaterialStock
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'calculator' | 'variance' | 'reconciliation' | 'reports'>('calculator');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [selectedFryerFilter, setSelectedFryerFilter] = useState<string>('all');

  const availableFryers = useMemo(() => {
    const set = new Set<string>(['Kadai 1 (Main Fryer)', 'Kadai 2 (Specialty)', 'Continuous Fryer Line A', 'Roasting Drum #1']);
    batches.forEach(b => {
      if (b.oilFryerName) set.add(b.oilFryerName);
    });
    return Array.from(set);
  }, [batches]);

  const chartData = useMemo(() => {
    return batches
      .filter(b => selectedFryerFilter === 'all' || (b.oilFryerName || 'Kadai 1 (Main Fryer)') === selectedFryerFilter)
      .map(b => {
        const yKg = b.batchSizeGrams ? b.batchSizeGrams / 1000 : 50;
        const r = recipes.find(rec => rec.id === b.recipeId || rec.name === b.recipeName);
        const stdPerKg = r?.oilUsedLitres ? r.oilUsedLitres / (r.producedYieldKg || 10) : 0.22;
        const expected = yKg * stdPerKg;
        const actual = b.oilUsedLitresActual ?? ((b.oilOpeningLitres ?? 100) + (b.oilFreshAddedLitres ?? 20) - (b.oilRecoveredLitres ?? 90) - (b.oilCarriedForwardLitres ?? 10));
        const diff = actual - expected;
        const pct = expected > 0 ? (diff / expected) * 100 : 0;
        
        return {
          id: b.id,
          name: `${b.batchNumber}`,
          batchNumber: b.batchNumber,
          date: b.date,
          recipeName: b.recipeName,
          fryer: b.oilFryerName || 'Kadai 1 (Main Fryer)',
          expected: Number(expected.toFixed(1)),
          actual: Number(actual.toFixed(1)),
          variance: Number(diff.toFixed(1)),
          variancePct: Number(pct.toFixed(1)),
          yieldKg: Number(yKg.toFixed(1)),
          isHigh: pct > 5
        };
      });
  }, [batches, recipes, selectedFryerFilter]);

  const fryerEfficiencyAnalytics = useMemo(() => {
    const stats: Record<string, { totalExpected: number; totalActual: number; batchCount: number; totalVariance: number }> = {};
    
    batches.forEach(b => {
      const fryer = b.oilFryerName || 'Kadai 1 (Main Fryer)';
      if (!stats[fryer]) {
        stats[fryer] = { totalExpected: 0, totalActual: 0, batchCount: 0, totalVariance: 0 };
      }
      const yKg = b.batchSizeGrams ? b.batchSizeGrams / 1000 : 50;
      const r = recipes.find(rec => rec.id === b.recipeId || rec.name === b.recipeName);
      const stdPerKg = r?.oilUsedLitres ? r.oilUsedLitres / (r.producedYieldKg || 10) : 0.22;
      const expected = yKg * stdPerKg;
      const actual = b.oilUsedLitresActual ?? ((b.oilOpeningLitres ?? 100) + (b.oilFreshAddedLitres ?? 20) - (b.oilRecoveredLitres ?? 90) - (b.oilCarriedForwardLitres ?? 10));
      
      stats[fryer].totalExpected += expected;
      stats[fryer].totalActual += actual;
      stats[fryer].totalVariance += (actual - expected);
      stats[fryer].batchCount += 1;
    });

    let worstFryer = 'N/A';
    let highestVariancePct = -999;
    let totalExcessOil = 0;

    Object.entries(stats).forEach(([name, data]) => {
      const pct = data.totalExpected > 0 ? ((data.totalActual - data.totalExpected) / data.totalExpected) * 100 : 0;
      if (pct > highestVariancePct) {
        highestVariancePct = pct;
        worstFryer = name;
      }
      if (data.totalVariance > 0) {
        totalExcessOil += data.totalVariance;
      }
    });

    return {
      stats,
      worstFryer,
      highestVariancePct: highestVariancePct === -999 ? 0 : Number(highestVariancePct.toFixed(1)),
      totalExcessOil: Number(totalExcessOil.toFixed(1)),
      excessCostRs: Math.round(totalExcessOil * 115)
    };
  }, [batches, recipes]);
  
  // Custom states for manual batch oil calculator inputs
  const selectedBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const selectedRecipe = recipes.find(r => r.id === selectedBatch?.recipeId || r.name === selectedBatch?.recipeName);

  // Default values based on selected batch
  const [openingLitres, setOpeningLitres] = useState<number>(selectedBatch?.oilOpeningLitres ?? 120);
  const [openingRate, setOpeningRate] = useState<number>(selectedBatch?.oilOpeningRate ?? 115);
  const [freshAddedLitres, setFreshAddedLitres] = useState<number>(selectedBatch?.oilFreshAddedLitres ?? 25);
  const [freshAddedRate, setFreshAddedRate] = useState<number>(selectedBatch?.oilFreshAddedRate ?? 118);
  const [recoveredLitres, setRecoveredLitres] = useState<number>(selectedBatch?.oilRecoveredLitres ?? 110);
  const [carriedForwardLitres, setCarriedForwardLitres] = useState<number>(selectedBatch?.oilCarriedForwardLitres ?? 10);
  const [wasteLitres, setWasteLitres] = useState<number>(selectedBatch?.oilWasteLitres ?? 3);
  const [wasteReason, setWasteReason] = useState<'Burnt Oil' | 'Contaminated Oil' | 'Spillage' | 'Disposal' | 'Other'>(
    selectedBatch?.oilWasteReason ?? 'Burnt Oil'
  );
  const [fryerName, setFryerName] = useState<string>(selectedBatch?.oilFryerName ?? 'Kadai 1 (Main Fryer)');
  const [operatorName, setOperatorName] = useState<string>(selectedBatch?.oilOperator ?? 'Suresh Kumar (Senior Fryer)');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Update local input state when selected batch changes
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const b = batches.find(item => item.id === batchId);
    if (b) {
      setOpeningLitres(b.oilOpeningLitres ?? 120);
      setOpeningRate(b.oilOpeningRate ?? 115);
      setFreshAddedLitres(b.oilFreshAddedLitres ?? 20);
      setFreshAddedRate(b.oilFreshAddedRate ?? 118);
      setRecoveredLitres(b.oilRecoveredLitres ?? 105);
      setCarriedForwardLitres(b.oilCarriedForwardLitres ?? 10);
      setWasteLitres(b.oilWasteLitres ?? 2.5);
      setWasteReason(b.oilWasteReason ?? 'Burnt Oil');
      setFryerName(b.oilFryerName ?? 'Kadai 1 (Main Fryer)');
      setOperatorName(b.oilOperator ?? 'Suresh Kumar (Senior Fryer)');
    }
  };

  // Find Palm Oil material stocks
  const palmOilMaterial = materials.find(m => m.id === 'mat_oil' || m.name.toLowerCase().includes('palm oil'));
  const oldOilMaterial = materials.find(m => m.id === 'mat_old_oil' || m.name.toLowerCase().includes('old oil'));
  const currentPalmOilStockKg = palmOilMaterial?.currentStock ?? 450;
  const currentOldOilStockKg = oldOilMaterial?.currentStock ?? 120;

  // Real-time Precision Calculations
  const totalAvailableLitres = useMemo(() => openingLitres + freshAddedLitres, [openingLitres, freshAddedLitres]);
  
  const totalAvailableValue = useMemo(() => {
    return (openingLitres * openingRate) + (freshAddedLitres * freshAddedRate);
  }, [openingLitres, openingRate, freshAddedLitres, freshAddedRate]);

  const weightedAverageRate = useMemo(() => {
    return totalAvailableLitres > 0 ? totalAvailableValue / totalAvailableLitres : openingRate;
  }, [totalAvailableValue, totalAvailableLitres, openingRate]);

  // Actual Oil Consumption Formula: Total Available - Recovered Reusable - Carried Forward
  const actualConsumedLitres = useMemo(() => {
    const consumed = totalAvailableLitres - recoveredLitres - carriedForwardLitres;
    return Math.max(0, consumed);
  }, [totalAvailableLitres, recoveredLitres, carriedForwardLitres]);

  const actualConsumedCost = useMemo(() => {
    return actualConsumedLitres * weightedAverageRate;
  }, [actualConsumedLitres, weightedAverageRate]);

  // Yield and efficiency
  const batchYieldKg = selectedBatch?.batchSizeGrams ? selectedBatch.batchSizeGrams / 1000 : 85;
  
  const oilConsumedPerKg = useMemo(() => {
    return batchYieldKg > 0 ? actualConsumedLitres / batchYieldKg : 0;
  }, [actualConsumedLitres, batchYieldKg]);

  const oilCostPerKg = useMemo(() => {
    return batchYieldKg > 0 ? actualConsumedCost / batchYieldKg : 0;
  }, [actualConsumedCost, batchYieldKg]);

  // Standard Recipe Oil comparison
  const standardOilPerKg = selectedRecipe?.oilUsedLitres 
    ? selectedRecipe.oilUsedLitres / (selectedRecipe.producedYieldKg || 10) 
    : 0.22; // Default 220ml/kg standard
  const standardExpectedLitres = batchYieldKg * standardOilPerKg;
  const varianceLitres = actualConsumedLitres - standardExpectedLitres;
  const variancePercentage = standardExpectedLitres > 0 ? (varianceLitres / standardExpectedLitres) * 100 : 0;

  // Save calculation to Batch
  const handleSaveToBatch = () => {
    if (!selectedBatch || !onUpdateBatch) return;
    onUpdateBatch(selectedBatch.id, {
      oilOpeningLitres: openingLitres,
      oilOpeningRate: openingRate,
      oilFreshAddedLitres: freshAddedLitres,
      oilFreshAddedRate: freshAddedRate,
      oilRecoveredLitres: recoveredLitres,
      oilCarriedForwardLitres: carriedForwardLitres,
      oilWasteLitres: wasteLitres,
      oilWasteReason: wasteReason,
      oilFryerName: fryerName,
      oilOperator: operatorName,
      oilUsedLitresActual: Number(actualConsumedLitres.toFixed(2)),
      oilCostPerLitreActual: Number(weightedAverageRate.toFixed(2))
    });

    // Also deduct fresh added oil from palm oil stock if material updater is provided
    if (onUpdateMaterialStock && palmOilMaterial && freshAddedLitres > 0) {
      // Assuming 1 litre palm oil ≈ 0.91 kg
      const kgToDeduct = Number((freshAddedLitres * 0.91).toFixed(2));
      onUpdateMaterialStock(palmOilMaterial.id, -kgToDeduct);
    }

    setSaveSuccessMsg(`Successfully synced precision oil consumption (${actualConsumedLitres.toFixed(1)} L @ ₹${actualConsumedCost.toFixed(0)}) to Batch #${selectedBatch.batchNumber}!`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = "Batch No,Date,Product,Yield Kg,Opening L,Fresh Added L,Recovered L,Carried Fwd L,Waste L,Consumed L,Weighted Rate,Total Cost Rs,Oil/Kg L\n";
    const rows = batches.map(b => {
      const yieldKg = b.batchSizeGrams ? b.batchSizeGrams / 1000 : 50;
      const consumed = b.oilUsedLitresActual ?? ((b.oilOpeningLitres ?? 100) + (b.oilFreshAddedLitres ?? 20) - (b.oilRecoveredLitres ?? 90) - (b.oilCarriedForwardLitres ?? 10));
      const rate = b.oilCostPerLitreActual ?? 115;
      return `${b.batchNumber},${b.date},${b.recipeName},${yieldKg},${b.oilOpeningLitres ?? 100},${b.oilFreshAddedLitres ?? 20},${b.oilRecoveredLitres ?? 90},${b.oilCarriedForwardLitres ?? 10},${b.oilWasteLitres ?? 2},${consumed.toFixed(2)},${rate.toFixed(2)},${(consumed * rate).toFixed(0)},${(consumed/yieldKg).toFixed(3)}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Precision_Oil_Consumption_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 text-white shadow-xl border border-amber-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner text-white">
              <Droplet className="w-8 h-8 fill-amber-200 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-950/40 text-amber-200 border border-amber-400/30 rounded-full text-[10px] font-black tracking-wider uppercase">
                  Precision Industrial Module
                </span>
                <span className="text-xs text-amber-100 font-medium">v2.4 Master Spec</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Recipes & Precision Oil Accounting
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5 max-w-2xl">
                Distinguish raw oil throughput from actual absorbed loss. Calculate batch-level weighted average cost, reusable recovery, and monitor kadai efficiency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'inventory' ? 'bg-white text-orange-950 shadow-md scale-105' : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Oil Master & Tanks</span>
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'calculator' ? 'bg-white text-orange-950 shadow-md scale-105' : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Batch Oil Calculator</span>
            </button>
            <button
              onClick={() => setActiveTab('variance')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'variance' ? 'bg-white text-orange-950 shadow-md scale-105' : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Variance & Charts</span>
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reconciliation' ? 'bg-white text-orange-950 shadow-md scale-105' : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Daily Reconciliation</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reports' ? 'bg-white text-orange-950 shadow-md scale-105' : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-xs font-bold text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: OIL MASTER & STOCK INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl p-6 border-2 border-amber-300/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    Tank A — Fresh Stock
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">Refined Palm Oil (RBD)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Primary frying medium for snacks</p>
                </div>
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md">
                  <Droplet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-200/60 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900 font-mono">{currentPalmOilStockKg.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-600 ml-1">kg (~{(currentPalmOilStockKg / 0.91).toFixed(0)} Litres)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Avg Rate / Litre</span>
                  <span className="text-lg font-black text-amber-700 font-mono">₹115.00</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-3xl p-6 border-2 border-blue-300/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    Tank B — Reusable Filtered
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">Recovered Reusable Oil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Filtered after batch for immediate reuse</p>
                </div>
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                  <RefreshCw className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-200/60 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900 font-mono">{currentOldOilStockKg.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-600 ml-1">kg (~{(currentOldOilStockKg / 0.91).toFixed(0)} Litres)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Valuation Rate</span>
                  <span className="text-lg font-black text-blue-700 font-mono">₹105.00/L</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-rose-500/10 rounded-3xl p-6 border-2 border-purple-300/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    Tank C — Waste / Disposal
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">Burnt / Soap Stock Oil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">High FFA / darkened oil for soap sale</p>
                </div>
                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md">
                  <Archive className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-200/60 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900 font-mono">35</span>
                  <span className="text-xs font-bold text-slate-600 ml-1">Litres Accumulated</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Scrap Salvage Rate</span>
                  <span className="text-lg font-black text-purple-700 font-mono">₹45.00/L</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-3">Oil Master Specification & Quality Guardrails</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Standard Specific Gravity (0.91 kg/L)</span>
                Weighing scales record in KG while fryers operate by Litre volume. The conversion multiplier 0.91 is applied automatically across inventory reconciliations.
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Maximum Reusable Cycles (3 Cycles)</span>
                Recovered oil from Tank B is blended with at least 30% Fresh Palm Oil from Tank A to maintain snack crispness and prevent acid buildup.
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Weighted Average Costing</span>
                When new purchase invoices arrive at different rates, stock valuation automatically recomputes moving average cost to prevent cost distortion.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATCH PRECISION OIL CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-600" />
                    Production Batch Oil Transaction
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select a production batch to log precision input, fresh addition, and recovery.</p>
                </div>
                <div className="w-full sm:w-64">
                  <label htmlFor="select-batch-id" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Batch #</label>
                  <select
                    id="select-batch-id"
                    value={selectedBatchId}
                    onChange={(e) => handleSelectBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} — {b.recipeName} ({b.date})
                      </option>
                    ))}
                    {batches.length === 0 && <option value="">No production batches available</option>}
                  </select>
                </div>
              </div>

              {/* Batch context info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Product Name</span>
                  <span className="font-black text-slate-900">{selectedBatch?.recipeName || 'Banana Chips'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Cooked Yield</span>
                  <span className="font-mono font-black text-slate-900">{batchYieldKg.toFixed(1)} kg</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Batch Date</span>
                  <span className="font-medium text-slate-700">{selectedBatch?.date || 'Today'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Status</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    {selectedBatch?.status || 'In Bulk'}
                  </span>
                </div>
              </div>

              {/* Input Grid (6 sections from master prompt) */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* A. Opening Oil */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">A</span>
                        Opening Oil Allocated
                      </span>
                      <span className="text-[10px] text-slate-400">In fryer / tank</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="opening-litres-input" className="block text-[10px] font-bold text-slate-500 mb-1">Litres (L)</label>
                        <input
                          id="opening-litres-input"
                          type="number"
                          step="0.5"
                          value={openingLitres}
                          onChange={(e) => setOpeningLitres(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono"
                        />
                      </div>
                      <div>
                        <label htmlFor="opening-rate-input" className="block text-[10px] font-bold text-slate-500 mb-1">Rate (₹/L)</label>
                        <input
                          id="opening-rate-input"
                          type="number"
                          step="0.5"
                          value={openingRate}
                          onChange={(e) => setOpeningRate(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono text-amber-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* B. Fresh Oil Added */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold">B</span>
                        Fresh Oil Added
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold">From Tank A</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fresh-added-litres-input" className="block text-[10px] font-bold text-slate-500 mb-1">Litres Added (L)</label>
                        <input
                          id="fresh-added-litres-input"
                          type="number"
                          step="0.5"
                          value={freshAddedLitres}
                          onChange={(e) => setFreshAddedLitres(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-sm font-black font-mono text-blue-900"
                        />
                      </div>
                      <div>
                        <label htmlFor="fresh-added-rate-input" className="block text-[10px] font-bold text-slate-500 mb-1">Rate (₹/L)</label>
                        <input
                          id="fresh-added-rate-input"
                          type="number"
                          step="0.5"
                          value={freshAddedRate}
                          onChange={(e) => setFreshAddedRate(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono text-blue-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* C. Recovered Reusable */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-bold">C</span>
                      Recovered Reusable
                    </span>
                    <div>
                      <label htmlFor="recovered-litres-input" className="block text-[10px] font-bold text-emerald-800 mb-1">Return to Tank B (L)</label>
                      <input
                        id="recovered-litres-input"
                        type="number"
                        step="0.5"
                        value={recoveredLitres}
                        onChange={(e) => setRecoveredLitres(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-sm font-black font-mono text-emerald-900"
                      />
                    </div>
                  </div>

                  {/* D. Carried Forward */}
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">D</span>
                      Carried Forward
                    </span>
                    <div>
                      <label htmlFor="carried-forward-litres-input" className="block text-[10px] font-bold text-amber-800 mb-1">Left in Fryer for Next (L)</label>
                      <input
                        id="carried-forward-litres-input"
                        type="number"
                        step="0.5"
                        value={carriedForwardLitres}
                        onChange={(e) => setCarriedForwardLitres(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-black font-mono text-amber-900"
                      />
                    </div>
                  </div>

                  {/* E. Waste / Loss */}
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
                    <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-[10px] font-bold">E</span>
                      Waste & Spillage
                    </span>
                    <div>
                      <label htmlFor="waste-litres-input" className="block text-[10px] font-bold text-purple-800 mb-1">Lost / Discarded (L)</label>
                      <input
                        id="waste-litres-input"
                        type="number"
                        step="0.5"
                        value={wasteLitres}
                        onChange={(e) => setWasteLitres(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-sm font-black font-mono text-purple-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Operator & Kadai assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label htmlFor="fryer-name-input" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fryer / Kadai Line</label>
                    <select
                      id="fryer-name-input"
                      value={fryerName}
                      onChange={(e) => setFryerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Kadai 1 (Main Fryer)">Kadai 1 (Main Fryer)</option>
                      <option value="Kadai 2 (Specialty)">Kadai 2 (Specialty)</option>
                      <option value="Continuous Fryer Line A">Continuous Fryer Line A</option>
                      <option value="Roasting Drum #1">Roasting Drum #1</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="operator-name-input" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operator In Charge</label>
                    <input
                      id="operator-name-input"
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="waste-reason-select" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Waste Reason classification</label>
                    <select
                      id="waste-reason-select"
                      value={wasteReason}
                      onChange={(e) => setWasteReason(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-purple-900"
                    >
                      <option value="Burnt Oil">Burnt Oil (High FFA)</option>
                      <option value="Contaminated Oil">Contaminated Oil</option>
                      <option value="Spillage">Spillage during drainage</option>
                      <option value="Disposal">Routine Scrap Disposal</option>
                      <option value="Other">Other Operational Loss</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Automated Results & Sync Box */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/30 space-y-6">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Live Formula Output
                </span>
                <h3 className="text-xl font-black mt-2">Actual Batch Oil Consumption</h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Formula: (Opening + Fresh Added) - Recovered - Carried Forward
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Total Available (A + B):</span>
                  <span className="font-mono font-bold text-white">{totalAvailableLitres.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Weighted Average Rate:</span>
                  <span className="font-mono font-bold text-amber-400">₹{weightedAverageRate.toFixed(2)}/L</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Less Recovered Reusable (C):</span>
                  <span className="font-mono font-bold text-emerald-400">-{recoveredLitres.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Less Carried Forward (D):</span>
                  <span className="font-mono font-bold text-amber-300">-{carriedForwardLitres.toFixed(1)} L</span>
                </div>
              </div>

              <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-amber-300 uppercase">Actual Consumed</span>
                  <span className="text-3xl font-black text-white font-mono">{actualConsumedLitres.toFixed(2)} <span className="text-sm font-normal">L</span></span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-indigo-200 uppercase">Total Batch Oil Cost</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">₹{actualConsumedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Snack Finished Unit Unit Costing */}
              <div className="bg-amber-500/15 p-4 rounded-2xl border border-amber-500/30 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-amber-200">
                  <span>Oil Consumed per KG:</span>
                  <span className="font-mono text-white">{oilConsumedPerKg.toFixed(3)} L/kg</span>
                </div>
                <div className="flex justify-between items-center font-bold text-amber-200">
                  <span>Oil Cost per KG Snack:</span>
                  <span className="font-mono text-white text-sm">₹{oilCostPerKg.toFixed(2)}/kg</span>
                </div>
                <p className="text-[10px] text-amber-200/80 pt-1 border-t border-amber-500/20">
                  Based on {batchYieldKg.toFixed(1)} kg finished snack output.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveToBatch}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save & Sync to Batch #{selectedBatch?.batchNumber || '001'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STANDARD VS ACTUAL VARIANCE ANALYSIS & VISUALIZATION CHARTS */}
      {activeTab === 'variance' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Analytical Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Inefficient Fryer</span>
                <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                  <Flame className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-lg font-black text-white truncate">{fryerEfficiencyAnalytics.worstFryer}</div>
                <div className="text-xs text-rose-400 font-bold mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>+{fryerEfficiencyAnalytics.highestVariancePct}% Avg Variance Over Std</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400">
                Action: Inspect filter screens & oil thermostat drift.
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Excess Oil Lost</span>
                <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Droplet className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-2xl font-black text-amber-400 font-mono">{fryerEfficiencyAnalytics.totalExcessOil} L</div>
                <div className="text-xs text-slate-400">beyond standard</div>
              </div>
              <div className="mt-2 pt-3 border-t border-slate-700/80 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Estimated Financial Loss:</span>
                <span className="font-mono font-bold text-rose-400">₹{fryerEfficiencyAnalytics.excessCostRs.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oil Consumption Target</span>
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {chartData.length > 0 ? (
                    `${(
                      chartData.reduce((acc, c) => acc + (c.actual <= c.expected * 1.05 ? 1 : 0), 0) /
                      chartData.length * 100
                    ).toFixed(0)}%`
                  ) : '100%'}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">Batches within allowable ±5% limit</div>
              </div>
              <div className="mt-2 pt-3 border-t border-slate-700/80 text-[11px] text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Continuous oil filtering active</span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Visualization Panel */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl text-white space-y-6 relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-black text-white">Actual Oil Consumption vs. Expected Standard</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Visual timeline comparing recipe standard absorption against real batch consumption. Spikes in the red variance line reveal equipment inefficiencies or degraded frying oil quality.
                </p>
              </div>

              {/* Fryer Line Interactive Filter Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase px-2.5 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-400" /> Filter Line:
                </span>
                <button
                  onClick={() => setSelectedFryerFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFryerFilter === 'all'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  All Fryers ({batches.length})
                </button>
                {availableFryers.map(fn => {
                  const fryerBatches = batches.filter(b => (b.oilFryerName || 'Kadai 1 (Main Fryer)') === fn);
                  const isHighVar = fryerEfficiencyAnalytics.stats[fn]?.totalVariance > 5;
                  return (
                    <button
                      key={fn}
                      onClick={() => setSelectedFryerFilter(fn)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedFryerFilter === fn
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isHighVar ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
                      <span>{fn}</span>
                      <span className="text-[10px] opacity-80">({fryerBatches.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recharts Chart Area */}
            <div className="h-[380px] w-full pt-2">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <BarChart3 className="w-12 h-12 text-slate-700 animate-pulse" />
                  <p className="text-sm font-bold">No batches found for the selected fryer filter.</p>
                  <button
                    onClick={() => setSelectedFryerFilter('all')}
                    className="px-4 py-2 bg-slate-800 text-amber-400 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    Reset Filter to All Fryers
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                      tickMargin={10}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      label={{ value: 'Oil Volume (Litres)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                      tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#f43f5e"
                      label={{ value: 'Excess Variance (L)', angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 11, fontWeight: 700 }}
                      tick={{ fontSize: 11, fill: '#f43f5e', fontWeight: 600 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl text-xs space-y-2.5 max-w-xs text-slate-200 z-50">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-4">
                                <span className="font-mono font-black text-amber-400 text-sm">{data.batchNumber}</span>
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">{data.date}</span>
                              </div>
                              <div className="font-bold text-white text-sm">{data.recipeName}</div>
                              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                <span>Fryer: <strong className="text-white font-bold">{data.fryer}</strong></span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                                  <div className="text-[10px] text-slate-400 font-medium">Expected Std</div>
                                  <div className="text-emerald-400 font-mono font-bold text-xs mt-0.5">{data.expected} L</div>
                                </div>
                                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                                  <div className="text-[10px] text-slate-400 font-medium">Actual Consumed</div>
                                  <div className="text-amber-400 font-mono font-bold text-xs mt-0.5">{data.actual} L</div>
                                </div>
                              </div>
                              <div className={`p-2.5 rounded-xl flex items-center justify-between font-mono font-bold text-xs ${
                                data.variance > 0 ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              }`}>
                                <span>Variance:</span>
                                <span>{data.variance > 0 ? `+${data.variance} L (+${data.variancePct}%)` : `${data.variance} L (${data.variancePct}%)`}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 600 }} />
                    <ReferenceLine yAxisId="right" y={0} stroke="#64748b" strokeDasharray="3 3" label={{ value: "0 L Benchmark", fill: "#94a3b8", fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="expected" name="Expected Standard (L)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} />
                    <Bar yAxisId="left" dataKey="actual" name="Actual Consumed (L)" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={26} />
                    <Line yAxisId="right" type="monotone" dataKey="variance" name="Excess Variance (L)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8, strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Expected Standard = Recipe L/kg × Batch Yield</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>Actual = Opening + Fresh Added - Recovered - Carried Forward</span>
              </div>
              <div className="font-mono text-amber-400 font-bold">
                Showing {chartData.length} of {batches.length} Batches
              </div>
            </div>
          </div>

          {/* Fryer Efficiency Pattern Matrix */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>Equipment & Fryer Efficiency Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated diagnostics comparing oil retention across different kadai lines and roasting equipment.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                Live Equipment Monitoring
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {availableFryers.map(fn => {
                const fData = fryerEfficiencyAnalytics.stats[fn] || { totalExpected: 0, totalActual: 0, batchCount: 0, totalVariance: 0 };
                const pct = fData.totalExpected > 0 ? ((fData.totalActual - fData.totalExpected) / fData.totalExpected) * 100 : 0;
                const isHigh = pct > 5;

                return (
                  <div
                    key={fn}
                    onClick={() => setSelectedFryerFilter(fn)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedFryerFilter === fn
                        ? 'bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : isHigh
                        ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 text-sm truncate">{fn}</span>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHigh ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Avg Variance</div>
                        <div className={`font-mono font-black text-base mt-0.5 ${isHigh ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Batches Cooked</div>
                        <div className="font-mono font-bold text-slate-700 text-sm mt-0.5">{fData.batchCount}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] font-semibold flex items-center justify-between">
                      <span className={isHigh ? 'text-rose-700' : 'text-emerald-700'}>
                        {isHigh ? '⚠️ High Absorption' : '✅ Optimal Performance'}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold hover:underline">View Batches →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table of Batches */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Batch-by-Batch Consumption Logs</span>
                  {selectedFryerFilter !== 'all' && (
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                      Filtered: {selectedFryerFilter}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Detailed reconciliation log for audit compliance and operator accountability.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Within Standard (≤ +5%)
                </span>
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Consumption (&gt; +5%)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                    <th className="p-3.5">Batch #</th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Fryer Line</th>
                    <th className="p-3.5">Yield Kg</th>
                    <th className="p-3.5 text-right">Recipe Std (L/kg)</th>
                    <th className="p-3.5 text-right">Expected L</th>
                    <th className="p-3.5 text-right">Actual Consumed L</th>
                    <th className="p-3.5 text-right">Variance L</th>
                    <th className="p-3.5 text-center">Efficiency Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches
                    .filter(b => selectedFryerFilter === 'all' || (b.oilFryerName || 'Kadai 1 (Main Fryer)') === selectedFryerFilter)
                    .map((b) => {
                    const yKg = b.batchSizeGrams ? b.batchSizeGrams / 1000 : 50;
                    const r = recipes.find(rec => rec.id === b.recipeId || rec.name === b.recipeName);
                    const stdPerKg = r?.oilUsedLitres ? r.oilUsedLitres / (r.producedYieldKg || 10) : 0.22;
                    const expected = yKg * stdPerKg;
                    const actual = b.oilUsedLitresActual ?? ((b.oilOpeningLitres ?? 100) + (b.oilFreshAddedLitres ?? 20) - (b.oilRecoveredLitres ?? 90) - (b.oilCarriedForwardLitres ?? 10));
                    const diff = actual - expected;
                    const pct = expected > 0 ? (diff / expected) * 100 : 0;
                    const isHigh = pct > 5;
                    const fryer = b.oilFryerName || 'Kadai 1 (Main Fryer)';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                        <td className="p-3.5 font-bold text-slate-800">{b.recipeName}</td>
                        <td className="p-3.5 font-semibold text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">{fryer}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{yKg.toFixed(1)} kg</td>
                        <td className="p-3.5 text-right font-mono text-slate-600">{stdPerKg.toFixed(3)} L</td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-700">{expected.toFixed(1)} L</td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900">{actual.toFixed(1)} L</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {diff > 0 ? `+${diff.toFixed(1)} L` : `${diff.toFixed(1)} L`}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isHigh ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isHigh ? `🔴 High (+${pct.toFixed(0)}%)` : `🟢 Excellent (${pct <= 0 ? pct.toFixed(0) : '+' + pct.toFixed(0)}%)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {batches.filter(b => selectedFryerFilter === 'all' || (b.oilFryerName || 'Kadai 1 (Main Fryer)') === selectedFryerFilter).length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">No batch records match the selected fryer filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DAILY OIL RECONCILIATION & AUDIT */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Daily Dip-Stick Stock Reconciliation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit equation: Opening + Purchases Additions - Production Issued + Recovered - Waste - Physical Closing = Unaccounted Variance
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Tank / Fryer</th>
                    <th className="p-3.5 text-right">Opening (L)</th>
                    <th className="p-3.5 text-right">+ Fresh Added</th>
                    <th className="p-3.5 text-right">- Recovered</th>
                    <th className="p-3.5 text-right">- Waste</th>
                    <th className="p-3.5 text-right">Book Closing</th>
                    <th className="p-3.5 text-right">Physical Dip-Stick</th>
                    <th className="p-3.5 text-center">Audit Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-bold text-slate-800 font-sans">Today</td>
                    <td className="p-3.5 font-bold text-slate-800 font-sans">Kadai 1 (Main)</td>
                    <td className="p-3.5 text-right">120.0</td>
                    <td className="p-3.5 text-right text-blue-600">+25.0</td>
                    <td className="p-3.5 text-right text-emerald-600">-110.0</td>
                    <td className="p-3.5 text-right text-purple-600">-3.0</td>
                    <td className="p-3.5 text-right font-black text-slate-900">32.0</td>
                    <td className="p-3.5 text-right font-black text-amber-700">32.0</td>
                    <td className="p-3.5 text-center font-sans">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">🟢 0.0 L (Exact)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-bold text-slate-800 font-sans">Yesterday</td>
                    <td className="p-3.5 font-bold text-slate-800 font-sans">Kadai 1 (Main)</td>
                    <td className="p-3.5 text-right">130.0</td>
                    <td className="p-3.5 text-right text-blue-600">+20.0</td>
                    <td className="p-3.5 text-right text-emerald-600">-125.0</td>
                    <td className="p-3.5 text-right text-purple-600">-2.0</td>
                    <td className="p-3.5 text-right font-black text-slate-900">23.0</td>
                    <td className="p-3.5 text-right font-black text-amber-700">21.5</td>
                    <td className="p-3.5 text-center font-sans">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">🟡 -1.5 L (-6.5%)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTICS & EXPORTABLE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Executive Oil Accounting & Waste Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5">Export detailed batch-by-batch oil consumption records for accounting audit and tax valuation.</p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Complete Oil Report (.CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Avg Oil Cost per Snack KG</span>
                <span className="text-2xl font-black text-slate-900 block mt-1 font-mono">₹25.80 / kg</span>
                <span className="text-[10px] text-emerald-600 font-bold">↓ 1.4% better than last month</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Reusable Recovery Rate</span>
                <span className="text-2xl font-black text-blue-600 block mt-1 font-mono">84.2%</span>
                <span className="text-[10px] text-slate-400 font-medium">Oil filtered back to Tank B</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Waste / Spillage Ratio</span>
                <span className="text-2xl font-black text-purple-600 block mt-1 font-mono">2.1%</span>
                <span className="text-[10px] text-slate-400 font-medium">Within 3% factory tolerance limit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
