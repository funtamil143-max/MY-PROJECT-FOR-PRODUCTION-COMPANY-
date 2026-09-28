import React, { useState } from 'react';
import { AttendanceEntry, UserRole } from '../types';
import { Calendar, UserCheck, Clock, Plus, Search, Trash2, Edit2, Check, X, ShieldAlert, Users, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface AttendanceManagerProps {
  attendanceEntries: AttendanceEntry[];
  onAddAttendance: (entry: Omit<AttendanceEntry, 'id'>) => void;
  onUpdateAttendance: (id: string, entry: Partial<AttendanceEntry>) => void;
  onDeleteAttendance: (id: string) => void;
  currentUserRole: UserRole;
  canEdit: boolean;
}

export default function AttendanceManager({
  attendanceEntries,
  onAddAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  currentUserRole,
  canEdit,
}: AttendanceManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [employeeName, setEmployeeName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [inTime, setInTime] = useState('08:00');
  const [outTime, setOutTime] = useState('17:00');
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Half Day' | 'Leave'>('Present');
  const [notes, setNotes] = useState('');

  const calculateHours = (inT: string, outT: string, stat: string): number => {
    if (stat === 'Absent' || stat === 'Leave') return 0;
    if (stat === 'Half Day') return 4;
    try {
      const [inH, inM] = inT.split(':').map(Number);
      const [outH, outM] = outT.split(':').map(Number);
      const startMinutes = inH * 60 + inM;
      const endMinutes = outH * 60 + outM;
      const diff = (endMinutes - startMinutes) / 60;
      return diff > 0 ? Number(diff.toFixed(1)) : 8;
    } catch {
      return 8;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    const workingHours = calculateHours(inTime, outTime, status);

    if (editingId) {
      onUpdateAttendance(editingId, {
        employeeName: employeeName.trim(),
        date,
        inTime,
        outTime,
        workingHours,
        status,
        notes,
      });
      setEditingId(null);
    } else {
      onAddAttendance({
        employeeName: employeeName.trim(),
        date,
        inTime,
        outTime,
        workingHours,
        status,
        notes,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setEmployeeName('');
    setDate(new Date().toISOString().slice(0, 10));
    setInTime('08:00');
    setOutTime('17:00');
    setStatus('Present');
    setNotes('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (entry: AttendanceEntry) => {
    setEditingId(entry.id);
    setEmployeeName(entry.employeeName);
    setDate(entry.date);
    setInTime(entry.inTime);
    setOutTime(entry.outTime);
    setStatus(entry.status);
    setNotes(entry.notes || '');
    setIsAdding(true);
  };

  const filteredEntries = attendanceEntries.filter((entry) => {
    const matchesSearch = entry.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const todayCount = attendanceEntries.filter(e => e.date === selectedDate);
  const presentCount = todayCount.filter(e => e.status === 'Present' || e.status === 'Half Day').length;
  const absentCount = todayCount.filter(e => e.status === 'Absent' || e.status === 'Leave').length;

  const handleExportExcel = () => {
    const exportData = filteredEntries.map((entry) => ({
      'Employee Name': entry.employeeName,
      'Date': entry.date,
      'In Time': entry.inTime,
      'Out Time': entry.outTime,
      'Working Hours': entry.workingHours,
      'Status': entry.status,
      'Notes': entry.notes || '-'
    }));
    exportToExcel(exportData, `Attendance_Report_${new Date().toISOString().split('T')[0]}`, 'Attendance Logs');
  };

  return (
    <div className="space-y-5" id="attendance-module">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Worker Attendance & Shift Logs</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Track daily employee punch in/out times, working hours, and attendance statuses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export attendance records to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          {canEdit && !isAdding && (
            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log New Attendance Entry
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Selected Date</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 font-mono text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-full"
          />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Logged Staff Today</p>
          <p className="text-2xl font-black text-slate-900 font-mono">{todayCount.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-emerald-50/40 border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-800 uppercase">Present / Half-Day</p>
          <p className="text-2xl font-black text-emerald-700 font-mono">{presentCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-rose-50/40 border-rose-200">
          <p className="text-[10px] font-bold text-rose-800 uppercase">Absent / On Leave</p>
          <p className="text-2xl font-black text-rose-700 font-mono">{absentCount}</p>
        </div>
      </div>

      {/* Form Drawer / Container */}
      {isAdding && canEdit && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              {editingId ? 'Edit Attendance Entry' : 'Add New Attendance Entry'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Employee Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Murugan, Rajesh, Selvi"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Attendance Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">In Time & Out Time</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  disabled={status === 'Absent' || status === 'Leave'}
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  disabled={status === 'Absent' || status === 'Leave'}
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Audit Notes / Comments</label>
            <input
              type="text"
              placeholder="e.g. Master cook shift, late entry approved"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Update Entry' : 'Save Attendance Record'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee attendance records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">In Time</th>
                <th className="px-4 py-3">Out Time</th>
                <th className="px-4 py-3 text-right">Working Hours</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const statusColors: Record<string, string> = {
                    Present: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    'Half Day': 'bg-amber-50 text-amber-800 border-amber-200',
                    Absent: 'bg-rose-50 text-rose-800 border-rose-200',
                    Leave: 'bg-blue-50 text-blue-800 border-blue-200',
                  };

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{entry.employeeName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[entry.status]}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{entry.status === 'Absent' || entry.status === 'Leave' ? '-' : entry.inTime}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{entry.status === 'Absent' || entry.status === 'Leave' ? '-' : entry.outTime}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{entry.workingHours} hrs</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{entry.notes || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleEditClick(entry)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {currentUserRole === 'CEO' && (
                            <button
                              onClick={() => {
                                if (confirm(`Permanently delete attendance record for ${entry.employeeName}?`)) {
                                  onDeleteAttendance(entry.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Delete (CEO Only)"
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
    </div>
  );
}
