import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  MapPin, 
  ArrowRight, 
  Building2, 
  Sparkles, 
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Check,
  ShoppingBag
} from 'lucide-react';

interface LoginModalProps {
  users: UserProfile[];
  onLogin: (user: UserProfile, location: { latitude?: number; longitude?: number; address?: string }) => void;
  onResetPassword?: (username: string, newPassword: string) => void;
}

export default function LoginModal({ users, onLogin, onResetPassword }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('CEO');
  const [username, setUsername] = useState('ceo');
  const [password, setPassword] = useState('ceo');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState('ceo');
  const [resetCode, setResetCode] = useState('');
  const [showResetCode, setShowResetCode] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Geolocation state
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number; address?: string }>({
    address: 'Aadiyar T3 Central Factory, Station Terminal'
  });

  // Auto-detect location on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          setCoords({
            latitude: lat,
            longitude: lng,
            address: `GPS: ${lat}° N, ${lng}° E (Factory Gate Terminal)`
          });
          setLocationStatus(`GPS Verified: ${lat}, ${lng}`);
        },
        (err) => {
          setLocationStatus('GPS Signal Offline (Using Factory IP Terminal)');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('GPS Not Supported (Terminal Logged)');
    }
  }, []);

  // Update prefilled credentials when role changes
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
    const match = users.find((u) => u.role === role);
    if (match) {
      setUsername(match.username);
      setPassword(match.password || match.username);
    } else if (role === 'Salesperson') {
      setUsername('sales');
      setPassword('sales');
    } else {
      setUsername(role.toLowerCase());
      setPassword(role.toLowerCase());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const matchedUser = users.find(
      (u) => u.role === selectedRole && u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (matchedUser) {
      if (matchedUser.password && matchedUser.password !== password) {
        setError('Incorrect password! You can reset it using Master Security Code below.');
        return;
      }
      onLogin(matchedUser, coords);
    } else {
      // Fallback profile for standard demo entry
      const fallbackUser: UserProfile = {
        id: `usr_${Date.now()}`,
        username: username.trim() || selectedRole.toLowerCase(),
        name: `${selectedRole} User`,
        role: selectedRole,
        email: `${selectedRole.toLowerCase()}@aadiyart3.com`,
        phone: '+91 9842100011'
      };
      onLogin(fallbackUser, coords);
    }
  };

  // Master Password Reset with Authorized Code 7373617198
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    // Verification of Master Reset Code: 7373617198
    const cleanCode = resetCode.trim().replace(/\s+/g, '');
    if (cleanCode !== '7373617198') {
      setResetError('Invalid Security Code! Please enter the authorized 10-digit Master Code.');
      return;
    }

    if (!resetNewPassword.trim()) {
      setResetError('Please enter a valid new password.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('New password and confirm password do not match.');
      return;
    }

    const targetUser = users.find(
      (u) => u.username.toLowerCase() === resetUsername.trim().toLowerCase()
    ) || users.find((u) => u.role === selectedRole);

    const effectiveUsername = targetUser ? targetUser.username : resetUsername.trim();

    if (onResetPassword) {
      onResetPassword(effectiveUsername, resetNewPassword.trim());
    } else {
      try {
        const savedUsersStr = localStorage.getItem('snack_users');
        if (savedUsersStr) {
          const parsed = JSON.parse(savedUsersStr) as UserProfile[];
          const updated = parsed.map((u) => 
            u.username.toLowerCase() === effectiveUsername.toLowerCase()
              ? { ...u, password: resetNewPassword.trim(), pin: resetNewPassword.trim() }
              : u
          );
          localStorage.setItem('snack_users', JSON.stringify(updated));
        }
      } catch (err) {}
    }

    setResetSuccess(`Password for ${effectiveUsername} successfully reset! Master Security Code verified.`);
    setPassword(resetNewPassword.trim());
    setUsername(effectiveUsername);

    setTimeout(() => {
      setIsResetMode(false);
      setResetError('');
      setResetSuccess('');
      setError('');
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-slate-950">
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-900/80 border-b border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto shadow-lg shadow-indigo-600/30">
            A
          </div>
          <h2 className="text-xl font-black tracking-tight text-white uppercase">
            Aadiyar T3 Snacks
          </h2>
          <p className="text-xs text-indigo-400 font-medium">
            Snack Factory ERP & Portion Controls System
          </p>
        </div>

        {/* Selected element container matching CSS selector:
            div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) */}
        <div className="p-6 space-y-5">
          
          {/* PASSWORD RESET VIEW */}
          {isResetMode ? (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Master Password Reset</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-tight">
                  Enter authorized Master Security Code <span className="font-mono font-black text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded border border-amber-500/40">**********</span> to reset user password.
                </p>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {/* Target Account */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Account to Reset
                </label>
                <select
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-amber-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.name} (@{u.username}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Reset Code Input */}
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase mb-1 flex items-center justify-between">
                  <span>Enter Master Reset Code</span>
                  <span className="text-[10px] font-mono font-bold text-amber-300">Code: **********</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                  <input
                    type={showResetCode ? 'text' : 'password'}
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter authorized 10-digit Master Code"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-amber-500/50 rounded-xl font-mono text-xs font-black text-amber-300 tracking-wider focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetCode(!showResetCode)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showResetCode ? 'Hide security code' : 'Show security code'}
                  >
                    {showResetCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  New Password / PIN
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Reset Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            /* STANDARD LOGIN VIEW */
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Designation / Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['CEO', 'Manager', 'Salesperson', 'Admin', 'Visitor'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        selectedRole === role
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {role === 'CEO' && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                        {role === 'Manager' && <Building2 className="w-4 h-4 text-emerald-400" />}
                        {role === 'Salesperson' && <ShoppingBag className="w-4 h-4 text-amber-300" />}
                        {role === 'Admin' && <KeyRound className="w-4 h-4 text-sky-400" />}
                        {role === 'Visitor' && <User className="w-4 h-4 text-slate-400" />}
                        <span>{role === 'Salesperson' ? 'Sales Person' : role}</span>
                      </span>
                      {selectedRole === role && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Privileges Banner */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-indigo-300 text-[11px] uppercase tracking-wide">
                  {selectedRole === 'CEO' && '⭐ Full Unrestricted Access (System Owner)'}
                  {selectedRole === 'Manager' && '🛠️ Production, Inventory & Sales Access'}
                  {selectedRole === 'Salesperson' && '💼 Direct Sales Invoicing, Bills & Order Delivery Access'}
                  {selectedRole === 'Admin' && '📋 Inventory, Invoices & Orders Access'}
                  {selectedRole === 'Visitor' && '👁️ Read-Only Display Mode'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {selectedRole === 'CEO'
                    ? 'Can configure settings & role permissions for all other designations.'
                    : selectedRole === 'Salesperson'
                    ? 'Specialized point-of-sale terminal: billing, payment collections, and delivery receipts.'
                    : 'Role permissions are configured and managed directly by the CEO.'}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300 uppercase">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setResetUsername(username);
                        setResetCode('');
                        setResetNewPassword('');
                        setResetConfirmPassword('');
                        setResetError('');
                        setResetSuccess('');
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset Password using Master Security Code"
                    >
                      <KeyRound className="w-3 h-3 text-amber-400" />
                      <span>Forgot / Reset Password?</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Reset Quick Link Bar */}
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-medium">Master Reset Code: <strong className="font-mono text-amber-400">**********</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetUsername(username);
                      setResetCode('');
                      setResetNewPassword('');
                      setResetConfirmPassword('');
                    }}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-bold cursor-pointer transition-all"
                  >
                    Reset Password
                  </button>
                </div>

                {/* GPS Location Tracker */}
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center gap-1.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {locationStatus}
                  </span>
                  <span className="text-indigo-400 font-mono font-bold">Location Tagged</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Enter Application Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 text-center text-[10px] text-slate-500 border-t border-slate-800 font-mono">
          Aadiyar Portion Control & ERP • Protected Security Gateway
        </div>

      </div>

    </div>
  );
}
