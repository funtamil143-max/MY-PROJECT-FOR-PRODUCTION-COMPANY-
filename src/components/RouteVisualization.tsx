import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SaleEntry, Recipe, CompanyInvoiceSettings, UserRole, SalesVisitRecord, VisitBillingStatus, UnsoldReason } from '../types';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  User, 
  ExternalLink, 
  ArrowRight, 
  ShieldAlert, 
  Info, 
  Layers, 
  Compass, 
  Store, 
  Clock, 
  TrendingUp, 
  Receipt, 
  Check, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Printer, 
  Download, 
  FileText, 
  CheckSquare, 
  Eye, 
  Loader2, 
  X, 
  Building2, 
  FileCheck, 
  Settings, 
  Plus, 
  XCircle, 
  Target, 
  Phone, 
  Sliders 
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyANDm0U0zxohA_nF7QMm12uHZhK32XRvok';

export interface RouteVisualizationProps {
  salesEntries: SaleEntry[];
  companySettings: CompanyInvoiceSettings;
  currentUserRole?: UserRole;
  onSelectInvoice?: (sale: SaleEntry) => void;
  onAddSampleRouteData?: () => void;
  recipes?: Recipe[];
  onAddSale?: (sale: Omit<SaleEntry, 'id'>) => void;
}

export interface ParsedRouteStop {
  id: string;
  sequenceNumber: number;
  sale?: SaleEntry;
  visitRecord?: SalesVisitRecord;
  visitStatus: VisitBillingStatus; // 'billed' | 'unsold' | 'approaching'
  unsoldReason?: UnsoldReason;
  unsoldNotes?: string;
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  invoiceNumber?: string;
  totalAmount: number;
  timeString: string;
  timestampMs: number;
  hasDeviceGps: boolean;
  distanceFromPrevKm: number;
  travelMinutesEstimate: number;
  dwellMinutesEstimate: number;
  isDeviation: boolean;
  deviationReason?: string;
  deviationType?: 'distance' | 'backtrack' | 'time_gap' | 'no_gps';
  shopCategory?: string;
  phone?: string;
  ownerName?: string;
}

// Fallback depot (e.g. factory location from company settings or Madurai Central)
const DEFAULT_DEPOT = {
  name: 'Central Factory & Snack Depot',
  latitude: 9.92520,
  longitude: 78.11980,
  address: 'Plot 12, Industrial Estate, Madurai'
};

// Calculate Haversine distance in Kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// Calculate bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Source: Google Maps Platform Code Assist
function GoogleMapController({ onMapLoad }: { onMapLoad: (map: google.maps.Map | null) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapLoad(map);
    return () => {
      onMapLoad(null);
    };
  }, [map, onMapLoad]);
  return null;
}

// Source: Google Maps Platform Code Assist
function GoogleMapBoundsController({
  routeStops,
  playbackStep,
  highlightedStopId,
  depot,
}: {
  routeStops: ParsedRouteStop[];
  playbackStep: number;
  highlightedStopId: string | null;
  depot: { latitude: number; longitude: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (routeStops.length === 0) {
      map.setCenter({ lat: depot.latitude, lng: depot.longitude });
      map.setZoom(13);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: depot.latitude, lng: depot.longitude });
    routeStops.forEach(stop => {
      bounds.extend({ lat: stop.latitude, lng: stop.longitude });
    });

    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, routeStops, depot]);

  useEffect(() => {
    if (!map) return;
    if (playbackStep >= 0 && playbackStep < routeStops.length) {
      const stop = routeStops[playbackStep];
      map.panTo({ lat: stop.latitude, lng: stop.longitude });
      map.setZoom(16);
    } else if (highlightedStopId) {
      const stop = routeStops.find(s => s.id === highlightedStopId);
      if (stop) {
        map.panTo({ lat: stop.latitude, lng: stop.longitude });
      }
    }
  }, [map, playbackStep, highlightedStopId, routeStops]);

  return null;
}

// Source: Google Maps Platform Code Assist
function GoogleMapPolylinesAndGeofence({
  routeStops,
  depot,
  showPolylines,
  highlightedStopId,
  geofenceRadius,
}: {
  routeStops: ParsedRouteStop[];
  depot: { latitude: number; longitude: number };
  showPolylines: boolean;
  highlightedStopId: string | null;
  geofenceRadius: number;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const deviationPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    deviationPolylinesRef.current.forEach(p => p.setMap(null));
    deviationPolylinesRef.current = [];

    if (!showPolylines || routeStops.length === 0) return;

    const path = [
      { lat: depot.latitude, lng: depot.longitude },
      ...routeStops.map(s => ({ lat: s.latitude, lng: s.longitude })),
    ];

    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeColor: '#312e81',
      fillColor: '#818cf8',
      fillOpacity: 1,
      strokeWeight: 1,
    };

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#4f46e5',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      icons: [
        {
          icon: arrowSymbol,
          offset: '30px',
          repeat: '90px',
        },
      ],
      map,
    });
    polylineRef.current = polyline;

    for (let i = 0; i < routeStops.length; i++) {
      const stop = routeStops[i];
      if (stop.isDeviation) {
        const fromCoord = i === 0
          ? { lat: depot.latitude, lng: depot.longitude }
          : { lat: routeStops[i - 1].latitude, lng: routeStops[i - 1].longitude };
        const toCoord = { lat: stop.latitude, lng: stop.longitude };

        const devLine = new google.maps.Polyline({
          path: [fromCoord, toCoord],
          strokeColor: '#e11d48',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map,
        });
        deviationPolylinesRef.current.push(devLine);
      }
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      deviationPolylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [map, routeStops, depot, showPolylines]);

  useEffect(() => {
    if (!map) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (highlightedStopId) {
      const active = routeStops.find(s => s.id === highlightedStopId);
      if (active) {
        circleRef.current = new google.maps.Circle({
          strokeColor: '#6366f1',
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: '#818cf8',
          fillOpacity: 0.18,
          map,
          center: { lat: active.latitude, lng: active.longitude },
          radius: geofenceRadius,
        });
      }
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, highlightedStopId, routeStops, geofenceRadius]);

  return null;
}

