import React, { useState } from 'react';
import { RawMaterial, Recipe, PurchaseBill, SaleEntry, SalaryEntry, DailyUsageEntry } from '../types';
import { 
  Package, 
  ShoppingCart, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight, 
  Layers, 
  Sparkles,
  Calendar,
  Search,
  ExternalLink,
  DollarSign,
  Tag,
  Clock,
  Eye,
  X,
  Receipt,
  Users,
  CreditCard,
  Building2,
  Wallet,
  Calculator,
  Flame,
  Droplet
} from 'lucide-react';
import { calculateIngredientsCost } from '../utils/calculations';
import { exportMultiSheetExcel } from '../utils/excelExport';

interface DashboardProps {
  materials: RawMaterial[];
  recipes: Recipe[];
  bills?: PurchaseBill[];
  salesEntries?: SaleEntry[];
  employeeSalaries?: SalaryEntry[];
  dailyUsageEntries?: DailyUsageEntry[];
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ 
  materials, 
  recipes, 
  bills = [], 
  salesEntries = [],
  employeeSalaries = [],
  dailyUsageEntries = [],
  setActiveTab 
}: DashboardProps) {
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | '30days' | '7days'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // 1. INVENTORY / RAW STOCK CALCULATIONS
  const totalRawMaterials = materials.length;
  const totalInventoryValue = materials.reduce(
    (sum, mat) => sum + Math.max(0, mat.currentStockGrams) * (mat.averageCostPerGram || 0), 
    0
  );

  const lowStockMaterials = materials.filter(m => (m.currentStockGrams || 0) <= (m.minStockGrams || 0));

  // Category Breakdown for Raw Stock
  const categoryMap: { [cat: string]: { count: number; totalValue: number; items: RawMaterial[] } } = {};
  materials.forEach(m => {
    const cat = m.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, totalValue: 0, items: [] };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].totalValue += Math.max(0, m.currentStockGrams) * (m.averageCostPerGram || 0);
    categoryMap[cat].items.push(m);
  });

  // 2. PURCHASES CALCULATIONS
  const now = new Date();
  const filteredBills = bills.filter(b => {
    if (purchaseFilter === 'all') return true;
    const billDate = new Date(b.date);
    const diffDays = (now.getTime() - billDate.getTime()) / (1000 * 3600 * 24);
    if (purchaseFilter === '7days') return diffDays <= 7;
    if (purchaseFilter === '30days') return diffDays <= 30;
    return true;
  });

  const totalPurchaseSpend = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalBillsCount = filteredBills.length;

  // Recent 6 Purchase Invoices
  const recentBills = [...filteredBills]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  // 3. RECIPES CALCULATIONS
  const totalRecipesCount = recipes.length;

  const recipeStats = recipes.map(r => {
    const rawCostPerBatch = calculateIngredientsCost(r, materials);
    const batchKg = (r.baseBatchSizeGrams || 10000) / 1000;
    const rawCostPerKg = batchKg > 0 ? rawCostPerBatch / batchKg : 0;
    return {
      ...r,
      rawCostPerBatch,
      rawCostPerKg,
      batchKg
    };
  });

  // 4. SALES CALCULATIONS
  const totalSalesRevenue = salesEntries.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
  const totalSalesPaid = salesEntries.reduce((sum, s) => sum + (s.paidAmount || (s.paymentStatus === 'Paid' ? s.finalAmount : 0)), 0);
  const totalSalesBalance = Math.max(0, totalSalesRevenue - totalSalesPaid);
  const totalSalesCount = salesEntries.length;
  const recentSales = [...salesEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  // 5. SALARY / PAYROLL CALCULATIONS
  const totalStaffCount = employeeSalaries.length;
  const totalMonthlyPayroll = employeeSalaries.reduce((sum, e) => sum + (e.netSalary || 0), 0);
  const totalPaidSalary = employeeSalaries
    .filter(e => e.paymentStatus === 'Paid')
    .reduce((sum, e) => sum + (e.paidAmount || e.netSalary || 0), 0);
  const totalPendingSalary = Math.max(0, totalMonthlyPayroll - totalPaidSalary);
  const recentStaffSalaries = [...employeeSalaries].slice(0, 6);

  // 6. DAILY USAGE & PRODUCTION COSTS CALCULATIONS
  const totalDailySpending = dailyUsageEntries.reduce((sum, e) => sum + (e.totalDaySpending || 0), 0);
  const totalDailyMaterialCost = dailyUsageEntries.reduce((sum, e) => sum + (e.totalMaterialCost || 0), 0);
  const totalDailyLabourCost = dailyUsageEntries.reduce((sum, e) => sum + (e.totalLabourCost || 0), 0);
  const totalDailyOilLitres = dailyUsageEntries.reduce((sum, e) => sum + (e.oilUsedLitres || 0), 0);
  const totalDailyOilCost = dailyUsageEntries.reduce((sum, e) => sum + (e.totalOilCost || 0), 0);
  const totalDailyFuelCost = dailyUsageEntries.reduce((sum, e) => sum + (e.totalFuelCost || 0), 0);
  const totalDailyCoversCount = dailyUsageEntries.reduce((sum, e) => sum + (e.totalCoversCount || 0), 0);
  const totalDailyCoverCost = dailyUsageEntries.reduce((sum, e) => sum + (e.totalCoverCost || 0), 0);
  const totalDailyPacketsPacked = dailyUsageEntries.reduce((sum, e) => sum + (e.totalPacketsPacked || 0), 0);
  const totalDailyWeightPackedKg = dailyUsageEntries.reduce((sum, e) => sum + (e.totalWeightPackedKg || 0), 0);
  const recentDailyEntries = [...dailyUsageEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Filtered raw stock list for search
  const filteredStockList = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export to Excel
  const handleExportExcel = () => {
    const sheets: { name: string; data: Record<string, any>[] }[] = [];

    // Sheet 1: Executive KPI Summary
    sheets.push({
      name: 'System Summary',
      data: [
        { Metric: 'Total Raw Stock Materials', Value: totalRawMaterials },
        { Metric: 'Total Inventory Valuation (₹)', Value: Math.round(totalInventoryValue) },
        { Metric: 'Low Stock Alert Items', Value: lowStockMaterials.length },
        { Metric: 'Total Purchase Invoices', Value: totalBillsCount },
        { Metric: 'Total Purchase Spending (₹)', Value: Math.round(totalPurchaseSpend) },
        { Metric: 'Active Snack Recipes', Value: totalRecipesCount },
        { Metric: 'Total Sales Revenue (₹)', Value: Math.round(totalSalesRevenue) },
        { Metric: 'Total Sales Invoices', Value: totalSalesCount },
        { Metric: 'Total Staff Employees', Value: totalStaffCount },
        { Metric: 'Total Monthly Payroll (₹)', Value: Math.round(totalMonthlyPayroll) }
      ]
    });

    // Sheet 2: Raw Stock Inventory
    sheets.push({
      name: 'Raw Stock Inventory',
      data: materials.map(m => ({
        'Material Name': m.name,
        'Category': m.category,
        'Current Stock': `${m.unit === 'kg' || m.unit === 'L' ? (m.currentStockGrams / 1000).toFixed(2) : m.currentStockGrams} ${m.unit}`,
        'Min Stock Alert': `${m.unit === 'kg' || m.unit === 'L' ? (m.minStockGrams / 1000).toFixed(2) : m.minStockGrams} ${m.unit}`,
        'Avg Cost Per Unit (₹)': (m.averageCostPerGram * (m.unit === 'kg' || m.unit === 'L' ? 1000 : 1)).toFixed(2),
        'Total Valuation (₹)': Math.round(m.currentStockGrams * m.averageCostPerGram),
        'Status': m.currentStockGrams <= m.minStockGrams ? 'LOW STOCK' : 'OK'
      }))
    });

    // Sheet 3: Purchase Bills
    sheets.push({
      name: 'Purchases Ledger',
      data: bills.map(b => ({
        'Bill Number': b.billNumber,
        'Date': b.date,
        'Supplier Name': b.supplierName,
        'Items Count': b.items.length,
        'Total Amount (₹)': b.totalAmount,
        'Notes': b.notes || '-'
      }))
    });

    // Sheet 4: Recipes Formulation
    sheets.push({
      name: 'Recipes Formulation',
      data: recipeStats.map(r => ({
        'Recipe Name': r.name,
        'Batch Size (Kg)': r.batchKg,
        'Ingredients Count': r.ingredients.length,
        'Formulation Cost / Batch (₹)': Math.round(r.rawCostPerBatch),
        'Cost / Kg (₹)': Math.round(r.rawCostPerKg),
        'Packaging Sizes': r.packagingSizes.map(p => `${p.grams}g (₹${p.mrp})`).join(', ')
      }))
    });

    // Sheet 5: Sales Ledger
    if (salesEntries.length > 0) {
      sheets.push({
        name: 'Sales Ledger',
        data: salesEntries.map(s => ({
          'Invoice Number': s.invoiceNumber,
          'Date': s.date,
          'Customer Name': s.customerName,
          'Total Amount (₹)': s.totalAmount,
          'Discount (₹)': s.discount || 0,
          'Final Amount (₹)': s.finalAmount,
          'Paid Amount (₹)': s.paidAmount || (s.paymentStatus === 'Paid' ? s.finalAmount : 0),
          'Balance (₹)': s.balanceAmount || 0,
          'Payment Status': s.paymentStatus
        }))
      });
    }

    // Sheet 6: Staff Salaries
    if (employeeSalaries.length > 0) {
      sheets.push({
        name: 'Salary & Payroll',
        data: employeeSalaries.map(e => ({
          'Staff Name': e.employeeName,
          'Designation': e.designation,
          'Pay Type': e.payType,
          'Rate (₹)': e.rate,
          'Working Days': e.workingDays,
          'Present Days': e.presentDays,
          'Overtime Pay (₹)': e.overtimePay,
          'Deductions (₹)': (e.advanceDeductions || 0) + (e.otherDeductions || 0),
          'Net Salary (₹)': e.netSalary,
          'Payment Status': e.paymentStatus || 'Pending'
        }))
      });
    }

    // Sheet 7: Daily Usage & Costs Ledger
    if (dailyUsageEntries.length > 0) {
      sheets.push({
        name: 'Daily Usage & Costs',
        data: dailyUsageEntries.map(e => ({
          'Date': e.date,
          'Shift': e.shift || 'Full Day',
          'Recipes Produced': e.recipeNames.join(', '),
          'Material Cost (₹)': e.totalMaterialCost,
          'Labour Cost (₹)': e.totalLabourCost,
          'Workers Count': e.workersCount,
          'Oil Used (Litres)': e.oilUsedLitres,
          'Oil Cost (₹)': e.totalOilCost,
          'Fuel Type': e.fuelType,
          'Firewood / Fuel Cost (₹)': e.totalFuelCost,
          'Covers Used (Count)': e.totalCoversCount,
          'Cover Wastage (Count)': e.totalCoverWastageCount,
          'Cover Cost (₹)': e.totalCoverCost,
          'Weight Limits Packed': e.weightLimitsPacked.map(w => `${w.packWeightGrams}g: ${w.packetsCount}p`).join(', '),
          'Total Packets Count': e.totalPacketsPacked,
          'Total Packed Weight (Kg)': e.totalWeightPackedKg,
          'Total Day Spending (₹)': e.totalDaySpending,
          'Supervisor': e.supervisorName || '-'
        }))
      });
    }

    exportMultiSheetExcel(sheets, `Factory_ERP_Summary_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6" id="dashboard-tab-content">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
              Live Factory Engine
            </span>
            <span className="text-slate-400 text-xs">• Raw Stock, Purchases, Recipes, Sales, Salary & Daily Usage</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl font-sans text-slate-100">
            Operations & Financial Dashboard
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Live overview of raw materials inventory, purchase inflows, recipe formulation costs, customer sales, staff payroll & per-day usage costs.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
            title="Export full data to multi-sheet Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button 
            onClick={() => setActiveTab('daily-usage')}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>+ Daily Usage</span>
          </button>
          <button 
            onClick={() => setActiveTab('sales')}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>+ New Sale</span>
          </button>
          <button 
            onClick={() => setActiveTab('salary')}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Payroll</span>
          </button>
          <button 
            onClick={() => setActiveTab('raw-stock')}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Stock</span>
          </button>
          <button 
            onClick={() => setActiveTab('purchases')}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchases</span>
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Recipes</span>
          </button>
        </div>
      </div>

      {/* CORE 6 PRIMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Raw Stock Valuation */}
        <div 
          onClick={() => setActiveTab('raw-stock')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Raw Stock</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-2">
            ₹{Math.round(totalInventoryValue).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{totalRawMaterials} items</span>
            <span className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover:underline">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Low Stock Alerts */}
        <div 
          onClick={() => setActiveTab('raw-stock')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
            lowStockMaterials.length > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reorder Alerts</span>
            <div className={`p-1.5 rounded-lg transition-colors ${
              lowStockMaterials.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black font-mono mt-2 ${
            lowStockMaterials.length > 0 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {lowStockMaterials.length} <span className="text-[11px] font-sans font-medium text-slate-500">Low</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{lowStockMaterials.length === 0 ? 'All ok' : 'Below safety'}</span>
            <span className="text-amber-700 font-bold flex items-center gap-0.5 group-hover:underline">
              Inspect <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Purchase Inflow */}
        <div 
          onClick={() => setActiveTab('purchases')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Purchases</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-2">
            ₹{Math.round(totalPurchaseSpend).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{totalBillsCount} bills</span>
            <span className="text-amber-600 font-bold flex items-center gap-0.5 group-hover:underline">
              Ledger <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Recipes Library */}
        <div 
          onClick={() => setActiveTab('recipes')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recipes</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-2">
            {totalRecipesCount} <span className="text-[11px] font-sans font-medium text-slate-500">Recipes</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Formulations</span>
            <span className="text-sky-600 font-bold flex items-center gap-0.5 group-hover:underline">
              Formulas <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 5: Sales Revenue */}
        <div 
          onClick={() => setActiveTab('sales')}
          className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-emerald-50/20 to-transparent"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sales Revenue</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-900 font-mono mt-2">
            ₹{Math.round(totalSalesRevenue).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{totalSalesCount} invoices</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5 group-hover:underline">
              Billing <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 6: Staff & Salary Payroll */}
        <div 
          onClick={() => setActiveTab('salary')}
          className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-purple-50/20 to-transparent"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Staff Payroll</span>
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-900 font-mono mt-2">
            ₹{Math.round(totalMonthlyPayroll).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{totalStaffCount} staff</span>
            <span className="text-purple-700 font-bold flex items-center gap-0.5 group-hover:underline">
              Salaries <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 7: Daily Usage & Factory Spending */}
        <div 
          onClick={() => setActiveTab('daily-usage')}
          className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-indigo-50/30 to-transparent"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Daily Usage</span>
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg group-hover:bg-indigo-700 group-hover:text-white transition-colors">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-950 font-mono mt-2">
            ₹{Math.round(totalDailySpending).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>{dailyUsageEntries.length} days logged</span>
            <span className="text-indigo-700 font-bold flex items-center gap-0.5 group-hover:underline">
              Ledger <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: DAILY USAGE & PRODUCTION COSTS HIGHLIGHT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" id="daily-usage-dashboard-section">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Per-Day Material, Labour, Oil & Firewood Spendings
              </h2>
              <p className="text-xs text-slate-500">
                Tracking daily raw material usage, worker daily wages, cooking oil litres, furnace firewood/gas, and covers used for packets on different weight limits.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('daily-usage')}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Full Usage Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Mini Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Raw Material Spend</span>
            <p className="font-mono font-black text-slate-900 text-base mt-0.5">₹{Math.round(totalDailyMaterialCost).toLocaleString()}</p>
            <span className="text-[10px] text-slate-400">Besan, Rice flour, spices, dals</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-900 uppercase block">Labour Paid</span>
            <p className="font-mono font-black text-blue-950 text-base mt-0.5">₹{Math.round(totalDailyLabourCost).toLocaleString()}</p>
            <span className="text-[10px] text-blue-800">Master & helper wages</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Oil & Firewood Used</span>
            <p className="font-mono font-black text-amber-950 text-base mt-0.5">
              ₹{Math.round(totalDailyOilCost + totalDailyFuelCost).toLocaleString()}
            </p>
            <span className="text-[10px] text-amber-800">{totalDailyOilLitres.toFixed(1)}L Oil + Furnace Fuel</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-900 uppercase block">Covers Used & Packets</span>
            <p className="font-mono font-black text-emerald-950 text-base mt-0.5">
              {totalDailyPacketsPacked.toLocaleString()} <span className="text-xs font-normal">pkts</span>
            </p>
            <span className="text-[10px] text-emerald-800">{totalDailyCoversCount.toLocaleString()} covers • {totalDailyWeightPackedKg.toFixed(1)}kg packed</span>
          </div>
        </div>

        {/* Recent Daily Logs Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Recipes</th>
                <th className="p-2.5 text-right">Material Cost</th>
                <th className="p-2.5 text-right">Labour</th>
                <th className="p-2.5 text-right">Oil (L)</th>
                <th className="p-2.5 text-right">Firewood/Fuel</th>
                <th className="p-2.5 text-right">Covers</th>
                <th className="p-2.5 min-w-[150px]">Packed Weight Limits</th>
                <th className="p-2.5 text-right bg-indigo-50/60 font-black text-indigo-950">Day Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {recentDailyEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-400 italic">No daily usage logged yet.</td>
                </tr>
              ) : (
                recentDailyEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{e.date}</td>
                    <td className="p-2.5 font-sans font-medium text-slate-700 truncate max-w-[140px]">{e.recipeNames.join(', ')}</td>
                    <td className="p-2.5 text-right">₹{e.totalMaterialCost.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-blue-900">₹{e.totalLabourCost.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-amber-900">{e.oilUsedLitres.toFixed(1)}L</td>
                    <td className="p-2.5 text-right text-orange-900">₹{e.totalFuelCost.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-emerald-900">{e.totalCoversCount} pcs</td>
                    <td className="p-2.5 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {e.weightLimitsPacked.map((w, wi) => (
                          <span key={wi} className="px-1 py-0.2 bg-slate-100 rounded text-[9px] font-mono font-bold text-slate-800">
                            {w.packWeightGrams}g:{w.packetsCount}p
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-black bg-indigo-50/40 text-indigo-950">₹{e.totalDaySpending.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: SALES & BILLING COLUMN / OVERVIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Sales & Invoicing Column
              </h2>
              <p className="text-xs text-slate-500">
                Customer billing, dispatch invoices, payment receipts, and collection balances.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('sales')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>+ Create Sale Invoice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No sales invoices logged yet.</p>
            <button
              onClick={() => setActiveTab('sales')}
              className="mt-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Generate First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3.5 py-2.5">Invoice #</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Customer Name</th>
                  <th className="px-3.5 py-2.5 text-right">Total Amount (₹)</th>
                  <th className="px-3.5 py-2.5 text-right">Paid (₹)</th>
                  <th className="px-3.5 py-2.5 text-right">Balance (₹)</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2 font-mono font-bold text-slate-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-slate-600">
                      {sale.date}
                    </td>
                    <td className="px-3.5 py-2 font-bold text-slate-800">
                      {sale.customerName}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                      ₹{sale.finalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-700">
                      ₹{(sale.paidAmount || (sale.paymentStatus === 'Paid' ? sale.finalAmount : 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-amber-700">
                      ₹{(sale.balanceAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        sale.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sale.paymentStatus === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: SALARY & PAYROLL COLUMN / OVERVIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Salary & Payroll Column
              </h2>
              <p className="text-xs text-slate-500">
                Staff wages, masters, operators, monthly/daily payout disbursement and status.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('salary')}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>+ Manage Payroll</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentStaffSalaries.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No staff salary records logged yet.</p>
            <button
              onClick={() => setActiveTab('salary')}
              className="mt-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Add Staff Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3.5 py-2.5">Staff Name</th>
                  <th className="px-3.5 py-2.5">Designation</th>
                  <th className="px-3.5 py-2.5">Pay Model</th>
                  <th className="px-3.5 py-2.5 text-right">Rate (₹)</th>
                  <th className="px-3.5 py-2.5 text-right">Net Salary (₹)</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentStaffSalaries.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2 font-bold text-slate-900">
                      {emp.employeeName}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {emp.designation}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-medium text-slate-600">
                      {emp.payType}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono text-slate-700">
                      ₹{emp.rate}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-purple-900">
                      ₹{emp.netSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        emp.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {emp.paymentStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: RAW STOCK CATEGORY BREAKDOWN & LIVE INVENTORY SNAPSHOT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Raw Stock Inventory & Valuation By Category
              </h2>
              <p className="text-xs text-slate-500">
                Detailed breakdown of flours, spices, oils, packaging, and auxiliary items in stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search raw material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => setActiveTab('raw-stock')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage All Stock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Pills Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(categoryMap).map(([categoryName, data]) => (
            <div key={categoryName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  {categoryName}
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">
                  {data.count} Items
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-indigo-700 font-mono border-t border-slate-200/60 pt-1.5">
                ₹{Math.round(data.totalValue).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>

        {/* Live Raw Stock Table Snapshot */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-3.5 py-3">Material Name</th>
                <th className="px-3.5 py-3">Category</th>
                <th className="px-3.5 py-3 text-right">Current Stock</th>
                <th className="px-3.5 py-3 text-right">Avg Cost / Unit</th>
                <th className="px-3.5 py-3 text-right">Stock Valuation (₹)</th>
                <th className="px-3.5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStockList.slice(0, 8).map(mat => {
                const isKgOrL = mat.unit === 'kg' || mat.unit === 'L';
                const displayQty = isKgOrL ? (mat.currentStockGrams / 1000).toFixed(2) : mat.currentStockGrams;
                const unitCost = mat.averageCostPerGram * (isKgOrL ? 1000 : 1);
                const val = mat.currentStockGrams * mat.averageCostPerGram;
                const isLow = mat.currentStockGrams <= mat.minStockGrams;

                return (
                  <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                      {mat.name}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {mat.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                      {displayQty} {mat.unit}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                      ₹{unitCost.toFixed(2)} / {mat.unit}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-slate-900">
                      ₹{Math.round(val).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isLow 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: PURCHASES & PROCUREMENT INFLOW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Recent Purchase Invoices & Inflow
              </h2>
              <p className="text-xs text-slate-500">
                Logged supplier bills updating stock inventory and weighted average unit costs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setPurchaseFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  purchaseFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setPurchaseFilter('30days')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  purchaseFilter === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPurchaseFilter('7days')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  purchaseFilter === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Last 7 Days
              </button>
            </div>

            <button
              onClick={() => setActiveTab('purchases')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>+ Log Purchase</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentBills.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No purchase bills logged yet.</p>
            <button
              onClick={() => setActiveTab('purchases')}
              className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Add First Purchase Bill
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3.5 py-3">Bill Number</th>
                  <th className="px-3.5 py-3">Date</th>
                  <th className="px-3.5 py-3">Supplier Name</th>
                  <th className="px-3.5 py-3 text-center">Items</th>
                  <th className="px-3.5 py-3 text-right">Invoice Amount (₹)</th>
                  <th className="px-3.5 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold font-mono text-slate-900">
                      {bill.billNumber}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600">
                      {bill.date}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-800">
                      {bill.supplierName}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold font-mono">
                        {bill.items.length} materials
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-amber-800 text-sm">
                      ₹{bill.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {bill.photoAttachment ? (
                        <button
                          onClick={() => setPreviewPhoto(bill.photoAttachment || null)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No attachment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: SNACK RECIPES & FORMULATION COST MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Snack Recipes Formulation Cost Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Formula ingredient costs calculated in real time against live raw stock purchase moving averages.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('recipes')}
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
          >
            <span>+ Create Recipe</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipeStats.map(rec => (
            <div 
              key={rec.id}
              onClick={() => setActiveTab('recipes')}
              className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-sky-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                  {rec.name}
                </h3>
                <span className="px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 text-[10px] font-bold">
                  {rec.batchKg} Kg Batch
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Batch Raw Cost</span>
                  <span className="font-extrabold font-mono text-slate-900 text-sm">
                    ₹{Math.round(rec.rawCostPerBatch).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Cost Per Kg</span>
                  <span className="font-extrabold font-mono text-sky-700 text-sm">
                    ₹{Math.round(rec.rawCostPerKg)} / kg
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                <span>{rec.ingredients.length} Ingredients</span>
                <span className="font-medium text-slate-600">
                  {rec.packagingSizes?.length || 0} Pack Sizes
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bill Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-bold text-slate-900">Purchase Invoice Receipt Attachment</span>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
              <img src={previewPhoto} alt="Bill Attachment" className="max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
