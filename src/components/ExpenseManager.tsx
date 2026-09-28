import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  DollarSign,
  Zap,
  Wrench,
  Truck,
  Coffee,
  Briefcase,
  Sparkles,
  RefreshCw,
  Eye,
  Camera,
  Upload,
  X,
  TrendingUp,
  User,
  Users,
  Calendar,
  CreditCard
} from 'lucide-react';
import { ExpenseEntry, ExpenseCategory, PurchaseBill, EmployeeSalary, WasteEntry, RawMaterial } from '../types';
import { exportToExcel, exportMultiSheetExcel } from '../utils/excelExport';

interface ExpenseManagerProps {
  expenses: ExpenseEntry[];
  bills?: PurchaseBill[];
  salaries?: EmployeeSalary[];
  wasteEntries?: WasteEntry[];
  materials?: RawMaterial[];
  onAddExpense: (expense: Omit<ExpenseEntry, 'id' | 'voucherNumber'>) => void;
  onUpdateExpense: (id: string, updated: Partial<ExpenseEntry>) => void;
  onDeleteExpense: (id: string) => void;
  onLoadDemoExpenses?: () => void;
  employees?: { id: string; name: string; designation?: string }[];
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  expenses = [],
  bills = [],
  salaries = [],
  wasteEntries = [],
  materials = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onLoadDemoExpenses,
  employees = [],
  canEdit = true,
  canDelete = true
}) => {
  // Navigation inside Expense module
  const [viewMode, setViewMode] = useState<'dashboard' | 'all_spending' | 'log' | 'report'>('dashboard');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Customization toggle states for modal form dropdowns
  const [isCustomEmployee, setIsCustomEmployee] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomMethod, setIsCustomMethod] = useState(false);
  const [isCustomStatus, setIsCustomStatus] = useState(false);

  // Customization toggle states for filter dropdowns
  const [isCustomCategoryFilter, setIsCustomCategoryFilter] = useState(false);
  const [isCustomStatusFilter, setIsCustomStatusFilter] = useState(false);
  const [isCustomEmployeeFilter, setIsCustomEmployeeFilter] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    date: string;
    employeeName: string;
    designation: string;
    category: string;
    title: string;
    amount: string;
    paymentStatus: string;
    paymentMethod: string;
    receiptUrl: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    employeeName: '',
    designation: '',
    category: 'EB / Electricity Bill',
    title: '',
    amount: '',
    paymentStatus: 'Paid / Reimbursed',
    paymentMethod: 'UPI',
    receiptUrl: '',
    notes: ''
  });

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      (isCustomCategoryFilter
        ? e.category.toLowerCase().includes(categoryFilter.toLowerCase())
        : e.category === categoryFilter);

    const matchesStatus =
      statusFilter === 'all' ||
      (isCustomStatusFilter
        ? e.paymentStatus.toLowerCase().includes(statusFilter.toLowerCase())
        : e.paymentStatus === statusFilter);

    const matchesEmployee =
      employeeFilter === 'all' ||
      (isCustomEmployeeFilter
        ? e.employeeName.toLowerCase().includes(employeeFilter.toLowerCase())
        : e.employeeName === employeeFilter);

    let matchesDate = true;
    if (startDate && e.date < startDate) matchesDate = false;
    if (endDate && e.date > endDate) matchesDate = false;

    return matchesSearch && matchesCategory && matchesStatus && matchesEmployee && matchesDate;
  });

  // KPIs
  const totalSpend = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidSpend = filteredExpenses
    .filter((e) => e.paymentStatus === 'Paid / Reimbursed')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingSpend = filteredExpenses
    .filter((e) => e.paymentStatus === 'Pending Approval')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const ebSpend = filteredExpenses
    .filter((e) => e.category === 'EB / Electricity Bill')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const maintSpend = filteredExpenses
    .filter((e) => e.category === 'Machine & Factory Maintenance')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Consolidated Overall Spending Streams
  const totalPurchaseBillsSpend = bills.reduce((sum, b) => {
    const billTotal = b.totalAmount ?? b.items?.reduce((s, i) => s + (i.totalCost || 0), 0) ?? 0;
    return sum + billTotal;
  }, 0);
  const totalPayrollSpend = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  const totalWasteSpend = wasteEntries.reduce((sum, w) => sum + (w.cost || 0), 0);
  const grandTotalCompanySpend = totalSpend + totalPurchaseBillsSpend + totalPayrollSpend + totalWasteSpend;

  // Unified Spending List for Executive Dashboard & Feed
  const unifiedSpendingList = [
    ...bills.map(b => ({
      id: b.id,
      date: b.date || new Date().toISOString().split('T')[0],
      refNumber: b.billNumber || `PB-${b.id.slice(0, 4)}`,
      category: 'Raw Material Purchase',
      beneficiary: b.supplierName || b.vendorName || 'Supplier',
      description: `Purchase Invoice: ${b.items?.length || 0} items (${b.items?.map(i => i.materialId).slice(0, 3).join(', ') || 'Materials'})`,
      amount: b.totalAmount ?? b.items?.reduce((s, i) => s + (i.totalCost || 0), 0) ?? 0,
      type: 'Purchase Bill' as const,
      status: 'Paid / Reimbursed',
      sourceObj: b
    })),
    ...expenses.map(e => ({
      id: e.id,
      date: e.date || new Date().toISOString().split('T')[0],
      refNumber: e.voucherNumber || `VOU-${e.id.slice(0, 4)}`,
      category: e.category || 'General Expense',
      beneficiary: e.paidTo || 'Vendor / Expense',
      description: e.description || e.category || 'Overhead expense',
      amount: e.amount || 0,
      type: 'Overhead Voucher' as const,
      status: e.paymentStatus || 'Paid / Reimbursed',
      sourceObj: e
    })),
    ...salaries.map(s => ({
      id: s.id,
      date: s.disbursementDate || s.monthYear || new Date().toISOString().split('T')[0],
      refNumber: s.paymentRefNo || `PAY-${s.id.slice(0, 4)}`,
      category: 'Payroll & Wages',
      beneficiary: `${s.employeeName} (${s.designation || 'Staff'})`,
      description: `Salary Disbursement (${s.payType || 'Wage'}) for ${s.monthYear || 'Current Month'}`,
      amount: s.netSalary || 0,
      type: 'Salary Payout' as const,
      status: 'Paid / Reimbursed',
      sourceObj: s
    }))
  ].filter(item => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.beneficiary.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.refNumber.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Categories list
  const categories: string[] = [
    'EB / Electricity Bill',
    'Machine & Factory Maintenance',
    'Vehicle / Fuel / Transport',
    'Tea & Refreshments',
    'Office & Stationery',
    'Cleaning & Hygiene',
    'Raw Material Petty Cash',
    'Miscellaneous'
  ];

  const allCategories: string[] = Array.from(
    new Set([
      ...categories,
      ...expenses.map((e) => e.category).filter(Boolean)
    ])
  );

  const allPaymentMethods: string[] = Array.from(
    new Set([
      'Cash',
      'UPI',
      'Bank Transfer',
      'Company Card',
      ...expenses.map((e) => e.paymentMethod || 'Cash').filter(Boolean)
    ])
  );

  const allStatuses: string[] = Array.from(
    new Set([
      'Paid / Reimbursed',
      'Pending Approval',
      'Approved / Due',
      ...expenses.map((e) => e.paymentStatus).filter(Boolean)
    ])
  );

  // Category Icon helper
  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('eb') || c.includes('electric') || c.includes('power')) {
      return <Zap className="w-4 h-4 text-amber-500" />;
    }
    if (c.includes('maint') || c.includes('machine') || c.includes('repair')) {
      return <Wrench className="w-4 h-4 text-blue-500" />;
    }
    if (c.includes('vehicle') || c.includes('fuel') || c.includes('transport') || c.includes('petrol')) {
      return <Truck className="w-4 h-4 text-purple-500" />;
    }
    if (c.includes('tea') || c.includes('refresh') || c.includes('food') || c.includes('water') || c.includes('snack')) {
      return <Coffee className="w-4 h-4 text-emerald-500" />;
    }
    if (c.includes('office') || c.includes('stationery') || c.includes('pen') || c.includes('paper')) {
      return <Briefcase className="w-4 h-4 text-indigo-500" />;
    }
    return <Receipt className="w-4 h-4 text-slate-500" />;
  };

  // Unique employee names from expenses & employee list
  const allEmployeeNames = Array.from(
    new Set([
      ...expenses.map((e) => e.employeeName).filter(Boolean),
      ...employees.map((e) => e.name).filter(Boolean)
    ])
  ).sort();

  // Handlers
  const handleOpenNewModal = () => {
    setEditingId(null);
    setIsCustomEmployee(false);
    setIsCustomCategory(false);
    setIsCustomMethod(false);
    setIsCustomStatus(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      employeeName: employees.length > 0 ? employees[0].name : '',
      designation: employees.length > 0 ? (employees[0].designation || '') : '',
      category: 'EB / Electricity Bill',
      title: '',
      amount: '',
      paymentStatus: 'Paid / Reimbursed',
      paymentMethod: 'UPI',
      receiptUrl: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEditModal = (e: ExpenseEntry) => {
    setEditingId(e.id);
    setIsCustomEmployee(!allEmployeeNames.includes(e.employeeName));
    setIsCustomCategory(!allCategories.includes(e.category));
    setIsCustomMethod(!allPaymentMethods.includes(e.paymentMethod || 'Cash'));
    setIsCustomStatus(!allStatuses.includes(e.paymentStatus));
    setFormData({
      date: e.date,
      employeeName: e.employeeName,
      designation: e.designation || '',
      category: e.category,
      title: e.title,
      amount: String(e.amount),
      paymentStatus: e.paymentStatus,
      paymentMethod: e.paymentMethod || 'Cash',
      receiptUrl: e.receiptUrl || '',
      notes: e.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleEmployeeChange = (name: string) => {
    const emp = employees.find((x) => x.name === name);
    setFormData((prev) => ({
      ...prev,
      employeeName: name,
      designation: emp?.designation || prev.designation
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, receiptUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.employeeName) {
      alert('Please fill in Employee Name, Title / Description, and Amount.');
      return;
    }

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (editingId) {
      onUpdateExpense(editingId, {
        date: formData.date,
        employeeName: formData.employeeName,
        designation: formData.designation,
        category: formData.category,
        title: formData.title,
        amount: numAmount,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        receiptUrl: formData.receiptUrl,
        notes: formData.notes
      });
    } else {
      onAddExpense({
        date: formData.date,
        employeeName: formData.employeeName,
        designation: formData.designation,
        category: formData.category,
        title: formData.title,
        amount: numAmount,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        receiptUrl: formData.receiptUrl,
        notes: formData.notes
      });
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (e: ExpenseEntry) => {
    if (!canEdit) return;
    const nextStatus =
      e.paymentStatus === 'Paid / Reimbursed'
        ? 'Pending Approval'
        : e.paymentStatus === 'Pending Approval'
        ? 'Approved / Due'
        : 'Paid / Reimbursed';
    onUpdateExpense(e.id, { paymentStatus: nextStatus });
  };

  // Excel Export for Log List
  const handleExportLogExcel = () => {
    const exportData = filteredExpenses.map((e) => ({
      'Voucher No': e.voucherNumber,
      'Date': e.date,
      'Employee Name': e.employeeName,
      'Designation': e.designation || '-',
      'Category': e.category,
      'Expense Title / Description': e.title,
      'Amount (₹)': e.amount,
      'Payment Status': e.paymentStatus,
      'Payment Method': e.paymentMethod || '-',
      'Receipt Attached': e.receiptUrl ? 'Yes' : 'No',
      'Notes': e.notes || '-'
    }));
    exportToExcel(exportData, `Factory_Expense_Log_${new Date().toISOString().split('T')[0]}`, 'Expense Vouchers');
  };

  // Excel Export for Separate Expense Report
  const handleExportReportExcel = () => {
    const sheets: { name: string; data: Record<string, any>[] }[] = [];

    // Sheet 1: Category Analysis
    const catData = allCategories.map((cat) => {
      const items = filteredExpenses.filter((e) => e.category === cat);
      const sum = items.reduce((acc, e) => acc + (e.amount || 0), 0);
      const pct = totalSpend > 0 ? ((sum / totalSpend) * 100).toFixed(1) + '%' : '0%';
      const avg = items.length > 0 ? Math.round(sum / items.length) : 0;
      return {
        'Expense Category': cat,
        'Total Spend (₹)': sum,
        '% of Total Overhead': pct,
        'Number of Vouchers': items.length,
        'Average Spend (₹/Voucher)': avg
      };
    });
    sheets.push({ name: 'Category Breakdown', data: catData });

    // Sheet 2: Pay To / Beneficiary Analysis
    const empData = allEmployeeNames.map((emp) => {
      const items = filteredExpenses.filter((e) => e.employeeName === emp);
      const sum = items.reduce((acc, e) => acc + (e.amount || 0), 0);
      const paid = items
        .filter((e) => e.paymentStatus === 'Paid / Reimbursed')
        .reduce((acc, e) => acc + (e.amount || 0), 0);
      const pending = items
        .filter((e) => e.paymentStatus !== 'Paid / Reimbursed')
        .reduce((acc, e) => acc + (e.amount || 0), 0);
      return {
        'Employee Name': emp,
        'Total Expense Claims (₹)': sum,
        'Reimbursed / Paid (₹)': paid,
        'Pending Approval / Due (₹)': pending,
        'Vouchers Count': items.length
      };
    }).filter((x) => x['Vouchers Count'] > 0);
    sheets.push({ name: 'Pay To / Beneficiary Report', data: empData });

    // Sheet 3: Detailed Vouchers
    const voucherData = filteredExpenses.map((e) => ({
      'Voucher No': e.voucherNumber,
      'Date': e.date,
      'Employee': e.employeeName,
      'Category': e.category,
      'Title': e.title,
      'Amount (₹)': e.amount,
      'Status': e.paymentStatus,
      'Payment Method': e.paymentMethod || '-',
      'Notes': e.notes || '-'
    }));
    sheets.push({ name: 'Voucher Details', data: voucherData });

    exportMultiSheetExcel(sheets, `Factory_Expense_Report_Separate_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="expense-manager-view">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Overall Spending & Other Expenses</h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Track company maintenance entries, EB bill payments, vehicle fuel, refreshments, and generate dedicated expense analytics reports.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex-wrap">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'dashboard'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Overall Dashboard</span>
              </button>
              <button
                onClick={() => setViewMode('all_spending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'all_spending'
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>All Spending Feed</span>
              </button>
              <button
                onClick={() => setViewMode('log')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'log'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Overhead Vouchers</span>
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'report'
                    ? 'bg-indigo-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Expense Reports</span>
              </button>
            </div>

            {canEdit && (
              <button
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log New Expense</span>
              </button>
            )}

            {expenses.length === 0 && onLoadDemoExpenses && (
              <button
                onClick={onLoadDemoExpenses}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer animate-pulse"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Demo Expenses</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards (Consolidated Company Expenditure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setViewMode('dashboard')}
          className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4.5 border border-indigo-500/30 shadow-md flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all text-white group"
        >
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              Grand Total Spending
            </p>
            <p className="text-2xl font-black text-white mt-1 font-mono">₹{grandTotalCompanySpend.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-indigo-200 mt-0.5">All 4 streams combined</p>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setViewMode('all_spending')}
          className="bg-white rounded-2xl p-4.5 border-2 border-blue-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all group"
        >
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              🛒 Raw Material Bills
            </p>
            <p className="text-xl font-black text-slate-900 mt-1 font-mono">₹{totalPurchaseBillsSpend.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-semibold text-blue-500 mt-0.5">{bills.length} bills auto-synced</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setViewMode('log')}
          className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
        >
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Overhead Vouchers</p>
            <p className="text-xl font-black text-slate-900 mt-1 font-mono">₹{totalSpend.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{filteredExpenses.length} factory vouchers</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setViewMode('all_spending')}
          className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all group"
        >
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Payroll & Wages</p>
            <p className="text-xl font-black text-slate-900 mt-1 font-mono">₹{totalPayrollSpend.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{salaries.length} staff payouts</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setViewMode('report')}
          className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Spoilage & Waste</p>
            <p className="text-xl font-black text-slate-900 mt-1 font-mono">₹{totalWasteSpend.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-purple-500 mt-0.5">{wasteEntries.length} inventory losses</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Dashboard) */}
      {viewMode !== 'dashboard' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative min-w-[240px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by supplier, employee, notes or reference ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCustomCategoryFilter ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type custom category..."
                  value={categoryFilter === 'all' ? '' : categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value || 'all')}
                  className="px-3 py-1.5 pr-7 bg-amber-50 border-2 border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none w-44 animate-fadeIn"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsCustomCategoryFilter(false);
                    setCategoryFilter('all');
                  }}
                  className="absolute right-2 text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                  title="Clear custom category filter"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={categoryFilter}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomCategoryFilter(true);
                    setCategoryFilter('');
                  } else {
                    setCategoryFilter(e.target.value);
                  }
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__CUSTOM__">✨ + Customize / Filter Custom...</option>
              </select>
            )}

            {isCustomStatusFilter ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type custom status..."
                  value={statusFilter === 'all' ? '' : statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value || 'all')}
                  className="px-3 py-1.5 pr-7 bg-amber-50 border-2 border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none w-40 animate-fadeIn"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsCustomStatusFilter(false);
                    setStatusFilter('all');
                  }}
                  className="absolute right-2 text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                  title="Clear custom status filter"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomStatusFilter(true);
                    setStatusFilter('');
                  } else {
                    setStatusFilter(e.target.value);
                  }
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {allStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="__CUSTOM__">✨ + Customize / Filter Custom...</option>
              </select>
            )}

            {isCustomEmployeeFilter ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type custom employee..."
                  value={employeeFilter === 'all' ? '' : employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value || 'all')}
                  className="px-3 py-1.5 pr-7 bg-amber-50 border-2 border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none w-40 animate-fadeIn"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsCustomEmployeeFilter(false);
                    setEmployeeFilter('all');
                  }}
                  className="absolute right-2 text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                  title="Clear custom employee filter"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={employeeFilter}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomEmployeeFilter(true);
                    setEmployeeFilter('');
                  } else {
                    setEmployeeFilter(e.target.value);
                  }
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[170px] cursor-pointer"
              >
                <option value="all">All Employees</option>
                {allEmployeeNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="__CUSTOM__">✨ + Customize / Filter Custom...</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 justify-end">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="Start Date"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="End Date"
          />
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || employeeFilter !== 'all' || startDate || endDate || isCustomCategoryFilter || isCustomStatusFilter || isCustomEmployeeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
                setEmployeeFilter('all');
                setStartDate('');
                setEndDate('');
                setIsCustomCategoryFilter(false);
                setIsCustomStatusFilter(false);
                setIsCustomEmployeeFilter(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      {/* VIEW MODE: TAB 1 (EXECUTIVE OVERALL SPENDING DASHBOARD) */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Company Expenditure Distribution by Stream
            </h3>
            <div className="space-y-4">
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${grandTotalCompanySpend ? (totalPurchaseBillsSpend / grandTotalCompanySpend) * 100 : 0}%` }}
                  className="bg-blue-600 h-full transition-all duration-500"
                  title={`Purchase Bills: ₹${totalPurchaseBillsSpend.toLocaleString()}`}
                />
                <div 
                  style={{ width: `${grandTotalCompanySpend ? (totalSpend / grandTotalCompanySpend) * 100 : 0}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Overhead Vouchers: ₹${totalSpend.toLocaleString()}`}
                />
                <div 
                  style={{ width: `${grandTotalCompanySpend ? (totalPayrollSpend / grandTotalCompanySpend) * 100 : 0}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Payroll: ₹${totalPayrollSpend.toLocaleString()}`}
                />
                <div 
                  style={{ width: `${grandTotalCompanySpend ? (totalWasteSpend / grandTotalCompanySpend) * 100 : 0}%` }}
                  className="bg-purple-600 h-full transition-all duration-500"
                  title={`Waste Losses: ₹${totalWasteSpend.toLocaleString()}`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div 
                  onClick={() => setViewMode('all_spending')}
                  className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex justify-between items-center cursor-pointer hover:bg-blue-100/60 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">Raw Material Purchases</span>
                    <span className="text-[11px] text-blue-600">{bills.length} auto-synced invoices</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block font-mono">₹{totalPurchaseBillsSpend.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-blue-700">{grandTotalCompanySpend ? Math.round((totalPurchaseBillsSpend / grandTotalCompanySpend) * 100) : 0}%</span>
                  </div>
                </div>
                <div 
                  onClick={() => setViewMode('log')}
                  className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex justify-between items-center cursor-pointer hover:bg-amber-100/60 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">Overhead & Vouchers</span>
                    <span className="text-[11px] text-amber-600">{filteredExpenses.length} factory vouchers</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block font-mono">₹{totalSpend.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-amber-700">{grandTotalCompanySpend ? Math.round((totalSpend / grandTotalCompanySpend) * 100) : 0}%</span>
                  </div>
                </div>
                <div 
                  onClick={() => setViewMode('all_spending')}
                  className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex justify-between items-center cursor-pointer hover:bg-emerald-100/60 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Salaries & Payroll</span>
                    <span className="text-[11px] text-emerald-600">{salaries.length} staff payouts</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block font-mono">₹{totalPayrollSpend.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-emerald-700">{grandTotalCompanySpend ? Math.round((totalPayrollSpend / grandTotalCompanySpend) * 100) : 0}%</span>
                  </div>
                </div>
                <div 
                  onClick={() => setViewMode('report')}
                  className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex justify-between items-center cursor-pointer hover:bg-purple-100/60 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">Inventory Waste & Spoilage</span>
                    <span className="text-[11px] text-purple-600">{wasteEntries.length} loss records</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block font-mono">₹{totalWasteSpend.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-purple-700">{grandTotalCompanySpend ? Math.round((totalWasteSpend / grandTotalCompanySpend) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-600" />
                Latest Company Expenditures across All Streams
              </h3>
              <button 
                onClick={() => setViewMode('all_spending')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Full Feed ({unifiedSpendingList.length}) →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Stream / Type</th>
                    <th className="p-3">Reference No.</th>
                    <th className="p-3">Beneficiary / Supplier</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unifiedSpendingList.slice(0, 8).map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{item.date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === 'Purchase Bill' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          item.type === 'Overhead Voucher' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.type === 'Purchase Bill' ? '🛒 PURCHASE BILL' : item.type === 'Overhead Voucher' ? '⚡ OVERHEAD' : '👥 PAYROLL'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-600">{item.refNumber}</td>
                      <td className="p-3 font-bold text-slate-800">{item.beneficiary}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{item.description}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {unifiedSpendingList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No company spending records found. Log an expense or create a purchase bill!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: TAB 2 (ALL SPENDING CONSOLIDATED FEED) */}
      {viewMode === 'all_spending' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">All Company Spending Consolidated Feed</h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                {unifiedSpendingList.length} total transactions
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Stream / Type</th>
                  <th className="p-3">Reference No.</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Beneficiary / Supplier</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unifiedSpendingList.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{item.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'Purchase Bill' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        item.type === 'Overhead Voucher' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {item.type === 'Purchase Bill' ? '🛒 PURCHASE BILL' : item.type === 'Overhead Voucher' ? '⚡ OVERHEAD' : '👥 PAYROLL'}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-600">{item.refNumber}</td>
                    <td className="p-3 font-medium text-slate-700">{item.category}</td>
                    <td className="p-3 font-bold text-slate-800">{item.beneficiary}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {unifiedSpendingList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No matching spending transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: TAB 3 (OVERHEAD LOG TABLE) */}
      {viewMode === 'log' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-800">Expense Vouchers Log</h3>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold">
                {filteredExpenses.length} records
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportLogExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Export expense log table to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Voucher No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Paid To / Beneficiary</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Title / Description</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Paid By</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No expense entries found matching the filters. Click "Log New Expense" to record company spending.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.voucherNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{e.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{e.employeeName}</div>
                        {e.designation && <div className="text-[11px] text-slate-400">{e.designation}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                          {getCategoryIcon(e.category)}
                          <span>{e.category.split('/')[0].trim()}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={e.title}>
                          {e.title}
                        </div>
                        {e.notes && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={e.notes}>
                            {e.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">₹{e.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(e)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1 ${
                            e.paymentStatus === 'Paid / Reimbursed'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : e.paymentStatus === 'Pending Approval'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {e.paymentStatus === 'Paid / Reimbursed' && <CheckCircle className="w-3 h-3" />}
                          {e.paymentStatus === 'Pending Approval' && <Clock className="w-3 h-3" />}
                          <span>{e.paymentStatus}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          {e.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {e.receiptUrl ? (
                          <button
                            onClick={() => setReceiptPreviewUrl(e.receiptUrl || null)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg inline-flex items-center space-x-1 font-semibold text-[11px] cursor-pointer"
                            title="View Receipt Image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">No Bill</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {canEdit && (
                          <button
                            onClick={() => handleEditModal(e)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                            title="Edit expense"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete expense voucher ${e.voucherNumber}?`)) {
                                onDeleteExpense(e.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: TAB 4 (SEPARATE EXPENSE REPORT & ANALYTICS) */}
      {viewMode === 'report' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Separate Expense Analytics & Overhead Report</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Detailed breakdowns of overall spending by category (EB bills, maintenance, transport) and pay to / beneficiary reimbursements.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                type="button"
                onClick={handleExportReportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                title="Export multi-sheet expense report (Categories, Employees, Vouchers) to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Expense Report Excel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Briefcase className="w-4 h-4 text-slate-600" />
                  <span>Spending by Category</span>
                </h4>
                <span className="text-xs font-semibold text-slate-500">Total: ₹{totalSpend.toLocaleString()}</span>
              </div>
              <div className="p-4 divide-y divide-slate-100">
                {allCategories.map((cat) => {
                  const items = filteredExpenses.filter((e) => e.category === cat);
                  const sum = items.reduce((acc, e) => acc + (e.amount || 0), 0);
                  const pct = totalSpend > 0 ? (sum / totalSpend) * 100 : 0;
                  return (
                    <div key={cat} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-slate-100 rounded-xl">{getCategoryIcon(cat)}</div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{cat}</p>
                          <p className="text-[11px] text-slate-400">{items.length} vouchers recorded</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">₹{sum.toLocaleString()}</p>
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 w-8">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pay To / Beneficiary Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Paid To / Beneficiary Breakdown</span>
                </h4>
                <span className="text-xs font-semibold text-slate-500">{allEmployeeNames.length} staff</span>
              </div>
              <div className="p-4 divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {allEmployeeNames.map((empName) => {
                  const items = filteredExpenses.filter((e) => e.employeeName === empName);
                  if (items.length === 0) return null;
                  const sum = items.reduce((acc, e) => acc + (e.amount || 0), 0);
                  const paid = items
                    .filter((e) => e.paymentStatus === 'Paid / Reimbursed')
                    .reduce((acc, e) => acc + (e.amount || 0), 0);
                  const pending = items
                    .filter((e) => e.paymentStatus !== 'Paid / Reimbursed')
                    .reduce((acc, e) => acc + (e.amount || 0), 0);
                  const empObj = employees.find((x) => x.name === empName);

                  return (
                    <div key={empName} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{empName}</p>
                        <p className="text-[11px] text-slate-400">
                          {empObj?.designation || items[0]?.designation || 'Staff'} • {items.length} claim(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">₹{sum.toLocaleString()}</p>
                        <div className="flex items-center justify-end space-x-2 mt-0.5 text-[11px]">
                          <span className="text-emerald-600 font-semibold">Paid: ₹{paid.toLocaleString()}</span>
                          {pending > 0 && <span className="text-amber-600 font-semibold">• Due: ₹{pending.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Expense Voucher' : 'Log New Expense'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Paid By (Method)</label>
                    {isCustomMethod && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMethod(false);
                          setFormData({ ...formData, paymentMethod: 'UPI' });
                        }}
                        className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                      >
                        ← Select from list
                      </button>
                    )}
                  </div>
                  {isCustomMethod ? (
                    <input
                      type="text"
                      placeholder="Type custom paid by method (e.g. Cheque, Razorpay)..."
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-500 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 animate-fadeIn"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomMethod(true);
                          setFormData({ ...formData, paymentMethod: '' });
                        } else {
                          setFormData({ ...formData, paymentMethod: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {allPaymentMethods.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                      <option value="__CUSTOM__">✨ + Customize / Add New Method...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Paid To (Beneficiary / Employee) *</label>
                    {isCustomEmployee && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomEmployee(false);
                          setFormData({ ...formData, employeeName: employees[0]?.name || allEmployeeNames[0] || '' });
                        }}
                        className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                      >
                        ← Select from list
                      </button>
                    )}
                  </div>
                  {isCustomEmployee ? (
                    <input
                      type="text"
                      placeholder="Type custom paid to / beneficiary name..."
                      value={formData.employeeName}
                      onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                      className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-500 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 animate-fadeIn"
                      autoFocus
                      required
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.employeeName}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomEmployee(true);
                            setFormData({ ...formData, employeeName: '' });
                          } else {
                            handleEmployeeChange(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        required
                      >
                        <option value="">Select Employee...</option>
                        {allEmployeeNames.map((name) => {
                          const emp = employees.find((x) => x.name === name);
                          return (
                            <option key={name} value={name}>
                              {name} {emp?.designation ? `(${emp.designation})` : ''}
                            </option>
                          );
                        })}
                        <option value="__CUSTOM__">✨ + Customize / Add New Employee...</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">By Whom</label>
                  <input
                    type="text"
                    placeholder="e.g. Factory Supervisor / Admin"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Expense Category *</label>
                    {isCustomCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setFormData({ ...formData, category: 'EB / Electricity Bill' });
                        }}
                        className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                      >
                        ← Select from list
                      </button>
                    )}
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      placeholder="Type custom category name..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-500 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 animate-fadeIn"
                      autoFocus
                      required
                    />
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomCategory(true);
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      required
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__CUSTOM__">✨ + Customize / Add New Category...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4850"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. TNEB Factory 3-Phase Electricity Bill - July"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Payment & Approval Status</label>
                  {isCustomStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomStatus(false);
                        setFormData({ ...formData, paymentStatus: 'Paid / Reimbursed' });
                      }}
                      className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                    >
                      ← Select from list
                    </button>
                  )}
                </div>
                {isCustomStatus ? (
                  <input
                    type="text"
                    placeholder="Type custom status (e.g. Audit Review, Partial Paid)..."
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-500 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 animate-fadeIn"
                    autoFocus
                  />
                ) : (
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomStatus(true);
                        setFormData({ ...formData, paymentStatus: '' });
                      } else {
                        setFormData({ ...formData, paymentStatus: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {allStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✨ + Customize / Add New Status...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Receipt / Bill Photo</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer text-center flex items-center justify-center space-x-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{formData.receiptUrl ? 'Change Bill Photo' : 'Upload Receipt Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {formData.receiptUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receiptUrl: '' })}
                      className="px-2.5 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-semibold transition-colors"
                      title="Remove bill photo"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {formData.receiptUrl && (
                  <div className="mt-2 text-center">
                    <img src={formData.receiptUrl} alt="Bill preview" className="max-h-24 mx-auto rounded-lg border border-slate-200 shadow-sm" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid via company Google Pay. Meter reading unit consumption checked."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingId ? 'Update Expense' : 'Save Expense Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-center relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Expense Bill / Receipt Attachment</span>
              </h3>
              <button
                onClick={() => setReceiptPreviewUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <img src={receiptPreviewUrl} alt="Receipt Full" className="max-w-full max-h-[65vh] rounded-xl object-contain" />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setReceiptPreviewUrl(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
