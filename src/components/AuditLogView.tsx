import React, { useState } from 'react';
import { AuditLogEntry, UserRole } from '../types';
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Monitor, 
  History, 
  FileText, 
  Lock, 
  Printer, 
  FileSpreadsheet, 
  Download,
  PlusCircle,
  Edit3,
  Trash2,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  X,
  Copy,
  Check,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  currentUserRole: UserRole;
}

// Helper Date & Month functions
const parseLogDate = (timestamp?: string): string => {
  if (!timestamp) return '';
  const datePart = timestamp.split('T')[0].split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const parsed = new Date(timestamp);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return datePart;
};

const parseLogMonth = (timestamp?: string): string => {
  const d = parseLogDate(timestamp);
  if (d && d.length >= 7) return d.substring(0, 7);
  return '';
};

const formatYearMonthLabel = (ym: string): string => {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-');
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
  return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function AuditLogView({ logs, currentUserRole }: AuditLogViewProps) {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Elaborated View State
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [detailModalLog, setDetailModalLog] = useState<AuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  if (currentUserRole !== 'CEO') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Restricted Executive Module</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The System Audit Log and User Activity History is strictly restricted to the <strong>CEO</strong> role.
        </p>
      </div>
    );
  }

  // Derived unique lists for dropdown filters
  const uniqueModules = Array.from(new Set(logs.map((l) => l.module).filter(Boolean)));
  const uniqueRoles = Array.from(
    new Set([
      'CEO',
      'Master Baker',
      'Floor Staff',
      'Sales Admin',
      'Billing Staff',
      ...logs.map((l) => l.userRole).filter(Boolean)
    ])
  );
  const uniqueMonths = Array.from(
    new Set(logs.map((l) => parseLogMonth(l.timestamp)).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Multi-criteria Filtering
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !query ||
      (log.userName && log.userName.toLowerCase().includes(query)) ||
      (log.module && log.module.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query)) ||
      (log.details && log.details.toLowerCase().includes(query)) ||
      (log.userRole && log.userRole.toLowerCase().includes(query)) ||
      (log.location && log.location.toLowerCase().includes(query)) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(query)) ||
      (log.updatedValue && log.updatedValue.toLowerCase().includes(query)) ||
      (log.newValue && log.newValue.toLowerCase().includes(query));

    const matchesModule = selectedModule === 'all' || log.module === selectedModule;
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesRole = selectedRole === 'all' || log.userRole === selectedRole;
    
    const logMonth = parseLogMonth(log.timestamp);
    const matchesMonth = selectedMonth === 'all' || logMonth === selectedMonth;

    const logDate = parseLogDate(log.timestamp);
    const matchesStartDate = !startDate || (logDate && logDate >= startDate);
    const matchesEndDate = !endDate || (logDate && logDate <= endDate);

    return matchesQuery && matchesModule && matchesAction && matchesRole && matchesMonth && matchesStartDate && matchesEndDate;
  });

  // Activity Stats for overview cards
  const addCount = filteredLogs.filter((l) => l.action === 'Add' || l.action.includes('ADD')).length;
  const editCount = filteredLogs.filter((l) => l.action === 'Edit' || l.action.includes('EDIT') || l.action.includes('UPDATE')).length;
  const deleteCount = filteredLogs.filter((l) => l.action === 'Delete' || l.action.includes('DELETE')).length;
  const exportCount = filteredLogs.filter((l) => l.action === 'Export' || l.action === 'Print' || l.action.includes('EXPORT')).length;

  const activeFilterCount = 
    (selectedModule !== 'all' ? 1 : 0) +
    (selectedAction !== 'all' ? 1 : 0) +
    (selectedRole !== 'all' ? 1 : 0) +
    (selectedMonth !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedModule('all');
    setSelectedAction('all');
    setSelectedRole('all');
    setSelectedMonth('all');
    setStartDate('');
    setEndDate('');
  };

  // Copy details handler
  const handleCopyRecordJSON = (log: AuditLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Excel Export Handler (.xlsx)
  const exportAuditLogsToExcel = () => {
    const exportData = filteredLogs.map((log) => ({
      'Timestamp': log.timestamp || '',
      'User Name': log.userName || '',
      'User Role': log.userRole || '',
      'Module': log.module || '',
      'Action': log.action || '',
      'Activity Details': log.details || '',
      'Previous Value': log.previousValue || '',
      'New / Updated Value': log.updatedValue || log.newValue || '',
      'Location / Access Point': log.location || 'Local Server'
    }));
    exportToExcel(exportData, `Audit_Trail_Report_${new Date().toISOString().split('T')[0]}`, 'Audit Logs');
  };

  // Print Report Handler
  const handlePrintAuditTrail = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>System Audit Trail & Change Entry Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 800; }
            p { margin: 0 0 16px 0; font-size: 11px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; }
            .badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
            .add { background-color: #d1fae5; color: #065f46; }
            .edit { background-color: #e0e7ff; color: #3730a3; }
            .delete { background-color: #ffe4e6; color: #9f1239; }
          </style>
        </head>
        <body>
          <h1>System Audit Trail & Change Entry Report</h1>
          <p>Generated on ${new Date().toLocaleString('en-IN')} | Total Recorded Events: ${filteredLogs.length}</p>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User Name</th>
                <th>Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Activity Description</th>
                <th>Location / Access Point</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map((l) => `
                <tr>
                  <td style="font-family: monospace;">${l.timestamp}</td>
                  <td><strong>${l.userName}</strong></td>
                  <td>${l.userRole}</td>
                  <td>${l.module}</td>
                  <td><span class="badge ${l.action.toLowerCase()}">${l.action}</span></td>
                  <td>${l.details}</td>
                  <td style="font-family: monospace;">${l.location || 'Local Server'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const actionColorMap: Record<string, string> = {
    Add: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Edit: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    Delete: 'bg-rose-50 text-rose-800 border-rose-200',
    Login: 'bg-purple-50 text-purple-800 border-purple-200',
    Print: 'bg-amber-50 text-amber-800 border-amber-200',
    Export: 'bg-blue-50 text-blue-800 border-blue-200',
    Cancel: 'bg-rose-100 text-rose-900 border-rose-300',
  };

  return (
    <div className="space-y-5" id="audit-log-module">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">System Audit Trail & Change History Report</h2>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            Complete, immutable log of every creation, edit, deletion, staff data update, login, and export action
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportAuditLogsToExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="Export Audit Trail to Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintAuditTrail}
            className="px-3.5 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 border border-purple-400/30 cursor-pointer"
            title="Export PDF / Print Report"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Change Entries Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Entries</div>
            <div className="text-lg font-black text-slate-900">{addCount} Recorded</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Edit / Updates</div>
            <div className="text-lg font-black text-slate-900">{editCount} Modified</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delete Actions</div>
            <div className="text-lg font-black text-slate-900">{deleteCount} Purged</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export / Print Logs</div>
            <div className="text-lg font-black text-slate-900">{exportCount} Reports</div>
          </div>
        </div>
      </div>

      {/* CUSTOM FILTER PANEL (Search by Date, Month, Role Wise, Module, Action) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Advanced Audit Log Filters & Inspector
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full font-mono">
                {activeFilterCount} Active Filters ({filteredLogs.length} Records)
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search records by user, action, module, location, before/after details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>

        {/* Multi-Select Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Date Range Start & End */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 2. Month Wise Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3 h-3 text-purple-500" />
              <span>Month Wise</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {formatYearMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Role Wise Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <UserCheck className="w-3 h-3 text-emerald-500" />
              <span>Role Wise</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All User Roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* 4. Module Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Shield className="w-3 h-3 text-blue-500" />
              <span>Module / Area</span>
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Modules</option>
              {uniqueModules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Recorded Changes & Activity Log ({filteredLogs.length} Entries)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Click any row to elaborate full change records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Timestamp & Date</th>
                <th className="px-4 py-3">User & Category Role</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Activity & Modifications</th>
                <th className="px-4 py-3">Access Location</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                    No audit trail records found matching selected date range, month, or role filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const prevVal = log.previousValue;
                  const updatedVal = log.updatedValue || log.newValue;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-purple-50/40 border-l-4 border-purple-600' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4" />}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                          {log.timestamp}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                            {log.userRole}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                          {log.module}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${actionColorMap[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-800 max-w-md">
                          <div className="line-clamp-2">{log.details}</div>
                          {prevVal && updatedVal && (
                            <div className="mt-1 flex items-center space-x-1.5 text-[10px] font-mono">
                              <span className="text-rose-600 line-through truncate max-w-[120px]" title={prevVal}>
                                Old: {prevVal}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-emerald-700 font-extrabold truncate max-w-[120px]" title={updatedVal}>
                                New: {updatedVal}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                          <div className="flex items-center space-x-1 text-slate-600 font-mono" title={log.location || 'Unknown'}>
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{log.location || 'Local Server'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModalLog(log);
                            }}
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all border border-purple-200 cursor-pointer flex items-center justify-center mx-auto"
                            title="Inspect Elaborated Record Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-xs">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                                  <span>Elaborated Change & Record Audit Entry</span>
                                </span>
                                <button
                                  onClick={() => setDetailModalLog(log)}
                                  className="text-[11px] font-bold text-purple-700 hover:underline flex items-center space-x-1 cursor-pointer"
                                >
                                  <span>Open Full Modal</span>
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Activity Statement
                                  </span>
                                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium border border-slate-200">
                                    {log.details}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Value Modifications (Before vs After)
                                  </span>
                                  {prevVal || updatedVal ? (
                                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                                        <div className="text-[9px] font-bold uppercase text-rose-600 mb-0.5">Original / Previous</div>
                                        <div className="break-all">{prevVal || '(None / Initial State)'}</div>
                                      </div>
                                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                                        <div className="text-[9px] font-bold uppercase text-emerald-700 mb-0.5">Updated / Current</div>
                                        <div className="break-all font-bold">{updatedVal || '(None / Cleared)'}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] italic">
                                      No direct value substitution recorded for this action.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL RECORD ELABORATED DETAILS MODAL */}
      {detailModalLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-purple-950 p-5 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    Elaborated Audit Record Details
                  </h3>
                  <p className="text-[10px] text-purple-200 font-mono">
                    ID: {detailModalLog.id || `LOG-${Date.now()}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalLog(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Badge overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">User</span>
                  <span className="font-extrabold text-slate-900 text-sm block">{detailModalLog.userName}</span>
                  <span className="text-[10px] text-indigo-600 font-bold">{detailModalLog.userRole}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Module</span>
                  <span className="font-extrabold text-slate-900 text-sm block">{detailModalLog.module}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{detailModalLog.action}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Timestamp</span>
                  <span className="font-mono font-bold text-slate-900 text-xs block">{detailModalLog.timestamp}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs block truncate" title={detailModalLog.location}>
                    {detailModalLog.location || 'Local Server'}
                  </span>
                </div>
              </div>

              {/* Full Activity Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Full Activity Description
                </label>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium text-xs leading-relaxed">
                  {detailModalLog.details}
                </div>
              </div>

              {/* Modifications Diff */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Change History & Record Modifications
                </label>
                
                {detailModalLog.previousValue || detailModalLog.updatedValue || detailModalLog.newValue ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-rose-700 flex items-center justify-between">
                        <span>Previous Value</span>
                        <span className="px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded text-[9px]">Original</span>
                      </div>
                      <div className="font-mono text-xs text-rose-950 font-medium break-all pt-1">
                        {detailModalLog.previousValue || '(None)'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-emerald-800 flex items-center justify-between">
                        <span>Updated Value</span>
                        <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-950 rounded text-[9px]">New Value</span>
                      </div>
                      <div className="font-mono text-xs text-emerald-950 font-extrabold break-all pt-1">
                        {detailModalLog.updatedValue || detailModalLog.newValue || '(None)'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic text-center">
                    This activity is an event log (e.g. Login, Print, Export) without raw property overrides.
                  </div>
                )}
              </div>

              {/* Integrity Stamp */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="text-[11px] text-indigo-900">
                  <p className="font-bold">Security & Compliance Verified</p>
                  <p className="text-indigo-700 text-[10px]">
                    Recorded by Aadiyar ERP Audit Service. Strictly restricted to CEO review.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <button
                onClick={() => handleCopyRecordJSON(detailModalLog)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied JSON!' : 'Copy Raw Record'}</span>
              </button>

              <button
                onClick={() => setDetailModalLog(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
