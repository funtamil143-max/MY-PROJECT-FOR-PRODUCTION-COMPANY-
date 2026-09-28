import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { User, Shield, Key, Camera, MapPin, Monitor, Check, X, Calendar, Eye, EyeOff } from 'lucide-react';
import ImageCaptureModal from './ImageCaptureModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile
}: UserProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photo, setPhoto] = useState(currentUser.profilePhoto || '');
  const [showImageModal, setShowImageModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match!' });
      return;
    }

    const updatePayload: Partial<UserProfile> = {
      name: name.trim() || currentUser.name,
      profilePhoto: photo,
    };

    if (newPassword.trim()) {
      updatePayload.password = newPassword.trim();
    }

    onUpdateProfile(updatePayload);
    setMessage({ type: 'success', text: 'Profile updated successfully!' });
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 1200);
  };

  const roleBadges: Record<UserRole, { bg: string; text: string }> = {
    CEO: { bg: 'bg-purple-100 text-purple-800 border-purple-300', text: 'CEO (Full Access)' },
    Admin: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', text: 'Administrator' },
    Manager: { bg: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Manager' },
    Salesperson: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Sales Person (Billing & Orders)' },
    Visitor: { bg: 'bg-slate-100 text-slate-700 border-slate-300', text: 'Visitor (Read-Only)' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">User Profile & Account Settings</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl text-xs font-semibold border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* User Photo & Role Header */}
          <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-300 overflow-hidden flex items-center justify-center text-indigo-800 font-black text-xl shadow-inner">
                {photo ? (
                  <img src={photo} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full shadow-md hover:bg-indigo-700 transition-transform active:scale-95"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-base">{currentUser.name}</h4>
              <p className="text-xs text-slate-500 font-mono">Username: @{currentUser.username}</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadges[currentUser.role]?.bg}`}>
                {roleBadges[currentUser.role]?.text}
              </span>
            </div>
          </div>

          {/* Session Metadata Info */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex items-start space-x-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-500 text-[10px] uppercase">Last Login</p>
                <p className="text-slate-800 font-mono text-[11px]">{currentUser.lastLogin || 'Just now'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-500 text-[10px] uppercase">Login Location</p>
                <p className="text-slate-800 font-mono text-[11px] truncate max-w-[160px]" title={currentUser.loginAddress || currentUser.loginLocation || 'GPS Acquired'}>
                  {currentUser.loginAddress || currentUser.loginLocation || 'Standard Node'}
                </p>
              </div>
            </div>
          </div>

          {/* Name Changing Option */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Password Changing Option */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600" />
                Change Account Password (Optional)
              </p>
              <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                Master Code: **********
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      <ImageCaptureModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onImageCaptured={(img) => setPhoto(img)}
        title="Upload / Capture Profile Picture"
      />
    </div>
  );
}