export default function RouteVisualization({
  salesEntries,
  companySettings,
  currentUserRole,
  onSelectInvoice,
  onAddSampleRouteData,
  recipes,
  onAddSale,
}: RouteVisualizationProps) {
  // Filters & State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Pick the most recent sale date or today
    if (salesEntries.length > 0) {
      const dates = salesEntries.map(s => s.date).sort().reverse();
      return dates[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const [selectedDeviationFilter, setSelectedDeviationFilter] = useState<'all' | 'deviations_only' | 'sequential_only'>('all');
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);

  // Dynamic Visits & Leads State (persistent)
  const [visits, setVisits] = useState<SalesVisitRecord[]>(() => {
    const saved = localStorage.getItem('snack_sales_visits');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'visit_unsold_1',
        shopName: 'Kannan Tea & Snacks Stall',
        ownerName: 'P. Kannan',
        phone: '+91 98421 55667',
        address: '52 Netaji Road, Near Periyar Bus Stand, Madurai',
        date: today,
        time: '10:45 AM',
        salesperson: 'K. Saravanan',
        status: 'unsold',
        location: {
          latitude: 9.92050,
          longitude: 78.11890,
          address: '52 Netaji Road',
          accuracyMeters: 14,
        },
        unsoldReason: 'Stock Already Full',
        unsoldNotes: 'Has 25 packets of Mixture & Murukku remaining from yesterday. Requested re-visit Friday.',
        followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        shopCategory: 'Bakery/Tea Stall',
      },
      {
        id: 'visit_prospect_1',
        shopName: 'New Velan Sweets & Daily Mart',
        ownerName: 'S. Velumani',
        phone: '+91 98421 88990',
        address: '118 Simmakkal North Veli Cross, Madurai',
        date: today,
        time: '11:45 AM',
        salesperson: 'K. Saravanan',
        status: 'approaching',
        location: {
          latitude: 9.92840,
          longitude: 78.12150,
          address: '118 Simmakkal North Veli Cross',
          accuracyMeters: 8,
        },
        isNewShopProspect: true,
        shopCategory: 'Supermarket',
        unsoldNotes: 'Approaching new opening supermarket. Owner showed high interest in sample packets.',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('snack_sales_visits', JSON.stringify(visits));
  }, [visits]);

  // Selected stop for InfoWindow in Google Maps & card highlight
  const [selectedStopForInfo, setSelectedStopForInfo] = useState<ParsedRouteStop | null>(null);
  const [googleMapInstance, setGoogleMapInstance] = useState<google.maps.Map | null>(null);

  // Map Settings Configuration State
  const [mapSettings, setMapSettings] = useState<{
    showBilled: boolean;
    showUnsold: boolean;
    showApproaching: boolean;
    geofenceRadiusMeters: number;
    showPolylines: boolean;
    mapEngine: 'google' | 'leaflet';
    googleMapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    mapTileLayer: 'standard' | 'satellite';
  }>(() => {
    const saved = localStorage.getItem('snack_map_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          mapEngine: 'google',
          googleMapType: 'roadmap',
          ...parsed,
        };
      } catch (e) { }
    }
    return {
      showBilled: true,
      showUnsold: true,
      showApproaching: true,
      geofenceRadiusMeters: 50,
      showPolylines: true,
      mapEngine: 'google',
      googleMapType: 'roadmap',
      mapTileLayer: 'standard',
    };
  });

  useEffect(() => {
    localStorage.setItem('snack_map_settings', JSON.stringify(mapSettings));
  }, [mapSettings]);

  // Modal dialog states
  const [showMapSettingsModal, setShowMapSettingsModal] = useState<boolean>(false);
  const [showNewShopModal, setShowNewShopModal] = useState<boolean>(false);
  const [showUnsoldModal, setShowUnsoldModal] = useState<boolean>(false);
  const [showBillLocationModal, setShowBillLocationModal] = useState<boolean>(false);

  // New Shop Form State
  const [newShopName, setNewShopName] = useState('');
  const [newShopCategory, setNewShopCategory] = useState<'Wholesaler' | 'Retail Shop' | 'Supermarket' | 'Bakery/Tea Stall' | 'Canteen'>('Retail Shop');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopNotes, setNewShopNotes] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [counterCoords, setCounterCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Unsold Form State
  const [unsoldShopName, setUnsoldShopName] = useState('');
  const [unsoldReason, setUnsoldReason] = useState<UnsoldReason>('Stock Already Full');
  const [unsoldNotes, setUnsoldNotes] = useState('');
  const [unsoldFollowUpDate, setUnsoldFollowUpDate] = useState('');

  // Bill Sale at Location State
  const [billShopName, setBillShopName] = useState('');
  const [billShopPhone, setBillShopPhone] = useState('');
  const [billShopAddress, setBillShopAddress] = useState('');
  const [isSyncingAddressGps, setIsSyncingAddressGps] = useState(false);
  const [isGpsAddressSyncEnabled, setIsGpsAddressSyncEnabled] = useState(true);
  const [billCustomerType, setBillCustomerType] = useState<'Wholesaler' | 'Shop/Retail'>('Shop/Retail');
  const [billLinkedVisitId, setBillLinkedVisitId] = useState<string | null>(null);
  const [billCoords, setBillCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [billPaymentMethod, setBillPaymentMethod] = useState<'Cash' | 'UPI' | 'Credit' | 'Bank Transfer' | 'Split Payment'>('UPI');
  const [billPaymentStatus, setBillPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Paid');
  const [billItems, setBillItems] = useState<Array<{ recipeId: string; name: string; quantity: number; unitPrice: number; total: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(10);
  const [selectedProductRate, setSelectedProductRate] = useState<number>(50);

  // Status Filter above Map: 'all' | 'billed' | 'unsold' | 'approaching'
  const [visitStatusFilter, setVisitStatusFilter] = useState<'all' | 'billed' | 'unsold' | 'approaching'>('all');

  // Playback Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackStep, setPlaybackStep] = useState<number>(-1);
  const playbackTimerRef = useRef<any>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);

  // Unique Dates and Salespersons for Filters
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    salesEntries.forEach(s => { if (s.date) set.add(s.date); });
    const list = Array.from(set).sort().reverse();
    return list.length > 0 ? list : [new Date().toISOString().split('T')[0]];
  }, [salesEntries]);

  const availableSalespersons = useMemo(() => {
    const set = new Set<string>();
    salesEntries.forEach(s => {
      if (s.salesPerson && s.salesPerson.trim()) {
        set.add(s.salesPerson.trim());
      }
    });
    return Array.from(set).sort();
  }, [salesEntries]);

  // Demo Fallback / Geocoding helper for entries without coordinates
  const getCoordinatesForSale = (sale: SaleEntry, index: number): { lat: number; lng: number; hasGps: boolean } => {
    if (sale.location?.latitude && sale.location?.longitude) {
      return {
        lat: sale.location.latitude,
        lng: sale.location.longitude,
        hasGps: true,
      };
    }

    // Deterministic offset generator based on customer name so demo entries plot cleanly
    const hash = (sale.customerName || 'Store').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const angle = (hash % 360) * (Math.PI / 180);
    const radiusKm = 1.2 + (index * 1.5);
    // 1 deg latitude is ~111km, longitude is ~111*cos(lat)
    const dLat = (radiusKm * Math.cos(angle)) / 111;
    const dLng = (radiusKm * Math.sin(angle)) / (111 * Math.cos((DEFAULT_DEPOT.latitude * Math.PI) / 180));

    return {
      lat: Number((DEFAULT_DEPOT.latitude + dLat).toFixed(5)),
      lng: Number((DEFAULT_DEPOT.longitude + dLng).toFixed(5)),
      hasGps: false,
    };
  };

  // Parse and order sales into chronological route stops
  // Handlers for New Shop and Unsold Visit
  const handleAddNewShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      alert('Please enter a shop name');
      return;
    }

    const today = selectedDate || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const lat = counterCoords?.lat || (DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.02);
    const lng = counterCoords?.lng || (DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.02);

    const newRecord: SalesVisitRecord = {
      id: `visit_prospect_${Date.now()}`,
      shopName: newShopName.trim(),
      ownerName: newShopOwner.trim() || undefined,
      phone: newShopPhone.trim() || undefined,
      address: newShopAddress.trim() || 'Approached Market Counter',
      date: today,
      time: nowTime,
      salesperson: selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan',
      status: 'approaching',
      location: {
        latitude: lat,
        longitude: lng,
        address: newShopAddress.trim() || 'Approached Market Counter',
        accuracyMeters: 10,
      },
      isNewShopProspect: true,
      shopCategory: newShopCategory,
      unsoldNotes: newShopNotes.trim() || undefined,
    };

    setVisits(prev => [newRecord, ...prev]);
    setShowNewShopModal(false);
    setNewShopName('');
    setNewShopOwner('');
    setNewShopPhone('');
    setNewShopAddress('');
    setNewShopNotes('');
    setCounterCoords(null);

    // Pan map to new approached shop
    if (mapSettings.mapEngine === 'google' && googleMapInstance) {
      googleMapInstance.panTo({ lat, lng });
      googleMapInstance.setZoom(16);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
    }
  };

  const handleLogUnsoldVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unsoldShopName.trim()) {
      alert('Please enter a shop name');
      return;
    }

    const today = selectedDate || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const lat = counterCoords?.lat || (DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.02);
    const lng = counterCoords?.lng || (DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.02);

    // If an approaching visit with same shop name or id exists, update its status to unsold
    setVisits(prev => {
      const matchIndex = prev.findIndex(v => v.shopName.toLowerCase() === unsoldShopName.trim().toLowerCase() && v.status === 'approaching');
      if (matchIndex >= 0) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          status: 'unsold',
          date: today,
          time: nowTime,
          unsoldReason,
          unsoldNotes: unsoldNotes.trim() || undefined,
          followUpDate: unsoldFollowUpDate || undefined,
          location: {
            ...updated[matchIndex].location,
            latitude: lat,
            longitude: lng,
          }
        };
        return updated;
      }

      const newRecord: SalesVisitRecord = {
        id: `visit_unsold_${Date.now()}`,
        shopName: unsoldShopName.trim(),
        date: today,
        time: nowTime,
        salesperson: selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan',
        status: 'unsold',
        location: {
          latitude: lat,
          longitude: lng,
          accuracyMeters: 12,
        },
        unsoldReason,
        unsoldNotes: unsoldNotes.trim() || undefined,
        followUpDate: unsoldFollowUpDate || undefined,
      };
      return [newRecord, ...prev];
    });

    setShowUnsoldModal(false);
    setUnsoldShopName('');
    setUnsoldReason('Stock Already Full');
    setUnsoldNotes('');
    setUnsoldFollowUpDate('');
    setCounterCoords(null);
  };

  const handleCaptureCurrentGps = (target: 'counter' | 'bill' = 'counter') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (target === 'bill') {
          setBillCoords(coords);
        } else {
          setCounterCoords(coords);
        }
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('GPS error, setting approximate counter pin:', err);
        const fallback = {
          lat: DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.015,
          lng: DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.015,
        };
        if (target === 'bill') {
          setBillCoords(fallback);
        } else {
          setCounterCoords(fallback);
        }
        setIsGettingGps(false);
      },
      { timeout: 7000 }
    );
  };

  // Reverse Geocoding Address from Coordinates
  const fetchAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.pedestrian || a.suburb || a.neighbourhood || a.commercial || a.industrial || a.retail;
          const locality = a.city_district || a.subdistrict || a.city || a.town || a.village || a.county;
          const parts = [road, locality].filter(Boolean);
          if (parts.length > 0) {
            return parts.join(', ');
          }
        }
        if (data.display_name) {
          const parts = data.display_name.split(',').map((s: string) => s.trim());
          return parts.slice(0, 3).join(', ');
        }
      }
    } catch (e) {
      console.warn('Reverse geocode lookup warning:', e);
    }
    return `Counter Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const handleSyncAddressWithGps = (target: 'bill' | 'counter') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsSyncingAddressGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (target === 'bill') {
          setBillCoords(coords);
        } else {
          setCounterCoords(coords);
        }

        const resolvedAddr = await fetchAddressFromCoords(coords.lat, coords.lng);
        if (target === 'bill') {
          setBillShopAddress(resolvedAddr);
        } else {
          setNewShopAddress(resolvedAddr);
        }
        setIsSyncingAddressGps(false);
      },
      async (err) => {
        console.warn('GPS error during address sync:', err);
        const fallback = target === 'bill'
          ? (billCoords || { lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude })
          : (counterCoords || { lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude });

        const resolvedAddr = await fetchAddressFromCoords(fallback.lat, fallback.lng);
        if (target === 'bill') {
          setBillShopAddress(resolvedAddr);
        } else {
          setNewShopAddress(resolvedAddr);
        }
        setIsSyncingAddressGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Catalog products for billing
  const catalogProducts = useMemo(() => {
    if (recipes && recipes.length > 0) {
      return recipes.map(r => ({
        id: r.id,
        name: r.name,
        rate: r.packagingSizes?.[0]?.mrp || r.sellingPricePerKg || 50,
      }));
    }
    return [
      { id: 'rec_1', name: 'Madurai Special Mixture (250g)', rate: 65 },
      { id: 'rec_2', name: 'Butter Murukku (200g)', rate: 55 },
      { id: 'rec_3', name: 'Kara Boondi (200g)', rate: 50 },
      { id: 'rec_4', name: 'Ribbon Pakoda (250g)', rate: 60 },
      { id: 'rec_5', name: 'Masala Peanuts (150g)', rate: 45 },
      { id: 'rec_6', name: 'Oma Podi (200g)', rate: 50 },
    ];
  }, [recipes]);

  // Open billing modal for a specific stop or fresh
  const handleOpenBillModalForStop = (stop?: ParsedRouteStop) => {
    if (stop) {
      setBillShopName(stop.storeName);
      setBillShopPhone(stop.phone || '');
      setBillShopAddress(stop.address);
      setBillCoords({ lat: stop.latitude, lng: stop.longitude });
      setBillLinkedVisitId(stop.visitRecord?.id || (stop.visitStatus !== 'billed' ? stop.id : null));
      setBillCustomerType(stop.shopCategory === 'Wholesaler' ? 'Wholesaler' : 'Shop/Retail');
    } else {
      setBillShopName('');
      setBillShopPhone('');
      setBillShopAddress('');
      setBillCoords(counterCoords || { lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude });
      setBillLinkedVisitId(null);
      setBillCustomerType('Shop/Retail');
    }

    const firstProduct = catalogProducts[0];
    setBillItems([
      {
        recipeId: firstProduct.id,
        name: firstProduct.name,
        quantity: 10,
        unitPrice: firstProduct.rate,
        total: 10 * firstProduct.rate,
      },
    ]);
    setSelectedProductId(firstProduct.id);
    setSelectedProductQty(10);
    setSelectedProductRate(firstProduct.rate);
    setBillDiscount(0);
    setBillPaymentMethod('UPI');
    setBillPaymentStatus('Paid');
    setShowBillLocationModal(true);
  };

  const handleOpenUnsoldModalForStop = (stop?: ParsedRouteStop) => {
    if (stop) {
      setUnsoldShopName(stop.storeName);
      setCounterCoords({ lat: stop.latitude, lng: stop.longitude });
      if (stop.unsoldReason) setUnsoldReason(stop.unsoldReason);
      if (stop.unsoldNotes) setUnsoldNotes(stop.unsoldNotes);
    }
    setShowUnsoldModal(true);
  };

  const handleAddProductToBill = () => {
    const prod = catalogProducts.find(p => p.id === selectedProductId) || catalogProducts[0];
    const qty = Math.max(1, selectedProductQty);
    const rate = Math.max(1, selectedProductRate);

    setBillItems(prev => [
      ...prev,
      {
        recipeId: prod.id,
        name: prod.name,
        quantity: qty,
        unitPrice: rate,
        total: qty * rate,
      }
    ]);
  };

  const handleRemoveProductFromBill = (index: number) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitBilledSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billShopName.trim()) {
      alert('Please enter a customer / store name');
      return;
    }
    if (billItems.length === 0) {
      alert('Please add at least one snack product to the bill');
      return;
    }

    const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = Math.max(0, subtotal - billDiscount);
    const today = selectedDate || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const lat = billCoords?.lat || (DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.02);
    const lng = billCoords?.lng || (DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.02);
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale: Omit<SaleEntry, 'id'> = {
      invoiceNumber: invNumber,
      customerName: billShopName.trim(),
      customerPhone: billShopPhone.trim() || undefined,
      customerAddress: billShopAddress.trim() || undefined,
      customerType: billCustomerType,
      date: today,
      time: nowTime,
      salesPerson: selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan',
      items: billItems.map((item, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        recipeId: item.recipeId,
        productName: item.name,
        quantity: item.quantity,
        unit: 'packs',
        pricePerUnit: item.unitPrice,
        total: item.total,
      })),
      totalAmount: subtotal,
      discount: billDiscount,
      taxAmount: 0,
      finalAmount,
      paymentStatus: billPaymentStatus,
      paymentMethod: billPaymentMethod,
      location: {
        latitude: lat,
        longitude: lng,
        address: billShopAddress.trim() || billShopName.trim(),
        capturedAt: new Date().toISOString(),
        accuracyMeters: 8,
      },
      deliveryLocationText: 'Billed directly at counter visit',
    };

    if (onAddSale) {
      onAddSale(newSale);
    }

    // Convert or add visit record as billed
    if (billLinkedVisitId) {
      setVisits(prev => prev.map(v => v.id === billLinkedVisitId ? {
        ...v,
        status: 'billed',
        saleAmount: finalAmount,
        invoiceNumber: invNumber,
      } : v));
    } else {
      const billedVisit: SalesVisitRecord = {
        id: `visit_billed_${Date.now()}`,
        shopName: billShopName.trim(),
        phone: billShopPhone.trim() || undefined,
        address: billShopAddress.trim() || undefined,
        date: today,
        time: nowTime,
        salesperson: selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan',
        status: 'billed',
        location: {
          latitude: lat,
          longitude: lng,
          accuracyMeters: 8,
          address: billShopAddress.trim() || billShopName.trim(),
        },
        invoiceNumber: invNumber,
        saleAmount: finalAmount,
      };
      setVisits(prev => [billedVisit, ...prev]);
    }

    setShowBillLocationModal(false);
    setBillShopName('');
    setBillShopPhone('');
    setBillShopAddress('');
    setBillItems([]);
    setBillLinkedVisitId(null);

    // Pan map to billed counter
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
    }
  };

  // Main Route & Visits Processing Memo
  const routeStops = useMemo<ParsedRouteStop[]>(() => {
    const rawStops: Array<{
      id: string;
      visitStatus: VisitBillingStatus;
      sale?: SaleEntry;
      visitRecord?: SalesVisitRecord;
      storeName: string;
      address: string;
      invoiceNumber?: string;
      totalAmount: number;
      date: string;
      timeString: string;
      timestampSortKey: string;
      salesPerson: string;
      hasGps: boolean;
      lat: number;
      lng: number;
      unsoldReason?: UnsoldReason;
      unsoldNotes?: string;
      shopCategory?: string;
      phone?: string;
      ownerName?: string;
    }> = [];

    // 1. Process Billed Sales (if mapSettings.showBilled is true)
    if (mapSettings.showBilled) {
      salesEntries.filter(s => !s.isCancelled).forEach((sale, idx) => {
        if (selectedDate && sale.date !== selectedDate) return;
        if (selectedSalesperson !== 'all' && (sale.salesPerson || '').toLowerCase() !== selectedSalesperson.toLowerCase()) return;

        const coords = getCoordinatesForSale(sale, idx);
        rawStops.push({
          id: sale.id,
          visitStatus: 'billed',
          sale,
          storeName: sale.customerName || 'Store Outlet',
          address: sale.customerAddress || sale.deliveryLocationText || 'Local Market Area',
          invoiceNumber: sale.invoiceNumber,
          totalAmount: sale.finalAmount || sale.totalAmount || 0,
          date: sale.date,
          timeString: sale.time || '10:00 AM',
          timestampSortKey: sale.location?.capturedAt || sale.time || sale.invoiceNumber,
          salesPerson: sale.salesPerson || 'Sales Executive',
          hasGps: coords.hasGps,
          lat: coords.lat,
          lng: coords.lng,
          shopCategory: sale.customerType,
          phone: sale.customerPhone,
        });
      });
    }

    // 2. Process Unsold Visits & Approaching Leads from visits state
    visits.forEach((v, idx) => {
      if (selectedDate && v.date !== selectedDate) return;
      if (selectedSalesperson !== 'all' && (v.salesperson || '').toLowerCase() !== selectedSalesperson.toLowerCase()) return;
      if (v.status === 'unsold' && !mapSettings.showUnsold) return;
      if (v.status === 'approaching' && !mapSettings.showApproaching) return;

      const hasGps = Boolean(v.location?.latitude && v.location?.longitude);
      const lat = v.location?.latitude || (DEFAULT_DEPOT.latitude + 0.005 * (idx + 1));
      const lng = v.location?.longitude || (DEFAULT_DEPOT.longitude + 0.005 * (idx + 1));

      rawStops.push({
        id: v.id,
        visitStatus: v.status,
        visitRecord: v,
        storeName: v.shopName,
        address: v.address || v.location?.address || 'Market Location',
        totalAmount: v.saleAmount || 0,
        date: v.date,
        timeString: v.time,
        timestampSortKey: v.time,
        salesPerson: v.salesperson,
        hasGps,
        lat,
        lng,
        unsoldReason: v.unsoldReason,
        unsoldNotes: v.unsoldNotes,
        shopCategory: v.shopCategory,
        phone: v.phone,
        ownerName: v.ownerName,
      });
    });

    // 3. Filter by visitStatusFilter if clicked
    let filtered = rawStops;
    if (visitStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.visitStatus === visitStatusFilter);
    }

    // 4. Sort chronologically
    filtered.sort((a, b) => a.timestampSortKey.localeCompare(b.timestampSortKey));

    const stops: ParsedRouteStop[] = [];
    let prevLat = DEFAULT_DEPOT.latitude;
    let prevLng = DEFAULT_DEPOT.longitude;
    let prevTimeMs = new Date(`${selectedDate}T09:00:00`).getTime();
    let previousBearing: number | null = null;

    filtered.forEach((item, idx) => {
      const distFromPrev = calculateDistanceKm(prevLat, prevLng, item.lat, item.lng);
      const stopTimeMs = prevTimeMs + (distFromPrev * 3 * 60 * 1000) + (18 * 60 * 1000);

      // Deviation Detection Rules
      let isDeviation = false;
      let deviationReason: string | undefined;
      let deviationType: ParsedRouteStop['deviationType'];

      if (!item.hasGps) {
        isDeviation = true;
        deviationType = 'no_gps';
        deviationReason = 'Unverified GPS: Counter coordinates not locked on device';
      } else if (distFromPrev > 5.5) {
        isDeviation = true;
        deviationType = 'distance';
        deviationReason = `Long Jump (+${distFromPrev.toFixed(1)} km detour from last stop)`;
      }

      const currentBearing = calculateBearing(prevLat, prevLng, item.lat, item.lng);
      if (previousBearing !== null && idx >= 2) {
        const bearingDiff = Math.abs(currentBearing - previousBearing);
        const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
        if (normalizedDiff > 140 && distFromPrev > 2.0) {
          isDeviation = true;
          deviationType = 'backtrack';
          deviationReason = `Route Backtrack (${normalizedDiff.toFixed(0)}° reversal heading)`;
        }
      }

      stops.push({
        id: item.id,
        sequenceNumber: idx + 1,
        sale: item.sale,
        visitRecord: item.visitRecord,
        visitStatus: item.visitStatus,
        unsoldReason: item.unsoldReason,
        unsoldNotes: item.unsoldNotes,
        storeName: item.storeName,
        address: item.address,
        latitude: item.lat,
        longitude: item.lng,
        invoiceNumber: item.invoiceNumber,
        totalAmount: item.totalAmount,
        timeString: item.timeString,
        timestampMs: stopTimeMs,
        hasDeviceGps: item.hasGps,
        distanceFromPrevKm: distFromPrev,
        travelMinutesEstimate: Math.max(5, Math.round(distFromPrev * 3.2)),
        dwellMinutesEstimate: 18,
        isDeviation,
        deviationReason,
        deviationType,
        shopCategory: item.shopCategory,
        phone: item.phone,
        ownerName: item.ownerName,
      });

      prevLat = item.lat;
      prevLng = item.lng;
      prevTimeMs = stopTimeMs;
      previousBearing = currentBearing;
    });

    return stops;
  }, [salesEntries, visits, selectedDate, selectedSalesperson, mapSettings, visitStatusFilter]);

  // Filter stops based on deviation tab
  const displayStops = useMemo(() => {
    if (selectedDeviationFilter === 'deviations_only') {
      return routeStops.filter(s => s.isDeviation);
    }
    if (selectedDeviationFilter === 'sequential_only') {
      return routeStops.filter(s => !s.isDeviation);
    }
    return routeStops;
  }, [routeStops, selectedDeviationFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalStops = routeStops.length;
    const billedStops = routeStops.filter(s => s.visitStatus === 'billed').length;
    const unsoldStops = routeStops.filter(s => s.visitStatus === 'unsold').length;
    const approachingStops = routeStops.filter(s => s.visitStatus === 'approaching').length;
    const totalSales = routeStops.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalDistanceKm = routeStops.reduce((sum, s) => sum + s.distanceFromPrevKm, 0);
    const deviationCount = routeStops.filter(s => s.isDeviation).length;
    const adherenceScore = totalStops > 0 ? Math.round(((totalStops - deviationCount) / totalStops) * 100) : 100;
    const verifiedGpsCount = routeStops.filter(s => s.hasDeviceGps).length;
    const conversionRate = (billedStops + unsoldStops) > 0 ? Math.round((billedStops / (billedStops + unsoldStops)) * 100) : 0;

    return {
      totalStops,
      billedStops,
      unsoldStops,
      approachingStops,
      totalSales,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      deviationCount,
      adherenceScore,
      verifiedGpsCount,
      conversionRate,
    };
  }, [routeStops]);

  // Google Maps Multi-Stop Route URL
  const googleMapsRouteUrl = useMemo(() => {
    if (routeStops.length === 0) return '';
    const origin = `${DEFAULT_DEPOT.latitude},${DEFAULT_DEPOT.longitude}`;
    const destination = `${routeStops[routeStops.length - 1].latitude},${routeStops[routeStops.length - 1].longitude}`;
    const waypoints = routeStops
      .slice(0, -1)
      .map(s => `${s.latitude},${s.longitude}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
  }, [routeStops]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude],
        zoom: 13,
        zoomControl: true,
      });

      const isSatellite = mapSettings.mapTileLayer === 'satellite';
      tileLayerRef.current = L.tileLayer(
        isSatellite
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: isSatellite
            ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      polylineLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Dynamically swap map tile layer (Standard vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const isSatellite = mapSettings.mapTileLayer === 'satellite';
    tileLayerRef.current = L.tileLayer(
      isSatellite
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: isSatellite
          ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);
  }, [mapSettings.mapTileLayer]);

  // Update Markers & Polylines whenever route stops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const polylineGroup = polylineLayerRef.current;
    if (!map || !markersGroup || !polylineGroup) return;

    markersGroup.clearLayers();
    polylineGroup.clearLayers();

    if (routeStops.length === 0) {
      // Show Depot Marker only
      const depotIcon = L.divIcon({
        className: 'custom-depot-pin',
        html: `
          <div style="background-color: #1e1b4b; color: white; border: 2px solid #818cf8; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            🏭
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const depotMarker = L.marker([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude], { icon: depotIcon });
      depotMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong style="color: #1e1b4b; font-size: 13px;">${DEFAULT_DEPOT.name}</strong><br/>
          <span style="color: #64748b;">${DEFAULT_DEPOT.address}</span><br/>
          <span style="color: #059669; font-weight: bold; margin-top: 4px; display: inline-block;">Starting Dispatch Hub</span>
        </div>
      `);
      markersGroup.addLayer(depotMarker);
      map.setView([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude], 13);
      return;
    }

    const latLngs: L.LatLngTuple[] = [];

    // Add Depot as Start
    latLngs.push([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude]);
    const depotIcon = L.divIcon({
      className: 'custom-depot-pin',
      html: `
        <div style="background-color: #0f172a; color: #38bdf8; border: 2px solid #38bdf8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(15,23,42,0.4);">
          🏭
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const depotMarker = L.marker([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude], { icon: depotIcon });
    depotMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
        <strong style="color: #0f172a; font-size: 13px;">${DEFAULT_DEPOT.name}</strong><br/>
        <span style="color: #64748b;">${DEFAULT_DEPOT.address}</span><br/>
        <span style="color: #0284c7; font-weight: bold; margin-top: 4px; display: inline-block;">Route Dispatch Hub (09:00 AM)</span>
      </div>
    `);
    markersGroup.addLayer(depotMarker);

    // Add Route Stops
    routeStops.forEach((stop, index) => {
      latLngs.push([stop.latitude, stop.longitude]);

      const isCurrentPlayback = playbackStep === index;
      const isSelected = highlightedStopId === stop.id;

      // Color coding & icon:
      // Billed: Emerald (#059669)
      // Unsold: Amber (#d97706)
      // Approaching: Royal Blue (#2563eb)
      let bgColor = '#059669';
      let borderColor = '#a7f3d0';
      let iconSymbol = `${stop.sequenceNumber}`;

      if (stop.visitStatus === 'billed') {
        bgColor = stop.isDeviation ? '#be123c' : '#059669';
        borderColor = stop.isDeviation ? '#fecdd3' : '#a7f3d0';
        iconSymbol = `₹`;
      } else if (stop.visitStatus === 'unsold') {
        bgColor = '#d97706';
        borderColor = '#fde68a';
        iconSymbol = `✕`;
      } else if (stop.visitStatus === 'approaching') {
        bgColor = '#2563eb';
        borderColor = '#bfdbfe';
        iconSymbol = `🏪`;
      }

      if (isCurrentPlayback || isSelected) {
        bgColor = '#4f46e5';
        borderColor = '#c7d2fe';
      }

      const markerHtml = `
        <div style="
          position: relative;
          background-color: ${bgColor};
          color: white;
          border: 2px solid ${borderColor};
          width: ${isCurrentPlayback || isSelected ? '38px' : '32px'};
          height: ${isCurrentPlayback || isSelected ? '38px' : '32px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: ${stop.visitStatus === 'billed' ? '13px' : '11px'};
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          transition: all 0.2s ease;
        ">
          ${iconSymbol}
          ${stop.visitStatus === 'approaching' ? `
            <span style="
              position: absolute;
              inset: -4px;
              border-radius: 50%;
              border: 2px solid #3b82f6;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              opacity: 0.75;
            "></span>
          ` : ''}
          ${stop.isDeviation ? `
            <span style="
              position: absolute;
              top: -4px;
              right: -4px;
              background-color: #f59e0b;
              color: white;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              border: 1.5px solid white;
            ">!</span>
          ` : ''}
        </div>
      `;

      const stopIcon = L.divIcon({
        className: `custom-stop-pin-${stop.id}`,
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon });

      const statusBadge = stop.visitStatus === 'billed'
        ? `<span style="background-color: #ecfdf5; color: #047857; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">🟢 Billed Sale</span>`
        : stop.visitStatus === 'unsold'
        ? `<span style="background-color: #fffbeb; color: #b45309; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">🟠 Unsold Visit</span>`
        : `<span style="background-color: #eff6ff; color: #1d4ed8; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">🔵 Approaching New Shop</span>`;

      const detailsHtml = stop.visitStatus === 'billed' ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="color: #64748b;">Invoice Total:</span>
            <strong style="color: #0f172a;">₹${stop.totalAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
            <span style="color: #64748b;">Invoice Ref:</span>
            <span style="color: #4338ca; font-weight: bold;">${stop.invoiceNumber || 'INV'}</span>
          </div>
        </div>
      ` : stop.visitStatus === 'unsold' ? `
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
          <div style="font-size: 11px; font-weight: bold; color: #92400e;">Reason: ${stop.unsoldReason || 'No Sale'}</div>
          ${stop.unsoldNotes ? `<div style="font-size: 10px; color: #78350f; margin-top: 2px;">"${stop.unsoldNotes}"</div>` : ''}
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Counter visited, 0 billed sales</div>
        </div>
      ` : `
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
          <div style="font-size: 11px; font-weight: bold; color: #1e40af;">Category: ${stop.shopCategory || 'Retail Outlet'}</div>
          ${stop.phone ? `<div style="font-size: 10px; color: #1e3a8a; margin-top: 2px;">Contact: ${stop.phone}</div>` : ''}
          <div style="font-size: 10px; color: #2563eb; font-weight: bold; margin-top: 4px;">New Counter Approached</div>
        </div>
      `;

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 220px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            ${statusBadge}
            <span style="font-weight: bold; color: #64748b; font-size: 11px;">#${stop.sequenceNumber} • ${stop.timeString}</span>
          </div>

          <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #0f172a;">${stop.storeName}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${stop.address}</p>

          ${detailsHtml}

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 6px;">
            <span>Distance: +${stop.distanceFromPrevKm.toFixed(1)} km</span>
            <span>GPS: ${stop.hasDeviceGps ? 'Device Locked' : 'Approximate'}</span>
          </div>

          ${stop.isDeviation ? `
            <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 4px; padding: 4px; margin-bottom: 6px; font-size: 10px; color: #e11d48; font-weight: bold;">
              ⚠️ ${stop.deviationReason}
            </div>
          ` : ''}

          <div style="display: flex; gap: 4px; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            ${stop.visitStatus === 'approaching' ? `
              <button class="popup-btn-bill" style="flex: 1; padding: 4px 6px; background-color: #059669; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                🧾 Bill Sale
              </button>
              <button class="popup-btn-unsold" style="flex: 1; padding: 4px 6px; background-color: #d97706; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                ✕ Unsold
              </button>
            ` : stop.visitStatus === 'unsold' ? `
              <button class="popup-btn-bill" style="flex: 1; padding: 4px 6px; background-color: #059669; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                🧾 Re-attempt Bill
              </button>
            ` : `
              ${stop.sale && onSelectInvoice ? `
                <button class="popup-btn-view" style="flex: 1; padding: 4px 6px; background-color: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  📄 Invoice
                </button>
              ` : ''}
            `}
            <a href="https://maps.google.com/?q=${stop.latitude},${stop.longitude}" target="_blank" rel="noopener noreferrer" style="padding: 4px 6px; background-color: #f1f5f9; color: #475569; border-radius: 6px; font-size: 10px; font-weight: bold; text-decoration: none; display: flex; align-items: center;">
              Maps ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setHighlightedStopId(stop.id);
      });
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement();
        if (popupEl) {
          popupEl.querySelector('.popup-btn-bill')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleOpenBillModalForStop(stop);
          });
          popupEl.querySelector('.popup-btn-unsold')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleOpenUnsoldModalForStop(stop);
          });
          popupEl.querySelector('.popup-btn-view')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (stop.sale && onSelectInvoice) {
              onSelectInvoice(stop.sale);
            }
          });
        }
      });

      markersGroup.addLayer(marker);
    });

    // Draw Geofence circle on highlighted stop
    if (geofenceCircleRef.current) {
      map.removeLayer(geofenceCircleRef.current);
      geofenceCircleRef.current = null;
    }

    if (highlightedStopId) {
      const active = routeStops.find(s => s.id === highlightedStopId);
      if (active) {
        geofenceCircleRef.current = L.circle([active.latitude, active.longitude], {
          radius: mapSettings.geofenceRadiusMeters,
          color: '#6366f1',
          fillColor: '#818cf8',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(map);
      }
    }

    // Draw Polyline Route if enabled in mapSettings
    if (mapSettings.showPolylines && latLngs.length > 1) {
      const mainPolyline = L.polyline(latLngs, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.85,
        dashArray: undefined,
      });
      polylineGroup.addLayer(mainPolyline);

      for (let i = 0; i < routeStops.length; i++) {
        const stop = routeStops[i];
        if (stop.isDeviation) {
          const fromCoord: L.LatLngTuple = i === 0
            ? [DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude]
            : [routeStops[i - 1].latitude, routeStops[i - 1].longitude];
          const toCoord: L.LatLngTuple = [stop.latitude, stop.longitude];

          const deviationLine = L.polyline([fromCoord, toCoord], {
            color: '#e11d48',
            weight: 4.5,
            opacity: 0.9,
            dashArray: '6, 8',
          });
          polylineGroup.addLayer(deviationLine);
        }
      }
    }

    // Auto-fit bounds to include all waypoints and depot
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [routeStops, playbackStep, highlightedStopId, mapSettings]);

  // Handle Playback Simulation
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    playbackTimerRef.current = setInterval(() => {
      setPlaybackStep((prev) => {
        if (prev >= routeStops.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        const next = prev + 1;
        const targetStop = routeStops[next];
        if (targetStop) {
          setHighlightedStopId(targetStop.id);
          setSelectedStopForInfo(targetStop);
          if (mapSettings.mapEngine === 'google' && googleMapInstance) {
            googleMapInstance.panTo({ lat: targetStop.latitude, lng: targetStop.longitude });
          } else if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([targetStop.latitude, targetStop.longitude], { animate: true });
          }
        }
        return next;
      });
    }, 2400);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, routeStops, mapSettings.mapEngine, googleMapInstance]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (playbackStep >= routeStops.length - 1) {
        setPlaybackStep(0);
      }
      setIsPlaying(true);
    }
  };

  const resetPlayback = () => {
    setIsPlaying(false);
    setPlaybackStep(-1);
    setHighlightedStopId(null);
    setSelectedStopForInfo(null);
    if (mapSettings.mapEngine === 'google' && googleMapInstance && routeStops.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude });
      routeStops.forEach(s => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      googleMapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (mapInstanceRef.current && routeStops.length > 0) {
      const allCoords: L.LatLngTuple[] = [
        [DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude],
        ...routeStops.map(s => [s.latitude, s.longitude] as L.LatLngTuple)
      ];
      mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
    }
  };

  const handleSelectStop = (stop: ParsedRouteStop) => {
    setHighlightedStopId(stop.id);
    setSelectedStopForInfo(stop);
    if (mapSettings.mapEngine === 'google' && googleMapInstance) {
      googleMapInstance.panTo({ lat: stop.latitude, lng: stop.longitude });
      googleMapInstance.setZoom(16);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([stop.latitude, stop.longitude], 15, { animate: true });
    }
  };

  // PDF Export & Printing State
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const printReportRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const reportElement = printReportRef.current;
    if (!reportElement) {
      alert('Unable to locate printable report layout.');
      return;
    }

    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const safeCompany = (companySettings.companyName || 'AadiyarSnacks').replace(/[^a-zA-Z0-9]/g, '_');
      const safeSalesperson = selectedSalesperson !== 'all' ? `_${selectedSalesperson.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
      pdf.save(`${safeCompany}_DailyRouteSummary_${selectedDate}${safeSalesperson}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF automatically. You can use the Print button to save directly as PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5" id="route-visualization-module">
      
      {/* Module Header & High-Level Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Field Route Map & Deviation Verification</span>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full">
                  GPS Polyline Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Plot salesperson store visits chronologically, audit sequential travel paths, and detect route deviations.
              </p>
            </div>
          </div>
        </div>

        {/* Date, Salesperson & PDF / Print Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-600 uppercase">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-slate-800"
            />
          </div>

          {/* Salesperson Filter */}
          {availableSalespersons.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-slate-800"
              >
                <option value="all">All Salespersons</option>
                {availableSalespersons.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
          )}

          {/* Google Maps Multi-Stop Driving Route Link */}
          {googleMapsRouteUrl && (
            <a
              href={googleMapsRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open full sequential multi-stop directions in Google Maps app"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Maps</span>
            </a>
          )}

          {/* Preview Official Printable Report Button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Preview administrative daily route report"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preview Report</span>
          </button>

          {/* Print Report Button */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Print daily route report for physical filing"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export PDF Report Button */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download Daily Route Summary as PDF report for administrative records"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF Report</span>
              </>
            )}
          </button>

          {/* Sample Route Generator if entries are empty */}
          {routeStops.length === 0 && onAddSampleRouteData && (
            <button
              type="button"
              onClick={onAddSampleRouteData}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Beat</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI & Verification Score Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stores Visited</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-slate-900 font-mono">{metrics.totalStops}</span>
            <span className="text-[10px] text-slate-400">stops</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Made</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-indigo-700 font-mono">
              ₹{metrics.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Circuit Travel</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-slate-800 font-mono">{metrics.totalDistanceKm}</span>
            <span className="text-xs text-slate-500 font-bold">km</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route Adherence</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-extrabold font-mono ${metrics.adherenceScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {metrics.adherenceScore}%
            </span>
            <span className="text-[10px] text-slate-400">score</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Flagged Deviations</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-extrabold font-mono ${metrics.deviationCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {metrics.deviationCount}
            </span>
            <span className="text-[10px] text-slate-400">anomalies</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GPS Verified Pins</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              {metrics.verifiedGpsCount} / {metrics.totalStops}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Sales Visits & Map Settings Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Visit Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Visits:</span>
          
          <button
            type="button"
            onClick={() => setVisitStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              visitStatusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Visits</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">
              {metrics.totalStops}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVisitStatusFilter('billed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              visitStatusFilter === 'billed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Billed Sales</span>
            <span className="px-1.5 py-0.2 bg-emerald-700/20 rounded-full text-[10px] font-mono">
              {metrics.billedStops}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVisitStatusFilter('unsold')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              visitStatusFilter === 'unsold'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Unsold Locations</span>
            <span className="px-1.5 py-0.2 bg-amber-700/20 rounded-full text-[10px] font-mono">
              {metrics.unsoldStops}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVisitStatusFilter('approaching')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              visitStatusFilter === 'approaching'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Approaching Leads</span>
            <span className="px-1.5 py-0.2 bg-blue-700/20 rounded-full text-[10px] font-mono">
              {metrics.approachingStops}
            </span>
          </button>
        </div>

        {/* Action Buttons: Map Settings, Approach New Shop, Log Unsold Visit, Bill Sale */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowMapSettingsModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Configure Map Settings, layers, geofence, and styles"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Map Settings</span>
            {(!mapSettings.showBilled || !mapSettings.showUnsold || !mapSettings.showApproaching || mapSettings.mapTileLayer === 'satellite') && (
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            )}
          </button>

          {/* Approach New Shop Trigger */}
          <button
            type="button"
            onClick={() => {
              handleCaptureCurrentGps('counter');
              setShowNewShopModal(true);
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Mark a new shop approaching visit on map"
          >
            <Store className="w-3.5 h-3.5 text-blue-200" />
            <span>+ Approach New Shop</span>
          </button>

          {/* Mark Unsold Visit Trigger */}
          <button
            type="button"
            onClick={() => {
              handleCaptureCurrentGps('counter');
              setShowUnsoldModal(true);
            }}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Mark current location visited as unsold"
          >
            <XCircle className="w-3.5 h-3.5 text-amber-200" />
            <span>✕ Mark Unsold</span>
          </button>

          {/* Bill Sale at Location Trigger */}
          <button
            type="button"
            onClick={() => handleOpenBillModalForStop()}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Record a billed sale invoice at this location"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-200" />
            <span>🧾 Bill Sale at Location</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Interactive Map + Sequential Itinerary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Interactive Map with Google Maps & Leaflet (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Map Top Bar with Engine Selector, View Types & Playback Controls */}
          <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">Route Tracking & Polyline</span>
              {routeStops.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({routeStops.length} stops)
                </span>
              )}
            </div>

            {/* Map Engine & Mode Toggles */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Engine Switcher */}
              <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMapSettings(prev => ({ ...prev, mapEngine: 'google' }))}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    mapSettings.mapEngine === 'google'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Google Maps Platform (Official Interactive Vector Maps)"
                >
                  <span>🗺️ Google Maps</span>
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-400/20 text-emerald-300 rounded font-semibold uppercase tracking-wider">Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapSettings(prev => ({ ...prev, mapEngine: 'leaflet' }));
                    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    mapSettings.mapEngine === 'leaflet'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="OpenStreetMap via Leaflet (Offline/Fallback)"
                >
                  <span>🌐 OpenStreetMap</span>
                </button>
              </div>

              {/* Google Maps View Type Pills */}
              {mapSettings.mapEngine === 'google' && (
                <div className="hidden sm:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                  {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMapSettings(prev => ({ ...prev, googleMapType: type }))}
                      className={`px-2 py-0.5 rounded font-medium capitalize transition-colors cursor-pointer ${
                        (mapSettings.googleMapType || 'roadmap') === type
                          ? 'bg-indigo-700 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              {/* Playback Simulation Buttons */}
              {routeStops.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="Simulate salesperson moving from stop to stop"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Tour'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetPlayback}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Reset view to whole route bounds"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setShowMapSettingsModal(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Configure Map Settings, layers & geofence"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas Container */}
          <div className="relative w-full h-[560px] bg-slate-100">
            {/* 1. GOOGLE MAPS PLATFORM VIEW */}
            {mapSettings.mapEngine === 'google' && (
              <div className="w-full h-full relative">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker', 'geometry', 'routes']}>
                  <Map
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    defaultCenter={{ lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude }}
                    defaultZoom={13}
                    mapTypeId={mapSettings.googleMapType || 'roadmap'}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    zoomControl={true}
                    fullscreenControl={true}
                    streetViewControl={true}
                    mapTypeControl={false}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <GoogleMapController onMapLoad={setGoogleMapInstance} />
                    <GoogleMapBoundsController
                      routeStops={routeStops}
                      playbackStep={playbackStep}
                      highlightedStopId={highlightedStopId}
                      depot={DEFAULT_DEPOT}
                    />
                    <GoogleMapPolylinesAndGeofence
                      routeStops={routeStops}
                      depot={DEFAULT_DEPOT}
                      showPolylines={mapSettings.showPolylines}
                      highlightedStopId={highlightedStopId}
                      geofenceRadius={mapSettings.geofenceRadiusMeters}
                    />

                    {/* Central Factory Depot Marker */}
                    <AdvancedMarker
                      position={{ lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude }}
                      title={DEFAULT_DEPOT.name}
                      onClick={() => {
                        setHighlightedStopId(null);
                        setSelectedStopForInfo(null);
                      }}
                    >
                      <div className="relative group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-sky-400 text-white flex items-center justify-center text-lg shadow-xl hover:scale-110 transition-transform">
                          🏭
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-sky-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                          Central Depot
                        </div>
                      </div>
                    </AdvancedMarker>

                    {/* Route Stop Markers */}
                    {routeStops.map((stop, index) => {
                      const isCurrentPlayback = playbackStep === index;
                      const isSelected = highlightedStopId === stop.id;

                      let badgeBg = stop.visitStatus === 'billed'
                        ? stop.isDeviation ? 'bg-rose-600 border-rose-300 text-white' : 'bg-emerald-600 border-emerald-300 text-white'
                        : stop.visitStatus === 'unsold'
                        ? 'bg-amber-600 border-amber-300 text-white'
                        : 'bg-blue-600 border-blue-300 text-white';

                      if (isSelected || isCurrentPlayback) {
                        badgeBg = 'bg-indigo-600 border-indigo-200 text-white ring-4 ring-indigo-400 scale-110 shadow-2xl';
                      }

                      return (
                        <AdvancedMarker
                          key={stop.id}
                          position={{ lat: stop.latitude, lng: stop.longitude }}
                          title={`${stop.sequenceNumber}. ${stop.storeName}`}
                          onClick={() => {
                            setHighlightedStopId(stop.id);
                            setSelectedStopForInfo(stop);
                          }}
                        >
                          <div className="relative cursor-pointer group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-md border-2 transition-all ${badgeBg}`}>
                              {stop.visitStatus === 'billed' ? (
                                <span>₹{stop.sequenceNumber}</span>
                              ) : stop.visitStatus === 'unsold' ? (
                                <span>✕{stop.sequenceNumber}</span>
                              ) : (
                                <span>🏪</span>
                              )}
                            </div>

                            {/* Radar pulse for approaching prospective shops */}
                            {stop.visitStatus === 'approaching' && (
                              <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-75 pointer-events-none"></span>
                            )}

                            {/* Deviation Alert icon */}
                            {stop.isDeviation && (
                              <span className="absolute -top-1 -right-1 bg-amber-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-white shadow">
                                !
                              </span>
                            )}
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {/* Rich Interactive InfoWindow on Stop Click */}
                    {selectedStopForInfo && (
                      <InfoWindow
                        position={{ lat: selectedStopForInfo.latitude, lng: selectedStopForInfo.longitude }}
                        onCloseClick={() => setSelectedStopForInfo(null)}
                      >
                        <div className="p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              selectedStopForInfo.visitStatus === 'billed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : selectedStopForInfo.visitStatus === 'unsold'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {selectedStopForInfo.visitStatus === 'billed' ? '🟢 Billed Sale' : selectedStopForInfo.visitStatus === 'unsold' ? '🟠 Unsold Visit' : '🔵 Approaching'}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500">
                              #{selectedStopForInfo.sequenceNumber} • {selectedStopForInfo.timeString}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{selectedStopForInfo.storeName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{selectedStopForInfo.address}</p>

                          {selectedStopForInfo.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${selectedStopForInfo.phone}`} className="hover:underline">{selectedStopForInfo.phone}</a>
                            </div>
                          )}

                          {selectedStopForInfo.visitStatus === 'billed' ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 my-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Invoice Total:</span>
                                <span className="font-extrabold text-emerald-700">₹{selectedStopForInfo.totalAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Invoice Ref:</span>
                                <span className="font-mono font-bold text-indigo-600">{selectedStopForInfo.invoiceNumber || 'INV'}</span>
                              </div>
                            </div>
                          ) : selectedStopForInfo.visitStatus === 'unsold' ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 my-2 text-xs">
                              <div className="font-bold text-amber-900">Reason: {selectedStopForInfo.unsoldReason || 'No Sale'}</div>
                              {selectedStopForInfo.unsoldNotes && (
                                <div className="text-[11px] text-amber-800 mt-0.5 italic">"{selectedStopForInfo.unsoldNotes}"</div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 my-2 text-xs">
                              <div className="font-bold text-blue-900">Category: {selectedStopForInfo.shopCategory || 'Retail Outlet'}</div>
                              {selectedStopForInfo.unsoldNotes && (
                                <div className="text-[11px] text-blue-800 mt-0.5">{selectedStopForInfo.unsoldNotes}</div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span>Leg: +{selectedStopForInfo.distanceFromPrevKm.toFixed(1)} km</span>
                            <span>GPS: {selectedStopForInfo.hasDeviceGps ? '📍 Device Locked' : 'Approximate'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                            {selectedStopForInfo.visitStatus === 'approaching' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenBillModalForStop(selectedStopForInfo);
                                    setSelectedStopForInfo(null);
                                  }}
                                  className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  🧾 Bill Sale
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenUnsoldModalForStop(selectedStopForInfo);
                                    setSelectedStopForInfo(null);
                                  }}
                                  className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  ✕ Unsold
                                </button>
                              </>
                            ) : selectedStopForInfo.visitStatus === 'unsold' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenBillModalForStop(selectedStopForInfo);
                                  setSelectedStopForInfo(null);
                                }}
                                className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                              >
                                🧾 Re-bill
                              </button>
                            ) : (
                              selectedStopForInfo.sale && onSelectInvoice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectInvoice(selectedStopForInfo.sale!);
                                    setSelectedStopForInfo(null);
                                  }}
                                  className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  📄 Invoice
                                </button>
                              )
                            )}
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStopForInfo.latitude},${selectedStopForInfo.longitude}&travelmode=driving`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Open Directions in Google Maps"
                            >
                              <span>Nav</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </APIProvider>
              </div>
            )}

            {/* 2. LEAFLET OPENSTREETMAP VIEW */}
            <div className={`w-full h-full ${mapSettings.mapEngine === 'leaflet' ? 'block' : 'hidden'}`}>
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>

            {/* Empty State Overlay */}
            {routeStops.length === 0 && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">No Sales Invoices Found on {selectedDate}</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Select a date when sales were billed, or save a new sale invoice with GPS location in the Sales tab to plot the route.
                  </p>
                </div>
                {onAddSampleRouteData && (
                  <button
                    type="button"
                    onClick={onAddSampleRouteData}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Sample Sales Beat Route</span>
                  </button>
                )}
              </div>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-md z-10 text-[11px] space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-900 border border-sky-400"></span>
                <span className="font-semibold text-slate-700">Dispatch Depot (Start)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-300"></span>
                <span className="font-semibold text-slate-700">Sequential Verified Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-300"></span>
                <span className="font-semibold text-slate-700">Route Deviation / Long Jump</span>
              </div>
            </div>
          </div>

          {/* Map Footer Route Summary Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span><strong>Directional Polyline:</strong> Powered by {mapSettings.mapEngine === 'google' ? 'Google Maps Platform' : 'OpenStreetMap'}. Chronologically connected stops.</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Center: {DEFAULT_DEPOT.name} ({DEFAULT_DEPOT.latitude}, {DEFAULT_DEPOT.longitude})
            </div>
          </div>

        </div>

        {/* Right Column: Chronological Manifest & Deviation Audit (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px]">
          
          {/* Manifest Header & Filter Tabs */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Store Visit Sequence
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                {routeStops.length} Stops
              </span>
            </div>

            {/* Deviation Filter Toggle */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedDeviationFilter('all')}
                className={`py-1 rounded-md transition-all cursor-pointer ${
                  selectedDeviationFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({routeStops.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDeviationFilter('deviations_only')}
                className={`py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  selectedDeviationFilter === 'deviations_only'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Alerts ({metrics.deviationCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDeviationFilter('sequential_only')}
                className={`py-1 rounded-md transition-all cursor-pointer ${
                  selectedDeviationFilter === 'sequential_only'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Verified
              </button>
            </div>
          </div>

          {/* Chronological List of Stops */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {displayStops.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No stops matching selected filter</p>
              </div>
            ) : (
              displayStops.map((stop, index) => {
                const isSelected = highlightedStopId === stop.id;
                const isCurrentPlayback = playbackStep === stop.sequenceNumber - 1;

                return (
                  <div
                    key={stop.id}
                    onClick={() => handleSelectStop(stop)}
                    className={`pt-2.5 p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected || isCurrentPlayback
                        ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/50 shadow-xs'
                        : stop.isDeviation
                        ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/80'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {/* Header Row: Stop Number, Time & Invoice # */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white shadow-2xs ${
                          stop.isDeviation ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {stop.sequenceNumber}
                        </span>
                        <span className="font-extrabold text-slate-900 truncate max-w-[160px]">
                          {stop.storeName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{stop.timeString}</span>
                      </div>
                    </div>

                    {/* Address & Invoice Value */}
                    <div className="flex items-baseline justify-between text-xs pl-7">
                      <span className="text-[11px] text-slate-500 truncate max-w-[170px]" title={stop.address}>
                        {stop.address}
                      </span>
                      <span className="font-extrabold font-mono text-slate-900">
                        ₹{stop.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Transit Metrics & Deviation Alert */}
                    <div className="flex flex-wrap items-center justify-between gap-1 pl-7 pt-0.5 text-[10px]">
                      <span className="font-mono text-slate-500 font-semibold">
                        +{stop.distanceFromPrevKm.toFixed(1)} km (~{stop.travelMinutesEstimate}m transit)
                      </span>

                      {stop.isDeviation ? (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          <span>{stop.deviationReason}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Sequential Path</span>
                        </span>
                      )}
                    </div>

                    {/* Visit Status Badge */}
                    <div className="flex items-center gap-1.5 pl-7">
                      {stop.visitStatus === 'billed' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Billed: ₹{stop.totalAmount.toLocaleString('en-IN')} {stop.invoiceNumber ? `(${stop.invoiceNumber})` : ''}</span>
                        </span>
                      ) : stop.visitStatus === 'unsold' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>Unsold: {stop.unsoldReason || 'No Sale'}</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <span>Approaching Prospect ({stop.shopCategory || 'Retail'})</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Card Action Buttons */}
                    <div className="pt-2 mt-1 border-t border-slate-100 flex flex-wrap items-center gap-1.5 pl-7" onClick={(e) => e.stopPropagation()}>
                      {stop.visitStatus === 'approaching' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenBillModalForStop(stop)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Bill Sale</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUnsoldModalForStop(stop)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Mark Unsold</span>
                          </button>
                        </>
                      )}
                      {stop.visitStatus === 'unsold' && (
                        <button
                          type="button"
                          onClick={() => handleOpenBillModalForStop(stop)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Re-attempt Bill</span>
                        </button>
                      )}
                      {stop.visitStatus === 'billed' && stop.sale && onSelectInvoice && (
                        <button
                          type="button"
                          onClick={() => onSelectInvoice(stop.sale)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>View Invoice</span>
                        </button>
                      )}
                      <a
                        href={`https://maps.google.com/?q=${stop.latitude},${stop.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-[10px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Maps</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Deviation Audit Policy Card */}
          <div className="p-3 bg-slate-900 text-white border-t border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Route Adherence Rules Enforced:</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Stops with &gt; 5.5 km detour, &gt; 140° directional reversals (backtracking), or missing physical device GPS pin are flagged for route supervisor review.
            </p>
          </div>

        </div>

      </div>

      {/* Hidden / Print DOM Container for headless printing & html2canvas PDF rendering */}
      <div className="hidden print:block" id="printable-route-report-container">
        <div ref={printReportRef} id="printable-route-report" className="p-8 bg-white text-slate-800 font-sans text-xs space-y-6">
          
          {/* Formal Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {companySettings.logoUrl ? (
                  <img src={companySettings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center">
                    {companySettings.companyName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{companySettings.companyName}</h1>
                  <p className="text-[11px] text-slate-500 font-semibold">{companySettings.address}</p>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
                <p>Phone: <strong>{companySettings.phone}</strong> | Email: <strong>{companySettings.email}</strong></p>
                {companySettings.fssaiNumber && <p>FSSAI License: <strong className="font-mono text-slate-800">{companySettings.fssaiNumber}</strong></p>}
                {companySettings.gstNumber && <p>GSTIN: <strong className="font-mono text-slate-900">{companySettings.gstNumber}</strong></p>}
              </div>
            </div>

            <div className="text-right space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[240px]">
              <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                CONFIDENTIAL AUDIT RECORD
              </span>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 mt-1">FIELD ROUTE SUMMARY REPORT</p>
              <p className="text-[11px] text-slate-500 font-mono">Ref: <strong className="text-indigo-700">RR-{selectedDate.replace(/-/g, '')}-{routeStops.length}</strong></p>
              <p className="text-[11px] text-slate-500">Date: <strong className="font-mono text-slate-800">{selectedDate}</strong></p>
              <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleTimeString('en-IN')}</p>
            </div>
          </div>

          {/* Operational Context Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salesperson / Staff</span>
              <p className="font-extrabold text-slate-900 mt-0.5">
                {selectedSalesperson !== 'all' ? selectedSalesperson : 'All Assigned Beat Executives'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Route Beat</span>
              <p className="font-extrabold text-slate-900 mt-0.5">Commercial Market Route</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Origin</span>
              <p className="font-extrabold text-slate-900 mt-0.5">Central Factory Hub (09:00 AM)</p>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Counter Drop</span>
              <p className="font-mono font-extrabold text-indigo-700 mt-0.5">
                {routeStops.length > 0 ? routeStops[routeStops.length - 1].timeString : 'N/A'}
              </p>
            </div>
          </div>

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Stores Visited</p>
              <p className="text-base font-black font-mono text-slate-900 mt-0.5">{metrics.totalStops}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total Sales Billed</p>
              <p className="text-base font-black font-mono text-indigo-700 mt-0.5">₹{metrics.totalSales.toLocaleString('en-IN')}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total Circuit</p>
              <p className="text-base font-black font-mono text-slate-900 mt-0.5">{metrics.totalDistanceKm} km</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Route Adherence</p>
              <p className={`text-base font-black font-mono mt-0.5 ${metrics.adherenceScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {metrics.adherenceScore}%
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">GPS Verified Pins</p>
              <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{metrics.verifiedGpsCount} / {metrics.totalStops}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Flagged Detours</p>
              <p className={`text-base font-black font-mono mt-0.5 ${metrics.deviationCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {metrics.deviationCount}
              </p>
            </div>
          </div>

          {/* Chronological Stop-by-Stop Delivery Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[9px]">
                  <th className="p-2.5 w-8 text-center">#</th>
                  <th className="p-2.5">Store Name & Address</th>
                  <th className="p-2.5">Invoice #</th>
                  <th className="p-2.5 text-center">Time</th>
                  <th className="p-2.5 text-right">Bill Value</th>
                  <th className="p-2.5 text-right">Transit (km)</th>
                  <th className="p-2.5 text-center">GPS Status</th>
                  <th className="p-2.5 text-center">Compliance Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* Depot Start Row */}
                <tr className="bg-slate-50/60 font-semibold text-slate-600">
                  <td className="p-2.5 text-center font-mono">0</td>
                  <td className="p-2.5">
                    <strong>{DEFAULT_DEPOT.name}</strong>
                    <div className="text-[10px] text-slate-400">{DEFAULT_DEPOT.address}</div>
                  </td>
                  <td className="p-2.5 font-mono text-slate-400">Depot Dispatch</td>
                  <td className="p-2.5 text-center font-mono text-slate-500">09:00 AM</td>
                  <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                  <td className="p-2.5 text-right font-mono text-slate-400">Origin</td>
                  <td className="p-2.5 text-center font-mono text-slate-500">9.9252, 78.1198</td>
                  <td className="p-2.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                      Dispatched
                    </span>
                  </td>
                </tr>

                {routeStops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-slate-50/50">
                    <td className="p-2.5 text-center font-mono font-bold">{stop.sequenceNumber}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{stop.storeName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{stop.address}</div>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-indigo-700">{stop.invoiceNumber}</td>
                    <td className="p-2.5 text-center font-mono">{stop.timeString}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{stop.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-mono">+{stop.distanceFromPrevKm.toFixed(1)} km</td>
                    <td className="p-2.5 text-center font-mono text-[10px]">
                      {stop.hasDeviceGps ? (
                        <span className="text-emerald-700 font-bold">Lock: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Manual Address</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {stop.isDeviation ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          ⚠️ {stop.deviationReason || 'Detour'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Sequential Beat
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Route Deviation & Anomaly Audit Findings Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Route Deviation & Beat Compliance Verification Audit:</span>
            </div>
            {metrics.deviationCount > 0 ? (
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                {routeStops.filter(s => s.isDeviation).map((s, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <strong>Stop #{s.sequenceNumber} ({s.storeName}):</strong> {s.deviationReason}. 
                    Distance logged: +{s.distanceFromPrevKm.toFixed(1)} km from preceding counter stop.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-emerald-700 font-semibold">
                ✓ Perfect Route Adherence: All visited stores were serviced in exact geographic sequence without backtracking, long detours, or anomalous idle intervals.
              </p>
            )}
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
              <strong>Supervisor Recommendation:</strong> Route sequencing compliant with standard Madurai commercial zone beat. Ensure driver locks device GPS at counter arrival prior to bill printing.
            </p>
          </div>

          {/* Formal Signatures & Sign-off Counterfoil */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-6">
              <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                <span className="font-mono text-[11px] font-bold text-slate-800">
                  {selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan'}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Field Salesperson Signature</p>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                <span className="font-mono text-[10px] text-emerald-700 font-bold">[VERIFIED BY GPS DESK]</span>
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Route & Logistics Officer</p>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                <span className="font-mono text-[10px] text-slate-600 font-bold">{companySettings.companyName}</span>
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Administration / Accounts Stamp</p>
            </div>
          </div>

        </div>
      </div>

      {/* On-Screen Preview Modal for Administrative Route Report */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] my-auto">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Official Daily Route Summary Report Preview</h3>
                  <p className="text-[11px] text-slate-400">Date: {selectedDate} • {routeStops.length} Stores Visited</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Exporting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Document View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
                
                {/* Formal Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      {companySettings.logoUrl ? (
                        <img src={companySettings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center">
                          {companySettings.companyName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{companySettings.companyName}</h1>
                        <p className="text-[11px] text-slate-500 font-semibold">{companySettings.address}</p>
                      </div>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
                      <p>Phone: <strong>{companySettings.phone}</strong> | Email: <strong>{companySettings.email}</strong></p>
                      {companySettings.fssaiNumber && <p>FSSAI License: <strong className="font-mono text-slate-800">{companySettings.fssaiNumber}</strong></p>}
                      {companySettings.gstNumber && <p>GSTIN: <strong className="font-mono text-slate-900">{companySettings.gstNumber}</strong></p>}
                    </div>
                  </div>

                  <div className="text-right space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[220px]">
                    <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                      CONFIDENTIAL AUDIT RECORD
                    </span>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 mt-1">FIELD ROUTE SUMMARY REPORT</p>
                    <p className="text-[11px] text-slate-500 font-mono">Ref: <strong className="text-indigo-700">RR-{selectedDate.replace(/-/g, '')}-{routeStops.length}</strong></p>
                    <p className="text-[11px] text-slate-500">Date: <strong className="font-mono text-slate-800">{selectedDate}</strong></p>
                  </div>
                </div>

                {/* Operational Context Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salesperson / Staff</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">
                      {selectedSalesperson !== 'all' ? selectedSalesperson : 'All Assigned Beat Executives'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Route Beat</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">Commercial Market Route</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Origin</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">Central Factory Hub (09:00 AM)</p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Counter Drop</span>
                    <p className="font-mono font-extrabold text-indigo-700 mt-0.5">
                      {routeStops.length > 0 ? routeStops[routeStops.length - 1].timeString : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Summary KPI Strip */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Stores Visited</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{metrics.totalStops}</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Sales Billed</p>
                    <p className="text-base font-black font-mono text-indigo-700 mt-0.5">₹{metrics.totalSales.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Circuit</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{metrics.totalDistanceKm} km</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Route Adherence</p>
                    <p className={`text-base font-black font-mono mt-0.5 ${metrics.adherenceScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {metrics.adherenceScore}%
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">GPS Verified Pins</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{metrics.verifiedGpsCount} / {metrics.totalStops}</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Flagged Detours</p>
                    <p className={`text-base font-black font-mono mt-0.5 ${metrics.deviationCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {metrics.deviationCount}
                    </p>
                  </div>
                </div>

                {/* Chronological Stop-by-Stop Delivery Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[9px]">
                        <th className="p-2.5 w-8 text-center">#</th>
                        <th className="p-2.5">Store Name & Address</th>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5 text-center">Time</th>
                        <th className="p-2.5 text-right">Bill Value</th>
                        <th className="p-2.5 text-right">Transit (km)</th>
                        <th className="p-2.5 text-center">GPS Status</th>
                        <th className="p-2.5 text-center">Compliance Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {/* Depot Start Row */}
                      <tr className="bg-slate-50/60 font-semibold text-slate-600">
                        <td className="p-2.5 text-center font-mono">0</td>
                        <td className="p-2.5">
                          <strong>{DEFAULT_DEPOT.name}</strong>
                          <div className="text-[10px] text-slate-400">{DEFAULT_DEPOT.address}</div>
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">Depot Dispatch</td>
                        <td className="p-2.5 text-center font-mono text-slate-500">09:00 AM</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">Origin</td>
                        <td className="p-2.5 text-center font-mono text-slate-500">9.9252, 78.1198</td>
                        <td className="p-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                            Dispatched
                          </span>
                        </td>
                      </tr>

                      {routeStops.map((stop) => (
                        <tr key={stop.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 text-center font-mono font-bold">{stop.sequenceNumber}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{stop.storeName}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{stop.address}</div>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-indigo-700">{stop.invoiceNumber}</td>
                          <td className="p-2.5 text-center font-mono">{stop.timeString}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{stop.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono">+{stop.distanceFromPrevKm.toFixed(1)} km</td>
                          <td className="p-2.5 text-center font-mono text-[10px]">
                            {stop.hasDeviceGps ? (
                              <span className="text-emerald-700 font-bold">Lock: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</span>
                            ) : (
                              <span className="text-amber-700 font-semibold">Manual Address</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {stop.isDeviation ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                ⚠️ {stop.deviationReason || 'Detour'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Sequential Beat
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Route Deviation & Anomaly Audit Findings Section */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Route Deviation & Beat Compliance Verification Audit:</span>
                  </div>
                  {metrics.deviationCount > 0 ? (
                    <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                      {routeStops.filter(s => s.isDeviation).map((s, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <strong>Stop #{s.sequenceNumber} ({s.storeName}):</strong> {s.deviationReason}. 
                          Distance logged: +{s.distanceFromPrevKm.toFixed(1)} km from preceding counter stop.
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      ✓ Perfect Route Adherence: All visited stores were serviced in exact geographic sequence without backtracking, long detours, or anomalous idle intervals.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    <strong>Supervisor Recommendation:</strong> Route sequencing compliant with standard Madurai commercial zone beat. Ensure driver locks device GPS at counter arrival prior to bill printing.
                  </p>
                </div>

                {/* Formal Signatures & Sign-off Counterfoil */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-6">
                    <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-800">
                        {selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Field Salesperson Signature</p>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                      <span className="font-mono text-[10px] text-emerald-700 font-bold">[VERIFIED BY GPS DESK]</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Route & Logistics Officer</p>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-300 min-h-[40px] flex items-end justify-center pb-1">
                      <span className="font-mono text-[10px] text-slate-600 font-bold">{companySettings.companyName}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Administration / Accounts Stamp</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* 1. MAP SETTINGS MODAL */}
      {showMapSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Map Settings & Visit Layers</h3>
                  <p className="text-[11px] text-slate-400">Manage visible stop layers, geofence radius, and tile provider</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Visit Layers Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Map Visit Layers</span>
                </h4>

                <div className="space-y-2">
                  {/* Billed Sales Layer */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">
                        ₹
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Show Billed Sales</span>
                        <span className="text-[11px] text-slate-500">
                          Verified store stops where an invoice was billed ({metrics.billedStops} stores, ₹{metrics.totalSales.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapSettings.showBilled}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, showBilled: e.target.checked }))}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>

                  {/* Unsold Visits Layer */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-600 flex items-center justify-center text-white text-[9px] font-bold">
                        ✕
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Show Unsold Locations</span>
                        <span className="text-[11px] text-slate-500">
                          Visited retail counters where no sale occurred ({metrics.unsoldStops} visits logged)
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapSettings.showUnsold}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, showUnsold: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  {/* Approaching Leads Layer */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                        🏪
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Show Approaching New Shops</span>
                        <span className="text-[11px] text-slate-500">
                          Prospective new counters being approached ({metrics.approachingStops} leads with radar pulse)
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapSettings.showApproaching}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, showApproaching: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Driving Route Polyline Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Route Polyline Display</span>
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Connect Stops with Driving Polyline</span>
                    <span className="text-[11px] text-slate-500">
                      Draws directional polyline from factory depot through stores in sequential order
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={mapSettings.showPolylines}
                    onChange={(e) => setMapSettings(prev => ({ ...prev, showPolylines: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Geofence Proximity Circle Radius */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Counter Presence Geofence</span>
                  </span>
                  <span className="text-indigo-600 font-mono text-xs">{mapSettings.geofenceRadiusMeters} meters</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Visual proximity circle rendered around the selected store to verify salesperson counter presence.
                </p>

                <div className="flex items-center gap-2">
                  {[20, 50, 100, 150, 200].map(radius => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setMapSettings(prev => ({ ...prev, geofenceRadiusMeters: radius }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        mapSettings.geofenceRadiusMeters === radius
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {radius}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Engine Provider Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Map Engine & Provider</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {mapSettings.mapEngine === 'google' ? 'Google Maps Platform Active' : 'Leaflet Active'}
                  </span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMapSettings(prev => ({ ...prev, mapEngine: 'google' }))}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mapSettings.mapEngine === 'google'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🗺️</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800">
                        Recommended
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 block">Google Maps Platform</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Official interactive vector maps, high-accuracy geocoding & directional arrows
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMapSettings(prev => ({ ...prev, mapEngine: 'leaflet' }));
                      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mapSettings.mapEngine === 'leaflet'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base mb-1">🌐</div>
                    <span className="text-xs font-bold text-slate-900 block">OpenStreetMap (Leaflet)</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Open-source map tiles alternative for standard offline or fallback routing
                    </span>
                  </button>
                </div>
              </div>

              {/* Map Layer Style */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {mapSettings.mapEngine === 'google' ? 'Google Maps Base View Type' : 'Leaflet Tile Layer'}
                  </span>
                </h4>

                {mapSettings.mapEngine === 'google' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMapSettings(prev => ({ ...prev, googleMapType: type }))}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all capitalize text-xs font-bold ${
                          (mapSettings.googleMapType || 'roadmap') === type
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {type === 'roadmap' ? '🗺️ Roadmap' : type === 'satellite' ? '🛰️ Satellite' : type === 'hybrid' ? '🌐 Hybrid' : '⛰️ Terrain'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMapSettings(prev => ({ ...prev, mapTileLayer: 'standard' }))}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        mapSettings.mapTileLayer === 'standard'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base mb-1">🗺️</div>
                      <span className="text-xs font-bold text-slate-900 block">OpenStreetMap Street</span>
                      <span className="text-[10px] text-slate-500">Clean street names & road grids</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMapSettings(prev => ({ ...prev, mapTileLayer: 'satellite' }))}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        mapSettings.mapTileLayer === 'satellite'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base mb-1">🛰️</div>
                      <span className="text-xs font-bold text-slate-900 block">Esri Satellite Imagery</span>
                      <span className="text-[10px] text-slate-500">Aerial photographic view</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMapSettings({
                  showBilled: true,
                  showUnsold: true,
                  showApproaching: true,
                  geofenceRadiusMeters: 50,
                  showPolylines: true,
                  mapEngine: 'google',
                  googleMapType: 'roadmap',
                  mapTileLayer: 'standard',
                })}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline"
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowMapSettingsModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. APPROACH NEW SHOP MODAL */}
      {showNewShopModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="p-4 sm:p-5 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Approach New Shop</h3>
                  <p className="text-[11px] text-blue-100">Mark prospective new counter location on the map</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewShopModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewShop} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sri Krishna Bakery & Sweets"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Shop Category
                  </label>
                  <select
                    value={newShopCategory}
                    onChange={(e) => setNewShopCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Retail Shop">🏪 Retail Shop</option>
                    <option value="Supermarket">🏬 Supermarket</option>
                    <option value="Wholesaler">🏢 Wholesaler</option>
                    <option value="Bakery/Tea Stall">☕ Bakery / Tea Stall</option>
                    <option value="Canteen">🍽️ Canteen / Hotel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98421 99887"
                    value={newShopPhone}
                    onChange={(e) => setNewShopPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Owner / Decision Maker Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Ramesh"
                  value={newShopOwner}
                  onChange={(e) => setNewShopOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Counter Address / Area Landmark</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSyncAddressWithGps('counter')}
                    disabled={isSyncingAddressGps}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    {isSyncingAddressGps ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-700" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 text-blue-700" />
                        <span>📍 Sync with GPS</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 45 Bazaar Street, Near Periyar Statue"
                  value={newShopAddress}
                  onChange={(e) => setNewShopAddress(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs ${
                    newShopAddress && counterCoords
                      ? 'border-blue-400 bg-blue-50/30 text-blue-950 ring-1 ring-blue-300/60'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>

              {/* GPS Location Pin Capture */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Counter GPS Coordinates</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCaptureCurrentGps('counter')}
                    disabled={isGettingGps}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'Locking GPS...' : '📍 Capture Live Device GPS'}</span>
                  </button>
                </div>
                <div className="text-[11px] font-mono text-blue-800">
                  {counterCoords ? (
                    <span className="font-bold">Locked: {counterCoords.lat.toFixed(5)}, {counterCoords.lng.toFixed(5)}</span>
                  ) : (
                    <span className="text-slate-500 italic">Click button above to lock GPS at counter arrival</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Approach Notes & Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gave 2 sample packets of Mixture & Murukku. Owner interested in 250g retail packs."
                  value={newShopNotes}
                  onChange={(e) => setNewShopNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewShopModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Mark Approaching on Map (🔵)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. LOG UNSOLD VISIT MODAL */}
      {showUnsoldModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="p-4 sm:p-5 bg-amber-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Record Unsold Visit</h3>
                  <p className="text-[11px] text-amber-100">Mark location visited with 0 sales billed and reason</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnsoldModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogUnsoldVisit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Shop / Store Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Kannan Tea Stall"
                  value={unsoldShopName}
                  onChange={(e) => setUnsoldShopName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Reason for No Sale *
                </label>
                <select
                  value={unsoldReason}
                  onChange={(e) => setUnsoldReason(e.target.value as UnsoldReason)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Stock Already Full">📦 Stock Already Full</option>
                  <option value="Owner / Decision Maker Not Available">👤 Owner / Decision Maker Not Available</option>
                  <option value="Price / Margin Disagreement">💰 Price / Margin Disagreement</option>
                  <option value="Existing Credit Pending">💳 Existing Credit Pending</option>
                  <option value="Competitor Brand Preferred">⚔️ Competitor Brand Preferred</option>
                  <option value="Shop Closed">🚪 Shop Closed</option>
                  <option value="Sample Given - Trial">🎁 Sample Given - Trial Period</option>
                  <option value="Other">📝 Other Specific Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Detailed Notes / Owner Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 15 packs remaining from last week. Asked to revisit on Friday morning."
                  value={unsoldNotes}
                  onChange={(e) => setUnsoldNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Scheduled Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={unsoldFollowUpDate}
                    onChange={(e) => setUnsoldFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    GPS Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCaptureCurrentGps('counter')}
                    disabled={isGettingGps}
                    className="w-full px-2.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{counterCoords ? 'GPS Locked' : '📍 Capture GPS'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUnsoldModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mark as Unsold (🟠)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BILL SALE AT LOCATION MODAL */}
      {showBillLocationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="p-4 sm:p-5 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Bill Sale at Location</h3>
                  <p className="text-[11px] text-emerald-100">Generate verified sale invoice at this counter visit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBillLocationModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBilledSale} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Customer / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annai Supermarket"
                    value={billShopName}
                    onChange={(e) => setBillShopName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98421 22334"
                    value={billShopPhone}
                    onChange={(e) => setBillShopPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Delivery Address / Area</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSyncAddressWithGps('bill')}
                      disabled={isSyncingAddressGps}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                      title="Fetch & auto-fill address from current GPS location"
                    >
                      {isSyncingAddressGps ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3 h-3 text-emerald-700" />
                          <span>📍 Sync with GPS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. West Veli Street"
                    value={billShopAddress}
                    onChange={(e) => setBillShopAddress(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs ${
                      isGpsAddressSyncEnabled && billShopAddress
                        ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-400/30'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-600 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={isGpsAddressSyncEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setIsGpsAddressSyncEnabled(enabled);
                          if (enabled) {
                            handleSyncAddressWithGps('bill');
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Sync Address with GPS option enabled</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSyncAddressWithGps('bill')}
                      disabled={isSyncingAddressGps}
                      className="font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      {isSyncingAddressGps ? 'Locating...' : 'Auto-fill Now'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Customer Type
                  </label>
                  <select
                    value={billCustomerType}
                    onChange={(e) => setBillCustomerType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Shop/Retail">🏪 Retail Counter</option>
                    <option value="Wholesaler">🏢 Wholesaler</option>
                  </select>
                </div>
              </div>

              {/* GPS Lock status */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Verified Counter GPS Coordinates</span>
                    <span className="text-[11px] font-mono text-emerald-700">
                      {billCoords ? `${billCoords.lat.toFixed(5)}, ${billCoords.lng.toFixed(5)}` : 'Depot Default'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCaptureCurrentGps('bill')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  📍 Update GPS
                </button>
              </div>

              {/* Product Selection */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Add Snack Products
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedProductId(id);
                        const found = catalogProducts.find(p => p.id === id);
                        if (found) setSelectedProductRate(found.rate);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    >
                      {catalogProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.rate})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedProductQty}
                      onChange={(e) => setSelectedProductQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedProductRate}
                      onChange={(e) => setSelectedProductRate(Number(e.target.value))}
                      placeholder="₹ Rate"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddProductToBill}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Billed Items List */}
                <div className="space-y-1.5 pt-1">
                  {billItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          {item.quantity} packs × ₹{item.unitPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">₹{item.total}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromBill(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={billDiscount}
                    onChange={(e) => setBillDiscount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={billPaymentMethod}
                    onChange={(e) => setBillPaymentMethod(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="UPI">📱 UPI / QR</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Credit">💳 Credit</option>
                    <option value="Bank Transfer">🏦 Bank</option>
                  </select>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Total</span>
                  <span className="text-lg font-black font-mono text-emerald-700">
                    ₹{Math.max(0, billItems.reduce((sum, item) => sum + item.total, 0) - billDiscount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBillLocationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Save Billed Sale (🟢)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
