import React, { useState } from 'react';
import { RawMaterial, PurchaseBill, PurchaseItem } from '../types';
import { Plus, Trash, Save, Clipboard, Calendar, FileText, User, Pencil, Paperclip, Image, Eye, X, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface PurchasesProps {
  materials: RawMaterial[];
  bills: PurchaseBill[];
  onAddBill: (bill: Omit<PurchaseBill, 'id'>) => void;
  onDeleteBill?: (id: string) => void;
  onEditBill?: (id: string, updatedBill: Omit<PurchaseBill, 'id'>) => void;
}

interface NewBillItem {
  materialId: string;
  quantity: number;
  totalCost: number;
  isCustom?: boolean;
}

export default function Purchases({ materials, bills, onAddBill, onDeleteBill, onEditBill }: PurchasesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewBillItem[]>([
    { materialId: materials[0]?.id || '', quantity: 1000, totalCost: 100 },
  ]);
  const [photoAttachment, setPhotoAttachment] = useState<string>('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (bill: PurchaseBill) => {
    setEditingBillId(bill.id);
    setIsAdding(true);
    setSupplierName(bill.supplierName);
    setBillNumber(bill.billNumber);
    setDate(bill.date);
    setNotes(bill.notes || '');
    setPhotoAttachment(bill.photoAttachment || '');

    const mappedItems: NewBillItem[] = bill.items.map((it) => {
      const mat = materials.find((m) => m.id === it.materialId);
      const isKgOrL = mat?.unit === 'kg' || mat?.unit === 'L';
      const qty = isKgOrL ? it.quantityGrams / 1000 : it.quantityGrams;
      return {
        materialId: it.materialId,
        quantity: qty,
        totalCost: it.totalCost,
        isCustom: !mat && !materials.some(m => m.id === it.materialId),
      };
    });
    setItems(mappedItems);

    const formEl = document.getElementById('new-bill-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { materialId: materials[0]?.id || '', quantity: 1000, totalCost: 100 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof NewBillItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItems(updated);
  };

  const handleSubmitBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !billNumber.trim() || items.length === 0) return;

    // Convert to full bill schema with correct base unit scaling
    const purchaseItems: PurchaseItem[] = items.map((it) => {
      const mat = materials.find((m) => m.id === it.materialId || m.name.toLowerCase() === it.materialId.trim().toLowerCase());
      const resolvedId = mat ? mat.id : (it.materialId.trim() || 'Custom Material');
      const isKgOrL = mat?.unit === 'kg' || mat?.unit === 'L';
      const qtyGrams = isKgOrL ? Number(it.quantity) * 1000 : Number(it.quantity);
      
      return {
        materialId: resolvedId,
        quantityGrams: qtyGrams,
        totalCost: Number(it.totalCost),
        costPerGram: qtyGrams > 0 ? Number(it.totalCost) / qtyGrams : 0,
      };
    });

    const billData = {
      billNumber: billNumber.trim(),
      supplierName: supplierName.trim(),
      date,
      items: purchaseItems,
      notes: notes.trim(),
      photoAttachment: photoAttachment || undefined,
    };

    if (editingBillId && onEditBill) {
      onEditBill(editingBillId, billData);
      setEditingBillId(null);
    } else {
      onAddBill(billData);
    }

    // Reset Form
    setSupplierName('');
    setBillNumber('');
    setNotes('');
    setPhotoAttachment('');
    setDate(new Date().toISOString().split('T')[0]);
    setItems([{ materialId: materials[0]?.id || '', quantity: 1000, totalCost: 100 }]);
    setIsAdding(false);
  };

  const totalBillCost = items.reduce((sum, item) => sum + Number(item.totalCost), 0);

  const handleExportExcel = () => {
    const exportData: Record<string, any>[] = [];
    bills.forEach((b) => {
      const billTotal = b.totalAmount ?? b.items.reduce((sum, it) => sum + (it.totalCost || 0), 0);
      if (!b.items || b.items.length === 0) {
        exportData.push({
          'Bill Number': b.billNumber,
          'Date': b.date,
          'Supplier': b.supplierName,
          'Item #': '-',
          'Ingredient / Material': 'No items listed',
          'Category': '-',
          'Quantity': '-',
          'Line Total Cost (₹)': 0,
          'Total Bill Cost (₹)': billTotal,
          'Notes': b.notes || '-'
        });
      } else {
        b.items.forEach((it, idx) => {
          const mat = materials.find((m) => m.id === it.materialId);
          const isKgOrL = mat?.unit === 'kg' || mat?.unit === 'L';
          const displayQty = isKgOrL ? `${(it.quantityGrams / 1000).toFixed(2)} ${mat?.unit}` : `${it.quantityGrams} ${mat?.unit || 'g'}`;
          exportData.push({
            'Bill Number': b.billNumber,
            'Date': b.date,
            'Supplier': b.supplierName,
            'Item #': idx + 1,
            'Ingredient / Material': mat?.name || it.materialId || 'Unknown Item',
            'Category': mat?.category || 'General',
            'Quantity': displayQty,
            'Line Total Cost (₹)': it.totalCost,
            'Total Bill Cost (₹)': billTotal,
            'Notes': b.notes || '-'
          });
        });
      }
    });
    exportToExcel(exportData, `Purchase_Bills_${new Date().toISOString().split('T')[0]}`, 'Purchase Bills');
  };

  return (
    <>
      <div className="space-y-6" id="purchases-tab-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Bill Registry</h2>
          <p className="text-sm text-slate-500">Record inbound material invoices to update stock weights and calculate moving cost averages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Export purchase bills to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            id="log-purchase-bill-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Purchase Invoice</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <form 
          id="new-bill-form"
          onSubmit={handleSubmitBill} 
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {editingBillId ? `Edit Purchase Bill: ${billNumber}` : 'New Purchase Bill Details'}
          </h3>
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Supplier Name</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Balaji Flour Mills"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Bill / Invoice Number</span>
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INVC-2026-904"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Invoice Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice Line Items</h4>
            <div className="space-y-2">
              {items.map((row, idx) => {
                const selectedMat = materials.find((m) => m.id === row.materialId);
                const unitLabel = selectedMat?.unit || 'unit';

                return (
                  <div key={idx} className="flex flex-col md:flex-row items-start md:items-end gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-500">Select Ingredient / Pouch</label>
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...items];
                              updated[idx] = { ...updated[idx], isCustom: false, materialId: materials[0]?.id || '' };
                              setItems(updated);
                            }}
                            className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            ← Select from list
                          </button>
                        )}
                      </div>
                      {row.isCustom ? (
                        <input
                          type="text"
                          placeholder="Type custom material / pouch name..."
                          value={row.materialId}
                          onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-indigo-50/50 border-2 border-indigo-500 rounded-md font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
                          autoFocus
                          required
                        />
                      ) : (
                        <select
                          value={row.materialId}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              const updated = [...items];
                              updated[idx] = { ...updated[idx], isCustom: true, materialId: '' };
                              setItems(updated);
                            } else {
                              handleItemChange(idx, 'materialId', e.target.value);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                        >
                          {[...materials]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.category})
                              </option>
                            ))}
                          <option value="__CUSTOM__">✨ + Customize / Add New Material...</option>
                        </select>
                      )}
                    </div>

                    <div className="w-full md:w-44">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Quantity ({unitLabel})
                      </label>
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Math.max(0, Number(e.target.value)))}
                        placeholder="Qty"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                      {selectedMat?.unit === 'g' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          = {(row.quantity / 1000).toFixed(1)} kg
                        </p>
                      )}
                      {selectedMat?.unit === 'kg' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          = {((row.quantity || 0) * 1000).toLocaleString()} g
                        </p>
                      )}
                      {selectedMat?.unit === 'L' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          = {((row.quantity || 0) * 1000).toLocaleString()} ml
                        </p>
                      )}
                      {selectedMat?.unit === 'packs' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          = {row.quantity} packs
                        </p>
                      )}
                      {selectedMat?.unit === 'bundle' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          = {row.quantity} bundles
                        </p>
                      )}
                    </div>

                    <div className="w-full md:w-44">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Total Line Cost (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.totalCost}
                        onChange={(e) => handleItemChange(idx, 'totalCost', Math.max(0, Number(e.target.value)))}
                        placeholder="Cost in ₹"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                      <p className="text-[10px] text-indigo-500 mt-0.5 font-mono">
                        {row.quantity > 0 ? `₹${(row.totalCost / row.quantity).toFixed(2)}/${unitLabel}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length === 1}
                      className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Grand Total: </span>
                <span className="font-bold text-slate-900 text-base">₹{(totalBillCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Photo Attachment upload */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Image className="w-4 h-4 text-indigo-500" />
              <span>Bill Copy / Invoice Photo Attachment</span>
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                id="bill-photo-input"
                className="hidden"
              />
              <label
                htmlFor="bill-photo-input"
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-200 cursor-pointer flex items-center space-x-1.5 transition-all"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Choose Bill Photo / Upload</span>
              </label>

              {photoAttachment && (
                <div className="flex items-center space-x-3 bg-white p-1.5 border border-slate-200 rounded-lg shadow-xs">
                  <img
                    src={photoAttachment}
                    alt="Bill Copy thumbnail"
                    className="w-10 h-10 object-cover rounded-md border"
                  />
                  <div className="text-[11px]">
                    <p className="font-semibold text-slate-700">Photo Attached</p>
                    <button
                      type="button"
                      onClick={() => setPhotoAttachment('')}
                      className="text-red-500 hover:underline font-bold cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Internal Remarks / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Transport charges of ₹200 included proportionally."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingBillId(null);
                setSupplierName('');
                setBillNumber('');
                setNotes('');
                setPhotoAttachment('');
                setDate(new Date().toISOString().split('T')[0]);
                setItems([{ materialId: materials[0]?.id || '', quantity: 1000, totalCost: 100 }]);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingBillId ? 'Update Invoice & Averages' : 'Save & Update Moving Averages'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Purchases History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Purchase History</h3>

        <div className="space-y-4">
          {bills.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-400">
              No bills recorded yet. Start by logging an inbound supplier invoice!
            </div>
          ) : (
            bills.slice().reverse().map((bill) => {
              const billTotal = bill.items.reduce((sum, item) => sum + item.totalCost, 0);
              return (
                <div key={bill.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Bill Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {bill.photoAttachment && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(bill.photoAttachment!)}
                          className="relative group block cursor-pointer border border-slate-300 rounded-lg overflow-hidden shrink-0 hover:ring-2 hover:ring-indigo-500 transition-all"
                          title="Click to view attached invoice copy"
                        >
                          <img
                            src={bill.photoAttachment}
                            alt="Invoice Preview"
                            className="w-11 h-11 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      )}
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-slate-900">{bill.supplierName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-md border border-slate-200">
                            Bill: {bill.billNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                          <span>Logged: {bill.date}</span>
                          {bill.photoAttachment && (
                            <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold rounded-sm flex items-center space-x-0.5">
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>Photo Attached</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-auto sm:ml-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Bill Value</p>
                        <p className="font-bold text-slate-900">₹{(billTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>

                      <div className="flex items-center space-x-1 pl-3 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleEditClick(bill)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          title="Edit Purchase Invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteBill && confirm(`Are you sure you want to delete invoice "${bill.billNumber}" from ${bill.supplierName}? This will deduct the logged quantities from stock.`)) {
                              onDeleteBill(bill.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Purchase Invoice"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bill Items */}
                  <div className="p-4 space-y-3">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                          <th className="pb-1.5">Raw Material</th>
                          <th className="pb-1.5 text-right">Qty Received</th>
                          <th className="pb-1.5 text-right">Unit Rate</th>
                          <th className="pb-1.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-600 divide-y divide-slate-50 font-mono">
                        {bill.items.map((item, idx) => {
                          const mat = materials.find((m) => m.id === item.materialId);
                          return (
                            <tr key={idx}>
                              <td className="py-2 text-slate-900 font-sans font-medium">{mat?.name || item.materialId || 'Deleted Material'}</td>
                              <td className="py-2 text-right">
                                {mat?.unit === 'g' 
                                  ? `${(item.quantityGrams || 0).toLocaleString()} g`
                                  : mat?.unit === 'kg'
                                  ? `${(item.quantityGrams / 1000).toFixed(2)} kg`
                                  : mat?.unit === 'L'
                                  ? `${(item.quantityGrams / 1000).toFixed(2)} L`
                                  : mat?.unit === 'packs'
                                  ? `${item.quantityGrams} packs`
                                  : mat?.unit === 'bundle'
                                  ? `${item.quantityGrams} bundles`
                                  : `${item.quantityGrams} pcs`}
                              </td>
                              <td className="py-2 text-right">
                                {mat?.unit === 'g'
                                  ? `₹${(item.costPerGram * 1000).toFixed(2)}/kg (₹${item.costPerGram.toFixed(4)}/g)`
                                  : mat?.unit === 'kg'
                                  ? `₹${(item.costPerGram * 1000).toFixed(2)}/kg`
                                  : mat?.unit === 'L'
                                  ? `₹${(item.costPerGram * 1000).toFixed(2)}/L`
                                  : mat?.unit === 'packs'
                                  ? `₹${item.costPerGram.toFixed(2)}/pack`
                                  : mat?.unit === 'bundle'
                                  ? `₹${item.costPerGram.toFixed(2)}/bundle`
                                  : `₹${item.costPerGram.toFixed(2)}/pc`}
                              </td>
                              <td className="py-2 text-right font-bold text-slate-900">₹{item.totalCost.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {bill.notes && (
                      <div className="pt-2 border-t border-slate-50 text-xs text-slate-500 italic">
                        <strong>Notes:</strong> {bill.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>

    {/* Photo Preview Modal Overlay */}
    {previewPhoto && (
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        onClick={() => setPreviewPhoto(null)}
        id="invoice-photo-preview-overlay"
      >
        <div 
          className="bg-white rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col relative shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <span className="font-bold text-sm">Attached Bill Copy Preview</span>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100">
            <img 
              src={previewPhoto} 
              alt="Full Invoice Bill Copy" 
              className="max-w-full max-h-[70vh] object-contain border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
