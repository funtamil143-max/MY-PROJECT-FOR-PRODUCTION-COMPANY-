import React, { useState } from 'react';
import {
  User,
  UserPlus,
  Trash2,
  X,
  Check,
  Search,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Building,
  CheckCircle2
} from 'lucide-react';

interface ManageSalespersonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salespersons: string[];
  onAddSalesperson: (name: string) => void;
  onDeleteSalesperson: (name: string) => void;
  onResetDefaults?: () => void;
  storeCountsByName?: Record<string, number>;
}

const COMMON_SUGGESTIONS = [
  'K. Saravanan',
  'R. Murugan',
  'P. Senthil',
  'M. Dinesh',
  'S. Karthik',
  'V. Anbarasu',
  'T. Vijay',
  'A. Manoharan',
  'N. Prakash',
  'G. Radhakrishnan',
];

export const ManageSalespersonsModal: React.FC<ManageSalespersonsModalProps> = ({
  isOpen,
  onClose,
  salespersons,
  onAddSalesperson,
  onDeleteSalesperson,
  onResetDefaults,
  storeCountsByName = {},
}) => {
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a salesperson or representative name.' });
      return;
    }
    if (salespersons.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setFeedbackMsg({ type: 'error', text: `"${trimmed}" already exists in the list.` });
      return;
    }
    onAddSalesperson(trimmed);
    setNewName('');
    setFeedbackMsg({ type: 'success', text: `Added custom name "${trimmed}" to options!` });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleQuickAdd = (suggestion: string) => {
    if (salespersons.some(s => s.toLowerCase() === suggestion.toLowerCase())) {
      setFeedbackMsg({ type: 'error', text: `"${suggestion}" is already in the list.` });
      return;
    }
    onAddSalesperson(suggestion);
    setFeedbackMsg({ type: 'success', text: `Added "${suggestion}" to options!` });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDelete = (name: string) => {
    if (salespersons.length <= 1) {
      setFeedbackMsg({ type: 'error', text: 'At least one salesperson name must remain in the options list.' });
      return;
    }
    onDeleteSalesperson(name);
    setFeedbackMsg({ type: 'success', text: `Deleted "${name}" from options.` });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const filteredList = salespersons.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4 relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Manage Salesperson Names</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {salespersons.length} Options
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Add custom names or delete names from the route and salesperson dropdown lists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Feedback message */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Add New Custom Salesperson Form */}
          <form onSubmit={handleAdd} className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Add Custom Salesperson / Executive Name:</span>
              </span>
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                Direct Add
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="e.g. S. Karthik, A. Ramesh, S. Priya"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (feedbackMsg) setFeedbackMsg(null);
                }}
                className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 shadow-2xs placeholder:font-normal placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Name</span>
              </button>
            </div>
          </form>

          {/* Quick Suggestions Chips */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Suggestions (Click to Add):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SUGGESTIONS.map(s => {
                const isAlreadyAdded = salespersons.some(n => n.toLowerCase() === s.toLowerCase());
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isAlreadyAdded}
                    onClick={() => handleQuickAdd(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      isAlreadyAdded
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-2xs'
                    }`}
                  >
                    <span>{s}</span>
                    {isAlreadyAdded ? (
                      <Check className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active List Header & Search */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Current Salesperson Options ({filteredList.length})
              </span>
              {salespersons.length > 4 && (
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* List with Delete Actions */}
            {filteredList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching salesperson names found.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {filteredList.map((name) => {
                  const storeCount = storeCountsByName[name] || 0;
                  return (
                    <div
                      key={name}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {storeCount > 0 ? `${storeCount} shops assigned` : 'Unassigned in directory'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {storeCount > 0 && (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Building className="w-3 h-3 text-emerald-600" />
                            <span>{storeCount}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(name)}
                          disabled={salespersons.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={salespersons.length <= 1 ? "At least one name must remain" : `Delete "${name}" from options`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          {onResetDefaults ? (
            <button
              type="button"
              onClick={onResetDefaults}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
