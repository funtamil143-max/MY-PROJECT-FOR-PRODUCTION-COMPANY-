import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Search,
  Sparkles,
  X,
  Plus,
  Compass,
  Store,
  Warehouse,
  Truck,
  Building2,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface GroundedPlace {
  title: string;
  uri: string;
  address?: string;
  reviewSnippets?: string[];
}

export interface GroundedLink {
  title: string;
  uri: string;
  type: 'maps' | 'web';
}

interface MapsGroundingExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat?: number;
  currentLng?: number;
  defaultLocationName?: string;
  onAddStoreFromPlace?: (place: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    mapsUrl?: string;
  }) => void;
}

const PRESET_QUERIES = [
  {
    id: 'retail_groceries',
    label: 'Retail & Grocery Stores',
    icon: Store,
    prompt: 'Find popular local grocery stores, provision shops (maligai kadai), and retail supermarkets in this neighborhood for snack distribution.',
  },
  {
    id: 'bakeries_teastalls',
    label: 'Bakeries & Tea Stalls',
    icon: Compass,
    prompt: 'Find high-footfall bakeries, tea stalls, and snack counters near this location that buy bulk savory snacks.',
  },
  {
    id: 'wholesale_mandis',
    label: 'Wholesale Mandis & Grains',
    icon: Warehouse,
    prompt: 'Find wholesale grain markets, pulse (dal) traders, and edible oil dealers near this area for bulk snack ingredient procurement.',
  },
  {
    id: 'logistics_depots',
    label: 'Parcel & Logistics Hubs',
    icon: Truck,
    prompt: 'Find major transport parcel services, lorry booking offices, and logistics godowns near this area for dispatching snack shipments.',
  },
];

export const MapsGroundingExplorerModal: React.FC<MapsGroundingExplorerModalProps> = ({
  isOpen,
  onClose,
  currentLat = 13.0827,
  currentLng = 80.2707,
  defaultLocationName = 'Current Location',
  onAddStoreFromPlace,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [lat, setLat] = useState(currentLat);
  const [lng, setLng] = useState(currentLng);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [places, setPlaces] = useState<GroundedPlace[]>([]);
  const [links, setLinks] = useState<GroundedLink[]>([]);
  const [addedPlaces, setAddedPlaces] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleExecuteQuery = async (customPrompt?: string) => {
    const activePrompt = customPrompt || promptInput;
    if (!activePrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResultText(null);
    setPlaces([]);
    setLinks([]);

    try {
      const response = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activePrompt,
          latitude: lat,
          longitude: lng,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Google Maps grounded data');
      }

      setResultText(data.text || 'No description returned.');
      setPlaces(data.places || []);
      setLinks(data.links || []);
    } catch (err: any) {
      console.error('Maps grounding error:', err);
      setError(err.message || 'Error connecting to Google Maps grounding service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsStore = (place: GroundedPlace) => {
    if (onAddStoreFromPlace) {
      onAddStoreFromPlace({
        name: place.title,
        address: place.address || place.title,
        lat: lat,
        lng: lng,
        mapsUrl: place.uri,
      });
      setAddedPlaces(prev => ({ ...prev, [place.title]: true }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <MapPin className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  Google Maps Grounding
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  gemini-2.5-flash
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Live Google Maps place data, reviews, verified coordinates & links near{' '}
                <span className="text-white font-medium">{defaultLocationName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Coordinates Bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Grounding Target Coordinates:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLat(currentLat);
                  setLng(currentLng);
                }}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
              >
                Reset to Current Position
              </button>
            </div>
          </div>

          {/* Quick Preset Queries */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Discovery Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_QUERIES.map(q => {
                const IconComponent = q.icon;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setPromptInput(q.prompt);
                      handleExecuteQuery(q.prompt);
                    }}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/50 transition-all text-left flex items-start gap-2.5 cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-950">
                        {q.label}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1 block">
                        {q.prompt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Search Query Bar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Or Ask Google Maps Grounding Anything About This Area:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
                  placeholder="e.g. Find wholesale chili powder & peanut oil suppliers within 5km..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleExecuteQuery()}
                disabled={isLoading || !promptInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Maps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Query Maps</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Area */}
          {resultText && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Synthesized Response */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Google Maps Grounded Analysis</span>
                </div>
                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {resultText}
                </div>
              </div>

              {/* Verified Google Maps Places Cards */}
              {places.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Verified Google Maps Places ({places.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Live Places & Review Snippets</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {places.map((place, idx) => {
                      const isAdded = addedPlaces[place.title];
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5 mb-1">
                              <span className="text-xs font-bold text-slate-900 line-clamp-1">
                                {place.title}
                              </span>
                              {place.uri && (
                                <a
                                  href={place.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 p-0.5 shrink-0"
                                  title="Open in Google Maps"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            {place.address && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 mb-1.5">
                                {place.address}
                              </p>
                            )}
                            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[10px] text-slate-600 italic line-clamp-2">
                                &quot;{place.reviewSnippets[0]}&quot;
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {place.uri ? (
                              <a
                                href={place.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                              >
                                <span>Maps Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">No URL</span>
                            )}

                            {onAddStoreFromPlace && (
                              <button
                                type="button"
                                onClick={() => handleAddAsStore(place)}
                                disabled={isAdded}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                  isAdded
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Added to Route</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Add as Stop</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Grounding Links */}
              {links.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Verified Google Maps & Web Sources:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 rounded-lg text-xs font-medium text-slate-800 transition-colors shadow-2xs"
                      >
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        <span className="truncate max-w-[220px]">{link.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Powered by Gemini 2.5 Flash with Google Maps Grounding tool.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
