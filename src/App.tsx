import React, { useState, useEffect } from 'react';
import { 
  RawMaterial, 
  Recipe, 
  ProductionBatch, 
  PurchaseBill, 
  BatchStatus,
  PackagingSize,
  WasteEntry,
  SaleEntry,
  UserRole,
  UserProfile,
  RolePermissions,
  AuditLogEntry,
  AttendanceRecord,
  EmployeeSalary,
  CompanyInvoiceSettings,
  ExpenseEntry,
  DailyUsageEntry
} from './types';
import { 
  INITIAL_RAW_MATERIALS, 
  INITIAL_RECIPES, 
  INITIAL_PRODUCTION_BATCHES, 
  INITIAL_PURCHASE_BILLS,
  INITIAL_SALES_ENTRIES,
  INITIAL_EXPENSE_ENTRIES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_USERS,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_EMPLOYEES,
  INITIAL_DAILY_USAGE_ENTRIES
} from './initialData';

// Icons
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BookOpen, 
  Receipt, 
  Users, 
  ShoppingBag, 
  Layers, 
  ClipboardList, 
  Calculator, 
  Settings, 
  Scale, 
  Sparkles, 
  Info, 
  ShieldCheck, 
  User, 
  LogOut, 
  Clock, 
  DollarSign, 
  FileSpreadsheet, 
  Activity, 
  MapPin, 
  Lock, 
  Building, 
  Key, 
  Edit3, 
  Camera, 
  Upload,
  Flame,
  Droplet,
  Sliders,
  Navigation
} from 'lucide-react';

// Components
import Dashboard from './components/Dashboard';
import RawMaterials from './components/RawMaterials';
import Purchases from './components/Purchases';
import Recipes from './components/Recipes';
import Sales from './components/Sales';
import SalaryManager from './components/SalaryManager';
import DailyUsageManager from './components/DailyUsageManager';
import MasterSettings from './components/MasterSettings';
import RouteVisualization from './components/RouteVisualization';
import FirebaseAuthBar from './components/FirebaseAuthBar';
import { useFirebaseSync } from './hooks/useFirebaseSync';

