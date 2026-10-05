import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
  Smartphone,
  Laptop,
  X,
  Compass,
  Bot,
  Warehouse,
  Boxes,
  AlertTriangle,
  PlusCircle,
  Building,
  Crosshair,
  Sliders,
  Check
} from 'lucide-react';

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

interface LocationAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationGranted?: (coords: { lat: number; lng: number; accuracy: number; label?: string }) => void;
  initialMessage?: string;
  defaultCoords?: { lat: number; lng: number };
}

// Preset logistics hubs in Tamil Nadu
const LOCATION_PRESETS = [
  { name: 'Coimbatore Central Depot', lat: 11.0168, lng: 76.9558, accuracy: 4.5 },
  { name: 'Tirupur Distribution Hub', lat: 11.1085, lng: 77.3411, accuracy: 5.0 },
  { name: 'Erode Warehousing Centre', lat: 11.3410, lng: 77.7172, accuracy: 4.0 },
  { name: 'Salem Junction Godown', lat: 11.6643, lng: 78.1460, accuracy: 6.0 },
  { name: 'Madurai Regional Hub', lat: 9.9252, lng: 78.1198, accuracy: 5.5 },
];

export const LocationAccessModal: React.FC<LocationAccessModalProps> = ({
  isOpen,
  onClose,
  onLocationGranted,
  initialMessage,
  defaultCoords,
}) => {
  const [activeTab, setActiveTab] = useState<'request_gps' | 'custom_location' | 'troubleshoot'>('request_gps');
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number; label?: string } | null>(null);
  const [activeHelpTab, setActiveHelpTab] = useState<'desktop' | 'android' | 'ios'>('desktop');

  // Custom location state
  const [customLat, setCustomLat] = useState<string>(defaultCoords?.lat ? String(defaultCoords.lat) : '11.0168');
  const [customLng, setCustomLng] = useState<string>(defaultCoords?.lng ? String(defaultCoords.lng) : '76.9558');
  const [customAccuracy, setCustomAccuracy] = useState<string>('5');
  const [customLabel, setCustomLabel] = useState<string>('Custom Work Location');
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);

  // High precision mode toggle
  const [useHighPrecision, setUseHighPrecision] = useState(true);

  // Check initial permission state using Permissions API if available
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setPermissionState('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          setPermissionState(perm.state as LocationPermissionState);
          perm.onchange = () => {
            setPermissionState(perm.state as LocationPermissionState);
            if (perm.state === 'granted') {
              fetchCurrentLocation();
            }
          };
        })
        .catch(() => {
          // Fallback if query fails
        });
    }
  }, [isOpen]);

  const fetchCurrentLocation = () => {
    setIsRequesting(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsRequesting(false);
        setPermissionState('granted');
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Number(pos.coords.accuracy.toFixed(1)),
          label: 'Live Device GPS',
        };
        setCurrentCoords(coords);
        if (onLocationGranted) {
          onLocationGranted(coords);
        }
      },
      (err) => {
        setIsRequesting(false);
        console.warn('Geolocation access error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
          setErrorMessage('Location access was denied in browser. You can still add custom location access coordinates below or unblock browser permissions.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMessage('Location signal currently unavailable. Ensure your device GPS/WiFi is active.');
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage('Location request timed out. Please try again.');
        } else {
          setErrorMessage(err.message || 'Could not access location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleRequestAccess = () => {
    fetchCurrentLocation();
  };

  const handleApplyPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setCustomLat(preset.lat.toFixed(6));
    setCustomLng(preset.lng.toFixed(6));
    setCustomAccuracy(String(preset.accuracy));
    setCustomLabel(preset.name);
  };

  const handleSaveCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    const accuracy = parseFloat(customAccuracy) || 5;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMessage('Please enter a valid Latitude between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMessage('Please enter a valid Longitude between -180 and 180.');
      return;
    }

    const coords = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      accuracy: Number(accuracy.toFixed(1)),
      label: customLabel.trim() || 'Custom Added Location',
    };

    setCurrentCoords(coords);
    setPermissionState('granted');
    setCustomSuccessMsg(`Custom location access added: [${coords.lat}, ${coords.lng}] (${coords.label})`);

    if (onLocationGranted) {
      onLocationGranted(coords);
    }

    setTimeout(() => {
      setCustomSuccessMsg(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-colors ${
              permissionState === 'granted'
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                : permissionState === 'denied'
                ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300'
                : 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-300'
            }`}>
              <MapPin className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Location Access Request</h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  permissionState === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : permissionState === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}>
                  {permissionState === 'granted'
                    ? '✓ Access Granted'
                    : permissionState === 'denied'
                    ? '⚠️ Access Blocked'
                    : 'Permission Required'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Grant GPS hardware access or add custom location coordinates for route synchronization
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

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('request_gps')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'request_gps'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Request Device GPS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom_location')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'custom_location'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Custom Location Access</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('troubleshoot')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'troubleshoot'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permission Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {initialMessage && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-start gap-2">
              <Compass className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{initialMessage}</span>
            </div>
          )}

          {/* TAB 1: REQUEST DEVICE GPS ACCESS */}
          {activeTab === 'request_gps' && (
            <div className="space-y-4">
              {permissionState === 'granted' ? (
                /* STATE: GRANTED */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">Location Access is Active & Verified</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Your browser has granted real-time GPS positioning. Coordinate captures for Godown, Shops, and Stock Pickup Points will synchronize automatically.
                      </p>
                    </div>
                  </div>

                  {currentCoords && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase font-sans">
                        <span>Live GPS Position Lock</span>
                        <span className="text-emerald-700 font-bold">{currentCoords.label || 'Active'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-800">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-sans">Latitude</span>
                          <strong className="text-indigo-700 text-sm">{currentCoords.lat}°</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-sans">Longitude</span>
                          <strong className="text-indigo-700 text-sm">{currentCoords.lng}°</strong>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-sans">
                        Error Radius: <strong className="text-emerald-700 font-mono">±{currentCoords.accuracy} meters</strong>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('custom_location')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Switch to Custom Location Coordinates</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRequestAccess}
                        disabled={isRequesting}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                        <span>Re-test GPS</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : permissionState === 'denied' ? (
                /* STATE: DENIED */
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950">Location Permission is Blocked in Browser</h4>
                      <p className="text-xs text-rose-800 mt-0.5">
                        Your browser or device blocked location access. You can click <strong>"Add Custom Location Access"</strong> to specify your location manually without browser permissions, or follow the guide to unblock.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('custom_location')}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Custom Location Access</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('troubleshoot')}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>View Unblock Steps</span>
                    </button>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={isRequesting}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                      <span>{isRequesting ? 'Retrying...' : 'Retry Browser Request'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE: PROMPT / INITIAL */
                <div className="space-y-4">
                  <div className="text-center py-2 space-y-2">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                      <Navigation className="w-8 h-8 animate-pulse text-indigo-600" />
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Allow Device Location Access
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Your browser will display a permission prompt. Granting access enables direct device GPS lock, auto-tagging shop coordinates, and real-time delivery tracking.
                    </p>
                  </div>

                  {/* High Accuracy Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Crosshair className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">High Accuracy (GPS Hardware Lock)</span>
                        <span className="text-[10px] text-slate-500 block">Uses GPS satellites and WiFi trilateration for highest precision</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useHighPrecision}
                      onChange={(e) => setUseHighPrecision(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                    />
                  </label>

                  {/* Reasons list */}
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
                      Why Location Access is Needed:
                    </span>
                    <div className="flex items-start gap-2.5 text-slate-700">
                      <Warehouse className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Central Godown:</strong> Lock exact warehouse coordinates and loading bay origin.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-700">
                      <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Store & Dispatch GPS:</strong> Real-time device GPS coordinates for retail stores and live tracking.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-700">
                      <Boxes className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Stock Pickup Points:</strong> Geotag ovens, frying sheds, and supplier loading points.</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={isRequesting}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Navigation className={`w-4 h-4 ${isRequesting ? 'animate-spin' : ''}`} />
                      <span>{isRequesting ? 'Requesting Browser Access...' : '📍 Allow Location Access Now'}</span>
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom_location')}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Or Add Custom Location Access</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD CUSTOM LOCATION ACCESS */}
          {activeTab === 'custom_location' && (
            <form onSubmit={handleSaveCustomLocation} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
                <PlusCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Custom Location Access</strong>
                  <span>Directly add custom GPS coordinates to grant location access without requiring browser geolocation permissions.</span>
                </div>
              </div>

              {/* Preset Hubs */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Quick Preset Logistics Hubs:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LOCATION_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2 text-left rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-all text-xs cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-indigo-700">{preset.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">[{preset.lat}, {preset.lng}]</div>
                      </div>
                      <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Latitude (°N) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    required
                    placeholder="e.g. 11.016844"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Longitude (°E) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    required
                    placeholder="e.g. 76.955832"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Location Label / Name
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Headquarters / Loading Bay"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Accuracy Error Margin (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customAccuracy}
                    onChange={(e) => setCustomAccuracy(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {customSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{customSuccessMsg}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Grant Location Access</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TROUBLESHOOT / BROWSER UNBLOCK GUIDE */}
          {activeTab === 'troubleshoot' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('desktop')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeHelpTab === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Chrome / Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('android')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeHelpTab === 'android' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android Chrome</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('ios')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeHelpTab === 'ios' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iOS Safari</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
                {activeHelpTab === 'desktop' && (
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Look at the top URL address bar of your browser.</li>
                    <li>Click the <strong>Tune / Padlock / Settings icon</strong> <Lock className="w-3 h-3 inline text-slate-600" /> on the left of the website address.</li>
                    <li>Find <strong>Location</strong> and change it from <em>"Block"</em> to <strong>"Allow"</strong>.</li>
                    <li>Click the button below to re-test location access.</li>
                  </ol>
                )}

                {activeHelpTab === 'android' && (
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Tap the <strong>three dots (⋮)</strong> menu in Chrome.</li>
                    <li>Go to <strong>Settings → Site Settings → Location</strong>.</li>
                    <li>Ensure Location is enabled and this site is not in the "Blocked" list.</li>
                    <li>Also check that your device's global GPS Location toggle is switched ON.</li>
                  </ol>
                )}

                {activeHelpTab === 'ios' && (
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Open your iPhone/iPad <strong>Settings</strong> app.</li>
                    <li>Tap <strong>Privacy & Security → Location Services</strong> (turn ON).</li>
                    <li>Scroll down to <strong>Safari Websites</strong> and set to <em>"While Using the App"</em>.</li>
                    <li>Return to this page and tap "Retry Location Access".</li>
                  </ol>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('custom_location')}
                  className="px-3.5 py-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer"
                >
                  ➕ Add Custom Location Coordinates
                </button>
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  disabled={isRequesting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                  <span>{isRequesting ? 'Testing...' : '🔄 Retry Location Access'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Encrypted HTML5 Geolocation API & Custom Coordinates</span>
          </span>
          <span className="font-mono">W3C Standard</span>
        </div>
      </div>
    </div>
  );
};
