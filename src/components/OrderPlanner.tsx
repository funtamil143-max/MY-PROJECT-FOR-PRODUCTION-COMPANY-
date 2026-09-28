import React, { useState } from 'react';
import { RawMaterial, Recipe, PurchaseBill, PurchaseItem } from '../types';
import { 
  Calculator, 
  Plus, 
  Trash, 
  ShoppingBag, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
  Sparkles,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface OrderPlannerProps {
  materials: RawMaterial[];
  recipes: Recipe[];
  onAddBill: (bill: Omit<PurchaseBill, 'id'>) => void;
}

interface PlannedRow {
  recipeId: string;
  batchesCount: number;
}

export default function OrderPlanner({ materials, recipes, onAddBill }: OrderPlannerProps) {
  // Navigation between Planner modes
  const [plannerMode, setPlannerMode] = useState<'cycle' | 'seven-day'>('seven-day'); // Default to the newly requested 7-Day view!
  const [safetyBuffer, setSafetyBuffer] = useState<number>(10); // Default 10%
  const [autoOrderSupplier, setAutoOrderSupplier] = useState('Consolidated Agro Distributors');
  const [isOrdering, setIsOrdering] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- MODE A: CYCLE-WISE PLANNER STATES ---
  const [plannedRows, setPlannedRows] = useState<PlannedRow[]>([
    { recipeId: recipes[0]?.id || '', batchesCount: 4 }
  ]);

  const handleAddRow = () => {
    setPlannedRows([...plannedRows, { recipeId: recipes[0]?.id || '', batchesCount: 2 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (plannedRows.length === 1) return;
    setPlannedRows(plannedRows.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof PlannedRow, value: string | number) => {
    const updated = [...plannedRows];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    } as PlannedRow;
    setPlannedRows(updated);
  };

  // --- MODE B: 7-DAY DEMAND FORECASTER STATES ---
  // Default planned batches for each of the upcoming 7 days (0: Day 1, to 6: Day 7)
  const [sevenDayPlan, setSevenDayPlan] = useState<{ [dayIndex: number]: { [recipeId: string]: number } }>({
    0: { rec_butter_murukku: 2, rec_kara_sev: 1 }, // Day 1
    1: { rec_butter_murukku: 1, rec_kara_sev: 2 }, // Day 2
    2: { rec_butter_murukku: 3, rec_kara_sev: 0 }, // Day 3
    3: { rec_butter_murukku: 0, rec_kara_sev: 3 }, // Day 4
    4: { rec_butter_murukku: 2, rec_kara_sev: 1 }, // Day 5
    5: { rec_butter_murukku: 4, rec_kara_sev: 0 }, // Day 6
    6: { rec_butter_murukku: 0, rec_kara_sev: 0 }, // Day 7
  });

  const handleSevenDayChange = (dayIndex: number, recipeId: string, count: number) => {
    setSevenDayPlan({
      ...sevenDayPlan,
      [dayIndex]: {
        ...sevenDayPlan[dayIndex],
        [recipeId]: Math.max(0, count)
      }
    });
  };

  // Generate date labels starting from today
  const getDayLabel = (dayIndex: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayIndex);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-IN', options);
  };

  // --- CALCULATION LOGIC: MODE A ---
  const cycleRequirements: { [materialId: string]: number } = {};
  plannedRows.forEach((row) => {
    const recipe = recipes.find((r) => r.id === row.recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach((ing) => {
      const currentNeed = ing.weightGrams * Number(row.batchesCount);
      cycleRequirements[ing.materialId] = (cycleRequirements[ing.materialId] || 0) + currentNeed;
    });

    if (recipe.packagingSizes && recipe.packagingSizes.length > 0) {
      const smallestPouch = recipe.packagingSizes.reduce((prev, curr) => prev.grams < curr.grams ? prev : curr);
      const estimatedPouchCount = (recipe.baseBatchSizeGrams / smallestPouch.grams) * Number(row.batchesCount);
      const matchingPouchMaterial = materials.find(
        (m) => m.category === 'Packaging' && m.name.toLowerCase().includes(`${smallestPouch.grams}g`)
      );
      if (matchingPouchMaterial) {
        cycleRequirements[matchingPouchMaterial.id] = 
          (cycleRequirements[matchingPouchMaterial.id] || 0) + estimatedPouchCount;
      }
    }
  });

  const cycleReorderList = Object.keys(cycleRequirements).map((matId) => {
    const mat = materials.find((m) => m.id === matId);
    const baseRequirement = cycleRequirements[matId] || 0;
    const totalRequirement = baseRequirement * (1 + safetyBuffer / 100);
    const currentStock = mat?.currentStockGrams || 0;
    const shortfall = Math.max(0, totalRequirement - currentStock);
    const estimatedCost = shortfall * (mat?.averageCostPerGram || 0);

    return {
      materialId: matId,
      name: mat?.name || 'Unknown Material',
      category: mat?.category || 'Flour',
      unit: mat?.unit || 'g',
      currentStock,
      required: totalRequirement,
      shortfall,
      averageCost: mat?.averageCostPerGram || 0,
      estimatedCost,
      status: shortfall > 0 ? 'Shortfall' : 'Sufficient'
    };
  });

  // --- CALCULATION LOGIC: MODE B (7-DAY PROJECTIONS WITH BULK ADVISORY) ---
  const sevenDayRequirements: { [materialId: string]: number } = {};
  recipes.forEach((recipe) => {
    let recipeTotalBatches = 0;
    for (let d = 0; d < 7; d++) {
      recipeTotalBatches += sevenDayPlan[d]?.[recipe.id] || 0;
    }

    if (recipeTotalBatches > 0) {
      // Food ingredients needed
      recipe.ingredients.forEach((ing) => {
        const need = ing.weightGrams * recipeTotalBatches;
        sevenDayRequirements[ing.materialId] = (sevenDayRequirements[ing.materialId] || 0) + need;
      });

      // Pouch packaging needed
      if (recipe.packagingSizes && recipe.packagingSizes.length > 0) {
        const smallestPouch = recipe.packagingSizes.reduce((prev, curr) => prev.grams < curr.grams ? prev : curr);
        const pouchCount = (recipe.baseBatchSizeGrams / smallestPouch.grams) * recipeTotalBatches;
        const matchingPouchMaterial = materials.find(
          (m) => m.category === 'Packaging' && m.name.toLowerCase().includes(`${smallestPouch.grams}g`)
        );
        if (matchingPouchMaterial) {
          sevenDayRequirements[matchingPouchMaterial.id] = 
            (sevenDayRequirements[matchingPouchMaterial.id] || 0) + pouchCount;
        }
      }
    }
  });

  const sevenDayReorderList = Object.keys(sevenDayRequirements).map((matId) => {
    const mat = materials.find((m) => m.id === matId);
    const rawRequirement = sevenDayRequirements[matId] || 0;
    // Apply safety buffer multiplier
    const totalRequirement = rawRequirement * (1 + safetyBuffer / 100);
    const currentStock = mat?.currentStockGrams || 0;
    const shortfall = Math.max(0, totalRequirement - currentStock);

    // COMMERCIAL BULK PACK CONVENTION
    let bulkPackName = "Units Pack";
    let bulkPackSize = 1000; // grams or pieces

    if (mat) {
      if (mat.category === 'Flour') {
        bulkPackName = "25 kg Bulk Bag";
        bulkPackSize = 25000;
      } else if (mat.category === 'Oil') {
        bulkPackName = "15 kg Commercial Canister";
        bulkPackSize = 15000;
      } else if (mat.category === 'Dairy') {
        bulkPackName = "5 kg Heavy Tub";
        bulkPackSize = 5000;
      } else if (mat.category === 'Spices' && mat.name.toLowerCase().includes('salt')) {
        bulkPackName = "10 kg Industrial Bag";
        bulkPackSize = 10000;
      } else if (mat.category === 'Spices') {
        bulkPackName = "2 kg Premium Spice Box";
        bulkPackSize = 2000;
      } else if (mat.category === 'Packaging') {
        bulkPackName = "Box of 500 Pouches";
        bulkPackSize = 500;
      }
    }

    // Suggested bulk bags to buy
    const suggestedPacks = shortfall > 0 ? Math.ceil(shortfall / bulkPackSize) : 0;
    const suggestedBulkQty = suggestedPacks * bulkPackSize;
    const estimatedCost = suggestedBulkQty * (mat?.averageCostPerGram || 0);

    return {
      materialId: matId,
      name: mat?.name || 'Unknown Material',
      category: mat?.category || 'Flour',
      unit: mat?.unit || 'g',
      currentStock,
      required: totalRequirement,
      shortfall,
      bulkPackName,
      bulkPackSize,
      suggestedPacks,
      suggestedBulkQty,
      averageCost: mat?.averageCostPerGram || 0,
      estimatedCost,
      status: shortfall > 0 ? 'Bulk Reorder Recommended' : 'Inventory Sufficient'
    };
  });

  // Pick active lists based on tab Mode
  const activeReorderList = plannerMode === 'cycle' ? cycleReorderList : sevenDayReorderList;
  const totalRequiredWeightG = activeReorderList
    .filter(r => r.unit === 'g')
    .reduce((sum, item) => sum + item.required, 0);

  const totalReorderCost = activeReorderList.reduce((sum, item) => sum + item.estimatedCost, 0);
  const shortfallsCount = activeReorderList.filter(r => r.shortfall > 0).length;

  // --- ACTIONS ---
  const handleCopyClipboard = () => {
    const dateStr = new Date().toLocaleDateString('en-IN');
    let text = `📦 BULK REORDER PLAN: ${plannerMode === 'cycle' ? 'CYCLE RUN' : '7-DAY FORECAST'} (${dateStr})\n`;
    text += `Safety Stock Buffer: ${safetyBuffer}%\n`;
    text += `------------------------------------------------------\n`;
    
    activeReorderList.filter(r => r.shortfall > 0).forEach(item => {
      const shortfallStr = item.unit === 'g' 
        ? `${(item.shortfall / 1000).toFixed(1)} kg` 
        : `${Math.ceil(item.shortfall)} pcs`;

      let bulkStr = '';
      if (plannerMode === 'seven-day') {
        const itemWithBulk = item as typeof sevenDayReorderList[0];
        bulkStr = ` | Suggested Bulk purchase: ${itemWithBulk.suggestedPacks} x ${itemWithBulk.bulkPackName}`;
      }
      
      const reqStr = item.unit === 'g'
        ? `${(item.required / 1000).toFixed(1)} kg`
        : `${Math.ceil(item.required)} pcs`;

      text += `• ${item.name} [Category: ${item.category}]\n`;
      text += `  Projected Need: ${reqStr} | Live Stock gap: ${shortfallStr}${bulkStr}\n`;
      text += `  Est. Cost: ₹${(item.estimatedCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n\n`;
    });

    text += `------------------------------------------------------\n`;
    text += `Total bulk products to order: ${shortfallsCount}\n`;
    text += `Estimated reorder cost: ₹${(totalReorderCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportExcel = () => {
    const exportData = activeReorderList.map((item) => {
      const shortfallStr = item.unit === 'g' 
        ? `${(item.shortfall / 1000).toFixed(1)} kg` 
        : `${Math.ceil(item.shortfall)} ${item.unit}`;
      
      const reqStr = item.unit === 'g'
        ? `${(item.required / 1000).toFixed(1)} kg`
        : `${Math.ceil(item.required)} ${item.unit}`;

      const stockStr = item.unit === 'g'
        ? `${(item.currentStock / 1000).toFixed(1)} kg`
        : `${Math.ceil(item.currentStock)} ${item.unit}`;

      let bulkGuidance = '-';
      let bulkQty = '-';
      if (plannerMode === 'seven-day') {
        const itemWithBulk = item as typeof sevenDayReorderList[0];
        bulkGuidance = `${itemWithBulk.suggestedPacks} x ${itemWithBulk.bulkPackName}`;
        bulkQty = item.unit === 'g' ? `${(itemWithBulk.suggestedBulkQty / 1000).toFixed(1)} kg` : `${itemWithBulk.suggestedBulkQty} ${item.unit}`;
      }

      return {
        'Material / Pouch Name': item.name,
        'Category': item.category,
        'Unit': item.unit,
        'Current Stock': stockStr,
        'Projected Requirement': reqStr,
        'Stock Gap / Deficit': shortfallStr,
        'Bulk Packaging Guidance': bulkGuidance,
        'Suggested Order Qty': bulkQty,
        'Average Cost (₹/unit)': item.averageCost * (item.unit === 'g' ? 1000 : 1),
        'Est. Order Cost (₹)': Math.round(item.estimatedCost * 100) / 100,
        'Status': item.status
      };
    });
    exportToExcel(exportData, `Order_Planner_${plannerMode === 'seven-day' ? '7Day' : 'Cycle'}_${new Date().toISOString().split('T')[0]}`, 'Order Planning Advisory');
  };

  const handleExecuteAutoOrder = () => {
    const itemsToOrder = activeReorderList.filter(r => r.shortfall > 0);
    if (itemsToOrder.length === 0) return;

    const purchaseItems: PurchaseItem[] = itemsToOrder.map(item => {
      // In 7-day mode, order the recommended bulk rounded quantity, else order exact shortfall
      const qtyToOrder = plannerMode === 'seven-day' 
        ? (item as typeof sevenDayReorderList[0]).suggestedBulkQty 
        : (item.unit === 'pcs' ? Math.ceil(item.shortfall) : Math.round(item.shortfall));

      return {
        materialId: item.materialId,
        quantityGrams: qtyToOrder,
        totalCost: Number((qtyToOrder * item.averageCost).toFixed(2)),
        costPerGram: item.averageCost
      };
    });

    onAddBill({
      billNumber: `REORDER-AUTO-${Date.now().toString().slice(-4)}`,
      supplierName: autoOrderSupplier,
      date: new Date().toISOString().split('T')[0],
      items: purchaseItems,
      notes: `Generated automatically via bulk reorder planning tool. Solved ${shortfallsCount} inventory gaps.`
    });

    setIsOrdering(false);
    alert('Stock gaps successfully refilled with recommended bulk commercial packaging! Moving averages maintained, and inventory has been credited.');
  };

  return (
    <div className="space-y-6" id="order-planner-root">
      
      {/* Intro Header */}
      <div className="p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-indigo-950 tracking-tight flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <span>Demand Forecaster & Ordering Guide</span>
          </h2>
          <p className="text-xs text-indigo-700 mt-1 max-w-2xl leading-relaxed">
            Predict upcoming inventory requirements by scheduling recipe runs. Based on live stock counts, the system automatically translates shortages into rounded bulk packs for physical plant supply orders.
          </p>
        </div>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">
          Aadiyar T3 Snacks Planning
        </span>
      </div>

      {/* Mode Selector Toggle */}
      <div className="flex bg-slate-200/60 p-1 rounded-xl max-w-md border border-slate-300/40">
        <button
          onClick={() => setPlannerMode('seven-day')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            plannerMode === 'seven-day' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>7-Day Demand Projection</span>
        </button>
        <button
          onClick={() => setPlannerMode('cycle')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            plannerMode === 'cycle' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>On-Demand Run Cycles</span>
        </button>
      </div>

      {/* Inputs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE INPUT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          
          {plannerMode === 'cycle' ? (
            /* Mode A: Cycle planner */
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Plan Customized Batch Cycles</h3>
              
              <div className="space-y-2.5">
                {plannedRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recipe Formula</label>
                      <select
                        value={row.recipeId}
                        onChange={(e) => handleRowChange(idx, 'recipeId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md cursor-pointer"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Base size: {r.baseBatchSizeGrams / 1000}kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Batch Cycles</label>
                      <input
                        type="number"
                        value={row.batchesCount}
                        onChange={(e) => handleRowChange(idx, 'batchesCount', Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-center font-mono font-bold"
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={plannedRows.length === 1}
                      className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 rounded-md hover:bg-red-50 cursor-pointer transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Recipe to Plan</span>
                </button>

                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-500 font-medium font-sans">Safety Buffer: </span>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    {[0, 5, 10, 15, 25].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSafetyBuffer(val)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          safetyBuffer === val 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mode B: 7-day Upcoming Grid Scheduler (Requested Feature) */
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">7-Day Upcoming Production schedule</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Adjust how many cooking runs are projected for each day to calculate ingredient demand.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500 font-medium font-sans">Safety Buffer: </span>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    {[0, 5, 10, 15, 25].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSafetyBuffer(val)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                          safetyBuffer === val 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7-Day Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, dIndex) => {
                  const label = getDayLabel(dIndex);
                  const isWeekend = label.startsWith('Sat') || label.startsWith('Sun');

                  return (
                    <div 
                      key={dIndex} 
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-2.5 ${
                        isWeekend ? 'bg-amber-50/20 border-amber-100' : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Day {dIndex + 1}</span>
                        <span className="block text-xs font-bold text-slate-800 mt-0.5">{label}</span>
                      </div>

                      <div className="space-y-2">
                        {recipes.map(recipe => {
                          const count = sevenDayPlan[dIndex]?.[recipe.id] || 0;
                          return (
                            <div key={recipe.id} className="space-y-0.5">
                              <span className="block text-[8px] font-bold text-slate-500 truncate" title={recipe.name}>
                                {recipe.name}
                              </span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={count}
                                  onChange={(e) => handleSevenDayChange(dIndex, recipe.id, Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full px-1 py-0.5 text-xs bg-white border border-slate-200 rounded text-center font-mono font-semibold"
                                />
                                <span className="text-[9px] text-slate-400 font-medium">runs</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg text-[11px] text-indigo-800 leading-normal flex items-start space-x-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="font-sans">
                  <strong>7-Day Projected Cooking Schedule:</strong> Pre-populating a typical weekly workload. Totaling batches from all 7 columns computes the precise chemical weight of dry goods, seasoning mixes, absorbable oils, and package boxes needed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FORECAST KPIs & CONTROLS */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between h-full space-y-5">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {plannerMode === 'cycle' ? 'Cycle-wise Summary' : '7-Day Demand Forecast'}
              </h4>
              
              <div className="space-y-3.5">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Snack Yield</p>
                  <p className="text-xl font-bold font-mono">{(totalRequiredWeightG / 1000).toFixed(1)} kg bulk food</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Material Shortfalls</p>
                  <p className="text-xl font-bold text-amber-400 font-mono">{shortfallsCount} items deficit</p>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Reorder Cost</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    ₹{(totalReorderCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                title="Export order planner advisory to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={handleCopyClipboard}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Gaps Checklist'}</span>
              </button>

              <button
                onClick={() => setIsOrdering(true)}
                disabled={shortfallsCount === 0}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bulk Reorder Deficits</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Auto Reorder Form Modal Box */}
      {isOrdering && (
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-800">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-sm font-sans">Automated Bulk Purchase Invoice Voucher</h4>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed font-sans">
            This utility will instantly record a purchase bill for all <strong>{shortfallsCount} materials</strong> having a shortfall over the projected period. 
            {plannerMode === 'seven-day' 
              ? " It automatically rounds up shortages to full commercial bulk bags (e.g. 25kg flour bags, 15kg canisters, 500-unit pouch cartons) to ensure efficient delivery logistics and lower bulk rates."
              : " It automatically increments raw material stock to fully satisfy the planned cycles plus safety margin, and updates moving averages based on last active purchase rates."
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bulk Vendor Supplier Name</label>
              <input
                type="text"
                value={autoOrderSupplier}
                onChange={(e) => setAutoOrderSupplier(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleExecuteAutoOrder}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md cursor-pointer transition-all"
              >
                Execute Reorder & Credit Stock
              </button>
              <button
                type="button"
                onClick={() => setIsOrdering(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-md cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials Requirements table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {plannerMode === 'cycle' ? 'Production Gaps Checklist' : '7-Day Bulk Order Advisories'}
          </h3>
          <span className="text-xs text-slate-500 font-medium">Includes {safetyBuffer}% safety buffer</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Raw Material / Pouch</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">In Stock</th>
                <th className="px-6 py-4 text-right">Projected Need</th>
                <th className="px-6 py-4 text-right">Stock Gap</th>
                {plannerMode === 'seven-day' && (
                  <>
                    <th className="px-6 py-4 text-left">Bulk packaging Guidance</th>
                    <th className="px-6 py-4 text-right">Bulk Order Qty</th>
                  </>
                )}
                <th className="px-6 py-4 text-right">Est. Order Cost</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {activeReorderList.length === 0 ? (
                <tr>
                  <td colSpan={plannerMode === 'seven-day' ? 9 : 7} className="text-center py-8 text-slate-400">
                    No recipes planned or all scheduled values are zero. Add cooking runs above to compute raw demand!
                  </td>
                </tr>
              ) : (
                activeReorderList.map((item) => {
                  const isGap = item.shortfall > 0;
                  const itemWithBulk = item as typeof sevenDayReorderList[0];

                  return (
                    <tr key={item.materialId} className="hover:bg-slate-50/50 transition-all font-sans">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs">
                        {item.unit === 'g' 
                          ? `${(item.currentStock / 1000).toFixed(1)} kg`
                          : `${item.currentStock} pcs`}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-700">
                        {item.unit === 'g'
                          ? `${(item.required / 1000).toFixed(1)} kg`
                          : `${Math.ceil(item.required)} pcs`}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs font-bold">
                        {item.shortfall === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className="text-rose-600">
                            {item.unit === 'g' 
                              ? `${(item.shortfall / 1000).toFixed(1)} kg`
                              : `${Math.ceil(item.shortfall)} pcs`}
                          </span>
                        )}
                      </td>

                      {/* Bulk advisories column */}
                      {plannerMode === 'seven-day' && (
                        <>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">
                            {isGap ? (
                              <div className="flex items-center space-x-1.5 text-indigo-700">
                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                <span>Buy {itemWithBulk.suggestedPacks} x <strong>{itemWithBulk.bulkPackName}</strong></span>
                              </div>
                            ) : (
                              <span className="text-emerald-600">In-stock fully covers weekly cycles</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-indigo-950 font-bold">
                            {isGap ? (
                              item.unit === 'g'
                                ? `${(itemWithBulk.suggestedBulkQty / 1000).toFixed(0)} kg`
                                : `${itemWithBulk.suggestedBulkQty} pcs`
                            ) : '-'}
                          </td>
                        </>
                      )}

                      <td className="px-6 py-4 text-right font-mono text-xs">
                        {item.estimatedCost === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className="font-bold text-slate-900">
                            ₹{(item.estimatedCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isGap 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {isGap ? 'Gap detected' : 'Fully Stocked'}
                        </span>
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
