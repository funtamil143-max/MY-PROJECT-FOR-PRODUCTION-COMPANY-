import React, { useState } from 'react';
import { Recipe, ProductionBatch, SaleEntry } from '../types';
import { calculateWarehouseFinishedGoodsStock, WarehouseProductStockItem } from '../utils/calculations';
import { 
  PackageCheck, 
  Search, 
  Filter, 
  Boxes, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface PackedUnitStockTableProps {
  recipes: Recipe[];
  batches: ProductionBatch[];
  salesEntries?: SaleEntry[];
  compact?: boolean;
  onNavigateToProduction?: () => void;
  onNavigateToSales?: () => void;
}

export const PackedUnitStockTable: React.FC<PackedUnitStockTableProps> = ({
  recipes,
  batches,
  salesEntries = [],
  compact = false,
  onNavigateToProduction,
  onNavigateToSales
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('all');

  const stockItems: WarehouseProductStockItem[] = calculateWarehouseFinishedGoodsStock(recipes, batches, salesEntries);

  // Filter items
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.packSizeLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRecipe = selectedRecipe === 'all' || item.recipeId === selectedRecipe;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesRecipe && matchesStatus;
  });

  // Calculate Aggregates
  const totalPackedProduced = stockItems.reduce((acc, i) => acc + i.producedPacks, 0);
  const totalPackedSold = stockItems.reduce((acc, i) => acc + i.soldPacks, 0);
  const totalPackedInStock = stockItems.reduce((acc, i) => acc + i.packedUnitsInStock, 0);
  const totalStockValueMrp = stockItems.reduce((acc, i) => acc + i.stockValueMrp, 0);
  const totalStockValueWholesale = stockItems.reduce((acc, i) => acc + i.stockValueWholesale, 0);

  const lowStockCount = stockItems.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  const handleExportExcel = () => {
    const exportData = filteredItems.map(item => ({
      'Product Name': item.recipeName,
      'Pack Size': item.packSizeLabel,
      'Packed Units Produced': item.producedPacks,
      'Packed Units Sold': item.soldPacks,
      'Packed Units In Warehouse Stock': item.packedUnitsInStock,
      'MRP (₹)': item.mrp,
      'Wholesale Price (₹)': item.wholesalePrice,
      'Stock Value @ MRP (₹)': item.stockValueMrp,
      'Stock Value @ Wholesale (₹)': item.stockValueWholesale,
      'Warehouse Status': item.status,
      'Last Batch Date': item.lastProducedDate || '-'
    }));

    exportToExcel(exportData, `Warehouse_Packed_Units_Stock_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Header & KPI Summary */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Warehouse Product Stock (Packed Units)
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full font-mono">
              Live Warehouse Balance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time calculation of packaged units produced minus billed sales to determine warehouse stock on hand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Stock Sheet</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Packed Output</span>
          <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
            {totalPackedProduced.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-normal">Packs</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Units Sold</span>
          <div className="text-lg font-extrabold text-indigo-700 font-mono mt-0.5">
            {totalPackedSold.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-normal">Packs</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Warehouse Packed Stock</span>
          <div className="text-lg font-extrabold text-emerald-800 font-mono mt-0.5">
            {totalPackedInStock.toLocaleString()} <span className="text-xs font-sans text-emerald-700 font-normal">Packs Available</span>
          </div>
        </div>

        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Stock Valuation (@ MRP)</span>
          <div className="text-lg font-extrabold text-indigo-900 font-mono mt-0.5">
            ₹{totalStockValueMrp.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product or pouch size (e.g. Murukku, 50g)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedRecipe}
              onChange={(e) => setSelectedRecipe(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Snack Products</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="In Stock">In Stock (&gt;25)</option>
              <option value="Low Stock">Low Stock (1-25)</option>
              <option value="Out of Stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>
      )}

      {/* DETAILED TABLE WITH SEPARATE PACKED UNIT STOCK COLUMN */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <th className="px-3.5 py-3">Product Name</th>
              <th className="px-3.5 py-3">Pack Variant</th>
              <th className="px-3.5 py-3 text-right">Batch Produced (Packs)</th>
              <th className="px-3.5 py-3 text-right">Invoiced Sold (Packs)</th>
              {/* SEPARATE PACKED UNIT STOCK COLUMN */}
              <th className="px-4 py-3 text-right bg-indigo-950 text-indigo-200 font-black border-x border-indigo-800">
                <div className="flex items-center justify-end space-x-1">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PACKED UNITS IN WAREHOUSE</span>
                </div>
              </th>
              <th className="px-3.5 py-3 text-right">MRP (₹)</th>
              <th className="px-3.5 py-3 text-right">Stock Valuation (₹)</th>
              <th className="px-3.5 py-3 text-center">Warehouse Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                  No packed unit stock matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={`${item.recipeId}-${item.packSizeId}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 font-extrabold text-slate-900">
                    {item.recipeName}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-semibold">
                      {item.packSizeLabel}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700">
                    {item.producedPacks.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-indigo-600">
                    {item.soldPacks.toLocaleString()}
                  </td>
                  {/* SEPARATE PACKED UNIT STOCK COLUMN */}
                  <td className="px-4 py-2.5 text-right font-mono text-sm font-black bg-emerald-50/60 text-emerald-900 border-x border-emerald-200/80">
                    <div className="inline-flex items-center space-x-1 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                      <span>{item.packedUnitsInStock.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-700 font-sans font-bold">Packs</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-800 font-semibold">
                    ₹{item.mrp}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-slate-900">
                    ₹{item.stockValueMrp.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      item.status === 'In Stock'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === 'Low Stock'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.status === 'In Stock' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {item.status === 'Low Stock' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                      {item.status === 'Out of Stock' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Action Navigation Footer */}
      {(onNavigateToProduction || onNavigateToSales) && (
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Formula: Packed Stock = Total Batch Output Packets - Billed Invoiced Packets</span>
          <div className="flex gap-2">
            {onNavigateToProduction && (
              <button
                onClick={onNavigateToProduction}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                + Log Cooking/Packing Batch
              </button>
            )}
            {onNavigateToSales && (
              <button
                onClick={onNavigateToSales}
                className="text-emerald-600 hover:text-emerald-800 font-bold underline cursor-pointer"
              >
                + Bill Sales Invoice
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
