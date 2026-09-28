import React, { useState, useEffect } from 'react';
import { ProductionBatch, Recipe, RawMaterial } from '../types';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  PackageCheck, 
  Calendar, 
  TrendingUp, 
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  IndianRupee,
  Layers,
  ClipboardCheck,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckSquare,
  Square,
  PenTool,
  UserCheck,
  Flame,
  Droplet
} from 'lucide-react';

interface BatchReportModalProps {
  batch: ProductionBatch | null;
  recipes: Recipe[];
  materials: RawMaterial[];
  onClose: () => void;
  initialTab?: 'financial' | 'workorder';
}

export function BatchReportModal({ batch, recipes, materials, onClose, initialTab = 'workorder' }: BatchReportModalProps) {
  const [activeTab, setActiveTab] = useState<'financial' | 'workorder'>(initialTab);
  const [isCleanFullscreen, setIsCleanFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, batch]);

  if (!batch) return null;

  const recipe = recipes.find(r => r.id === batch.recipeId);
  const scaleFactor = batch.batchSizeGrams / (recipe?.baseBatchSizeGrams || 10000);

  // 1. Raw Material Ingredients Breakdown
  let totalMaterialCost = 0;
  const ingredientDetails = recipe ? recipe.ingredients.map(ing => {
    const mat = materials.find(m => m.id === ing.materialId);
    const weightGrams = ing.weightGrams * scaleFactor;
    const costPerGram = mat?.averageCostPerGram || 0;
    const itemCost = weightGrams * costPerGram;
    totalMaterialCost += itemCost;

    const unit = mat?.unit || 'g';
    const isWeight = unit === 'kg' || unit === 'g' || unit === 'L';
    const displayQty = isWeight 
      ? (weightGrams >= 1000 ? `${(weightGrams / 1000).toFixed(2)} kg` : `${Math.round(weightGrams)} g`)
      : `${Math.round(weightGrams)} ${unit}`;

    return {
      name: mat?.name || 'Unknown Material',
      category: mat?.category || 'General',
      weightGrams,
      displayQty,
      costPerGram,
      itemCost,
      weightPercent: (weightGrams / batch.batchSizeGrams) * 100,
    };
  }) : [];

  // 2. Packaging & Yield Calculations
  let totalPouchCost = 0;
  let totalRevenue = 0;
  let totalActualPackets = 0;
  let totalExpectedPackets = 0;

  const packagingDetails = Object.keys(batch.actualYieldPackets).map(sizeId => {
    const sz = recipe?.packagingSizes.find(p => p.id === sizeId);
    const actual = batch.actualYieldPackets[sizeId] || 0;
    const expected = batch.expectedYieldPackets[sizeId] || 0;
    
    totalActualPackets += actual;
    totalExpectedPackets += expected;

    const pouchUnitCost = sz?.pouchCost || 0;
    const mrp = sz?.mrp || 0;
    const pouchTotalCost = actual * pouchUnitCost;
    const pouchTotalRevenue = actual * mrp;

    totalPouchCost += pouchTotalCost;
    totalRevenue += pouchTotalRevenue;

    const sizeLabel = sz 
      ? `${sz.grams}${sz.unit === 'kg' ? 'kg' : sz.unit === 'liter' ? 'L' : sz.unit === 'pieces' ? ' pcs' : sz.unit === 'packs' ? ' packs' : sz.unit === 'bundle' ? ' bundle' : 'g'}`
      : 'Custom Pack';

    const efficiency = expected > 0 ? (actual / expected) * 100 : 100;

    return {
      sizeId,
      sizeLabel,
      actual,
      expected,
      variance: actual - expected,
      efficiency,
      pouchUnitCost,
      pouchTotalCost,
      mrp,
      pouchTotalRevenue
    };
  });

  // 3. Overall Financial Totals
  const totalLaborCost = batch.laborCostActual;
  const totalOverheadCost = batch.overheadCostActual;
  const totalCOGS = totalMaterialCost + totalLaborCost + totalOverheadCost + totalPouchCost;
  const costPerKg = batch.batchSizeGrams > 0 ? (totalCOGS / (batch.batchSizeGrams / 1000)) : 0;
  const costPerPouch = totalActualPackets > 0 ? totalCOGS / totalActualPackets : 0;
  const grossProfit = totalRevenue - totalCOGS;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenStandaloneWindow = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // If popup blocker blocks it, fallback to clean fullscreen view in app and print
      setIsCleanFullscreen(true);
      setTimeout(() => window.print(), 350);
      return;
    }

    const isWorkOrder = activeTab === 'workorder';
    const reportTitle = isWorkOrder ? `Work Order Sheet #${batch.batchNumber}` : `Financial Report #${batch.batchNumber}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 28px; color: #0f172a; background: #fff; line-height: 1.4; margin: 0; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
            .subtitle { font-size: 11px; color: #475569; font-weight: 700; margin-top: 4px; text-transform: uppercase; }
            .meta-badge { background: #0f172a; color: #fff; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 4px; font-family: monospace; display: inline-block; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 24px; }
            .grid-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
            .grid-value { font-size: 14px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; }
            .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px; margin: 26px 0 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 800; font-size: 10px; text-transform: uppercase; color: #334155; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
            .box-blank { display: inline-block; border: 1px dashed #64748b; padding: 4px 12px; border-radius: 4px; background: #f8fafc; min-width: 90px; text-align: center; font-family: monospace; color: #64748b; font-size: 11px; }
            .box-wide { min-width: 160px; }
            .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 44px; border-top: 2px solid #0f172a; padding-top: 24px; text-align: center; }
            .sig-line { border-bottom: 1px solid #64748b; height: 35px; margin-bottom: 8px; }
            .sig-title { font-size: 11px; font-weight: 800; color: #0f172a; }
            .sig-sub { font-size: 10px; color: #64748b; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>PROD-MASTER FOOD MANUFACTURING</h1>
              <div class="subtitle">${isWorkOrder ? 'Shop Floor Batch Manufacturing Record (BMR) • Physical Work Order Sheet' : 'Production Cost & Commercial Profitability Statement'}</div>
              <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">ISO 22000 / FSSAI Compliant Quality Record • Traceability Registry</div>
            </div>
            <div style="text-align: right;">
              <div class="meta-badge">${isWorkOrder ? 'WORK ORDER' : 'REPORT'} #${batch.batchNumber}</div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 4px; font-family: monospace;">Date: ${batch.date}</div>
              <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">Printed: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="grid-4">
            <div>
              <p class="grid-label">Product Formula</p>
              <p class="grid-value">${recipe?.name || 'Standard Formula'}</p>
            </div>
            <div>
              <p class="grid-label">Target Cooked Qty</p>
              <p class="grid-value font-mono">${(batch.batchSizeGrams / 1000).toFixed(2)} kg (${batch.batchSizeGrams.toLocaleString()}g)</p>
            </div>
            <div>
              <p class="grid-label">Current Status</p>
              <p class="grid-value" style="color: ${batch.status === 'Packed' ? '#065f46' : '#92400e'};">${batch.status}</p>
            </div>
            <div>
              <p class="grid-label">${isWorkOrder ? 'Shift Line / Assigned' : 'Total COGS'}</p>
              <p class="grid-value font-mono">${isWorkOrder ? '[ _______ / _______ ]' : `₹${totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</p>
            </div>
          </div>

          ${isWorkOrder ? `
            <div class="section-title">1. Raw Material Weighing & Issue Checklist (Physical Floor Log)</div>
            <p style="font-size: 11px; color: #475569; font-style: italic; margin-bottom: 10px;">Instruction: Scale operator must tare containers, verify digital scale calibration, record exact weighed quantity below, and initial upon ingredient dispensing.</p>
            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>Ingredient Name</th>
                  <th>Category</th>
                  <th class="text-right">Target Required</th>
                  <th class="text-center" style="background: #fef3c7; color: #78350f;">Actual Weighed [Record]</th>
                  <th class="text-center">Lot / Bag Ref #</th>
                  <th class="text-center" style="width: 80px;">Operator Sign</th>
                </tr>
              </thead>
              <tbody>
                ${ingredientDetails.map((ing, idx) => `
                  <tr>
                    <td class="text-center font-mono" style="color: #64748b;">${idx + 1}</td>
                    <td class="font-bold">${ing.name}</td>
                    <td style="color: #64748b; font-size: 11px;">${ing.category}</td>
                    <td class="text-right font-mono font-bold">${ing.displayQty}</td>
                    <td class="text-center" style="background: #fffbeb;"><span class="box-blank">[ _________ ]</span></td>
                    <td class="text-center"><span class="box-blank">[ ___________ ]</span></td>
                    <td class="text-center font-mono" style="color: #94a3b8; font-size: 10px;">[ ___ ]</td>
                  </tr>
                `).join('')}
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td colspan="3">Total Standard Target Formula Weight:</td>
                  <td class="text-right font-mono">${(batch.batchSizeGrams / 1000).toFixed(2)} kg</td>
                  <td colspan="3" class="text-center font-mono" style="color: #334155;">Total Scale Tare & Weight Verification Sign: _______________________</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">2. Cooking Process Parameters & Critical Control Points (CCP) Floor Audit</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; font-size: 11px;">
                <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">A. Heating & Resource Consumption Verification</div>
                <div style="margin-bottom: 6px;">Fuel Medium Logged: <strong class="font-mono">${batch.fuelTypeActual || 'Standard Gas / Steam'}</strong></div>
                <div style="margin-bottom: 6px;">Actual Burner Duration: <span class="box-blank">[ __________ mins ]</span></div>
                <div style="margin-bottom: 6px;">System Oil Consumption: <strong class="font-mono">${batch.oilUsedLitresActual ? `${batch.oilUsedLitresActual} Litres` : 'Not Specified'}</strong></div>
                <div>Actual Oil Refilled Floor: <span class="box-blank">[ __________ Litres ]</span></div>
              </div>
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; font-size: 11px;">
                <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">B. Critical Control Points (CCP) Inspection Log</div>
                <div style="margin-bottom: 6px;"><strong>[ ] CCP-1: Frying Temp</strong> (175°C - 185°C) &nbsp;&rarr;&nbsp; <span class="box-blank">[ _____ °C ]</span></div>
                <div style="margin-bottom: 6px;"><strong>[ ] CCP-2: Moisture Sensory Check</strong> &nbsp;&rarr;&nbsp; <span class="box-blank">[ PASS / FAIL ]</span></div>
                <div><strong>[ ] CCP-3: Post-Cook Cooling</strong> (&ge; 30m) &nbsp;&rarr;&nbsp; <span class="box-blank">[ _____ mins ]</span></div>
              </div>
            </div>

            <div class="section-title">3. Packaging Filling Record & Physical Floor Tally Sheet</div>
            <table>
              <thead>
                <tr>
                  <th>SKU / Pouch Variant</th>
                  <th class="text-right">Theoretical Expected</th>
                  <th class="text-right">System Logged Output</th>
                  <th class="text-center" style="background: #e0e7ff; color: #3730a3;">Physical Floor Tally (Cartons x Pcs)</th>
                  <th class="text-center">Damaged / Rejected</th>
                  <th class="text-center">QC Seal Check</th>
                </tr>
              </thead>
              <tbody>
                ${packagingDetails.length > 0 ? packagingDetails.map(p => `
                  <tr>
                    <td class="font-bold">${p.sizeLabel}</td>
                    <td class="text-right font-mono" style="color: #64748b;">${p.expected} pcs</td>
                    <td class="text-right font-mono font-bold">${p.actual} pcs</td>
                    <td class="text-center" style="background: #eef2ff;"><span class="box-blank box-wide">[ ___ Ctns x ___ Pcs = ________ Total ]</span></td>
                    <td class="text-center"><span class="box-blank">[ _______ pcs ]</span></td>
                    <td class="text-center font-bold" style="color: #047857;">[ &radic; ] Passed</td>
                  </tr>
                `).join('') : `<tr><td colspan="6" class="text-center" style="color: #64748b; font-style: italic;">No specific pouch packaging variants defined for this formula. Bulk packing rules apply.</td></tr>`}
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td colspan="2">Bulk & Unpacked Summary:</td>
                  <td colspan="2" class="font-mono">Packed: ${batch.packedQuantityDisplay || `${totalActualPackets} pcs`} | Left Unpacked: ${batch.unpackedQuantityDisplay || '0'}</td>
                  <td colspan="2" class="text-right font-mono" style="color: #047857;">Selling Val: ₹${(batch.sellingValueTotal || totalRevenue).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div style="border: 2px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; font-size: 11px; margin-bottom: 20px;">
              <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">4. Net Process Loss & Evaporation Reconciliation Box (Max Allowable: &le; 3.5%)</div>
              <div style="display: flex; justify-content: space-between; font-family: monospace; margin-bottom: 8px;">
                <div>Total Raw Mix Issued: <strong>${(batch.batchSizeGrams / 1000).toFixed(2)} kg</strong></div>
                <div>Total Finished Packed Wt: <strong>[ _____________ kg ]</strong></div>
                <div>Net Process Loss / Scrap: <strong>[ _______ kg ( ___ % ) ]</strong></div>
              </div>
              <div style="font-weight: 600; color: #334155;">Supervisor Variance Status: [ ] Within Specs &nbsp;&nbsp;&nbsp; [ ] Investigated & Approved &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Supervisor Initials: _____________</div>
            </div>

            <div class="section-title">5. Operator Shift Diary & Deviations Log</div>
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; min-height: 40px; font-size: 11px; background: #fff;">
              ${batch.notes ? `<p style="margin: 0 0 6px 0; font-weight: bold;">System Note: "${batch.notes}"</p>` : ''}
              <p style="color: #94a3b8; font-style: italic; margin: 0;">[ Blank area for operator or quality auditor to manually record shift observations, equipment downtime, or material variances ]</p>
            </div>
          ` : `
            <div class="section-title">1. Raw Material Ingredient Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Ingredient Item</th>
                  <th>Category</th>
                  <th class="text-right">Consumed Qty</th>
                  <th class="text-right">% Weight</th>
                  <th class="text-right">Avg Cost / Unit</th>
                  <th class="text-right">Ext. Material Cost</th>
                </tr>
              </thead>
              <tbody>
                ${ingredientDetails.map(ing => `
                  <tr>
                    <td class="font-bold">${ing.name}</td>
                    <td style="color: #64748b; font-size: 11px;">${ing.category}</td>
                    <td class="text-right font-mono">${ing.displayQty}</td>
                    <td class="text-right font-mono" style="color: #475569;">${ing.weightPercent.toFixed(1)}%</td>
                    <td class="text-right font-mono" style="color: #475569;">₹${ing.costPerGram >= 1 ? ing.costPerGram.toFixed(2) : ing.costPerGram.toFixed(4)}</td>
                    <td class="text-right font-mono font-bold">₹${ing.itemCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                  </tr>
                `).join('')}
                <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
                  <td colspan="2">Subtotal Raw Material Cost:</td>
                  <td class="text-right font-mono">${(batch.batchSizeGrams / 1000).toFixed(1)} kg</td>
                  <td class="text-right font-mono">100%</td>
                  <td class="text-right">-</td>
                  <td class="text-right font-mono" style="color: #4338ca; font-size: 13px;">₹${totalMaterialCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">2. Packaging & Pouch Yield Analysis</div>
            ${batch.status === 'In Bulk' ? `<p style="padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e;">Batch is currently in In Bulk storage. Pouch packaging yield metrics will update upon logging final bag outputs.</p>` : `
              <table>
                <thead>
                  <tr>
                    <th>Pouch Variant</th>
                    <th class="text-right">Theoretical</th>
                    <th class="text-right">Actual Output</th>
                    <th class="text-right">Yield Efficiency</th>
                    <th class="text-right">Pouch Film Cost</th>
                    <th class="text-right">Selling Price (MRP)</th>
                    <th class="text-right">Ext. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${packagingDetails.map(p => `
                    <tr>
                      <td class="font-bold">${p.sizeLabel}</td>
                      <td class="text-right font-mono" style="color: #64748b;">${p.expected} pcs</td>
                      <td class="text-right font-mono font-bold">${p.actual} pcs</td>
                      <td class="text-right font-mono">${p.efficiency.toFixed(1)}%</td>
                      <td class="text-right font-mono" style="color: #475569;">₹${p.pouchTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                      <td class="text-right font-mono" style="color: #475569;">₹${p.mrp}</td>
                      <td class="text-right font-mono font-bold" style="color: #047857;">₹${p.pouchTotalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
                    <td colspan="2">Total Yield Summary:</td>
                    <td class="text-right font-mono">${totalActualPackets} pcs</td>
                    <td class="text-right font-mono">${totalExpectedPackets > 0 ? ((totalActualPackets / totalExpectedPackets) * 100).toFixed(1) : 100}%</td>
                    <td class="text-right font-mono">₹${totalPouchCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                    <td class="text-right">-</td>
                    <td class="text-right font-mono" style="color: #047857; font-size: 13px;">₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                  </tr>
                </tbody>
              </table>
            `}

            <div class="section-title">3. Financial Outcome & COGS Breakdown</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; background: #f8fafc; font-size: 12px;">
                <div style="font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 8px;">Cost Components (₹)</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Raw Ingredients Cost:</span> <strong class="font-mono">₹${totalMaterialCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Direct Labor Wage Cost:</span> <strong class="font-mono">₹${totalLaborCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Allocated Plant Overheads:</span> <strong class="font-mono">₹${totalOverheadCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Packaging Pouch Material:</span> <strong class="font-mono">₹${totalPouchCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-weight: 800; font-size: 14px;"><span>Total COGS:</span> <strong class="font-mono" style="color: #4338ca;">₹${totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
              </div>
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; background: #eef2ff; font-size: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 800; text-transform: uppercase; color: #312e81; margin-bottom: 8px;">Commercial Profit Statement</div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Estimated Total Revenue:</span> <strong class="font-mono">₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Production COGS:</span> <strong class="font-mono" style="color: #be123c;">- ₹${totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Cost Per Produced Unit:</span> <strong class="font-mono">${totalActualPackets > 0 ? `₹${costPerPouch.toFixed(2)}/pack` : `₹${costPerKg.toFixed(1)}/kg`}</strong></div>
                  <div style="border-top: 1px solid #c7d2fe; padding-top: 6px; display: flex; justify-content: space-between; font-weight: 700;"><span>Profit/Loss per Batch:</span> <strong class="font-mono" style="color: ${(totalRevenue - totalMaterialCost) >= 0 ? '#047857' : '#be123c'};">${(totalRevenue - totalMaterialCost) >= 0 ? '+' : ''}₹${(totalRevenue - totalMaterialCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
                </div>
                <div style="border-top: 1px solid #c7d2fe; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e0e7ff;">
                  <div>
                    <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Gross Profit Margin</div>
                    <div style="font-size: 16px; font-weight: 900; color: #047857; font-family: monospace;">₹${grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div style="background: ${grossProfitMargin >= 25 ? '#d1fae5' : '#fef3c7'}; color: ${grossProfitMargin >= 25 ? '#065f46' : '#92400e'}; padding: 4px 8px; border-radius: 12px; font-weight: 800; font-size: 11px; font-family: monospace;">${grossProfitMargin.toFixed(1)}% Margin</div>
                </div>
              </div>
            </div>

            <div class="section-title">4. Quality Control Audit & Shift Remarks</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
              <div style="padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
                <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">Operator Shift Diary:</div>
                <div style="font-style: italic; color: #475569;">${batch.notes ? `"${batch.notes}"` : 'No custom production remarks logged for this cycle.'}</div>
              </div>
              <div style="padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
                <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">Quality Standards Checklist:</div>
                <div>[ &radic; ] Moisture & Hydration level within specs</div>
                <div>[ &radic; ] Cooking temperature & time verified</div>
                <div>[ &radic; ] Pouch heat sealing integrity inspected</div>
              </div>
            </div>
          `}

          <div class="signatures">
            <div>
              <div class="sig-line"></div>
              <div class="sig-title">Weighing Scale Operator</div>
              <div class="sig-sub">Tare & Dispense Verification</div>
            </div>
            <div>
              <div class="sig-line"></div>
              <div class="sig-title">Master Chef / Fryer</div>
              <div class="sig-sub">Process & CCP Compliance</div>
            </div>
            <div>
              <div class="sig-line"></div>
              <div class="sig-title">QA Inspector</div>
              <div class="sig-sub">Seal & Hygiene Stamp</div>
            </div>
            <div>
              <div class="sig-line"></div>
              <div class="sig-title">Plant Manager / CEO</div>
              <div class="sig-sub">Final Record Archiving</div>
            </div>
          </div>

          <div class="footer">
            PROD-MASTER ERP SYSTEM • CONFIDENTIAL & PROPRIETARY PRODUCTION RECORD • KEEP ON FILE FOR MINIMUM 24 MONTHS
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const renderWorkOrderSheet = () => (
    <div className="space-y-8 text-slate-900 font-sans">
      {/* Header / Identification */}
      <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-emerald-700" />
            <span className="text-xl font-black text-slate-950 tracking-tight uppercase">PROD-MASTER FOOD MANUFACTURING</span>
          </div>
          <p className="text-xs text-slate-600 font-bold mt-1 uppercase tracking-wider">
            Shop Floor Batch Manufacturing Record (BMR) • Physical Work Order Sheet
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            ISO 22000 / FSSAI Food Safety Standard Compliant • Floor Execution & Traceability Log
          </p>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <span className="inline-block px-3 py-1 bg-emerald-900 text-white text-xs font-mono font-bold rounded-md tracking-wider">
            WORK ORDER #{batch.batchNumber}
          </span>
          <p className="text-xs text-slate-600 font-mono font-semibold">Date: {batch.date}</p>
          <p className="text-[10px] text-slate-400 font-mono">Printed: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Production Order Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 shadow-2xs">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Product / Formula</p>
          <p className="text-xs font-black text-slate-950 mt-0.5 truncate" title={recipe?.name}>
            {recipe?.name || 'Standard Formula'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Target Cooked Weight</p>
          <p className="text-xs font-mono font-black text-slate-950 mt-0.5">
            {(batch.batchSizeGrams / 1000).toFixed(2)} kg ({batch.batchSizeGrams.toLocaleString()} g)
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Batch Status</p>
          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black border ${
            batch.status === 'Packed' 
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {batch.status}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Line / Shift Assignment</p>
          <div className="mt-1 border-b border-dashed border-slate-400 pb-0.5 font-mono text-xs text-slate-500">
            [ ___________ / ___________ ]
          </div>
        </div>
      </div>

      {/* Section 1: Raw Material Weighing & Issue Checklist (Physical Floor Log) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Raw Material Weighing & Issue Checklist (Physical Floor Log)</span>
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-600">
            Target Total: {(batch.batchSizeGrams / 1000).toFixed(2)} kg
          </span>
        </div>

        <p className="text-[11px] text-slate-600 italic">
          Instruction: Scale operator must tare containers, verify digital scale calibration, record exact weighed quantity in the blank box below, and initial upon ingredient dispensing.
        </p>

        <table className="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider text-[10px] border-b-2 border-slate-300">
              <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">#</th>
              <th className="py-2.5 px-3 border-r border-slate-300">Ingredient Name</th>
              <th className="py-2.5 px-3 border-r border-slate-300">Category</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right">Target Required Qty</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center bg-amber-50/60 font-black text-slate-900">Actual Weighed [Record]</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center">Raw Lot / Bag Ref #</th>
              <th className="py-2.5 px-3 text-center w-24">Operator Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {ingredientDetails.map((ing, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 font-extrabold text-slate-900">{ing.name}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-slate-600 text-[11px]">{ing.category}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-900">{ing.displayQty}</td>
                <td className="py-2 px-3 border-r border-slate-300 text-center bg-amber-50/30">
                  <span className="inline-block px-3 py-1 border border-dashed border-slate-400 bg-white rounded font-mono text-xs text-slate-400 w-full min-w-[100px] text-center">
                    [ __________ ]
                  </span>
                </td>
                <td className="py-2 px-3 border-r border-slate-300 text-center">
                  <span className="inline-block px-2 py-1 border border-dashed border-slate-300 bg-slate-50 rounded font-mono text-[11px] text-slate-400 w-full text-center">
                    [ ___________ ]
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-xs align-middle mr-1" />
                  <span className="text-[10px] text-slate-400 font-mono">[ ___ ]</span>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-400">
              <td colSpan={3} className="py-2.5 px-3 text-slate-900 border-r border-slate-300">Total Standard Target Formula Weight:</td>
              <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 border-r border-slate-300">{(batch.batchSizeGrams / 1000).toFixed(2)} kg</td>
              <td colSpan={3} className="py-2.5 px-3 text-center font-mono text-slate-700">
                Total Scale Tare & Weight Verification Sign: ___________________________
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Cooking Process Parameters & Quality Control Audit Check-sheet */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Cooking Process Parameters & Critical Control Points (CCP) Floor Audit</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 pb-1">
              A. Heating & Resource Consumption Verification
            </p>
            <div className="space-y-2 text-xs font-medium text-slate-700">
              <div className="flex justify-between items-center">
                <span>Fuel Medium Logged:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded">{batch.fuelTypeActual || 'Standard Gas / Steam'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Actual Burner / Cooking Duration:</span>
                <span className="font-mono text-slate-400 border-b border-dashed border-slate-400 px-4 py-0.5">[ ___________ mins ]</span>
              </div>
              <div className="flex justify-between items-center">
                <span>System Oil Consumption:</span>
                <span className="font-mono font-bold text-slate-900">{batch.oilUsedLitresActual ? `${batch.oilUsedLitresActual} Litres` : 'Not Specified'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Actual Oil Refill Measured on Floor:</span>
                <span className="font-mono text-slate-400 border-b border-dashed border-slate-400 px-4 py-0.5">[ ___________ Litres ]</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 pb-1">
              B. Critical Control Points (CCP) Inspection Log
            </p>
            <div className="space-y-2.5 text-xs text-slate-800 font-medium">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block" />
                  <strong>CCP-1: Frying / Cooking Temp</strong> (175°C - 185°C)
                </span>
                <span className="font-mono text-slate-400 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">[ ______ °C ]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block" />
                  <strong>CCP-2: Moisture Sensory Check</strong> (Crispy/Dry)
                </span>
                <span className="font-mono text-slate-400 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">[ PASS / FAIL ]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block" />
                  <strong>CCP-3: Post-Cook Cooling Time</strong> (&ge; 30 mins)
                </span>
                <span className="font-mono text-slate-400 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">[ ______ mins ]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Packaging & Yield Floor Tally Sheet */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Packaging Filling Record & Physical Floor Tally Sheet</span>
          </h3>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider text-[10px] border-b-2 border-slate-300">
              <th className="py-2.5 px-3 border-r border-slate-300">SKU / Pouch Variant</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right">Theoretical Expected</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right">System Logged Output</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center bg-indigo-50/60 font-black text-slate-900">Physical Floor Tally (Cartons x Pcs)</th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center">Damaged / Rejected Pouches</th>
              <th className="py-2.5 px-3 text-center">QC Seal Check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {packagingDetails.length > 0 ? (
              packagingDetails.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 border-r border-slate-300 font-extrabold text-slate-900">{p.sizeLabel}</td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-slate-600">{p.expected} pcs</td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-extrabold text-slate-900">{p.actual} pcs</td>
                  <td className="py-2 px-3 border-r border-slate-300 text-center bg-indigo-50/30">
                    <span className="inline-block px-3 py-1 border border-dashed border-slate-400 bg-white rounded font-mono text-xs text-slate-400 w-full text-center">
                      [ ____ Cartons x ____ Pcs = ________ Total ]
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-center">
                    <span className="inline-block px-2 py-1 border border-dashed border-slate-300 bg-slate-50 rounded font-mono text-[11px] text-slate-400 w-full text-center">
                      [ ________ pcs ]
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-block w-4 h-4 border-2 border-slate-700 rounded-xs align-middle mr-1" />
                    <span className="text-[10px] font-bold text-slate-600">Passed</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500 italic">No specific pouch packaging variants defined for this formula. Bulk packing rules apply.</td>
              </tr>
            )}
            <tr className="bg-slate-50 font-extrabold border-t-2 border-slate-400 text-xs">
              <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300">Bulk & Unpacked Summary:</td>
              <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 font-mono text-slate-900">
                Packed: {batch.packedQuantityDisplay || `${totalActualPackets} pcs`} | Left Unpacked: {batch.unpackedQuantityDisplay || '0'}
              </td>
              <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-emerald-800">
                Est. Commercial Selling Val: ₹{(batch.sellingValueTotal || totalRevenue).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 4: Process Loss & Scrap Reconciliation Block */}
      <div className="p-4 bg-slate-100/80 rounded-xl border-2 border-slate-300 text-xs space-y-2">
        <div className="flex items-center justify-between font-black text-slate-900 uppercase tracking-wide">
          <span>4. Net Process Loss & Evaporation Reconciliation Box (To Be Completed by Line Supervisor)</span>
          <span className="font-mono text-[11px] text-slate-600">Max Allowable Loss: &le; 3.5%</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 font-mono">
          <div className="p-2 bg-white rounded border border-slate-300">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Raw Mix Issued</span>
            <span className="text-sm font-bold text-slate-900">{(batch.batchSizeGrams / 1000).toFixed(2)} kg</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-300">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Finished Packed Weight</span>
            <span className="text-sm font-bold text-slate-400">[ ________________ kg ]</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-300">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Net Process Loss / Scrap</span>
            <span className="text-sm font-bold text-slate-400">[ ________ kg ( ___ % ) ]</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-slate-700">
          <span>Supervisor Variance Status: <span className="inline-block w-3.5 h-3.5 border-2 border-slate-600 rounded-xs align-middle mx-1" /> Within Specs <span className="inline-block w-3.5 h-3.5 border-2 border-slate-600 rounded-xs align-middle mx-1 ml-4" /> Investigated & Approved</span>
          <span>Supervisor Initials: _______________</span>
        </div>
      </div>

      {/* Section 5: Operator Remarks & Quality Audit Notes */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">5</span>
            <span>Operator Shift Diary & Deviations Log</span>
          </h3>
        </div>
        <div className="p-3 bg-white border border-slate-300 rounded-lg min-h-[50px] text-xs">
          {batch.notes ? (
            <p className="font-semibold text-slate-800">System Note: "{batch.notes}"</p>
          ) : null}
          <p className="text-slate-400 italic text-[11px] mt-1">
            [ Blank area for operator or quality auditor to manually record shift observations, equipment downtime, or material variances ]
          </p>
        </div>
      </div>

      {/* Section 6: Signatures & Authorization Sign-off Block */}
      <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
        <div className="space-y-8">
          <div className="border-b border-slate-400 pb-6">
            <span className="font-mono text-slate-300 text-[11px]">[ Sign Here ]</span>
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Weighing Scale Operator</p>
            <p className="text-[10px] text-slate-500">Tare & Dispense Verification</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-400 pb-6">
            <span className="font-serif italic text-slate-600 font-bold text-sm">Shankar N.</span>
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Head Fryer / Master Chef</p>
            <p className="text-[10px] text-slate-500">Process & CCP Compliance</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-400 pb-6">
            <span className="font-serif italic text-slate-600 font-bold text-sm">Ramesh K.</span>
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Quality Assurance (QA) Lead</p>
            <p className="text-[10px] text-slate-500">Seal & Hygiene Stamp</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-400 pb-6">
            <span className="font-serif italic text-indigo-700 font-bold text-sm">workfortamil@gmail.com</span>
          </div>
          <div>
            <p className="font-extrabold text-slate-900">Plant Manager / CEO</p>
            <p className="text-[10px] text-slate-500">Final Record Archiving</p>
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-4">
        PROD-MASTER FOOD MANUFACTURING ERP • PHYSICAL BATCH RECORD ARCHIVE • KEEP ON FILE FOR MINIMUM 24 MONTHS
      </div>
    </div>
  );

  const renderFinancialReport = () => (
    <div className="space-y-8 text-slate-900 font-sans">
      {/* Header / Letterhead */}
      <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-indigo-700" />
            <span className="text-xl font-black text-slate-950 tracking-tight uppercase">PROD-MASTER FOOD MANUFACTURING</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Quality Audit, Ingredient Consumption & Financial Outcome Statement
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Unit 4 - Industrial Processing Estate • CEO Audit Registry
          </p>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-mono font-bold rounded-md tracking-wider">
            REPORT #{batch.batchNumber}
          </span>
          <p className="text-xs text-slate-500 font-mono">Date: {batch.date}</p>
          <p className="text-[10px] text-slate-400 font-mono">Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Executive Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Recipe Formula</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5 truncate" title={recipe?.name}>
            {recipe?.name || 'Standard Formula'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cooked Quantity</p>
          <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
            {(batch.batchSizeGrams / 1000).toFixed(1)} kg ({batch.batchSizeGrams.toLocaleString()}g)
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Current Status</p>
          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
            batch.status === 'Packed' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {batch.status}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total COGS</p>
          <p className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
            ₹{totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Section 1: Raw Material Ingredients Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>1. Raw Material Ingredient Breakdown</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Total Weight: {(batch.batchSizeGrams / 1000).toFixed(1)} kg
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-y border-slate-200">
              <th className="py-2 px-3">Ingredient Item</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 text-right">Consumed Qty</th>
              <th className="py-2 px-3 text-right">% Weight</th>
              <th className="py-2 px-3 text-right">Avg Cost / Unit</th>
              <th className="py-2 px-3 text-right">Ext. Material Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {ingredientDetails.map((ing, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-bold text-slate-800">{ing.name}</td>
                <td className="py-2 px-3 text-slate-500 text-[11px]">{ing.category}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-900">{ing.displayQty}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-600">{ing.weightPercent.toFixed(1)}%</td>
                <td className="py-2 px-3 text-right font-mono text-slate-600">
                  ₹{ing.costPerGram >= 1 ? ing.costPerGram.toFixed(2) : ing.costPerGram.toFixed(4)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                  ₹{ing.itemCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td colSpan={2} className="py-2 px-3 text-slate-900">Subtotal Raw Material Cost:</td>
              <td className="py-2 px-3 text-right font-mono text-slate-900">{(batch.batchSizeGrams / 1000).toFixed(1)} kg</td>
              <td className="py-2 px-3 text-right font-mono text-slate-900">100%</td>
              <td className="py-2 px-3 text-right text-slate-400">-</td>
              <td className="py-2 px-3 text-right font-mono text-indigo-700 text-sm">
                ₹{totalMaterialCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Production Yield & Packaging Analysis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>2. Packaging & Pouch Yield Analysis</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Status: {batch.status}
          </span>
        </div>

        {batch.status === 'In Bulk' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Batch is currently in <strong>In Bulk</strong> storage. Pouch packaging yield metrics will update upon logging final bag outputs.
            </span>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-y border-slate-200">
                <th className="py-2 px-3">Pouch Variant</th>
                <th className="py-2 px-3 text-right">Theoretical</th>
                <th className="py-2 px-3 text-right">Actual Output</th>
                <th className="py-2 px-3 text-right">Yield Efficiency</th>
                <th className="py-2 px-3 text-right">Pouch Film Cost</th>
                <th className="py-2 px-3 text-right">Selling Price (MRP)</th>
                <th className="py-2 px-3 text-right">Ext. Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {packagingDetails.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-bold text-slate-800">{p.sizeLabel}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">{p.expected} pcs</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{p.actual} pcs</td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      p.efficiency >= 98 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.efficiency.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    ₹{p.pouchTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">₹{p.mrp}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                    ₹{p.pouchTotalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td colSpan={2} className="py-2 px-3 text-slate-900">Total Yield Summary:</td>
                <td className="py-2 px-3 text-right font-mono text-slate-900">{totalActualPackets} pcs</td>
                <td className="py-2 px-3 text-right font-mono text-slate-900">
                  {totalExpectedPackets > 0 ? ((totalActualPackets / totalExpectedPackets) * 100).toFixed(1) : 100}%
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-900">
                  ₹{totalPouchCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-700 text-sm">
                  ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Section 3: Financial Outcome & Profitability Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>3. Financial Outcome & COGS Breakdown</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Cost per Kg: ₹{costPerKg.toFixed(1)}/kg
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2 text-xs">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Cost Components (₹)</p>
            
            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-600">Raw Ingredients Cost:</span>
              <span className="font-bold text-slate-900">₹{totalMaterialCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            </div>

            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-600">Direct Labor Wage Cost:</span>
              <span className="font-bold text-slate-900">₹{totalLaborCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            </div>

            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-600">Allocated Plant Overheads:</span>
              <span className="font-bold text-slate-900">₹{totalOverheadCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            </div>

            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-600">Packaging Pouch Material:</span>
              <span className="font-bold text-slate-900">₹{totalPouchCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-mono text-sm font-extrabold text-slate-950">
              <span>Total COGS:</span>
              <span className="text-indigo-700">₹{totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-3.5 bg-indigo-50/30 space-y-2 text-xs flex flex-col justify-between">
            <div>
              <p className="font-bold text-indigo-900 uppercase tracking-wider text-[10px] mb-2">Commercial Revenue & Profit Statement</p>
              
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Estimated Total Revenue:</span>
                  <span className="font-bold text-slate-900">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Production COGS:</span>
                  <span className="text-rose-700">- ₹{totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Cost Per Produced Unit:</span>
                  <span className="font-bold text-slate-800">
                    {totalActualPackets > 0 ? `₹${costPerPouch.toFixed(2)}/pack` : `₹${costPerKg.toFixed(1)}/kg`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold text-slate-900">
                  <span>Profit/Loss per Batch:</span>
                  <span className={(totalRevenue - totalMaterialCost) >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {(totalRevenue - totalMaterialCost) >= 0 ? '+' : ''}₹{(totalRevenue - totalMaterialCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-200/60 pt-2 flex justify-between items-center bg-white p-2.5 rounded-md border border-indigo-100 shadow-2xs">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Gross Profit Margin</p>
                <p className="text-base font-mono font-black text-emerald-700">
                  ₹{grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                grossProfitMargin >= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {grossProfitMargin.toFixed(1)}% Margin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Production Diary & Quality Audit Notes */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>4. Quality Control Audit & Shift Remarks</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <p className="font-bold text-slate-700 text-[11px]">Chef / Operator Shift Diary:</p>
            <p className="text-slate-600 italic">
              {batch.notes ? `"${batch.notes}"` : 'No custom production remarks logged for this cooking cycle.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <p className="font-bold text-slate-700 text-[11px]">Quality Standards Checklist:</p>
            <ul className="space-y-0.5 text-[11px] text-slate-600 font-medium">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Moisture & Hydration level within specs</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cooking temperature & time verified</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pouch heat sealing integrity inspected</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 5: Signatures & Authorization Sign-off */}
      <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-slate-400 pb-8 mb-1">
            <span className="font-serif italic text-slate-400 text-sm">Shankar N.</span>
          </div>
          <p className="font-bold text-slate-900">Head Production Operator</p>
          <p className="text-[10px] text-slate-400">Plant Shift Lead</p>
        </div>

        <div>
          <div className="border-b border-slate-400 pb-8 mb-1">
            <span className="font-serif italic text-slate-400 text-sm">Ramesh K.</span>
          </div>
          <p className="font-bold text-slate-900">Quality Assurance Lead</p>
          <p className="text-[10px] text-slate-400">Standards Inspector</p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <div className="border-b border-slate-400 pb-8 mb-1">
            <span className="font-serif italic text-indigo-700 text-sm font-bold">workfortamil@gmail.com</span>
          </div>
          <p className="font-bold text-slate-900">Chief Executive Officer (CEO)</p>
          <p className="text-[10px] text-slate-400">Final Commercial Approval</p>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-4">
        PROD-MASTER ERP SYSTEM • CONFIDENTIAL & PROPRIETARY PRODUCTION RECORD • SYSTEM STAMP VERIFIED
      </div>
    </div>
  );

  // If in Clean Fullscreen Print View (no modal wrappers, no app UI)
  if (isCleanFullscreen) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white overflow-y-auto text-slate-900 font-sans p-4 sm:p-12 print:p-0">
        {/* Floating Toolbar (Hidden in Print) */}
        <div className="fixed top-4 right-4 z-[100000] flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white p-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl border border-slate-700 no-print animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2 mr-2 border-r border-slate-700 pr-3 hidden md:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide text-slate-200">
              Clean Print-Friendly View
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('workorder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'workorder' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📋 Work Order Sheet
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'financial' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📊 Financial Report
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet Now</span>
          </button>
          <button
            type="button"
            onClick={handleOpenStandaloneWindow}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open standalone document in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">New Tab</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCleanFullscreen(false)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer ml-1"
            title="Exit Clean View back to application modal"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit View</span>
          </button>
        </div>

        {/* Printable Sheet Container */}
        <div className="max-w-4xl mx-auto bg-white pt-16 sm:pt-6 pb-16 print:pt-0 print:pb-0" id="printable-batch-report">
          {activeTab === 'workorder' ? renderWorkOrderSheet() : renderFinancialReport()}
        </div>
      </div>
    );
  }

  // Normal Modal Popup View
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Production Batch Record View</h2>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-300">
                  #{batch.batchNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Formula: {recipe?.name || 'Standard'} • Date: {batch.date}
              </p>
            </div>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('workorder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'workorder' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Shop Floor Work Order Sheet designed for physical record keeping"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Physical Work Order</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'financial' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Financial and COGS cost accounting breakdown"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Financial Report</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIsCleanFullscreen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              title="Open Clean Fullscreen Print View (Removes all browser UI & modal headers)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clean Print View</span>
            </button>
            <button
              type="button"
              onClick={handleOpenStandaloneWindow}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
              title="Open standalone document in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">New Tab</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              title="Direct Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/70" id="printable-batch-report-container">
          <div 
            id="printable-batch-report" 
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto transition-all duration-200"
          >
            {activeTab === 'workorder' ? renderWorkOrderSheet() : renderFinancialReport()}
          </div>
        </div>

      </div>
    </div>
  );
}