import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';
import RolePermissionsModal from './components/RolePermissionsModal';
import CompanySettingsModal from './components/CompanySettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [materialsSubTab, setMaterialsSubTab] = useState<'inventory' | 'purchases' | 'waste'>('inventory');
  const [batchesSubTab, setBatchesSubTab] = useState<'batches' | 'oil'>('batches');

  // Authentication & Users
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USERS[0]); // Default CEO
  const [users, setUsers] = useState<UserProfile[]>(DEFAULT_USERS);
  const [loginLocation, setLoginLocation] = useState<{ latitude?: number; longitude?: number; address?: string }>({});
  
  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState<boolean>(false);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState<boolean>(false);

  // Settings & Permissions
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
  const [companySettings, setCompanySettings] = useState<CompanyInvoiceSettings>(DEFAULT_COMPANY_SETTINGS);

  // Core Databases
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [salesEntries, setSalesEntries] = useState<SaleEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employeeSalaries, setEmployeeSalaries] = useState<EmployeeSalary[]>(DEFAULT_EMPLOYEES);
  const [customJobRoles, setCustomJobRoles] = useState<string[]>([]);
  const [dailyUsageEntries, setDailyUsageEntries] = useState<DailyUsageEntry[]>(INITIAL_DAILY_USAGE_ENTRIES);

  const [isInitialized, setIsInitialized] = useState(false);

  // Firebase Auth & Cloud Firestore Data Sync
  const firebaseSync = useFirebaseSync({
    recipes,
    salesEntries,
    expenses,
    companySettings,
    onDataLoadedFromCloud: (cloudData) => {
      if (cloudData.recipes && cloudData.recipes.length > 0) {
        setRecipes(cloudData.recipes);
      }
      if (cloudData.salesEntries && cloudData.salesEntries.length > 0) {
        setSalesEntries(cloudData.salesEntries);
      }
      if (cloudData.expenses && cloudData.expenses.length > 0) {
        setExpenses(cloudData.expenses);
      }
    }
  });

  // Sync Firebase User profile with local currentUser
  useEffect(() => {
    if (firebaseSync.user) {
      setIsLoggedIn(true);
      setCurrentUser(prev => ({
        ...prev,
        id: firebaseSync.user!.uid,
        name: firebaseSync.user!.displayName || prev.name,
        email: firebaseSync.user!.email || prev.email,
        photoUrl: firebaseSync.user!.photoURL || prev.photoUrl,
      }));
    }
  }, [firebaseSync.user]);

  // Helper for adding Audit Logs
  const addAuditLog = (
    action: string,
    module: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userRole: currentUser.role,
      username: currentUser.username,
      action,
      module,
      details,
      previousValue,
      newValue,
      location: loginLocation.address || 'GPS Verified Terminal'
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Google Maps Quota Listener
  const [isGmpQuotaExceeded, setIsGmpQuotaExceeded] = useState(false);
  useEffect(() => {
    const handleQuota = () => setIsGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // 1. LocalStorage Initialization
  useEffect(() => {
    // Check saved auth session
    const savedSession = localStorage.getItem('snack_user_session');
    if (savedSession) {
      try {
        const sessionUser = JSON.parse(savedSession);
        setCurrentUser(sessionUser);
        setIsLoggedIn(true);
      } catch (e) {
        setIsLoggedIn(false);
      }
    }

    // Load users list
    const savedUsers = localStorage.getItem('snack_users');
    if (savedUsers) {
      try { setUsers(JSON.parse(savedUsers)); } catch (e) { setUsers(DEFAULT_USERS); }
    } else {
      localStorage.setItem('snack_users', JSON.stringify(DEFAULT_USERS));
    }

    // Load permissions
    const savedPermissions = localStorage.getItem('snack_permissions');
    if (savedPermissions) {
      try { setRolePermissions(JSON.parse(savedPermissions)); } catch (e) { setRolePermissions(DEFAULT_ROLE_PERMISSIONS); }
    }

    // Load company settings
    const savedCompany = localStorage.getItem('snack_company_settings');
    if (savedCompany) {
      try { setCompanySettings(JSON.parse(savedCompany)); } catch (e) { setCompanySettings(DEFAULT_COMPANY_SETTINGS); }
    }

    // Load audit logs
    const savedLogs = localStorage.getItem('snack_audit_logs');
    if (savedLogs) {
      try { setAuditLogs(JSON.parse(savedLogs)); } catch (e) { setAuditLogs([]); }
    }

    // Load attendance
    const savedAttendance = localStorage.getItem('snack_attendance');
    if (savedAttendance) {
      try { setAttendanceRecords(JSON.parse(savedAttendance)); } catch (e) { setAttendanceRecords([]); }
    }

    // Load salaries
    const savedSalaries = localStorage.getItem('snack_salaries');
    if (savedSalaries) {
      try { setEmployeeSalaries(JSON.parse(savedSalaries)); } catch (e) { setEmployeeSalaries(DEFAULT_EMPLOYEES); }
    }

    // Load custom job roles
    const savedCustomRoles = localStorage.getItem('snack_custom_job_roles');
    if (savedCustomRoles) {
      try { setCustomJobRoles(JSON.parse(savedCustomRoles)); } catch (e) { setCustomJobRoles([]); }
    }

    const isCleanReset = localStorage.getItem('snack_all_qty_amount_zeroed_v3');
    if (!isCleanReset) {
      localStorage.setItem('snack_all_qty_amount_zeroed_v3', 'true');
      
      // Preserve all raw materials entries, but reset all current stock quantities to 0
      const savedMatsStr = localStorage.getItem('snack_materials');
      let cleanMaterials: RawMaterial[] = [];
      if (savedMatsStr) {
        try {
          const parsed = JSON.parse(savedMatsStr) as RawMaterial[];
          cleanMaterials = parsed.map(m => ({ ...m, currentStockGrams: 0 }));
        } catch (e) {
          cleanMaterials = INITIAL_RAW_MATERIALS.map(m => ({ ...m, currentStockGrams: 0 }));
        }
      } else {
        cleanMaterials = INITIAL_RAW_MATERIALS.map(m => ({ ...m, currentStockGrams: 0 }));
      }
      setMaterials(cleanMaterials);
      localStorage.setItem('snack_materials', JSON.stringify(cleanMaterials));

      // Preserve all recipes entries already given without changing them
      const savedRecStr = localStorage.getItem('snack_recipes');
      if (savedRecStr) {
        try {
          const parsedRec = JSON.parse(savedRecStr) as Recipe[];
          if (Array.isArray(parsedRec) && parsedRec.length > 0) {
            setRecipes(parsedRec);
          } else {
            setRecipes(INITIAL_RECIPES);
          }
        } catch (e) {
          setRecipes(INITIAL_RECIPES);
        }
      } else {
        setRecipes(INITIAL_RECIPES);
      }

      // Delete all existing worker data as requested - fresh start to enter new workers
      setEmployeeSalaries([]);
      setAttendanceRecords([]);
      localStorage.setItem('snack_salaries', JSON.stringify([]));
      localStorage.setItem('snack_attendance', JSON.stringify([]));

      // Reset all historical log entries, quantities, and spending amounts to 0 (empty arrays)
      setBatches([]);
      setBills([]);
      setWasteEntries([]);
      setSalesEntries([]);
      setExpenses([]);
      setDailyUsageEntries([]);

      localStorage.setItem('snack_batches', JSON.stringify([]));
      localStorage.setItem('snack_bills', JSON.stringify([]));
      localStorage.setItem('snack_waste_entries', JSON.stringify([]));
      localStorage.setItem('snack_sales_entries', JSON.stringify([]));
      localStorage.setItem('snack_expenses', JSON.stringify([]));
      localStorage.setItem('snack_daily_usage', JSON.stringify([]));

      setIsInitialized(true);
      return;
    }

    const savedMaterials = localStorage.getItem('snack_materials');
    const savedRecipes = localStorage.getItem('snack_recipes');
    const savedBatches = localStorage.getItem('snack_batches');
    const savedBills = localStorage.getItem('snack_bills');
    const savedWaste = localStorage.getItem('snack_waste_entries');
    const savedSales = localStorage.getItem('snack_sales_entries');
    const savedExpenses = localStorage.getItem('snack_expenses');

    if (savedMaterials) {
      try {
        const parsed = JSON.parse(savedMaterials) as RawMaterial[];
        const merged = [...parsed];
        INITIAL_RAW_MATERIALS.forEach((initial) => {
          const index = merged.findIndex((m) => m.id === initial.id);
          if (index === -1) {
            merged.push(initial);
          } else {
            merged[index] = {
              ...merged[index],
              name: initial.name,
              category: initial.category,
              unit: initial.unit,
            };
          }
        });
        setMaterials(merged);
      } catch (e) {
        setMaterials(INITIAL_RAW_MATERIALS);
      }
    } else {
      setMaterials(INITIAL_RAW_MATERIALS);
    }

    if (savedRecipes) {
      try {
        const parsed = JSON.parse(savedRecipes) as Recipe[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map(r => r.id));
          const missingInitials = INITIAL_RECIPES.filter(r => !existingIds.has(r.id));
          setRecipes([...parsed, ...missingInitials]);
        } else {
          setRecipes(INITIAL_RECIPES);
        }
      } catch (e) {
        setRecipes(INITIAL_RECIPES);
      }
    } else {
      setRecipes(INITIAL_RECIPES);
    }

    if (savedBatches) {
      try {
        const parsed = JSON.parse(savedBatches) as ProductionBatch[];
        const updated = parsed.map(b => {
          if (b.recipeId === 'rec_kara_sev') {
            return {
              ...b,
              recipeId: 'rec_kara_sev_no_color_small'
            };
          }
          return b;
        });
        setBatches(updated);
      } catch (e) {
        setBatches(INITIAL_PRODUCTION_BATCHES);
      }
    } else {
      setBatches(INITIAL_PRODUCTION_BATCHES);
    }

    if (savedBills) setBills(JSON.parse(savedBills));
    else setBills(INITIAL_PURCHASE_BILLS);

    if (savedWaste) {
      try { setWasteEntries(JSON.parse(savedWaste)); } catch (e) { setWasteEntries([]); }
    } else {
      setWasteEntries([]);
    }

    if (savedSales) {
      try { setSalesEntries(JSON.parse(savedSales)); } catch (e) { setSalesEntries(INITIAL_SALES_ENTRIES); }
    } else {
      setSalesEntries(INITIAL_SALES_ENTRIES);
    }

    if (savedExpenses) {
      try { setExpenses(JSON.parse(savedExpenses)); } catch (e) { setExpenses(INITIAL_EXPENSE_ENTRIES); }
    } else {
      setExpenses(INITIAL_EXPENSE_ENTRIES);
    }

    const savedDailyUsage = localStorage.getItem('snack_daily_usage');
    if (savedDailyUsage) {
      try { setDailyUsageEntries(JSON.parse(savedDailyUsage)); } catch (e) { setDailyUsageEntries(INITIAL_DAILY_USAGE_ENTRIES); }
    } else {
      setDailyUsageEntries(INITIAL_DAILY_USAGE_ENTRIES);
    }

    setIsInitialized(true);
  }, []);

  // 2. Persist state to LocalStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('snack_materials', JSON.stringify(materials));
    }
  }, [materials, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('snack_recipes', JSON.stringify(recipes));
    }
  }, [recipes, isInitialized]);

  useEffect(() => {
    localStorage.setItem('snack_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('snack_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('snack_waste_entries', JSON.stringify(wasteEntries));
  }, [wasteEntries]);

  useEffect(() => {
    localStorage.setItem('snack_sales_entries', JSON.stringify(salesEntries));
  }, [salesEntries]);

  useEffect(() => {
    localStorage.setItem('snack_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('snack_daily_usage', JSON.stringify(dailyUsageEntries));
  }, [dailyUsageEntries]);

  useEffect(() => {
    localStorage.setItem('snack_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('snack_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('snack_salaries', JSON.stringify(employeeSalaries));
  }, [employeeSalaries]);

  useEffect(() => {
    localStorage.setItem('snack_custom_job_roles', JSON.stringify(customJobRoles));
  }, [customJobRoles]);

  useEffect(() => {
    localStorage.setItem('snack_company_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  const handleSaveCompanySettings = (updated: CompanyInvoiceSettings) => {
    setCompanySettings(updated);
    addAuditLog('Edit Branding', 'Company Settings', `Updated company name to "${updated.companyName}" and uploaded logo`);
  };

  // Login handler
  const handleLogin = (user: UserProfile, location: { latitude?: number; longitude?: number; address?: string }) => {
    setCurrentUser(user);
    setLoginLocation(location);
    setIsLoggedIn(true);
    localStorage.setItem('snack_user_session', JSON.stringify(user));
    if (user.role === 'Salesperson') {
      setActiveTab('sales');
    }

    addAuditLog(
      'USER_LOGIN',
      'AUTHENTICATION',
      `User ${user.name} (${user.role}) logged in from ${location.address || 'Terminal'}`,
      '-',
      'ACTIVE_SESSION'
    );
  };

  // Logout handler
  const handleLogout = () => {
    addAuditLog(
      'USER_LOGOUT',
      'AUTHENTICATION',
      `User ${currentUser.name} (${currentUser.role}) logged out`,
      'ACTIVE_SESSION',
      'TERMINATED'
    );
    localStorage.removeItem('snack_user_session');
    setIsLoggedIn(false);
  };

  // Profile Update Handler
  const handleUpdateProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    localStorage.setItem('snack_users', JSON.stringify(users.map((u) => (u.id === updated.id ? updated : u))));
    localStorage.setItem('snack_user_session', JSON.stringify(updated));

    addAuditLog(
      'PROFILE_UPDATE',
      'USER_PROFILE',
      `Updated user profile details for ${updated.name}`
    );
  };

  // CEO Role Permissions Update
  const handleSavePermissions = (updatedPermissions: any) => {
    setRolePermissions(updatedPermissions);
    localStorage.setItem('snack_permissions', JSON.stringify(updatedPermissions));

    addAuditLog(
      'UPDATE_PERMISSIONS',
      'SECURITY_POLICY',
      `CEO updated system-wide role permissions matrix`,
      'OLD_RULES',
      'NEW_MATRIX'
    );
  };

  // Helper permission checker for current active user
  const userPerms = (rolePermissions && (rolePermissions as any)[currentUser.role]) || (DEFAULT_ROLE_PERMISSIONS as any)[currentUser.role] || DEFAULT_ROLE_PERMISSIONS.Visitor;
  const isCeo = currentUser.role === 'CEO';
  const isSalesperson = currentUser.role === 'Salesperson';

  // Protect tabs for Salesperson or restricted roles
  useEffect(() => {
    if (isSalesperson && !['dashboard', 'sales'].includes(activeTab)) {
      setActiveTab('sales');
    }
  }, [currentUser.role, activeTab, isSalesperson]);

  // RESET DATABASE helper
  const handleResetDatabase = () => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Only the CEO or authorized Manager has rights to reset database.');
      return;
    }
    if (confirm('Are you sure you want to reset all quantities, salaries and amounts to 0 as fresh to record? Your recipes and raw materials entries will be preserved.')) {
      const zeroedMaterials = materials.map(m => ({
        ...m,
        currentStockGrams: 0
      }));
      setMaterials(zeroedMaterials);
      setBatches([]);
      setBills([]);
      setWasteEntries([]);
      setSalesEntries([]);
      setExpenses([]);
      setDailyUsageEntries([]);
      setEmployeeSalaries(prev => prev.map(s => ({
        ...s,
        rate: 0,
        workingDays: 0,
        presentDays: 0,
        overtimeHours: 0,
        overtimePay: 0,
        advanceDeductions: 0,
        otherDeductions: 0,
        netSalary: 0,
        paidAmount: 0,
        paymentStatus: 'Pending',
        monthYear: ''
      })));
      setAttendanceRecords([]);
      localStorage.setItem('snack_materials', JSON.stringify(zeroedMaterials));
      localStorage.setItem('snack_batches', JSON.stringify([]));
      localStorage.setItem('snack_bills', JSON.stringify([]));
      localStorage.setItem('snack_waste_entries', JSON.stringify([]));
      localStorage.setItem('snack_sales_entries', JSON.stringify([]));
      localStorage.setItem('snack_expenses', JSON.stringify([]));
      localStorage.setItem('snack_daily_usage', JSON.stringify([]));
      localStorage.setItem('snack_attendance', JSON.stringify([]));
      setActiveTab('dashboard');
      addAuditLog('RESET_DATABASE', 'SYSTEM', 'All quantities, salaries and amounts reset to 0 by CEO');
    }
  };

  // CLEAR ALL TO ZERO helper
  const handleClearAllToZero = () => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Only CEO can perform Clear All Stock to 0.');
      return;
    }
    if (confirm('Are you sure you want to clear all raw/packaging stock levels and salaries to 0 and delete all transaction history?')) {
      const zeroedMaterials = materials.map(m => ({
        ...m,
        currentStockGrams: 0,
        lastUpdated: new Date().toISOString()
      }));
      setMaterials(zeroedMaterials);
      setBatches([]);
      setBills([]);
      setWasteEntries([]);
      setSalesEntries([]);
      setExpenses([]);
      setDailyUsageEntries([]);
      setEmployeeSalaries(prev => prev.map(s => ({
        ...s,
        rate: 0,
        workingDays: 0,
        presentDays: 0,
        overtimeHours: 0,
        overtimePay: 0,
        advanceDeductions: 0,
        otherDeductions: 0,
        netSalary: 0,
        paidAmount: 0,
        paymentStatus: 'Pending',
        monthYear: ''
      })));
      setAttendanceRecords([]);
      localStorage.setItem('snack_materials', JSON.stringify(zeroedMaterials));
      localStorage.setItem('snack_batches', JSON.stringify([]));
      localStorage.setItem('snack_bills', JSON.stringify([]));
      localStorage.setItem('snack_waste_entries', JSON.stringify([]));
      localStorage.setItem('snack_sales_entries', JSON.stringify([]));
      localStorage.setItem('snack_expenses', JSON.stringify([]));
      localStorage.setItem('snack_daily_usage', JSON.stringify([]));
      localStorage.setItem('snack_attendance', JSON.stringify([]));
      setActiveTab('dashboard');

      addAuditLog('CLEAR_TO_ZERO', 'SYSTEM', 'All inventory stock levels and salaries reset to zero');
      alert('All database values and salaries cleared to 0 successfully!');
    }
  };

  // Daily Usage Handlers
  const handleAddDailyUsage = (newEntry: Omit<DailyUsageEntry, 'id'>, shouldDeductStock: boolean = true) => {
    const id = `daily_${Date.now()}`;
    const entry: DailyUsageEntry = {
      ...newEntry,
      id
    };
    setDailyUsageEntries(prev => [entry, ...prev]);

    // Auto-decrease raw materials stock from warehouse inventory
    if (shouldDeductStock && newEntry.materialsUsed && newEntry.materialsUsed.length > 0) {
      setMaterials(prevMaterials => {
        const updated = [...prevMaterials];
        newEntry.materialsUsed.forEach(used => {
          const matIndex = updated.findIndex(
            m => m.id === used.materialId || m.name.toLowerCase() === used.materialName.toLowerCase()
          );
          if (matIndex >= 0) {
            const currentMat = updated[matIndex];
            let usedGrams = used.quantityUsed;
            if (used.unit === 'kg' || used.unit === 'L' || used.unit === 'liter') {
              usedGrams = used.quantityUsed * 1000;
            } else if (used.unit === 'g' || used.unit === 'gram') {
              usedGrams = used.quantityUsed;
            } else if (used.unit === 'pcs') {
              usedGrams = used.quantityUsed;
            }

            updated[matIndex] = {
              ...currentMat,
              currentStockGrams: Math.max(0, currentMat.currentStockGrams - usedGrams),
              lastUpdated: new Date().toISOString()
            };
          }
        });

        // Also decrease cooking oil if specified
        if (newEntry.oilUsedLitres && newEntry.oilUsedLitres > 0) {
          const oilIndex = updated.findIndex(
            m => m.category === 'Oil' || m.name.toLowerCase().includes('oil') || m.name.includes('எண்ணெய்')
          );
          if (oilIndex >= 0) {
            updated[oilIndex] = {
              ...updated[oilIndex],
              currentStockGrams: Math.max(0, updated[oilIndex].currentStockGrams - (newEntry.oilUsedLitres * 1000)),
              lastUpdated: new Date().toISOString()
            };
          }
        }

        localStorage.setItem('snack_materials', JSON.stringify(updated));
        return updated;
      });
    }

    addAuditLog(
      'LOG_DAILY_USAGE', 
      'DAILY_USAGE', 
      `Logged daily production & costs for ${entry.date}: Total ₹${entry.totalDaySpending} ${shouldDeductStock ? '(Inventory raw stock auto-decreased)' : ''}`
    );
  };

  const handleUpdateDailyUsage = (id: string, updated: Omit<DailyUsageEntry, 'id'>) => {
    setDailyUsageEntries(prev => prev.map(e => e.id === id ? { ...updated, id } : e));
    addAuditLog('UPDATE_DAILY_USAGE', 'DAILY_USAGE', `Updated daily usage entry for ${updated.date}`);
  };

  const handleDeleteDailyUsage = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO or authorized personnel can delete daily usage records.');
      return;
    }
    setDailyUsageEntries(prev => prev.filter(e => e.id !== id));
    addAuditLog('DELETE_DAILY_USAGE', 'DAILY_USAGE', `Deleted daily usage record #${id}`);
  };

  // Expense Handlers
  const handleAddExpense = (expenseData: Omit<ExpenseEntry, 'id' | 'voucherNumber'>) => {
    const newId = `exp_${Date.now()}`;
    const newVoucherNo = `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`;
    const newEntry: ExpenseEntry = {
      ...expenseData,
      id: newId,
      voucherNumber: newVoucherNo,
      approvedBy: currentUser.name
    };
    setExpenses((prev) => [newEntry, ...prev]);
    addAuditLog('LOG_EXPENSE', 'EXPENSES', `Logged overhead expense: ${expenseData.title} (₹${expenseData.amount}) by ${expenseData.employeeName}`);
  };

  const handleUpdateExpense = (id: string, updated: Partial<ExpenseEntry>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    addAuditLog('UPDATE_EXPENSE', 'EXPENSES', `Updated expense voucher ID: ${id}`);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addAuditLog('DELETE_EXPENSE', 'EXPENSES', `Deleted expense voucher ID: ${id}`);
  };

  const handleLoadDemoExpenses = () => {
    setExpenses(INITIAL_EXPENSE_ENTRIES);
    addAuditLog('LOAD_DEMO_EXPENSES', 'EXPENSES', `Loaded demo factory overhead expenses`);
  };

  // 7. Sales Actions
  const handleAddSale = (newSale: Omit<SaleEntry, 'id'>) => {
    const id = `sale_${Date.now()}`;
    const sale: SaleEntry = {
      ...newSale,
      id,
    };
    setSalesEntries((prev) => [sale, ...prev]);

    addAuditLog(
      'CREATE_INVOICE',
      'SALES',
      `Created Invoice #${sale.invoiceNumber} for ${sale.customerName} - Total: ₹${sale.finalAmount}`,
      '-',
      JSON.stringify({ invoice: sale.invoiceNumber, amount: sale.finalAmount })
    );
  };

  const handleUpdateSaleStatus = (id: string, status: 'Paid' | 'Pending' | 'Partial') => {
    const oldSale = salesEntries.find((s) => s.id === id);
    setSalesEntries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, paymentStatus: status } : s))
    );

    if (oldSale) {
      addAuditLog(
        'UPDATE_INVOICE_STATUS',
        'SALES',
        `Changed invoice #${oldSale.invoiceNumber} status to ${status}`,
        oldSale.paymentStatus,
        status
      );
    }
  };

  const handleUpdateSaleLocation = (saleId: string, location: SaleEntry['location']) => {
    setSalesEntries((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, location } : s))
    );
  };

  const handleAddSampleRouteData = () => {
    const today = new Date().toISOString().split('T')[0];
    const sampleStores: SaleEntry[] = [
      {
        id: `sale_route_${Date.now()}_1`,
        invoiceNumber: 'INV-2026-041',
        customerName: 'Sri Amman Wholesale Stores',
        customerPhone: '+91 98421 11022',
        customerAddress: '14 Bazaar Main Road, South Gate, Madurai',
        customerType: 'Wholesaler',
        date: today,
        time: '09:25 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 11400,
        discount: 0,
        taxAmount: 0,
        finalAmount: 11400,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        location: {
          latitude: 9.91840,
          longitude: 78.12550,
          address: '14 Bazaar Main Road, South Gate',
          accuracyMeters: 12,
          capturedAt: `${today}T09:25:00`,
        },
        deliveryLocationText: 'Counter Drop at front shop',
      },
      {
        id: `sale_route_${Date.now()}_2`,
        invoiceNumber: 'INV-2026-042',
        customerName: 'Murugan Provisions',
        customerPhone: '+91 98421 44033',
        customerAddress: '88 Kamarajar Salai, East Market, Madurai',
        customerType: 'Shop/Retail',
        date: today,
        time: '10:15 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 6750,
        discount: 0,
        taxAmount: 0,
        finalAmount: 6750,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        location: {
          latitude: 9.91260,
          longitude: 78.13420,
          address: '88 Kamarajar Salai, East Market',
          accuracyMeters: 18,
          capturedAt: `${today}T10:15:00`,
        },
        deliveryLocationText: 'Main Billing Counter',
      },
      {
        id: `sale_route_${Date.now()}_3`,
        invoiceNumber: 'INV-2026-043',
        customerName: 'Raja Sweets & Bakery',
        customerPhone: '+91 98421 77088',
        customerAddress: '42 West Veli Street, Town Hall, Madurai',
        customerType: 'Wholesaler',
        date: today,
        time: '11:20 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 9200,
        discount: 0,
        taxAmount: 0,
        finalAmount: 9200,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        location: {
          latitude: 9.92380,
          longitude: 78.11470,
          address: '42 West Veli Street, Town Hall',
          accuracyMeters: 25,
          capturedAt: `${today}T11:20:00`,
        },
        deliveryLocationText: 'Godown unloading gate',
      },
      {
        id: `sale_route_${Date.now()}_4`,
        invoiceNumber: 'INV-2026-044',
        customerName: 'Annai Supermarket',
        customerPhone: '+91 98421 99011',
        customerAddress: '105 By-pass Road, Kalavasal, Madurai',
        customerType: 'Shop/Retail',
        date: today,
        time: '12:10 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 7300,
        discount: 0,
        taxAmount: 0,
        finalAmount: 7300,
        paymentStatus: 'Partial',
        paymentMethod: 'Cash',
        location: {
          latitude: 9.93150,
          longitude: 78.10230,
          address: '105 By-pass Road, Kalavasal',
          accuracyMeters: 15,
          capturedAt: `${today}T12:10:00`,
        },
        deliveryLocationText: 'Backside stock delivery dock',
      },
      {
        id: `sale_route_${Date.now()}_5`,
        invoiceNumber: 'INV-2026-045',
        customerName: 'Lakshmi Traders',
        customerPhone: '+91 98421 22077',
        customerAddress: '64 Arappalayam Main Cross Road, Madurai',
        customerType: 'Wholesaler',
        date: today,
        time: '01:05 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 3800,
        discount: 0,
        taxAmount: 0,
        finalAmount: 3800,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        location: {
          latitude: 9.93890,
          longitude: 78.09840,
          address: '64 Arappalayam Main Cross Road',
          accuracyMeters: 10,
          capturedAt: `${today}T13:05:00`,
        },
        deliveryLocationText: 'Front store counter',
      },
    ];

    const getPastDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // Historical multi-day and multi-month sales records for CEO revenue trend visualization
    const historicalTrends: SaleEntry[] = [
      {
        id: `sale_hist_${Date.now()}_39`,
        invoiceNumber: 'INV-2026-039',
        customerName: 'Meenakshi Supermarket',
        customerPhone: '+91 98421 33011',
        customerAddress: 'South Veli St, Madurai',
        customerType: 'Shop/Retail',
        date: getPastDate(1),
        time: '11:00 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 14500,
        discount: 0,
        taxAmount: 0,
        finalAmount: 14500,
        paidAmount: 14500,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_40`,
        invoiceNumber: 'INV-2026-040',
        customerName: 'Kaveri Provisions',
        customerPhone: '+91 98421 55099',
        customerAddress: 'Simmakkal Market, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(1),
        time: '03:30 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 6800,
        discount: 0,
        taxAmount: 0,
        finalAmount: 6800,
        paidAmount: 4000,
        balanceAmount: 2800,
        paymentStatus: 'Partial',
        paymentMethod: 'Cash'
      },
      {
        id: `sale_hist_${Date.now()}_36`,
        invoiceNumber: 'INV-2026-036',
        customerName: 'Karthik General Merchant',
        customerPhone: '+91 98421 88022',
        customerAddress: 'Goripalayam, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(2),
        time: '10:15 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 18200,
        discount: 0,
        taxAmount: 0,
        finalAmount: 18200,
        paidAmount: 18200,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      {
        id: `sale_hist_${Date.now()}_37`,
        invoiceNumber: 'INV-2026-037',
        customerName: 'Shanmugam Snacks Corner',
        customerPhone: '+91 98421 66044',
        customerAddress: 'Anna Nagar, Madurai',
        customerType: 'Shop/Retail',
        date: getPastDate(2),
        time: '02:00 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 9400,
        discount: 0,
        taxAmount: 0,
        finalAmount: 9400,
        paidAmount: 9400,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_38`,
        invoiceNumber: 'INV-2026-038',
        customerName: 'Gomathi Departmental Store',
        customerPhone: '+91 98421 11077',
        customerAddress: 'K.K. Nagar, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(2),
        time: '04:45 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 5200,
        discount: 0,
        taxAmount: 0,
        finalAmount: 5200,
        paidAmount: 0,
        balanceAmount: 5200,
        paymentStatus: 'Pending',
        paymentMethod: 'Credit'
      },
      {
        id: `sale_hist_${Date.now()}_34`,
        invoiceNumber: 'INV-2026-034',
        customerName: 'Vasantham Sweets',
        customerPhone: '+91 98421 44088',
        customerAddress: 'Mattuthavani, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(3),
        time: '11:30 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 12800,
        discount: 0,
        taxAmount: 0,
        finalAmount: 12800,
        paidAmount: 12800,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_31`,
        invoiceNumber: 'INV-2026-031',
        customerName: 'Balaji Store',
        customerPhone: '+91 98421 77011',
        customerAddress: 'Sellur, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(5),
        time: '09:45 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 16400,
        discount: 0,
        taxAmount: 0,
        finalAmount: 16400,
        paidAmount: 16400,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_28`,
        invoiceNumber: 'INV-2026-028',
        customerName: 'Praveen Mart',
        customerPhone: '+91 98421 99055',
        customerAddress: 'Villapuram, Madurai',
        customerType: 'Shop/Retail',
        date: getPastDate(8),
        time: '01:15 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 15000,
        discount: 0,
        taxAmount: 0,
        finalAmount: 15000,
        paidAmount: 15000,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_25`,
        invoiceNumber: 'INV-2026-025',
        customerName: 'Anand Hypermarket',
        customerPhone: '+91 98421 22033',
        customerAddress: 'Tallakulam, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(12),
        time: '10:00 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 22400,
        discount: 0,
        taxAmount: 0,
        finalAmount: 22400,
        paidAmount: 22400,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      {
        id: `sale_hist_${Date.now()}_22`,
        invoiceNumber: 'INV-2026-022',
        customerName: 'Saravana Stores',
        customerPhone: '+91 98421 55011',
        customerAddress: 'Chinthamani, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(18),
        time: '11:45 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 19500,
        discount: 0,
        taxAmount: 0,
        finalAmount: 19500,
        paidAmount: 19500,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_19`,
        invoiceNumber: 'INV-2026-019',
        customerName: 'Madurai Traders',
        customerPhone: '+91 98421 66088',
        customerAddress: 'Tirupparankunram, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(25),
        time: '02:30 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 21000,
        discount: 0,
        taxAmount: 0,
        finalAmount: 21000,
        paidAmount: 21000,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      // Month-over-Month historical records
      {
        id: `sale_hist_${Date.now()}_15`,
        invoiceNumber: 'INV-2026-015',
        customerName: 'Alagappa Sweets & Bakes',
        customerPhone: '+91 98421 88099',
        customerAddress: 'West Masi St, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(35),
        time: '10:00 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 32000,
        discount: 0,
        taxAmount: 0,
        finalAmount: 32000,
        paidAmount: 32000,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      {
        id: `sale_hist_${Date.now()}_16`,
        invoiceNumber: 'INV-2026-016',
        customerName: 'Sri Krishna Provisions',
        customerPhone: '+91 98421 33044',
        customerAddress: 'North Gate, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(42),
        time: '03:15 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 28500,
        discount: 0,
        taxAmount: 0,
        finalAmount: 28500,
        paidAmount: 28500,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_10`,
        invoiceNumber: 'INV-2026-010',
        customerName: 'Thirumalai Wholesale Depot',
        customerPhone: '+91 98421 11055',
        customerAddress: 'Vilakkuthoon, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(68),
        time: '11:00 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 36000,
        discount: 0,
        taxAmount: 0,
        finalAmount: 36000,
        paidAmount: 36000,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      {
        id: `sale_hist_${Date.now()}_11`,
        invoiceNumber: 'INV-2026-011',
        customerName: 'Pandian Express Stores',
        customerPhone: '+91 98421 44066',
        customerAddress: 'Central Bus Stand, Madurai',
        customerType: 'Shop/Retail',
        date: getPastDate(75),
        time: '02:00 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 29800,
        discount: 0,
        taxAmount: 0,
        finalAmount: 29800,
        paidAmount: 29800,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      },
      {
        id: `sale_hist_${Date.now()}_06`,
        invoiceNumber: 'INV-2026-006',
        customerName: 'Royal Bakery Chain',
        customerPhone: '+91 98421 77033',
        customerAddress: 'Ellis Nagar, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(98),
        time: '10:30 AM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 34000,
        discount: 0,
        taxAmount: 0,
        finalAmount: 34000,
        paidAmount: 34000,
        paymentStatus: 'Paid',
        paymentMethod: 'Bank Transfer'
      },
      {
        id: `sale_hist_${Date.now()}_07`,
        invoiceNumber: 'INV-2026-007',
        customerName: 'Maruti Provisions',
        customerPhone: '+91 98421 99077',
        customerAddress: 'Avaniyapuram, Madurai',
        customerType: 'Wholesaler',
        date: getPastDate(105),
        time: '04:15 PM',
        salesPerson: currentUser.name || 'K. Saravanan',
        items: [],
        totalAmount: 27500,
        discount: 0,
        taxAmount: 0,
        finalAmount: 27500,
        paidAmount: 27500,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      }
    ];

    setSalesEntries((prev) => {
      const merged = [...sampleStores, ...historicalTrends, ...prev];
      localStorage.setItem('snack_sales_entries', JSON.stringify(merged));
      return merged;
    });

    addAuditLog('LOAD_SAMPLE_ROUTE', 'SALES', 'Loaded multi-period sales and GPS route data for CEO review');
  };

  const handleDeleteSale = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO or authorized personnel can delete sales invoices.');
      return;
    }
    const oldSale = salesEntries.find((s) => s.id === id);
    setSalesEntries((prev) => prev.filter((s) => s.id !== id));

    if (oldSale) {
      addAuditLog(
        'DELETE_INVOICE',
        'SALES',
        `Deleted Invoice #${oldSale.invoiceNumber} - Amount ₹${oldSale.finalAmount}`,
        JSON.stringify(oldSale),
        'DELETED'
      );
    }
  };

  const handleCancelInvoice = (saleId: string, reason: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canEdit) {
      alert('Permission Denied: Only CEO or Admin can cancel an official invoice.');
      return;
    }

    setSalesEntries((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              paymentStatus: 'Cancelled',
              cancellationReason: reason,
              cancelledBy: `${currentUser.name} (${currentUser.role})`,
              cancelledAt: new Date().toISOString(),
            }
          : s
      )
    );

    const target = salesEntries.find((s) => s.id === saleId);
    addAuditLog(
      'CANCEL_INVOICE',
      'SALES',
      `Cancelled Invoice #${target?.invoiceNumber || saleId} - Reason: ${reason}`,
      'ACTIVE',
      'CANCELLED'
    );
  };

  const handleAddPaymentToInvoice = (saleId: string, amount: number, method: string, notes: string) => {
    setSalesEntries((prev) =>
      prev.map((s) => {
        if (s.id !== saleId) return s;

        const currentPaid = s.paidAmount || 0;
        const newPaid = currentPaid + amount;
        const newBalance = Math.max(0, s.finalAmount - newPaid);
        const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

        const receiptEntry = {
          id: `rcpt_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount,
          paymentMethod: method,
          notes,
          receivedBy: `${currentUser.name} (${currentUser.role})`,
        };

        return {
          ...s,
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newStatus,
          paymentHistory: [...(s.paymentHistory || []), receiptEntry],
        };
      })
    );

    const target = salesEntries.find((s) => s.id === saleId);
    addAuditLog(
      'RECORD_PAYMENT_RECEIPT',
      'SALES',
      `Recorded payment receipt of ₹${amount} via ${method} for Invoice #${target?.invoiceNumber}`,
      `Balance: ₹${target?.balanceAmount}`,
      `New Paid: ₹${amount}`
    );
  };

  const handleAddSimulatedBatches = () => {
    const demoBatches: ProductionBatch[] = [
      {
        id: 'sim_batch_001',
        recipeId: 'rec_butter_murukku',
        batchNumber: 'BM-SIM-001',
        date: '2026-07-18',
        status: 'Packed',
        batchSizeGrams: 10000,
        expectedYieldPackets: { 'size_bm_50': 200 },
        actualYieldPackets: { 'size_bm_50': 188 },
        laborCostActual: 1200,
        overheadCostActual: 350,
        notes: 'Line speed raised. High frequency of sealing faults detected at thermal jaw.'
      },
      {
        id: 'sim_batch_002',
        recipeId: 'rec_butter_murukku',
        batchNumber: 'BM-SIM-002',
        date: '2026-07-19',
        status: 'Packed',
        batchSizeGrams: 15000,
        expectedYieldPackets: { 'size_bm_100': 150 },
        actualYieldPackets: { 'size_bm_100': 148 },
        laborCostActual: 1800,
        overheadCostActual: 500,
        notes: 'Excellent portion control calibration. Scaler aligned.'
      }
    ];

    setBatches([...batches, ...demoBatches]);
    addAuditLog('ADD_SIMULATED_BATCHES', 'PRODUCTION', 'Added simulated test production batches for yield analysis');
    alert('Simulated test production records added to database successfully!');
  };

  // 3. Raw Material Actions
  const handleAddMaterial = (newMat: Omit<RawMaterial, 'id' | 'lastUpdated'>) => {
    const id = `mat_${Date.now()}`;
    const material: RawMaterial = {
      ...newMat,
      id,
      lastUpdated: new Date().toISOString(),
    };
    setMaterials([...materials, material]);

    addAuditLog(
      'ADD_RAW_MATERIAL',
      'INVENTORY',
      `Added raw material item: ${material.name} (${material.category})`,
      '-',
      JSON.stringify(material)
    );
  };

  const handleEditMaterial = (id: string, updates: Partial<RawMaterial>) => {
    const oldMat = materials.find((m) => m.id === id);
    setMaterials(materials.map((m) => (m.id === id ? { ...m, ...updates, lastUpdated: new Date().toISOString() } : m)));

    addAuditLog(
      'EDIT_RAW_MATERIAL',
      'INVENTORY',
      `Modified raw material: ${oldMat?.name}`,
      JSON.stringify(oldMat),
      JSON.stringify(updates)
    );
  };

  const handleDeleteMaterial = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO can delete raw materials.');
      return;
    }
    const oldMat = materials.find((m) => m.id === id);
    setMaterials(materials.filter((m) => m.id !== id));

    addAuditLog(
      'DELETE_RAW_MATERIAL',
      'INVENTORY',
      `Deleted raw material: ${oldMat?.name}`,
      JSON.stringify(oldMat),
      'DELETED'
    );
  };

  const handleAddWaste = (newWaste: Omit<WasteEntry, 'id'>) => {
    const id = `waste_${Date.now()}`;
    const waste: WasteEntry = {
      ...newWaste,
      id,
    };
    
    setMaterials((prevMaterials) => {
      return prevMaterials.map((m) => {
        if (m.id !== waste.materialId) return m;
        const currentStock = Math.max(0, m.currentStockGrams);
        const nextStock = Math.max(0, currentStock - waste.quantityGrams);
        return {
          ...m,
          currentStockGrams: nextStock,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    setWasteEntries((prev) => [...prev, waste]);

    addAuditLog(
      'LOG_WASTE',
      'INVENTORY',
      `Logged waste entry of ${waste.quantityGrams}g - Reason: ${waste.reason}`
    );
  };

  const handleDeleteWaste = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO can delete waste records.');
      return;
    }
    const wasteToDelete = wasteEntries.find((w) => w.id === id);
    if (!wasteToDelete) return;

    setMaterials((prevMaterials) => {
      return prevMaterials.map((m) => {
        if (m.id !== wasteToDelete.materialId) return m;
        const currentStock = Math.max(0, m.currentStockGrams);
        const nextStock = currentStock + wasteToDelete.quantityGrams;
        return {
          ...m,
          currentStockGrams: nextStock,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    setWasteEntries((prev) => prev.filter((w) => w.id !== id));
    addAuditLog('DELETE_WASTE', 'INVENTORY', `Deleted waste entry ID: ${id}`);
  };

  // 4. Purchase Invoice Action
  const handleAddBill = (newBill: Omit<PurchaseBill, 'id'>) => {
    const id = `bill_${Date.now()}`;
    const bill: PurchaseBill = {
      ...newBill,
      id,
    };

    setMaterials((prevMaterials) => {
      const updatedMaterials = prevMaterials.map((m) => {
        const itemPurchased = bill.items.find((it) => it.materialId === m.id);
        if (!itemPurchased) return m;

        const currentStock = Math.max(0, m.currentStockGrams);
        const addedQty = itemPurchased.quantityGrams;
        const totalNewStock = currentStock + addedQty;

        const oldCostTotal = currentStock * m.averageCostPerGram;
        const addedCostTotal = itemPurchased.totalCost;
        const newAvgCost = totalNewStock > 0 ? (oldCostTotal + addedCostTotal) / totalNewStock : m.averageCostPerGram;

        return {
          ...m,
          currentStockGrams: totalNewStock,
          averageCostPerGram: Number(newAvgCost.toFixed(5)),
          lastUpdated: new Date().toISOString(),
        };
      });

      bill.items.forEach((it) => {
        const exists = updatedMaterials.some((m) => m.id === it.materialId || m.name.toLowerCase() === it.materialId.toLowerCase());
        if (!exists && it.materialId.trim()) {
          updatedMaterials.push({
            id: `mat_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: it.materialId.trim(),
            category: 'General / Custom',
            unit: 'packs',
            currentStockGrams: it.quantityGrams,
            minimumStockAlert: 10,
            averageCostPerGram: Number(it.costPerGram.toFixed(5)),
            lastUpdated: new Date().toISOString(),
          });
        }
      });

      return updatedMaterials;
    });

    setBills([...bills, bill]);

    addAuditLog(
      'ADD_PURCHASE_BILL',
      'PURCHASES',
      `Added Purchase Invoice #${bill.billNumber} from supplier ${bill.supplierName || bill.vendorName || 'Supplier'} - Total: ₹${bill.totalAmount || bill.items.reduce((sum, item) => sum + item.totalCost, 0)}`
    );
  };

  const handleDeleteBill = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO can delete purchase invoices.');
      return;
    }
    const billToDelete = bills.find((b) => b.id === id);
    if (!billToDelete) return;

    setMaterials((prevMaterials) => {
      return prevMaterials.map((m) => {
        const itemPurchased = billToDelete.items.find((it) => it.materialId === m.id);
        if (!itemPurchased) return m;

        const currentStock = Math.max(0, m.currentStockGrams);
        const subtractedQty = itemPurchased.quantityGrams;
        const totalNewStock = Math.max(0, currentStock - subtractedQty);

        return {
          ...m,
          currentStockGrams: totalNewStock,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    setBills(bills.filter((b) => b.id !== id));
    addAuditLog('DELETE_PURCHASE_BILL', 'PURCHASES', `Deleted Purchase Invoice #${billToDelete.billNumber}`);
  };

  const handleEditBill = (id: string, updatedBill: Omit<PurchaseBill, 'id'>) => {
    const oldBill = bills.find((b) => b.id === id);
    if (!oldBill) return;

    setMaterials((prevMaterials) => {
      const updatedMaterials = prevMaterials.map((m) => {
        const oldItem = oldBill.items.find((it) => it.materialId === m.id);
        const newItem = updatedBill.items.find((it) => it.materialId === m.id);

        let stock = m.currentStockGrams;
        if (oldItem) stock = Math.max(0, stock - oldItem.quantityGrams);
        if (newItem) stock = stock + newItem.quantityGrams;

        let avgCost = m.averageCostPerGram;
        if (newItem && newItem.quantityGrams > 0) {
          const oldStockBeforeNewItem = Math.max(0, stock - newItem.quantityGrams);
          const oldCostTotal = oldStockBeforeNewItem * m.averageCostPerGram;
          const addedCostTotal = newItem.totalCost;
          avgCost = stock > 0 ? (oldCostTotal + addedCostTotal) / stock : m.averageCostPerGram;
        }

        return {
          ...m,
          currentStockGrams: stock,
          averageCostPerGram: Number(avgCost.toFixed(5)),
          lastUpdated: new Date().toISOString(),
        };
      });

      updatedBill.items.forEach((it) => {
        const exists = updatedMaterials.some((m) => m.id === it.materialId || m.name.toLowerCase() === it.materialId.toLowerCase());
        if (!exists && it.materialId.trim()) {
          updatedMaterials.push({
            id: `mat_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: it.materialId.trim(),
            category: 'General / Custom',
            unit: 'packs',
            currentStockGrams: it.quantityGrams,
            minimumStockAlert: 10,
            averageCostPerGram: Number(it.costPerGram.toFixed(5)),
            lastUpdated: new Date().toISOString(),
          });
        }
      });

      return updatedMaterials;
    });

    setBills(bills.map((b) => (b.id === id ? { ...updatedBill, id } : b)));
    addAuditLog('EDIT_PURCHASE_BILL', 'PURCHASES', `Edited Purchase Invoice #${oldBill.billNumber}`);
  };

  // 5. Recipe Book Actions
  const handleAddRecipe = (newRecipe: Omit<Recipe, 'id'>) => {
    const id = `rec_${Date.now()}`;
    setRecipes((prev) => [...prev, { ...newRecipe, id }]);

    addAuditLog('ADD_RECIPE', 'RECIPES', `Created new recipe: ${newRecipe.name}`);
  };

  const handleEditRecipe = (id: string, updatedRecipe: Omit<Recipe, 'id'>) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...updatedRecipe, id } : r)));

    addAuditLog('EDIT_RECIPE', 'RECIPES', `Updated recipe formulas for ${updatedRecipe.name}`);
  };

  const handleDeleteRecipe = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO can delete recipes.');
      return;
    }
    const r = recipes.find((x) => x.id === id);
    setRecipes((prev) => prev.filter((rec) => rec.id !== id));

    addAuditLog('DELETE_RECIPE', 'RECIPES', `Deleted recipe: ${r?.name}`);
  };

  const handleUpdateRecipePackagingSizes = (recipeId: string, sizes: PackagingSize[]) => {
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? { ...r, packagingSizes: sizes } : r)));
  };

  const handleClearAllRecipesToZero = () => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Only CEO can zero out recipe ingredients.');
      return;
    }
    setRecipes((prev) => prev.map((r) => ({
      ...r,
      ingredients: r.ingredients.map((ing) => ({ ...ing, weightGrams: 0 }))
    })));
    addAuditLog('ZERO_RECIPES', 'RECIPES', 'Zeroed out all recipe ingredient quantities');
  };

  // 6. Production Batch Actions
  const handleAddBatch = (newBatch: Omit<ProductionBatch, 'id' | 'batchNumber'>) => {
    const recipe = recipes.find((r) => r.id === newBatch.recipeId);
    if (!recipe) return;

    const prefix = recipe.name.split(' ').map(w => w[0]).join('').toUpperCase();
    const count = batches.filter((b) => b.recipeId === newBatch.recipeId).length + 1;
    const batchNumber = `${prefix}-2026-${String(count).padStart(3, '0')}`;
    const id = `batch_${Date.now()}`;

    const scaleFactor = newBatch.batchSizeGrams / recipe.baseBatchSizeGrams;
    
    setMaterials((prevMaterials) => {
      return prevMaterials.map((m) => {
        let finalStock = m.currentStockGrams;

        const ingredientNeeded = recipe.ingredients.find((ing) => ing.materialId === m.id);
        if (ingredientNeeded) {
          finalStock -= ingredientNeeded.weightGrams * scaleFactor;
        }

        if (newBatch.status === 'Packed') {
          Object.keys(newBatch.actualYieldPackets).forEach((sizeId) => {
            const packSize = recipe.packagingSizes.find((ps) => ps.id === sizeId);
            if (packSize) {
              const isMatchingPouch = m.category === 'Packaging' && m.name.toLowerCase().includes(`${packSize.grams}g`);
              if (isMatchingPouch) {
                const actualCount = newBatch.actualYieldPackets[sizeId] || 0;
                finalStock -= actualCount;
              }
            }
          });
        }

        return {
          ...m,
          currentStockGrams: finalStock,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    setBatches([...batches, { ...newBatch, id, batchNumber }]);

    addAuditLog('ADD_PRODUCTION_BATCH', 'PRODUCTION', `Created production cooking batch #${batchNumber} (${recipe.name})`);
  };

  const handleEditBatch = (id: string, updatedBatch: Omit<ProductionBatch, 'id' | 'batchNumber'>) => {
    const oldBatch = batches.find((b) => b.id === id);
    if (!oldBatch) return;

    const oldRecipe = recipes.find((r) => r.id === oldBatch.recipeId);
    const newRecipe = recipes.find((r) => r.id === updatedBatch.recipeId);

    setMaterials((prevMaterials) => {
      return prevMaterials.map((m) => {
        let finalStock = m.currentStockGrams;

        if (oldRecipe) {
          const oldScaleFactor = oldBatch.batchSizeGrams / oldRecipe.baseBatchSizeGrams;
          const oldIngredient = oldRecipe.ingredients.find((ing) => ing.materialId === m.id);
          if (oldIngredient) {
            finalStock += oldIngredient.weightGrams * oldScaleFactor;
          }

          if (oldBatch.status === 'Packed') {
            Object.keys(oldBatch.actualYieldPackets).forEach((sizeId) => {
              const packSize = oldRecipe.packagingSizes.find((ps) => ps.id === sizeId);
              if (packSize) {
                const isMatchingPouch = m.category === 'Packaging' && m.name.toLowerCase().includes(`${packSize.grams}g`);
                if (isMatchingPouch) {
                  const actualCount = oldBatch.actualYieldPackets[sizeId] || 0;
                  finalStock += actualCount;
                }
              }
            });
          }
        }

        if (newRecipe) {
          const newScaleFactor = updatedBatch.batchSizeGrams / newRecipe.baseBatchSizeGrams;
          const newIngredient = newRecipe.ingredients.find((ing) => ing.materialId === m.id);
          if (newIngredient) {
            finalStock -= newIngredient.weightGrams * newScaleFactor;
          }

          if (updatedBatch.status === 'Packed') {
            Object.keys(updatedBatch.actualYieldPackets).forEach((sizeId) => {
              const packSize = newRecipe.packagingSizes.find((ps) => ps.id === sizeId);
              if (packSize) {
                const isMatchingPouch = m.category === 'Packaging' && m.name.toLowerCase().includes(`${packSize.grams}g`);
                if (isMatchingPouch) {
                  const actualCount = updatedBatch.actualYieldPackets[sizeId] || 0;
                  finalStock -= actualCount;
                }
              }
            });
          }
        }

        return {
          ...m,
          currentStockGrams: finalStock,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    setBatches(
      batches.map((b) => {
        if (b.id === id) {
          return {
            ...updatedBatch,
            id,
            batchNumber: b.batchNumber,
          };
        }
        return b;
      })
    );

    addAuditLog('EDIT_PRODUCTION_BATCH', 'PRODUCTION', `Updated batch #${oldBatch.batchNumber}`);
  };

  const handleUpdateBatchStatus = (
    id: string, 
    status: BatchStatus, 
    actualYieldMap?: { [packSizeId: string]: number },
    extraData?: Partial<ProductionBatch>
  ) => {
    const batchToUpdate = batches.find(b => b.id === id);
    if (!batchToUpdate) return;
    const recipe = recipes.find(r => r.id === batchToUpdate.recipeId);
    if (!recipe) return;

    if (status === 'Packed' && actualYieldMap) {
      setMaterials((prevMaterials) => {
        return prevMaterials.map((m) => {
          let finalStock = m.currentStockGrams;

          Object.keys(actualYieldMap).forEach((sizeId) => {
            const packSize = recipe.packagingSizes.find((ps) => ps.id === sizeId);
            if (packSize) {
              const isMatchingPouch = m.category === 'Packaging' && m.name.toLowerCase().includes(`${packSize.grams}g`);
              if (isMatchingPouch) {
                const actualCount = actualYieldMap[sizeId] || 0;
                finalStock -= actualCount;
              }
            }
          });

          return {
            ...m,
            currentStockGrams: finalStock,
            lastUpdated: new Date().toISOString(),
          };
        });
      });
    }

    setBatches(
      batches.map((b) => {
        if (b.id === id) {
          const expectedYieldPackets: { [packSizeId: string]: number } = {};
          if (actualYieldMap) {
            Object.keys(actualYieldMap).forEach((sizeId) => {
              const sz = recipe.packagingSizes.find((p) => p.id === sizeId);
              if (sz) {
                expectedYieldPackets[sizeId] = Math.round(b.batchSizeGrams / sz.grams);
              }
            });
          }

          return {
            ...b,
            status,
            actualYieldPackets: actualYieldMap || {},
            expectedYieldPackets,
            ...extraData,
          };
        }
        return b;
      })
    );

    addAuditLog('UPDATE_BATCH_STATUS', 'PRODUCTION', `Changed status of batch #${batchToUpdate.batchNumber} to ${status}`);
  };

  const handleDeleteBatch = (id: string) => {
    if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
      alert('Permission Denied: Only CEO can delete production batches.');
      return;
    }
    const batchToDelete = batches.find((b) => b.id === id);
    if (!batchToDelete) return;

    const recipe = recipes.find((r) => r.id === batchToDelete.recipeId);
    if (recipe) {
      const scaleFactor = batchToDelete.batchSizeGrams / recipe.baseBatchSizeGrams;

      setMaterials((prevMaterials) => {
        return prevMaterials.map((m) => {
          let finalStock = m.currentStockGrams;

          const ingredientNeeded = recipe.ingredients.find((ing) => ing.materialId === m.id);
          if (ingredientNeeded) {
            finalStock += ingredientNeeded.weightGrams * scaleFactor;
          }

          if (batchToDelete.status === 'Packed') {
            Object.keys(batchToDelete.actualYieldPackets).forEach((sizeId) => {
              const packSize = recipe.packagingSizes.find((ps) => ps.id === sizeId);
              if (packSize) {
                const isMatchingPouch = m.category === 'Packaging' && m.name.toLowerCase().includes(`${packSize.grams}g`);
                if (isMatchingPouch) {
                  const actualCount = batchToDelete.actualYieldPackets[sizeId] || 0;
                  finalStock += actualCount;
                }
              }
            });
          }

          return {
            ...m,
            currentStockGrams: finalStock,
            lastUpdated: new Date().toISOString(),
          };
        });
      });
    }

    setBatches(batches.filter((b) => b.id !== id));
    addAuditLog('DELETE_BATCH', 'PRODUCTION', `Deleted batch #${batchToDelete.batchNumber}`);
  };

  // If not logged in, prompt Login Modal
  if (!isLoggedIn) {
    return (
      <LoginModal 
        users={users} 
        onLogin={handleLogin}
        onResetPassword={(targetUsername, newPassword) => {
          setUsers((prev) => {
            const updated = prev.map((u) => 
              u.username.toLowerCase() === targetUsername.toLowerCase() 
                ? { ...u, password: newPassword, pin: newPassword } 
                : u
            );
            localStorage.setItem('snack_users', JSON.stringify(updated));
            return updated;
          });
          addAuditLog('PASSWORD_RESET', 'SECURITY', `Password reset for user "${targetUsername}" using Master Security Code [MASKED]`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col" id="app-root-shell">
      {/* Google Maps Quota Exceeded Sticky Notice */}
      {isGmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white min-h-16 flex flex-col md:flex-row items-center justify-between px-6 md:px-8 py-3 md:py-0 shrink-0 border-b border-slate-800" id="top-nav-bar">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div 
            onClick={() => setIsCompanySettingsOpen(true)}
            className="flex items-center gap-3 cursor-pointer group hover:bg-slate-800/80 p-1.5 rounded-xl transition-all border border-transparent hover:border-slate-700/60"
            title="Click to edit logo & company name"
          >
            <div className="relative">
              {companySettings.logoUrl ? (
                <img 
                  src={companySettings.logoUrl} 
                  alt="Company Logo" 
                  className="w-9 h-9 rounded-lg object-cover border border-indigo-400 shadow-xs" 
                />
              ) : (
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-lg text-white shadow-xs">
                  {companySettings.companyName ? companySettings.companyName.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                <Edit3 className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight uppercase text-slate-100 font-sans group-hover:text-indigo-300 transition-colors">
                  {companySettings.companyName || 'Aadiyar T3 Snacks'}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[10px] text-indigo-400 font-medium">
                {companySettings.tagline || 'Portion Controls & ERP System'}
              </span>
            </div>
          </div>
          <span className="md:hidden text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" /> {currentUser.role}
          </span>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2 md:gap-4 text-xs md:text-sm font-medium h-full items-center mt-3 md:mt-0">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {(!isSalesperson || userPerms?.canAccessInventory) && (
            <button
              id="tab-raw-stock"
              onClick={() => setActiveTab('raw-stock')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'raw-stock' || activeTab === 'materials'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Raw Stock</span>
            </button>
          )}

          {(!isSalesperson || userPerms?.canAccessInventory) && (
            <button
              id="tab-purchases"
              onClick={() => setActiveTab('purchases')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'purchases'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Purchases</span>
            </button>
          )}

          {(!isSalesperson || userPerms?.canAccessRecipes) && (
            <button
              id="tab-recipes"
              onClick={() => setActiveTab('recipes')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'recipes'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Recipes</span>
            </button>
          )}

          {(!isSalesperson || userPerms?.canAccessProduction) && (
            <button
              id="tab-daily-usage"
              onClick={() => setActiveTab('daily-usage')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'daily-usage'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Daily Usage & Costs</span>
            </button>
          )}

          {(isCeo || userPerms?.canAccessSales !== false) && (
            <button
              id="tab-sales"
              onClick={() => setActiveTab('sales')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'sales'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Sales & Billing</span>
            </button>
          )}

          {(isCeo || userPerms?.canAccessSales !== false) && (
            <button
              id="tab-route-map"
              onClick={() => setActiveTab('route-map')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'route-map'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Route Tracking</span>
            </button>
          )}

          {(!isSalesperson || userPerms?.canAccessSalary) && (
            <button
              id="tab-salary"
              onClick={() => setActiveTab('salary')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'salary'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Salary & Payroll</span>
            </button>
          )}

          {(isCeo || currentUser.role === 'Admin') && (
            <button
              id="tab-master-settings"
              onClick={() => setActiveTab('master-settings')}
              className={`py-1.5 md:py-4 border-b-2 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'master-settings'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Master Settings</span>
            </button>
          )}
        </nav>
        
        {/* User Profile / CEO Options Bar */}
        <div className="hidden md:flex items-center gap-3">
          {/* Firebase Google Auth & Cloud Firestore Sync */}
          <FirebaseAuthBar
            user={firebaseSync.user}
            loading={firebaseSync.loading}
            syncStatus={firebaseSync.syncStatus}
            lastSyncedAt={firebaseSync.lastSyncedAt}
            onSignIn={firebaseSync.signInWithGoogle}
            onSignOut={firebaseSync.signOut}
            onManualSync={() => firebaseSync.saveUserDataToFirestore({
              recipes,
              sales: salesEntries,
              expenses,
              settings: companySettings
            })}
          />
          {(isCeo || currentUser.role === 'Admin') && (
            <button
              onClick={() => setActiveTab('master-settings')}
              className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Master Settings Center - Change & modify all software settings"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Master Settings</span>
            </button>
          )}

          {currentUser.role === 'CEO' && (
            <button
              onClick={() => setIsPermissionsOpen(true)}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>CEO Role Settings</span>
            </button>
          )}

          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-indigo-400" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-bold text-slate-100 leading-tight">{currentUser.name}</p>
              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                currentUser.role === 'CEO'
                  ? 'bg-amber-900/80 text-amber-300 border-amber-700/50'
                  : currentUser.role === 'Salesperson'
                  ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50'
                  : 'bg-indigo-900/80 text-indigo-300 border-indigo-700/50'
              }`}>
                {currentUser.role === 'Salesperson' ? 'Sales Person' : currentUser.role}
              </span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Render Active Tab */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            materials={materials} 
            recipes={recipes} 
            bills={bills}
            salesEntries={salesEntries}
            employeeSalaries={employeeSalaries}
            dailyUsageEntries={dailyUsageEntries}
            setActiveTab={setActiveTab} 
          />
        )}

        {(activeTab === 'raw-stock' || activeTab === 'materials') && (
          <RawMaterials
            materials={materials}
            onAddMaterial={handleAddMaterial}
            onEditMaterial={handleEditMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onClearMaterials={() => {
              setMaterials([]);
              localStorage.removeItem('snack_materials');
              addAuditLog('CLEAR_MATERIALS', 'INVENTORY', 'Cleared all raw stock inventory materials');
            }}
          />
        )}

        {activeTab === 'purchases' && (
          <Purchases
            materials={materials}
            bills={bills}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
            onEditBill={handleEditBill}
            onClearPurchases={() => {
              setBills([]);
              localStorage.removeItem('snack_bills');
              addAuditLog('CLEAR_PURCHASES', 'PURCHASES', 'Cleared all purchase invoices');
            }}
          />
        )}

        {activeTab === 'recipes' && (
          <Recipes
            recipes={recipes}
            materials={materials}
            onAddRecipe={handleAddRecipe}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            onUpdatePackagingSizes={handleUpdateRecipePackagingSizes}
            onClearAllRecipesToZero={handleClearAllRecipesToZero}
            onClearRecipes={() => {
              setRecipes([]);
              localStorage.removeItem('snack_recipes');
              addAuditLog('CLEAR_RECIPES', 'RECIPES', 'Cleared all recipe formulations');
            }}
            canDelete={currentUser.role === 'CEO' || userPerms.canDelete}
          />
        )}

        {activeTab === 'daily-usage' && (
          <DailyUsageManager
            entries={dailyUsageEntries}
            rawMaterials={materials}
            recipes={recipes}
            onAddEntry={handleAddDailyUsage}
            onUpdateEntry={handleUpdateDailyUsage}
            onDeleteEntry={handleDeleteDailyUsage}
            onClearDailyUsage={() => {
              setDailyUsageEntries([]);
              localStorage.removeItem('snack_daily_usage');
              addAuditLog('CLEAR_DAILY_USAGE', 'DAILY_USAGE', 'Cleared all daily production usage entries');
            }}
            canEdit={currentUser.role === 'CEO' || userPerms.canEdit}
          />
        )}

        {activeTab === 'sales' && (
          <Sales
            salesEntries={salesEntries}
            recipes={recipes}
            onAddSale={handleAddSale}
            onUpdateSaleStatus={handleUpdateSaleStatus}
            onDeleteSale={handleDeleteSale}
            companySettings={companySettings}
            currentUserRole={currentUser.role}
            canEdit={userPerms.canEdit}
            onCancelInvoice={handleCancelInvoice}
            onAddPayment={handleAddPaymentToInvoice}
            onUpdateSaleLocation={handleUpdateSaleLocation}
            onAddSampleRouteData={handleAddSampleRouteData}
            onClearSales={() => {
              setSalesEntries([]);
              localStorage.removeItem('snack_sales_entries');
              addAuditLog('CLEAR_SALES', 'SALES', 'Cleared all customer sales invoices');
            }}
            initialTab="invoices"
          />
        )}

        {activeTab === 'route-map' && (
          <RouteVisualization
            salesEntries={salesEntries}
            companySettings={companySettings}
            currentUserRole={currentUser.role}
            onAddSampleRouteData={handleAddSampleRouteData}
            onSelectInvoice={(sale) => {
              setActiveTab('sales');
            }}
            recipes={recipes}
            onAddSale={handleAddSale}
            onClearRouteTracking={() => {
              localStorage.removeItem('snack_sales_visits');
              addAuditLog('CLEAR_ROUTE_TRACKING', 'TRACKING', 'Cleared field route tracking and visit remarks');
            }}
          />
        )}

        {activeTab === 'salary' && (
          <SalaryManager
            salaryEntries={employeeSalaries}
            onAddSalary={(sal) => {
              const newSal = { ...sal, id: `sal_${Date.now()}` };
              setEmployeeSalaries((prev) => [...prev, newSal]);
              addAuditLog('ADD_SALARY_RECORD', 'PAYROLL', `Added salary record for staff ${sal.employeeName}`);
            }}
            onUpdateSalary={(id, sal) => {
              setEmployeeSalaries((prev) => prev.map((item) => (item.id === id ? { ...sal, id } : item)));
              addAuditLog('UPDATE_SALARY_RECORD', 'PAYROLL', `Updated salary record for staff ${sal.employeeName || ''}`);
            }}
            onDeleteSalary={(id) => {
              if (currentUser.role !== 'CEO' && !userPerms.canDelete) {
                alert('Permission Denied: Only CEO can delete salary records.');
                return;
              }
              setEmployeeSalaries((prev) => prev.filter((item) => item.id !== id));
              addAuditLog('DELETE_SALARY_RECORD', 'PAYROLL', `Deleted salary record #${id}`);
            }}
            onClearSalaries={() => {
              setEmployeeSalaries([]);
              localStorage.removeItem('snack_salaries');
              addAuditLog('CLEAR_SALARIES', 'PAYROLL', 'Cleared all employee payroll and salary records');
            }}
            currentUserRole={currentUser.role}
            canEdit={userPerms.canEdit}
            customRoles={customJobRoles}
            onAddCustomRole={(newRole) => {
              if (!customJobRoles.includes(newRole)) {
                setCustomJobRoles((prev) => [...prev, newRole]);
                addAuditLog('ADD_JOB_ROLE', 'PAYROLL', `CEO added custom job role: ${newRole}`);
              }
            }}
          />
        )}

        {activeTab === 'master-settings' && (
          <MasterSettings
            companySettings={companySettings}
            onSaveCompanySettings={(updated) => {
              setCompanySettings(updated);
              localStorage.setItem('snack_company_settings', JSON.stringify(updated));
              addAuditLog('UPDATE_SETTINGS', 'SYSTEM', 'Updated Master Company & Production Settings');
            }}
            rolePermissions={rolePermissions}
            onSaveRolePermissions={handleSavePermissions}
            users={users}
            onSaveUsers={(updated) => {
              setUsers(updated);
              localStorage.setItem('snack_users', JSON.stringify(updated));
              addAuditLog('UPDATE_USERS', 'SECURITY', 'Updated user accounts directory');
            }}
            currentUser={currentUser}
            onUpdateCurrentUser={handleUpdateProfile}
            customJobRoles={customJobRoles}
            onSaveCustomJobRoles={(roles) => {
              setCustomJobRoles(roles);
              localStorage.setItem('snack_custom_job_roles', JSON.stringify(roles));
            }}
            materials={materials}
            recipes={recipes}
            batches={batches}
            bills={bills}
            salesEntries={salesEntries}
            expenses={expenses}
            dailyUsageEntries={dailyUsageEntries}
            employeeSalaries={employeeSalaries}
            attendanceRecords={attendanceRecords}
            onRestoreAllData={(data) => {
              if (data.materials) {
                setMaterials(data.materials);
                localStorage.setItem('snack_materials', JSON.stringify(data.materials));
              }
              if (data.recipes) {
                setRecipes(data.recipes);
                localStorage.setItem('snack_recipes', JSON.stringify(data.recipes));
              }
              if (data.companySettings) {
                setCompanySettings(data.companySettings);
                localStorage.setItem('snack_company_settings', JSON.stringify(data.companySettings));
              }
              if (data.rolePermissions) {
                setRolePermissions(data.rolePermissions);
                localStorage.setItem('snack_permissions', JSON.stringify(data.rolePermissions));
              }
              if (data.users) {
                setUsers(data.users);
                localStorage.setItem('snack_users', JSON.stringify(data.users));
              }
              if (data.batches) {
                setBatches(data.batches);
                localStorage.setItem('snack_batches', JSON.stringify(data.batches));
              }
              if (data.bills) {
                setBills(data.bills);
                localStorage.setItem('snack_bills', JSON.stringify(data.bills));
              }
              if (data.salesEntries) {
                setSalesEntries(data.salesEntries);
                localStorage.setItem('snack_sales_entries', JSON.stringify(data.salesEntries));
              }
              if (data.expenses) {
                setExpenses(data.expenses);
                localStorage.setItem('snack_expenses', JSON.stringify(data.expenses));
              }
              if (data.dailyUsageEntries) {
                setDailyUsageEntries(data.dailyUsageEntries);
                localStorage.setItem('snack_daily_usage', JSON.stringify(data.dailyUsageEntries));
              }
              if (data.employeeSalaries) {
                setEmployeeSalaries(data.employeeSalaries);
                localStorage.setItem('snack_salaries', JSON.stringify(data.employeeSalaries));
              }
              if (data.attendanceRecords) {
                setAttendanceRecords(data.attendanceRecords);
                localStorage.setItem('snack_attendance', JSON.stringify(data.attendanceRecords));
              }
              addAuditLog('RESTORE_DATABASE', 'SYSTEM', 'Restored complete database from backup');
            }}
            onZeroOutLedger={handleClearAllToZero}
            onFactoryReset={handleResetDatabase}
          />
        )}

      </main>

      {/* Footer Bar */}
      <footer className="bg-white border-t border-slate-200 py-3.5 flex flex-col md:flex-row items-center px-6 md:px-8 justify-between text-[11px] text-slate-500 shrink-0 gap-3" id="app-footer">
        <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center">
          <span><strong>Current User:</strong> {currentUser.name} ({currentUser.email})</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span><strong>Active Role:</strong> <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold rounded-md border border-indigo-100 text-[10px] tracking-wide inline-flex items-center shadow-xs">{currentUser.role}</span></span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="font-mono"><strong>Terminal:</strong> {loginLocation.address || 'Verified Terminal'}</span>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center">
          <button
            id="clear-to-zero-btn"
            onClick={handleClearAllToZero}
            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-[10px] font-bold text-amber-700 rounded border border-amber-200 transition-all cursor-pointer"
          >
            Clear All Data to 0
          </button>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <button
            id="reset-database-btn"
            onClick={handleResetDatabase}
            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-600 rounded border border-red-200 transition-all cursor-pointer"
          >
            Reset Database
          </button>
        </div>
      </footer>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Role & Permissions Modal (CEO Only) */}
      <RolePermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        permissions={rolePermissions as any}
        onSavePermissions={handleSavePermissions}
      />

      {/* Company Branding & Logo Modal */}
      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        settings={companySettings}
        onSave={handleSaveCompanySettings}
      />

    </div>
  );
}
