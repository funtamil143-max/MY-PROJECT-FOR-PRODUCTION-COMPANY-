import React from 'react';
import { Bot, Radio, CheckCircle2, X, AlertCircle } from 'lucide-react';

export interface RobotGpsProgressState {
  active: boolean;
  stageText: string;
  currentAccuracy: number;
  bestAccuracy: number;
  samplesCollected: number;
  targetSamples: number;
  isLocked: boolean;
  targetTitle: string;
  thetaDegrees?: number;
}

interface RobotGpsHUDProps {
  progress: RobotGpsProgressState | null;
  onCancel?: () => void;
}

export const RobotGpsHUD: React.FC<RobotGpsHUDProps> = ({ progress, onCancel }) => {
  if (!progress || !progress.active) return null;

  const pct = Math.min(100, Math.round((progress.samplesCollected / Math.max(1, progress.targetSamples)) * 100));
  const isHighPrecision = progress.bestAccuracy > 0 && progress.bestAccuracy <= 5;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl shadow-cyan-950/60 relative overflow-hidden">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-inner">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">
                  Robot GPS Precision Lock
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                  RTK Filter
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Target: {progress.targetTitle}</p>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
              title="Cancel GPS Sync"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Radar Scanning Visualizer */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-slate-950/60 shadow-inner">
            {/* Circular Grid Rings */}
            <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
            <div className="absolute inset-8 rounded-full border border-cyan-500/25" />
            <div className="absolute inset-14 rounded-full border border-cyan-500/30" />

            {/* Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-cyan-500/20" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-full w-[1px] bg-cyan-500/20" />
            </div>

            {/* Rotating Radar Sweep */}
            <div className="absolute inset-0 rounded-full border border-transparent border-t-cyan-400 animate-spin" style={{ animationDuration: '1.4s' }} />

            {/* Central Target Reticle */}
            <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              progress.isLocked
                ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/40 scale-110'
                : 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
            }`}>
              {progress.isLocked ? (
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              ) : (
                <Radio className="w-6 h-6 animate-pulse" />
              )}
            </div>
          </div>

          {/* Real-time Precision Metric */}
          <div className="mt-4 text-center flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimated Error:</span>
              <span className={`text-xs font-black font-mono ${
                isHighPrecision ? 'text-emerald-400' : progress.bestAccuracy <= 10 ? 'text-cyan-400' : 'text-amber-400'
              }`}>
                {progress.bestAccuracy > 0 ? `±${progress.bestAccuracy}m` : 'Scanning...'}
              </span>
              {isHighPrecision && (
                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-1 rounded">
                  Robot Grade
                </span>
              )}
            </div>

            {progress.thetaDegrees !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                <span className="text-[10px] font-mono font-bold uppercase">θ (Theta):</span>
                <span className="text-xs font-black font-mono text-cyan-200">{progress.thetaDegrees}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>{progress.stageText}</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">
              {progress.samplesCollected} / {progress.targetSamples} Samples
            </span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.isLocked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-400'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-sm shadow-cyan-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-satellite weighted centroid filter</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
