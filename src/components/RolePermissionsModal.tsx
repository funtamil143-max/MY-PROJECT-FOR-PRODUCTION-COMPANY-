import React, { useState } from 'react';
import { AllRolesPermissions, UserRole } from '../types';
import { Shield, Check, X, Lock, Eye, Plus, Edit2, Printer, Download } from 'lucide-react';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: AllRolesPermissions;
  onSavePermissions: (updated: AllRolesPermissions) => void;
}

type ControllableRole = 'Admin' | 'Manager' | 'Salesperson' | 'Visitor';

const MODULES_LIST = [
  { id: 'raw_materials', label: 'Raw Materials' },
  { id: 'recipes', label: 'Recipes & Formulas' },
  { id: 'production', label: 'Production Batches' },
  { id: 'sales', label: 'Sales & Invoices' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'salary', label: 'Salary Details' },
  { id: 'reports', label: 'Financial & Cost Reports' },
  { id: 'audit_log', label: 'Audit Log' },
];

export default function RolePermissionsModal({
  isOpen,
  onClose,
  permissions,
  onSavePermissions,
}: RolePermissionsModalProps) {
  const [selectedRole, setSelectedRole] = useState<ControllableRole>('Salesperson');
  const [localPermissions, setLocalPermissions] = useState<AllRolesPermissions>(() => {
    const base = { ...permissions };
    if (!base.Salesperson) {
      base.Salesperson = {
        raw_materials: { view: false, add: false, edit: false, print: false, export: false },
        recipes: { view: false, add: false, edit: false, print: false, export: false },
        production: { view: false, add: false, edit: false, print: false, export: false },
        sales: { view: true, add: true, edit: true, print: true, export: true },
        attendance: { view: true, add: true, edit: false, print: false, export: false },
        salary: { view: false, add: false, edit: false, print: false, export: false },
        reports: { view: false, add: false, edit: false, print: false, export: false },
        audit_log: { view: false, add: false, edit: false, print: false, export: false },
      };
    }
    return base;
  });
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePermission = (
    role: ControllableRole,
    moduleId: string,
    action: 'view' | 'add' | 'edit' | 'print' | 'export'
  ) => {
    setLocalPermissions((prev) => {
      const currentRolePerms = prev[role] || {};
      const currentModulePerms = currentRolePerms[moduleId] || {
        view: role !== 'Visitor',
        add: role !== 'Visitor' && role !== 'Salesperson',
        edit: role !== 'Visitor' && role !== 'Salesperson',
        print: true,
        export: role !== 'Visitor',
      };

      const updatedModulePerms = {
        ...currentModulePerms,
        [action]: !currentModulePerms[action],
      };

      return {
        ...prev,
        [role]: {
          ...currentRolePerms,
          [moduleId]: updatedModulePerms,
        },
      };
    });
  };

  const handleSave = () => {
    onSavePermissions(localPermissions);
    setMessage('Role permissions updated successfully!');
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-base">CEO Security & Role Access Controls</h3>
              <p className="text-[11px] text-purple-200">Set fine-grained module permissions for Admin, Manager, Salesperson, and Visitor roles</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
              {message}
            </div>
          )}

          {/* Role selector tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            {(['Admin', 'Manager', 'Salesperson', 'Visitor'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                  selectedRole === role
                    ? 'border-purple-600 text-purple-900 bg-purple-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{role === 'Salesperson' ? 'Sales Person' : role} Permissions</span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Note: <strong>CEO</strong> role always retains unconstrained full administrative privileges and cannot be limited. Only the CEO can edit these rules.</span>
          </div>

          {/* Permissions matrix table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-4 py-3">Module Name</th>
                  <th className="px-3 py-3 text-center">
                    <span className="flex items-center justify-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="flex items-center justify-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit/Delete</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="flex items-center justify-center gap-1"><Printer className="w-3.5 h-3.5" /> Print</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" /> Export</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {MODULES_LIST.map((mod) => {
                  const modPerms = localPermissions[selectedRole]?.[mod.id] || {
                    view: true,
                    add: true,
                    edit: selectedRole !== 'Visitor',
                    print: true,
                    export: selectedRole !== 'Visitor',
                  };

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{mod.label}</td>
                      {(['view', 'add', 'edit', 'print', 'export'] as const).map((action) => (
                        <td key={action} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={modPerms[action]}
                            onChange={() => togglePermission(selectedRole, mod.id, action)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Permissions Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
