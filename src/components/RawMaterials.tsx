import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { Plus, Search, Filter, Trash, AlertTriangle, Check, RefreshCw, Pencil, Camera, Upload, Image as ImageIcon, Eye, X, Paperclip, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const PRESET_MATERIALS = [
  { english: 'Gram Flour (Besan)', tamil: 'கடலை மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Rice Flour', tamil: 'அரிசி மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Rice Paste Flour', tamil: 'அரிசி பசை மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Tapioca / Potato Flour', tamil: 'கிழங்கு மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Peas Flour', tamil: 'பட்டாணி மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Corn Flour', tamil: 'கான்பிளவர் மாவு', category: 'Flour', unit: 'kg' },
  { english: 'Cumin Seeds', tamil: 'சீரகம்', category: 'Spices', unit: 'g' },
  { english: 'Fennel Seeds', tamil: 'சோம்பு', category: 'Spices', unit: 'g' },
  { english: 'Pepper', tamil: 'மிளகு', category: 'Spices', unit: 'g' },
  { english: 'Carom Seeds (Ajwain)', tamil: 'ஓமம்', category: 'Spices', unit: 'g' },
  { english: 'Black Sesame Seeds', tamil: 'கருப்பு எள்', category: 'Spices', unit: 'g' },
  { english: 'Turmeric Powder', tamil: 'மஞ்சத்தூள்', category: 'Spices', unit: 'g' },
  { english: 'Chili Powder', tamil: 'மிளகாய்த்தூள்', category: 'Spices', unit: 'g' },
  { english: 'Curry Masala Powder', tamil: 'கறி மசாலா தூள்', category: 'Spices', unit: 'g' },
  { english: 'Garam Masala Powder', tamil: 'கரம் மசாலாத்தூள்', category: 'Spices', unit: 'g' },
  { english: 'Chicken Masala Powder', tamil: 'சிக்கன் மசாலா தூள்', category: 'Spices', unit: 'g' },
  { english: 'Black Salt', tamil: 'கருப்பு உப்பு', category: 'Spices', unit: 'g' },
  { english: 'Salt', tamil: 'உப்பு', category: 'Spices', unit: 'g' },
  { english: 'Baking Soda', tamil: 'ஆப்ப சோடா', category: 'Spices', unit: 'g' },
  { english: 'Dalda', tamil: 'டால்டா', category: 'Dairy', unit: 'kg' },
  { english: 'Green Gram Dal', tamil: 'பச்சை பயறு பருப்பு', category: 'Flour', unit: 'kg' },
  { english: 'Masoor Dal', tamil: 'மைசூர் பருப்பு', category: 'Flour', unit: 'kg' },
  { english: 'Chana Dal', tamil: 'கடலை பருப்பு', category: 'Flour', unit: 'kg' },
  { english: 'Fried Gram', tamil: 'பொட்டுக்கடலை', category: 'Flour', unit: 'kg' },
  { english: 'Peanuts', tamil: 'வேர்க்கடலை', category: 'Flour', unit: 'kg' },
  { english: 'Poha (Beaten Rice)', tamil: 'அவள்', category: 'Flour', unit: 'kg' },
  { english: 'Corn', tamil: 'கான்', category: 'Flour', unit: 'kg' },
  { english: 'Asafoetida Powder (Hing)', tamil: 'பெருங்காயத்தூள்', category: 'Spices', unit: 'g' },
  { english: 'Yellow Orange Food Color', tamil: 'மஞ்சள் ஆரஞ்சு கலர்', category: 'Spices', unit: 'g' },
  { english: 'Red Orange Food Color', tamil: 'சிகப்பு ஆரஞ்சு கலர்', category: 'Spices', unit: 'g' },
  { english: 'Green Food Color', tamil: 'பச்சை கலர்', category: 'Spices', unit: 'g' },
  { english: 'Peas', tamil: 'பட்டாணி', category: 'Other', unit: 'kg' },
  { english: 'Potato', tamil: 'உருளைக்கிழங்கு', category: 'Other', unit: 'kg' },
  { english: 'Onion', tamil: 'வெங்காயம்', category: 'Other', unit: 'kg' },
  { english: 'Green Chili', tamil: 'பச்சை மிளகாய்', category: 'Other', unit: 'kg' },
  { english: 'Garlic', tamil: 'பூண்டு', category: 'Other', unit: 'kg' },
  { english: 'Ginger', tamil: 'இஞ்சி', category: 'Other', unit: 'kg' },
  { english: 'Gloves', tamil: 'கையுறை', category: 'Other', unit: 'pcs' },
  { english: 'Hair Cap', tamil: 'தலைமாட்டி', category: 'Other', unit: 'pcs' },
  { english: 'Soap Powder', tamil: 'சோப்புத்தூள்', category: 'Other', unit: 'kg' },
  { english: 'Sabena Powder', tamil: 'சபீனாத்தூள்', category: 'Other', unit: 'kg' },
  { english: 'Liquid Soap', tamil: 'சோப்பு லிக்யூட்', category: 'Other', unit: 'L' },
  { english: 'Palm Oil', tamil: 'பாமாயில்', category: 'Oil', unit: 'L' },
  { english: 'Old Palm Oil', tamil: 'old பாமாயில்', category: 'Oil', unit: 'L' },
];

interface RawMaterialsProps {
  materials: RawMaterial[];
  onAddMaterial: (material: Omit<RawMaterial, 'id' | 'lastUpdated'>) => void;
  onEditMaterial: (id: string, updates: Partial<RawMaterial>) => void;
  onDeleteMaterial: (id: string) => void;
  onClearMaterials?: () => void;
}

export default function RawMaterials({ materials, onAddMaterial, onEditMaterial, onDeleteMaterial, onClearMaterials }: RawMaterialsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Form State for Adding
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flour');
  const [unit, setUnit] = useState<'g' | 'kg' | 'L' | 'pcs' | 'packs' | 'bundle'>('g');
  const [currentStock, setCurrentStock] = useState<number>(10); // Default to 10kg/10L (or 10000g/pcs)
  const [minStock, setMinStock] = useState<number>(5); // Default to 5kg/5L
  const [initialCost, setInitialCost] = useState<number>(80); // Default to ₹80/kg or ₹120/L
  const [totalPriceInput, setTotalPriceInput] = useState<number>(800); // 10 * 80

  // Editing state for min stock adjustments
  const [editMinStock, setEditMinStock] = useState<number>(0);

  // Inline Cost Editing state
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editCostVal, setEditCostVal] = useState<number>(0);

  // Inline Stock Editing state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockVal, setEditStockVal] = useState<number>(0);

  // Inline Category Editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryVal, setEditCategoryVal] = useState<string>('');

  // Image / Photo Attachment State
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

  // Categories
  const categories = ['All', ...Array.from(new Set(materials.map((m) => m.category)))];

  const formatStockDisplay = (stockGrams: number, m: RawMaterial) => {
    const isOil = m.category.toLowerCase() === 'oil' || m.name.toLowerCase().includes('oil') || m.name.toLowerCase().includes('பாமாயில்') || m.name.includes('எண்ணெய்');
    
    if (m.unit === 'g') {
      const kg = stockGrams / 1000;
      if (isOil) {
        const liters = stockGrams / 900; // standard density: 1L of edible oil is about 900g
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{stockGrams.toLocaleString()} g</span>
            <span className="text-[11px] text-indigo-600 font-bold block mt-0.5 leading-none">
              ({kg.toFixed(2)} kg / {liters.toFixed(2)} L)
            </span>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{stockGrams.toLocaleString()} g</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5 leading-none">
              ({kg.toFixed(2)} kg)
            </span>
          </div>
        );
      }
    } else if (m.unit === 'kg') {
      const kg = stockGrams / 1000;
      if (isOil) {
        const liters = stockGrams / 900;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{kg.toFixed(2)} kg</span>
            <span className="text-[11px] text-indigo-600 font-bold block mt-0.5 leading-none">
              ({liters.toFixed(2)} L)
            </span>
          </div>
        );
      } else {
        return <span className="font-semibold text-slate-900">{kg.toFixed(2)} kg</span>;
      }
    } else if (m.unit === 'L') {
      const liters = stockGrams / 1000;
      const kg = liters * 0.9; // palm oil conversion
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{liters.toFixed(2)} L</span>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5 leading-none">
            ({kg.toFixed(2)} kg)
          </span>
        </div>
      );
    } else if (m.unit === 'packs') {
      return <span className="font-semibold text-slate-900">{stockGrams} packs</span>;
    } else if (m.unit === 'bundle') {
      return <span className="font-semibold text-slate-900">{stockGrams} bundles</span>;
    } else {
      return <span className="font-semibold text-slate-900">{stockGrams} pcs</span>;
    }
  };

  const handleStockChange = (val: number) => {
    setCurrentStock(val);
    setTotalPriceInput(Math.round(val * initialCost * 100) / 100);
  };

  const handleCostChange = (val: number) => {
    setInitialCost(val);
    setTotalPriceInput(Math.round(currentStock * val * 100) / 100);
  };

  const handleTotalPriceChange = (val: number) => {
    setTotalPriceInput(val);
    setInitialCost(currentStock > 0 ? Math.round((val / currentStock) * 10000) / 10000 : 0);
  };

  const handleUnitChange = (newUnit: 'g' | 'kg' | 'L' | 'pcs' | 'packs' | 'bundle') => {
    // Gracefully convert stock & cost value scales to match the new unit type to avoid confusing jumps
    const isSmallBefore = (unit === 'g' || unit === 'pcs' || unit === 'packs' || unit === 'bundle');
    const isSmallAfter = (newUnit === 'g' || newUnit === 'pcs' || newUnit === 'packs' || newUnit === 'bundle');

    let nextStock = currentStock;
    let nextCost = initialCost;

    if (isSmallBefore && (newUnit === 'kg' || newUnit === 'L')) {
      nextStock = Math.round((currentStock / 1000) * 100) / 100;
      setMinStock(prev => Math.round((prev / 1000) * 100) / 100);
      nextCost = Math.round(initialCost * 1000 * 100) / 100;
    } else if ((unit === 'kg' || unit === 'L') && isSmallAfter) {
      nextStock = Math.round(currentStock * 1000);
      setMinStock(prev => Math.round(prev * 1000));
      nextCost = initialCost / 1000;
    }
    setCurrentStock(nextStock);
    setInitialCost(nextCost);
    setTotalPriceInput(Math.round(nextStock * nextCost * 100) / 100);
    setUnit(newUnit);
  };

  const handleEditClick = (m: RawMaterial) => {
    setEditingMaterialId(m.id);
    setIsAdding(true);
    setName(m.name);
    setCategory(m.category);
    setUnit(m.unit);
    setImage(m.image || '');

    const isKgOrL = m.unit === 'kg' || m.unit === 'L';
    const displayStock = isKgOrL ? m.currentStockGrams / 1000 : m.currentStockGrams;
    const displayMinStock = isKgOrL ? m.minStockGrams / 1000 : m.minStockGrams;
    const displayCost = isKgOrL ? m.averageCostPerGram * 1000 : m.averageCostPerGram;

    setCurrentStock(displayStock);
    setMinStock(displayMinStock);
    setInitialCost(displayCost);
    setTotalPriceInput(Math.round(displayStock * displayCost * 100) / 100);

    // Scroll to form smoothly
    const formEl = document.getElementById('add-material-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isKgOrL = unit === 'kg' || unit === 'L';
    const finalStock = isKgOrL ? Number(currentStock) * 1000 : Number(currentStock);
    const finalMinStock = isKgOrL ? Number(minStock) * 1000 : Number(minStock);
    const finalCost = isKgOrL ? Number(initialCost) / 1000 : Number(initialCost);

    if (editingMaterialId) {
      onEditMaterial(editingMaterialId, {
        name: name.trim(),
        category,
        unit,
        currentStockGrams: finalStock,
        minStockGrams: finalMinStock,
        averageCostPerGram: finalCost,
        image: image || undefined,
      });
      setEditingMaterialId(null);
    } else {
      onAddMaterial({
        name: name.trim(),
        category,
        unit,
        currentStockGrams: finalStock,
        minStockGrams: finalMinStock,
        averageCostPerGram: finalCost,
        image: image || undefined,
      });
    }

    // Reset Form
    setName('');
    setCategory('Flour');
    setUnit('g');
    setCurrentStock(10);
    setMinStock(5);
    setInitialCost(80);
    setTotalPriceInput(800);
    setImage('');
    setIsAdding(false);
  };

  const handleStartEdit = (m: RawMaterial) => {
    setEditingId(m.id);
    const displayVal = (m.unit === 'kg' || m.unit === 'L') ? m.minStockGrams / 1000 : m.minStockGrams;
    setEditMinStock(displayVal);
  };

  const handleSaveEdit = (id: string, m: RawMaterial) => {
    const finalMin = (m.unit === 'kg' || m.unit === 'L') ? Number(editMinStock) * 1000 : Number(editMinStock);
    onEditMaterial(id, { minStockGrams: finalMin });
    setEditingId(null);
  };

  const handleStartEditCost = (m: RawMaterial) => {
    setEditingCostId(m.id);
    const displayCost = (m.unit === 'g' || m.unit === 'kg' || m.unit === 'L') ? m.averageCostPerGram * 1000 : m.averageCostPerGram;
    setEditCostVal(displayCost);
  };

  const handleSaveEditCost = (id: string, m: RawMaterial) => {
    const finalCost = (m.unit === 'g' || m.unit === 'kg' || m.unit === 'L') ? Number(editCostVal) / 1000 : Number(editCostVal);
    onEditMaterial(id, { averageCostPerGram: finalCost });
    setEditingCostId(null);
  };

  const handleStartEditStock = (m: RawMaterial) => {
    setEditingStockId(m.id);
    const displayVal = (m.unit === 'kg' || m.unit === 'L') ? m.currentStockGrams / 1000 : m.currentStockGrams;
    setEditStockVal(displayVal);
  };

  const handleSaveEditStock = (id: string, m: RawMaterial) => {
    const finalStock = (m.unit === 'kg' || m.unit === 'L') ? Number(editStockVal) * 1000 : Number(editStockVal);
    onEditMaterial(id, { currentStockGrams: finalStock });
    setEditingStockId(null);
  };

  const handleStartEditCategory = (m: RawMaterial) => {
    setEditingCategoryId(m.id);
    setEditCategoryVal(m.category);
  };

  const handleSaveEditCategory = (id: string) => {
    onEditMaterial(id, { category: editCategoryVal });
    setEditingCategoryId(null);
  };

  const handleExportExcel = () => {
    const exportData = filteredMaterials.map((m) => {
      const isKgOrL = m.unit === 'kg' || m.unit === 'L';
      const displayStock = isKgOrL ? `${(m.currentStockGrams / 1000).toFixed(2)} ${m.unit}` : `${m.currentStockGrams} ${m.unit}`;
      const displayMin = isKgOrL ? `${(m.minStockGrams / 1000).toFixed(2)} ${m.unit}` : `${m.minStockGrams} ${m.unit}`;
      const displayCost = isKgOrL ? `₹${(m.averageCostPerGram * 1000).toFixed(2)} / ${m.unit}` : `₹${m.averageCostPerGram.toFixed(4)} / ${m.unit}`;
      const totalVal = m.currentStockGrams * m.averageCostPerGram;
      return {
        'Item ID': m.id,
        'Ingredient Name': m.name,
        'Category': m.category,
        'Unit': m.unit,
        'Current Stock': displayStock,
        'Min Reorder Level': displayMin,
        'Avg Unit Cost': displayCost,
        'Total Stock Value (₹)': Math.round(totalVal * 100) / 100,
        'Stock Status': m.currentStockGrams <= m.minStockGrams ? 'LOW STOCK ALERT' : 'Normal',
        'Last Updated': m.lastUpdated ? new Date(m.lastUpdated).toLocaleString() : 'N/A'
      };
    });
    exportToExcel(exportData, `Raw_Materials_Inventory_${new Date().toISOString().split('T')[0]}`, 'Inventory Stock');
  };

  // Filter & Search Logic
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" id="raw-materials-container">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Raw Material & Pouch Inventory</h2>
          <p className="text-sm text-slate-500">Monitor current stock weights, unit purchase rates, and safety levels.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Export filtered stock list to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          {onClearMaterials && materials.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              title="Clear all materials and reset inventory"
            >
              <Trash className="w-4 h-4 text-rose-600" />
              <span>Clear Inventory</span>
            </button>
          )}
          <button
            id="add-material-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Material</span>
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Clear Inventory Materials?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to clear all {materials.length} raw materials and packaging pouches from your inventory?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  onClearMaterials?.();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Material Form Panel */}
      {isAdding && (
        <form 
          id="add-material-form"
          onSubmit={handleAddSubmit} 
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {editingMaterialId ? `Edit Material: ${name}` : 'Create Material/Pouch Record'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Preset Material (தமிழ் / English)</label>
              <select
                id="preset-material-select"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setName('');
                  } else {
                    const preset = PRESET_MATERIALS.find(p => `${p.english} / ${p.tamil}` === val);
                    if (preset) {
                      setName(`${preset.english} / ${preset.tamil}`);
                      setCategory(preset.category);
                      const presetUnit = preset.unit as 'g' | 'kg' | 'L' | 'pcs';
                      setUnit(presetUnit);
                      if (presetUnit === 'kg') {
                        setCurrentStock(10); // 10 kg
                        setMinStock(5);     // 5 kg
                        setInitialCost(80); // ₹80/kg
                        setTotalPriceInput(800); // 10 * 80
                      } else if (presetUnit === 'L') {
                        setCurrentStock(15); // 15 L
                        setMinStock(5);     // 5 L
                        setInitialCost(120); // ₹120/L
                        setTotalPriceInput(1800); // 15 * 120
                      } else if (presetUnit === 'pcs') {
                        setCurrentStock(1000); // 1000 pcs
                        setMinStock(500);     // 500 pcs
                        setInitialCost(1.5);   // ₹1.5/pc
                        setTotalPriceInput(1500); // 1000 * 1.5
                      } else {
                        setCurrentStock(10000); // 10000g
                        setMinStock(5000);     // 5000g
                        setInitialCost(0.05);   // ₹0.05/g
                        setTotalPriceInput(500); // 10000 * 0.05
                      }
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 mb-2"
                defaultValue="custom"
              >
                <option value="custom">-- Custom / Type manually --</option>
                {PRESET_MATERIALS.map((p, idx) => (
                  <option key={idx} value={`${p.english} / ${p.tamil}`}>
                    {p.tamil} — {p.english}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Material Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Besan (Gram Flour)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="Flour">Flour</option>
                <option value="Dairy">Dairy</option>
                <option value="Spices">Spices / Seasonings</option>
                <option value="Oil">Oil</option>
                <option value="Packaging">Packaging (Pouches)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit type</label>
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="g">gram (g)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="L">liter (L)</option>
                <option value="pcs">pieces (pcs)</option>
                <option value="packs">packs</option>
                <option value="bundle">bundle</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Initial Stock {unit === 'g' ? '(Grams)' : unit === 'kg' ? '(Kilograms)' : unit === 'L' ? '(Liters)' : unit === 'packs' ? '(Packs)' : unit === 'bundle' ? '(Bundles)' : '(Pieces)'}
              </label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => handleStockChange(Math.max(0, Number(e.target.value)))}
                placeholder={unit === 'g' ? "e.g. 15000" : unit === 'kg' ? "e.g. 15" : unit === 'L' ? "e.g. 15" : unit === 'packs' ? "e.g. 100" : unit === 'bundle' ? "e.g. 50" : "e.g. 1000"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                required
              />
              <p className="text-slate-400 text-[10px] mt-1">
                {unit === 'g' ? `Equates to ${(currentStock / 1000).toFixed(1)} kg` : unit === 'kg' ? `Equates to ${((currentStock || 0) * 1000).toLocaleString()} g` : unit === 'L' ? `Equates to ${((currentStock || 0) * 1000).toLocaleString()} ml` : unit === 'packs' ? `${currentStock} packs` : unit === 'bundle' ? `${currentStock} bundles` : `${currentStock} packaging pouches`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Minimum Stock Level {unit === 'g' ? '(Grams)' : unit === 'kg' ? '(Kilograms)' : unit === 'L' ? '(Liters)' : unit === 'packs' ? '(Packs)' : unit === 'bundle' ? '(Bundles)' : '(Pieces)'}
              </label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, Number(e.target.value)))}
                placeholder="Alert level"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Initial Cost per {unit === 'g' ? 'Gram' : unit === 'kg' ? 'KG' : unit === 'L' ? 'Liter' : unit === 'packs' ? 'Pack' : unit === 'bundle' ? 'Bundle' : 'Piece'} (₹)
              </label>
              <input
                type="number"
                step="0.0001"
                value={initialCost}
                onChange={(e) => handleCostChange(Math.max(0, Number(e.target.value)))}
                placeholder={unit === 'g' ? "e.g. 0.05" : unit === 'kg' ? "e.g. 50" : unit === 'L' ? "e.g. 120" : unit === 'packs' ? "e.g. 10.00" : unit === 'bundle' ? "e.g. 25.00" : "e.g. 1.50"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                required
              />
              <p className="text-slate-400 text-[10px] mt-1">
                {unit === 'g' ? `Equates to ₹${(initialCost * 1000).toFixed(2)} per KG` : unit === 'kg' ? `Equates to ₹${(initialCost / 1000).toFixed(4)} per gram` : unit === 'L' ? `Equates to ₹${(initialCost / 1000).toFixed(4)} per ml` : unit === 'packs' ? `₹${initialCost.toFixed(2)} per pack` : unit === 'bundle' ? `₹${initialCost.toFixed(2)} per bundle` : `₹${initialCost.toFixed(2)} each`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-600 mb-1.5">
                Total Price / Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalPriceInput}
                onChange={(e) => handleTotalPriceChange(Math.max(0, Number(e.target.value)))}
                placeholder="Total Price"
                className="w-full px-3 py-2 text-sm bg-indigo-50/50 border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-indigo-950 font-bold font-mono"
                required
              />
              <p className="text-indigo-500 text-[10px] mt-1">
                Calculated or manual total price
              </p>
            </div>
          </div>

          {/* Photo Attachment (Camera / Upload) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                Raw Material Photo / Pouch Image
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" /> Remove Photo
                </button>
              )}
            </div>

            {image ? (
              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                <img
                  src={image}
                  alt="Raw Material"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-xs hover:opacity-90"
                  onClick={() => setPreviewImage(image)}
                />
                <div>
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" /> Photo Attached Successfully
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(image)}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Take Photo (Camera)</span>
                </button>

                <label className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer text-center shadow-2xs">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Image File</span>
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

          {/* Dynamic Total Cost of Initial Purchase */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all">
            <div>
              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Total Initial Stock Purchase Cost</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Calculated value for the initial stock (Quantity × Unit Cost):
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-indigo-600 font-mono">
                ₹{(totalPriceInput || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingMaterialId(null);
                setName('');
                setCategory('Flour');
                setUnit('g');
                setCurrentStock(10);
                setMinStock(5);
                setInitialCost(80);
                setTotalPriceInput(800);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              {editingMaterialId ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search material by name or category..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materials Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Ingredient Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-indigo-700 font-extrabold bg-indigo-50/40">Current Stock</th>
                <th className="px-6 py-4">Min Reorder Level</th>
                <th className="px-6 py-4">Avg Cost</th>
                <th className="px-6 py-4">Stock Value</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No raw materials found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => {
                  const isLow = m.currentStockGrams <= m.minStockGrams;
                  const isEditing = editingId === m.id;
                  const isCostEditing = editingCostId === m.id;
                  const isStockEditing = editingStockId === m.id;
                  const isCategoryEditing = editingCategoryId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {m.image ? (
                            <img
                              src={m.image}
                              alt={m.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
                              onClick={() => setPreviewImage(m.image!)}
                              title="Click to Enlarge Photo"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditClick(m)}
                              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
                              title="Add Photo"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{m.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {m.id}</p>
                          </div>
                          {isLow && (
                            <span className="p-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100" title="Low Stock Warning">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isCategoryEditing ? (
                          <div className="flex items-center space-x-1">
                            <select
                              value={editCategoryVal}
                              onChange={(e) => setEditCategoryVal(e.target.value)}
                              className="px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:border-indigo-500 bg-white"
                            >
                              <option value="Flour">Flour</option>
                              <option value="Dairy">Dairy</option>
                              <option value="Spices">Spices / Seasonings</option>
                              <option value="Oil">Oil</option>
                              <option value="Packaging">Packaging (Pouches)</option>
                              <option value="Other">Other</option>
                            </select>
                            <button
                              onClick={() => handleSaveEditCategory(m.id)}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all cursor-pointer"
                              title="Save Category"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                              {m.category}
                            </span>
                            <button
                              onClick={() => handleStartEditCategory(m)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 hover:underline transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {isStockEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={editStockVal}
                              onChange={(e) => setEditStockVal(Math.max(0, Number(e.target.value)))}
                              className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:border-indigo-500 bg-white"
                            />
                            <button
                              onClick={() => handleSaveEditStock(m.id, m)}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all cursor-pointer"
                              title="Save Stock Qty"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 group">
                            <div className="flex items-center space-x-2">
                              <span className={`${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                                {formatStockDisplay(m.currentStockGrams, m)}
                              </span>
                              <button
                                onClick={() => handleStartEditStock(m)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 hover:underline transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (m.currentStockGrams / Math.max(1, m.minStockGrams * 2)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={editMinStock}
                              onChange={(e) => setEditMinStock(Math.max(0, Number(e.target.value)))}
                              className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:border-indigo-500 bg-white"
                            />
                            <button
                              onClick={() => handleSaveEdit(m.id, m)}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                            <div>
                              {formatStockDisplay(m.minStockGrams, m)}
                            </div>
                            <button
                              onClick={() => handleStartEdit(m)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 hover:underline transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {isCostEditing ? (
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center space-x-1">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1.5 text-xs text-slate-400">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editCostVal}
                                  onChange={(e) => setEditCostVal(Math.max(0, Number(e.target.value)))}
                                  className="w-24 pl-4 pr-1 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:border-indigo-500 bg-white font-mono font-bold text-indigo-700"
                                />
                              </div>
                              <button
                                onClick={() => handleSaveEditCost(m.id, m)}
                                className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all cursor-pointer"
                                title="Save Cost"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[9px] text-indigo-500 font-bold block pl-1">
                              per {m.unit === 'L' ? 'Liter' : 'kg'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                            <div>
                              {(m.unit === 'g' || m.unit === 'kg' || m.unit === 'L') ? (
                                <div className="space-y-1">
                                  {/* Highlighted KG or Liter Price */}
                                  <div className="inline-flex items-center bg-indigo-50 text-indigo-700 text-xs font-extrabold px-2 py-0.5 rounded border border-indigo-100/60 shadow-xs">
                                    ₹{(m.averageCostPerGram * 1000).toFixed(2)}
                                    <span className="text-[10px] font-semibold text-indigo-500 ml-0.5">
                                      /{m.unit === 'L' ? 'L' : 'kg'}
                                    </span>
                                  </div>
                                  {/* Gram-level details can be seen down */}
                                  {m.unit === 'g' && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 pl-0.5 font-medium block">
                                      ₹{m.averageCostPerGram.toFixed(4)}/g
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">
                                    ₹{m.averageCostPerGram.toFixed(2)}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {m.unit === 'packs'
                                      ? 'per pack'
                                      : m.unit === 'bundle'
                                      ? 'per bundle'
                                      : 'per pc'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleStartEditCost(m)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 hover:underline transition-all cursor-pointer whitespace-nowrap"
                            >
                              Edit Cost
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-indigo-700">
                        ₹{(((m.currentStockGrams || 0) * (m.averageCostPerGram || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(m)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Edit full material"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove "${m.name}"? This could break recipes using it.`)) {
                                onDeleteMaterial(m.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete material"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LIVE CAMERA OVERLAY MODAL */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span>Snap Raw Material Photo</span>
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
                <Paperclip className="w-4 h-4 text-indigo-400" /> Material Photo
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
              <img src={previewImage} alt="Raw Material Attachment" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
