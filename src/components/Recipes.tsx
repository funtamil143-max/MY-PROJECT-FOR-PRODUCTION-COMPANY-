import React, { useState } from 'react';
import { Recipe, RawMaterial, PackagingSize } from '../types';
import { 
  Plus, 
  Trash, 
  Layers, 
  Scale, 
  Users, 
  Coins, 
  TrendingUp, 
  Eye, 
  BookOpen, 
  FolderPlus,
  HelpCircle,
  Sliders,
  DollarSign,
  Pencil,
  Search,
  Package,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Paperclip,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { 
  calculateIngredientsCost, 
  calculateTotalBatchCost, 
  calculateLaborCost,
  calculateFoodCostPerGram,
  calculateRecipeTotalWeight,
  calculatePacketFinancials
} from '../utils/calculations';

export const TAMIL_PRODUCT_PRESETS = [
  'ஆறு கண்ணு தேன்குழல் பெரிய சைஸ்',
  'ஆறு கண்ணு தேன்குழல் சின்ன சைஸ்',
  'நாலு கண்ணு தேன்குழல் சிறியது',
  'நாலு கண்ணு தேன்குழல்',
  'பூண்டு முறுக்கு வெள்ளை',
  'பூண்டு முறுக்கு காரம்',
  'ரெண்டு சுத்து அரும்பு முறுக்கு வெள்ளை',
  'ரெண்டு  சுத்து அரும்பு முறுக்கு காரம்',
  'நாலு  சுத்து  அரும்பு முறுக்கு  காரம்',
  'நாலு  சுத்து  அரும்பு முறுக்கு வெள்ள',
  'ஸ்ப்ரிங் அரும்பு முறுக்கு வெள்ளை',
  'ஸ்ப்ரிங் அரும்பு முறுக்கு காரம்',
  'ஆணி முறுக்கு வெள்ளை',
  'ஆணி முறுக்கு காரம்',
  'பீட்ரூட் முறுக்கு',
  'பச்சை புதினா முறுக்கு',
  'ஓம்படி',
  'ஸ்பெஷல் மிச்சர்',
  'சாதா மிக்சர்',
  'பெரிய மிச்சர்',
  'கான்  அவள்  மிக்சர்',
  'காராபூந்தி',
  'வேர்க்கடலை காராபூந்தி',
  'காராசேவு கலர் சேர்க்காமல் சின்ன சைஸ்',
  'காராசேவு கலர்ஸ் சேர்ந்து சின்ன',
  'காராசேவு பெரிய சைஸ் கலர் இல்லாம',
  'காராசேவு பெரிய சைசு கலர் சேர்த்து',
  'மிளகு சேவு',
  'பட்டர் முறுக்கு',
  'ஆணி முறுக்கு',
  'ஓலை பக்கோடா வரியில்லாமல்',
  'வறுத்த கடலை',
  'மசாலா கடலை',
  'நெய் பருப்பு',
  'வெள்ளை பட்டாணி',
  'பச்சை பட்டாணி',
  'உருளைக்கிழங்கு சிப்ஸ்',
  'கான் சிப்ஸ்',
  'வீல் சிப்ஸ்',
  'அப்பள சிப்ஸ்'
];

interface RecipesProps {
  recipes: Recipe[];
  materials: RawMaterial[];
  onAddRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  onEditRecipe?: (id: string, updatedRecipe: Omit<Recipe, 'id'>) => void;
  onDeleteRecipe: (id: string) => void;
  onUpdatePackagingSizes?: (recipeId: string, sizes: PackagingSize[]) => void;
  onClearAllRecipesToZero?: () => void;
  onClearRecipes?: () => void;
  canDelete?: boolean;
}

export default function Recipes({ recipes, materials, onAddRecipe, onEditRecipe, onDeleteRecipe, onUpdatePackagingSizes, onClearAllRecipesToZero, onClearRecipes }: RecipesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(recipes[0]?.id || null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [dropdownSelection, setDropdownSelection] = useState<string>('');
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
  );

  // Form State for Adding Recipe
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseBatchSize, setBaseBatchSize] = useState<number>(10000); // 10kg
  const [producedYieldKg, setProducedYieldKg] = useState<number>(8.5); // Cooked/Produced weight in kg
  const [sellingPricePerKg, setSellingPricePerKg] = useState<number>(250); // Wholesale/Bulk selling price per kg
  const [laborWorkers, setLaborWorkers] = useState<number>(2);
  const [laborWage, setLaborWage] = useState<number>(600);
  const [overhead, setOverhead] = useState<number>(400);
  const [recipeIngredients, setRecipeIngredients] = useState<{ 
    materialId: string; 
    weightGrams: number; 
    inputQty?: number; 
    inputUnit?: 'g' | 'kg' | 'L' | 'pcs' 
  }[]>(() => {
    const firstMatId = materials[0]?.id || '';
    const firstMat = materials[0];
    let defaultUnit: 'g' | 'kg' | 'L' | 'pcs' = 'g';
    if (firstMat) {
      if (firstMat.unit === 'kg' || firstMat.unit === 'L') {
        defaultUnit = firstMat.unit;
      } else if (firstMat.unit === 'pcs') {
        defaultUnit = 'pcs';
      }
    }
    return [{ materialId: firstMatId, weightGrams: 0, inputQty: 0, inputUnit: defaultUnit }];
  });
  const [packagingSizes, setPackagingSizes] = useState<PackagingSize[]>([
    { id: 'size_temp_1', grams: 50, unit: 'gram', packsPerBundle: 10, pouchCost: 1.5, mrp: 20, wholesalePrice: 17, quantityToPack: 100 },
    { id: 'size_temp_2', grams: 100, unit: 'gram', packsPerBundle: 10, pouchCost: 2.2, mrp: 35, wholesalePrice: 30, quantityToPack: 100 }
  ]);

  // Image / Photo Attachment State for Recipe
  const [image, setImage] = useState<string>('');
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
      setImage(dataUrl);
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const activeRecipe = recipes.find(r => r.id === activeRecipeId) || recipes[0];
  const [analyzerPackSize, setAnalyzerPackSize] = useState<number>(50);
  const [analyzerUnit, setAnalyzerUnit] = useState<'gram' | 'kg' | 'liter' | 'pieces' | 'packs' | 'bundle'>('gram');
  const [analyzerPouchCost, setAnalyzerPouchCost] = useState<number>(1.5);
  const [analyzerMRP, setAnalyzerMRP] = useState<number>(20);

  // Active Recipe Produced Yield Output & Selling Price state
  const activeRawWeightKg = activeRecipe ? (calculateRecipeTotalWeight(activeRecipe, materials) / 1000) : 10;
  const [activeProducedYieldKg, setActiveProducedYieldKg] = useState<number>(activeRecipe?.producedYieldKg ?? (activeRawWeightKg > 0 ? activeRawWeightKg : 10));
  const [activeSellingPricePerKg, setActiveSellingPricePerKg] = useState<number>(activeRecipe?.sellingPricePerKg ?? 250);

  // Custom Pack Size & Selling Rate Profit/Loss Simulator state
  const [customPackGrams, setCustomPackGrams] = useState<number>(200);
  const [customPackCount, setCustomPackCount] = useState<number | null>(null);
  const [customPackSellingPrice, setCustomPackSellingPrice] = useState<number>(52);
  const [customPackPouchCost, setCustomPackPouchCost] = useState<number>(2);
  const [customPackedKg, setCustomPackedKg] = useState<number | null>(null);

  const handleAddCustomPackToRecipe = (gramsToUse?: number, priceToUse?: number, pouchToUse?: number) => {
    if (!activeRecipe || !onUpdatePackagingSizes) return;
    const g = gramsToUse ?? customPackGrams;
    const mrp = priceToUse ?? customPackSellingPrice;
    const pouch = pouchToUse ?? customPackPouchCost;
    const unit = g >= 1000 && g % 1000 === 0 ? 'kg' : 'gram';
    const newSize: PackagingSize = {
      id: `size_custom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      grams: g,
      unit: unit,
      pouchCost: pouch,
      mrp: mrp,
      quantityToPack: 100
    };
    const updated = [...(activeRecipe.packagingSizes || []), newSize];
    onUpdatePackagingSizes(activeRecipe.id, updated);
  };

  React.useEffect(() => {
    if (activeRecipe) {
      const rawKg = calculateRecipeTotalWeight(activeRecipe, materials) / 1000;
      setActiveProducedYieldKg(activeRecipe.producedYieldKg !== undefined ? activeRecipe.producedYieldKg : (rawKg > 0 ? rawKg : 10));
      setActiveSellingPricePerKg(activeRecipe.sellingPricePerKg !== undefined ? activeRecipe.sellingPricePerKg : 250);
    }
  }, [activeRecipeId, activeRecipe?.id, activeRecipe?.producedYieldKg, activeRecipe?.sellingPricePerKg, materials]);

  // Sync analyzer state with active recipe's packaging size selection
  const handleSelectPredefinedSize = (size: PackagingSize) => {
    setAnalyzerPackSize(size.grams);
    setAnalyzerUnit(size.unit || 'gram');
    setAnalyzerPouchCost(size.pouchCost);
    setAnalyzerMRP(size.mrp);
  };

  // Auto-activate first recipe of filtered list when search filters out the currently active one
  React.useEffect(() => {
    if (filteredRecipes.length > 0 && !filteredRecipes.some(r => r.id === activeRecipeId)) {
      const firstFiltered = filteredRecipes[0];
      setActiveRecipeId(firstFiltered.id);
      if (firstFiltered.packagingSizes.length > 0) {
        handleSelectPredefinedSize(firstFiltered.packagingSizes[0]);
      }
    }
  }, [recipeSearchQuery, filteredRecipes, activeRecipeId]);

  const handleAddIngredientRow = () => {
    const firstMat = materials.find(m => m.category !== 'Packaging') || materials[0];
    const firstMatId = firstMat?.id || '';
    let defaultUnit: 'g' | 'kg' | 'L' | 'pcs' = 'g';
    if (firstMat) {
      if (firstMat.unit === 'kg' || firstMat.unit === 'L') {
        defaultUnit = firstMat.unit;
      } else if (firstMat.unit === 'pcs') {
        defaultUnit = 'pcs';
      }
    }
    setRecipeIngredients([...recipeIngredients, { materialId: firstMatId, weightGrams: 0, inputQty: 0, inputUnit: defaultUnit }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    if (recipeIngredients.length === 1) return;
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: 'materialId' | 'inputQty' | 'inputUnit', value: string | number) => {
    const updated = [...recipeIngredients];
    const row = { ...updated[index] };

    if (field === 'materialId') {
      const matId = value as string;
      row.materialId = matId;
      const mat = materials.find((m) => m.id === matId);
      if (mat) {
        if (mat.unit === 'kg' || mat.unit === 'L') {
          row.inputUnit = mat.unit;
          row.inputQty = row.weightGrams ? row.weightGrams / 1000 : 1;
          row.weightGrams = row.inputQty * 1000;
        } else if (mat.unit === 'pcs') {
          row.inputUnit = 'pcs';
          row.inputQty = row.weightGrams || 1000;
          row.weightGrams = row.inputQty;
        } else {
          row.inputUnit = 'g';
          row.inputQty = row.weightGrams || 1000;
          row.weightGrams = row.inputQty;
        }
      }
    } else if (field === 'inputQty') {
      const qty = Math.max(0, Number(value));
      row.inputQty = qty;
      const unit = row.inputUnit || 'g';
      if (unit === 'kg' || unit === 'L') {
        row.weightGrams = qty * 1000;
      } else {
        row.weightGrams = qty;
      }
    } else if (field === 'inputUnit') {
      const unit = value as 'g' | 'kg' | 'L' | 'pcs';
      row.inputUnit = unit;
      const qty = row.inputQty !== undefined ? row.inputQty : (row.weightGrams / (unit === 'kg' || unit === 'L' ? 1000 : 1));
      row.inputQty = qty;
      if (unit === 'kg' || unit === 'L') {
        row.weightGrams = qty * 1000;
      } else {
        row.weightGrams = qty;
      }
    }

    updated[index] = row;
    setRecipeIngredients(updated);
  };

  const handleEditClick = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setName(recipe.name);
    if (TAMIL_PRODUCT_PRESETS.includes(recipe.name)) {
      setDropdownSelection(recipe.name);
    } else {
      setDropdownSelection('custom');
    }
    setDescription(recipe.description || '');
    setBaseBatchSize(recipe.baseBatchSizeGrams);
    const rawKg = calculateRecipeTotalWeight(recipe, materials) / 1000;
    setProducedYieldKg(recipe.producedYieldKg !== undefined ? recipe.producedYieldKg : (rawKg > 0 ? rawKg : 10));
    setSellingPricePerKg(recipe.sellingPricePerKg !== undefined ? recipe.sellingPricePerKg : 250);
    setLaborWorkers(recipe.laborWorkersCount);
    setLaborWage(recipe.laborDailyWage);
    setOverhead(recipe.overheadCost);
    setImage(recipe.image || '');

    if (recipe.ingredients.length > 0) {
      setRecipeIngredients(
        recipe.ingredients.map(ing => {
          const mat = materials.find(m => m.id === ing.materialId);
          const isKgOrL = mat?.unit === 'kg' || mat?.unit === 'L';
          return {
            materialId: ing.materialId,
            weightGrams: ing.weightGrams,
            inputQty: isKgOrL ? ing.weightGrams / 1000 : ing.weightGrams,
            inputUnit: (isKgOrL ? mat?.unit : (mat?.unit === 'pcs' ? 'pcs' : 'g')) as 'g' | 'kg' | 'L' | 'pcs'
          };
        })
      );
    }
    if (recipe.packagingSizes && recipe.packagingSizes.length > 0) {
      setPackagingSizes(recipe.packagingSizes);
    }
    setIsAdding(true);

    const formEl = document.getElementById('create-recipe-form') || document.getElementById('add-recipe-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmitRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || recipeIngredients.length === 0) return;

    const recipeData = {
      name: name.trim(),
      description: description.trim(),
      baseBatchSizeGrams: Number(baseBatchSize),
      producedYieldKg: Number(producedYieldKg),
      sellingPricePerKg: Number(sellingPricePerKg),
      laborDailyWage: Number(laborWage),
      laborWorkersCount: Number(laborWorkers),
      overheadCost: Number(overhead),
      image: image || undefined,
      ingredients: recipeIngredients.map(ing => ({
        materialId: ing.materialId,
        weightGrams: Number(ing.weightGrams)
      })),
      packagingSizes: packagingSizes.map((p, idx) => ({
        id: p.id.startsWith('size_temp') ? `size_${Date.now()}_${idx}` : p.id,
        grams: Number(p.grams),
        unit: p.unit || 'gram',
        packsPerBundle: Number(p.packsPerBundle) || 10,
        pouchCost: Number(p.pouchCost),
        mrp: Number(p.mrp),
        wholesalePrice: p.wholesalePrice !== undefined ? Number(p.wholesalePrice) : Math.round(Number(p.mrp) * 0.85),
        quantityToPack: Number(p.quantityToPack) || 100
      }))
    };

    if (editingRecipeId && onEditRecipe) {
      onEditRecipe(editingRecipeId, recipeData);
      setEditingRecipeId(null);
    } else {
      onAddRecipe(recipeData);
    }

    // Reset Form
    setName('');
    setDropdownSelection('');
    setDescription('');
    setBaseBatchSize(10000);
    setLaborWorkers(2);
    setLaborWage(600);
    setOverhead(400);
    setImage('');
    const firstMatId = materials[0]?.id || '';
    const firstMat = materials[0];
    let defaultUnit: 'g' | 'kg' | 'L' | 'pcs' = 'g';
    if (firstMat) {
      if (firstMat.unit === 'kg' || firstMat.unit === 'L') {
        defaultUnit = firstMat.unit;
      } else if (firstMat.unit === 'pcs') {
        defaultUnit = 'pcs';
      }
    }
    setRecipeIngredients([{ materialId: firstMatId, weightGrams: 0, inputQty: 0, inputUnit: defaultUnit }]);
    setPackagingSizes([{ id: 'size_temp_1', grams: 50, unit: 'gram', pouchCost: 1.5, mrp: 20, quantityToPack: 100 }]);
    setIsAdding(false);
  };

  const handleExportExcel = () => {
    const exportData: Record<string, any>[] = [];
    recipes.forEach((r) => {
      const rawCost = calculateIngredientsCost(r, materials);
      const labCost = calculateLaborCost(r);
      const totCost = calculateTotalBatchCost(r, materials);
      const totWt = calculateRecipeTotalWeight(r, materials);
      const costPerG = calculateFoodCostPerGram(r, materials);
      
      exportData.push({
        'Recipe ID': r.id,
        'Product Name': r.name,
        'Description': r.description || '-',
        'Base Batch Size (g)': r.baseBatchSizeGrams,
        'Produced Yield (kg)': r.producedYieldKg || (totWt / 1000),
        'Total Raw Mat Cost (₹)': Math.round(rawCost * 100) / 100,
        'Labor Cost (₹)': Math.round(labCost * 100) / 100,
        'Overhead Cost (₹)': r.overheadCost || 0,
        'Total Batch Cost (₹)': Math.round(totCost * 100) / 100,
        'Cost per Kg (₹)': Math.round(costPerG * 1000 * 100) / 100,
        'Number of Ingredients': r.ingredients.length,
        'Packaging Sizes Count': r.packagingSizes?.length || 0
      });
    });
    exportToExcel(exportData, `Recipes_Formulas_${new Date().toISOString().split('T')[0]}`, 'Recipes List');
  };

  return (
    <div className="space-y-6" id="recipe-book-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recipe Book & Costing Analyzer</h2>
          <p className="text-sm text-slate-500">Configure ingredient formulations, labor burden, and study unit-packet profitability.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Export recipes and formula costs to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          {recipes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear all ingredient entries across ALL recipes to 0 grams?")) {
                  if (onClearAllRecipesToZero) {
                    onClearAllRecipesToZero();
                  } else if (onEditRecipe) {
                    recipes.forEach(r => {
                      onEditRecipe(r.id, {
                        name: r.name,
                        description: r.description,
                        baseBatchSizeGrams: r.baseBatchSizeGrams,
                        producedYieldKg: r.producedYieldKg,
                        sellingPricePerKg: r.sellingPricePerKg,
                        laborDailyWage: r.laborDailyWage,
                        laborWorkersCount: r.laborWorkersCount,
                        overheadCost: r.overheadCost,
                        ingredients: r.ingredients.map(ing => ({ ...ing, weightGrams: 0 })),
                        packagingSizes: r.packagingSizes
                      });
                    });
                  }
                  setRecipeIngredients(prev => prev.map(ing => ({ ...ing, weightGrams: 0, inputQty: 0 })));
                }
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              title="Set all ingredient quantities in all recipes to 0 grams"
            >
              <Trash className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All Recipes to 0g</span>
            </button>
          )}
          {onClearRecipes && recipes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Delete all recipe formulations"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Clear Recipes</span>
            </button>
          )}
          <button
            id="new-recipe-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Formulate New Recipe</span>
          </button>
        </div>
      </div>

      {/* Clear Recipes Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Clear All Recipes?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete all {recipes.length} recipe formulations and product formulas?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearRecipes) {
                    onClearRecipes();
                  }
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Yes, Clear All Recipes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe Wizard Panel */}
      {isAdding && (
        <form 
          id="create-recipe-form"
          onSubmit={handleSubmitRecipe} 
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6"
        >
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {editingRecipeId ? `Edit Recipe Formula: ${name}` : 'Formula Engineering Form'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product Name</label>
                <select
                  value={dropdownSelection}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDropdownSelection(val);
                    if (val !== 'custom') {
                      setName(val);
                    } else {
                      setName('');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Product Name --</option>
                  {TAMIL_PRODUCT_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                  <option value="custom">✍️ Custom Product Name...</option>
                </select>
              </div>

              {(dropdownSelection === 'custom' || (name && !TAMIL_PRODUCT_PRESETS.includes(name))) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Custom Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Garlic Kara Sev"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description / Method</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the snack properties, frying temperatures or spice notes."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Recipe Photo Attachment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  Product / Recipe Photo
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {image ? (
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                  <img
                    src={image}
                    alt="Recipe Product"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-xs hover:opacity-90"
                    onClick={() => setPreviewImage(image)}
                  />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" /> Photo Attached
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(image)}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Take Photo</span>
                  </button>

                  <label className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-2xs">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Recipe Ingredients */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Food Formulation Mix</h4>
            <div className="space-y-2">
              {recipeIngredients.map((row, idx) => {
                const rowMat = materials.find(m => m.id === row.materialId);
                const rowCost = rowMat ? (row.weightGrams * rowMat.averageCostPerGram) : 0;

                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={row.materialId}
                        onChange={(e) => handleIngredientChange(idx, 'materialId', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                      >
                        {[...materials]
                          .filter(m => m.category !== 'Packaging')
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Current: ₹{(m.averageCostPerGram * 1000).toFixed(1)}/kg)
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <input
                          type="number"
                          step="any"
                          value={row.inputQty !== undefined ? row.inputQty : (row.inputUnit === 'kg' || row.inputUnit === 'L' ? row.weightGrams / 1000 : row.weightGrams)}
                          onChange={(e) => handleIngredientChange(idx, 'inputQty', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-right font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          required
                        />
                      </div>
                      <div className="w-28">
                        <select
                          value={row.inputUnit || 'g'}
                          onChange={(e) => handleIngredientChange(idx, 'inputUnit', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-700 cursor-pointer"
                        >
                          <option value="g">gram (g)</option>
                          <option value="kg">kg (Kilograms)</option>
                          <option value="L">liter (L)</option>
                          <option value="pcs">pieces (pcs)</option>
                        </select>
                      </div>
                      <div className="w-24 text-right text-[10px] font-mono whitespace-nowrap">
                        {(row.inputUnit === 'kg' || row.inputUnit === 'L') ? (
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100/40">
                            {(row.weightGrams || 0).toLocaleString()} g
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {(row.weightGrams || 0).toLocaleString()} {row.inputUnit === 'pcs' ? 'pcs' : 'g'}
                          </span>
                        )}
                      </div>
                      <div className="w-28 text-right font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 rounded-md shadow-xs">
                        ₹{(rowCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      disabled={recipeIngredients.length === 1}
                      className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 rounded-md cursor-pointer ml-auto"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddIngredientRow}
                  className="px-2.5 py-1 text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Ingredient</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipeIngredients(recipeIngredients.map(ing => ({
                      ...ing,
                      weightGrams: 0,
                      inputQty: 0
                    })));
                  }}
                  className="px-2.5 py-1 text-xs font-bold border border-rose-200 text-rose-700 hover:bg-rose-100 bg-rose-50/80 rounded-lg flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                  title="Clear all ingredient quantities in this form to 0 grams"
                >
                  <Trash className="w-3 h-3 text-rose-600" />
                  <span>Clear All Entries to 0g</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 bg-emerald-50/50 border border-emerald-100/50 px-3 py-1.5 rounded-xl self-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Total Mix Cost:</span>
                <span className="text-xs font-black font-mono text-emerald-700">
                  ₹{recipeIngredients.reduce((total, row) => {
                    const mat = materials.find(m => m.id === row.materialId);
                    return total + (row.weightGrams * (mat?.averageCostPerGram || 0));
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingRecipeId(null);
                setName('');
                setDropdownSelection('');
                setDescription('');
                setBaseBatchSize(10000);
                setLaborWorkers(2);
                setLaborWage(600);
                setOverhead(400);
                const firstMatId = materials[0]?.id || '';
                const firstMat = materials[0];
                let defaultUnit: 'g' | 'kg' | 'L' | 'pcs' = 'g';
                if (firstMat) {
                  if (firstMat.unit === 'kg' || firstMat.unit === 'L') {
                    defaultUnit = firstMat.unit;
                  } else if (firstMat.unit === 'pcs') {
                    defaultUnit = 'pcs';
                  }
                }
                setRecipeIngredients([{ materialId: firstMatId, weightGrams: 0, inputQty: 0, inputUnit: defaultUnit }]);
                setPackagingSizes([{ id: 'size_temp_1', grams: 50, pouchCost: 1.5, mrp: 20 }]);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              {editingRecipeId ? 'Update Formula Details' : 'Commit Recipe Book'}
            </button>
          </div>
        </form>
      )}

      {/* Mobile-Friendly Recipe Selector Dropdown (Visible only on smaller screens) */}
      <div className="lg:hidden bg-slate-900 border border-slate-800 text-white p-4.5 rounded-xl shadow-sm space-y-3" id="mobile-recipe-selector">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Quick Select Recipe (Tamil / English)
        </label>
        
        {recipes.length > 0 && (
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            {recipeSearchQuery && (
              <button
                type="button"
                onClick={() => setRecipeSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 text-[10px] font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <select
          value={activeRecipeId || ''}
          onChange={(e) => {
            const rId = e.target.value;
            setActiveRecipeId(rId);
            const found = recipes.find(r => r.id === rId);
            if (found && found.packagingSizes.length > 0) {
              handleSelectPredefinedSize(found.packagingSizes[0]);
            }
          }}
          className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-850 border border-slate-700 rounded-lg text-slate-100 focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 transition-all cursor-pointer shadow-xs"
        >
          {filteredRecipes.length === 0 ? (
            <option value="" className="bg-slate-900 text-slate-400 font-semibold">
              {recipes.length === 0 ? "No Recipes - Please Add One Above" : "No Matching Recipes"}
            </option>
          ) : (
            filteredRecipes.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-900 text-white font-semibold">
                {r.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Main Recipe Book Layout: Left sidebar, Right details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List (Visible only on desktop screens) */}
        <div className="hidden lg:block space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipe Book Index</h3>
            {recipes.length > 0 && (
              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                {filteredRecipes.length} of {recipes.length}
              </span>
            )}
          </div>

          {/* Search Input for Desktop */}
          {recipes.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                placeholder="Search recipe library..."
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {recipeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRecipeSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
              <p className="text-xs text-slate-500 font-medium">No recipe formulas formulated yet.</p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
              >
                + Formulate First Mix
              </button>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-500 font-medium">No matches found for "{recipeSearchQuery}".</p>
              <button
                type="button"
                onClick={() => setRecipeSearchQuery('')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredRecipes.map((r) => {
              const isActive = r.id === activeRecipeId;
              const totalCost = calculateTotalBatchCost(r, materials);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRecipeId(r.id);
                    // Autofill analyzer with first pack size
                    if (r.packagingSizes.length > 0) {
                      handleSelectPredefinedSize(r.packagingSizes[0]);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex justify-between items-center cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {r.image ? (
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-10 h-10 object-cover rounded-lg border border-white/20 shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-indigo-500/50 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        {r.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm tracking-tight">{r.name}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                        Base size: {(r.baseBatchSizeGrams / 1000).toFixed(0)}kg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>Est. Batch Cost</p>
                    <p className="font-bold text-sm font-mono">₹{totalCost.toFixed(0)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Details Section */}
        {activeRecipe ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Description */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  {activeRecipe.image ? (
                    <img
                      src={activeRecipe.image}
                      alt={activeRecipe.name}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-300 shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                      onClick={() => setPreviewImage(activeRecipe.image!)}
                      title="Click to view full photo"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEditClick(activeRecipe)}
                      className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200 flex flex-col items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Add Photo"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5">+ Photo</span>
                    </button>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{activeRecipe.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">{activeRecipe.description || 'No description added yet.'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {onEditRecipe && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Set all ingredient entries in "${activeRecipe.name}" to 0 grams?`)) {
                          onEditRecipe(activeRecipe.id, {
                            name: activeRecipe.name,
                            description: activeRecipe.description,
                            baseBatchSizeGrams: activeRecipe.baseBatchSizeGrams,
                            producedYieldKg: activeRecipe.producedYieldKg,
                            sellingPricePerKg: activeRecipe.sellingPricePerKg,
                            laborDailyWage: activeRecipe.laborDailyWage,
                            laborWorkersCount: activeRecipe.laborWorkersCount,
                            overheadCost: activeRecipe.overheadCost,
                            ingredients: activeRecipe.ingredients.map(ing => ({ ...ing, weightGrams: 0 })),
                            packagingSizes: activeRecipe.packagingSizes
                          });
                          if (editingRecipeId === activeRecipe.id) {
                            setRecipeIngredients(prev => prev.map(ing => ({ ...ing, weightGrams: 0, inputQty: 0 })));
                          }
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-all cursor-pointer flex items-center space-x-1"
                      title="Set all ingredient quantities in this recipe to 0 grams"
                    >
                      <Trash className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear to 0g</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEditClick(activeRecipe)}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Formula</span>
                  </button>
                  <button
                    onClick={() => {
                      if (recipes.length === 1) {
                        alert("Cannot delete the last remaining recipe.");
                        return;
                      }
                      if (confirm(`Delete recipe "${activeRecipe.name}"?`)) {
                        onDeleteRecipe(activeRecipe.id);
                        setActiveRecipeId(recipes.find(r => r.id !== activeRecipe.id)?.id || null);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all cursor-pointer"
                  >
                    Delete Formula
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Costing Breakdown Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Formula Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Scale className="w-4 h-4 text-indigo-500" />
                  <span>Formula Mix (per {activeRecipe.baseBatchSizeGrams / 1000}kg batch)</span>
                </h4>

                <div className="divide-y divide-slate-100 text-xs">
                  {activeRecipe.ingredients.map((ing, idx) => {
                    const mat = materials.find(m => m.id === ing.materialId);
                    const cost = (ing.weightGrams * (mat?.averageCostPerGram || 0));
                    const totalWeight = calculateRecipeTotalWeight(activeRecipe, materials);
                    return (
                      <div key={idx} className="py-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{mat?.name || 'Deleted Material'}</p>
                          <p className="text-[10px] text-slate-400">
                            Proportion: {totalWeight > 0 ? ((ing.weightGrams / totalWeight) * 100).toFixed(1) : '0.0'}%
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-semibold text-slate-900">{ing.weightGrams}g</p>
                          <p className="text-[10px] text-slate-500">₹{cost.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary row */}
                  <div className="py-2.5 pt-4 flex justify-between items-center text-slate-900 font-bold">
                    <span>Total Raw Ingredients</span>
                    <span className="font-mono">{calculateRecipeTotalWeight(activeRecipe, materials)}g / ₹{calculateIngredientsCost(activeRecipe, materials).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Burden/Labor Cost Table & Yield Sales Value Calculator - Landscape View */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5 col-span-1 md:col-span-2" id="batch-burden-yield-sales-panel">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <span>Batch Burden Split & Produced Sales Calculator</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span>Labor: <strong className="text-slate-900">₹{calculateLaborCost(activeRecipe).toFixed(2)}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Overhead: <strong className="text-slate-900">₹{activeRecipe.overheadCost.toFixed(2)}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Total Batch Cost: <strong className="text-emerald-700">₹{calculateTotalBatchCost(activeRecipe, materials).toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* 2-COLUMN LANDSCAPE GRID FOR BURDEN & YIELD CALCULATOR */}
                {(() => {
                  const totalCost = calculateTotalBatchCost(activeRecipe, materials);
                  const costPerProducedKg = activeProducedYieldKg > 0 ? totalCost / activeProducedYieldKg : 0;
                  const exactSalesValue = activeProducedYieldKg * activeSellingPricePerKg;
                  const netProfit = exactSalesValue - totalCost;
                  const profitMarginPercent = exactSalesValue > 0 ? (netProfit / exactSalesValue) * 100 : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Left Landscape Column: Burden Split */}
                        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                          <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>1. Batch Burden Breakdown</span>
                          </h5>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                              <span className="text-slate-600">Labor Burden</span>
                              <span className="font-bold text-slate-900 font-mono">₹{calculateLaborCost(activeRecipe).toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 -mt-1 leading-tight">
                              ({activeRecipe.laborWorkersCount} workers × ₹{activeRecipe.laborDailyWage} daily wage)
                            </p>

                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                              <span className="text-slate-600">Fixed Overhead</span>
                              <span className="font-bold text-slate-900 font-mono">₹{activeRecipe.overheadCost.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                              <span className="text-slate-600">Raw Input Food Weight</span>
                              <span className="font-bold text-slate-900 font-mono">{(calculateRecipeTotalWeight(activeRecipe, materials) / 1000).toFixed(1)} kg</span>
                            </div>

                            <div className="flex justify-between items-center py-1 pt-1.5 text-emerald-900 font-bold">
                              <span>Exact Cost / Produced KG</span>
                              <span className="font-mono text-sm">₹{costPerProducedKg.toFixed(2)} / kg</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Landscape Column: Produced Output & Sales Rate Inputs */}
                        <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-3 flex flex-col justify-between">
                          <h5 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                            <Scale className="w-3.5 h-3.5 text-emerald-600" />
                            <span>2. Output Yield & Bulk Sales Value</span>
                          </h5>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                                  Produced Output (kg)
                                </label>
                                <span className="text-[10px] text-emerald-700 block">Output yield for formula</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={activeProducedYieldKg}
                                  onChange={(e) => {
                                    const val = Math.max(0.1, Number(e.target.value));
                                    setActiveProducedYieldKg(val);
                                    if (onEditRecipe) {
                                      onEditRecipe(activeRecipe.id, {
                                        ...activeRecipe,
                                        producedYieldKg: val,
                                        sellingPricePerKg: activeSellingPricePerKg
                                      });
                                    }
                                  }}
                                  className="w-24 px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-emerald-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-right shadow-2xs"
                                />
                                <span className="text-xs font-bold text-emerald-900">kg</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t border-emerald-200/60 pt-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                                  Selling Rate (₹/kg)
                                </label>
                                <span className="text-[10px] text-slate-500 block">Selling rate per produced kg</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-xs font-bold text-slate-600">₹</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={activeSellingPricePerKg}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value));
                                    setActiveSellingPricePerKg(val);
                                    if (onEditRecipe) {
                                      onEditRecipe(activeRecipe.id, {
                                        ...activeRecipe,
                                        producedYieldKg: activeProducedYieldKg,
                                        sellingPricePerKg: val
                                      });
                                    }
                                  }}
                                  className="w-24 px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-right shadow-2xs"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-emerald-200/80 shadow-2xs font-bold">
                              <span className="text-emerald-900 text-xs">Exact Sales Value to Get:</span>
                              <span className="font-mono text-emerald-700 text-base">₹{(exactSalesValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CUSTOMIZABLE PACK SIZE & SELLING PRICE PROFIT/LOSS CALCULATOR */}
                      <div className="p-4 bg-white/95 rounded-xl border border-emerald-300/80 shadow-xs space-y-3" id="custom-pack-profit-loss-simulator">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-emerald-100 pb-2">
                                <div className="flex items-center space-x-1.5">
                                  <Package className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Custom Pack Profit & Loss Simulator
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                                  Batch Yield: {activeProducedYieldKg} kg
                                </span>
                              </div>

                              {/* Quick Preset Buttons */}
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Quick Select Pack Size:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {[100, 150, 200, 250, 400, 500, 1000].map((g) => {
                                    const isSelected = customPackGrams === g;
                                    return (
                                      <button
                                        key={g}
                                        type="button"
                                        onClick={() => {
                                          setCustomPackGrams(g);
                                          const derivedPrice = Math.round(((g / 1000) * activeSellingPricePerKg) + customPackPouchCost);
                                          setCustomPackSellingPrice(derivedPrice);
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold rounded-md font-mono transition-all cursor-pointer ${
                                          isSelected 
                                            ? 'bg-emerald-600 text-white shadow-2xs' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {g >= 1000 ? `${g/1000}kg` : `${g}g`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Editable Pack Parameters & Packing Usage Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                    Pack Size (Grams)
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={customPackGrams}
                                      onChange={(e) => {
                                        const g = Math.max(1, Number(e.target.value));
                                        setCustomPackGrams(g);
                                        if (customPackCount !== null) {
                                          setCustomPackedKg(Number(((customPackCount * g) / 1000).toFixed(3)));
                                        }
                                        const derived = Math.round(((g / 1000) * activeSellingPricePerKg) + customPackPouchCost);
                                        setCustomPackSellingPrice(derived);
                                      }}
                                      className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">g</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 mb-1 flex justify-between">
                                    <span>Number of Packs</span>
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder={customPackGrams > 0 ? (activeProducedYieldKg * 1000 / customPackGrams).toFixed(0) : "0"}
                                      value={customPackCount !== null ? customPackCount : Math.round((customPackedKg !== null ? customPackedKg : activeProducedYieldKg) * 1000 / (customPackGrams || 1))}
                                      onChange={(e) => {
                                        const count = Math.max(0, Number(e.target.value));
                                        setCustomPackCount(count);
                                        setCustomPackedKg(Number(((count * customPackGrams) / 1000).toFixed(3)));
                                      }}
                                      className="w-full px-2 py-1 text-xs font-mono font-bold text-indigo-950 bg-indigo-50/80 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] font-bold text-indigo-600">Packs</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-700 mb-1 flex justify-between">
                                    <span>Total KG Packed</span>
                                    {(customPackedKg !== null || customPackCount !== null) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomPackedKg(null);
                                          setCustomPackCount(null);
                                        }}
                                        className="text-[9px] text-indigo-600 underline font-semibold cursor-pointer"
                                        title="Reset to full batch yield"
                                      >
                                        Reset ({activeProducedYieldKg}kg)
                                      </button>
                                    )}
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={customPackedKg !== null ? customPackedKg : activeProducedYieldKg}
                                      onChange={(e) => {
                                        const kg = Math.max(0, Number(e.target.value));
                                        setCustomPackedKg(kg);
                                        setCustomPackCount(customPackGrams > 0 ? Math.round((kg * 1000) / customPackGrams) : 0);
                                      }}
                                      className="w-full px-2 py-1 text-xs font-mono font-bold text-indigo-950 bg-indigo-50/60 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">kg</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                    Pouch / Bag Cost (₹)
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] font-bold text-slate-500">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={customPackPouchCost}
                                      onChange={(e) => setCustomPackPouchCost(Math.max(0, Number(e.target.value)))}
                                      className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-900 mb-1 flex justify-between">
                                    <span>Selling Price (₹)</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const derived = Math.round(((customPackGrams / 1000) * activeSellingPricePerKg) + customPackPouchCost);
                                        setCustomPackSellingPrice(derived);
                                      }}
                                      className="text-[9px] text-emerald-700 underline font-semibold cursor-pointer"
                                      title="Auto-fill from bulk selling rate"
                                    >
                                      Auto @ ₹{activeSellingPricePerKg}/kg
                                    </button>
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs font-bold text-emerald-700">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={customPackSellingPrice}
                                      onChange={(e) => setCustomPackSellingPrice(Math.max(0, Number(e.target.value)))}
                                      className="w-full px-2 py-1 text-xs font-mono font-bold text-emerald-950 bg-emerald-50 border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-600"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Computed Profit & Loss + Grams Used & Remaining Yield Breakdown */}
                              {(() => {
                                const customPackKg = customPackGrams / 1000;
                                const packedKgUsed = customPackedKg !== null ? customPackedKg : activeProducedYieldKg;
                                const totalGramsPacked = packedKgUsed * 1000;
                                const totalPacksFromYield = customPackKg > 0 ? (packedKgUsed / customPackKg) : 0;
                                const packCountDisplay = customPackCount !== null ? customPackCount : Math.round(totalPacksFromYield);
                                const foodCostPerCustomPack = costPerProducedKg * customPackKg;
                                const totalCostPerCustomPack = foodCostPerCustomPack + customPackPouchCost;
                                const netProfitPerPack = customPackSellingPrice - totalCostPerCustomPack;
                                const marginPercent = customPackSellingPrice > 0 ? (netProfitPerPack / customPackSellingPrice) * 100 : 0;
                                const totalBatchRevenue = totalPacksFromYield * customPackSellingPrice;
                                const totalPackedFoodCost = packedKgUsed * costPerProducedKg;
                                const totalBatchPackProfit = totalBatchRevenue - (totalPackedFoodCost + (totalPacksFromYield * customPackPouchCost));

                                const leftoverKg = activeProducedYieldKg - packedKgUsed;
                                const leftoverGrams = leftoverKg * 1000;
                                const packedRatioPercent = activeProducedYieldKg > 0 ? (packedKgUsed / activeProducedYieldKg) * 100 : 0;
                                const leftoverRatioPercent = activeProducedYieldKg > 0 ? (leftoverKg / activeProducedYieldKg) * 100 : 0;

                                const additionalPacksPossible = customPackKg > 0 && leftoverKg > 0 ? Math.floor(leftoverKg / customPackKg) : 0;
                                const remainderAfterPacksGrams = customPackKg > 0 && leftoverKg > 0 ? (leftoverGrams - (additionalPacksPossible * customPackGrams)) : 0;

                                return (
                                  <div className="space-y-3 pt-1 border-t border-emerald-100">
                                    {/* 4-COLUMN EXACT PACKAGING BALANCE SHEET */}
                                    <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 shadow-2xs space-y-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-indigo-200/60 pb-2">
                                        <div className="flex items-center space-x-1.5">
                                          <Package className="w-4 h-4 text-indigo-700" />
                                          <span className="font-extrabold text-indigo-950 uppercase tracking-wider text-xs">
                                            Product Yield vs Package Balance Sheet
                                          </span>
                                        </div>
                                        <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
                                          Pack Size: {customPackGrams}g ({customPackKg} kg)
                                        </span>
                                      </div>

                                      {/* 3-COLUMN OVERVIEW & STANDALONE LEFTOVER & RATIO CALCULATOR CARD */}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                                        {/* Column 1: Total Produced */}
                                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            1. Total Batch Produced
                                          </span>
                                          <p className="font-mono font-extrabold text-slate-900 text-base">
                                            {activeProducedYieldKg.toFixed(2)} kg
                                          </p>
                                          <p className="text-[10px] text-slate-500 font-mono font-semibold">
                                            {((activeProducedYieldKg || 0) * 1000).toLocaleString('en-IN')} grams (100% Yield Base)
                                          </p>
                                        </div>

                                        {/* Column 2: Total Packed */}
                                        <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-1">
                                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                                            2. Product Packed Quantity
                                          </span>
                                          <p className="font-mono font-extrabold text-indigo-950 text-base">
                                            {packedKgUsed.toFixed(2)} kg
                                          </p>
                                          <p className="text-[10px] text-indigo-700 font-mono font-bold">
                                            {packCountDisplay} Packs × {customPackGrams}g ({packedRatioPercent.toFixed(1)}% Packed)
                                          </p>
                                        </div>

                                        {/* Column 3: Production Plan & Actionable Advice */}
                                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            3. Production Plan & Advice
                                          </span>
                                          {leftoverKg > 0.001 ? (
                                            <>
                                              <p className="font-mono font-bold text-emerald-800 text-xs">
                                                Plan +{additionalPacksPossible} More {customPackGrams}g Packs
                                              </p>
                                              <p className="text-[10px] text-slate-500 font-mono">
                                                {remainderAfterPacksGrams > 0 
                                                  ? `+${remainderAfterPacksGrams.toFixed(0)}g loose surplus` 
                                                  : 'Exact pack fit'}
                                              </p>
                                            </>
                                          ) : Math.abs(leftoverKg) <= 0.001 ? (
                                            <>
                                              <p className="font-mono font-bold text-indigo-900 text-xs">
                                                100% Balanced Yield
                                              </p>
                                              <p className="text-[10px] text-slate-500 font-mono">
                                                Zero leftover waste
                                              </p>
                                            </>
                                          ) : (
                                            <>
                                              <p className="font-mono font-bold text-rose-700 text-xs">
                                                Need +{Math.abs(leftoverKg).toFixed(2)} kg Raw Material
                                              </p>
                                              <p className="text-[10px] text-slate-500 font-mono">
                                                To fulfill target packs
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* SEPARATE STANDALONE LEFTOVER & PRODUCTION RATIO CALCULATOR CARD */}
                                      <div id="standalone-ratio-calculator-card" className={`p-4 rounded-xl border shadow-md space-y-3 transition-all ${
                                        leftoverKg > 0.001 
                                          ? 'bg-gradient-to-br from-emerald-50 via-teal-50/80 to-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500/20' 
                                          : Math.abs(leftoverKg) <= 0.001 
                                            ? 'bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                                            : 'bg-gradient-to-br from-rose-50 via-orange-50/80 to-rose-100/70 border-rose-400 ring-2 ring-rose-500/20'
                                      }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300/60 pb-2">
                                          <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                                              <span>📊 Separate Leftover & Ratio Calculator</span>
                                            </span>
                                            <p className="text-[10px] text-slate-600 font-medium">Exact breakdown of total production batch vs packed quantity</p>
                                          </div>
                                          <div className="flex items-center space-x-1.5">
                                            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                                              Packed: {packedRatioPercent.toFixed(1)}%
                                            </span>
                                            <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xs ${
                                              leftoverKg > 0.001 
                                                ? 'bg-emerald-600 text-white' 
                                                : Math.abs(leftoverKg) <= 0.001 
                                                  ? 'bg-indigo-900 text-white' 
                                                  : 'bg-rose-600 text-white'
                                            }`}>
                                              Leftover: {leftoverRatioPercent.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                          {/* Step 1: Total Batch */}
                                          <div className="bg-white/90 p-3 rounded-lg border border-slate-200 shadow-2xs">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Batch Yield (100%)</span>
                                            <p className="font-mono font-black text-slate-900 text-base mt-0.5">{activeProducedYieldKg.toFixed(2)} kg</p>
                                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{((activeProducedYieldKg || 0) * 1000).toLocaleString('en-IN')} grams</p>
                                          </div>

                                          {/* Step 2: Total Packed */}
                                          <div className="bg-white/90 p-3 rounded-lg border border-indigo-200 shadow-2xs">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase block">Packed Quantity</span>
                                            <p className="font-mono font-black text-indigo-950 text-base mt-0.5">{packedKgUsed.toFixed(2)} kg</p>
                                            <p className="text-[10px] font-mono text-indigo-700 mt-0.5">{packCountDisplay} packs × {customPackGrams}g</p>
                                          </div>

                                          {/* Step 3: Exact Leftover (KG & Grams) */}
                                          <div className={`p-3 rounded-lg border shadow-2xs ${
                                            leftoverKg > 0.001 
                                              ? 'bg-emerald-100/90 border-emerald-300' 
                                              : Math.abs(leftoverKg) <= 0.001 
                                                ? 'bg-indigo-100/90 border-indigo-300' 
                                                : 'bg-rose-100/90 border-rose-300'
                                          }`}>
                                            <span className="text-[10px] font-bold uppercase block text-slate-800">Exact Leftover</span>
                                            <p className={`font-mono font-black text-base mt-0.5 ${
                                              leftoverKg > 0.001 ? 'text-emerald-950' : Math.abs(leftoverKg) <= 0.001 ? 'text-indigo-950' : 'text-rose-950'
                                            }`}>
                                              {leftoverKg >= 0 ? `+${leftoverKg.toFixed(2)} kg` : `-${Math.abs(leftoverKg).toFixed(2)} kg`}
                                            </p>
                                            <p className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                                              {leftoverKg >= 0 
                                                ? `${(leftoverGrams || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} grams remaining` 
                                                : `${(Math.abs(leftoverGrams) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} grams deficit`}
                                            </p>
                                          </div>

                                          {/* Step 4: Leftover Packs Calculation */}
                                          <div className="bg-white/90 p-3 rounded-lg border border-slate-200 shadow-2xs">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase block">Possible Extra Packs</span>
                                            <p className="font-mono font-black text-slate-900 text-base mt-0.5">
                                              {leftoverKg > 0 ? `+${additionalPacksPossible} Packs` : '0 Packs'}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                                              {leftoverKg > 0 ? `@ ${customPackGrams}g per pack` : 'No excess'}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Ratio Visual Scale & Mathematical Calculation Formula Box */}
                                        <div className="bg-white/80 p-3 rounded-lg border border-slate-200 space-y-2">
                                          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                                            <span className="text-indigo-800">Packed Ratio: {packedRatioPercent.toFixed(1)}% ({packedKgUsed.toFixed(2)} kg)</span>
                                            <span className={leftoverKg >= 0 ? "text-emerald-800" : "text-rose-800"}>
                                              Leftover Ratio: {leftoverRatioPercent.toFixed(1)}% ({leftoverKg.toFixed(2)} kg)
                                            </span>
                                          </div>

                                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                                            <div 
                                              className="bg-indigo-600 h-full transition-all duration-300" 
                                              style={{ width: `${Math.min(100, Math.max(0, packedRatioPercent))}%` }} 
                                              title={`Packed: ${packedRatioPercent.toFixed(1)}%`}
                                            />
                                            <div 
                                              className={leftoverKg >= 0 ? "bg-emerald-500 h-full transition-all duration-300" : "bg-rose-500 h-full transition-all duration-300"} 
                                              style={{ width: `${Math.min(100, Math.max(0, Math.abs(leftoverRatioPercent)))}%` }} 
                                              title={`Leftover: ${leftoverRatioPercent.toFixed(1)}%`}
                                            />
                                          </div>

                                          <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80 space-y-0.5">
                                            <p><span className="font-bold text-slate-700">Formula Calculation:</span> Leftover KG = {activeProducedYieldKg.toFixed(2)} kg Total Yield - {packedKgUsed.toFixed(2)} kg Packed = <span className="font-bold text-slate-900">{leftoverKg.toFixed(2)} kg ({leftoverGrams.toFixed(0)} grams)</span></p>
                                            <p><span className="font-bold text-slate-700">Production Ratio:</span> Packed ({packedRatioPercent.toFixed(1)}%) + Remaining Leftover ({leftoverRatioPercent.toFixed(1)}%) = 100% Batch Yield</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 4 DISTINCT COLUMNS: PACK METRICS, COST, SELLING PRICE & NET PROFIT */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                      {/* Column 1: Output Packs */}
                                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">1. Total Packs Output</span>
                                        <p className="font-mono font-black text-slate-900 text-base">{totalPacksFromYield.toFixed(0)} Packs</p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                          Packed: {packedKgUsed}kg ({(totalGramsPacked || 0).toLocaleString()}g) ÷ {customPackGrams}g
                                        </p>
                                      </div>

                                      {/* Column 2: Unit Cost */}
                                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">2. Unit Cost / Pack</span>
                                        <p className="font-mono font-black text-slate-900 text-base">₹{totalCostPerCustomPack.toFixed(2)}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                          Food: ₹{foodCostPerCustomPack.toFixed(1)} + Bag: ₹{customPackPouchCost.toFixed(1)}
                                        </p>
                                      </div>

                                      {/* Column 3: Selling Rate & Revenue */}
                                      <div className="p-3 bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1">
                                        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">3. Selling Rate & Revenue</span>
                                        <p className="font-mono font-black text-emerald-950 text-base">₹{customPackSellingPrice} <span className="text-xs font-normal text-slate-600">/ pack</span></p>
                                        <p className="text-[10px] text-emerald-800 font-mono font-bold">
                                          Total Revenue: ₹{(totalBatchRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </p>
                                      </div>

                                      {/* Column 4: Profit & Loss */}
                                      <div className={`p-3 rounded-xl border shadow-2xs space-y-1 ${netProfitPerPack >= 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/80 border-rose-300'}`}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-800">4. Profit / Loss Summary</span>
                                        <p className={`font-mono font-black text-base ${netProfitPerPack >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                                          {netProfitPerPack >= 0 ? '+' : ''}₹{netProfitPerPack.toFixed(2)} <span className="text-xs font-bold font-mono">({marginPercent.toFixed(1)}%)</span>
                                        </p>
                                        <p className="text-[10px] font-mono font-bold text-slate-800">
                                          Total Profit: {totalBatchPackProfit >= 0 ? '+' : ''}₹{(totalBatchPackProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="pt-1 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleAddCustomPackToRecipe()}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add {customPackGrams}g Pack (@ ₹{customPackSellingPrice}) to Recipe</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                              <span className="text-slate-600 font-medium">Batch Net Profit:</span>
                              <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                ₹{(netProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({profitMarginPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 mt-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">All-Inclusive Batch Cost</p>
                  <p className="text-2xl font-black font-mono text-indigo-700">
                    ₹{calculateTotalBatchCost(activeRecipe, materials).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    (₹{(activeProducedYieldKg > 0 ? calculateTotalBatchCost(activeRecipe, materials) / activeProducedYieldKg : 0).toFixed(2)} per produced KG • ₹{(calculateTotalBatchCost(activeRecipe, materials) / (calculateRecipeTotalWeight(activeRecipe, materials) / 1000)).toFixed(2)} per raw KG)
                  </p>
                </div>
              </div>

            </div>

            {/* THE INTERACTIVE PROFIT MARGIN & COST ANALYZER */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>Profit Margin & Cost Analyzer</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Interactively select pouch sizes and slide prices to check direct gross margins.</p>
                </div>

                {/* Predefined Quick selectors */}
                {activeRecipe.packagingSizes && activeRecipe.packagingSizes.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium">Standard Presets:</span>
                    <div className="flex gap-1">
                      {activeRecipe.packagingSizes.map((size) => (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => handleSelectPredefinedSize(size)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                            analyzerPackSize === size.grams && analyzerMRP === size.mrp
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {size.grams}{size.unit === 'kg' ? 'kg' : size.unit === 'liter' ? 'L' : size.unit === 'pieces' ? ' pcs' : size.unit === 'packs' ? ' packs' : size.unit === 'bundle' ? ' bundle' : 'g'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Analyzer Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Pack Size / Qty</label>
                  <input
                    type="number"
                    value={analyzerPackSize}
                    onChange={(e) => setAnalyzerPackSize(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Custom pack weight simulation</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Pack Unit</label>
                  <select
                    value={analyzerUnit}
                    onChange={(e) => setAnalyzerUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="gram" className="bg-slate-900 text-white">gram (g)</option>
                    <option value="kg" className="bg-slate-900 text-white">kg (Kilogram)</option>
                    <option value="liter" className="bg-slate-900 text-white">liter (L)</option>
                    <option value="pieces" className="bg-slate-900 text-white">pieces (pcs)</option>
                    <option value="packs" className="bg-slate-900 text-white">packs (Packs)</option>
                    <option value="bundle" className="bg-slate-900 text-white">bundle (Bundle)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">Packaging unit type selection</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Pouch Film Cost (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={analyzerPouchCost}
                    onChange={(e) => setAnalyzerPouchCost(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Individual packaging bag overhead</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Price / MRP (₹)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={analyzerMRP}
                      onChange={(e) => setAnalyzerMRP(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Store / Distributor Selling Price</span>
                </div>
              </div>

              {/* Slider for Interactive Pricing */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Interactive Selling Price Adjuster (MRP)</span>
                  <span className="font-mono text-white font-semibold">₹{analyzerMRP}</span>
                </div>
                <input 
                  type="range" 
                  min={5} 
                  max={250} 
                  value={analyzerMRP}
                  onChange={(e) => setAnalyzerMRP(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Costing Calculations */}
              {(() => {
                const results = calculatePacketFinancials(
                  activeRecipe, 
                  analyzerPackSize, 
                  analyzerPouchCost, 
                  analyzerMRP, 
                  materials,
                  analyzerUnit
                );

                const isProfit = results.netProfit > 0;
                let colorClass = 'text-red-500';
                let bgClass = 'bg-red-500/10 border-red-500/20';
                if (results.marginPercent >= 35) {
                  colorClass = 'text-emerald-400';
                  bgClass = 'bg-emerald-500/10 border-emerald-500/20';
                } else if (results.marginPercent >= 15) {
                  colorClass = 'text-amber-400';
                  bgClass = 'bg-amber-500/10 border-amber-500/20';
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    
                    {/* Left Column: Cost Splits */}
                    <div className="space-y-2.5 text-xs text-slate-300 md:col-span-2">
                      <h5 className="font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 text-[11px]">Cost Component Breakdown</h5>
                      
                      <div className="flex justify-between">
                        <span>Food Weight Content Cost ({analyzerPackSize}{analyzerUnit === 'kg' ? 'kg' : analyzerUnit === 'liter' ? 'L' : analyzerUnit === 'pieces' ? ' pcs' : analyzerUnit === 'packs' ? ' packs' : analyzerUnit === 'bundle' ? ' bundle' : 'g'}):</span>
                        <span className="font-mono text-white font-medium">₹{results.foodCost.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Packaging Film/Pouch Cost (1 pc):</span>
                        <span className="font-mono text-white font-medium">₹{results.pouchCost.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-400">
                        <span>Total Direct Prime Cost:</span>
                        <span className="font-mono text-white">₹{results.primeCost.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Pro-rata Labor (Deducted from batch):</span>
                        <span className="font-mono text-white font-medium">₹{results.laborProRata.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Pro-rata Fixed Overhead Burden:</span>
                        <span className="font-mono text-white font-medium">₹{results.overheadProRata.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-200 font-bold">
                        <span>Total Fully Burdened Packet Cost:</span>
                        <span className="font-mono text-white">₹{results.burdenedCost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Right Column: Key Financial Indicators */}
                    <div className={`p-5 rounded-2xl border ${bgClass} flex flex-col justify-between space-y-4`}>
                      <div className="space-y-3 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Profit per Packet</p>
                          <p className={`text-2xl font-black font-mono ${colorClass}`}>
                            ₹{results.netProfit.toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Profit Margin %</p>
                          <p className={`text-3xl font-black font-mono ${colorClass}`}>
                            {results.marginPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Retail Equivalence & produced yield */}
                      <div className="border-t border-slate-800 pt-3 space-y-2 text-[10px] text-slate-400 font-medium">
                        {(() => {
                          const packKg = (analyzerUnit === 'kg' || analyzerUnit === 'liter') ? analyzerPackSize : analyzerPackSize / 1000;
                          const derivedPackRate = (packKg * activeSellingPricePerKg) + analyzerPouchCost;
                          const producedYieldBags = packKg > 0 ? (activeProducedYieldKg / packKg) : 0;
                          return (
                            <>
                              <div className="flex justify-between items-center bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
                                <span>Derived Rate (@ ₹{activeSellingPricePerKg}/kg):</span>
                                <div className="flex items-center space-x-1">
                                  <span className="text-emerald-400 font-mono font-bold">₹{derivedPackRate.toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAnalyzerMRP(Math.round(derivedPackRate))}
                                    className="px-1.5 py-0.5 text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer"
                                    title="Set MRP to this derived pack rate"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span>Produced Yield ({activeProducedYieldKg}kg):</span>
                                <span className="text-emerald-300 font-mono font-bold">{producedYieldBags.toFixed(0)} Bags</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Equiv. Retail Rate:</span>
                                <span className="text-slate-200 font-mono">₹{results.pricePerKgEquiv.toFixed(0)}/KG</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Batch Profit Potent.:</span>
                                <span className="text-emerald-400 font-mono font-semibold">₹{(producedYieldBags * results.netProfit).toFixed(0)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>



          </div>
        ) : (
          <div className="lg:col-span-2 text-center py-12 text-slate-400">
            Select or formulate a recipe to view calculations.
          </div>
        )}

      </div>

      {/* LIVE CAMERA OVERLAY MODAL */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span>Snap Recipe Product Photo</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENLARGE PHOTO PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-4 space-y-3 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-400" /> Recipe Product Photo
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center bg-slate-950 rounded-xl p-2 border border-slate-800">
              <img src={previewImage} alt="Recipe Product Attachment" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
