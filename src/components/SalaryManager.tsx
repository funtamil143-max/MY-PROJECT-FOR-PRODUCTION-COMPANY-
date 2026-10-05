import React, { useState, useRef } from 'react';
import { SalaryEntry, UserRole } from '../types';
import { 
  DollarSign, 
  Wallet, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldAlert, 
  Award, 
  Calculator,
  Users,
  FileText,
  CreditCard,
  Home,
  Heart,
  Phone,
  Mail,
  MapPin,
  Eye,
  Printer,
  UserCheck,
  Copy,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Send,
  Building2,
  Camera,
  Upload,
  Image as ImageIcon,
  Paperclip,
  UserX,
  RefreshCw,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const INITIAL_JOB_ROLES = [
  'Master',
  'Assistant Master',
  'Master Helper',
  'Packaging Person',
  'Manager',
  'Distributor',
  'Driver',
  'Line Person',
  'Store Keeper',
  'Accountant',
  'Sales Executive',
  'Office Staff',
  'Supervisor',
];

interface SalaryManagerProps {
  salaryEntries: SalaryEntry[];
  onAddSalary: (entry: Omit<SalaryEntry, 'id'>) => void;
  onUpdateSalary: (id: string, entry: Partial<SalaryEntry>) => void;
  onDeleteSalary: (id: string) => void;
  onDeleteFullEmployee?: (employeeName: string) => void;
  currentUserRole: UserRole;
  canEdit: boolean;
  customRoles?: string[];
  onAddCustomRole?: (newRole: string) => void;
  onClearSalaries?: () => void;
}

export default function SalaryManager({
  salaryEntries,
  onAddSalary,
  onUpdateSalary,
  onDeleteSalary,
  onDeleteFullEmployee,
  currentUserRole,
  canEdit,
  customRoles = [],
  onAddCustomRole,
  onClearSalaries,
}: SalaryManagerProps) {
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'staff_directory' | 'payroll_vouchers'>('staff_directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayoutFilter, setSelectedPayoutFilter] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Staff Profile Modal View
  const [viewingProfile, setViewingProfile] = useState<SalaryEntry | null>(null);

  // Quick Disbursal / Payment Status Update Modal
  const [quickPaymentEntry, setQuickPaymentEntry] = useState<SalaryEntry | null>(null);
  const [quickStatus, setQuickStatus] = useState<'Paid' | 'Pending' | 'Partially Paid'>('Paid');
  const [quickPaidAmount, setQuickPaidAmount] = useState<number>(0);
  const [quickDisbursementDate, setQuickDisbursementDate] = useState<string>('2026-07-24');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'>('Bank Transfer');
  const [quickPaymentRefNo, setQuickPaymentRefNo] = useState<string>('');
  const [quickPayoutProof, setQuickPayoutProof] = useState<string>('');

  // Custom role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Camera state for employee photo attachment
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<'photo' | 'proof'>('photo');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Form State - Base Salary & Payroll
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('Master');
  const [payType, setPayType] = useState<'Daily Wage' | 'Monthly Salary'>('Daily Wage');
  const [payoutCycle, setPayoutCycle] = useState<'Daily Payout' | 'Weekly Payout' | 'Fortnightly Payout' | 'Monthly Payout'>('Daily Payout');
  const [photoAttachment, setPhotoAttachment] = useState<string>('');
  const [payoutProofAttachment, setPayoutProofAttachment] = useState<string>('');
  
  const [rate, setRate] = useState<number>(650);
  const [workingDays, setWorkingDays] = useState<number>(26);
  const [presentDays, setPresentDays] = useState<number>(26);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimePay, setOvertimePay] = useState<number>(0);
  const [advanceDeductions, setAdvanceDeductions] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [monthYear, setMonthYear] = useState('July 2026');
  const [notes, setNotes] = useState('');

  // Staff Identity & Verification Fields
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Address Details Fields
  const [permanentAddress, setPermanentAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [cityStatePincode, setCityStatePincode] = useState('');

  // Family & Emergency Details Fields
  const [familyContactName, setFamilyContactName] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('Spouse');
  const [familyPhone, setFamilyPhone] = useState('');
  const [numberOfDependents, setNumberOfDependents] = useState<number>(0);
  const [familyNotes, setFamilyNotes] = useState('');
  const [joiningDate, setJoiningDate] = useState('2025-01-01');

  // Payment Disbursal & Pending Fields
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partially Paid'>('Pending');
  const [paymentDueDate, setPaymentDueDate] = useState<string>('2026-07-05');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [disbursementDate, setDisbursementDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'>('Bank Transfer');
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');

  // Form tab selection in drawer
  const [formSection, setFormSection] = useState<'payroll' | 'identity' | 'address' | 'family' | 'payment'>('payroll');

  const allRoles = Array.from(new Set([...INITIAL_JOB_ROLES, ...customRoles]));

  // Camera handling
  const startCamera = async (target: 'photo' | 'proof') => {
    try {
      setCameraTarget(target);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access device camera. You can select an image file instead.');
      setIsCameraActive(false);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      if (cameraTarget === 'photo') {
        setPhotoAttachment(base64Data);
      } else {
        if (quickPaymentEntry) {
          setQuickPayoutProof(base64Data);
        } else {
          setPayoutProofAttachment(base64Data);
        }
      }
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photo' | 'proof') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'photo') {
        setPhotoAttachment(result);
      } else {
        if (quickPaymentEntry) {
          setQuickPayoutProof(result);
        } else {
          setPayoutProofAttachment(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const calculateNetSalary = () => {
    let basePay = 0;
    if (payType === 'Daily Wage') {
      basePay = rate * presentDays;
    } else {
      basePay = workingDays > 0 ? (rate / workingDays) * presentDays : rate;
    }
    const net = basePay + overtimePay - advanceDeductions - otherDeductions;
    return Math.max(0, Math.round(net));
  };

  const getPendingDaysInfo = (entry: SalaryEntry) => {
    const status = entry.paymentStatus || 'Pending';
    const net = entry.netSalary || 0;
    const paid = entry.paidAmount || 0;
    const pendingAmount = Math.max(0, net - paid);

    if (status === 'Paid' || (paid >= net && net > 0)) {
      return {
        status: 'Paid' as const,
        pendingDays: 0,
        pendingAmount: 0,
        badgeText: 'Paid in Full',
        shortBadge: 'Paid in Full',
        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        badgeBg: 'bg-emerald-600',
        iconColor: 'text-emerald-600',
      };
    }

    let dueDate = new Date();
    if (entry.paymentDueDate) {
      dueDate = new Date(entry.paymentDueDate);
    } else if (entry.joiningDate) {
      dueDate = new Date(entry.joiningDate);
    } else {
      dueDate = new Date('2026-07-01');
    }

    const today = new Date('2026-07-24');
    const diffTime = today.getTime() - dueDate.getTime();
    const pendingDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const isUrgent = pendingDays > 15;
    const isCritical = pendingDays > 30;

    return {
      status,
      pendingDays,
      pendingAmount,
      badgeText: status === 'Partially Paid' 
        ? `Partially Paid • ${pendingDays} days pending (₹${pendingAmount.toLocaleString('en-IN')} due)` 
        : `Pending for ${pendingDays} days (₹${pendingAmount.toLocaleString('en-IN')} due)`,
      shortBadge: `${pendingDays} Days Pending`,
      colorClass: isCritical 
        ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold' 
        : isUrgent 
        ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
        : 'bg-orange-50 text-orange-800 border-orange-200 font-semibold',
      badgeBg: isCritical ? 'bg-rose-600' : isUrgent ? 'bg-amber-500' : 'bg-orange-500',
      iconColor: isUrgent || isCritical ? 'text-rose-600' : 'text-amber-600',
    };
  };

  const handleSelectExistingStaff = (staffName: string) => {
    const existing = salaryEntries.find((s) => s.employeeName.toLowerCase() === staffName.toLowerCase());
    if (existing) {
      setEmployeeName(existing.employeeName);
      setDesignation(existing.designation);
      setPayType(existing.payType);
      setPayoutCycle(existing.payoutCycle || 'Daily Payout');
      setPhotoAttachment(existing.photoAttachment || '');
      setPayoutProofAttachment(existing.payoutProofAttachment || '');
      setRate(existing.rate);
      setAadharNumber(existing.aadharNumber || '');
      setPanNumber(existing.panNumber || '');
      setPhone(existing.phone || '');
      setEmail(existing.email || '');
      setPermanentAddress(existing.permanentAddress || '');
      setCurrentAddress(existing.currentAddress || '');
      setCityStatePincode(existing.cityStatePincode || '');
      setFamilyContactName(existing.familyContactName || '');
      setFamilyRelationship(existing.familyRelationship || 'Spouse');
      setFamilyPhone(existing.familyPhone || '');
      setNumberOfDependents(existing.numberOfDependents || 0);
      setFamilyNotes(existing.familyNotes || '');
      setJoiningDate(existing.joiningDate || '2025-01-01');
      setPaymentStatus(existing.paymentStatus || 'Pending');
      setPaymentDueDate(existing.paymentDueDate || '2026-07-05');
      setPaidAmount(existing.paidAmount || 0);
      setDisbursementDate(existing.disbursementDate || '');
      setPaymentMethod(existing.paymentMethod || 'Bank Transfer');
      setPaymentRefNo(existing.paymentRefNo || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    const netSalary = calculateNetSalary();

    const payloadData = {
      employeeName: employeeName.trim(),
      designation,
      payType,
      payoutCycle,
      photoAttachment,
      payoutProofAttachment,
      rate,
      workingDays,
      presentDays,
      overtimeHours,
      overtimePay,
      advanceDeductions,
      otherDeductions,
      netSalary,
      monthYear,
      notes: notes.trim(),

      aadharNumber: aadharNumber.trim(),
      panNumber: panNumber.trim(),
      phone: phone.trim(),
      email: email.trim(),

      permanentAddress: permanentAddress.trim(),
      currentAddress: currentAddress.trim(),
      cityStatePincode: cityStatePincode.trim(),

      familyContactName: familyContactName.trim(),
      familyRelationship,
      familyPhone: familyPhone.trim(),
      numberOfDependents,
      familyNotes: familyNotes.trim(),
      joiningDate,

      paymentStatus,
      paymentDueDate,
      paidAmount: paymentStatus === 'Paid' ? netSalary : paidAmount,
      disbursementDate: paymentStatus === 'Paid' && !disbursementDate ? '2026-07-24' : disbursementDate,
      paymentMethod,
      paymentRefNo: paymentRefNo.trim(),
    };

    if (editingId) {
      onUpdateSalary(editingId, payloadData);
      setEditingId(null);
    } else {
      onAddSalary(payloadData);
    }

    resetForm();
  };

  const resetForm = () => {
    setEmployeeName('');
    setDesignation('Master');
    setPayType('Daily Wage');
    setPayoutCycle('Daily Payout');
    setPhotoAttachment('');
    setPayoutProofAttachment('');
    setRate(650);
    setWorkingDays(26);
    setPresentDays(26);
    setOvertimeHours(0);
    setOvertimePay(0);
    setAdvanceDeductions(0);
    setOtherDeductions(0);
    setMonthYear('July 2026');
    setNotes('');

    setAadharNumber('');
    setPanNumber('');
    setPhone('');
    setEmail('');
    setPermanentAddress('');
    setCurrentAddress('');
    setCityStatePincode('');
    setFamilyContactName('');
    setFamilyRelationship('Spouse');
    setFamilyPhone('');
    setNumberOfDependents(0);
    setFamilyNotes('');
    setJoiningDate('2025-01-01');

    setPaymentStatus('Pending');
    setPaymentDueDate('2026-07-05');
    setPaidAmount(0);
    setDisbursementDate('');
    setPaymentMethod('Bank Transfer');
    setPaymentRefNo('');

    setIsAdding(false);
    setEditingId(null);
    setFormSection('payroll');
  };

  const handleEditClick = (entry: SalaryEntry) => {
    setEditingId(entry.id);
    setEmployeeName(entry.employeeName);
    setDesignation(entry.designation);
    setPayType(entry.payType);
    setPayoutCycle(entry.payoutCycle || 'Daily Payout');
    setPhotoAttachment(entry.photoAttachment || '');
    setPayoutProofAttachment(entry.payoutProofAttachment || '');
    setRate(entry.rate);
    setWorkingDays(entry.workingDays);
    setPresentDays(entry.presentDays);
    setOvertimeHours(entry.overtimeHours);
    setOvertimePay(entry.overtimePay);
    setAdvanceDeductions(entry.advanceDeductions);
    setOtherDeductions(entry.otherDeductions);
    setMonthYear(entry.monthYear);
    setNotes(entry.notes || '');

    setAadharNumber(entry.aadharNumber || '');
    setPanNumber(entry.panNumber || '');
    setPhone(entry.phone || '');
    setEmail(entry.email || '');
    setPermanentAddress(entry.permanentAddress || '');
    setCurrentAddress(entry.currentAddress || '');
    setCityStatePincode(entry.cityStatePincode || '');
    setFamilyContactName(entry.familyContactName || '');
    setFamilyRelationship(entry.familyRelationship || 'Spouse');
    setFamilyPhone(entry.familyPhone || '');
    setNumberOfDependents(entry.numberOfDependents || 0);
    setFamilyNotes(entry.familyNotes || '');
    setJoiningDate(entry.joiningDate || '2025-01-01');

    setPaymentStatus(entry.paymentStatus || 'Pending');
    setPaymentDueDate(entry.paymentDueDate || '2026-07-05');
    setPaidAmount(entry.paidAmount || 0);
    setDisbursementDate(entry.disbursementDate || '');
    setPaymentMethod(entry.paymentMethod || 'Bank Transfer');
    setPaymentRefNo(entry.paymentRefNo || '');

    setIsAdding(true);
  };

  const openQuickPaymentModal = (entry: SalaryEntry) => {
    setQuickPaymentEntry(entry);
    setQuickStatus(entry.paymentStatus === 'Paid' ? 'Paid' : 'Paid');
    setQuickPaidAmount(entry.netSalary);
    setQuickDisbursementDate(entry.disbursementDate || '2026-07-24');
    setQuickPaymentMethod(entry.paymentMethod || 'Bank Transfer');
    setQuickPaymentRefNo(entry.paymentRefNo || '');
    setQuickPayoutProof(entry.payoutProofAttachment || '');
  };

  const handleSaveQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentEntry) return;

    onUpdateSalary(quickPaymentEntry.id, {
      paymentStatus: quickStatus,
      paidAmount: quickStatus === 'Paid' ? quickPaymentEntry.netSalary : quickPaidAmount,
      disbursementDate: quickDisbursementDate,
      paymentMethod: quickPaymentMethod,
      paymentRefNo: quickPaymentRefNo.trim(),
      payoutProofAttachment: quickPayoutProof,
    });

    setQuickPaymentEntry(null);
  };

  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim() && onAddCustomRole) {
      onAddCustomRole(newRoleName.trim());
      setDesignation(newRoleName.trim());
      setNewRoleName('');
      setShowRoleModal(false);
    }
  };

  const handleDeleteFullEmployeeData = (employeeName: string) => {
    if (onDeleteFullEmployee) {
      onDeleteFullEmployee(employeeName);
    } else {
      if (confirm(`Are you sure you want to delete all salary entries for ${employeeName}?`)) {
        salaryEntries
          .filter((s) => s.employeeName.toLowerCase() === employeeName.toLowerCase())
          .forEach((s) => onDeleteSalary(s.id));
      }
    }
  };

  const copyPermanentAddressToCurrent = () => {
    setCurrentAddress(permanentAddress);
  };

  // Group unique staff members
  const staffMap = new Map<string, SalaryEntry>();
  salaryEntries.forEach((entry) => {
    if (!staffMap.has(entry.employeeName.toLowerCase())) {
      staffMap.set(entry.employeeName.toLowerCase(), entry);
    }
  });
  const staffList = Array.from(staffMap.values());

  const filteredStaffList = staffList.filter((staff) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      staff.employeeName.toLowerCase().includes(q) ||
      staff.designation.toLowerCase().includes(q) ||
      (staff.aadharNumber && staff.aadharNumber.toLowerCase().includes(q)) ||
      (staff.panNumber && staff.panNumber.toLowerCase().includes(q)) ||
      (staff.phone && staff.phone.toLowerCase().includes(q)) ||
      (staff.familyContactName && staff.familyContactName.toLowerCase().includes(q));

    const matchesPayout = selectedPayoutFilter === 'All' || staff.payoutCycle === selectedPayoutFilter;

    return matchesSearch && matchesPayout;
  });

  const filteredSalaryEntries = salaryEntries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      entry.employeeName.toLowerCase().includes(q) ||
      entry.designation.toLowerCase().includes(q) ||
      (entry.aadharNumber && entry.aadharNumber.toLowerCase().includes(q)) ||
      (entry.panNumber && entry.panNumber.toLowerCase().includes(q));

    const matchesPayout = selectedPayoutFilter === 'All' || entry.payoutCycle === selectedPayoutFilter;

    return matchesSearch && matchesPayout;
  });

  const totalPayroll = filteredSalaryEntries.reduce((sum, e) => sum + e.netSalary, 0);

  const totalPaidAmount = filteredSalaryEntries.reduce((sum, e) => {
    if (e.paymentStatus === 'Paid') return sum + e.netSalary;
    return sum + (e.paidAmount || 0);
  }, 0);

  const totalPendingAmount = filteredSalaryEntries.reduce((sum, e) => {
    if (e.paymentStatus === 'Paid') return sum;
    const paid = e.paidAmount || 0;
    return sum + Math.max(0, e.netSalary - paid);
  }, 0);

  const pendingCount = filteredSalaryEntries.filter(
    (e) => e.paymentStatus !== 'Paid' && (e.paidAmount || 0) < e.netSalary
  ).length;

  const handleExportExcel = () => {
    const exportData = filteredSalaryEntries.map((e) => ({
      'Employee Name': e.employeeName,
      'Designation / Role': e.designation,
      'Payout Cycle': e.payoutCycle,
      'Payment Status': e.paymentStatus,
      'Base Salary / Rate (₹)': e.rate || 0,
      'Overtime Pay (₹)': e.overtimePay || 0,
      'Advance Deductions (₹)': e.advanceDeductions || 0,
      'Other Deductions (₹)': e.otherDeductions || 0,
      'Net Payable Salary (₹)': e.netSalary,
      'Paid Amount (₹)': e.paidAmount || (e.paymentStatus === 'Paid' ? e.netSalary : 0),
      'Balance Due (₹)': Math.max(0, e.netSalary - (e.paidAmount || (e.paymentStatus === 'Paid' ? e.netSalary : 0))),
      'Payment Method': e.paymentMethod || 'Bank Transfer',
      'Payment Date': e.disbursementDate || e.paymentDueDate || '-',
      'Phone': e.phone || '-',
      'Aadhar Number': e.aadharNumber || '-',
      'PAN Number': e.panNumber || '-',
      'Notes': e.notes || '-'
    }));
    exportToExcel(exportData, `Salary_Payroll_Report_${new Date().toISOString().split('T')[0]}`, 'Payroll Register');
  };

  return (
    <div className="space-y-5" id="salary-module">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Staff Directory & Payroll Disbursal Management</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Manage daily & weekly payouts, photo attachments, complete staff profiles, and full employee data deletion
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="Export salary and payroll records to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {currentUserRole === 'CEO' && (
            <button
              onClick={() => setShowRoleModal(true)}
              className="px-3.5 py-2.5 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 border border-purple-400/30 cursor-pointer"
            >
              <Award className="w-4 h-4 text-purple-300" />
              + Custom Job Role
            </button>
          )}

          {onClearSalaries && salaryEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear all staff salary and payroll records"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Clear Salaries</span>
            </button>
          )}

          {canEdit && !isAdding && (
            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Staff / Salary Entry
            </button>
          )}
        </div>
      </div>

      {/* Clear Salaries Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Clear All Salary & Payroll Data?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to clear all {salaryEntries.length} salary and payroll disbursement records?
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
                  if (onClearSalaries) {
                    onClearSalaries();
                  }
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Yes, Clear All Salaries
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Portion Switcher (Tabs) */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs border">
        <button
          onClick={() => setActiveTab('staff_directory')}
          className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'staff_directory'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Full Staff Directory ({staffList.length} Members)</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll_vouchers')}
          className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'payroll_vouchers'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Payroll Vouchers & Disbursals ({salaryEntries.length})</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Payroll</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              ₹{(totalPayroll || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Across all staff members</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Paid Disbursed</p>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5">
              ₹{(totalPaidAmount || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold">Cleared bank/cash/UPI</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pending Salary</p>
            <h3 className="text-xl font-black text-amber-700 mt-0.5">
              ₹{(totalPendingAmount || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-amber-600 font-semibold">{pendingCount} Vouchers Pending</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff Directory</p>
            <h3 className="text-xl font-black text-purple-700 mt-0.5">
              {staffList.length} Staff Members
            </h3>
            <p className="text-[10px] text-slate-500">Master cooks, helpers & packers</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name, role, phone, Aadhar or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Payout Cycle:
          </span>
          <select
            value={selectedPayoutFilter}
            onChange={(e) => setSelectedPayoutFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Cycles</option>
            <option value="Daily Payout">Daily Payout</option>
            <option value="Weekly Payout">Weekly Payout</option>
            <option value="Fortnightly Payout">Fortnightly Payout</option>
            <option value="Monthly Payout">Monthly Payout</option>
          </select>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl p-4 max-w-md w-full border border-slate-700 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Capture {cameraTarget === 'photo' ? 'Employee Photo' : 'Payout Proof Slip'}
              </h3>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={stopCamera}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={captureCameraPhoto}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: STAFF DIRECTORY VIEW */}
      {activeTab === 'staff_directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaffList.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700">No Staff Directory Records Found</h3>
              <p className="text-xs text-slate-400">Click "Add Staff / Salary Entry" to register new employees.</p>
            </div>
          ) : (
            filteredStaffList.map((staff) => {
              const pendingInfo = getPendingDaysInfo(staff);

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center space-x-3">
                        {staff.photoAttachment ? (
                          <img
                            src={staff.photoAttachment}
                            alt={staff.employeeName}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-200 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-sm shrink-0">
                            {staff.employeeName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                            {staff.employeeName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md border border-indigo-100 uppercase tracking-wide">
                              {staff.designation}
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-100">
                              {staff.payoutCycle || 'Daily Payout'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setViewingProfile(staff)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                          title="View Full Profile Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEditClick(staff)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Staff Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pending Payment Alert Banner */}
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${pendingInfo.colorClass}`}>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className={`w-4 h-4 shrink-0 ${pendingInfo.iconColor}`} />
                        <span className="truncate">{pendingInfo.badgeText}</span>
                      </div>
                      {pendingInfo.status !== 'Paid' && (
                        <button
                          onClick={() => openQuickPaymentModal(staff)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-xs cursor-pointer"
                        >
                          Disburse
                        </button>
                      )}
                    </div>

                    {/* Staff Details Grid */}
                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Phone:</span>
                        <span className="font-bold text-slate-800 font-mono">{staff.phone || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Aadhar Number:</span>
                        <span className="font-bold text-slate-800 font-mono">{staff.aadharNumber || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">PAN Card:</span>
                        <span className="font-bold text-slate-800 font-mono">{staff.panNumber || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Emergency Contact:</span>
                        <span className="font-bold text-slate-800">
                          {staff.familyContactName ? `${staff.familyContactName} (${staff.familyRelationship || 'Family'})` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Rate / Salary:</span>
                      <div className="font-extrabold text-slate-900">
                        ₹{staff.rate.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">/{staff.payType === 'Daily Wage' ? 'day' : 'mo'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openQuickPaymentModal(staff)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Slip
                      </button>

                      {(currentUserRole === 'CEO' || canEdit) && (
                        <button
                          onClick={() => handleDeleteFullEmployeeData(staff.employeeName)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Delete Full Data of Employee"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          Delete Full
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PAYROLL VOUCHERS TABLE VIEW */}
      {activeTab === 'payroll_vouchers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-4 py-3">Staff Photo & Name</th>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3">Payout Cycle</th>
                  <th className="px-4 py-3 text-right">Base Rate (₹)</th>
                  <th className="px-4 py-3 text-center">Days Worked</th>
                  <th className="px-4 py-3 text-right">Net Payable (₹)</th>
                  <th className="px-4 py-3 text-center">Disbursal Status</th>
                  <th className="px-4 py-3 text-center">Payout Proof</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSalaryEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      No salary vouchers found matching search query or cycle filter.
                    </td>
                  </tr>
                ) : (
                  filteredSalaryEntries.map((entry) => {
                    const pendingInfo = getPendingDaysInfo(entry);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2.5">
                            {entry.photoAttachment ? (
                              <img
                                src={entry.photoAttachment}
                                alt={entry.employeeName}
                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 font-black rounded-xl flex items-center justify-center text-xs shrink-0">
                                {entry.employeeName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{entry.employeeName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{entry.phone || 'No Phone'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                          {entry.designation}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px] border border-indigo-100">
                            {entry.payoutCycle || 'Daily Payout'}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-800">
                          ₹{entry.rate.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-800 rounded-md">
                            {entry.presentDays} / {entry.workingDays}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-black text-slate-900 text-sm">
                          ₹{entry.netSalary.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] ${pendingInfo.colorClass}`}>
                            {pendingInfo.badgeText}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {entry.payoutProofAttachment ? (
                            <button
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.write(`<img src="${entry.payoutProofAttachment}" style="max-width:100%"/>`);
                                }
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3" /> View Proof
                            </button>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">No attachment</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openQuickPaymentModal(entry)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Pay / Update
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleEditClick(entry)}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(currentUserRole === 'CEO' || canEdit) && (
                              <button
                                onClick={() => onDeleteSalary(entry.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* MODAL / DRAWER: ADD OR EDIT STAFF & SALARY ENTRY */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editingId ? 'Edit Staff & Payroll Record' : 'Add New Staff / Salary Entry'}
                </h3>
                <p className="text-xs text-slate-500">Complete staff profile, photo attachment & payout preferences</p>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Section Navigation */}
            <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFormSection('payroll')}
                className={`py-2 px-3 border-b-2 cursor-pointer ${
                  formSection === 'payroll' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                }`}
              >
                1. Payroll & Photo
              </button>
              <button
                type="button"
                onClick={() => setFormSection('identity')}
                className={`py-2 px-3 border-b-2 cursor-pointer ${
                  formSection === 'identity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                }`}
              >
                2. Aadhar & Contact
              </button>
              <button
                type="button"
                onClick={() => setFormSection('address')}
                className={`py-2 px-3 border-b-2 cursor-pointer ${
                  formSection === 'address' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                }`}
              >
                3. Addresses
              </button>
              <button
                type="button"
                onClick={() => setFormSection('family')}
                className={`py-2 px-3 border-b-2 cursor-pointer ${
                  formSection === 'family' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                }`}
              >
                4. Family Details
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* SECTION 1: PAYROLL & PHOTO ATTACHMENT */}
              {formSection === 'payroll' && (
                <div className="space-y-4">
                  {/* Photo Attachment Box */}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-4">
                    {photoAttachment ? (
                      <div className="relative group shrink-0">
                        <img
                          src={photoAttachment}
                          alt="Employee"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-300 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoAttachment('')}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-indigo-100/70 border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400 shrink-0">
                        <Users className="w-8 h-8" />
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <label className="font-extrabold text-slate-800 text-xs block">Employee Photo Attachment</label>
                      <p className="text-[11px] text-slate-500">Upload profile photo or snap instant photo via device camera</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Photo</span>
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => startCamera('photo')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Camera Snap</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Staff Name & Existing Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Employee Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Murugan K"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Quick Select Existing Staff</label>
                      <select
                        onChange={(e) => handleSelectExistingStaff(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Existing Member --</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.employeeName}>
                            {s.employeeName} ({s.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Designation & Payout Cycle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Designation / Role</label>
                      <select
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        {allRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Pay Type</label>
                      <select
                        value={payType}
                        onChange={(e) => setPayType(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Daily Wage">Daily Wage</option>
                        <option value="Monthly Salary">Monthly Salary</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Payout Frequency / Cycle</label>
                      <select
                        value={payoutCycle}
                        onChange={(e) => setPayoutCycle(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Daily Payout">Daily Payout</option>
                        <option value="Weekly Payout">Weekly Payout</option>
                        <option value="Fortnightly Payout">Fortnightly Payout</option>
                        <option value="Monthly Payout">Monthly Payout</option>
                      </select>
                    </div>
                  </div>

                  {/* Rate, Days Worked */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Rate (₹ per day / month)</label>
                      <input
                        type="number"
                        min="0"
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Total Month Working Days</label>
                      <input
                        type="number"
                        min="1"
                        value={workingDays}
                        onChange={(e) => setWorkingDays(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Present / Worked Days</label>
                      <input
                        type="number"
                        min="0"
                        value={presentDays}
                        onChange={(e) => setPresentDays(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Deductions & Overtime */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Overtime Pay (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={overtimePay}
                        onChange={(e) => setOvertimePay(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Advance Deductions (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={advanceDeductions}
                        onChange={(e) => setAdvanceDeductions(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-rose-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Other Deductions (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={otherDeductions}
                        onChange={(e) => setOtherDeductions(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-rose-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Calculated Net Salary Box */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl flex justify-between items-center font-bold">
                    <span>Calculated Net Payable:</span>
                    <span className="text-lg font-mono text-emerald-400">
                      ₹{calculateNetSalary().toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION 2: IDENTITY & CONTACT */}
              {formSection === 'identity' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Aadhar Card Number</label>
                      <input
                        type="text"
                        placeholder="12-digit Aadhar #"
                        value={aadharNumber}
                        onChange={(e) => setAadharNumber(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">PAN Card Number</label>
                      <input
                        type="text"
                        placeholder="10-character PAN #"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 98421 XXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="staff@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: ADDRESSES */}
              {formSection === 'address' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Permanent Home Address</label>
                    <textarea
                      rows={2}
                      placeholder="Door #, Street, Village/Town"
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <label className="font-bold text-slate-700 block">Current Local Address</label>
                    <button
                      type="button"
                      onClick={copyPermanentAddressToCurrent}
                      className="text-indigo-600 font-bold hover:underline text-[11px] cursor-pointer"
                    >
                      Copy Permanent Address
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Factory Quarters / Local Rented Room"
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">City, State & Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. Madurai, Tamil Nadu - 625001"
                      value={cityStatePincode}
                      onChange={(e) => setCityStatePincode(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 4: FAMILY DETAILS */}
              {formSection === 'family' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Emergency / Family Contact Person</label>
                      <input
                        type="text"
                        placeholder="Spouse / Father Name"
                        value={familyContactName}
                        onChange={(e) => setFamilyContactName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Relationship</label>
                      <select
                        value={familyRelationship}
                        onChange={(e) => setFamilyRelationship(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Family Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 9XXXX XXXXX"
                        value={familyPhone}
                        onChange={(e) => setFamilyPhone(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Number of Dependents</label>
                      <input
                        type="number"
                        min="0"
                        value={numberOfDependents}
                        onChange={(e) => setNumberOfDependents(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Family & Emergency Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Children education details or medical conditions"
                      value={familyNotes}
                      onChange={(e) => setFamilyNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {formSection !== 'payroll' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formSection === 'family') setFormSection('address');
                        else if (formSection === 'address') setFormSection('identity');
                        else if (formSection === 'identity') setFormSection('payroll');
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-slate-800 cursor-pointer"
                    >
                      Previous Step
                    </button>
                  )}

                  {formSection !== 'family' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (formSection === 'payroll') setFormSection('identity');
                        else if (formSection === 'identity') setFormSection('address');
                        else if (formSection === 'address') setFormSection('family');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Save Staff Record
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DISBURSAL / PAY SLIP MODAL */}
      {quickPaymentEntry && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Disburse Salary & Attach Proof</h3>
                <p className="text-xs text-slate-500">Record payout dispatches for {quickPaymentEntry.employeeName}</p>
              </div>
              <button onClick={() => setQuickPaymentEntry(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex justify-between items-center font-bold">
                <div>
                  <div className="text-slate-500 text-[10px]">Staff Designation:</div>
                  <div className="text-slate-900 text-sm">{quickPaymentEntry.employeeName}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 text-[10px]">Net Payable:</div>
                  <div className="text-indigo-700 font-mono text-base font-black">
                    ₹{quickPaymentEntry.netSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Disbursal Status</label>
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Paid">Paid in Full</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Disbursement Date</label>
                <input
                  type="date"
                  value={quickDisbursementDate}
                  onChange={(e) => setQuickDisbursementDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={quickPaymentMethod}
                    onChange={(e) => setQuickPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cash">Cash Disbursal</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">UTR / Ref #</label>
                  <input
                    type="text"
                    placeholder="Bank UTR or UPI Ref #"
                    value={quickPaymentRefNo}
                    onChange={(e) => setQuickPaymentRefNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Easy Attach Proof */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Attach Bank Receipt / Payout Proof (Easy Attach)</label>
                {quickPayoutProof ? (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" /> Payout Proof Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickPayoutProof('')}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center border border-slate-300 cursor-pointer">
                      <span>Upload Proof</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'proof')} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => startCamera('proof')}
                      className="flex-1 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Camera Snap
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPaymentEntry(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Confirm Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL STAFF PROFILE CARD MODAL */}
      {viewingProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                {viewingProfile.photoAttachment ? (
                  <img
                    src={viewingProfile.photoAttachment}
                    alt={viewingProfile.employeeName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-300 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center text-2xl shadow-md">
                    {viewingProfile.employeeName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl">{viewingProfile.employeeName}</h3>
                  <p className="text-xs font-bold text-indigo-600 uppercase">{viewingProfile.designation} • {viewingProfile.payoutCycle || 'Daily Payout'}</p>
                </div>
              </div>
              <button onClick={() => setViewingProfile(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Identification & Verification</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Aadhar: <strong>{viewingProfile.aadharNumber || 'N/A'}</strong></div>
                  <div>PAN: <strong>{viewingProfile.panNumber || 'N/A'}</strong></div>
                  <div>Phone: <strong>{viewingProfile.phone || 'N/A'}</strong></div>
                  <div>Email: <strong>{viewingProfile.email || 'N/A'}</strong></div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Addresses</div>
                <div>Permanent: <strong>{viewingProfile.permanentAddress || 'N/A'}</strong></div>
                <div>Current: <strong>{viewingProfile.currentAddress || 'N/A'}</strong></div>
                <div>Location: <strong>{viewingProfile.cityStatePincode || 'N/A'}</strong></div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Family & Emergency</div>
                <div>Contact Person: <strong>{viewingProfile.familyContactName} ({viewingProfile.familyRelationship})</strong></div>
                <div>Emergency Phone: <strong>{viewingProfile.familyPhone || 'N/A'}</strong></div>
                <div>Dependents: <strong>{viewingProfile.numberOfDependents || 0}</strong></div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              {(currentUserRole === 'CEO' || canEdit) && (
                <button
                  onClick={() => {
                    const name = viewingProfile.employeeName;
                    setViewingProfile(null);
                    handleDeleteFullEmployeeData(name);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <UserX className="w-4 h-4" /> Delete Full Employee Data
                </button>
              )}

              <button
                onClick={() => setViewingProfile(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer ml-auto"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM JOB ROLE MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Add Custom Job Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRoleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Job Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Inspector, Machine Operator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Add Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
