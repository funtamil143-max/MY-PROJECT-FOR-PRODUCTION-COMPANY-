import React, { useState } from 'react';
import { ProductionBatch, Recipe, RawMaterial, BatchStatus, PackagingSize, SaleEntry } from '../types';
import { BatchReportModal } from './BatchReportModal';
import { PostCookWorkflowModal } from './PostCookWorkflowModal';
import { PackedUnitStockTable } from './PackedUnitStockTable';
import { 
  Plus, 
  Trash, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Clipboard, 
  PackageCheck, 
  Coins, 
  Scale, 
  Info,
  Archive,
  Pencil,
  Sliders,
  RefreshCw,
  Sparkles,
  Boxes,
  Compass,
  ArrowRight,
  Printer,
  FileText,
  Camera,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  Paperclip,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { calculateRecipeTotalWeight, calculateLaborCost, calculateBatchFinancials, calculateIngredientsCost } from '../utils/calculations';

interface ProductionBatchesProps {
  batches: ProductionBatch[];
  recipes: Recipe[];
  materials: RawMaterial[];
  salesEntries?: SaleEntry[];
  onAddBatch: (batch: Omit<ProductionBatch, 'id' | 'batchNumber'>) => void;
  onEditBatch?: (id: string, updatedBatch: Omit<ProductionBatch, 'id' | 'batchNumber'>) => void;
  onUpdateBatchStatus: (id: string, status: BatchStatus, actualYield?: { [packSizeId: string]: number }, extraData?: Partial<ProductionBatch>) => void;
  onDeleteBatch: (id: string) => void;
  onUpdatePackagingSizes?: (recipeId: string, sizes: PackagingSize[]) => void;
  canDelete?: boolean;
}

export default function ProductionBatches({ 
  batches, 
  recipes, 
  materials, 
  salesEntries = [],
  onAddBatch, 
  onEditBatch,
  onUpdateBatchStatus,
  onDeleteBatch,
  onUpdatePackagingSizes
}: ProductionBatchesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [recipeId, setRecipeId] = useState<string>(recipes[0]?.id || '');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Post-Cook Production Workflow Modal State
  const [postCookModalBatch, setPostCookModalBatch] = useState<ProductionBatch | null>(null);

  // PDF Summary Report Modal state
  const [selectedReportBatch, setSelectedReportBatch] = useState<ProductionBatch | null>(null);
  const [reportInitialTab, setReportInitialTab] = useState<'financial' | 'workorder'>('workorder');

  // Production Planning & Shortfall Simulator state
  const [planRecipeId, setPlanRecipeId] = useState<string>(recipes[0]?.id || '');
  const [planBatchSize, setPlanBatchSize] = useState<number>(10000);
  const [planBatchSizeUnit, setPlanBatchSizeUnit] = useState<'g' | 'kg'>('kg');
  const [planSafetyBuffer, setPlanSafetyBuffer] = useState<number>(0); // safety buffer percentage (0%, 5%, 10%, 15%, etc.)

  // Production History table filter and sorting state
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyRecipeFilter, setHistoryRecipeFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  const handleEditClick = (batch: ProductionBatch) => {
    setEditingBatchId(batch.id);
    setIsAdding(true);
    setRecipeId(batch.recipeId);
    setBatchSize(batch.batchSizeGrams);
    setBatchSizeUnit(batch.batchSizeGrams >= 1000 && batch.batchSizeGrams % 1000 === 0 ? 'kg' : 'g');
    setStatus(batch.status);
    setNotes(batch.notes || '');
    setPhotoAttachment(batch.photoAttachment || '');
    setPackedQty(batch.packedQuantityGrams ? (batch.packedQuantityGrams >= 1000 ? batch.packedQuantityGrams / 1000 : batch.packedQuantityGrams) : 0);
    setPackedUnit(batch.packedQuantityGrams && batch.packedQuantityGrams < 1000 ? 'g' : 'kg');
    setUnpackedQty(batch.unpackedQuantityGrams ? (batch.unpackedQuantityGrams >= 1000 ? batch.unpackedQuantityGrams / 1000 : batch.unpackedQuantityGrams) : 0);
    setUnpackedUnit(batch.unpackedQuantityGrams && batch.unpackedQuantityGrams < 1000 ? 'g' : 'kg');
    setSellingVal(batch.sellingValueTotal || 0);

    const formEl = document.getElementById('add-batch-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const [batchSize, setBatchSize] = useState<number>(10000); // Defaults to 10kg
  const [batchSizeUnit, setBatchSizeUnit] = useState<'g' | 'kg'>('g');
  const [status, setStatus] = useState<BatchStatus>('In Bulk');
  const [notes, setNotes] = useState('');

  // Image / Photo Attachment State for Production Batch
  const [photoAttachment, setPhotoAttachment] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);

  // Camera Handlers
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please allow camera permissions or upload an image file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoAttachment(dataUrl);
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Packing state
  const selectedRecipe = recipes.find(r => r.id === recipeId) || recipes[0];
  const [packSizeId, setPackSizeId] = useState<string>('');
  const [actualPacketsCount, setActualPacketsCount] = useState<number>(200);

  // Custom pack size inputs
  const [customPackSize, setCustomPackSize] = useState<number>(50);
  const [customPackUnit, setCustomPackUnit] = useState<'gram' | 'kg' | 'liter' | 'pieces' | 'packs' | 'bundle'>('gram');
  const [customPouchCost, setCustomPouchCost] = useState<number>(1.5);
  const [customMRP, setCustomMRP] = useState<number>(20);

  // Packaging Details & Selling Value state
  const [packedQty, setPackedQty] = useState<number>(0);
  const [packedUnit, setPackedUnit] = useState<'kg' | 'g' | 'packs'>('kg');
  const [unpackedQty, setUnpackedQty] = useState<number>(0);
  const [unpackedUnit, setUnpackedUnit] = useState<'kg' | 'g' | 'packs'>('kg');
  const [sellingVal, setSellingVal] = useState<number>(0);

  // Transitioning/completing packed state on existing batches
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completePackSizeId, setCompletePackSizeId] = useState<string>('');
  const [completeActualCount, setCompleteActualCount] = useState<number>(200);

  const getPackSizeGrams = (sz: { grams: number; unit?: string }) => {
    return (sz.unit === 'kg' || sz.unit === 'liter') ? sz.grams * 1000 : sz.grams;
  };

  // Sync state when recipe selection shifts
  React.useEffect(() => {
    if (selectedRecipe) {
      setBatchSize(selectedRecipe.baseBatchSizeGrams);
      setBatchSizeUnit(selectedRecipe.baseBatchSizeGrams >= 1000 && selectedRecipe.baseBatchSizeGrams % 1000 === 0 ? 'kg' : 'g');
      if (selectedRecipe.packagingSizes.length > 0) {
        setPackSizeId(selectedRecipe.packagingSizes[0].id);
        const actualGms = getPackSizeGrams(selectedRecipe.packagingSizes[0]);
        setActualPacketsCount(Math.round(selectedRecipe.baseBatchSizeGrams / actualGms));
      } else {
        setPackSizeId('custom_size');
        const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize;
        setActualPacketsCount(Math.round(selectedRecipe.baseBatchSizeGrams / sizeGms));
      }
    }
  }, [recipeId, selectedRecipe]);

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId) return;

    // Build the yield structures
    const expectedYieldPackets: { [packSizeId: string]: number } = {};
    const actualYieldPackets: { [packSizeId: string]: number } = {};

    if (status === 'Packed') {
      if (packSizeId === 'custom_size') {
        const newSizeId = `size_${recipeId}_${Date.now()}`;
        const newSize: PackagingSize = {
          id: newSizeId,
          grams: Number(customPackSize),
          unit: customPackUnit,
          pouchCost: Number(customPouchCost),
          mrp: Number(customMRP),
          quantityToPack: 100
        };

        if (onUpdatePackagingSizes) {
          onUpdatePackagingSizes(recipeId, [...(selectedRecipe.packagingSizes || []), newSize]);
        }

        const sizeGrams = (customPackUnit === 'kg' || customPackUnit === 'liter') ? Number(customPackSize) * 1000 : Number(customPackSize);
        const theoretical = batchSize / sizeGrams;
        expectedYieldPackets[newSizeId] = Math.round(theoretical);
        actualYieldPackets[newSizeId] = Number(actualPacketsCount);
      } else if (packSizeId) {
        const selectedSize = selectedRecipe.packagingSizes.find(p => p.id === packSizeId);
        if (selectedSize) {
          const sizeGrams = getPackSizeGrams(selectedSize);
          const theoretical = batchSize / sizeGrams;
          expectedYieldPackets[packSizeId] = Math.round(theoretical);
          actualYieldPackets[packSizeId] = Number(actualPacketsCount);
        }
      }
    }

    const packedQuantityGrams = packedUnit === 'kg' ? Number(packedQty) * 1000 : Number(packedQty);
    const unpackedQuantityGrams = unpackedUnit === 'kg' ? Number(unpackedQty) * 1000 : Number(unpackedQty);
    const packedQuantityDisplay = packedQty > 0 ? `${packedQty} ${packedUnit}` : undefined;
    const unpackedQuantityDisplay = unpackedQty > 0 ? `${unpackedQty} ${unpackedUnit}` : undefined;

    const batchData = {
      recipeId,
      date: editingBatchId ? (batches.find(b => b.id === editingBatchId)?.date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      status,
      batchSizeGrams: Number(batchSize),
      expectedYieldPackets,
      actualYieldPackets,
      laborCostActual: selectedRecipe ? calculateLaborCost(selectedRecipe) * (batchSize / selectedRecipe.baseBatchSizeGrams) : 1200,
      overheadCostActual: selectedRecipe ? selectedRecipe.overheadCost * (batchSize / selectedRecipe.baseBatchSizeGrams) : 400,
      notes: notes.trim(),
      photoAttachment: photoAttachment || undefined,
      image: photoAttachment || undefined,
      packedQuantityGrams: packedQty > 0 ? packedQuantityGrams : undefined,
      packedQuantityDisplay,
      unpackedQuantityGrams: unpackedQty > 0 ? unpackedQuantityGrams : undefined,
      unpackedQuantityDisplay,
      sellingValueTotal: Number(sellingVal) || undefined,
    };

    if (editingBatchId && onEditBatch) {
      onEditBatch(editingBatchId, batchData);
      setEditingBatchId(null);
    } else {
      onAddBatch(batchData);
    }

    // Reset Form
    setNotes('');
    setPhotoAttachment('');
    setPackedQty(0);
    setUnpackedQty(0);
    setSellingVal(0);
    setIsAdding(false);
  };

  const handleCompletePacking = (id: string) => {
    const b = batches.find(batch => batch.id === id);
    if (!b) return;
    const r = recipes.find(recipe => recipe.id === b.recipeId);
    if (!r) return;

    let targetSizeId = completePackSizeId;
    let actualMap: { [packSizeId: string]: number } = {};

    if (completePackSizeId === 'custom_size') {
      const newSizeId = `size_${b.recipeId}_${Date.now()}`;
      const newSize: PackagingSize = {
        id: newSizeId,
        grams: Number(customPackSize),
        unit: customPackUnit,
        pouchCost: Number(customPouchCost),
        mrp: Number(customMRP),
        quantityToPack: 100
      };

      if (onUpdatePackagingSizes) {
        onUpdatePackagingSizes(b.recipeId, [...(r.packagingSizes || []), newSize]);
      }

      actualMap = { [newSizeId]: Number(completeActualCount) };
    } else {
      const chosenSize = r.packagingSizes.find(p => p.id === completePackSizeId);
      if (!chosenSize) return;
      actualMap = { [completePackSizeId]: Number(completeActualCount) };
    }

    const packedQuantityGrams = packedUnit === 'kg' ? Number(packedQty) * 1000 : Number(packedQty);
    const unpackedQuantityGrams = unpackedUnit === 'kg' ? Number(unpackedQty) * 1000 : Number(unpackedQty);
    const packedQuantityDisplay = packedQty > 0 ? `${packedQty} ${packedUnit}` : undefined;
    const unpackedQuantityDisplay = unpackedQty > 0 ? `${unpackedQty} ${unpackedUnit}` : undefined;

    onUpdateBatchStatus(id, 'Packed', actualMap, {
      packedQuantityGrams: packedQty > 0 ? packedQuantityGrams : undefined,
      packedQuantityDisplay,
      unpackedQuantityGrams: unpackedQty > 0 ? unpackedQuantityGrams : undefined,
      unpackedQuantityDisplay,
      sellingValueTotal: Number(sellingVal) || undefined,
    });
    setCompletingId(null);
  };

  // Inspect ingredient shortfalls before starting
  const getIngredientShortfalls = () => {
    if (!selectedRecipe) return [];
    const scaleFactor = batchSize / selectedRecipe.baseBatchSizeGrams;
    
    return selectedRecipe.ingredients.map(ing => {
      const mat = materials.find(m => m.id === ing.materialId);
      const needed = ing.weightGrams * scaleFactor;
      const current = mat?.currentStockGrams || 0;
      return {
        name: mat?.name || 'Unknown',
        needed,
        current,
        shortfall: Math.max(0, needed - current),
        unit: mat?.unit || 'g'
      };
    }).filter(s => s.shortfall > 0);
  };

  const shortfalls = getIngredientShortfalls();

  // Filter & Sort for the Production History table
  const filteredHistoryBatches = React.useMemo(() => {
    let result = [...batches];

    // Filter by recipe
    if (historyRecipeFilter !== 'all') {
      result = result.filter(b => b.recipeId === historyRecipeFilter);
    }

    // Filter by status
    if (historyStatusFilter !== 'all') {
      result = result.filter(b => b.status === historyStatusFilter);
    }

    // Sort chronologically (ascending means oldest first, descending means newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (historySortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });

    return result;
  }, [batches, historySortOrder, historyRecipeFilter, historyStatusFilter]);

  // Production Planning & Shortfall Simulator calculations
  const planSelectedRecipe = recipes.find(r => r.id === planRecipeId) || recipes[0];

  // Calculate maximum possible batch size based on available stock
  let maxPossibleBatchGrams = Infinity;
  let limitIngredientName = '';

  if (planSelectedRecipe && planSelectedRecipe.ingredients && planSelectedRecipe.ingredients.length > 0) {
    planSelectedRecipe.ingredients.forEach(ing => {
      const mat = materials.find(m => m.id === ing.materialId);
      if (mat) {
        const stock = mat.currentStockGrams;
        const weightPerBaseG = ing.weightGrams / planSelectedRecipe.baseBatchSizeGrams;
        if (weightPerBaseG > 0) {
          const maxG = stock / weightPerBaseG;
          if (maxG < maxPossibleBatchGrams) {
            maxPossibleBatchGrams = maxG;
            limitIngredientName = mat.name;
          }
        }
      }
    });
  }

  if (maxPossibleBatchGrams === Infinity) {
    maxPossibleBatchGrams = 0;
  }

  // Calculate real-time shortfall list for simulation
  const planIngredientsList = planSelectedRecipe ? planSelectedRecipe.ingredients.map(ing => {
    const mat = materials.find(m => m.id === ing.materialId);
    
    // Safety buffer multiplier (e.g. 10% extra means factor is 1.10)
    const safetyFactor = 1 + (planSafetyBuffer / 100);
    const scaleFactor = planBatchSize / planSelectedRecipe.baseBatchSizeGrams;
    const requiredGrams = ing.weightGrams * scaleFactor * safetyFactor;
    const currentGrams = mat?.currentStockGrams || 0;
    const shortfallGrams = Math.max(0, requiredGrams - currentGrams);
    
    // Average cost calculations
    const costPerGram = mat?.averageCostPerGram || 0;
    const shortfallCost = shortfallGrams * costPerGram;

    // Display helpers
    const unit = mat?.unit || 'g';
    const isWeight = unit === 'kg' || unit === 'g' || unit === 'L';
    
    const requiredDisplay = isWeight 
      ? (requiredGrams >= 1000 ? `${(requiredGrams / 1000).toFixed(2)} kg` : `${Math.round(requiredGrams)} g`)
      : `${Math.round(requiredGrams)} ${unit}`;
      
    const currentDisplay = isWeight
      ? (currentGrams >= 1000 ? `${(currentGrams / 1000).toFixed(2)} kg` : `${Math.round(currentGrams)} g`)
      : `${Math.round(currentGrams)} ${unit}`;

    const shortfallDisplay = shortfallGrams > 0
      ? (isWeight 
          ? (shortfallGrams >= 1000 ? `${(shortfallGrams / 1000).toFixed(2)} kg` : `${Math.round(shortfallGrams)} g`)
          : `${Math.round(shortfallGrams)} ${unit}`)
      : '-';

    return {
      name: mat?.name || 'Unknown Ingredient',
      category: mat?.category || 'Other',
      requiredGrams,
      currentGrams,
      shortfallGrams,
      shortfallCost,
      requiredDisplay,
      currentDisplay,
      shortfallDisplay,
    };
  }) : [];

  const planHasShortfalls = planIngredientsList.some(item => item.shortfallGrams > 0);
  const planTotalShortfallCost = planIngredientsList.reduce((sum, item) => sum + item.shortfallCost, 0);

  const handleExportExcel = () => {
    const exportData = batches.map((b) => {
      const r = recipes.find(rec => rec.id === b.recipeId);
      const fin = calculateBatchFinancials(b, r, materials);
      
      let expPacks = 0;
      let actPacks = 0;
      Object.values(b.expectedYieldPackets || {}).forEach(v => expPacks += (Number(v) || 0));
      Object.values(b.actualYieldPackets || {}).forEach(v => actPacks += (Number(v) || 0));
      const eff = expPacks > 0 ? ((actPacks / expPacks) * 100).toFixed(1) + '%' : '100%';
      
      const rawCost = fin?.rawMaterialCost || 0;
      const laborCost = b.laborCostActual || r?.laborDailyWage || 0;
      const overheadCost = b.overheadCostActual || r?.overheadCost || 0;
      const totalProdCost = rawCost + laborCost + overheadCost;
      const salesRev = fin?.salesRevenue || 0;

      return {
        'Batch Number': b.batchNumber,
        'Date': b.date,
        'Recipe Name': r?.name || 'Unknown Recipe',
        'Status': b.status,
        'Batch Size (g)': b.batchSizeGrams,
        'Expected Packets': expPacks,
        'Actual Packets': actPacks,
        'Yield Efficiency': eff,
        'Raw Material Cost (₹)': rawCost,
        'Labor Cost (₹)': laborCost,
        'Overhead Cost (₹)': overheadCost,
        'Total Production Cost (₹)': totalProdCost,
        'Est. Sales Revenue (₹)': salesRev,
        'Net Profit/Loss (₹)': Math.round((salesRev - totalProdCost) * 100) / 100,
        'Notes': b.notes || '-'
      };
    });
    exportToExcel(exportData, `Production_Batches_${new Date().toISOString().split('T')[0]}`, 'Production Batches');
  };

  return (
    <div className="space-y-6" id="production-batches-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Production Batch Logs</h2>
          <p className="text-sm text-slate-500">Record raw mixes, monitor batch packaging yields, and track packet-to-pouch efficiency.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Export production batch logs to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            id="log-batch-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Launch Production Batch</span>
          </button>
        </div>
      </div>

      {/* Production Batches Financial KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="batch-financial-summary">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batches Logged</p>
          <p className="text-2xl font-bold text-slate-900 font-mono">{batches.length}</p>
          <p className="text-[11px] text-slate-400">Total cook cycles completed</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Raw Material Cost</p>
          <p className="text-2xl font-bold text-slate-800 font-mono">
            ₹{(batches.reduce((sum, b) => {
              const r = recipes.find(recipe => recipe.id === b.recipeId);
              return sum + (calculateBatchFinancials(b, r, materials)?.rawMaterialCost || 0);
            }, 0) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-slate-400">Ingredients consumed in batches</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batch Sales Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono">
            ₹{(batches.reduce((sum, b) => {
              const r = recipes.find(recipe => recipe.id === b.recipeId);
              return sum + (calculateBatchFinancials(b, r, materials)?.salesRevenue || 0);
            }, 0) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-slate-400">Value of products generated</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Profit/Loss per Batch Total</p>
          {(() => {
            const totRev = batches.reduce((sum, b) => {
              const r = recipes.find(recipe => recipe.id === b.recipeId);
              return sum + (calculateBatchFinancials(b, r, materials)?.salesRevenue || 0);
            }, 0);
            const totCost = batches.reduce((sum, b) => {
              const r = recipes.find(recipe => recipe.id === b.recipeId);
              return sum + (calculateBatchFinancials(b, r, materials)?.rawMaterialCost || 0);
            }, 0);
            const totPL = totRev - totCost;
            const margin = totRev > 0 ? (totPL / totRev) * 100 : 0;
            const isProf = totPL >= 0;
            return (
              <div>
                <p className={`text-2xl font-bold font-mono ${isProf ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isProf ? '+' : ''}₹{(totPL || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {margin.toFixed(1)}% Margin (Revenue - Raw Cost)
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* PACKED UNITS WAREHOUSE STOCK CALCULATION TABLE */}
      <PackedUnitStockTable
        recipes={recipes}
        batches={batches}
        salesEntries={salesEntries}
      />

      {/* Dynamic Production Planner & Stock Shortfall Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="production-planning-simulator">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Interactive Batch Planner & Stock Shortfall Simulator</span>
            </h3>
            <p className="text-xs text-slate-500">
              Calculate exact ingredient requirements and estimate procurement costs for lacking stock.
            </p>
          </div>
          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Real-time Simulation
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls - 4 cols */}
          <div className="lg:col-span-4 space-y-4 pr-0 lg:pr-6 border-r-0 lg:border-r border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Target Recipe Formula</label>
              <select
                value={planRecipeId}
                onChange={(e) => setPlanRecipeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-semibold text-slate-800 cursor-pointer shadow-xs"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.baseBatchSizeGrams / 1000}kg Base)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Desired Batch Production Weight</label>
              <div className="flex space-x-1.5 font-sans">
                <input
                  type="number"
                  value={planBatchSizeUnit === 'kg' ? planBatchSize / 1000 : planBatchSize}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                    setPlanBatchSize(planBatchSizeUnit === 'kg' ? val * 1000 : val);
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-semibold text-slate-900"
                />
                <select
                  value={planBatchSizeUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as 'g' | 'kg';
                    setPlanBatchSizeUnit(newUnit);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Simulated Weight: {(planBatchSize || 0).toLocaleString()}g ({(planBatchSize / 1000).toFixed(1)} kg)
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600">Safety Buffer Margin</label>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{planSafetyBuffer}% extra</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={planSafetyBuffer}
                onChange={(e) => setPlanSafetyBuffer(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[9px] text-slate-400 leading-tight">Increases calculated ingredient target weights to plan for preparation spillage or safety margins.</p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] text-slate-500 font-medium">
                <strong>Maximum Feasible Batch:</strong> The largest batch you can make with present stock levels.
              </div>
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Max Possible</p>
                  <p className="text-xs font-mono font-bold text-indigo-950">
                    {maxPossibleBatchGrams >= 1000 ? `${(maxPossibleBatchGrams / 1000).toFixed(1)} kg` : `${Math.round(maxPossibleBatchGrams)} g`}
                  </p>
                  {limitIngredientName && (
                    <p className="text-[9px] text-slate-400">
                      Limited by: <span className="font-bold text-amber-700">{limitIngredientName}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={maxPossibleBatchGrams <= 0}
                  onClick={() => {
                    setPlanBatchSize(maxPossibleBatchGrams);
                    setPlanBatchSizeUnit(maxPossibleBatchGrams >= 1000 ? 'kg' : 'g');
                  }}
                  className="px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Max Size
                </button>
              </div>

              {/* Cook Transfer Button */}
              <button
                type="button"
                onClick={() => {
                  setRecipeId(planRecipeId);
                  setBatchSize(planBatchSize);
                  setBatchSizeUnit(planBatchSizeUnit);
                  setIsAdding(true);
                  // Scroll to the active cooking form
                  setTimeout(() => {
                    document.getElementById('add-batch-form')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>Transfer parameters to Cook Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table/Simulation Results - 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            {/* Feasibility Indicator */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              planHasShortfalls 
                ? 'bg-amber-50/70 border-amber-200 text-amber-800' 
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`w-3 h-3 rounded-full ${planHasShortfalls ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <div>
                  <p className="text-xs font-bold">
                    {planHasShortfalls 
                      ? 'Stock Shortfalls Detected!' 
                      : 'All ingredients fully in stock!'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {planHasShortfalls 
                      ? `You require ₹${(planTotalShortfallCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} of additional raw materials to produce this batch size.`
                      : 'You have sufficient physical inventory in stock to complete this production mix.'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                planHasShortfalls ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {planHasShortfalls ? 'Shortfalls Present' : 'Feasible'}
              </span>
            </div>

            {/* Ingredients table with shortfall math */}
            <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <th className="px-4 py-2.5">Ingredient Name</th>
                    <th className="px-4 py-2.5 text-right">Required Amt</th>
                    <th className="px-4 py-2.5 text-right">Current Stock</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Shortfall</th>
                    <th className="px-4 py-2.5 text-right">Est. Cost to Procure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {planIngredientsList.map((item, idx) => {
                    const hasShortfall = item.shortfallGrams > 0;
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${hasShortfall ? 'bg-amber-50/10' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="block text-[9px] text-slate-400 font-semibold">{item.category}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          {item.requiredDisplay}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={item.currentGrams < item.requiredGrams ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                            {item.currentDisplay}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasShortfall ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold rounded-md">
                              Lacking
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded-md">
                              Adequate
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {hasShortfall ? (
                            <span className="text-amber-700 font-bold">{item.shortfallDisplay}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          {hasShortfall ? (
                            <span className="font-bold text-slate-900">₹{(item.shortfallCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">₹0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-800" colSpan={3}>
                      Total Estimated Shortfall Procurement Cost:
                    </td>
                    <td className="px-4 py-3 text-center">
                      {planHasShortfalls ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] rounded-full">
                          Action Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded-full">
                          All Clear
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">-</td>
                    <td className="px-4 py-3 text-right font-mono text-base text-indigo-700">
                      ₹{(planTotalShortfallCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Start Production Batch Panel */}
      {isAdding && (
        <form 
          id="add-batch-form"
          onSubmit={handleSubmitBatch} 
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-5"
        >
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {editingBatchId ? `Edit Cook Cycle: ${batches.find(b => b.id === editingBatchId)?.batchNumber}` : 'Initiate Cook Cycle'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Recipe Formula</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-semibold text-slate-800 cursor-pointer shadow-xs"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Base size: {r.baseBatchSizeGrams / 1000}kg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Desired Batch Size</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={batchSizeUnit === 'kg' ? batchSize / 1000 : batchSize}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                    setBatchSize(batchSizeUnit === 'kg' ? val * 1000 : val);
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  required
                />
                <select
                  value={batchSizeUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as 'g' | 'kg';
                    setBatchSizeUnit(newUnit);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
              <p className="text-slate-400 text-[10px] mt-1">
                Equates to {(batchSize || 0).toLocaleString('en-IN')} grams ({(batchSize / 1000).toFixed(1)} kg)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Phase / Status</label>
              <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStatus('In Bulk')}
                  className={`flex-1 text-center py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    status === 'In Bulk' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Keep in Bulk Bins
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Packed')}
                  className={`flex-1 text-center py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    status === 'Packed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pack Instantly
                </button>
              </div>
            </div>
          </div>

          {/* Packaging Details & Selling Value */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/70 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Packaging Details & Selling Value</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">How Much Packed</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={packedQty}
                    onChange={(e) => setPackedQty(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden font-mono font-bold text-slate-800"
                  />
                  <select
                    value={packedUnit}
                    onChange={(e) => setPackedUnit(e.target.value as any)}
                    className="px-2 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Not Yet Packed / Left</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={unpackedQty}
                    onChange={(e) => setUnpackedQty(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden font-mono font-bold text-slate-800"
                  />
                  <select
                    value={unpackedUnit}
                    onChange={(e) => setUnpackedUnit(e.target.value as any)}
                    className="px-2 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Selling Value (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={sellingVal}
                  onChange={(e) => setSellingVal(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden font-mono font-bold text-emerald-900"
                />
              </div>
            </div>
          </div>

          {/* If packed immediately, show packet inputs */}
          {status === 'Packed' && selectedRecipe && (
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-950 mb-1.5">Select Target Packet Size</label>
                <select
                  value={packSizeId}
                  onChange={(e) => {
                    setPackSizeId(e.target.value);
                    if (e.target.value === 'custom_size') {
                      const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize;
                      setActualPacketsCount(Math.round(batchSize / sizeGms));
                    } else {
                      const selectedSize = selectedRecipe.packagingSizes.find(p => p.id === e.target.value);
                      if (selectedSize) {
                        const actualGms = getPackSizeGrams(selectedSize);
                        setActualPacketsCount(Math.round(batchSize / actualGms));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-hidden"
                >
                  {selectedRecipe.packagingSizes.map((sz) => (
                    <option key={sz.id} value={sz.id}>
                      {sz.grams}{sz.unit === 'kg' ? 'kg' : sz.unit === 'liter' ? 'L' : sz.unit === 'pieces' ? ' pcs' : sz.unit === 'packs' ? ' packs' : sz.unit === 'bundle' ? ' bundle' : 'g'} pouch size (MRP: ₹{sz.mrp})
                    </option>
                  ))}
                  <option value="custom_size">-- Add Custom Pack Size... --</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-950 mb-1.5 flex justify-between">
                  <span>Actual Logged Yield (Bags)</span>
                  <span className="text-[10px] text-indigo-600 font-mono">
                    Theor. Yield: {packSizeId === 'custom_size' ? (
                      Math.round(batchSize / ((customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize))
                    ) : packSizeId ? (
                      Math.round(batchSize / getPackSizeGrams(selectedRecipe.packagingSizes.find(p => p.id === packSizeId) || { grams: 50 }))
                    ) : 0} bags
                  </span>
                </label>
                <input
                  type="number"
                  value={actualPacketsCount}
                  onChange={(e) => setActualPacketsCount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-hidden"
                  required
                />
              </div>

              {packSizeId === 'custom_size' && (
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight / Qty</label>
                    <input
                      type="number"
                      value={customPackSize}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setCustomPackSize(val);
                        const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? val * 1000 : val;
                        setActualPacketsCount(sizeGms > 0 ? Math.round(batchSize / sizeGms) : 0);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pack Unit</label>
                    <select
                      value={customPackUnit}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setCustomPackUnit(val);
                        const sizeGms = (val === 'kg' || val === 'liter') ? customPackSize * 1000 : customPackSize;
                        setActualPacketsCount(sizeGms > 0 ? Math.round(batchSize / sizeGms) : 0);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="gram">gram</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="pieces">pieces</option>
                      <option value="packs">packs</option>
                      <option value="bundle">bundle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pouch Film (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customPouchCost}
                      onChange={(e) => setCustomPouchCost(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price / MRP (₹)</label>
                    <input
                      type="number"
                      value={customMRP}
                      onChange={(e) => setCustomMRP(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shortfall warning section */}
          {shortfalls.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-800">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Ingredient Stock Shortfalls Detected!</span>
              </div>
              <p>The following ingredients do not have sufficient stock to fulfill this batch. Proceeding will push inventory levels into negative figures:</p>
              <ul className="list-disc pl-5 space-y-0.5 font-mono">
                {shortfalls.map((s, idx) => (
                  <li key={idx}>
                    {s.name}: Needed {(s.needed / 1000).toFixed(1)}kg, Stock: {(s.current / 1000).toFixed(1)}kg (Short: {(s.shortfall / 1000).toFixed(1)}kg)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Production Diary / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Flour hydration standard. Burner set to 180°C. Cooked by Shankar."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingBatchId(null);
                setRecipeId(recipes[0]?.id || '');
                setBatchSize(10000);
                setStatus('In Bulk');
                setNotes('');
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              {editingBatchId ? 'Update Cook Cycle & Stock' : 'Start Cooking & Deduct Stock'}
            </button>
          </div>
        </form>
      )}

      {/* Batches Log List */}
      <div className="space-y-4" id="batches-log-list">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Production Batch Registry</h3>

        {batches.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-400 shadow-sm">
            No production logs recorded yet. Create your first batch above!
          </div>
        ) : (
          batches.slice().reverse().map((b) => {
            const r = recipes.find(recipe => recipe.id === b.recipeId);
            const isBulk = b.status === 'In Bulk';
            const isCompleting = completingId === b.id;
            const fin = calculateBatchFinancials(b, r, materials);

            return (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header card */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base">{r?.name || 'Deleted Recipe'}</span>
                      <span className="font-mono text-xs text-slate-400">({b.batchNumber})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>Date: {b.date}</span>
                      <span>•</span>
                      <span className="font-mono">Batch Size: {(b.batchSizeGrams / 1000).toFixed(1)}kg</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">Raw Mat Cost: ₹{(fin?.rawMaterialCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">Sales Revenue: ₹{(fin?.salesRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="pt-0.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${
                        fin?.isProfit ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200' : 'bg-rose-100/90 text-rose-800 border-rose-200'
                      }`}>
                        <span>Profit/Loss per Batch:</span>
                        <span>{fin?.isProfit ? '+' : ''}₹{(fin?.profitLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({(fin?.marginPercent || 0).toFixed(1)}%)</span>
                      </span>
                    </div>
                    {(b.packedQuantityDisplay || b.unpackedQuantityDisplay || (b.sellingValueTotal !== undefined && b.sellingValueTotal > 0)) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-700 font-sans">
                        {b.packedQuantityDisplay && (
                          <span className="bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/80 font-mono text-[11px]"><strong className="text-indigo-900 font-sans">Packed:</strong> {b.packedQuantityDisplay}</span>
                        )}
                        {b.unpackedQuantityDisplay && (
                          <span className="bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/80 font-mono text-[11px]"><strong className="text-amber-900 font-sans">Not Yet Packed:</strong> {b.unpackedQuantityDisplay}</span>
                        )}
                        {b.sellingValueTotal !== undefined && b.sellingValueTotal > 0 && (
                          <span className="bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/80 font-mono text-[11px]"><strong className="text-emerald-900 font-sans">Selling Val:</strong> ₹{b.sellingValueTotal.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPostCookModalBatch(b)}
                      className="px-3 py-1 text-xs font-black bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-lg cursor-pointer transition-all flex items-center space-x-1 shadow-sm"
                      title="Manage 13-Stage Post-Cook Production Workflow, QC Gate & Oil Recovery"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Post-Cook Workflow</span>
                    </button>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      b.status === 'Packed' || b.status === 'Batch Completed' || b.status === 'Packaging Completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : b.status === 'Hold' || b.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {b.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReportInitialTab('workorder');
                        setSelectedReportBatch(b);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                      title="Print Shop Floor Work Order Sheet for Physical Record Keeping"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Work Order Sheet</span>
                      <span className="sm:hidden">Work Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportInitialTab('financial');
                        setSelectedReportBatch(b);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                      title="Generate Financial PDF Summary Report"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">Financials</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(b)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
                      title="Edit Cook Batch log"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this batch log? Ingredients and packing pouch stock will be automatically refunded to inventory.')) {
                          onDeleteBatch(b.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                      title="Remove log"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-4">
                  {isBulk ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <Archive className="w-4 h-4 text-slate-400" />
                          <span>Batch holds in Bulk Container</span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-lg font-sans">
                          This food batch is finished cooking and kept in stainless bins. Move it to packaging pouches to log commercial yield and deduct pouch stock.
                        </p>
                      </div>

                      {isCompleting ? (
                        <div className="w-full sm:w-auto p-3 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pouch Size</label>
                              <select
                                value={completePackSizeId}
                                onChange={(e) => {
                                  setCompletePackSizeId(e.target.value);
                                  if (e.target.value === 'custom_size') {
                                    const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize;
                                    setCompleteActualCount(Math.round(b.batchSizeGrams / sizeGms));
                                  } else {
                                    const sz = r?.packagingSizes.find(p => p.id === e.target.value);
                                    if (sz) {
                                      const szGrams = getPackSizeGrams(sz);
                                      setCompleteActualCount(Math.round(b.batchSizeGrams / szGrams));
                                    }
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-700 cursor-pointer"
                              >
                                <option value="">-- Choose Pouch Size --</option>
                                {r?.packagingSizes.map(sz => (
                                  <option key={sz.id} value={sz.id}>
                                    {sz.grams}{sz.unit === 'kg' ? 'kg' : sz.unit === 'liter' ? 'L' : sz.unit === 'pieces' ? ' pcs' : sz.unit === 'packs' ? ' packs' : sz.unit === 'bundle' ? ' bundle' : 'g'} Pouch
                                  </option>
                                ))}
                                <option value="custom_size">-- Add Custom Pack Size... --</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>Actual Packets</span>
                                <span className="text-[9px] text-indigo-600 font-mono">
                                  Theor: {completePackSizeId === 'custom_size' ? (
                                    Math.round(b.batchSizeGrams / ((customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize))
                                  ) : completePackSizeId ? (
                                    Math.round(b.batchSizeGrams / getPackSizeGrams(r?.packagingSizes.find(p => p.id === completePackSizeId) || { grams: 50 }))
                                  ) : 0}
                                </span>
                              </label>
                              <input
                                type="number"
                                value={completeActualCount}
                                onChange={(e) => setCompleteActualCount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
                              />
                            </div>
                          </div>

                          {completePackSizeId === 'custom_size' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-indigo-50/50 border border-indigo-100/50 rounded-lg">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Weight / Qty</label>
                                <input
                                  type="number"
                                  value={customPackSize}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                    setCustomPackSize(val);
                                    const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? val * 1000 : val;
                                    setCompleteActualCount(sizeGms > 0 ? Math.round(b.batchSizeGrams / sizeGms) : 0);
                                  }}
                                  className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Pack Unit</label>
                                <select
                                  value={customPackUnit}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    setCustomPackUnit(val);
                                    const sizeGms = (val === 'kg' || val === 'liter') ? customPackSize * 1000 : customPackSize;
                                    setCompleteActualCount(sizeGms > 0 ? Math.round(b.batchSizeGrams / sizeGms) : 0);
                                  }}
                                  className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-semibold text-slate-700 cursor-pointer"
                                >
                                  <option value="gram">gram</option>
                                  <option value="kg">kg</option>
                                  <option value="liter">liter</option>
                                  <option value="pieces">pieces</option>
                                  <option value="packs">packs</option>
                                  <option value="bundle">bundle</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Pouch Film (₹)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={customPouchCost}
                                  onChange={(e) => setCustomPouchCost(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">MRP (₹)</label>
                                <input
                                  type="number"
                                  value={customMRP}
                                  onChange={(e) => setCustomMRP(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono"
                                  required
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">How Much Packed</label>
                              <div className="flex space-x-1">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  value={packedQty}
                                  onChange={(e) => setPackedQty(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className="flex-1 px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono"
                                />
                                <select
                                  value={packedUnit}
                                  onChange={(e) => setPackedUnit(e.target.value as any)}
                                  className="px-1 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md"
                                >
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="packs">packs</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Not Yet Packed Left</label>
                              <div className="flex space-x-1">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  value={unpackedQty}
                                  onChange={(e) => setUnpackedQty(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className="flex-1 px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono"
                                />
                                <select
                                  value={unpackedUnit}
                                  onChange={(e) => setUnpackedUnit(e.target.value as any)}
                                  className="px-1 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md"
                                >
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="packs">packs</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Selling Value (₹)</label>
                              <input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={sellingVal}
                                onChange={(e) => setSellingVal(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded-md font-mono text-emerald-900 font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setCompletingId(null)}
                              className="px-2 py-1 text-[10px] font-semibold border border-slate-200 text-slate-600 rounded-md cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCompletePacking(b.id)}
                              disabled={!completePackSizeId}
                              className="px-3 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-40 cursor-pointer"
                            >
                              Log Packing & Deduct Pouches
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setCompletingId(b.id);
                            setPackedQty(b.packedQuantityGrams ? (b.packedQuantityGrams >= 1000 ? b.packedQuantityGrams / 1000 : b.packedQuantityGrams) : (b.batchSizeGrams >= 1000 ? b.batchSizeGrams / 1000 : b.batchSizeGrams));
                            setPackedUnit(b.packedQuantityGrams && b.packedQuantityGrams < 1000 ? 'g' : 'kg');
                            setUnpackedQty(b.unpackedQuantityGrams ? (b.unpackedQuantityGrams >= 1000 ? b.unpackedQuantityGrams / 1000 : b.unpackedQuantityGrams) : 0);
                            setUnpackedUnit(b.unpackedQuantityGrams && b.unpackedQuantityGrams < 1000 ? 'g' : 'kg');
                            setSellingVal(b.sellingValueTotal || 0);
                            if (r && r.packagingSizes.length > 0) {
                              setCompletePackSizeId(r.packagingSizes[0].id);
                              const actualGms = getPackSizeGrams(r.packagingSizes[0]);
                              setCompleteActualCount(Math.round(b.batchSizeGrams / actualGms));
                            } else {
                              setCompletePackSizeId('custom_size');
                              const sizeGms = (customPackUnit === 'kg' || customPackUnit === 'liter') ? customPackSize * 1000 : customPackSize;
                              setCompleteActualCount(Math.round(b.batchSizeGrams / sizeGms));
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                          Pack Into Pouches
                        </button>
                      )}
                    </div>
                  ) : (
                    // Packed yields view
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1.5 md:col-span-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          <PackageCheck className="w-4 h-4 text-emerald-500" />
                          <span>Pouch Yield Log</span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 text-xs">
                          {Object.keys(b.actualYieldPackets).map((sizeId) => {
                            const sz = r?.packagingSizes.find(p => p.id === sizeId);
                            const actual = b.actualYieldPackets[sizeId] || 0;
                            const expected = b.expectedYieldPackets[sizeId] || 0;
                            const loss = expected - actual;
                            const lossPercent = expected > 0 ? (loss / expected) * 100 : 0;

                            return (
                              <React.Fragment key={sizeId}>
                                <div>
                                  <p className="text-slate-400 font-medium">Pouch Volume</p>
                                  <p className="font-bold text-slate-900 font-mono">
                                    {sz ? `${sz.grams}${sz.unit === 'kg' ? 'kg' : sz.unit === 'liter' ? 'L' : sz.unit === 'pieces' ? ' pcs' : sz.unit === 'packs' ? ' packs' : sz.unit === 'bundle' ? ' bundle' : 'g'}` : 'Custom Size'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium">Bags Logged (Actual / Theor.)</p>
                                  <p className="font-bold text-slate-900 font-mono">
                                    {actual} / {expected} pcs
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium">Yield Efficiency</p>
                                  <p className={`font-bold font-mono ${loss > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {(100 - lossPercent).toFixed(1)}% {loss > 0 ? `(-${loss} pcs)` : ''}
                                  </p>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-sans">
                        <strong>Theoretical vs Actual:</strong> Comparing bags expected vs worker actual output measures physical spillage, sealing errors, and portion controls in the plant.
                      </div>
                    </div>
                  )}

                  {b.notes && (
                    <div className="text-xs text-slate-500 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                      <strong>Remarks:</strong> {b.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Production History Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="production-history-section">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Production History & Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500">A detailed chronological registry of all past cooking batches, final yield percentages, and production diary notes.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sorting control */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setHistorySortOrder('desc')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  historySortOrder === 'desc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Newest first"
              >
                Newest First
              </button>
              <button
                type="button"
                onClick={() => setHistorySortOrder('asc')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  historySortOrder === 'asc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Oldest first"
              >
                Chronological
              </button>
            </div>

            {/* Filter by Recipe */}
            <select
              value={historyRecipeFilter}
              onChange={(e) => setHistoryRecipeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Recipes</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="In Bulk">In Bulk</option>
              <option value="Packed">Packed</option>
            </select>
          </div>
        </div>

        {/* Chronological Table */}
        <div className="overflow-x-auto">
          {filteredHistoryBatches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No batches match the selected filters or sort criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Batch No</th>
                  <th className="px-4 py-3.5">Recipe Formula</th>
                  <th className="px-4 py-3.5">Produced Qty</th>
                  <th className="px-4 py-3.5">Phase Status</th>
                  <th className="px-4 py-3.5">Final Yield</th>
                  <th className="px-4 py-3.5">Raw Material Cost</th>
                  <th className="px-4 py-3.5">Sales Revenue</th>
                  <th className="px-4 py-3.5 bg-indigo-50/60 text-indigo-950 font-black border-x border-indigo-100">Profit/Loss per Batch</th>
                  <th className="px-4 py-3.5">Audit Notes</th>
                  <th className="px-4 py-3.5 text-right">PDF Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHistoryBatches.map((b) => {
                  const r = recipes.find(recipe => recipe.id === b.recipeId);
                  const fin = calculateBatchFinancials(b, r, materials);
                  
                  // Calculate yield efficiency metrics
                  let packingDetails = "N/A";
                  let efficiencyPercent = 100;
                  let efficiencyClass = "text-slate-500";
                  
                  if (b.status === 'Packed') {
                    const sizes = Object.keys(b.actualYieldPackets);
                    if (sizes.length > 0) {
                      const sizeId = sizes[0];
                      const sz = r?.packagingSizes.find(p => p.id === sizeId);
                      const actual = b.actualYieldPackets[sizeId] || 0;
                      const expected = b.expectedYieldPackets[sizeId] || 0;
                      
                      const label = sz ? `${sz.grams}${sz.unit === 'kg' ? 'kg' : sz.unit === 'liter' ? 'L' : sz.unit === 'pieces' ? ' pcs' : sz.unit === 'packs' ? ' packs' : sz.unit === 'bundle' ? ' bundle' : 'g'}` : 'Packs';
                      packingDetails = `${actual} / ${expected} (${label})`;
                      
                      if (expected > 0) {
                        efficiencyPercent = (actual / expected) * 100;
                        if (efficiencyPercent >= 98) {
                          efficiencyClass = "text-emerald-700 bg-emerald-50 border-emerald-100";
                        } else if (efficiencyPercent >= 92) {
                          efficiencyClass = "text-amber-700 bg-amber-50 border-amber-100";
                        } else {
                          efficiencyClass = "text-rose-700 bg-rose-50 border-rose-100";
                        }
                      }
                    }
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-mono">{b.date}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-950 font-bold font-mono">{b.batchNumber}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-900">{r?.name || 'Deleted Recipe'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-mono">{(b.batchSizeGrams / 1000).toFixed(1)} kg</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.status === 'Packed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-900 font-mono font-bold">
                        {b.status === 'Packed' ? packingDetails : <span className="text-slate-400 italic font-normal">Pending Packing</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-800 font-mono font-semibold">
                        ₹{(fin?.rawMaterialCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-emerald-700 font-mono font-semibold">
                        ₹{(fin?.salesRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap bg-indigo-50/30 border-x border-indigo-100 font-mono">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-bold ${
                          fin?.isProfit ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {fin?.isProfit ? '+' : ''}₹{(fin?.profitLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({(fin?.marginPercent || 0).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate" title={b.notes || ''}>
                        {b.notes ? b.notes : <span className="text-slate-300 italic">No notes</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReportInitialTab('workorder');
                            setSelectedReportBatch(b);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-md transition-all cursor-pointer inline-flex items-center space-x-1"
                          title="Print Shop Floor Work Order Sheet for Physical Record Keeping"
                        >
                          <Printer className="w-3 h-3 text-emerald-600" />
                          <span>Work Order Sheet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportInitialTab('financial');
                            setSelectedReportBatch(b);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-md transition-all cursor-pointer inline-flex items-center space-x-1"
                          title="Generate Financial PDF Summary Report"
                        >
                          <FileText className="w-3 h-3 text-indigo-600" />
                          <span>Financials</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Post-Cook Production Workflow Stepper Modal */}
      <PostCookWorkflowModal
        batch={postCookModalBatch}
        recipes={recipes}
        materials={materials}
        isOpen={!!postCookModalBatch}
        onClose={() => setPostCookModalBatch(null)}
        onSaveBatch={(updatedBatch) => {
          if (onEditBatch) {
            onEditBatch(updatedBatch.id, updatedBatch);
          }
          setPostCookModalBatch(updatedBatch);
        }}
      />

      {/* Printable PDF Summary Report Modal */}
      <BatchReportModal
        batch={selectedReportBatch}
        recipes={recipes}
        materials={materials}
        onClose={() => setSelectedReportBatch(null)}
        initialTab={reportInitialTab}
      />
    </div>
  );
}
