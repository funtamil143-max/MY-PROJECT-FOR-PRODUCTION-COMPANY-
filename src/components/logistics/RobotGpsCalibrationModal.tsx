import React, { useState } from 'react';
import { Bot, Radio, CheckCircle2, AlertCircle, X, RefreshCw, Satellite, ShieldCheck } from 'lucide-react';
import { captureRobotPrecisionGps, RobotGpsResult, RobotGpsConfig, DEFAULT_ROBOT_GPS_CONFIG } from '../../utils/robotGps';

interface RobotGpsCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RobotGpsConfig;
  onApplyCoords?: (coords: { lat: number; lng: number; accuracy: number; thetaBearing?: number }) => void;
}

export const RobotGpsCalibrationModal: React.FC<RobotGpsCalibrationModalProps> = ({
  isOpen,
  onClose,
  config,
  onApplyCoords,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RobotGpsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<{
    samplesCollected: number;
    targetSamples: number;
    currentAccuracy: number;
    bestAccuracy: number;
    stageText: string;
  }>({
    samplesCollected: 0,
    targetSamples: config.sampleCount || 5,
    currentAccuracy: 0,
    bestAccuracy: 0,
    stageText: 'Ready to Calibrate',
  });

  if (!isOpen) return null;

  const runCalibration = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await captureRobotPrecisionGps(config, (status) => {
        setProgressStatus(status);
      });
      setResult(res);
    } catch (e: any) {
      setErrorMsg(e.message || 'GPS Calibration Failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full text-white shadow-2xl shadow-cyan-950/70 overflow-hidden my-4">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 flex justify-between items-center border-b border-cyan-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-cyan-200">Robot GPS Calibration & Diagnostics</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Hardware Test
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Measure live satellite fix precision, multi-sample variance, and centroid accuracy
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

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Display Card */}
          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            {isRunning ? (
              <div className="space-y-3 py-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <div className="absolute inset-3 rounded-full border border-cyan-500/30 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">{progressStatus.stageText}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Collecting Fix {progressStatus.samplesCollected} of {progressStatus.targetSamples}
                  </p>
                </div>
                {progressStatus.currentAccuracy > 0 && (
                  <div className="inline-block px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 font-mono text-xs font-bold">
                    Current Reading: ±{progressStatus.currentAccuracy}m
                  </div>
                )}
              </div>
            ) : result ? (
              <div className="space-y-3 py-2 w-full text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Robot Centroid Lock Acquired</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    {result.fixQuality}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Centroid Latitude</span>
                    <span className="text-sm font-black text-cyan-300">{result.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Centroid Longitude</span>
                    <span className="text-sm font-black text-cyan-300">{result.longitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Final Accuracy</span>
                    <span className="text-sm font-black text-emerald-400">±{result.accuracyMeters}m</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Theta (θ) Bearing</span>
                    <span className="text-sm font-black text-amber-300">
                      {result.thetaDegrees !== undefined ? `${result.thetaDegrees}° (${result.thetaCompass || 'N'})` : '0° (N)'}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">HDOP / Satellite Lock</span>
                    <span className="text-sm font-black text-slate-200">
                      {result.hdopEstimate} ({result.satellitesEstimated} sats locked)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Samples Filtered & Averaged:</span>
                    <span className="font-mono text-cyan-300 font-bold">{result.sampleCount} GPS Fixes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Multipath Outliers Discarded:</span>
                    <span className="font-mono text-emerald-400 font-bold">Yes (Weighted Centroid)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <Bot className="w-10 h-10 text-cyan-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Test Device Robot GPS Lock
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Takes {config.sampleCount} consecutive GNSS fixes with zero-delay hardware caching and computes the weighted centroid coordinate.
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={runCalibration}
              disabled={isRunning}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Calibrating Sensors...' : result ? 'Re-Run Sensor Calibration' : '🤖 Start Robot GPS Test'}</span>
            </button>

            {result && onApplyCoords && (
              <button
                type="button"
                onClick={() => {
                  onApplyCoords({
                    lat: result.latitude,
                    lng: result.longitude,
                    accuracy: result.accuracyMeters,
                    thetaBearing: result.thetaDegrees,
                  });
                  onClose();
                }}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Use These Coords
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Strict Sub-5m Tolerance Configured</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
