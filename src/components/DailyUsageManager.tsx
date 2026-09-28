import React, { useState, useMemo } from 'react';
import { 
  DailyUsageEntry, 
  RawMaterial, 
  Recipe, 
  DailyMaterialItem, 
  WeightLimitPack, 
  CoverUsageItem 
} from '../types';
import { 
  Calculator, 
  Flame, 
  Droplet, 
  Package, 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Filter, 
  Scale, 
  Layers, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface DailyUsageManagerProps {
  entries: DailyUsageEntry[];
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
  onAddEntry: (entry: Omit<DailyUsageEntry, 'id'>, shouldDeductStock?: boolean) => void;
  onUpdateEntry: (id: string, entry: Omit<DailyUsageEntry, 'id'>) => void;
  onDeleteEntry: (id: string) => void;
  canEdit?: boolean;
}

export default function DailyUsageManager({
  entries,
  rawMaterials,
  recipes,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  canEdit = true
}: DailyUsageManagerProps) {
  // Filters State
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09'); // e.g. '2026-09' or 'all'
  const [selectedWeek, setSelectedWeek] = useState<string>('all'); // 'all' | '1' | '2' | '3' | '4' | '5'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState<string>('all');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<DailyUsageEntry | null>(null);
  const [deductStockOnSave, setDeductStockOnSave] = useState<boolean>(true);
  const [autoCalcMessage, setAutoCalcMessage] = useState<string | null>(null);

  // Available Months in dataset
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    entries.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.slice(0, 7));
      }
    });
    // Ensure current month is present
    monthsSet.add('2026-09');
    monthsSet.add('2026-08');
    return Array.from(monthsSet).sort().reverse();
  }, [entries]);

  // Helper: Determine week number of the month (1-5) based on day of month
  const getWeekOfMonth = (dateStr: string): number => {
    try {
      const day = parseInt(dateStr.split('-')[2], 10);
      if (day <= 7) return 1;
      if (day <= 14) return 2;
      if (day <= 21) return 3;
      if (day <= 28) return 4;
      return 5;
    } catch {
      return 1;
    }
  };

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Month Filter
      if (selectedMonth !== 'all') {
        if (!entry.date.startsWith(selectedMonth)) return false;
      }

      // Week Filter
      if (selectedWeek !== 'all') {
        const weekNum = getWeekOfMonth(entry.date);
        if (weekNum !== parseInt(selectedWeek, 10)) return false;
      }

      // Recipe Filter
      if (selectedRecipeFilter !== 'all') {
        const matchesRecipe = entry.recipeNames.some(name => 
          name.toLowerCase().includes(selectedRecipeFilter.toLowerCase())
        ) || entry.recipeIds.includes(selectedRecipeFilter);
        if (!matchesRecipe) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inDate = entry.date.includes(query);
        const inRecipes = entry.recipeNames.some(r => r.toLowerCase().includes(query));
        const inMaterials = entry.materialsUsed.some(m => m.materialName.toLowerCase().includes(query));
        const inNotes = entry.notes?.toLowerCase().includes(query) || false;
        const inSupervisor = entry.supervisorName?.toLowerCase().includes(query) || false;
        if (!inDate && !inRecipes && !inMaterials && !inNotes && !inSupervisor) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedMonth, selectedWeek, selectedRecipeFilter, searchQuery]);

  // Aggregate Totals for the Current Filter (Month / Week)
  const currentTotals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, e) => {
        acc.materialCost += e.totalMaterialCost || 0;
        acc.labourCost += e.totalLabourCost || 0;
        acc.oilLitres += e.oilUsedLitres || 0;
        acc.oilCost += e.totalOilCost || 0;
        acc.fuelCost += e.totalFuelCost || 0;
        acc.coversCount += e.totalCoversCount || 0;
        acc.coverCost += e.totalCoverCost || 0;
        acc.packetsPacked += e.totalPacketsPacked || 0;
        acc.weightPackedKg += e.totalWeightPackedKg || 0;
        acc.daySpending += e.totalDaySpending || 0;
        return acc;
      },
      {
        materialCost: 0,
        labourCost: 0,
        oilLitres: 0,
        oilCost: 0,
        fuelCost: 0,
        coversCount: 0,
        coverCost: 0,
        packetsPacked: 0,
        weightPackedKg: 0,
        daySpending: 0
      }
    );
  }, [filteredEntries]);

  // Weekly Spendings Matrix (for Week 1, 2, 3, 4, 5 in selected month)
  const weeklySpendingsMatrix = useMemo(() => {
    const monthEntries = entries.filter(e => 
      selectedMonth === 'all' ? true : e.date.startsWith(selectedMonth)
    );

    const weeks = [1, 2, 3, 4, 5].map(weekNum => {
      const wEntries = monthEntries.filter(e => getWeekOfMonth(e.date) === weekNum);
      const mat = wEntries.reduce((s, e) => s + (e.totalMaterialCost || 0), 0);
      const lab = wEntries.reduce((s, e) => s + (e.totalLabourCost || 0), 0);
      const oil = wEntries.reduce((s, e) => s + (e.totalOilCost || 0), 0);
      const fuel = wEntries.reduce((s, e) => s + (e.totalFuelCost || 0), 0);
      const cover = wEntries.reduce((s, e) => s + (e.totalCoverCost || 0), 0);
      const total = wEntries.reduce((s, e) => s + (e.totalDaySpending || 0), 0);
      const packets = wEntries.reduce((s, e) => s + (e.totalPacketsPacked || 0), 0);

      return {
        weekNum,
        label: `Week ${weekNum} (${weekNum === 1 ? '1-7' : weekNum === 2 ? '8-14' : weekNum === 3 ? '15-21' : weekNum === 4 ? '22-28' : '29+'})`,
        entriesCount: wEntries.length,
        mat,
        lab,
        oil,
        fuel,
        cover,
        total,
        packets
      };
    });

    return weeks;
  }, [entries, selectedMonth]);

  // Export to Excel with All Exact Columns
  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      alert('No daily usage entries to export.');
      return;
    }

    const exportRows = filteredEntries.map(e => {
      // Materials summary string
      const materialsDetail = e.materialsUsed.map(m => 
        `${m.materialName}: ${m.quantityUsed}${m.unit} (₹${m.totalCost})`
      ).join(' | ');

      // Covers summary string
      const coversDetail = e.coversUsed.map(c => 
        `${c.coverName}: ${c.coversUsedCount} used [Wastage: ${c.wastageCoversCount}] @ ₹${c.costPerCover} (₹${c.totalCoverCost})`
      ).join(' | ');

      // Weight limits packed string
      const weightLimitsDetail = e.weightLimitsPacked.map(w => 
        `${w.packWeightGrams}g: ${w.packetsCount} pkts (${w.totalWeightKg}kg) [${w.recipeName || 'Recipe'}]`
      ).join(' | ');

      return {
        'Date': e.date,
        'Shift': e.shift || 'Full Day',
        'Recipes Produced': e.recipeNames.join(', '),
        'Material Cost (₹)': e.totalMaterialCost,
        'Materials Used Breakdown': materialsDetail,
        'Labour Cost (₹)': e.totalLabourCost,
        'Workers Count': e.workersCount,
        'Chef Count': e.chefCount || 0,
        'Chef Wage (₹)': e.chefWage || 0,
        'Helper Count': e.helperCount || 0,
        'Helper Wage (₹)': e.helperWage || 0,
        'Sales Man Count': e.salesManCount || 0,
        'Sales Man Wage (₹)': e.salesManWage || 0,
        'Packing Person Count': e.packingPersonCount || 0,
        'Packing Person Wage (₹)': e.packingPersonWage || 0,
        'Overtime (₹)': e.overtimeCost || 0,
        'Daily Wage Rate (₹)': e.dailyWagePerWorker,
        'Cooking Oil Used (Litres)': e.oilUsedLitres,
        'Oil Rate (₹/L)': e.oilCostPerLitre,
        'Oil Spending (₹)': e.totalOilCost,
        'Fuel Type': e.fuelType,
        'Firewood (kg) / Gas (cylinders)': e.fuelType === 'Firewood' ? `${e.firewoodUsedKg || 0} kg` : `${e.gasCylindersUsed || 0} cyl`,
        'Firewood / Fuel Cost (₹)': e.totalFuelCost,
        'Covers Used for Packets (Count)': e.totalCoversCount,
        'Cover Wastage (Count)': e.totalCoverWastageCount,
        'Cover Spending (₹)': e.totalCoverCost,
        'Covers Used Breakdown': coversDetail,
        'Packets Packed on Weight Limits': weightLimitsDetail,
        'Total Packets Count': e.totalPacketsPacked,
        'Total Packed Weight (Kg)': e.totalWeightPackedKg,
        'Total Day Spending (₹)': e.totalDaySpending,
        'Cooked Output (Kg)': e.totalCookedKg || '-',
        'Cost Per Cooked Kg (₹)': e.costPerCookedKg ? Number(e.costPerCookedKg.toFixed(2)) : '-',
        'Supervisor': e.supervisorName || '-',
        'Notes': e.notes || '-'
      };
    });

    const monthLabel = selectedMonth === 'all' ? 'All_Months' : selectedMonth;
    const weekLabel = selectedWeek === 'all' ? 'All_Weeks' : `Week_${selectedWeek}`;
    exportToExcel(
      exportRows, 
      `Daily_Material_Labour_Usage_Ledger_${monthLabel}_${weekLabel}`, 
      'Daily Usage & Costs'
    );
  };

  // FORM MODAL STATE
  const [formData, setFormData] = useState<{
    date: string;
    shift: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day';
    selectedRecipes: string[];
    materialsUsed: DailyMaterialItem[];
    // Separate Labour Roles
    chefCount: number;
    chefWage: number;
    helperCount: number;
    helperWage: number;
    salesManCount: number;
    salesManWage: number;
    packingPersonCount: number;
    packingPersonWage: number;
    workersCount: number;
    masterWorkersCount: number;
    helperWorkersCount: number;
    dailyWagePerWorker: number;
    overtimeHours: number;
    overtimeCost: number;
    oilUsedLitres: number;
    oilCostPerLitre: number;
    fuelType: 'Firewood' | 'Commercial Gas LPG' | 'Briquet / Biomass' | 'Electric' | 'Mixed';
    firewoodUsedKg: number;
    firewoodCostPerKg: number;
    gasCylindersUsed: number;
    gasCostPerCylinder: number;
    coversUsed: CoverUsageItem[];
    weightLimitsPacked: WeightLimitPack[];
    overheadCost: number;
    totalCookedKg: number;
    supervisorName: string;
    notes: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    shift: 'Full Day',
    selectedRecipes: [],
    materialsUsed: [],
    chefCount: 1,
    chefWage: 850,
    helperCount: 1,
    helperWage: 550,
    salesManCount: 1,
    salesManWage: 600,
    packingPersonCount: 1,
    packingPersonWage: 600,
    workersCount: 4,
    masterWorkersCount: 1,
    helperWorkersCount: 1,
    dailyWagePerWorker: 650,
    overtimeHours: 0,
    overtimeCost: 0,
    oilUsedLitres: 25,
    oilCostPerLitre: 135,
    fuelType: 'Firewood',
    firewoodUsedKg: 130,
    firewoodCostPerKg: 8.5,
    gasCylindersUsed: 1,
    gasCostPerCylinder: 1850,
    coversUsed: [
      { coverName: '50g Printed Pouch / பாக்கெட்', weightLimitGrams: 50, coversUsedCount: 300, goodPacketsCount: 290, wastageCoversCount: 10, costPerCover: 1.40, totalCoverCost: 420 },
      { coverName: '100g Printed Pouch / பாக்கெட்', weightLimitGrams: 100, coversUsedCount: 250, goodPacketsCount: 240, wastageCoversCount: 10, costPerCover: 2.00, totalCoverCost: 500 }
    ],
    weightLimitsPacked: [
      { packWeightGrams: 50, packUnit: 'g', packetsCount: 290, totalWeightKg: 14.5, recipeName: '', pouchType: '50g Printed Pouch', pouchCostPerUnit: 1.40, totalPouchCost: 406 },
      { packWeightGrams: 100, packUnit: 'g', packetsCount: 240, totalWeightKg: 24.0, recipeName: '', pouchType: '100g Printed Pouch', pouchCostPerUnit: 2.00, totalPouchCost: 480 }
    ],
    overheadCost: 300,
    totalCookedKg: 75,
    supervisorName: 'Murugan (Master)',
    notes: ''
  });

  const openAddModal = () => {
    setEditingId(null);
    // Populate default materials from top items in rawMaterials
    const defaultMats: DailyMaterialItem[] = rawMaterials.slice(0, 4).map(m => {
      const isKg = m.unit === 'kg' || m.unit === 'g';
      const qty = isKg ? 25 : 10;
      const rate = m.unit === 'kg' || m.unit === 'L' ? m.averageCostPerGram * 1000 : (m.averageCostPerGram * 1000 || 80);
      return {
        materialId: m.id,
        materialName: m.name,
        category: m.category,
        quantityUsed: qty,
        unit: 'kg',
        costPerUnit: Math.round(rate) || 80,
        totalCost: Math.round(qty * (rate || 80))
      };
    });

    setFormData({
      date: new Date().toISOString().slice(0, 10),
      shift: 'Full Day',
      selectedRecipes: recipes.length > 0 ? [recipes[0].id] : [],
      materialsUsed: defaultMats.length > 0 ? defaultMats : [
        { materialId: 'mat_besan', materialName: 'Gram Flour (Besan) / கடலை மாவு', category: 'Flour', quantityUsed: 35, unit: 'kg', costPerUnit: 80, totalCost: 2800 },
        { materialId: 'mat_rice_flour', materialName: 'Rice Flour / அரிசி மாவு', category: 'Flour', quantityUsed: 20, unit: 'kg', costPerUnit: 50, totalCost: 1000 }
      ],
      chefCount: 1,
      chefWage: 850,
      helperCount: 1,
      helperWage: 550,
      salesManCount: 1,
      salesManWage: 600,
      packingPersonCount: 1,
      packingPersonWage: 600,
      workersCount: 4,
      masterWorkersCount: 1,
      helperWorkersCount: 1,
      dailyWagePerWorker: 650,
      overtimeHours: 0,
      overtimeCost: 0,
      oilUsedLitres: 28,
      oilCostPerLitre: 135,
      fuelType: 'Firewood',
      firewoodUsedKg: 140,
      firewoodCostPerKg: 8.5,
      gasCylindersUsed: 1,
      gasCostPerCylinder: 1850,
      coversUsed: [
        { coverName: '50g Printed Pouch / பாக்கெட்', weightLimitGrams: 50, coversUsedCount: 320, goodPacketsCount: 300, wastageCoversCount: 20, costPerCover: 1.40, totalCoverCost: 448 },
        { coverName: '100g Printed Pouch / பாக்கெட்', weightLimitGrams: 100, coversUsedCount: 260, goodPacketsCount: 250, wastageCoversCount: 10, costPerCover: 2.00, totalCoverCost: 520 },
        { coverName: '250g Zip Lock Cover / பாக்கெட்', weightLimitGrams: 250, coversUsedCount: 110, goodPacketsCount: 105, wastageCoversCount: 5, costPerCover: 3.20, totalCoverCost: 352 }
      ],
      weightLimitsPacked: [
        { packWeightGrams: 50, packUnit: 'g', packetsCount: 300, totalWeightKg: 15.0, recipeName: recipes[0]?.name || 'Special Mixture', pouchType: '50g Printed Pouch', pouchCostPerUnit: 1.40, totalPouchCost: 420 },
        { packWeightGrams: 100, packUnit: 'g', packetsCount: 250, totalWeightKg: 25.0, recipeName: recipes[0]?.name || 'Special Mixture', pouchType: '100g Printed Pouch', pouchCostPerUnit: 2.00, totalPouchCost: 500 },
        { packWeightGrams: 250, packUnit: 'g', packetsCount: 105, totalWeightKg: 26.25, recipeName: recipes[1]?.name || 'Kara Sev', pouchType: '250g Zip Lock Cover', pouchCostPerUnit: 3.20, totalPouchCost: 336 }
      ],
      overheadCost: 300,
      totalCookedKg: 75,
      supervisorName: 'Murugan (Master)',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (entry: DailyUsageEntry) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date,
      shift: entry.shift || 'Full Day',
      selectedRecipes: entry.recipeIds,
      materialsUsed: [...entry.materialsUsed],
      chefCount: entry.chefCount !== undefined ? entry.chefCount : (entry.masterWorkersCount || 1),
      chefWage: entry.chefWage !== undefined ? entry.chefWage : 850,
      helperCount: entry.helperCount !== undefined ? entry.helperCount : (entry.helperWorkersCount !== undefined ? entry.helperWorkersCount : Math.max(0, entry.workersCount - 1)),
      helperWage: entry.helperWage !== undefined ? entry.helperWage : 550,
      salesManCount: entry.salesManCount !== undefined ? entry.salesManCount : 1,
      salesManWage: entry.salesManWage !== undefined ? entry.salesManWage : 600,
      packingPersonCount: entry.packingPersonCount !== undefined ? entry.packingPersonCount : 1,
      packingPersonWage: entry.packingPersonWage !== undefined ? entry.packingPersonWage : 600,
      workersCount: entry.workersCount,
      masterWorkersCount: entry.masterWorkersCount || 1,
      helperWorkersCount: entry.helperWorkersCount || Math.max(0, entry.workersCount - 1),
      dailyWagePerWorker: entry.dailyWagePerWorker,
      overtimeHours: entry.overtimeHours || 0,
      overtimeCost: entry.overtimeCost || 0,
      oilUsedLitres: entry.oilUsedLitres,
      oilCostPerLitre: entry.oilCostPerLitre,
      fuelType: entry.fuelType,
      firewoodUsedKg: entry.firewoodUsedKg || 120,
      firewoodCostPerKg: entry.firewoodCostPerKg || 8.5,
      gasCylindersUsed: entry.gasCylindersUsed || 1,
      gasCostPerCylinder: entry.gasCostPerCylinder || 1850,
      coversUsed: [...entry.coversUsed],
      weightLimitsPacked: [...entry.weightLimitsPacked],
      overheadCost: entry.overheadCost || 0,
      totalCookedKg: entry.totalCookedKg || 0,
      supervisorName: entry.supervisorName || '',
      notes: entry.notes || ''
    });
    setIsModalOpen(true);
  };

  // Calculated Live Values for Form Modal with Separate Labour Roles
  const modalMaterialCost = formData.materialsUsed.reduce((s, m) => s + (m.totalCost || 0), 0);
  const modalChefCost = (formData.chefCount || 0) * (formData.chefWage || 0);
  const modalHelperCost = (formData.helperCount || 0) * (formData.helperWage || 0);
  const modalSalesManCost = (formData.salesManCount || 0) * (formData.salesManWage || 0);
  const modalPackingPersonCost = (formData.packingPersonCount || 0) * (formData.packingPersonWage || 0);
  const modalLabourSubtotal = modalChefCost + modalHelperCost + modalSalesManCost + modalPackingPersonCost;
  const modalTotalWorkers = (formData.chefCount || 0) + (formData.helperCount || 0) + (formData.salesManCount || 0) + (formData.packingPersonCount || 0);
  const modalLabourCost = modalLabourSubtotal + (formData.overtimeCost || 0);
  const modalOilCost = formData.oilUsedLitres * formData.oilCostPerLitre;
  const modalFuelCost = formData.fuelType === 'Firewood' 
    ? (formData.firewoodUsedKg * formData.firewoodCostPerKg) 
    : (formData.gasCylindersUsed * formData.gasCostPerCylinder);
  const modalCoverCost = formData.coversUsed.reduce((s, c) => s + (c.totalCoverCost || 0), 0);
  const modalTotalPackets = formData.weightLimitsPacked.reduce((s, w) => s + (w.packetsCount || 0), 0);
  const modalTotalPackedKg = formData.weightLimitsPacked.reduce((s, w) => s + (w.totalWeightKg || 0), 0);
  const modalDayGrandTotal = modalMaterialCost + modalLabourCost + modalOilCost + modalFuelCost + modalCoverCost + (formData.overheadCost || 0);

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    // Map recipe names
    const recipeNamesList = formData.selectedRecipes.map(rId => {
      const r = recipes.find(rec => rec.id === rId);
      return r ? r.name : rId;
    });

    const totalCoversCount = formData.coversUsed.reduce((s, c) => s + (c.coversUsedCount || 0), 0);
    const totalCoverWastage = formData.coversUsed.reduce((s, c) => s + (c.wastageCoversCount || 0), 0);

    const calculatedTotalStaff = modalTotalWorkers > 0 ? modalTotalWorkers : formData.workersCount;
    const calculatedAvgDailyWage = calculatedTotalStaff > 0 ? Math.round(modalLabourSubtotal / calculatedTotalStaff) : formData.dailyWagePerWorker;

    const entryPayload: Omit<DailyUsageEntry, 'id'> = {
      date: formData.date,
      shift: formData.shift,
      recipeIds: formData.selectedRecipes,
      recipeNames: recipeNamesList.length > 0 ? recipeNamesList : ['Standard Production'],
      materialsUsed: formData.materialsUsed,
      totalMaterialCost: modalMaterialCost,
      workersCount: calculatedTotalStaff,
      chefCount: formData.chefCount,
      chefWage: formData.chefWage,
      helperCount: formData.helperCount,
      helperWage: formData.helperWage,
      salesManCount: formData.salesManCount,
      salesManWage: formData.salesManWage,
      packingPersonCount: formData.packingPersonCount,
      packingPersonWage: formData.packingPersonWage,
      masterWorkersCount: formData.chefCount,
      helperWorkersCount: formData.helperCount,
      dailyWagePerWorker: calculatedAvgDailyWage,
      overtimeHours: formData.overtimeHours,
      overtimeCost: formData.overtimeCost,
      totalLabourCost: modalLabourCost,
      oilUsedLitres: formData.oilUsedLitres,
      oilCostPerLitre: formData.oilCostPerLitre,
      totalOilCost: modalOilCost,
      fuelType: formData.fuelType,
      firewoodUsedKg: formData.fuelType === 'Firewood' ? formData.firewoodUsedKg : undefined,
      firewoodCostPerKg: formData.fuelType === 'Firewood' ? formData.firewoodCostPerKg : undefined,
      gasCylindersUsed: formData.fuelType === 'Commercial Gas LPG' ? formData.gasCylindersUsed : undefined,
      gasCostPerCylinder: formData.fuelType === 'Commercial Gas LPG' ? formData.gasCostPerCylinder : undefined,
      totalFuelCost: modalFuelCost,
      coversUsed: formData.coversUsed,
      totalCoversCount,
      totalCoverWastageCount: totalCoverWastage,
      totalCoverCost: modalCoverCost,
      weightLimitsPacked: formData.weightLimitsPacked,
      totalPacketsPacked: modalTotalPackets,
      totalWeightPackedKg: modalTotalPackedKg,
      overheadCost: formData.overheadCost,
      totalDaySpending: modalDayGrandTotal,
      totalCookedKg: formData.totalCookedKg,
      costPerCookedKg: formData.totalCookedKg > 0 ? modalDayGrandTotal / formData.totalCookedKg : 0,
      supervisorName: formData.supervisorName,
      notes: formData.notes
    };

    if (editingId) {
      onUpdateEntry(editingId, entryPayload);
    } else {
      onAddEntry(entryPayload, deductStockOnSave);
    }

    setIsModalOpen(false);
  };

  // Auto-calculate Raw Materials from Cooked Recipes
  const autoCalculateMaterialsFromRecipes = () => {
    if (formData.selectedRecipes.length === 0) {
      alert("Please select at least one recipe cooked above first.");
      return;
    }

    const selectedRecipeObjects = recipes.filter(r => formData.selectedRecipes.includes(r.id));
    if (selectedRecipeObjects.length === 0) {
      alert("Selected recipes not found in catalog.");
      return;
    }

    // Determine target cooked output kg
    const totalTargetKg = formData.totalCookedKg > 0 ? formData.totalCookedKg : 25;
    const kgPerRecipe = totalTargetKg / selectedRecipeObjects.length;

    // Map: materialId -> { qtyKg, materialName, category, costPerUnit }
    const materialMap = new Map<string, { qtyKg: number; materialName: string; category: string; costPerUnit: number }>();
    let estimatedOilLitres = 0;

    selectedRecipeObjects.forEach(rec => {
      const baseBatchKg = (rec.baseBatchSizeGrams || 10000) / 1000;
      const ratio = kgPerRecipe / (baseBatchKg > 0 ? baseBatchKg : 10);

      // Estimate ~0.28 litres frying oil consumed per kg of fried snack
      estimatedOilLitres += kgPerRecipe * 0.28;

      if (rec.ingredients && rec.ingredients.length > 0) {
        rec.ingredients.forEach(ing => {
          const mat = rawMaterials.find(rm => rm.id === ing.materialId || rm.name.toLowerCase() === ing.materialId.toLowerCase());
          const requiredGrams = ing.weightGrams * ratio;
          const requiredKg = Number((requiredGrams / 1000).toFixed(2));
          const ratePerKg = mat ? Math.round(mat.averageCostPerGram * 1000) || 80 : 80;

          const existing = materialMap.get(ing.materialId);
          if (existing) {
            existing.qtyKg = Number((existing.qtyKg + requiredKg).toFixed(2));
          } else {
            materialMap.set(ing.materialId, {
              qtyKg: requiredKg,
              materialName: mat ? mat.name : 'Raw Material',
              category: mat ? mat.category : 'Flour',
              costPerUnit: ratePerKg
            });
          }
        });
      }
    });

    const calculatedMaterials: DailyMaterialItem[] = [];
    materialMap.forEach((val, matId) => {
      calculatedMaterials.push({
        materialId: matId,
        materialName: val.materialName,
        category: val.category,
        quantityUsed: val.qtyKg > 0 ? val.qtyKg : 1,
        unit: 'kg',
        costPerUnit: val.costPerUnit,
        totalCost: Math.round(val.qtyKg * val.costPerUnit)
      });
    });

    if (calculatedMaterials.length > 0) {
      setFormData(prev => ({
        ...prev,
        materialsUsed: calculatedMaterials,
        totalCookedKg: totalTargetKg,
        oilUsedLitres: prev.oilUsedLitres > 0 ? prev.oilUsedLitres : Math.round(estimatedOilLitres)
      }));
      setAutoCalcMessage(`Calculated ${calculatedMaterials.length} raw materials for ${totalTargetKg}kg output across ${selectedRecipeObjects.length} recipe(s)! The material list has been auto-populated and is ready to deduct from stock.`);
      setTimeout(() => setAutoCalcMessage(null), 6000);
    } else {
      alert("No ingredient formulations found inside the selected recipes. You can define ingredients in the Recipe Book tab, or enter raw materials manually.");
    }
  };

  // Add Row Helpers inside Form Modal
  const addMaterialRow = () => {
    const defaultMat = rawMaterials[0];
    setFormData(prev => ({
      ...prev,
      materialsUsed: [
        ...prev.materialsUsed,
        {
          materialId: defaultMat?.id || `mat_custom_${Date.now()}`,
          materialName: defaultMat?.name || 'Raw Material',
          category: defaultMat?.category || 'Flour',
          quantityUsed: 10,
          unit: 'kg',
          costPerUnit: 80,
          totalCost: 800
        }
      ]
    }));
  };

  const addCoverRow = () => {
    setFormData(prev => ({
      ...prev,
      coversUsed: [
        ...prev.coversUsed,
        {
          coverName: '100g Printed Pouch',
          weightLimitGrams: 100,
          coversUsedCount: 200,
          goodPacketsCount: 195,
          wastageCoversCount: 5,
          costPerCover: 2.00,
          totalCoverCost: 400
        }
      ]
    }));
  };

  const addWeightLimitRow = () => {
    setFormData(prev => ({
      ...prev,
      weightLimitsPacked: [
        ...prev.weightLimitsPacked,
        {
          packWeightGrams: 100,
          packUnit: 'g',
          packetsCount: 200,
          totalWeightKg: 20.0,
          recipeName: recipes[0]?.name || 'Snack Recipe',
          pouchType: '100g Pouch',
          pouchCostPerUnit: 2.00,
          totalPouchCost: 400
        }
      ]
    }));
  };

  return (
    <div className="space-y-6" id="daily-usage-manager-module">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/40 text-indigo-300">
              <Calculator className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Per-Day Material, Labour, Oil & Firewood Spendings Ledger</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Separate column tracking daily raw material, worker wages, cooking oil litres, firewood/gas fuel, covers used for packets & weight limits packing
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Daily Usage & Costs</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Export filtered daily ledger with all separate columns to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR: MONTH DATA & WEEK SPENDINGS FILTER */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          
          {/* Month Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Month Filter:</span>
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">📅 All Recorded Months</option>
              {availableMonths.map(m => {
                const dateObj = new Date(`${m}-01T00:00:00`);
                const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
          </div>

          {/* Week Selector ("WEED SPENDINGS" / WEEK SPENDINGS) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap mr-1">
              Week Filter:
            </span>
            {[
              { id: 'all', label: 'All Weeks' },
              { id: '1', label: 'Week 1 (1-7)' },
              { id: '2', label: 'Week 2 (8-14)' },
              { id: '3', label: 'Week 3 (15-21)' },
              { id: '4', label: 'Week 4 (22-28)' },
              { id: '5', label: 'Week 5 (29+)' }
            ].map(w => {
              const isSelected = selectedWeek === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeek(w.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search date, recipe, raw material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* WEEKLY SPENDING SUMMARY MATRIX BAR */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Weekly Spendings Breakdown for {selectedMonth === 'all' ? 'All Months' : selectedMonth}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Click any week button above to drill down</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {weeklySpendingsMatrix.map(w => {
              const isSelected = selectedWeek === String(w.weekNum);
              return (
                <div 
                  key={w.weekNum}
                  onClick={() => setSelectedWeek(selectedWeek === String(w.weekNum) ? 'all' : String(w.weekNum))}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 shadow-2xs' 
                      : 'bg-white hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                    <span>{w.label}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">{w.entriesCount} days</span>
                  </div>
                  <p className="text-sm font-black font-mono text-slate-900 mt-1">
                    ₹{w.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 space-y-0.5 border-t border-slate-100 pt-1">
                    <div className="flex justify-between">
                      <span>Materials:</span>
                      <span className="font-bold text-slate-700">₹{w.mat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labour:</span>
                      <span className="font-bold text-slate-700">₹{w.lab.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Oil + Fuel:</span>
                      <span className="font-bold text-amber-700">₹{(w.oil + w.fuel).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Covers:</span>
                      <span className="font-bold text-indigo-700">₹{w.cover.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI CARDS FOR FILTERED SPENDINGS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Day Spending */}
        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">Total Spendings</span>
          <p className="text-xl font-black font-mono text-indigo-950 mt-0.5">
            ₹{currentTotals.daySpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-indigo-700 font-semibold">{filteredEntries.length} production days</span>
        </div>

        {/* Card 2: Material Cost */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Raw Materials Used</span>
          <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
            ₹{currentTotals.materialCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Flour, Spices, Dals, Salt</span>
        </div>

        {/* Card 3: Labour Wages */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-500" /> Labour Cost
          </span>
          <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
            ₹{currentTotals.labourCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Daily worker wages</span>
        </div>

        {/* Card 4: Oil Used */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block flex items-center gap-1">
            <Droplet className="w-3 h-3 text-amber-500" /> Oil Used
          </span>
          <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
            {currentTotals.oilLitres.toFixed(1)} <span className="text-xs font-normal">Litres</span>
          </p>
          <span className="text-[10px] text-amber-800 font-bold">₹{currentTotals.oilCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>

        {/* Card 5: Firewood / Gas ("Fire Work") */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> Firewood / Fuel
          </span>
          <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
            ₹{currentTotals.fuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-orange-800 font-medium">Furnace firewood & gas</span>
        </div>

        {/* Card 6: Packaging Covers & Weight Limits */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block flex items-center gap-1">
            <Package className="w-3 h-3 text-emerald-600" /> Covers Used
          </span>
          <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
            {currentTotals.coversCount.toLocaleString()} <span className="text-xs font-normal">covers</span>
          </p>
          <span className="text-[10px] text-emerald-800 font-bold">₹{currentTotals.coverCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({currentTotals.packetsPacked} pkts)</span>
        </div>
      </div>

      {/* 4. MAIN LEDGER TABLE WITH ALL DEDICATED REQUESTED COLUMNS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="daily-ledger-table-container">
        
        {/* Table Top Title */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>📋 Daily Material & Cost Register ({filteredEntries.length} Records)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Columns for Material Used, Labour, Cooking Oil, Firewood, Packaging Covers & Weight Limits Packed
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Sorted by Date (Latest First)</span>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <th className="px-3.5 py-3 whitespace-nowrap">Date & Shift</th>
                <th className="px-3.5 py-3 min-w-[130px]">Recipe(s) Cooked</th>
                <th className="px-3.5 py-3 min-w-[200px] bg-slate-50">
                  <div className="flex items-center gap-1 text-slate-900">
                    <Scale className="w-3 h-3 text-slate-600" />
                    <span>Per-Day Used Material</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[120px]">
                  <div className="flex items-center gap-1 text-blue-900">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>Labour Cost</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[120px] bg-amber-50/40">
                  <div className="flex items-center gap-1 text-amber-900">
                    <Droplet className="w-3 h-3 text-amber-600" />
                    <span>Oil Used</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[120px]">
                  <div className="flex items-center gap-1 text-orange-900">
                    <Flame className="w-3 h-3 text-orange-600" />
                    <span>Fire Work / Fuel</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[170px] bg-emerald-50/40">
                  <div className="flex items-center gap-1 text-emerald-950">
                    <Package className="w-3 h-3 text-emerald-600" />
                    <span>Cover Used for Packets</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[210px] bg-indigo-50/40">
                  <div className="flex items-center gap-1 text-indigo-950">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Packed Weight Limits</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 text-right bg-slate-900 text-white min-w-[110px]">
                  Total Day Spending
                </th>
                <th className="px-3.5 py-3 text-center min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Calculator className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold">No daily usage entries found for this filter.</p>
                      <button
                        onClick={openAddModal}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        + Log First Daily Usage Run
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const dateObj = new Date(e.date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const weekNum = getWeekOfMonth(e.date);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Date & Shift */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-mono font-black text-slate-900">{e.date}</div>
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <span>{dayName}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">W{weekNum}</span>
                          <span>•</span>
                          <span className="text-slate-400">{e.shift || 'Full Day'}</span>
                        </div>
                      </td>

                      {/* 2. Recipe Cooked */}
                      <td className="px-3.5 py-3">
                        <div className="space-y-1">
                          {e.recipeNames.map((name, i) => (
                            <span 
                              key={i} 
                              className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold text-[10px] border border-indigo-200/60 mr-1 mb-0.5"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                        {e.totalCookedKg && e.totalCookedKg > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            Yield: <strong className="text-slate-800">{e.totalCookedKg} kg</strong>
                          </div>
                        )}
                      </td>

                      {/* 3. SEPARATE COLUMN: Per-Day Used Material & Cost */}
                      <td className="px-3.5 py-3 bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold text-slate-900 text-xs border-b border-slate-200/60 pb-1">
                            <span>₹{e.totalMaterialCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className="text-[10px] font-normal text-slate-500">{e.materialsUsed.length} items</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto pr-1">
                            {e.materialsUsed.slice(0, 3).map((m, idx) => (
                              <div key={idx} className="flex justify-between text-[10px] text-slate-600">
                                <span className="truncate max-w-[130px]" title={m.materialName}>{m.materialName}</span>
                                <span className="font-mono font-semibold shrink-0">{m.quantityUsed}{m.unit}</span>
                              </div>
                            ))}
                            {e.materialsUsed.length > 3 && (
                              <button
                                onClick={() => setViewingEntry(e)}
                                className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                +{e.materialsUsed.length - 3} more raw materials...
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. SEPARATE COLUMN: Labour Cost */}
                      <td className="px-3.5 py-3">
                        <div className="font-mono font-bold text-blue-950 text-xs">
                          ₹{e.totalLabourCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-1 space-y-1">
                          <p className="font-semibold text-slate-700">{e.workersCount} Staff Total</p>
                          <div className="flex flex-wrap gap-1">
                            {(e.chefCount !== undefined ? e.chefCount : (e.masterWorkersCount || 0)) > 0 && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold border border-indigo-200/60" 
                                title={`Chef / Master: ${e.chefCount || e.masterWorkersCount} @ ₹${e.chefWage || 850}`}
                              >
                                👨‍🍳 Chef: {e.chefCount || e.masterWorkersCount}
                              </span>
                            )}
                            {(e.helperCount !== undefined ? e.helperCount : (e.helperWorkersCount || 0)) > 0 && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold border border-emerald-200/60" 
                                title={`Helper: ${e.helperCount || e.helperWorkersCount} @ ₹${e.helperWage || 550}`}
                              >
                                🧑‍🍳 Helper: {e.helperCount || e.helperWorkersCount}
                              </span>
                            )}
                            {(e.salesManCount || 0) > 0 && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[9px] font-bold border border-amber-200/60" 
                                title={`Sales Man: ${e.salesManCount} @ ₹${e.salesManWage || 600}`}
                              >
                                💼 Sales: {e.salesManCount}
                              </span>
                            )}
                            {(e.packingPersonCount || 0) > 0 && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold border border-purple-200/60" 
                                title={`Packing Person: ${e.packingPersonCount} @ ₹${e.packingPersonWage || 600}`}
                              >
                                📦 Packing: {e.packingPersonCount}
                              </span>
                            )}
                          </div>
                          {e.overtimeCost ? (
                            <p className="text-blue-700 font-semibold font-mono text-[9px]">
                              +{e.overtimeHours || 0}h OT (₹{e.overtimeCost})
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* 5. SEPARATE COLUMN: Oil Used */}
                      <td className="px-3.5 py-3 bg-amber-50/30">
                        <div className="font-mono font-bold text-amber-950 text-xs">
                          {e.oilUsedLitres.toFixed(1)} <span className="text-[10px] font-normal">Litres</span>
                        </div>
                        <div className="text-[10px] text-amber-800 font-bold font-mono mt-0.5">
                          ₹{e.totalOilCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          @ ₹{e.oilCostPerLitre}/L
                        </div>
                      </td>

                      {/* 6. SEPARATE COLUMN: Fire Work / Fuel Used */}
                      <td className="px-3.5 py-3">
                        <div className="font-mono font-bold text-orange-950 text-xs">
                          ₹{e.totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                          <span className="font-semibold text-slate-800">{e.fuelType}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {e.fuelType === 'Firewood' 
                            ? `${e.firewoodUsedKg || 0} kg @ ₹${e.firewoodCostPerKg}/kg` 
                            : `${e.gasCylindersUsed || 0} cyl @ ₹${e.gasCostPerCylinder}`}
                        </div>
                      </td>

                      {/* 7. SEPARATE COLUMN: Cover Used to Pack Packets ("COVER USED TO PACKETCKETS") */}
                      <td className="px-3.5 py-3 bg-emerald-50/30">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold text-emerald-950 text-xs border-b border-emerald-100 pb-0.5">
                            <span>₹{e.totalCoverCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className="text-[10px] text-emerald-800">{e.totalCoversCount} covers</span>
                          </div>
                          <div className="space-y-0.5">
                            {e.coversUsed.slice(0, 2).map((c, cIdx) => (
                              <div key={cIdx} className="text-[10px] text-slate-600 flex justify-between gap-1">
                                <span className="truncate max-w-[110px]" title={c.coverName}>{c.coverName}</span>
                                <span className="font-mono text-emerald-900 font-bold shrink-0">{c.coversUsedCount} pcs</span>
                              </div>
                            ))}
                            {e.coversUsed.length > 2 && (
                              <button
                                onClick={() => setViewingEntry(e)}
                                className="text-[9px] font-bold text-emerald-700 hover:underline cursor-pointer"
                              >
                                +{e.coversUsed.length - 2} more cover sizes...
                              </button>
                            )}
                          </div>
                          {e.totalCoverWastageCount > 0 && (
                            <span className="text-[9px] text-rose-600 font-mono font-semibold block">
                              Wastage: {e.totalCoverWastageCount} covers
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. SEPARATE COLUMN: Recipes Packed on Different Weight Limits */}
                      <td className="px-3.5 py-3 bg-indigo-50/30">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold text-indigo-950 text-xs border-b border-indigo-100 pb-0.5">
                            <span>{e.totalPacketsPacked} Packets</span>
                            <span className="text-[10px] text-indigo-700 font-semibold">{e.totalWeightPackedKg.toFixed(1)} kg</span>
                          </div>
                          
                          {/* Weight Limits Chips */}
                          <div className="flex flex-wrap gap-1">
                            {e.weightLimitsPacked.map((w, wIdx) => (
                              <span 
                                key={wIdx} 
                                className="px-1.5 py-0.5 bg-white border border-indigo-200 text-indigo-900 rounded text-[9px] font-bold font-mono shadow-2xs"
                                title={`${w.recipeName || 'Recipe'} • ${w.packetsCount} packs of ${w.packWeightGrams}g (${w.totalWeightKg}kg)`}
                              >
                                {w.packWeightGrams}g: <strong>{w.packetsCount}p</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* 9. Grand Total Spending */}
                      <td className="px-3.5 py-3 text-right bg-slate-900/95 text-white font-mono font-black text-sm whitespace-nowrap">
                        <div>₹{e.totalDaySpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        {e.costPerCookedKg ? (
                          <div className="text-[9px] text-slate-300 font-normal">
                            ₹{e.costPerCookedKg.toFixed(1)} / kg
                          </div>
                        ) : null}
                      </td>

                      {/* 10. Actions */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setViewingEntry(e)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                            title="View Daily Cost Voucher & Weight Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => openEditModal(e)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                                title="Edit this day's usage entry"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Delete daily usage entry for ${e.date}?`)) {
                                    onDeleteEntry(e.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Totals */}
        {filteredEntries.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs font-mono font-bold text-slate-800 gap-3">
            <div>
              <span>Filtered Records: {filteredEntries.length} Days</span>
              <span className="text-slate-300 mx-2">|</span>
              <span>Total Packets Packed: {currentTotals.packetsPacked.toLocaleString()} pkts ({currentTotals.weightPackedKg.toFixed(1)} kg)</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-600">All-Inclusive Total:</span>
              <span className="text-base text-indigo-950 font-black">
                ₹{currentTotals.daySpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT DAILY USAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 my-8 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingId ? 'Edit Daily Usage & Cost Record' : 'Log Daily Material, Labour & Fuel Usage'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* Row 1: Date, Shift, Supervisor & Cooked Output */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Production Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Production Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Afternoon">Afternoon Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="Full Day">Full Day (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Supervisor / Master</label>
                  <input
                    type="text"
                    placeholder="e.g. Murugan Master"
                    value={formData.supervisorName}
                    onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Cooked Output (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 75 kg"
                    value={formData.totalCookedKg}
                    onChange={(e) => setFormData({ ...formData, totalCookedKg: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Select Recipes Produced & Auto-Calculate Raw Materials */}
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Select Recipe(s) Cooked / Produced on this Day</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Choose recipes cooked to auto-calculate raw materials used and decrease inventory stock
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={autoCalculateMaterialsFromRecipes}
                    disabled={formData.selectedRecipes.length === 0}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    title="Auto-calculate required raw materials and quantities based on selected recipe formulas"
                  >
                    <Calculator className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Auto-Calculate Raw Materials ({formData.totalCookedKg || 25}kg)</span>
                  </button>
                </div>

                {autoCalcMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{autoCalcMessage}</span>
                    </div>
                    <button type="button" onClick={() => setAutoCalcMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">×</button>
                  </div>
                )}

                {/* Dropdown Selector for Cooked Recipes */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <select
                      value=""
                      onChange={(e) => {
                        const recId = e.target.value;
                        if (recId && !formData.selectedRecipes.includes(recId)) {
                          setFormData(prev => ({
                            ...prev,
                            selectedRecipes: [...prev.selectedRecipes, recId]
                          }));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">▼ Dropdown List of Our Cooked Recipes (Click to Add)...</option>
                      {recipes.map(r => (
                        <option key={r.id} value={r.id} disabled={formData.selectedRecipes.includes(r.id)}>
                          {r.name} {formData.selectedRecipes.includes(r.id) ? '✓ (Already Added)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.selectedRecipes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, selectedRecipes: [] }))}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-bold px-2 py-1 bg-white border border-slate-200 rounded-md cursor-pointer shrink-0"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Selected Recipe Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {recipes.map(r => {
                    const isSelected = formData.selectedRecipes.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          if (isSelected) {
                            setFormData(prev => ({
                              ...prev,
                              selectedRecipes: prev.selectedRecipes.filter(id => id !== r.id)
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selectedRecipes: [...prev.selectedRecipes, r.id]
                            }));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-400' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{r.name}</span>
                      </button>
                    );
                  })}
                  {recipes.length === 0 && (
                    <span className="text-slate-400 italic text-xs">No recipes in catalog yet. You can still enter materials manually.</span>
                  )}
                </div>
              </div>

              {/* Section 1: PER DAY USED MATERIAL & COST */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      1. Used Raw Materials & Costs (Total: ₹{modalMaterialCost.toLocaleString()})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Material Row</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.materialsUsed.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-white p-2 rounded-lg border border-slate-200 items-center">
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Material Name</label>
                        <select
                          value={m.materialId}
                          onChange={(e) => {
                            const selected = rawMaterials.find(rm => rm.id === e.target.value);
                            const updated = [...formData.materialsUsed];
                            if (selected) {
                              const isKg = selected.unit === 'kg' || selected.unit === 'g';
                              const rate = selected.unit === 'kg' || selected.unit === 'L' ? selected.averageCostPerGram * 1000 : (selected.averageCostPerGram * 1000 || 80);
                              updated[idx] = {
                                ...updated[idx],
                                materialId: selected.id,
                                materialName: selected.name,
                                category: selected.category,
                                costPerUnit: Math.round(rate) || updated[idx].costPerUnit,
                                totalCost: Math.round(updated[idx].quantityUsed * (rate || updated[idx].costPerUnit))
                              };
                            }
                            setFormData({ ...formData, materialsUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800"
                        >
                          <option value={m.materialId}>{m.materialName}</option>
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.name} ({rm.category})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Quantity Used</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={m.quantityUsed}
                            onChange={(e) => {
                              const qty = Math.max(0, Number(e.target.value));
                              const updated = [...formData.materialsUsed];
                              updated[idx].quantityUsed = qty;
                              updated[idx].totalCost = Math.round(qty * updated[idx].costPerUnit);
                              setFormData({ ...formData, materialsUsed: updated });
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold"
                          />
                          <span className="text-[10px] font-bold text-slate-500">{m.unit}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (₹/Unit)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={m.costPerUnit}
                          onChange={(e) => {
                            const rate = Math.max(0, Number(e.target.value));
                            const updated = [...formData.materialsUsed];
                            updated[idx].costPerUnit = rate;
                            updated[idx].totalCost = Math.round(updated[idx].quantityUsed * rate);
                            setFormData({ ...formData, materialsUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-emerald-800 uppercase">Cost (₹)</label>
                        <div className="w-full px-2 py-1 bg-emerald-50 border border-emerald-200 rounded font-mono text-xs font-black text-emerald-800">
                          ₹{m.totalCost}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              materialsUsed: prev.materialsUsed.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 & 3: LABOUR COST & OIL USED */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* LABOUR COST WITH SEPARATE OPTIONS: CHEF, HELPER, SALES MAN, PACKING PERSON */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">
                          2. Labour Cost by Role (Total: ₹{modalLabourCost.toLocaleString()})
                        </h4>
                        <p className="text-[10px] text-blue-700 font-medium">
                          Separate roles: Chef, Helper, Sales Man & Packing Person
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-bold text-[10px] rounded-md shadow-2xs shrink-0">
                      {modalTotalWorkers} Staff
                    </span>
                  </div>

                  {/* 4 Separate Roles Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Role 1: Chef / Master */}
                    <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-indigo-900">
                          <span>👨‍🍳</span>
                          <span>Chef / Master</span>
                        </span>
                        <span className="font-mono text-indigo-600 font-extrabold text-[11px]">
                          ₹{modalChefCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Count</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.chefCount}
                            onChange={(e) => setFormData({ ...formData, chefCount: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="Count"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Daily Wage (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={formData.chefWage}
                            onChange={(e) => setFormData({ ...formData, chefWage: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="₹/day"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role 2: Helper */}
                    <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-emerald-900">
                          <span>🧑‍🍳</span>
                          <span>Helper / Kitchen</span>
                        </span>
                        <span className="font-mono text-emerald-600 font-extrabold text-[11px]">
                          ₹{modalHelperCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Count</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.helperCount}
                            onChange={(e) => setFormData({ ...formData, helperCount: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="Count"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Daily Wage (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={formData.helperWage}
                            onChange={(e) => setFormData({ ...formData, helperWage: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="₹/day"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role 3: Sales Man */}
                    <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-amber-900">
                          <span>💼</span>
                          <span>Sales Man / Delivery</span>
                        </span>
                        <span className="font-mono text-amber-600 font-extrabold text-[11px]">
                          ₹{modalSalesManCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Count</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.salesManCount}
                            onChange={(e) => setFormData({ ...formData, salesManCount: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="Count"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Daily Wage (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={formData.salesManWage}
                            onChange={(e) => setFormData({ ...formData, salesManWage: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="₹/day"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role 4: Packing Person */}
                    <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-purple-900">
                          <span>📦</span>
                          <span>Packing Person</span>
                        </span>
                        <span className="font-mono text-purple-600 font-extrabold text-[11px]">
                          ₹{modalPackingPersonCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Count</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.packingPersonCount}
                            onChange={(e) => setFormData({ ...formData, packingPersonCount: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="Count"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 uppercase">Daily Wage (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={formData.packingPersonWage}
                            onChange={(e) => setFormData({ ...formData, packingPersonWage: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            placeholder="₹/day"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overtime & Subtotal Row */}
                  <div className="p-2 bg-white/90 rounded-lg border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase">OT Hours</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.overtimeHours}
                          onChange={(e) => setFormData({ ...formData, overtimeHours: Math.max(0, Number(e.target.value)) })}
                          className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase">OT Pay (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={formData.overtimeCost}
                          onChange={(e) => setFormData({ ...formData, overtimeCost: Math.max(0, Number(e.target.value)) })}
                          className="w-18 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-blue-700"
                        />
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono leading-tight">
                      <span className="text-slate-500">Wage Subtotal: </span>
                      <strong className="text-slate-900">₹{modalLabourSubtotal.toLocaleString()}</strong>
                      <span className="text-slate-400 mx-1">|</span>
                      <span className="text-blue-700 font-extrabold">Total Labour: ₹{modalLabourCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* OIL USED */}
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center space-x-1.5 border-b border-amber-200 pb-1.5">
                    <Droplet className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                      3. Cooking Oil Used (Total: ₹{modalOilCost.toLocaleString()})
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Oil Used (Litres)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.oilUsedLitres}
                        onChange={(e) => setFormData({ ...formData, oilUsedLitres: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Oil Rate (₹ / Litre)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.oilCostPerLitre}
                        onChange={(e) => setFormData({ ...formData, oilCostPerLitre: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: FIREWORK / FUEL USED ("FIRE WORK USED") */}
              <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200 space-y-2.5">
                <div className="flex items-center space-x-1.5 border-b border-orange-200 pb-1.5">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <h4 className="font-bold text-orange-950 uppercase tracking-wider text-[11px]">
                    4. Firework / Fuel Used (Firewood or Commercial Gas LPG) — Total: ₹{modalFuelCost.toLocaleString()}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Fuel Type</label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="Firewood">Firewood (விறகு அடுப்பு)</option>
                      <option value="Commercial Gas LPG">Commercial Gas LPG Cylinder</option>
                      <option value="Briquet / Biomass">Briquet / Biomass Fuel</option>
                      <option value="Electric">Electric Induction / Fryer</option>
                    </select>
                  </div>

                  {formData.fuelType === 'Firewood' ? (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Firewood Consumed (kg)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.firewoodUsedKg}
                          onChange={(e) => setFormData({ ...formData, firewoodUsedKg: Math.max(0, Number(e.target.value)) })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Firewood Rate (₹/kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData.firewoodCostPerKg}
                          onChange={(e) => setFormData({ ...formData, firewoodCostPerKg: Math.max(0, Number(e.target.value)) })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Cylinders Used</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.gasCylindersUsed}
                          onChange={(e) => setFormData({ ...formData, gasCylindersUsed: Math.max(0, Number(e.target.value)) })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Cost Per Cylinder (₹)</label>
                        <input
                          type="number"
                          step="10"
                          min="0"
                          value={formData.gasCostPerCylinder}
                          onChange={(e) => setFormData({ ...formData, gasCostPerCylinder: Math.max(0, Number(e.target.value)) })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section 5: COVER USED FOR PACKETS ("COVER USED TO PACKETCKETS") */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex justify-between items-center border-b border-emerald-200 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                      5. Covers Used to Pack Packets (Total: ₹{modalCoverCost.toLocaleString()})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={addCoverRow}
                    className="px-2 py-1 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Cover Row</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.coversUsed.map((c, cIdx) => (
                    <div key={cIdx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-white p-2 rounded-lg border border-slate-200 items-center">
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Cover / Pouch Type</label>
                        <input
                          type="text"
                          value={c.coverName}
                          onChange={(e) => {
                            const updated = [...formData.coversUsed];
                            updated[cIdx].coverName = e.target.value;
                            setFormData({ ...formData, coversUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Covers Used</label>
                        <input
                          type="number"
                          min="0"
                          value={c.coversUsedCount}
                          onChange={(e) => {
                            const count = Math.max(0, Number(e.target.value));
                            const updated = [...formData.coversUsed];
                            updated[cIdx].coversUsedCount = count;
                            updated[cIdx].totalCoverCost = Math.round(count * updated[cIdx].costPerCover);
                            setFormData({ ...formData, coversUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-rose-700 uppercase">Wastage Covers</label>
                        <input
                          type="number"
                          min="0"
                          value={c.wastageCoversCount}
                          onChange={(e) => {
                            const w = Math.max(0, Number(e.target.value));
                            const updated = [...formData.coversUsed];
                            updated[cIdx].wastageCoversCount = w;
                            setFormData({ ...formData, coversUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-rose-50/50 border border-rose-200 rounded font-mono text-xs text-rose-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Cost / Pouch (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={c.costPerCover}
                          onChange={(e) => {
                            const rate = Math.max(0, Number(e.target.value));
                            const updated = [...formData.coversUsed];
                            updated[cIdx].costPerCover = rate;
                            updated[cIdx].totalCoverCost = Math.round(updated[cIdx].coversUsedCount * rate);
                            setFormData({ ...formData, coversUsed: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="font-mono font-bold text-emerald-800 text-xs">
                          ₹{c.totalCoverCost}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              coversUsed: prev.coversUsed.filter((_, i) => i !== cIdx)
                            }));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: RECIPES USED TO PACK ON DIFFERENT WEIGHT LIMITS */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5">
                <div className="flex justify-between items-center border-b border-indigo-200 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px]">
                      6. Recipes Packed on Different Weight Limits ({modalTotalPackets} Packets • {modalTotalPackedKg.toFixed(1)} kg)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={addWeightLimitRow}
                    className="px-2 py-1 bg-white hover:bg-indigo-100/50 text-indigo-800 border border-indigo-300 rounded-md font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Weight Limit</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.weightLimitsPacked.map((w, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-white p-2 rounded-lg border border-slate-200 items-center">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase flex items-center justify-between">
                          <span>Weight Limit</span>
                          {![50, 100, 150, 200, 250, 400, 500, 1000, 5000].includes(w.packWeightGrams) && (
                            <span className="text-amber-700 font-bold text-[8px] bg-amber-50 px-1 rounded border border-amber-200">
                              Custom: {w.packWeightGrams}g
                            </span>
                          )}
                        </label>
                        <select
                          value={[50, 100, 150, 200, 250, 400, 500, 1000, 5000].includes(w.packWeightGrams) ? String(w.packWeightGrams) : 'custom'}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...formData.weightLimitsPacked];
                            if (val === 'custom') {
                              if ([50, 100, 150, 200, 250, 400, 500, 1000, 5000].includes(w.packWeightGrams)) {
                                updated[wIdx].packWeightGrams = 75;
                                updated[wIdx].totalWeightKg = Number(((75 * updated[wIdx].packetsCount) / 1000).toFixed(2));
                              }
                            } else {
                              const g = Number(val);
                              updated[wIdx].packWeightGrams = g;
                              updated[wIdx].totalWeightKg = Number(((g * updated[wIdx].packetsCount) / 1000).toFixed(2));
                            }
                            setFormData({ ...formData, weightLimitsPacked: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold text-indigo-950 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="50">50g Pouch</option>
                          <option value="100">100g Pouch</option>
                          <option value="150">150g Pouch</option>
                          <option value="200">200g Pouch</option>
                          <option value="250">250g Zip Pouch</option>
                          <option value="400">400g Family Pack</option>
                          <option value="500">500g Bag</option>
                          <option value="1000">1000g (1 kg Bag)</option>
                          <option value="5000">5000g (5 kg Box)</option>
                          <option value="custom">✍️ Custom Weight (g)...</option>
                        </select>
                        {(![50, 100, 150, 200, 250, 400, 500, 1000, 5000].includes(w.packWeightGrams) || w.packWeightGrams === 75) && (
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Custom grams (e.g. 75)"
                              value={w.packWeightGrams || ''}
                              onChange={(e) => {
                                const g = Math.max(1, Number(e.target.value));
                                const updated = [...formData.weightLimitsPacked];
                                updated[wIdx].packWeightGrams = g;
                                updated[wIdx].totalWeightKg = Number(((g * updated[wIdx].packetsCount) / 1000).toFixed(2));
                                setFormData({ ...formData, weightLimitsPacked: updated });
                              }}
                              className="w-full px-2 py-1 bg-amber-50/70 border border-amber-300 rounded font-mono text-xs font-bold text-amber-950 placeholder:text-amber-400/80 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500 font-mono">g</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase flex items-center justify-between">
                          <span>Recipe Name</span>
                          {w.recipeName && <span className="text-indigo-600 font-bold text-[8px]">Selected</span>}
                        </label>
                        <select
                          value={recipes.some(r => r.name === w.recipeName) ? w.recipeName : (w.recipeName ? 'custom' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...formData.weightLimitsPacked];
                            if (val === 'custom') {
                              updated[wIdx].recipeName = '';
                            } else {
                              updated[wIdx].recipeName = val;
                            }
                            setFormData({ ...formData, weightLimitsPacked: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer mb-1"
                        >
                          <option value="">▼ Select Recipe (Dropdown)...</option>
                          {recipes.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                          <option value="custom">✍️ Custom Recipe Name...</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. Special Mixture"
                          value={w.recipeName}
                          onChange={(e) => {
                            const updated = [...formData.weightLimitsPacked];
                            updated[wIdx].recipeName = e.target.value;
                            setFormData({ ...formData, weightLimitsPacked: updated });
                          }}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Packets Count</label>
                        <input
                          type="number"
                          min="0"
                          value={w.packetsCount}
                          onChange={(e) => {
                            const count = Math.max(0, Number(e.target.value));
                            const updated = [...formData.weightLimitsPacked];
                            updated[wIdx].packetsCount = count;
                            updated[wIdx].totalWeightKg = Number(((w.packWeightGrams * count) / 1000).toFixed(2));
                            setFormData({ ...formData, weightLimitsPacked: updated });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Total Weight (Kg)</label>
                        <div className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800">
                          {w.totalWeightKg.toFixed(2)} kg
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              weightLimitsPacked: prev.weightLimitsPacked.filter((_, i) => i !== wIdx)
                            }));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* OVERHEADS & NOTES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Overhead Burden (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.overheadCost}
                    onChange={(e) => setFormData({ ...formData, overheadCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Daily Log Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Fryer 1 firewood temperature maintained; packaged ready for wholesale pickup"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* LIVE SUMMARY BANNER */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Total Calculated Day Spending</span>
                  <p className="text-2xl font-black font-mono">
                    ₹{modalDayGrandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-300 font-mono space-y-0.5">
                  <p>Materials: ₹{modalMaterialCost} • Labour: ₹{modalLabourCost}</p>
                  <p>Oil: ₹{modalOilCost} • Firewood/Fuel: ₹{modalFuelCost} • Covers: ₹{modalCoverCost}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 bg-emerald-50/70 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={deductStockOnSave}
                    onChange={(e) => setDeductStockOnSave(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 text-emerald-950">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-decrease raw material stock from warehouse inventory upon saving</span>
                  </span>
                </label>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{editingId ? 'Save Changes' : 'Commit Daily Log & Deduct'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW DETAILS & PRINTABLE DAILY COST VOUCHER MODAL */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 my-8 overflow-hidden flex flex-col">
            
            {/* Voucher Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-black">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Daily Factory Production & Spending Voucher</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Voucher Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-base font-black text-slate-900 font-mono">Date: {viewingEntry.date}</h4>
                  <p className="text-xs text-slate-500 font-medium">Shift: {viewingEntry.shift || 'Full Day'} • Supervisor: {viewingEntry.supervisorName || 'Murugan (Master)'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Day Cost</span>
                  <p className="text-xl font-black font-mono text-indigo-900">
                    ₹{viewingEntry.totalDaySpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {/* Recipes Produced */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Recipes Cooked</span>
                <div className="flex flex-wrap gap-1">
                  {viewingEntry.recipeNames.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded font-bold text-indigo-900 text-xs">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Raw Materials Table */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Raw Materials Consumed</span>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-600 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Material</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {viewingEntry.materialsUsed.map((m, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-sans font-medium text-slate-800">{m.materialName}</td>
                          <td className="p-2 text-right">{m.quantityUsed} {m.unit}</td>
                          <td className="p-2 text-right">₹{m.costPerUnit}</td>
                          <td className="p-2 text-right font-bold text-slate-900">₹{m.totalCost}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={3} className="p-2 text-right">Total Material Cost:</td>
                        <td className="p-2 text-right text-indigo-900">₹{viewingEntry.totalMaterialCost.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Labour, Oil, Fuel Summary 3-Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-900 uppercase block">Labour Cost</span>
                  <p className="text-base font-black font-mono text-blue-950 mt-0.5">₹{viewingEntry.totalLabourCost.toLocaleString()}</p>
                  <p className="text-[10px] text-blue-800 font-semibold">{viewingEntry.workersCount} staff total</p>
                  <div className="mt-1 space-y-0.5 text-[9px] text-slate-700 font-medium">
                    {(viewingEntry.chefCount !== undefined ? viewingEntry.chefCount : (viewingEntry.masterWorkersCount || 0)) > 0 && (
                      <p>👨‍🍳 Chef: {viewingEntry.chefCount || viewingEntry.masterWorkersCount} @ ₹{viewingEntry.chefWage || 850}</p>
                    )}
                    {(viewingEntry.helperCount !== undefined ? viewingEntry.helperCount : (viewingEntry.helperWorkersCount || 0)) > 0 && (
                      <p>🧑‍🍳 Helper: {viewingEntry.helperCount || viewingEntry.helperWorkersCount} @ ₹{viewingEntry.helperWage || 550}</p>
                    )}
                    {(viewingEntry.salesManCount || 0) > 0 && (
                      <p>💼 Sales: {viewingEntry.salesManCount} @ ₹{viewingEntry.salesManWage || 600}</p>
                    )}
                    {(viewingEntry.packingPersonCount || 0) > 0 && (
                      <p>📦 Packing: {viewingEntry.packingPersonCount} @ ₹{viewingEntry.packingPersonWage || 600}</p>
                    )}
                    {viewingEntry.overtimeCost ? (
                      <p className="text-blue-700 font-bold">OT: +{viewingEntry.overtimeHours || 0}h (₹{viewingEntry.overtimeCost})</p>
                    ) : null}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Oil Used</span>
                  <p className="text-base font-black font-mono text-amber-950 mt-0.5">{viewingEntry.oilUsedLitres} L</p>
                  <p className="text-[10px] text-amber-800 font-mono">₹{viewingEntry.totalOilCost} (@ ₹{viewingEntry.oilCostPerLitre}/L)</p>
                </div>

                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <span className="text-[10px] font-bold text-orange-900 uppercase block">Firewood / Fuel</span>
                  <p className="text-base font-black font-mono text-orange-950 mt-0.5">₹{viewingEntry.totalFuelCost}</p>
                  <p className="text-[10px] text-orange-800">{viewingEntry.fuelType}</p>
                </div>
              </div>

              {/* Covers Used & Weight Limits */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Covers Used & Packets on Different Weight Limits</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase block">Packaging Covers</span>
                    <p className="font-mono font-black text-emerald-950 text-sm">
                      {viewingEntry.totalCoversCount} Covers (₹{viewingEntry.totalCoverCost})
                    </p>
                    <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                      {viewingEntry.coversUsed.map((c, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{c.coverName}:</span>
                          <span className="font-mono font-bold">{c.coversUsedCount} used (₹{c.totalCoverCost})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase block">Weight Limits Packed</span>
                    <p className="font-mono font-black text-indigo-950 text-sm">
                      {viewingEntry.totalPacketsPacked} Packets ({viewingEntry.totalWeightPackedKg} kg)
                    </p>
                    <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                      {viewingEntry.weightLimitsPacked.map((w, i) => (
                        <div key={i} className="flex justify-between font-mono">
                          <span>{w.packWeightGrams}g Pack:</span>
                          <span className="font-bold text-indigo-900">{w.packetsCount} pkts ({w.totalWeightKg}kg)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {viewingEntry.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Notes & Production Log</span>
                  <p className="text-xs text-slate-700 mt-0.5">{viewingEntry.notes}</p>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingEntry(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Close Voucher
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
