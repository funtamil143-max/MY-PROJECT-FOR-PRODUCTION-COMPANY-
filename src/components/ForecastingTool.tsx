import React, { useState, useMemo } from 'react';
import { 
  RawMaterial, 
  Recipe, 
  ProductionBatch, 
  SaleEntry, 
  ExpenseEntry, 
  PurchaseBill 
} from '../types';
import { 
  TrendingUp, 
  Sparkles, 
  Calculator, 
  Calendar, 
  DollarSign, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Printer, 
  RefreshCw, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Sliders, 
  Package, 
  ShoppingCart, 
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShieldAlert,
  Zap,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { exportMultiSheetExcel } from '../utils/excelExport';

interface ForecastingToolProps {
  materials: RawMaterial[];
  recipes: Recipe[];
  batches: ProductionBatch[];
  salesEntries: SaleEntry[];
  expenses: ExpenseEntry[];
  bills: PurchaseBill[];
  onAddBill?: (bill: Omit<PurchaseBill, 'id'>) => void;
}

export default function ForecastingTool({
  materials,
  recipes,
  batches,
  salesEntries,
  expenses,
  bills,
  onAddBill
}: ForecastingToolProps) {
  // Preset or selected recipe
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('all');
  
  // Horizon parameters
  const [timeHorizonDays, setTimeHorizonDays] = useState<number>(30); // 30, 90, 180, 365
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Interactive inputs
  const [batchesPerDay, setBatchesPerDay] = useState<number>(2);
  const [operatingDaysPerWeek, setOperatingDaysPerWeek] = useState<number>(6);
  const [customBatchSizeGrams, setCustomBatchSizeGrams] = useState<number>(10000); // 10 kg
  const [salesPricePerKg, setSalesPricePerKg] = useState<number>(280); // ₹/kg
  const [salesRealizationPercent, setSalesRealizationPercent] = useState<number>(95); // % of batch sold
  const [materialCostInflationPercent, setMaterialCostInflationPercent] = useState<number>(2); // % monthly inflation
  const [laborWorkersCount, setLaborWorkersCount] = useState<number>(3);
  const [laborDailyWage, setLaborDailyWage] = useState<number>(650); // ₹ per worker/day
  const [oilLitresPerBatch, setOilLitresPerBatch] = useState<number>(4.0);
  const [oilCostPerLitre, setOilCostPerLitre] = useState<number>(135);
  const [fuelCostPerBatch, setFuelCostPerBatch] = useState<number>(180);
  const [variableBurdenPerBatch, setVariableBurdenPerBatch] = useState<number>(120);
  const [fixedMonthlyOverheads, setFixedMonthlyOverheads] = useState<number>(25000);
  const [wasteLossPercent, setWasteLossPercent] = useState<number>(2.5); // % loss

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'scenarios' | 'ai-advisor'>('dashboard');
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [shortageAdded, setShortageAdded] = useState<boolean>(false);

  // Sync parameters when selected recipe changes
  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    if (recipeId === 'all') {
      setCustomBatchSizeGrams(10000);
      setSalesPricePerKg(280);
      setOilLitresPerBatch(4.0);
    } else {
      const rec = recipes.find(r => r.id === recipeId);
      if (rec) {
        setCustomBatchSizeGrams(rec.baseBatchSizeGrams || 10000);
        setSalesPricePerKg(rec.sellingPricePerKg || 260);
        setLaborWorkersCount(rec.laborWorkersCount || 3);
        setLaborDailyWage(rec.laborDailyWage || 600);
        setOilLitresPerBatch(rec.oilUsedLitres || 3.5);
        setOilCostPerLitre(rec.oilCostPerLitre || 135);
        setFuelCostPerBatch(rec.fuelCost || 180);
        setVariableBurdenPerBatch(rec.otherBurdenCost || rec.overheadCost || 100);
      }
    }
  };

  // Helper: Historical baseline stats (last 30 days)
  const historicalBaseline = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBatches = batches.filter(b => new Date(b.date) >= thirtyDaysAgo);
    const recentSales = salesEntries.filter(s => new Date(s.date) >= thirtyDaysAgo && !s.isCancelled);

    const totalBatches = recentBatches.length;
    const totalWeightKg = recentBatches.reduce((acc, b) => acc + (b.batchSizeGrams / 1000), 0);
    const totalRevenue = recentSales.reduce((acc, s) => acc + (s.finalAmount || s.totalAmount || 0), 0);
    const avgRevenuePerKg = totalWeightKg > 0 ? totalRevenue / totalWeightKg : 0;

    return {
      totalBatches,
      totalWeightKg,
      totalRevenue,
      avgRevenuePerKg,
      dailyBatchAverage: +(totalBatches / 30).toFixed(1)
    };
  }, [batches, salesEntries]);

  // Load Parameters from Historical Averages
  const handleAutoFillFromHistory = () => {
    if (historicalBaseline.totalBatches > 0) {
      const dailyBatches = Math.max(1, Math.round(historicalBaseline.totalBatches / 25)); // assuming 25 work days
      setBatchesPerDay(dailyBatches);
      if (historicalBaseline.avgRevenuePerKg > 0) {
        setSalesPricePerKg(Math.round(historicalBaseline.avgRevenuePerKg));
      }
    } else {
      alert('No recent batch history found in the database. Using default benchmark inputs.');
    }
  };

  // -------------------------------------------------------------
  // CORE FORECAST MATHEMATICAL ENGINE
  // -------------------------------------------------------------
  const forecast = useMemo(() => {
    // 1. Time & Operational Calculations
    const totalWeeks = timeHorizonDays / 7;
    const totalOperatingDays = Math.round(totalWeeks * operatingDaysPerWeek);
    const totalBatches = totalOperatingDays * batchesPerDay;

    const rawBatchWeightKgTotal = (totalBatches * customBatchSizeGrams) / 1000;
    const netSaleableKgTotal = rawBatchWeightKgTotal * (1 - wasteLossPercent / 100);
    const expectedUnitsSoldKg = netSaleableKgTotal * (salesRealizationPercent / 100);

    // 2. Revenue Projections
    const grossRevenue = expectedUnitsSoldKg * salesPricePerKg;

    // 3. Raw Material Costs calculation
    let baseRawMaterialCostPerBatch = 0;
    const recipeListToEvaluate = selectedRecipeId === 'all' 
      ? recipes 
      : recipes.filter(r => r.id === selectedRecipeId);

    if (recipeListToEvaluate.length > 0) {
      // Calculate average raw material cost per batch scaled to customBatchSizeGrams
      let totalIngCostSum = 0;
      recipeListToEvaluate.forEach(recipe => {
        const scale = recipe.baseBatchSizeGrams > 0 ? (customBatchSizeGrams / recipe.baseBatchSizeGrams) : 1;
        const ingCost = recipe.ingredients.reduce((sum, ing) => {
          const mat = materials.find(m => m.id === ing.materialId);
          return sum + (ing.weightGrams * (mat?.averageCostPerGram || 0));
        }, 0);
        totalIngCostSum += (ingCost * scale);
      });
      baseRawMaterialCostPerBatch = totalIngCostSum / recipeListToEvaluate.length;
    } else {
      // Default fallback estimation: ~60% of price per kg
      baseRawMaterialCostPerBatch = (customBatchSizeGrams / 1000) * (salesPricePerKg * 0.45);
    }

    // Midpoint inflation multiplier over forecast period
    const monthsInHorizon = timeHorizonDays / 30;
    const avgInflationMultiplier = 1 + ((materialCostInflationPercent / 100) * (monthsInHorizon / 2));
    const totalRawMaterialCost = totalBatches * baseRawMaterialCostPerBatch * avgInflationMultiplier;

    // 4. Labor & Operational Costs
    const totalLaborCost = totalOperatingDays * laborWorkersCount * laborDailyWage;
    const totalOilCost = totalBatches * oilLitresPerBatch * oilCostPerLitre;
    const totalFuelCost = totalBatches * fuelCostPerBatch;
    const totalVariableBurden = totalBatches * variableBurdenPerBatch;

    // Packaging pouch estimation (assume 100g pouch average = 10 pouches per kg)
    const totalPouchesNeeded = Math.round(netSaleableKgTotal * 8); // e.g. 8 pouches per kg average
    const avgPouchCost = 1.20; // ₹1.20 per pouch
    const totalPackagingCost = totalPouchesNeeded * avgPouchCost;

    // 5. Fixed Overheads
    const totalFixedOverheads = fixedMonthlyOverheads * (timeHorizonDays / 30);

    // 6. Totals & Margins
    const totalCostOfGoodsSold = totalRawMaterialCost + totalLaborCost + totalOilCost + totalFuelCost + totalVariableBurden + totalPackagingCost;
    const totalCombinedExpense = totalCostOfGoodsSold + totalFixedOverheads;

    const netProfit = grossRevenue - totalCombinedExpense;
    const profitMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const cogsPercent = grossRevenue > 0 ? (totalCostOfGoodsSold / grossRevenue) * 100 : 0;
    const costPerKgProduced = rawBatchWeightKgTotal > 0 ? totalCombinedExpense / rawBatchWeightKgTotal : 0;

    // 7. Break-Even Calculations
    const variableCostPerBatch = (baseRawMaterialCostPerBatch * avgInflationMultiplier) + 
      (oilLitresPerBatch * oilCostPerLitre) + 
      fuelCostPerBatch + 
      variableBurdenPerBatch + 
      ((laborWorkersCount * laborDailyWage) / Math.max(1, batchesPerDay));

    const revenuePerBatch = (customBatchSizeGrams / 1000) * (1 - wasteLossPercent/100) * (salesRealizationPercent/100) * salesPricePerKg;
    const contributionMarginPerBatch = revenuePerBatch - variableCostPerBatch;

    const breakEvenBatchesMonth = contributionMarginPerBatch > 0 
      ? Math.ceil(fixedMonthlyOverheads / contributionMarginPerBatch) 
      : 0;
    const breakEvenVolumeKgMonth = breakEvenBatchesMonth * (customBatchSizeGrams / 1000);
    const breakEvenBatchesTotal = Math.ceil(breakEvenBatchesMonth * (timeHorizonDays / 30));

    // 8. Time Series Breakdowns for Recharts
    const chartData = [];
    const numPeriods = granularity === 'daily' ? Math.min(30, timeHorizonDays) : granularity === 'weekly' ? Math.ceil(timeHorizonDays / 7) : Math.ceil(timeHorizonDays / 30);
    const daysPerPeriod = timeHorizonDays / numPeriods;

    for (let i = 1; i <= numPeriods; i++) {
      const periodLabel = granularity === 'daily' ? `Day ${i}` : granularity === 'weekly' ? `Wk ${i}` : `Mth ${i}`;
      const periodBatches = (totalBatches / numPeriods);
      const periodVolumeKg = (rawBatchWeightKgTotal / numPeriods);
      const periodRevenue = (grossRevenue / numPeriods);
      const periodMatCost = (totalRawMaterialCost / numPeriods);
      const periodLaborFuel = ((totalLaborCost + totalOilCost + totalFuelCost + totalPackagingCost) / numPeriods);
      const periodOverheads = (totalFixedOverheads / numPeriods);
      const periodTotalCost = (totalCombinedExpense / numPeriods);
      const periodProfit = periodRevenue - periodTotalCost;

      chartData.push({
        name: periodLabel,
        Batches: +periodBatches.toFixed(1),
        'Volume (kg)': +periodVolumeKg.toFixed(0),
        'Revenue (₹)': Math.round(periodRevenue),
        'Material Cost': Math.round(periodMatCost),
        'Labor, Oil & Packaging': Math.round(periodLaborFuel),
        'Fixed Overheads': Math.round(periodOverheads),
        'Total Expenses': Math.round(periodTotalCost),
        'Net Profit (₹)': Math.round(periodProfit)
      });
    }

    // 9. Cost Structure Pie Chart Data
    const costStructurePie = [
      { name: 'Raw Ingredients', value: Math.round(totalRawMaterialCost), color: '#3b82f6' },
      { name: 'Labor Wages', value: Math.round(totalLaborCost), color: '#8b5cf6' },
      { name: 'Oil & Fuel', value: Math.round(totalOilCost + totalFuelCost), color: '#f59e0b' },
      { name: 'Packaging Pouches', value: Math.round(totalPackagingCost), color: '#10b981' },
      { name: 'Fixed Factory Rent & Overheads', value: Math.round(totalFixedOverheads), color: '#ef4444' },
      { name: 'Other Burden', value: Math.round(totalVariableBurden), color: '#64748b' }
    ].filter(item => item.value > 0);

    // 10. Raw Material Stock Shortage Analysis
    const materialRequirements: {
      materialId: string;
      materialName: string;
      category: string;
      unit: string;
      totalRequiredGrams: number;
      currentStockGrams: number;
      shortageGrams: number;
      estimatedCost: number;
    }[] = [];

    const activeRecipes = selectedRecipeId === 'all' ? recipes : recipes.filter(r => r.id === selectedRecipeId);
    
    if (activeRecipes.length > 0) {
      const scalePerRecipe = selectedRecipeId === 'all' 
        ? (totalBatches / activeRecipes.length) 
        : totalBatches;

      materials.forEach(mat => {
        let totalNeeded = 0;
        activeRecipes.forEach(rec => {
          const ing = rec.ingredients.find(i => i.materialId === mat.id);
          if (ing) {
            const batchScale = rec.baseBatchSizeGrams > 0 ? (customBatchSizeGrams / rec.baseBatchSizeGrams) : 1;
            totalNeeded += ing.weightGrams * batchScale * scalePerRecipe;
          }
        });

        if (totalNeeded > 0) {
          const shortage = Math.max(0, totalNeeded - mat.currentStockGrams);
          const estCost = (shortage * mat.averageCostPerGram) * avgInflationMultiplier;

          materialRequirements.push({
            materialId: mat.id,
            materialName: mat.name,
            category: mat.category,
            unit: mat.unit,
            totalRequiredGrams: Math.round(totalNeeded),
            currentStockGrams: Math.round(mat.currentStockGrams),
            shortageGrams: Math.round(shortage),
            estimatedCost: Math.round(estCost)
          });
        }
      });
    }

    return {
      totalOperatingDays,
      totalBatches,
      rawBatchWeightKgTotal,
      netSaleableKgTotal,
      expectedUnitsSoldKg,
      grossRevenue,
      totalRawMaterialCost,
      totalLaborCost,
      totalOilCost,
      totalFuelCost,
      totalVariableBurden,
      totalPackagingCost,
      totalFixedOverheads,
      totalCostOfGoodsSold,
      totalCombinedExpense,
      netProfit,
      profitMarginPercent,
      cogsPercent,
      costPerKgProduced,
      breakEvenBatchesMonth,
      breakEvenVolumeKgMonth,
      breakEvenBatchesTotal,
      contributionMarginPerBatch,
      chartData,
      costStructurePie,
      materialRequirements,
      avgInflationMultiplier
    };
  }, [
    timeHorizonDays,
    operatingDaysPerWeek,
    batchesPerDay,
    customBatchSizeGrams,
    wasteLossPercent,
    salesRealizationPercent,
    salesPricePerKg,
    selectedRecipeId,
    recipes,
    materials,
    materialCostInflationPercent,
    laborWorkersCount,
    laborDailyWage,
    oilLitresPerBatch,
    oilCostPerLitre,
    fuelCostPerBatch,
    variableBurdenPerBatch,
    fixedMonthlyOverheads,
    granularity
  ]);

  // -------------------------------------------------------------
  // SCENARIO MATRIX (Base vs Conservative vs Optimistic)
  // -------------------------------------------------------------
  const scenarioMatrix = useMemo(() => {
    const baseRevenue = forecast.grossRevenue;
    const baseExpense = forecast.totalCombinedExpense;
    const baseProfit = forecast.netProfit;

    // Conservative: Material Cost +12%, Sales Price -5%, Sales Realization -5%
    const consRevenue = baseRevenue * 0.92;
    const consExpense = baseExpense * 1.10;
    const consProfit = consRevenue - consExpense;
    const consMargin = consRevenue > 0 ? (consProfit / consRevenue) * 100 : 0;

    // Optimistic: Price +8%, Waste -1%, Sales Volume +10%
    const optRevenue = baseRevenue * 1.15;
    const optExpense = baseExpense * 0.95;
    const optProfit = optRevenue - optExpense;
    const optMargin = optRevenue > 0 ? (optProfit / optRevenue) * 100 : 0;

    return [
      {
        scenario: '🔴 Conservative (Stress Test)',
        description: 'Material cost +10% inflation, 8% price discount, lower sales velocity',
        revenue: Math.round(consRevenue),
        expenses: Math.round(consExpense),
        profit: Math.round(consProfit),
        margin: +consMargin.toFixed(1),
        roi: consExpense > 0 ? +((consProfit / consExpense) * 100).toFixed(1) : 0
      },
      {
        scenario: '🔵 Base Plan (Current Inputs)',
        description: 'Expected target outputs based on customized parameters',
        revenue: Math.round(baseRevenue),
        expenses: Math.round(baseExpense),
        profit: Math.round(baseProfit),
        margin: +forecast.profitMarginPercent.toFixed(1),
        roi: baseExpense > 0 ? +((baseProfit / baseExpense) * 100).toFixed(1) : 0
      },
      {
        scenario: '🟢 Optimistic (Growth Goal)',
        description: '+15% Sales growth, waste reduced by 1%, premium wholesale pricing',
        revenue: Math.round(optRevenue),
        expenses: Math.round(optExpense),
        profit: Math.round(optProfit),
        margin: +optMargin.toFixed(1),
        roi: optExpense > 0 ? +((optProfit / optExpense) * 100).toFixed(1) : 0
      }
    ];
  }, [forecast]);

  // -------------------------------------------------------------
  // AI STRATEGIC ADVISOR (Gemini API Integration)
  // -------------------------------------------------------------
  const handleGenerateAiInsights = async () => {
    setIsLoadingAi(true);
    setAiError('');
    setAiInsights('');

    const topShortages = forecast.materialRequirements
      .filter(m => m.shortageGrams > 0)
      .slice(0, 4)
      .map(m => `${m.materialName} (${(m.shortageGrams / 1000).toFixed(1)} kg)`)
      .join(', ');

    const forecastSummary = {
      timeFrameDays: timeHorizonDays,
      totalBatches: forecast.totalBatches,
      totalVolumeKg: Math.round(forecast.rawBatchWeightKgTotal),
      projectedRevenue: Math.round(forecast.grossRevenue),
      projectedCogs: Math.round(forecast.totalCostOfGoodsSold),
      projectedOverheads: Math.round(forecast.totalFixedOverheads),
      projectedNetProfit: Math.round(forecast.netProfit),
      profitMarginPercent: forecast.profitMarginPercent.toFixed(1),
      breakEvenBatches: forecast.breakEvenBatchesTotal,
      breakEvenVolumeKg: Math.round(forecast.breakEvenVolumeKgMonth * (timeHorizonDays / 30)),
      topMaterialShortages: topShortages || 'None'
    };

    try {
      const response = await fetch('/api/gemini/forecast-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forecastSummary,
          scenarioName: selectedRecipeId === 'all' ? 'All Recipes Portfolio' : recipes.find(r => r.id === selectedRecipeId)?.name || 'Custom Plan'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI recommendations');
      }

      setAiInsights(data.text);
      setActiveTab('ai-advisor');
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      setAiError(err.message || 'Unable to connect to AI Advisor. Check Gemini API key configuration.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // -------------------------------------------------------------
  // EXPORT TO EXCEL WORKBOOK
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const summaryData = [
      { Indicator: 'Time Horizon (Days)', Value: timeHorizonDays },
      { Indicator: 'Total Batches Planned', Value: forecast.totalBatches },
      { Indicator: 'Total Volume Produced (kg)', Value: Math.round(forecast.rawBatchWeightKgTotal) },
      { Indicator: 'Net Saleable Output (kg)', Value: Math.round(forecast.netSaleableKgTotal) },
      { Indicator: 'Projected Gross Revenue (₹)', Value: Math.round(forecast.grossRevenue) },
      { Indicator: 'Projected Raw Material Cost (₹)', Value: Math.round(forecast.totalRawMaterialCost) },
      { Indicator: 'Projected Labor Cost (₹)', Value: Math.round(forecast.totalLaborCost) },
      { Indicator: 'Projected Oil & Fuel Cost (₹)', Value: Math.round(forecast.totalOilCost + forecast.totalFuelCost) },
      { Indicator: 'Projected Fixed Overheads (₹)', Value: Math.round(forecast.totalFixedOverheads) },
      { Indicator: 'Total Projected Cost (₹)', Value: Math.round(forecast.totalCombinedExpense) },
      { Indicator: 'Projected Net Profit (₹)', Value: Math.round(forecast.netProfit) },
      { Indicator: 'Net Profit Margin (%)', Value: `${forecast.profitMarginPercent.toFixed(1)}%` },
      { Indicator: 'Break-Even Batches Required/Month', Value: forecast.breakEvenBatchesMonth },
      { Indicator: 'Break-Even Volume Required/Month (kg)', Value: Math.round(forecast.breakEvenVolumeKgMonth) }
    ];

    const materialsData = forecast.materialRequirements.map(m => ({
      Ingredient: m.materialName,
      Category: m.category,
      'Total Required (kg/units)': m.unit === 'g' || m.unit === 'kg' ? (m.totalRequiredGrams / 1000).toFixed(2) : m.totalRequiredGrams,
      'Current In-Stock': m.unit === 'g' || m.unit === 'kg' ? (m.currentStockGrams / 1000).toFixed(2) : m.currentStockGrams,
      'Shortage Gap': m.unit === 'g' || m.unit === 'kg' ? (m.shortageGrams / 1000).toFixed(2) : m.shortageGrams,
      'Est. Purchase Cost (₹)': m.estimatedCost,
      Status: m.shortageGrams > 0 ? 'REORDER REQUIRED' : 'Sufficient Stock'
    }));

    const periodicData = forecast.chartData.map(c => ({
      Period: c.name,
      Batches: c.Batches,
      'Volume (kg)': c['Volume (kg)'],
      'Revenue (₹)': c['Revenue (₹)'],
      'Material Cost (₹)': c['Material Cost'],
      'Labor & Oil Cost (₹)': c['Labor, Oil & Packaging'],
      'Fixed Overheads (₹)': c['Fixed Overheads'],
      'Total Expense (₹)': c['Total Expenses'],
      'Net Profit (₹)': c['Net Profit (₹)']
    }));

    exportMultiSheetExcel([
      { name: 'Forecast Executive Summary', data: summaryData },
      { name: 'Raw Material Demand', data: materialsData },
      { name: 'Period Forecast Timeline', data: periodicData }
    ], `Snack_Production_Forecast_${timeHorizonDays}Days`);
  };

  // Convert Shortages into Purchase Order
  const handleAutoGeneratePurchaseOrder = () => {
    if (!onAddBill) return;
    const shortages = forecast.materialRequirements.filter(m => m.shortageGrams > 0);
    if (shortages.length === 0) {
      alert('All raw materials are currently in stock! No reorder bill required.');
      return;
    }

    const items = shortages.map(s => ({
      materialId: s.materialId,
      quantityGrams: s.shortageGrams,
      totalCost: s.estimatedCost,
      costPerGram: s.shortageGrams > 0 ? s.estimatedCost / s.shortageGrams : 0
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

    onAddBill({
      billNumber: `PUR-FORECAST-${Date.now().toString().slice(-4)}`,
      supplierName: 'Bulk Ingredients Wholesale Vendor',
      vendorName: 'Forecast Auto-Planner',
      date: new Date().toISOString().split('T')[0],
      items,
      totalAmount,
      notes: `Auto-generated purchase requisition based on ${timeHorizonDays}-day production forecast.`
    });

    setShortageAdded(true);
    setTimeout(() => setShortageAdded(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Predictive Production & Profitability Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Snack Production Forecasting & Financial Planner
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Model future production output, ingredient demand, cost inflation, and profit margins across customizable time horizons with real-time sensitivity analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoFillFromHistory}
              className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Auto-fill inputs using last 30 days actual batch output"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Pull Historical Baseline
            </button>
            <button
              onClick={handleGenerateAiInsights}
              disabled={isLoadingAi}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              {isLoadingAi ? 'Analyzing...' : '✨ Ask AI Advisor'}
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Historical Context Bar */}
        {historicalBaseline.totalBatches > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Past 30-Day Batches</span>
              <span className="text-slate-100 font-extrabold text-sm">{historicalBaseline.totalBatches} batches ({historicalBaseline.totalWeightKg.toFixed(0)} kg)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Historical Revenue</span>
              <span className="text-emerald-400 font-extrabold text-sm">₹{historicalBaseline.totalRevenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Avg Sales Rate</span>
              <span className="text-indigo-300 font-extrabold text-sm">₹{historicalBaseline.avgRevenuePerKg.toFixed(1)} / kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Forecast Variance</span>
              <span className={`font-extrabold text-sm flex items-center gap-1 ${
                forecast.grossRevenue >= historicalBaseline.totalRevenue ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {forecast.grossRevenue >= historicalBaseline.totalRevenue ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {historicalBaseline.totalRevenue > 0 
                  ? `${(((forecast.grossRevenue - historicalBaseline.totalRevenue) / historicalBaseline.totalRevenue) * 100).toFixed(0)}% vs past 30 days` 
                  : 'New Model'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel & Input Parameters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Production & Financial Model Inputs</h2>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Frame:</span>
            {[
              { label: '1 Month (30d)', days: 30 },
              { label: '3 Months (Quarter)', days: 90 },
              { label: '6 Months', days: 180 },
              { label: '1 Year (365d)', days: 365 }
            ].map(item => (
              <button
                key={item.days}
                onClick={() => setTimeHorizonDays(item.days)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  timeHorizonDays === item.days
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Recipe Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Snack Recipe Selection</span>
              <span className="text-[10px] text-indigo-600 font-normal">Recipe Mix</span>
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              <option value="all">🌐 All Recipes (Portfolio Average)</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.baseBatchSizeGrams / 1000}kg base)</option>
              ))}
            </select>
          </div>

          {/* Batches Per Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Daily Production Frequency</span>
              <span className="text-[10px] text-slate-400">Batches / day</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                max="50"
                value={batchesPerDay}
                onChange={(e) => setBatchesPerDay(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">run / day</span>
            </div>
          </div>

          {/* Operating Days / Week */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Factory Operating Days</span>
              <span className="text-[10px] text-slate-400">Days / week</span>
            </label>
            <select
              value={operatingDaysPerWeek}
              onChange={(e) => setOperatingDaysPerWeek(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value={5}>5 Days / Week (Mon-Fri)</option>
              <option value={6}>6 Days / Week (Standard)</option>
              <option value={7}>7 Days / Week (Full Shift)</option>
            </select>
          </div>

          {/* Batch Size (kg) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Batch Run Size</span>
              <span className="text-[10px] text-slate-400">Grams / batch</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1000"
                step="1000"
                value={customBatchSizeGrams}
                onChange={(e) => setCustomBatchSizeGrams(Math.max(500, parseInt(e.target.value) || 10000))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{(customBatchSizeGrams / 1000).toFixed(1)} kg</span>
            </div>
          </div>

          {/* Selling Price per Kg */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Average Sales Price (₹/kg)</span>
              <span className="text-[10px] text-emerald-600 font-bold">Wholesale / MRP</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="10"
                step="5"
                value={salesPricePerKg}
                onChange={(e) => setSalesPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Material Cost Inflation % */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Material Inflation Rate</span>
              <span className="text-[10px] text-amber-600 font-bold">% per month</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                max="20"
                value={materialCostInflationPercent}
                onChange={(e) => setMaterialCostInflationPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
          </div>

          {/* Labor Wage & Workers */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Daily Labor Shift Cost</span>
              <span className="text-[10px] text-slate-400">{laborWorkersCount} workers</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                value={laborWorkersCount}
                onChange={(e) => setLaborWorkersCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                placeholder="Workers"
              />
              <input
                type="number"
                min="100"
                step="50"
                value={laborDailyWage}
                onChange={(e) => setLaborDailyWage(Math.max(0, parseInt(e.target.value) || 0))}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                placeholder="Wage ₹/day"
              />
            </div>
          </div>

          {/* Fixed Monthly Overheads */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Fixed Factory Overheads</span>
              <span className="text-[10px] text-slate-400">Rent, Admin, TNEB</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={fixedMonthlyOverheads}
                onChange={(e) => setFixedMonthlyOverheads(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200/80 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Predictive Summary & Charts
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" /> Ingredient Demand & Stock Check
          {forecast.materialRequirements.some(m => m.shortageGrams > 0) && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px]">
              {forecast.materialRequirements.filter(m => m.shortageGrams > 0).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'scenarios'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Scenario Stress Testing
        </button>

        <button
          onClick={() => setActiveTab('ai-advisor')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ai-advisor'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" /> AI Strategic Optimization
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PREDICTIVE DASHBOARD & CHARTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Executive KPI Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Projected Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Revenue</span>
              <div className="text-xl font-black text-slate-900">
                ₹{forecast.grossRevenue >= 100000 ? `${(forecast.grossRevenue / 100000).toFixed(2)} Lakh` : forecast.grossRevenue.toLocaleString()}
              </div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> {(forecast.expectedUnitsSoldKg).toFixed(0)} kg sold
              </span>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
              <div className="text-xl font-black text-slate-900">
                ₹{forecast.totalCombinedExpense >= 100000 ? `${(forecast.totalCombinedExpense / 100000).toFixed(2)} Lakh` : forecast.totalCombinedExpense.toLocaleString()}
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                COGS: {forecast.cogsPercent.toFixed(1)}%
              </span>
            </div>

            {/* Net Profit */}
            <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
              forecast.netProfit >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Projected Net Profit</span>
              <div className={`text-xl font-black ${forecast.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₹{forecast.netProfit >= 100000 ? `${(forecast.netProfit / 100000).toFixed(2)} Lakh` : forecast.netProfit.toLocaleString()}
              </div>
              <span className={`text-[11px] font-extrabold ${forecast.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {forecast.profitMarginPercent.toFixed(1)}% Profit Margin
              </span>
            </div>

            {/* Total Volume */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Planned Output</span>
              <div className="text-xl font-black text-slate-900">
                {Math.round(forecast.rawBatchWeightKgTotal).toLocaleString()} kg
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {forecast.totalBatches} batches total
              </span>
            </div>

            {/* Unit Cost per Kg */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Cost / kg</span>
              <div className="text-xl font-black text-indigo-700">
                ₹{forecast.costPerKgProduced.toFixed(1)}
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Price: ₹{salesPricePerKg}/kg
              </span>
            </div>

            {/* Break-Even Target */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Break-Even Point</span>
              <div className="text-xl font-black text-amber-600">
                {forecast.breakEvenBatchesMonth} batches
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                ~{Math.round(forecast.breakEvenVolumeKgMonth)} kg / month
              </span>
            </div>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Timeline Financial Projection Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Financial Performance Projection Timeline</h3>
                  <p className="text-xs text-slate-500">Revenue vs. Cumulative Operating Costs over {timeHorizonDays} Days ({granularity})</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {(['daily', 'weekly', 'monthly'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        granularity === g ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Revenue (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Total Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Net Profit (₹)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Breakdown Pie Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Projected Cost Breakdown</h3>
                <p className="text-xs text-slate-500">Distribution of manufacturing expense drivers</p>
              </div>

              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={forecast.costStructurePie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {forecast.costStructurePie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Expense</span>
                  <span className="text-sm font-black text-slate-800">₹{(forecast.totalCombinedExpense / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {forecast.costStructurePie.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 text-[11px] font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[11px]">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Break-Even & Operational Efficiency Insight Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-xs shrink-0">
                <Zap className="w-5 h-5 font-black" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900">Break-Even Operational Benchmark</h4>
                <p className="text-xs text-slate-700 max-w-2xl">
                  To cover your fixed monthly factory overheads of <strong>₹{fixedMonthlyOverheads.toLocaleString()}</strong>, you must produce and sell at least <strong>{forecast.breakEvenBatchesMonth} batches (~{Math.round(forecast.breakEvenVolumeKgMonth)} kg)</strong> per month. Current plan delivers <strong>{Math.round((forecast.totalBatches / (timeHorizonDays/30)))} batches/month</strong> ({((forecast.totalBatches / (timeHorizonDays/30)) >= forecast.breakEvenBatchesMonth) ? '✅ Above Break-even' : '⚠️ Below Break-even'}).
                </p>
              </div>
            </div>
            
            <div className="shrink-0 bg-white px-4 py-2 rounded-2xl border border-amber-200/80 shadow-xs text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Contribution / Batch</span>
              <span className="text-sm font-black text-slate-900">₹{Math.round(forecast.contributionMarginPerBatch).toLocaleString()}</span>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: RAW MATERIAL DEMAND & INVENTORY CHECK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'materials' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Raw Material & Packaging Requirement Forecast</h3>
              <p className="text-xs text-slate-500">Calculated ingredient amounts needed for {forecast.totalBatches} planned batches over {timeHorizonDays} days</p>
            </div>

            <button
              onClick={handleAutoGeneratePurchaseOrder}
              disabled={!forecast.materialRequirements.some(m => m.shortageGrams > 0)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                shortageAdded 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {shortageAdded ? '✓ Added Reorder to Purchases' : '🛒 Create Purchase Order for Shortages'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold">
                  <th className="py-3 px-4">Ingredient / Material</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Required Forecast</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Stock Deficit (Shortage)</th>
                  <th className="py-3 px-4 text-right">Est. Reorder Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {forecast.materialRequirements.map((m) => {
                  const isShortage = m.shortageGrams > 0;
                  const reqDisplay = m.unit === 'g' || m.unit === 'kg' 
                    ? `${(m.totalRequiredGrams / 1000).toFixed(2)} kg` 
                    : `${m.totalRequiredGrams} ${m.unit}`;

                  const stockDisplay = m.unit === 'g' || m.unit === 'kg'
                    ? `${(m.currentStockGrams / 1000).toFixed(2)} kg`
                    : `${m.currentStockGrams} ${m.unit}`;

                  const shortageDisplay = m.unit === 'g' || m.unit === 'kg'
                    ? `${(m.shortageGrams / 1000).toFixed(2)} kg`
                    : `${m.shortageGrams} ${m.unit}`;

                  return (
                    <tr key={m.materialId} className={`hover:bg-slate-50/80 transition-colors ${isShortage ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-800">{m.materialName}</td>
                      <td className="py-3 px-4 text-slate-500">{m.category}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-700">{reqDisplay}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{stockDisplay}</td>
                      <td className={`py-3 px-4 text-right font-extrabold ${isShortage ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isShortage ? shortageDisplay : '0 (Covered)'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {isShortage ? `₹${m.estimatedCost.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isShortage ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Reorder Needed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SCENARIO MATRIX */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'scenarios' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">Scenario Sensitivity & Stress Testing</h3>
            <p className="text-xs text-slate-500">Compare model financial resilience across conservative, base, and growth scenarios</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenarioMatrix.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-6 rounded-3xl border space-y-4 transition-all ${
                  idx === 1 
                    ? 'bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/20' 
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-800">{item.scenario}</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{item.description}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-200/80 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Projected Revenue:</span>
                    <span className="font-extrabold text-slate-800">₹{item.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Expenses:</span>
                    <span className="font-extrabold text-slate-800">₹{item.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-slate-700">Net Profit:</span>
                    <span className={`font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ₹{item.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Profit Margin:</span>
                    <span className={`font-black ${item.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.margin}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">ROI:</span>
                    <span className="font-extrabold text-indigo-600">{item.roi}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: AI STRATEGIC OPTIMIZATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ai-advisor' && (
        <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">AI Snack Production Strategic Insights</h3>
                <p className="text-xs text-slate-500">Powered by Gemini AI for South Indian Snack Manufacturing</p>
              </div>
            </div>

            <button
              onClick={handleGenerateAiInsights}
              disabled={isLoadingAi}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
              Re-Analyze Forecast
            </button>
          </div>

          {isLoadingAi ? (
            <div className="p-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Analyzing cost structure, material inflation, and batch schedules...</p>
              <p className="text-xs text-slate-400">Gemini is evaluating yield optimization & purchasing strategy for your forecast.</p>
            </div>
          ) : aiError ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-2">
              <p className="font-bold">Error generating AI Insights</p>
              <p>{aiError}</p>
            </div>
          ) : aiInsights ? (
            <div className="prose prose-sm prose-purple max-w-none text-slate-800 text-xs leading-relaxed space-y-4 whitespace-pre-line bg-purple-50/40 p-6 rounded-2xl border border-purple-100">
              {aiInsights}
            </div>
          ) : (
            <div className="p-12 text-center space-y-4">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto opacity-60" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Get Custom AI Operational Recommendations</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">Click below to generate Gemini-powered insights on ingredient inflation hedging, pricing strategy, and capacity planning.</p>
              </div>
              <button
                onClick={handleGenerateAiInsights}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Generate AI Optimization Strategy
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
