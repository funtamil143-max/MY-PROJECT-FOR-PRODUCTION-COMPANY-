import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  Loader2, 
  LogIn, 
  LogOut, 
  User, 
  ShieldCheck, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { FirebaseUser } from '../lib/firebase';

interface FirebaseAuthBarProps {
  user: FirebaseUser | null;
  loading: boolean;
  syncStatus: 'synced' | 'saving' | 'offline' | 'idle';
  lastSyncedAt: Date | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onManualSync?: () => void;
}

export default function FirebaseAuthBar({
  user,
  loading,
  syncStatus,
  lastSyncedAt,
  onSignIn,
  onSignOut,
  onManualSync,
}: FirebaseAuthBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Cloud Sync Status Indicator */}
      {user && (
        <button
          type="button"
          onClick={onManualSync}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
          title={
            syncStatus === 'synced'
              ? `Data synced with Firestore${lastSyncedAt ? ` at ${lastSyncedAt.toLocaleTimeString()}` : ''}. Click to re-sync.`
              : syncStatus === 'saving'
              ? 'Saving updates to Cloud Firestore...'
              : 'Firestore offline or syncing pending'
          }
        >
          {syncStatus === 'saving' ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : syncStatus === 'synced' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          )}
          <span className="hidden sm:inline text-[11px]">
            {syncStatus === 'saving' ? 'Syncing...' : syncStatus === 'synced' ? 'Cloud Synced' : 'Local'}
          </span>
        </button>
      )}

      {/* User Login / Profile */}
      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-5 h-5 rounded-full object-cover border border-indigo-400/50" 
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <span className="max-w-[100px] truncate hidden md:inline">
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2.5"
              onMouseLeave={() => setShowMenu(false)}
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-bold text-white truncate">{user.displayName || 'Authorized User'}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Firebase Auth Verified</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Cloud Database:</span>
                  <span className="font-mono text-emerald-400 font-bold">Firestore</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Persistence:</span>
                  <span className="text-white font-semibold">Active Real-Time</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onSignOut();
                }}
                className="w-full py-1.5 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign In</span>
        </button>
      )}
    </div>
  );
}
