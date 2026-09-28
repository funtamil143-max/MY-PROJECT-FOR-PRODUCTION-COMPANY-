import React, { useState, useEffect } from 'react';
import { ProductionBatch, Recipe, RawMaterial, BatchStatus, PackagingSize } from '../types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Snowflake,
  ShieldCheck,
  Scale,
  PackageCheck,
  DollarSign,
  Clock,
  User,
  Layers,
  Thermometer,
  Lock,
  ArrowRight,
  Sparkles,
  Check,
  AlertOctagon,
  FileText,
  Boxes,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Droplet
} from 'lucide-react';
import { calculateIngredientsCost, calculateLaborCost } from '../utils/calculations';

interface PostCookWorkflowModalProps {
  batch: ProductionBatch | null;
  recipes: Recipe[];
  materials: RawMaterial[];
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (updatedBatch: ProductionBatch) => void;
}

export function PostCookWorkflowModal({
  batch,
  recipes,
  materials,
  isOpen,
  onClose,
  onSaveBatch
}: PostCookWorkflowModalProps) {
  if (!isOpen || !batch) return null;

  const recipe = recipes.find(r => r.id === batch.recipeId);

  // Local editable form state
  const [formData, setFormData] = useState<ProductionBatch>({ ...batch });
  const [activeStep, setActiveStep] = useState<number>(1);
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [overrideUser, setOverrideUser] = useState<string>('Production Supervisor');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Sync when batch changes
  useEffect(() => {
    if (batch) {
      setFormData({ ...batch });
      
      // Auto set step based on status
      if (batch.status === 'Planned' || batch.status === 'Raw Materials Issued') setActiveStep(1);
      else if (batch.status === 'In Production' || batch.status === 'Cooking Completed') setActiveStep(2);
      else if (batch.status === 'Cooling') setActiveStep(3);
      else if (batch.status === 'Quality Check') setActiveStep(5);
      else if (batch.status === 'Ready for Packaging' || batch.status === 'Packaging in Progress') setActiveStep(6);
      else if (batch.status === 'Packaging Completed' || batch.status === 'Batch Completed' || batch.status === 'Packed') setActiveStep(7);
      else setActiveStep(4);
    }
  }, [batch]);

  // Handle nested changes
  const updateField = <K extends keyof ProductionBatch>(key: K, value: ProductionBatch[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Helper calculations
  const rawMaterialInputKg = (formData.batchSizeGrams || 10000) / 1000;
  const cookedWeightKg = formData.actualCookedWeightKg || rawMaterialInputKg * 0.92;

  // Post-Cook Loss sum
  const coolingLoss = formData.coolingLossKg || 0;
  const moistureLoss = formData.moistureLossKg || 0;
  const sortingLoss = formData.sortingLossKg || 0;
  const qualityRejection = formData.qualityRejectionKg || 0;
  const brokenLoss = formData.brokenLossKg || 0;
  const burntLoss = formData.burntLossKg || 0;
  const spillageLoss = formData.spillageLossKg || 0;
  const handlingLoss = formData.handlingLossKg || 0;
  const otherLoss = formData.otherLossKg || 0;

  const totalPostCookLossKg = coolingLoss + moistureLoss + sortingLoss + qualityRejection + brokenLoss + burntLoss + spillageLoss + handlingLoss + otherLoss;
  const acceptedWeightKg = Math.max(0, cookedWeightKg - totalPostCookLossKg);

  // Oil Consumption
  const oilOpening = formData.oilOpeningLitres || 50;
  const oilAdded = formData.oilFreshAddedLitres || 15;
  const oilRecovered = formData.oilRecoveredLitres || 58;
  const oilWaste = formData.oilWasteLitres || 2;
  const oilCarryForward = formData.oilCarriedForwardLitres || 0;
  const actualOilConsumption = Math.max(0, oilOpening + oilAdded - oilRecovered - oilWaste - oilCarryForward);

  // Temperature Checks
  const targetTemp = formData.targetTemperature || 175;
  const minTemp = formData.actualMinTemp || 172;
  const maxTemp = formData.actualMaxTemp || 178;
  const isTempOut = minTemp < (targetTemp - 10) || maxTemp > (targetTemp + 10);

  // Packaging & Output
  const packSizeGrams = formData.targetPackSizeGrams || (recipe?.packagingSizes[0]?.grams || 200);
  const goodPacks = formData.goodPacksCount || Math.round((acceptedWeightKg * 1000) / packSizeGrams);
  const totalGoodPackedKg = (goodPacks * packSizeGrams) / 1000;
  const totalProductionLossKg = rawMaterialInputKg - totalGoodPackedKg;
  const totalProductionLossPercent = rawMaterialInputKg > 0 ? (totalProductionLossKg / rawMaterialInputKg) * 100 : 0;
  const cookingYieldPercent = rawMaterialInputKg > 0 ? (cookedWeightKg / rawMaterialInputKg) * 100 : 0;
  const postCoolingYieldPercent = rawMaterialInputKg > 0 ? (acceptedWeightKg / rawMaterialInputKg) * 100 : 0;
  const packagingYieldPercent = rawMaterialInputKg > 0 ? (totalGoodPackedKg / rawMaterialInputKg) * 100 : 0;

  // Cost Recalculation
  const scale = (formData.batchSizeGrams || 10000) / (recipe?.baseBatchSizeGrams || 10000);
  const rmCost = recipe ? calculateIngredientsCost(recipe, materials) * scale : 0;
  const oilCost = actualOilConsumption * (formData.oilCostPerLitreActual || recipe?.oilCostPerLitre || 135);
  const pouchCost = goodPacks * (recipe?.packagingSizes[0]?.pouchCost || 1.5);
  const laborCost = (formData.laborCostActual || (recipe ? calculateLaborCost(recipe) : 1800)) * scale;
  const fuelCost = (formData.fuelCostActual || (recipe?.fuelCost || 180)) * scale;
  const overheadCost = (formData.overheadCostActual || (recipe?.overheadCost || 250)) * scale;
  const totalBatchCost = rmCost + oilCost + pouchCost + laborCost + fuelCost + overheadCost;
  const costPerKg = totalGoodPackedKg > 0 ? totalBatchCost / totalGoodPackedKg : totalBatchCost / rawMaterialInputKg;
  const costPerPack = goodPacks > 0 ? totalBatchCost / goodPacks : 0;

  // Temperature Override Handler
  const handleApplyOverride = () => {
    if (!overrideReason.trim()) {
      alert('Please enter a valid supervisor override reason.');
      return;
    }
    updateField('coolingStatus', 'Overridden');
    updateField('tempOverrideUser', overrideUser);
    updateField('tempOverrideReason', overrideReason);
    updateField('tempOverrideTimestamp', new Date().toLocaleString());
    setOverrideModalOpen(false);
  };

  // Save changes & progress batch
  const handleSaveAndProgress = (nextStatus?: BatchStatus) => {
    const statusToSet = nextStatus || formData.status;

    // Gate Rule: Quality check must be PASS to move to packaging
    if (statusToSet === 'Ready for Packaging' || statusToSet === 'Packaging in Progress' || statusToSet === 'Packaging Completed' || statusToSet === 'Batch Completed') {
      if (formData.qcStatus === 'REJECT') {
        alert('CRITICAL QC GATE: Batch was REJECTED during Quality Control and cannot proceed to Packaging or Finished Stock.');
        return;
      }
      if (formData.qcStatus === 'HOLD') {
        alert('QC GATE NOTICE: Batch is currently on HOLD. Resolve inspection issues and set status to PASS before packaging.');
        return;
      }
    }

    const updated: ProductionBatch = {
      ...formData,
      status: statusToSet,
      actualCookedWeightKg: cookedWeightKg,
      acceptedWeightKg: acceptedWeightKg,
      totalPostCookLossKg: totalPostCookLossKg,
      oilUsedLitresActual: actualOilConsumption,
      actualOilCostTotal: oilCost,
      goodPacksCount: goodPacks,
      totalGoodPackedKg: totalGoodPackedKg,
      cookingYieldPercent: +cookingYieldPercent.toFixed(1),
      postCoolingYieldPercent: +postCoolingYieldPercent.toFixed(1),
      packagingYieldPercent: +packagingYieldPercent.toFixed(1),
      totalProductionLossKg: +totalProductionLossKg.toFixed(2),
      totalProductionLossPercent: +totalProductionLossPercent.toFixed(1),
      rawMaterialCostTotal: Math.round(rmCost),
      packagingMaterialCostTotal: Math.round(pouchCost),
      directLaborCostTotal: Math.round(laborCost),
      energyCostTotal: Math.round(fuelCost),
      allocatedOverheadTotal: Math.round(overheadCost),
      totalBatchCostCalculated: Math.round(totalBatchCost),
      costPerKgCalculated: +costPerKg.toFixed(2),
      costPerPackCalculated: +costPerPack.toFixed(2),
      highLossAlert: totalProductionLossPercent > 5,
    };

    onSaveBatch(updated);
    alert(`Batch #${formData.batchNumber} updated successfully! Status set to: ${statusToSet}`);
  };

  // Complete & Post to Finished Goods Stock
  const handlePostToFinishedGoods = () => {
    if (formData.postedToFinishedGoods) {
      alert(`Batch #${formData.batchNumber} is already posted to Finished Goods Stock on ${formData.finishedGoodsPostedAt}.`);
      return;
    }

    if (formData.qcStatus !== 'PASS') {
      alert('Only PASS batches can be posted to Finished Goods Inventory.');
      return;
    }

    const updated: ProductionBatch = {
      ...formData,
      status: 'Batch Completed',
      postedToFinishedGoods: true,
      finishedGoodsPostedAt: new Date().toLocaleString(),
      finishedGoodsQtyKg: totalGoodPackedKg,
      finishedGoodsPacksCount: goodPacks,
      completedAt: new Date().toLocaleString(),
    };

    onSaveBatch(updated);
    alert(`Success! Batch #${formData.batchNumber} (${totalGoodPackedKg} kg / ${goodPacks} packs) has been posted to Finished Goods Inventory.`);
    onClose();
  };

  const steps = [
    { num: 1, name: '1. Target Setup', icon: Layers },
    { num: 2, name: '2. Cooking & Oil', icon: Flame },
    { num: 3, name: '3. Cooling', icon: Snowflake },
    { num: 4, name: '4. Weighing & Loss', icon: Scale },
    { num: 5, name: '5. Quality Check (QC)', icon: ShieldCheck },
    { num: 6, name: '6. Packaging', icon: PackageCheck },
    { num: 7, name: '7. Finished Stock', icon: CheckCircle2 }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Post-Cook Production Workflow</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  #{formData.batchNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Product: <strong className="text-slate-200">{recipe?.name || 'Snack Recipe'}</strong> • Current Status: <strong className="text-amber-400">{formData.status}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lifecycle Stepper Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 overflow-x-auto flex items-center gap-2">
          {steps.map(step => {
            const Icon = step.icon;
            const isActive = activeStep === step.num;
            return (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{step.name}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">

          {/* ------------------------------------------------------------------ */}
          {/* STEP 1: TARGET SETUP & BATCH GOALS */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs text-indigo-900">
                <Layers className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-900">Stage 1: Production Batch Targets & Line Allocation</h4>
                  <p className="mt-1 text-indigo-700">Define batch standards, target output volumes, operator assignments, and start timestamps before issuing raw materials.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Lifecycle Batch Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value as BatchStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Planned">1. Planned</option>
                    <option value="Raw Materials Issued">2. Raw Materials Issued</option>
                    <option value="In Production">3. In Production</option>
                    <option value="Cooking Completed">4. Cooking Completed</option>
                    <option value="Cooling">5. Cooling</option>
                    <option value="Quality Check">6. Quality Check</option>
                    <option value="Ready for Packaging">7. Ready for Packaging</option>
                    <option value="Packaging in Progress">8. Packaging in Progress</option>
                    <option value="Packaging Completed">9. Packaging Completed</option>
                    <option value="Batch Completed">10. Batch Completed</option>
                    <option value="Hold">11. Hold</option>
                    <option value="Rejected">12. Rejected</option>
                    <option value="Cancelled">13. Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Production Shift</label>
                  <select
                    value={formData.productionShift || 'Morning'}
                    onChange={(e) => updateField('productionShift', e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Morning">Morning Shift (06:00 - 14:00)</option>
                    <option value="Afternoon">Afternoon Shift (14:00 - 22:00)</option>
                    <option value="Night">Night Shift (22:00 - 06:00)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Production Line / Fryer / Kadai</label>
                  <input
                    type="text"
                    value={formData.productionLine || 'Fryer Line 1'}
                    onChange={(e) => updateField('productionLine', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. Kadai A, Fryer 2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Production Operator</label>
                  <input
                    type="text"
                    value={formData.operatorName || 'Master Chef R. Kumar'}
                    onChange={(e) => updateField('operatorName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Supervisor Name</label>
                  <input
                    type="text"
                    value={formData.supervisorName || 'Plant Manager S. Murugan'}
                    onChange={(e) => updateField('supervisorName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Recipe Version</label>
                  <input
                    type="text"
                    value={formData.recipeVersion || 'v2.4 (2026 Formula)'}
                    onChange={(e) => updateField('recipeVersion', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Targets Summary Grid */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Target Benchmarks (Configured Standard)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Raw Material Input</span>
                    <span className="text-slate-900 font-extrabold text-sm">{rawMaterialInputKg.toFixed(1)} KG</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Expected Cooked Qty</span>
                    <span className="text-slate-900 font-extrabold text-sm">{(rawMaterialInputKg * 0.92).toFixed(1)} KG</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Expected Yield Target</span>
                    <span className="text-emerald-600 font-extrabold text-sm">90.0%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Target Pack Size</span>
                    <span className="text-indigo-600 font-extrabold text-sm">{packSizeGrams}g pouch</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 2: COOKING / FRYING & OIL PARAMETERS */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
                <Flame className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900">Stage 2: Cooking Temperature & Precision Oil Accounting</h4>
                  <p className="mt-1 text-amber-700">Record actual oil consumption without double counting reusable oil, monitor frying temperatures, and log temperature tolerance deviations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cooking Method</label>
                  <select
                    value={formData.cookingMethod || 'Frying'}
                    onChange={(e) => updateField('cookingMethod', e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Frying">Deep Frying (Oil Kadai)</option>
                    <option value="Roasting">Hot Air Roasting</option>
                    <option value="Baking">Convection Oven Baking</option>
                    <option value="Extrusion">Direct Extrusion</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Oil Type & Lot Number</label>
                  <input
                    type="text"
                    value={formData.oilType || 'Refined Sunflower Oil (Lot #SF-902)'}
                    onChange={(e) => updateField('oilType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Target Frying Temp (°C)</label>
                  <input
                    type="number"
                    value={formData.targetTemperature || 175}
                    onChange={(e) => updateField('targetTemperature', parseFloat(e.target.value) || 175)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Actual Minimum Temp (°C)</label>
                  <input
                    type="number"
                    value={formData.actualMinTemp || 172}
                    onChange={(e) => updateField('actualMinTemp', parseFloat(e.target.value) || 170)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Actual Maximum Temp (°C)</label>
                  <input
                    type="number"
                    value={formData.actualMaxTemp || 178}
                    onChange={(e) => updateField('actualMaxTemp', parseFloat(e.target.value) || 180)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Actual Cooking Duration (Mins)</label>
                  <input
                    type="number"
                    value={formData.actualCookingTimeMinutes || 25}
                    onChange={(e) => updateField('actualCookingTimeMinutes', parseInt(e.target.value) || 25)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Temperature Standard Validation */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                isTempOut ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4" /> Temperature Tolerance Check:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    isTempOut ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {isTempOut ? 'Out of Standard' : 'Within Standard'}
                  </span>
                </div>

                {isTempOut && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-rose-200">
                    <input
                      type="text"
                      placeholder="Reason for Temperature Out of Tolerance"
                      value={formData.tempOutReason || ''}
                      onChange={(e) => updateField('tempOutReason', e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-rose-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Corrective Action Taken"
                      value={formData.tempCorrectiveAction || ''}
                      onChange={(e) => updateField('tempCorrectiveAction', e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-rose-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Supervisor Approval Name"
                      value={formData.tempApprovedBy || ''}
                      onChange={(e) => updateField('tempApprovedBy', e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-rose-300 rounded-xl text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Precision Oil Balance Accounting Section */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-amber-500" /> Precision Oil Balance & Recovery
                  </h4>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                    Net Consumption: {actualOilConsumption.toFixed(1)} Litres
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Opening Oil (L)</label>
                    <input
                      type="number"
                      value={oilOpening}
                      onChange={(e) => updateField('oilOpeningLitres', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Fresh Added (L)</label>
                    <input
                      type="number"
                      value={oilAdded}
                      onChange={(e) => updateField('oilFreshAddedLitres', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-600 block">Recovered Oil (L)</label>
                    <input
                      type="number"
                      value={oilRecovered}
                      onChange={(e) => updateField('oilRecoveredLitres', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-rose-600 block">Oil Waste (L)</label>
                    <input
                      type="number"
                      value={oilWaste}
                      onChange={(e) => updateField('oilWasteLitres', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-600 block">Carried Forward (L)</label>
                    <input
                      type="number"
                      value={oilCarryForward}
                      onChange={(e) => updateField('oilCarriedForwardLitres', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 3: COOLING & RESTING */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200 flex items-start gap-3 text-xs text-cyan-900">
                <Snowflake className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-cyan-900">Stage 3: Product Cooling & Packaging Temperature Gate</h4>
                  <p className="mt-1 text-cyan-700">Allow fried snack product to rest and cool to standard packaging temperature (&lt;35°C) to prevent moisture condensation inside plastic pouches.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cooling Area / Rack ID</label>
                  <input
                    type="text"
                    value={formData.coolingRackTray || 'Cooling Bay B - Tray #12'}
                    onChange={(e) => updateField('coolingRackTray', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cooling Duration (Mins)</label>
                  <input
                    type="number"
                    value={formData.coolingDurationMinutes || 45}
                    onChange={(e) => updateField('coolingDurationMinutes', parseInt(e.target.value) || 45)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Product Temp at Frying Outlet (°C)</label>
                  <input
                    type="number"
                    value={formData.productTempAtStart || 110}
                    onChange={(e) => updateField('productTempAtStart', parseFloat(e.target.value) || 110)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Target Max Packaging Temp (°C)</label>
                  <input
                    type="number"
                    value={formData.targetPackagingTempMax || 35}
                    onChange={(e) => updateField('targetPackagingTempMax', parseFloat(e.target.value) || 35)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Actual Measured Temp before Packaging (°C)</label>
                  <input
                    type="number"
                    value={formData.actualPackagingTemp || 32}
                    onChange={(e) => updateField('actualPackagingTemp', parseFloat(e.target.value) || 32)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cooling Readiness Status</label>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                      (formData.actualPackagingTemp || 32) <= (formData.targetPackagingTempMax || 35) || formData.coolingStatus === 'Overridden'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {(formData.actualPackagingTemp || 32) <= (formData.targetPackagingTempMax || 35)
                        ? 'Ready for Packaging'
                        : formData.coolingStatus === 'Overridden' ? 'Overridden by Supervisor' : 'Cooling Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Temperature Validation Banner & Override */}
              {(formData.actualPackagingTemp || 32) > (formData.targetPackagingTempMax || 35) && formData.coolingStatus !== 'Overridden' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span><strong>Temperature Warning:</strong> Product is currently {formData.actualPackagingTemp}°C (Exceeds {formData.targetPackagingTempMax}°C max). Allow more cooling time or apply supervisor override.</span>
                  </div>
                  <button
                    onClick={() => setOverrideModalOpen(true)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Supervisor Override
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 4: COOKED WEIGHING & POST-COOK ADJUSTMENTS */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 flex items-start gap-3 text-xs text-indigo-900">
                <Scale className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-900">Stage 4: Cooked Product Weighing & Categorized Post-Cook Losses</h4>
                  <p className="mt-1 text-indigo-700">Record exact post-cooking weight on calibrated scale and itemize specific loss reasons (cooling moisture, broken pieces, burnt scraps) before computing accepted batch weight.</p>
                </div>
              </div>

              {/* Cooked Weight Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Actual Cooked Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookedWeightKg}
                    onChange={(e) => updateField('actualCookedWeightKg', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-indigo-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Number of Trays / Bins</label>
                  <input
                    type="number"
                    value={formData.weighingContainersCount || 8}
                    onChange={(e) => updateField('weighingContainersCount', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Weighing Scale ID</label>
                  <input
                    type="text"
                    value={formData.weighingScaleId || 'Digital Platform Scale #3'}
                    onChange={(e) => updateField('weighingScaleId', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Weighing Operator</label>
                  <input
                    type="text"
                    value={formData.weighingOperator || 'S. Periasamy'}
                    onChange={(e) => updateField('weighingOperator', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Itemized Post-Cook Loss Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Itemized Post-Cook Loss Record (KG)</span>
                  <span className="text-rose-600 font-bold">Total Loss: {totalPostCookLossKg.toFixed(2)} KG</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Cooling Loss (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={coolingLoss}
                      onChange={(e) => updateField('coolingLossKg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Moisture Evap (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={moistureLoss}
                      onChange={(e) => updateField('moistureLossKg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Broken Pieces (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={brokenLoss}
                      onChange={(e) => updateField('brokenLossKg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Burnt / Scrap (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={burntLoss}
                      onChange={(e) => updateField('burntLossKg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Spillage / Floor (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={spillageLoss}
                      onChange={(e) => updateField('spillageLossKg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Accepted Weight Output Card */}
              <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Net Accepted Product Weight for Packaging</span>
                  <div className="text-2xl font-black text-emerald-800">{acceptedWeightKg.toFixed(2)} KG</div>
                  <span className="text-xs text-emerald-600 font-medium">Formula: Cooked ({cookedWeightKg.toFixed(1)}kg) - Total Post-Cook Loss ({totalPostCookLossKg.toFixed(2)}kg)</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Cooking Yield: <strong className="text-slate-800">{cookingYieldPercent}%</strong></span>
                  <span className="text-slate-500 block">Post-Cooling Yield: <strong className="text-emerald-700">{postCoolingYieldPercent}%</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 5: QUALITY CONTROL CHECK (MANDATORY GATE) */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 flex items-start gap-3 text-xs text-purple-900">
                <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-purple-900">Stage 5: Mandatory Quality Control Gate (QC Inspection)</h4>
                  <p className="mt-1 text-purple-700">Only batches with status "PASS" can proceed to packaging. HOLD or REJECT batches require documented hold/rejection reasons and supervisor approval.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">QC Inspector Name</label>
                  <input
                    type="text"
                    value={formData.qcInspector || 'Dr. K. Janaki (QA Manager)'}
                    onChange={(e) => updateField('qcInspector', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Inspection Date</label>
                  <input
                    type="date"
                    value={formData.qcDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => updateField('qcDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Quality Decision Gate</label>
                  <select
                    value={formData.qcStatus || 'PASS'}
                    onChange={(e) => updateField('qcStatus', e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-black uppercase ${
                      formData.qcStatus === 'PASS'
                        ? 'bg-emerald-600 text-white'
                        : formData.qcStatus === 'HOLD'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    <option value="PASS">🟢 PASS (Approved for Packaging)</option>
                    <option value="HOLD">🟡 HOLD (Requires Re-Inspection)</option>
                    <option value="REJECT">🔴 REJECT (Quarantine / Scrap)</option>
                  </select>
                </div>
              </div>

              {/* Sensory Evaluation Parameters Grid */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Sensory & Technical QC Parameters</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Appearance & Golden Colour</label>
                    <select
                      value={formData.qcAppearance || 'Good'}
                      onChange={(e) => updateField('qcAppearance', e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="Good">Good (Golden Yellow)</option>
                      <option value="Pass">Pass</option>
                      <option value="Fair">Fair</option>
                      <option value="Fail">Fail (Too Dark/Burnt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Crispness & Texture</label>
                    <select
                      value={formData.qcCrispness || 'Good'}
                      onChange={(e) => updateField('qcCrispness', e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="Good">Good (Crunchy/Crisp)</option>
                      <option value="Pass">Pass</option>
                      <option value="Fair">Fair</option>
                      <option value="Fail">Fail (Soggy / Hard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Moisture Content (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.qcMoisturePercent || 1.8}
                      onChange={(e) => updateField('qcMoisturePercent', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Foreign Matter Check</label>
                    <select
                      value={formData.qcForeignMatterCheck || 'Passed (Nil)'}
                      onChange={(e) => updateField('qcForeignMatterCheck', e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                    >
                      <option value="Passed (Nil)">Passed (Nil / Clean)</option>
                      <option value="Failed">Failed (Contamination Detected)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* HOLD Reason / Action if Hold */}
              {formData.qcStatus === 'HOLD' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 space-y-3 text-xs">
                  <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Hold Action Protocol
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Hold Reason (e.g. Moisture 2.4% slightly elevated)"
                      value={formData.qcHoldReason || ''}
                      onChange={(e) => updateField('qcHoldReason', e.target.value)}
                      className="px-3 py-2 bg-white border border-amber-300 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Corrective Action (e.g. Additional 15m drying)"
                      value={formData.qcHoldCorrectiveAction || ''}
                      onChange={(e) => updateField('qcHoldCorrectiveAction', e.target.value)}
                      className="px-3 py-2 bg-white border border-amber-300 rounded-xl"
                    />
                    <input
                      type="date"
                      value={formData.qcHoldReinspectionDate || ''}
                      onChange={(e) => updateField('qcHoldReinspectionDate', e.target.value)}
                      className="px-3 py-2 bg-white border border-amber-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* REJECT Reason if Reject */}
              {formData.qcStatus === 'REJECT' && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-300 space-y-3 text-xs">
                  <h4 className="font-extrabold text-rose-900 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600" /> Rejection & Disposal Record
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Rejection Reason"
                      value={formData.qcRejectionReason || ''}
                      onChange={(e) => updateField('qcRejectionReason', e.target.value)}
                      className="px-3 py-2 bg-white border border-rose-300 rounded-xl"
                    />
                    <select
                      value={formData.qcRejectionDecision || 'Disposal'}
                      onChange={(e) => updateField('qcRejectionDecision', e.target.value as any)}
                      className="px-3 py-2 bg-white border border-rose-300 rounded-xl font-bold"
                    >
                      <option value="Disposal">Disposal (Scrap)</option>
                      <option value="Rework">Rework (Re-milling into mixture)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Approved By (QA Head)"
                      value={formData.qcApprovedBy || ''}
                      onChange={(e) => updateField('qcApprovedBy', e.target.value)}
                      className="px-3 py-2 bg-white border border-rose-300 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 6: PACKAGING & PACK WEIGHT VALIDATION */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 6 && (
            <div className="space-y-6">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
                <PackageCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">Stage 6: Packaging Machine Setup, Pack Weight Validation & Reconciliation</h4>
                  <p className="mt-1 text-emerald-700">Validate actual pouch weights against legal tolerance bounds (195g - 205g for 200g target) and reconcile total good packed output.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Packaging Machine ID</label>
                  <input
                    type="text"
                    value={formData.packagingMachineId || 'Multi-Head Automatic Pouch Filler #1'}
                    onChange={(e) => updateField('packagingMachineId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Target Pack Weight</label>
                  <input
                    type="number"
                    value={packSizeGrams}
                    onChange={(e) => updateField('targetPackSizeGrams', parseInt(e.target.value) || 200)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Min Allowed Weight (g)</label>
                  <input
                    type="number"
                    value={formData.packWeightMinGrams || (packSizeGrams - 5)}
                    onChange={(e) => updateField('packWeightMinGrams', parseInt(e.target.value) || (packSizeGrams - 5))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Max Allowed Weight (g)</label>
                  <input
                    type="number"
                    value={formData.packWeightMaxGrams || (packSizeGrams + 5)}
                    onChange={(e) => updateField('packWeightMaxGrams', parseInt(e.target.value) || (packSizeGrams + 5))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Packaging Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-emerald-700 block">Total Good Packs</label>
                  <input
                    type="number"
                    value={goodPacks}
                    onChange={(e) => updateField('goodPacksCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-rose-600 block">Underweight Packs</label>
                  <input
                    type="number"
                    value={formData.underweightPacksCount || 2}
                    onChange={(e) => updateField('underweightPacksCount', parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-600 block">Overweight Packs</label>
                  <input
                    type="number"
                    value={formData.overweightPacksCount || 3}
                    onChange={(e) => updateField('overweightPacksCount', parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block">Damaged Pouches</label>
                  <input
                    type="number"
                    value={formData.damagedPacksCount || 4}
                    onChange={(e) => updateField('damagedPacksCount', parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block">Material Waste (Units)</label>
                  <input
                    type="number"
                    value={formData.packagingMaterialWasteUnits || 6}
                    onChange={(e) => updateField('packagingMaterialWasteUnits', parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Packaging Reconciliation Output */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-slate-400">Packaging Output Reconciliation</span>
                  <span className="font-mono text-emerald-400 font-bold">{totalGoodPackedKg.toFixed(2)} KG Finished Goods</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-[11px]">
                  <div>Expected Packs: <strong className="text-white">{Math.round((acceptedWeightKg * 1000) / packSizeGrams)}</strong></div>
                  <div>Actual Good Packs: <strong className="text-emerald-400">{goodPacks}</strong></div>
                  <div>Variance: <strong className="text-amber-400">{goodPacks - Math.round((acceptedWeightKg * 1000) / packSizeGrams)} packs</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* STEP 7: FINISHED GOODS POSTING & BATCH COSTING */}
          {/* ------------------------------------------------------------------ */}
          {activeStep === 7 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-700/50 flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-300">Stage 7: Finished Goods Inventory Posting & Final Cost Recalculation</h4>
                  <p className="mt-1 text-slate-300">Review final batch financial summary, cost per KG, cost per pack, and post finished goods into live inventory registry.</p>
                </div>
              </div>

              {/* Financial & Yield Performance Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Batch Cost</span>
                  <div className="text-xl font-black text-slate-900">₹{Math.round(totalBatchCost).toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500 font-medium">All burden included</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Actual Good Output</span>
                  <div className="text-xl font-black text-emerald-700">{totalGoodPackedKg.toFixed(1)} KG</div>
                  <span className="text-[10px] text-emerald-600 font-extrabold">{goodPacks} packs</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Cost / KG</span>
                  <div className="text-xl font-black text-indigo-700">₹{costPerKg.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-500 font-medium">Per kg produced</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Cost / Pack</span>
                  <div className="text-xl font-black text-purple-700">₹{costPerPack.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-500 font-medium">{packSizeGrams}g pouch</span>
                </div>
              </div>

              {/* Yield & Loss Summary Bar */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Multi-Stage Yield & Loss Analysis</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Cooking Yield</span>
                    <span className="text-slate-900 font-extrabold text-sm">{cookingYieldPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Post-Cooling Yield</span>
                    <span className="text-slate-900 font-extrabold text-sm">{postCoolingYieldPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Packaging Yield</span>
                    <span className="text-emerald-700 font-extrabold text-sm">{packagingYieldPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Production Loss</span>
                    <span className={`font-extrabold text-sm ${totalProductionLossPercent > 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {totalProductionLossPercent.toFixed(1)}% ({totalProductionLossKg.toFixed(2)} KG)
                    </span>
                  </div>
                </div>
              </div>

              {/* Finished Goods Post Status */}
              <div className="p-4 rounded-2xl border flex items-center justify-between text-xs bg-slate-100 border-slate-300">
                <div className="flex items-center gap-2">
                  {formData.postedToFinishedGoods ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Boxes className="w-5 h-5 text-indigo-600" />
                  )}
                  <div>
                    <span className="font-extrabold text-slate-900">
                      {formData.postedToFinishedGoods ? 'Already Posted to Finished Goods Inventory' : 'Ready to Post to Live Finished Goods Stock'}
                    </span>
                    {formData.postedToFinishedGoods && (
                      <span className="text-slate-500 block text-[11px]">Posted on {formData.finishedGoodsPostedAt}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handlePostToFinishedGoods}
                  disabled={formData.postedToFinishedGoods}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {formData.postedToFinishedGoods ? '✓ Stock Posted' : '📦 Post to Finished Goods Stock'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
              disabled={activeStep === 1}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              ← Previous Stage
            </button>
            <button
              onClick={() => setActiveStep(prev => Math.min(7, prev + 1))}
              disabled={activeStep === 7}
              className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              Next Stage →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveAndProgress()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              💾 Save Workflow Progress
            </button>
          </div>
        </div>

      </div>

      {/* Supervisor Override Sub-Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> Supervisor Packaging Override
            </h3>
            <p className="text-xs text-slate-600">
              Product temperature ({formData.actualPackagingTemp}°C) exceeds max limit ({formData.targetPackagingTempMax}°C). Please record supervisor justification before releasing to packaging.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Supervisor Name</label>
                <input
                  type="text"
                  value={overrideUser}
                  onChange={(e) => setOverrideUser(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Override Reason & Approval Justification</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="e.g. Humidity low in packaging line, urgent order dispatch approved by plant manager."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
