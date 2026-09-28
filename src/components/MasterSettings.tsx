import React, { useState, useRef } from 'react';
import { 
  CompanyInvoiceSettings, 
  RolePermissions, 
  UserProfile, 
  RawMaterial, 
  Recipe, 
  ProductionBatch, 
  PurchaseBill, 
  SaleEntry, 
  ExpenseEntry, 
  DailyUsageEntry, 
  EmployeeSalary, 
  AttendanceRecord 
} from '../types';
import { 
  Building, 
  Sliders, 
  Package, 
  Users, 
  ShieldCheck, 
  Database, 
  Save, 
  Check, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff,
  Crown,
  FileCheck,
  UserCheck,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Flame,
  Droplet,
  Layers,
  ArrowRight
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface MasterSettingsProps {
  companySettings: CompanyInvoiceSettings;
  onSaveCompanySettings: (updated: CompanyInvoiceSettings) => void;
  rolePermissions: RolePermissions;
  onSaveRolePermissions: (updated: RolePermissions) => void;
  users: UserProfile[];
  onSaveUsers: (updated: UserProfile[]) => void;
  currentUser: UserProfile;
  onUpdateCurrentUser?: (updated: UserProfile) => void;
  customJobRoles: string[];
  onSaveCustomJobRoles: (roles: string[]) => void;
  // Databases for backup & restore
  materials: RawMaterial[];
  recipes: Recipe[];
  batches: ProductionBatch[];
  bills: PurchaseBill[];
  salesEntries: SaleEntry[];
  expenses: ExpenseEntry[];
  dailyUsageEntries: DailyUsageEntry[];
  employeeSalaries: EmployeeSalary[];
  attendanceRecords: AttendanceRecord[];
  onRestoreAllData: (data: any) => void;
  onZeroOutLedger: () => void;
  onFactoryReset: () => void;
}

export default function MasterSettings({
  companySettings,
  onSaveCompanySettings,
  rolePermissions,
  onSaveRolePermissions,
  users,
  onSaveUsers,
  currentUser,
  onUpdateCurrentUser,
  customJobRoles,
  onSaveCustomJobRoles,
  materials,
  recipes,
  batches,
  bills,
  salesEntries,
  expenses,
  dailyUsageEntries,
  employeeSalaries,
  attendanceRecords,
  onRestoreAllData,
  onZeroOutLedger,
  onFactoryReset
}: MasterSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ceo_profile' | 'company' | 'factory' | 'packaging' | 'labor' | 'security' | 'backup'>('ceo_profile');
  
  // Find CEO user profile
  const ceoUser = users.find(u => u.role === 'CEO') || currentUser;
  const [ceoProfileForm, setCeoProfileForm] = useState({
    name: ceoUser.name || 'S. K. Murugesan',
    username: ceoUser.username || 'ceo_master',
    title: ceoUser.title || 'Founder & Managing Director',
    email: ceoUser.email || 'ceo@aadiyarts.com',
    phone: ceoUser.phone || '+91 98421 00001',
    photoUrl: ceoUser.photoUrl || ceoUser.profilePhoto || '',
    signatureUrl: ceoUser.signatureUrl || '',
    newPassword: '',
    confirmPassword: '',
    showPassword: false
  });
  const ceoPhotoInputRef = useRef<HTMLInputElement>(null);
  const ceoSignInputRef = useRef<HTMLInputElement>(null);

  // Local form states
  const [companyForm, setCompanyForm] = useState<CompanyInvoiceSettings>({
    companyName: companySettings.companyName || 'Aadiyar T3 Snacks',
    tagline: companySettings.tagline || 'Portion Controls & ERP System',
    logoUrl: companySettings.logoUrl || '',
    address: companySettings.address || '',
    city: companySettings.city || 'Madurai',
    state: companySettings.state || 'Tamil Nadu',
    pincode: companySettings.pincode || '625001',
    phone: companySettings.phone || '',
    email: companySettings.email || '',
    fssaiNumber: companySettings.fssaiNumber || '12423008000456',
    gstin: companySettings.gstin || companySettings.gstNumber || '',
    gstNumber: companySettings.gstNumber || companySettings.gstin || '',
    invoicePrefix: companySettings.invoicePrefix || 'INV-',
    startingNumber: companySettings.startingNumber || 1001,
    financialYear: companySettings.financialYear || '2026-2027',
    bankName: companySettings.bankName || '',
    accountNumber: companySettings.accountNumber || '',
    ifscCode: companySettings.ifscCode || '',
    branchName: companySettings.branchName || '',
    upiId: companySettings.upiId || '',
    termsAndConditions: companySettings.termsAndConditions || '',
    footerNote: companySettings.footerNote || '',

    // Factory Defaults
    defaultShift: companySettings.defaultShift || 'Full Day',
    defaultOilType: companySettings.defaultOilType || 'Palm Oil',
    defaultOilCostPerLitre: companySettings.defaultOilCostPerLitre ?? 135,
    oilConsumptionBenchmarkRatio: companySettings.oilConsumptionBenchmarkRatio ?? 0.28,
    defaultFuelType: companySettings.defaultFuelType || 'Firewood',
    defaultFirewoodCostPerKg: companySettings.defaultFirewoodCostPerKg ?? 8.5,
    defaultGasCostPerCylinder: companySettings.defaultGasCostPerCylinder ?? 1850,
    defaultOverheadBurden: companySettings.defaultOverheadBurden ?? 300,
    autoDeductInventoryOnDailySave: companySettings.autoDeductInventoryOnDailySave ?? true,
    lowStockThresholdKg: companySettings.lowStockThresholdKg ?? 10,
    currencySymbol: companySettings.currencySymbol || '₹',

    // Packaging Presets
    packagingPresets: companySettings.packagingPresets || [50, 100, 150, 200, 250, 400, 500, 1000, 5000],
    defaultPouchWastageBufferPercent: companySettings.defaultPouchWastageBufferPercent ?? 3,

    // Labor Benchmarks
    defaultMasterDailyWage: companySettings.defaultMasterDailyWage ?? 850,
    defaultHelperDailyWage: companySettings.defaultHelperDailyWage ?? 550,
    defaultPackagingDailyWage: companySettings.defaultPackagingDailyWage ?? 600,
    defaultSalesmanDailyWage: companySettings.defaultSalesmanDailyWage ?? 600,
    defaultOvertimeHourlyRate: companySettings.defaultOvertimeHourlyRate ?? 80,
    standardShiftHours: companySettings.standardShiftHours ?? 8
  });

  const [permissionsForm, setPermissionsForm] = useState<RolePermissions>(rolePermissions);
  const [usersList, setUsersList] = useState<UserProfile[]>(users);
  const [jobRolesList, setJobRolesList] = useState<string[]>(
    customJobRoles && customJobRoles.length > 0 
      ? customJobRoles 
      : ['Master', 'Assistant Master', 'Master Helper', 'Packaging Person', 'Manager', 'Distributor', 'Driver', 'Sales Executive', 'Accountant', 'Supervisor']
  );
  const [newJobRoleInput, setNewJobRoleInput] = useState('');
  const [newPresetWeightInput, setNewPresetWeightInput] = useState('');

  // User form modal/inputs
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    name: '',
    role: 'Supervisor' as UserProfile['role'],
    pin: '1234',
    phone: '',
    email: ''
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Save all settings handler
  const handleSaveMasterSettings = () => {
    onSaveCompanySettings(companyForm);
    onSaveRolePermissions(permissionsForm);
    onSaveUsers(usersList);
    onSaveCustomJobRoles(jobRolesList);
    handleSaveCeoProfile();
    showNotification('All Master Settings and CEO Profile have been saved across the entire software!');
  };

  // CEO Profile Upload & Save Handlers
  const handleCeoPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Photo is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCeoProfileForm(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCeoSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Signature image is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCeoProfileForm(prev => ({ ...prev, signatureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCeoProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (ceoProfileForm.newPassword && ceoProfileForm.newPassword !== ceoProfileForm.confirmPassword) {
      alert('Password and Confirm Password do not match!');
      return;
    }

    const updatedCeo: UserProfile = {
      ...ceoUser,
      name: ceoProfileForm.name.trim() || ceoUser.name,
      username: ceoProfileForm.username.trim() || ceoUser.username,
      title: ceoProfileForm.title.trim(),
      email: ceoProfileForm.email.trim(),
      phone: ceoProfileForm.phone.trim(),
      photoUrl: ceoProfileForm.photoUrl,
      profilePhoto: ceoProfileForm.photoUrl,
      signatureUrl: ceoProfileForm.signatureUrl,
      ...(ceoProfileForm.newPassword ? { password: ceoProfileForm.newPassword, pin: ceoProfileForm.newPassword } : {})
    };

    const updatedUsers = usersList.map(u => (u.id === updatedCeo.id || u.role === 'CEO') ? updatedCeo : u);
    setUsersList(updatedUsers);
    onSaveUsers(updatedUsers);

    if (currentUser.role === 'CEO' && onUpdateCurrentUser) {
      onUpdateCurrentUser(updatedCeo);
    }

    setCeoProfileForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    showNotification('👑 CEO Master Profile, Avatar & Credentials successfully saved and applied across software!');
  };

  // Logo upload helper
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Packaging Presets helpers
  const handleAddPreset = () => {
    const g = Number(newPresetWeightInput);
    if (!g || g <= 0) return;
    const current = companyForm.packagingPresets || [];
    if (!current.includes(g)) {
      const updated = [...current, g].sort((a, b) => a - b);
      setCompanyForm(prev => ({ ...prev, packagingPresets: updated }));
      setNewPresetWeightInput('');
    }
  };

  const handleRemovePreset = (val: number) => {
    const current = companyForm.packagingPresets || [];
    setCompanyForm(prev => ({
      ...prev,
      packagingPresets: current.filter(x => x !== val)
    }));
  };

  // Job Roles helpers
  const handleAddJobRole = () => {
    const trimmed = newJobRoleInput.trim();
    if (!trimmed) return;
    if (!jobRolesList.includes(trimmed)) {
      const updated = [...jobRolesList, trimmed];
      setJobRolesList(updated);
      onSaveCustomJobRoles(updated);
      setNewJobRoleInput('');
    }
  };

  const handleRemoveJobRole = (role: string) => {
    const updated = jobRolesList.filter(r => r !== role);
    setJobRolesList(updated);
    onSaveCustomJobRoles(updated);
  };

  // User Accounts helpers
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.name.trim()) {
      alert('Please provide username and full name');
      return;
    }
    if (usersList.some(u => u.username.toLowerCase() === newUserForm.username.toLowerCase())) {
      alert('A user with this username already exists');
      return;
    }
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      username: newUserForm.username.trim(),
      name: newUserForm.name.trim(),
      role: newUserForm.role,
      password: newUserForm.pin,
      phone: newUserForm.phone,
      email: newUserForm.email
    };
    const updated = [...usersList, newUser];
    setUsersList(updated);
    onSaveUsers(updated);
    setIsAddingUser(false);
    setNewUserForm({ username: '', name: '', role: 'Supervisor', pin: '1234', phone: '', email: '' });
    showNotification(`New user account "${newUser.name}" created!`);
  };

  const handleDeleteUser = (id: string) => {
    if (usersList.length <= 1) {
      alert('You cannot delete the only existing user account.');
      return;
    }
    const target = usersList.find(u => u.id === id);
    if (target?.role === 'CEO' && usersList.filter(u => u.role === 'CEO').length === 1) {
      alert('Cannot delete the primary CEO account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user account "${target?.name}"?`)) {
      const updated = usersList.filter(u => u.id !== id);
      setUsersList(updated);
      onSaveUsers(updated);
      showNotification('User account removed');
    }
  };

  // Full Database Backup handler (JSON download)
  const handleDownloadBackup = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      software: 'Aadiyar T3 Snacks ERP',
      version: '2.0',
      companySettings: companyForm,
      rolePermissions: permissionsForm,
      users: usersList,
      customJobRoles: jobRolesList,
      materials,
      recipes,
      batches,
      bills,
      salesEntries,
      expenses,
      dailyUsageEntries,
      employeeSalaries,
      attendanceRecords
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Aadiyar_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Complete software backup downloaded successfully!');
  };

  // Restore Database handler (JSON import)
  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.materials && !json.recipes && !json.companySettings) {
          alert('Invalid backup file. Missing essential database structures.');
          return;
        }

        if (confirm('Restore Warning: This will overwrite your current settings, recipes, and records with the data from the backup file. Proceed?')) {
          onRestoreAllData(json);
          if (json.companySettings) setCompanyForm(json.companySettings);
          if (json.rolePermissions) setPermissionsForm(json.rolePermissions);
          if (json.users) setUsersList(json.users);
          if (json.customJobRoles) setJobRolesList(json.customJobRoles);
          showNotification('Database successfully restored from backup file!');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file. Please ensure it is a valid backup export.');
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  // Export All to Excel
  const handleExportFullExcel = () => {
    const rows = [
      ['AADIYAR T3 SNACKS ERP - MASTER SUMMARY EXPORT'],
      ['Export Date', new Date().toLocaleString()],
      ['Company Name', companyForm.companyName],
      ['FSSAI License', companyForm.fssaiNumber || '-'],
      ['GSTIN', companyForm.gstin || '-'],
      [],
      ['SUMMARY STATS'],
      ['Total Raw Materials in Catalog', materials.length],
      ['Total Recipes Defined', recipes.length],
      ['Total Daily Usage Logs', dailyUsageEntries.length],
      ['Total Production Batches', batches.length],
      ['Total Purchase Bills', bills.length],
      ['Total Sales Invoices', salesEntries.length],
      ['Total Staff in Directory', employeeSalaries.length]
    ];
    exportToExcel(rows, `Master_Software_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-slate-800 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Master Settings Center
            </h2>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-md">
              Full Software Control
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Configure company branding, production benchmarks, packaging presets, labor rates, role security, and database backup operations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleSaveMasterSettings}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Master Changes</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* Main Grid: Tabs Sidebar + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-1">
          {/* CEO Master Profile & Customization Option */}
          <button
            type="button"
            onClick={() => setActiveSubTab('ceo_profile')}
            className={`w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
              activeSubTab === 'ceo_profile'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                : 'text-amber-950 bg-amber-50/80 border-amber-200 hover:bg-amber-100/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 shrink-0 text-amber-600" />
              <span>👑 CEO Profile & Master Customization</span>
            </div>
            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[9px] font-black uppercase shadow-2xs">
              CEO
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('company')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'company'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 shrink-0" />
              <span>1. Company & Branding</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('factory')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'factory'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 shrink-0 text-amber-500" />
              <span>2. Factory & Production Defaults</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('packaging')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'packaging'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 shrink-0 text-purple-500" />
              <span>3. Packaging & Pouch Presets</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('labor')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'labor'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0 text-blue-500" />
              <span>4. Labor Rates & Job Roles</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('security')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'security'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>5. Users & Role Access Matrix</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('backup')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'backup'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 shrink-0 text-rose-500" />
              <span>6. Backup, Restore & Ledger Reset</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3 space-y-6">

          {/* TAB 0: CEO PROFILE & MASTER CUSTOMIZATION */}
          {activeSubTab === 'ceo_profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
              {/* Header */}
              <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <span>CEO Profile & Executive Account Customization</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize the CEO profile details, display name, executive avatar, signature, and security password.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-extrabold w-fit">
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>CEO Master Authority Enabled</span>
                </div>
              </div>

              {/* CEO Avatar & Banner Card */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-indigo-50/30 to-amber-50 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {ceoProfileForm.photoUrl ? (
                    <img 
                      src={ceoProfileForm.photoUrl} 
                      alt="CEO Photo" 
                      className="w-20 h-20 rounded-full object-cover border-3 border-amber-400 shadow-md bg-white" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md border-3 border-amber-300">
                      {ceoProfileForm.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full shadow-md font-bold text-[10px]" title="Chief Executive Officer">
                    👑
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                      <span>{ceoProfileForm.name || 'CEO Master'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase">
                        CEO
                      </span>
                    </h4>
                    <p className="text-xs font-semibold text-indigo-700">
                      {ceoProfileForm.title || 'Founder & Managing Director'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => ceoPhotoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload Photo</span>
                    </button>
                    <input 
                      type="file" 
                      ref={ceoPhotoInputRef} 
                      onChange={handleCeoPhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    {ceoProfileForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setCeoProfileForm(prev => ({ ...prev, photoUrl: '' }))}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Or enter direct photo URL (https://...)"
                    value={ceoProfileForm.photoUrl}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, photoUrl: e.target.value })}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              {/* CEO Identity Details Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    CEO Full Name / Display Name
                  </label>
                  <input
                    type="text"
                    value={ceoProfileForm.name}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. S. K. Murugesan"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    CEO Login Username
                  </label>
                  <input
                    type="text"
                    value={ceoProfileForm.username}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. ceo_master"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Official Executive Designation / Title
                  </label>
                  <input
                    type="text"
                    value={ceoProfileForm.title}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                    placeholder="e.g. Managing Director & CEO / Founder"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    CEO Direct Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={ceoProfileForm.phone}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 font-mono"
                    placeholder="+91..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    CEO Official Email Address
                  </label>
                  <input
                    type="email"
                    value={ceoProfileForm.email}
                    onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                    placeholder="ceo@aadiyarts.com"
                  />
                </div>
              </div>

              {/* CEO Digital Signature & Stamp */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>CEO Digital Signature / Official Stamp</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Printed on computerized GST Sales Invoices, Purchase Bills, and Staff Salary Slips.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => ceoSignInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Signature Image</span>
                    </button>
                    <input 
                      type="file" 
                      ref={ceoSignInputRef} 
                      onChange={handleCeoSignatureUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    {ceoProfileForm.signatureUrl && (
                      <button
                        type="button"
                        onClick={() => setCeoProfileForm(prev => ({ ...prev, signatureUrl: '' }))}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {ceoProfileForm.signatureUrl && (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 inline-block">
                    <img 
                      src={ceoProfileForm.signatureUrl} 
                      alt="Digital Signature" 
                      className="h-16 max-w-xs object-contain" 
                    />
                  </div>
                )}
              </div>

              {/* Password / PIN Reset */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                <label className="block text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Update CEO Login Password / Master PIN</span>
                </label>
                <p className="text-[10px] text-amber-900">
                  Leave blank if you do not want to change your current login password.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">New Password / PIN</label>
                    <div className="relative">
                      <input
                        type={ceoProfileForm.showPassword ? 'text' : 'password'}
                        placeholder="Enter new password or PIN"
                        value={ceoProfileForm.newPassword}
                        onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, newPassword: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setCeoProfileForm({ ...ceoProfileForm, showPassword: !ceoProfileForm.showPassword })}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {ceoProfileForm.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Confirm New Password</label>
                    <input
                      type={ceoProfileForm.showPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={ceoProfileForm.confirmPassword}
                      onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, confirmPassword: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSaveCeoProfile}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save CEO Profile & Credentials</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: COMPANY & BRANDING */}
          {activeSubTab === 'company' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>Company Identity, FSSAI & Invoice Settings</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Update your brand name, legal registrations, logo, address, and invoice headers across all documents.
                </p>
              </div>

              {/* Logo & Seal */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Brand Logo / Official Seal</label>
                <div className="flex items-center gap-4">
                  {companyForm.logoUrl ? (
                    <img 
                      src={companyForm.logoUrl} 
                      alt="Logo Preview" 
                      className="w-16 h-16 rounded-xl object-contain border border-slate-300 bg-white p-1 shadow-xs" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-xs">
                      {companyForm.companyName.charAt(0)}
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo File (PNG/JPG)</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />

                      {companyForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setCompanyForm(prev => ({ ...prev, logoUrl: '' }))}
                          className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste direct image URL (https://...)"
                      value={companyForm.logoUrl || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Company Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    value={companyForm.companyName}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={companyForm.tagline || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                    <span>FSSAI License Number</span>
                    <span className="text-emerald-700 font-bold text-[9px] bg-emerald-50 px-1 rounded">Required for Food Mfg</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12423008000456"
                    value={companyForm.fssaiNumber || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, fssaiNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 33ABCDE1234F1Z5"
                    value={companyForm.gstin || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Factory Contact Phone</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Business Email</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Factory Street Address</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">City / District</label>
                  <input
                    type="text"
                    value={companyForm.city || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    value={companyForm.pincode || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium font-mono"
                  />
                </div>
              </div>

              {/* Banking & Invoicing details */}
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Bank Account Details for Tax Invoices & UPI Payments</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={companyForm.bankName || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={companyForm.accountNumber || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, accountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">IFSC Code</label>
                    <input
                      type="text"
                      value={companyForm.ifscCode || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, ifscCode: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">UPI ID / VPA</label>
                    <input
                      type="text"
                      value={companyForm.upiId || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, upiId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Invoice Number Prefix</label>
                    <input
                      type="text"
                      value={companyForm.invoicePrefix || 'INV-'}
                      onChange={(e) => setCompanyForm({ ...companyForm, invoicePrefix: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase">Starting Sequence No.</label>
                    <input
                      type="number"
                      value={companyForm.startingNumber || 1001}
                      onChange={(e) => setCompanyForm({ ...companyForm, startingNumber: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Standard Invoice Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={companyForm.termsAndConditions || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, termsAndConditions: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Company & Brand Profile</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FACTORY & PRODUCTION DEFAULTS */}
          {activeSubTab === 'factory' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Factory & Production Cooking Defaults</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Set baseline benchmarks for oil consumption, firewood/gas costs, overhead burden, and automatic inventory stock deduction.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Default Frying Oil */}
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                  <label className="block text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-amber-600" />
                    <span>Default Frying Oil & Rate</span>
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Primary Oil Type</label>
                      <select
                        value={companyForm.defaultOilType || 'Palm Oil'}
                        onChange={(e) => setCompanyForm({ ...companyForm, defaultOilType: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-xs text-slate-800"
                      >
                        <option value="Palm Oil">Palm Oil (பாமாயில்)</option>
                        <option value="Groundnut Oil">Groundnut Oil (கடலை எண்ணெய்)</option>
                        <option value="Sunflower Oil">Sunflower Oil (சூரியகாந்தி எண்ணெய்)</option>
                        <option value="Rice Bran Oil">Rice Bran Oil (தவிட்டு எண்ணெய்)</option>
                        <option value="Sesame Oil">Sesame Oil (நல்லெண்ணெய்)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Cost Per Litre (₹)</label>
                        <input
                          type="number"
                          value={companyForm.defaultOilCostPerLitre ?? 135}
                          onChange={(e) => setCompanyForm({ ...companyForm, defaultOilCostPerLitre: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Litres Oil / Kg Snack</label>
                        <input
                          type="number"
                          step="0.01"
                          value={companyForm.oilConsumptionBenchmarkRatio ?? 0.28}
                          onChange={(e) => setCompanyForm({ ...companyForm, oilConsumptionBenchmarkRatio: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default Furnace Fuel */}
                <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                  <label className="block text-[11px] font-bold text-rose-950 uppercase flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>Default Heating & Furnace Fuel</span>
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Primary Fuel Source</label>
                      <select
                        value={companyForm.defaultFuelType || 'Firewood'}
                        onChange={(e) => setCompanyForm({ ...companyForm, defaultFuelType: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-xs text-slate-800"
                      >
                        <option value="Firewood">Firewood / விறகு</option>
                        <option value="Commercial Gas LPG">Commercial LPG Cylinder (19kg)</option>
                        <option value="Sawdust Briquettes">Sawdust Briquettes</option>
                        <option value="Electric Heating">Electric Induction / Fryer</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">Firewood Rate / Kg (₹)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={companyForm.defaultFirewoodCostPerKg ?? 8.5}
                          onChange={(e) => setCompanyForm({ ...companyForm, defaultFirewoodCostPerKg: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase">LPG Cyl. Rate (₹)</label>
                        <input
                          type="number"
                          value={companyForm.defaultGasCostPerCylinder ?? 1850}
                          onChange={(e) => setCompanyForm({ ...companyForm, defaultGasCostPerCylinder: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overheads & Automation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Standard Daily Overhead (₹)</label>
                  <input
                    type="number"
                    value={companyForm.defaultOverheadBurden ?? 300}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultOverheadBurden: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-[9px] text-slate-500">Rent, maintenance, consumables</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Low Stock Warning Threshold (Kg)</label>
                  <input
                    type="number"
                    value={companyForm.lowStockThresholdKg ?? 10}
                    onChange={(e) => setCompanyForm({ ...companyForm, lowStockThresholdKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-[9px] text-slate-500">Triggers re-order alerts</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Software Currency</label>
                  <input
                    type="text"
                    value={companyForm.currencySymbol || '₹'}
                    onChange={(e) => setCompanyForm({ ...companyForm, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-[9px] text-slate-500">Symbol displayed in ledgers</span>
                </div>
              </div>

              {/* Stock Deduction Toggle */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Auto-Deduct Stock from Warehouse on Daily Usage Save</span>
                  </div>
                  <p className="text-[10px] text-emerald-800">
                    When enabled, submitting daily cooking logs automatically reduces raw materials from your inventory.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={companyForm.autoDeductInventoryOnDailySave ?? true}
                  onChange={(e) => setCompanyForm({ ...companyForm, autoDeductInventoryOnDailySave: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Factory Production Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PACKAGING & POUCH PRESETS */}
          {activeSubTab === 'packaging' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>Packaging & Pouch Standard Weight Limits</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage the standard gram sizes that appear across Recipe Pack Sizes and Daily Usage Weight Limits dropdowns.
                </p>
              </div>

              {/* Presets List */}
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider">
                    Active Weight Limit Presets ({companyForm.packagingPresets?.length || 0} Sizes)
                  </label>
                  <span className="text-[10px] text-slate-500">Custom entries are also supported anytime in logs</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(companyForm.packagingPresets || []).map((preset) => (
                    <div
                      key={preset}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-200 text-purple-950 rounded-lg text-xs font-mono font-bold shadow-2xs group"
                    >
                      <span>{preset >= 1000 ? `${preset / 1000}kg` : `${preset}g`}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreset(preset)}
                        className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        title="Delete preset"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new preset input */}
                <div className="flex items-center gap-2 pt-2 border-t border-purple-100">
                  <input
                    type="number"
                    min="1"
                    placeholder="New weight in grams (e.g. 75, 80, 350)"
                    value={newPresetWeightInput}
                    onChange={(e) => setNewPresetWeightInput(e.target.value)}
                    className="w-64 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    disabled={!newPresetWeightInput}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Weight Preset</span>
                  </button>
                </div>
              </div>

              {/* Wastage Buffer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-900">Standard Pouch Wastage Buffer (%)</label>
                  <span className="text-[10px] text-slate-500">Expected seal defect or tearing margin in packing shift</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={companyForm.defaultPouchWastageBufferPercent ?? 3}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultPouchWastageBufferPercent: Number(e.target.value) })}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-center"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Packaging Presets</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LABOR RATES & JOB ROLES */}
          {activeSubTab === 'labor' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Labor Benchmarks & Factory Job Designations</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure default shift daily wages, overtime rates, and customize job roles available in Payroll and Daily Logs.
                </p>
              </div>

              {/* Standard Daily Wage Benchmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Master Cook Daily Wage (₹)</label>
                  <input
                    type="number"
                    value={companyForm.defaultMasterDailyWage ?? 850}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultMasterDailyWage: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Helper Daily Wage (₹)</label>
                  <input
                    type="number"
                    value={companyForm.defaultHelperDailyWage ?? 550}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultHelperDailyWage: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Packaging Worker (₹)</label>
                  <input
                    type="number"
                    value={companyForm.defaultPackagingDailyWage ?? 600}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultPackagingDailyWage: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Sales Person Daily Wage (₹)</label>
                  <input
                    type="number"
                    value={companyForm.defaultSalesmanDailyWage ?? 600}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultSalesmanDailyWage: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Overtime and Shift hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <div>
                  <label className="block text-[10px] font-bold text-blue-950 uppercase mb-1">Standard Shift Duration (Hours)</label>
                  <input
                    type="number"
                    value={companyForm.standardShiftHours ?? 8}
                    onChange={(e) => setCompanyForm({ ...companyForm, standardShiftHours: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-950 uppercase mb-1">Overtime Hourly Rate (₹ / Hour)</label>
                  <input
                    type="number"
                    value={companyForm.defaultOvertimeHourlyRate ?? 80}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultOvertimeHourlyRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Job Designations Manager */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Factory Job Designations Catalog ({jobRolesList.length} Roles)
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {jobRolesList.map((role) => (
                    <div
                      key={role}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveJobRole(role)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                        title="Remove role"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    placeholder="Add new job role (e.g. Quality Inspector, Machine Operator)..."
                    value={newJobRoleInput}
                    onChange={(e) => setNewJobRoleInput(e.target.value)}
                    className="w-80 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddJobRole}
                    disabled={!newJobRoleInput.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Designation</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Labor & Role Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: USERS & ROLE ACCESS MATRIX */}
          {activeSubTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>System User Accounts & Role Permissions Matrix</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control which employees and staff roles have access to edit, delete, or view sensitive business data.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingUser(!isAddingUser)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add User Account</span>
                </button>
              </div>

              {/* Add User Form Drawer */}
              {isAddingUser && (
                <form onSubmit={handleAddUserSubmit} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="font-bold text-xs text-emerald-950 uppercase">Create New Login User</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Username (Login ID)</label>
                      <input
                        type="text"
                        placeholder="e.g. supervisor1"
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Staff Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar"
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Role Access Level</label>
                      <select
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold"
                      >
                        <option value="Manager">Manager</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Salesperson">Sales Person / Sales Executive</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Visitor">Visitor (Read Only)</option>
                        <option value="CEO">CEO (Full Master Rights)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Login PIN / Password</label>
                      <input
                        type="password"
                        placeholder="4-digit PIN"
                        value={newUserForm.pin}
                        onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91..."
                        value={newUserForm.phone}
                        onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Save Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingUser(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Users Accounts Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">User / Name</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">PIN</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {u.name} <span className="text-[10px] text-slate-400">(@{u.username})</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'CEO' 
                              ? 'bg-amber-100 text-amber-800' 
                              : u.role === 'Manager' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : u.role === 'Salesperson'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role === 'Salesperson' ? 'Sales Person' : u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{u.phone || '-'}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">••••</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Permissions Matrix */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Role Capabilities & Rights Matrix (Fine-Grained Permissions)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">Configured by CEO & System Administrators</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-3 py-2">Permission Right</th>
                        {(['CEO', 'Manager', 'Supervisor', 'Salesperson', 'Accountant', 'Visitor'] as const).map(r => (
                          <th key={r} className="px-3 py-2 text-center">{r === 'Salesperson' ? 'Sales Person' : r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {[
                        { key: 'canAccessInventory', label: 'Raw Stock Inventory Access' },
                        { key: 'canAccessRecipes', label: 'Recipe Book & Formulations' },
                        { key: 'canAccessProduction', label: 'Production Batches & Cooking Logs' },
                        { key: 'canAccessSales', label: 'Sales & Billing Invoices' },
                        { key: 'canAccessSalary', label: 'Salary, Wages & Payroll' },
                        { key: 'canAccessCostReport', label: 'Costing & Financial Reports' },
                        { key: 'canEdit', label: 'Edit Existing Records' },
                        { key: 'canDelete', label: 'Delete Records' },
                      ].map(perm => (
                        <tr key={perm.key} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-800">{perm.label}</td>
                          {(['CEO', 'Manager', 'Supervisor', 'Salesperson', 'Accountant', 'Visitor'] as const).map(roleName => {
                            const isAllowed = permissionsForm[roleName]?.[perm.key as keyof typeof permissionsForm[typeof roleName]] ?? (
                              roleName === 'Salesperson'
                                ? (perm.key === 'canAccessSales' || perm.key === 'canEdit')
                                : false
                            );
                            return (
                              <td key={roleName} className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={!!isAllowed}
                                  disabled={roleName === 'CEO'} // CEO has permanent rights
                                  onChange={(e) => {
                                    setPermissionsForm(prev => ({
                                      ...prev,
                                      [roleName]: {
                                        ...prev[roleName],
                                        [perm.key]: e.target.checked
                                      }
                                    }));
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Security & Permissions</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP, RESTORE & LEDGER RESET */}
          {activeSubTab === 'backup' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-600" />
                  <span>Backup, Restore & Database Master Operations</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Secure your business data with offline JSON exports, restore prior snapshots, or perform safe fresh starts.
                </p>
              </div>

              {/* Backup & Restore Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download Backup */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase">Complete Software Backup (.JSON)</h4>
                      <p className="text-[10px] text-slate-500">Download entire database to your computer or pendrive</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Saves all recipes, raw materials, settings, batches, payroll, sales, bills, and user accounts.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Backup File</span>
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 uppercase">Restore Software from Backup</h4>
                      <p className="text-[10px] text-slate-500">Upload a previously saved .JSON backup file</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Restores your entire system state instantly from any saved backup archive.
                  </p>
                  <input
                    type="file"
                    ref={restoreFileRef}
                    onChange={handleRestoreBackupFile}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => restoreFileRef.current?.click()}
                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select & Restore Backup File</span>
                  </button>
                </div>
              </div>

              {/* Excel Summary Export */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Export All Business Ledgers to Excel</h4>
                    <p className="text-[10px] text-slate-500">Generate a comprehensive audit spreadsheet for management</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullExcel}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel Summary</span>
                </button>
              </div>

              {/* Safe Zero-Out & Reset Zone */}
              <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Maintenance & Reset Utilities</h4>
                    <p className="text-[10px] text-rose-700">Protected actions for business start and inventory recalibration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2">
                    <div className="font-bold text-xs text-slate-900">Safe "Zero-Out" Fresh Start</div>
                    <p className="text-[11px] text-slate-500">
                      Zeros out all stock quantities, daily logs, sales, bills, and salaries. <strong>Keeps your Recipes and Raw Materials catalog 100% untouched.</strong>
                    </p>
                    <button
                      type="button"
                      onClick={onZeroOutLedger}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      Perform Fresh Start Zero-Out
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2">
                    <div className="font-bold text-xs text-slate-900">Complete Factory Reset</div>
                    <p className="text-[11px] text-slate-500">
                      Clears local browser cache and resets database back to clean initial system defaults.
                    </p>
                    <button
                      type="button"
                      onClick={onFactoryReset}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      Factory Reset Database
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
