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
import { SaleEntry, Recipe, CompanyInvoiceSettings, UserRole, SalesVisitRecord, VisitBillingStatus, UnsoldReason, DayOfWeek, StoreLocation } from '../types';
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
  Sliders,
  Edit,
  Trash2,
  CalendarDays,
  CheckCircle,
  Route,
  Crosshair,
  MapPinned,
  Filter,
  CheckCheck,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Zap,
  Send,
  Copy,
  Share2,
  LocateFixed,
  Locate,
  Truck,
  Bike,
  Car,
  RotateCw,
  QrCode,
  FileSpreadsheet,
  FileCode,
  Globe,
  Wand2,
  Undo2,
  Warehouse,
  Package,
  Bot,
  Boxes,
  Radio,
  UserPlus,
  Settings2
} from 'lucide-react';
import {
  ExportableRouteStop,
  ExportRouteMetadata,
  generateRouteGPX,
  generateRouteKML,
  generateRouteGeoJSON,
  generateGoogleMapsRouteUrl,
  generateWhatsAppManifest,
  exportRouteToExcelFile,
  exportRouteToCSVFile,
  downloadFile,
} from '../utils/routeExport';
import {
  GodownFacility,
  StockPickupPoint,
  DistributionLine,
  DEFAULT_GODOWN,
  INITIAL_STOCK_PICKUP_POINTS,
} from '../types/logisticsNetwork';
import {
  RobotGpsConfig,
  DEFAULT_ROBOT_GPS_CONFIG,
  captureRobotPrecisionGps,
  RobotGpsResult,
} from '../utils/robotGps';
import { GodownModal } from './logistics/GodownModal';
import { StockPickupModal } from './logistics/StockPickupModal';
import { DistributionLinesModal } from './logistics/DistributionLinesModal';
import { RobotGpsHUD, RobotGpsProgressState } from './logistics/RobotGpsHUD';
import { RobotGpsCalibrationModal } from './logistics/RobotGpsCalibrationModal';
import { LocationAccessModal, LocationPermissionState } from './logistics/LocationAccessModal';
import { ManageSalespersonsModal } from './logistics/ManageSalespersonsModal';

export interface CustomRoutePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  distanceFromPrevKm: number;
  storeId?: string;
  notes?: string;
}

export interface CustomRouteDraft {
  routeName: string;
  salesperson: string;
  assignedDay: DayOfWeek;
  vehicleType: string;
  includeDepotStart: boolean;
  includeDepotFinish: boolean;
  points: CustomRoutePoint[];
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyANDm0U0zxohA_nF7QMm12uHZhK32XRvok';

export const VEHICLE_ICONS: Record<string, string> = {
  van: '🚐',
  bike: '🛵',
  truck: '🚚',
  car: '🚗',
};

export interface RouteVisualizationProps {
  salesEntries: SaleEntry[];
  companySettings: CompanyInvoiceSettings;
  currentUserRole?: UserRole;
  onSelectInvoice?: (sale: SaleEntry) => void;
  onAddSampleRouteData?: () => void;
  recipes?: Recipe[];
  onAddSale?: (sale: Omit<SaleEntry, 'id'>) => void;
  onClearRouteTracking?: () => void;
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
  storeLocation?: StoreLocation;
  assignedDays?: DayOfWeek[];
  salesPerson?: string;
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return 'Monday';
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  } catch {
    return 'Monday';
  }
}

// Cleared sample stores list as requested
export const INITIAL_STORES: StoreLocation[] = [];

// Fallback depot (address deleted as requested)
const DEFAULT_DEPOT = {
  name: 'Central Factory & Snack Depot',
  latitude: 9.92520,
  longitude: 78.11980,
  address: '',
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

// Google Maps Real-Time Traffic Layer Controller
function GoogleMapTrafficController({ showTraffic }: { showTraffic: boolean }) {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  return null;
}

// Google Maps Live Geolocation Marker Controller
function GoogleMapLiveLocationMarker({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!userLocation) {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: userLocation,
        map,
        title: 'You are here (Live Device Location)',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 9999,
      });
    } else {
      markerRef.current.setPosition(userLocation);
    }

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new google.maps.Circle({
        strokeColor: '#3b82f6',
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        map,
        center: userLocation,
        radius: 40,
        zIndex: 9998,
      });
    } else {
      accuracyCircleRef.current.setCenter(userLocation);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }
    };
  }, [map, userLocation]);

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

// Google Maps Interactive Custom Route Polyline Overlay
function GoogleMapCustomRouteOverlay({
  customRoutePoints,
  includeDepotStart,
  includeDepotFinish,
  depot,
}: {
  customRoutePoints: CustomRoutePoint[];
  includeDepotStart: boolean;
  includeDepotFinish: boolean;
  depot: { latitude: number; longitude: number };
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (customRoutePoints.length === 0) return;

    const path: google.maps.LatLngLiteral[] = [];
    if (includeDepotStart) {
      path.push({ lat: depot.latitude, lng: depot.longitude });
    }
    customRoutePoints.forEach((pt) => {
      path.push({ lat: pt.lat, lng: pt.lng });
    });
    if (includeDepotFinish && customRoutePoints.length > 0) {
      path.push({ lat: depot.latitude, lng: depot.longitude });
    }

    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeColor: '#581c87',
      fillColor: '#c084fc',
      fillOpacity: 1,
      strokeWeight: 1,
    };

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#9333ea', // Vibrant Purple / Violet
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [
        {
          icon: arrowSymbol,
          offset: '25px',
          repeat: '80px',
        },
      ],
      map,
    });
    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, customRoutePoints, includeDepotStart, includeDepotFinish, depot]);

  return null;
}

// Google Maps Distribution Lines Overlay (Primary Supply Feeders + Retail Beat Arteries)
function GoogleMapDistributionLinesOverlay({
  godown,
  pickupPoints,
  stores,
  showDistributionLines,
  distributionLineMode,
}: {
  godown: GodownFacility;
  pickupPoints: StockPickupPoint[];
  stores: StoreLocation[];
  showDistributionLines: boolean;
  distributionLineMode: 'all' | 'primary_supply' | 'retail_beat' | 'none';
}) {
  const map = useMap();
  const feederPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const retailPolylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clear previous polylines
    feederPolylinesRef.current.forEach(p => p.setMap(null));
    feederPolylinesRef.current = [];
    if (retailPolylineRef.current) {
      retailPolylineRef.current.setMap(null);
      retailPolylineRef.current = null;
    }

    if (!showDistributionLines || distributionLineMode === 'none') return;

    // 1. Primary Supply Feeder Lines (Pickup Point -> Godown)
    if (distributionLineMode === 'all' || distributionLineMode === 'primary_supply') {
      const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 3,
      };

      const feederArrow: google.maps.Symbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        strokeColor: '#78350f',
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeWeight: 1,
      };

      pickupPoints.filter(p => p.active).forEach(pt => {
        const line = new google.maps.Polyline({
          path: [
            { lat: pt.latitude, lng: pt.longitude },
            { lat: godown.latitude, lng: godown.longitude },
          ],
          strokeColor: '#f59e0b', // Amber
          strokeOpacity: 0.85,
          strokeWeight: 3.5,
          icons: [
            {
              icon: feederArrow,
              offset: '50%',
            },
          ],
          map,
        });
        feederPolylinesRef.current.push(line);
      });
    }

    // 2. Secondary Retail Distribution Lines (Godown -> Stores sequential delivery)
    if (distributionLineMode === 'all' || distributionLineMode === 'retail_beat') {
      if (stores.length > 0) {
        const retailPath: google.maps.LatLngLiteral[] = [
          { lat: godown.latitude, lng: godown.longitude },
          ...stores.map(s => ({ lat: s.location.latitude, lng: s.location.longitude })),
        ];

        const retailLine = new google.maps.Polyline({
          path: retailPath,
          geodesic: true,
          strokeColor: '#4f46e5', // Indigo
          strokeOpacity: 0.75,
          strokeWeight: 3,
          map,
        });
        retailPolylineRef.current = retailLine;
      }
    }

    return () => {
      feederPolylinesRef.current.forEach(p => p.setMap(null));
      feederPolylinesRef.current = [];
      if (retailPolylineRef.current) {
        retailPolylineRef.current.setMap(null);
        retailPolylineRef.current = null;
      }
    };
  }, [map, godown, pickupPoints, stores, showDistributionLines, distributionLineMode]);

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
  onClearRouteTracking,
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

  // Persistent Store Locations Master Directory
  const [stores, setStores] = useState<StoreLocation[]>(() => {
    const saved = localStorage.getItem('snack_store_locations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    return INITIAL_STORES;
  });

  useEffect(() => {
    localStorage.setItem('snack_store_locations', JSON.stringify(stores));
  }, [stores]);

  // Route Day Scheduling Filter (Monday to Sunday & Selected Date)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek | 'all'>('all');
  const [routeFilterMode, setRouteFilterMode] = useState<'day_of_week' | 'date' | 'all'>('day_of_week');

  // Interactive Pin Dropper & Store Modals
  const [isPinDropperActive, setIsPinDropperActive] = useState<boolean>(false);
  const isPinDropperActiveRef = useRef<boolean>(false);
  useEffect(() => {
    isPinDropperActiveRef.current = isPinDropperActive;
  }, [isPinDropperActive]);

  const [pinDropperTempLocation, setPinDropperTempLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [showStoreManagerModal, setShowStoreManagerModal] = useState<boolean>(false);
  const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<StoreLocation | null>(null);

  // Store Location Form State (Add / Edit)
  const [storeFormName, setStoreFormName] = useState('');
  const [storeFormOwner, setStoreFormOwner] = useState('');
  const [storeFormPhone, setStoreFormPhone] = useState('');
  const [storeFormAddress, setStoreFormAddress] = useState('');
  const [storeFormLat, setStoreFormLat] = useState<number>(DEFAULT_DEPOT.latitude);
  const [storeFormLng, setStoreFormLng] = useState<number>(DEFAULT_DEPOT.longitude);
  const [storeFormCategory, setStoreFormCategory] = useState<'Wholesaler' | 'Retail Shop' | 'Supermarket' | 'Bakery/Tea Stall' | 'Canteen' | 'Other'>('Retail Shop');
  const [storeFormAssignedDays, setStoreFormAssignedDays] = useState<DayOfWeek[]>(['Monday', 'Wednesday', 'Friday']);
  const [storeFormAssignedSalesperson, setStoreFormAssignedSalesperson] = useState('K. Saravanan');
  const [storeFormSequence, setStoreFormSequence] = useState<number>(1);
  const [storeFormNotes, setStoreFormNotes] = useState('');
  const [storeFormAssignedDate, setStoreFormAssignedDate] = useState('');

  // Store Manager Search & Filters
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeManagerDayFilter, setStoreManagerDayFilter] = useState<DayOfWeek | 'all'>('all');

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
    robotGpsEnabled: boolean;
    robotGpsMinAccuracy: number;
    robotGpsSampleCount: number;
    robotGpsOutlierFilter: boolean;
    robotGpsCaptureTheta: boolean;
    showGodownMarker: boolean;
    showStockPickupPoints: boolean;
    showDistributionLines: boolean;
    distributionLineMode: 'all' | 'primary_supply' | 'retail_beat' | 'none';
  }>(() => {
    const saved = localStorage.getItem('snack_map_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          mapEngine: 'google',
          googleMapType: 'roadmap',
          robotGpsEnabled: true,
          robotGpsMinAccuracy: 5,
          robotGpsSampleCount: 5,
          robotGpsOutlierFilter: true,
          robotGpsCaptureTheta: true,
          showGodownMarker: true,
          showStockPickupPoints: true,
          showDistributionLines: true,
          distributionLineMode: 'all',
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
      robotGpsEnabled: true,
      robotGpsMinAccuracy: 5,
      robotGpsSampleCount: 5,
      robotGpsOutlierFilter: true,
      robotGpsCaptureTheta: true,
      showGodownMarker: true,
      showStockPickupPoints: true,
      showDistributionLines: true,
      distributionLineMode: 'all',
    };
  });

  useEffect(() => {
    localStorage.setItem('snack_map_settings', JSON.stringify(mapSettings));
  }, [mapSettings]);

  // Central Godown (Warehouse / Primary Hub) State
  const [godownFacility, setGodownFacility] = useState<GodownFacility>(() => {
    const saved = localStorage.getItem('snack_godown_facility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.latitude && parsed.longitude) return parsed;
      } catch (e) { }
    }
    return DEFAULT_GODOWN;
  });

  useEffect(() => {
    localStorage.setItem('snack_godown_facility', JSON.stringify(godownFacility));
  }, [godownFacility]);

  // Stock Pickup Points State (Oven, Packaging, Inward Docks)
  const [stockPickupPoints, setStockPickupPoints] = useState<StockPickupPoint[]>(() => {
    const saved = localStorage.getItem('snack_stock_pickup_points');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    return INITIAL_STOCK_PICKUP_POINTS;
  });

  useEffect(() => {
    localStorage.setItem('snack_stock_pickup_points', JSON.stringify(stockPickupPoints));
  }, [stockPickupPoints]);

  // Logistics & Robot GPS Modals
  const [showGodownModal, setShowGodownModal] = useState<boolean>(false);
  const [showStockPickupModal, setShowStockPickupModal] = useState<boolean>(false);
  const [showDistributionLinesModal, setShowDistributionLinesModal] = useState<boolean>(false);
  const [showRobotCalibrationModal, setShowRobotCalibrationModal] = useState<boolean>(false);
  const [pinDropperTarget, setPinDropperTarget] = useState<'store' | 'godown' | 'pickup'>('store');
  const [pinDropperPickupPointId, setPinDropperPickupPointId] = useState<string | null>(null);
  const [robotGpsProgress, setRobotGpsProgress] = useState<RobotGpsProgressState | null>(null);
  const [logisticsToast, setLogisticsToast] = useState<{ title: string; message: string } | null>(null);

  // Location Access Permission & Request States
  const [showLocationAccessModal, setShowLocationAccessModal] = useState<boolean>(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<LocationPermissionState>('prompt');
  const [locationAccessInitialMessage, setLocationAccessInitialMessage] = useState<string>('');
  const [isLocationBannerDismissed, setIsLocationBannerDismissed] = useState<boolean>(() => {
    return localStorage.getItem('snack_location_banner_dismissed') === 'true';
  });

  // Query location permission status on mount and listen to changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          setLocationPermissionStatus(perm.state as LocationPermissionState);
          perm.onchange = () => {
            setLocationPermissionStatus(perm.state as LocationPermissionState);
          };
        })
        .catch(() => {});
    }
  }, []);

  const handleOpenLocationAccessRequest = (msg?: string) => {
    setLocationAccessInitialMessage(msg || 'Location access requested to sync your Godown, Shops List, and Stock Pickup Points with real-time GPS.');
    setShowLocationAccessModal(true);
  };

  // Auto-dismiss logistics toast after 4 seconds
  useEffect(() => {
    if (logisticsToast) {
      const timer = setTimeout(() => setLogisticsToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [logisticsToast]);

  // Modal dialog states
  const [showMapSettingsModal, setShowMapSettingsModal] = useState<boolean>(false);
  const [showNewShopModal, setShowNewShopModal] = useState<boolean>(false);
  const [showUnsoldModal, setShowUnsoldModal] = useState<boolean>(false);
  const [showNotBoughtRemarksModal, setShowNotBoughtRemarksModal] = useState<boolean>(false);
  const [showBillLocationModal, setShowBillLocationModal] = useState<boolean>(false);
  const [showClearRouteModal, setShowClearRouteModal] = useState<boolean>(false);
  const [showCeoAssignmentModal, setShowCeoAssignmentModal] = useState<boolean>(false);
  const [showManageSalespersonsModal, setShowManageSalespersonsModal] = useState<boolean>(false);
  const [isInlineAddingRep, setIsInlineAddingRep] = useState<boolean>(false);
  const [newRepInputName, setNewRepInputName] = useState<string>('');

  // Custom & Editable Salesperson Names State
  const [customSalespersons, setCustomSalespersons] = useState<string[]>(() => {
    const saved = localStorage.getItem('snack_custom_salesperson_names');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['K. Saravanan', 'R. Murugan', 'M. Muthu', 'S. Vignesh', 'A. Selvam'];
  });

  const [deletedSalespersonNames, setDeletedSalespersonNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('snack_deleted_salesperson_names');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('snack_custom_salesperson_names', JSON.stringify(customSalespersons));
  }, [customSalespersons]);

  useEffect(() => {
    localStorage.setItem('snack_deleted_salesperson_names', JSON.stringify(deletedSalespersonNames));
  }, [deletedSalespersonNames]);

  const [editingNotBoughtStop, setEditingNotBoughtStop] = useState<ParsedRouteStop | null>(null);
  const [notBoughtShopName, setNotBoughtShopName] = useState<string>('');
  const [notBoughtSalesperson, setNotBoughtSalesperson] = useState<string>('K. Saravanan');
  const [notBoughtReason, setNotBoughtReason] = useState<UnsoldReason>('Stock Already Full');
  const [notBoughtRemarks, setNotBoughtRemarks] = useState<string>('');
  const [notBoughtFollowUpDate, setNotBoughtFollowUpDate] = useState<string>('');
  const [notBoughtIsNewApproach, setNotBoughtIsNewApproach] = useState<boolean>(false);

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

  // Full Market Route Map State & Commercial Controls
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);
  const [showLiveTraffic, setShowLiveTraffic] = useState<boolean>(false);
  const [userLiveLocation, setUserLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [customStopOrder, setCustomStopOrder] = useState<string[]>([]);
  const [isRouteReversed, setIsRouteReversed] = useState<boolean>(false);
  const [showOptimizationToast, setShowOptimizationToast] = useState<boolean>(false);
  const [optimizationSummary, setOptimizationSummary] = useState<{ originalKm: number; optimizedKm: number; savedKm: number; savedMins: number } | null>(null);
  const [showWhatsAppDispatchModal, setShowWhatsAppDispatchModal] = useState<boolean>(false);
  const [itineraryTab, setItineraryTab] = useState<'list' | 'directions'>('list');
  const [itinerarySearchQuery, setItinerarySearchQuery] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'van' | 'bike' | 'truck' | 'car'>('van');
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [copiedManifestFeedback, setCopiedManifestFeedback] = useState<boolean>(false);

  // Interactive "Create Route on Map" State & Refs
  const [isCreateRouteMode, setIsCreateRouteMode] = useState<boolean>(false);
  const isCreateRouteModeRef = useRef<boolean>(false);
  useEffect(() => {
    isCreateRouteModeRef.current = isCreateRouteMode;
  }, [isCreateRouteMode]);

  const [customRouteDraft, setCustomRouteDraft] = useState<CustomRouteDraft>(() => ({
    routeName: 'Madurai Custom Beat Route',
    salesperson: 'K. Saravanan',
    assignedDay: 'Monday',
    vehicleType: 'van',
    includeDepotStart: true,
    includeDepotFinish: false,
    points: [],
  }));

  const [isCreateRoutePanelCollapsed, setIsCreateRoutePanelCollapsed] = useState<boolean>(false);

  // Universal Route Export Modal State
  const [showExportRouteModal, setShowExportRouteModal] = useState<boolean>(false);
  const [exportTargetSource, setExportTargetSource] = useState<'daily' | 'custom' | 'stores'>('daily');
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState<boolean>(false);
  const [copiedWhatsAppFeedback, setCopiedWhatsAppFeedback] = useState<boolean>(false);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const customRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const distributionLinesLayerRef = useRef<L.LayerGroup | null>(null);

  // Custom Route Builder Calculations & Handlers
  const customRouteStats = useMemo(() => {
    const points = customRouteDraft.points;
    let totalKm = 0;
    if (points.length === 0) return { totalStops: 0, totalDistanceKm: 0, estDriveMinutes: 0 };

    let currentLat = customRouteDraft.includeDepotStart ? godownFacility.latitude : points[0].lat;
    let currentLng = customRouteDraft.includeDepotStart ? godownFacility.longitude : points[0].lng;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i > 0 || customRouteDraft.includeDepotStart) {
        totalKm += calculateDistanceKm(currentLat, currentLng, pt.lat, pt.lng);
      }
      currentLat = pt.lat;
      currentLng = pt.lng;
    }

    if (customRouteDraft.includeDepotFinish && points.length > 0) {
      totalKm += calculateDistanceKm(currentLat, currentLng, godownFacility.latitude, godownFacility.longitude);
    }

    // Estimated driving time: ~25 km/h urban speed = 2.4 min per km + 4 mins per delivery stop
    const driveMinutes = Math.round(totalKm * 2.4 + points.length * 4);

    return {
      totalStops: points.length,
      totalDistanceKm: Number(totalKm.toFixed(1)),
      estDriveMinutes: driveMinutes,
    };
  }, [customRouteDraft]);

  const handleAddCustomRoutePoint = (lat: number, lng: number, existingStore?: StoreLocation) => {
    const currentPoints = customRouteDraft.points;
    const prevPoint = currentPoints.length > 0 
      ? { lat: currentPoints[currentPoints.length - 1].lat, lng: currentPoints[currentPoints.length - 1].lng }
      : customRouteDraft.includeDepotStart 
      ? { lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude }
      : null;

    const legDist = prevPoint ? calculateDistanceKm(prevPoint.lat, prevPoint.lng, lat, lng) : 0;
    const newIndex = currentPoints.length + 1;
    const autoName = existingStore ? existingStore.shopName : `Stop #${newIndex}`;
    const initialAddress = existingStore ? existingStore.address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const newPt: CustomRoutePoint = {
      id: `custom_pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: autoName,
      lat,
      lng,
      address: initialAddress,
      distanceFromPrevKm: legDist,
      storeId: existingStore?.id,
      notes: existingStore ? `Store Owner: ${existingStore.ownerName || 'N/A'}` : '',
    };

    setCustomRouteDraft(prev => ({
      ...prev,
      points: [...prev.points, newPt],
    }));

    // If no address provided, asynchronously fetch and update
    if (!existingStore?.address) {
      fetchAddressFromCoords(lat, lng).then(resolved => {
        if (resolved) {
          setCustomRouteDraft(prev => ({
            ...prev,
            points: prev.points.map(p => p.id === newPt.id ? { ...p, address: resolved } : p),
          }));
        }
      }).catch(() => {});
    }
  };

  const handleUndoLastCustomRoutePoint = () => {
    setCustomRouteDraft(prev => ({
      ...prev,
      points: prev.points.slice(0, -1),
    }));
  };

  const handleRemoveCustomRoutePoint = (id: string) => {
    setCustomRouteDraft(prev => {
      const remaining = prev.points.filter(p => p.id !== id);
      // Recalculate leg distances
      for (let i = 0; i < remaining.length; i++) {
        const prevCoord = i === 0 
          ? (prev.includeDepotStart ? DEFAULT_DEPOT : null)
          : { latitude: remaining[i - 1].lat, longitude: remaining[i - 1].lng };
        remaining[i].distanceFromPrevKm = prevCoord 
          ? calculateDistanceKm(prevCoord.latitude, prevCoord.longitude, remaining[i].lat, remaining[i].lng) 
          : 0;
      }
      return { ...prev, points: remaining };
    });
  };

  const handleMoveCustomRoutePoint = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customRouteDraft.points.length) return;

    const newPoints = [...customRouteDraft.points];
    const temp = newPoints[index];
    newPoints[index] = newPoints[targetIndex];
    newPoints[targetIndex] = temp;

    // Recalculate leg distances
    for (let i = 0; i < newPoints.length; i++) {
      const prevCoord = i === 0 
        ? (customRouteDraft.includeDepotStart ? DEFAULT_DEPOT : null)
        : { latitude: newPoints[i - 1].lat, longitude: newPoints[i - 1].lng };
      newPoints[i].distanceFromPrevKm = prevCoord 
        ? calculateDistanceKm(prevCoord.latitude, prevCoord.longitude, newPoints[i].lat, newPoints[i].lng) 
        : 0;
    }

    setCustomRouteDraft(prev => ({
      ...prev,
      points: newPoints,
    }));
  };

  const handleClearCustomRoutePoints = () => {
    if (customRouteDraft.points.length === 0) return;
    if (window.confirm('Clear all waypoints from this route draft?')) {
      setCustomRouteDraft(prev => ({
        ...prev,
        points: [],
      }));
    }
  };

  const handleReverseCustomRoute = () => {
    const reversed = [...customRouteDraft.points].reverse();
    for (let i = 0; i < reversed.length; i++) {
      const prevCoord = i === 0 
        ? (customRouteDraft.includeDepotStart ? DEFAULT_DEPOT : null)
        : { latitude: reversed[i - 1].lat, longitude: reversed[i - 1].lng };
      reversed[i].distanceFromPrevKm = prevCoord 
        ? calculateDistanceKm(prevCoord.latitude, prevCoord.longitude, reversed[i].lat, reversed[i].lng) 
        : 0;
    }
    setCustomRouteDraft(prev => ({
      ...prev,
      points: reversed,
    }));
  };

  const handleOptimizeCustomRoute = () => {
    const points = [...customRouteDraft.points];
    if (points.length <= 2) return;

    const startLat = customRouteDraft.includeDepotStart ? DEFAULT_DEPOT.latitude : points[0].lat;
    const startLng = customRouteDraft.includeDepotStart ? DEFAULT_DEPOT.longitude : points[0].lng;

    const unvisited = [...points];
    const ordered: CustomRoutePoint[] = [];

    let curLat = startLat;
    let curLng = startLng;

    while (unvisited.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateDistanceKm(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      const nextPt = unvisited.splice(bestIdx, 1)[0];
      nextPt.distanceFromPrevKm = bestDist;
      ordered.push(nextPt);
      curLat = nextPt.lat;
      curLng = nextPt.lng;
    }

    setCustomRouteDraft(prev => ({
      ...prev,
      points: ordered,
    }));
  };

  const handleSaveCustomRoute = () => {
    if (customRouteDraft.points.length === 0) {
      alert('Please add at least one waypoint on the map first.');
      return;
    }

    // Register any newly pinned points into store locations master directory
    const newStoresToAdd: StoreLocation[] = [];
    customRouteDraft.points.forEach((pt, idx) => {
      const exists = stores.some(st => st.id === pt.storeId || (Math.abs(st.location.latitude - pt.lat) < 0.0001 && Math.abs(st.location.longitude - pt.lng) < 0.0001));
      if (!exists) {
        newStoresToAdd.push({
          id: pt.storeId || `store_custom_${Date.now()}_${idx}`,
          shopName: pt.name,
          ownerName: 'Store Owner',
          phone: '',
          address: pt.address || 'Madurai Route Stop',
          location: {
            latitude: pt.lat,
            longitude: pt.lng,
            address: pt.address || 'Madurai Route Stop',
          },
          assignedDays: [customRouteDraft.assignedDay],
          routeSequence: idx + 1,
          active: true,
          shopCategory: 'Retail Shop',
        });
      }
    });

    if (newStoresToAdd.length > 0) {
      setStores(prev => [...prev, ...newStoresToAdd]);
    }

    // Generate approach visit records so stops are visible on the map for the day
    const today = selectedDate || new Date().toISOString().split('T')[0];
    const newVisits: SalesVisitRecord[] = customRouteDraft.points.map((pt, idx) => ({
      id: `visit_custom_${Date.now()}_${idx}`,
      shopName: pt.name,
      ownerName: 'Store Contact',
      phone: '',
      address: pt.address,
      date: today,
      time: `${9 + Math.floor(idx / 2)}:${(idx % 2) * 30 || '00'} AM`,
      salesperson: customRouteDraft.salesperson,
      status: 'approaching',
      location: {
        latitude: pt.lat,
        longitude: pt.lng,
        address: pt.address,
        accuracyMeters: 10,
      },
      isNewShopProspect: true,
      shopCategory: 'Retail Outlet',
      unsoldNotes: `Assigned Beat: ${customRouteDraft.routeName} (Stop #${idx + 1})`,
    }));

    setVisits(prev => [...prev, ...newVisits]);
    setSelectedDayOfWeek(customRouteDraft.assignedDay);
    setRouteFilterMode('day_of_week');
    setIsCreateRouteMode(false);
  };

  // Unique Dates and Salespersons for Filters
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    salesEntries.forEach(s => { if (s.date) set.add(s.date); });
    const list = Array.from(set).sort().reverse();
    return list.length > 0 ? list : [new Date().toISOString().split('T')[0]];
  }, [salesEntries]);

  const availableSalespersons = useMemo(() => {
    const set = new Set<string>();
    // 1. Add configured custom salespersons
    customSalespersons.forEach(name => {
      if (name && name.trim()) set.add(name.trim());
    });
    // 2. Add salespersons from historical sales records
    salesEntries.forEach(s => {
      if (s.salesPerson && s.salesPerson.trim()) {
        set.add(s.salesPerson.trim());
      }
    });
    // 3. Add salespersons from registered stores
    stores.forEach(st => {
      if (st.assignedSalesperson && st.assignedSalesperson.trim()) {
        set.add(st.assignedSalesperson.trim());
      }
    });
    // 4. Remove any explicitly deleted salesperson names
    deletedSalespersonNames.forEach(del => {
      set.delete(del);
    });

    if (set.size === 0) {
      set.add('K. Saravanan');
      set.add('R. Murugan');
    }
    return Array.from(set).sort();
  }, [customSalespersons, deletedSalespersonNames, salesEntries, stores]);

  const storeCountsBySalesperson = useMemo(() => {
    const counts: Record<string, number> = {};
    stores.forEach(st => {
      const sp = st.assignedSalesperson || 'K. Saravanan';
      counts[sp] = (counts[sp] || 0) + 1;
    });
    return counts;
  }, [stores]);

  const handleAddSalesperson = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDeletedSalespersonNames(prev => prev.filter(d => d.toLowerCase() !== trimmed.toLowerCase()));
    setCustomSalespersons(prev => {
      if (prev.some(p => p.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
    setLogisticsToast({
      title: '👤 Custom Name Added',
      message: `"${trimmed}" added to salesperson options.`,
    });
  };

  const handleDeleteSalesperson = (name: string) => {
    const trimmed = name.trim();
    setCustomSalespersons(prev => prev.filter(p => p !== trimmed));
    setDeletedSalespersonNames(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    if (selectedSalesperson === trimmed) {
      setSelectedSalesperson('all');
    }
    setLogisticsToast({
      title: '🗑️ Name Deleted',
      message: `"${trimmed}" removed from salesperson options.`,
    });
  };

  const handleResetSalespersonDefaults = () => {
    const defaults = ['K. Saravanan', 'R. Murugan', 'M. Muthu', 'S. Vignesh', 'A. Selvam'];
    setCustomSalespersons(defaults);
    setDeletedSalespersonNames([]);
    localStorage.removeItem('snack_deleted_salesperson_names');
    localStorage.setItem('snack_custom_salesperson_names', JSON.stringify(defaults));
    setLogisticsToast({
      title: '🔄 Defaults Restored',
      message: 'Restored factory default salesperson names.',
    });
  };

  // Store Location Management & Pin Dropper Handlers
  const handleExportShopsListCSV = () => {
    if (stores.length === 0) {
      alert('No stores in directory to export.');
      return;
    }
    const headers = ['Sequence', 'Shop Name', 'Owner Name', 'Contact Phone', 'Category', 'Address', 'Latitude', 'Longitude', 'Assigned Route Days', 'Salesperson', 'Status'];
    const rows = stores.map((s, idx) => [
      s.routeSequence || idx + 1,
      `"${(s.shopName || '').replace(/"/g, '""')}"`,
      `"${(s.ownerName || '').replace(/"/g, '""')}"`,
      `"${(s.phone || '').replace(/"/g, '""')}"`,
      `"${(s.shopCategory || 'Retail Shop').replace(/"/g, '""')}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.location.latitude.toFixed(6),
      s.location.longitude.toFixed(6),
      `"${(s.assignedDays || []).join(', ')}"`,
      `"${(s.assignedSalesperson || '').replace(/"/g, '""')}"`,
      s.active ? 'Active' : 'Inactive',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `My_Shops_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLogisticsToast({
      title: '📥 Shops List Exported',
      message: `Exported ${stores.length} shops with GPS coordinates to CSV.`,
    });
  };

  const handleOpenAddStore = (preset?: { lat: number; lng: number; address?: string }) => {
    setEditingStore(null);
    setStoreFormName('');
    setStoreFormOwner('');
    setStoreFormPhone('');
    setStoreFormCategory('Retail Shop');
    setStoreFormAddress(preset?.address || '');
    setStoreFormLat(preset?.lat || (counterCoords?.lat || DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.02));
    setStoreFormLng(preset?.lng || (counterCoords?.lng || DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.02));
    setStoreFormAssignedDays(selectedDayOfWeek !== 'all' ? [selectedDayOfWeek] : ['Monday', 'Wednesday', 'Friday']);
    setStoreFormAssignedSalesperson(selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan');
    setStoreFormSequence(stores.length + 1);
    setStoreFormNotes('');
    setStoreFormAssignedDate('');
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (store: StoreLocation) => {
    setEditingStore(store);
    setStoreFormName(store.shopName);
    setStoreFormOwner(store.ownerName || '');
    setStoreFormPhone(store.phone || '');
    setStoreFormCategory(store.shopCategory || 'Retail Shop');
    setStoreFormAddress(store.address || store.location.address || '');
    setStoreFormLat(store.location.latitude);
    setStoreFormLng(store.location.longitude);
    setStoreFormAssignedDays(store.assignedDays || []);
    setStoreFormAssignedSalesperson(store.assignedSalesperson || 'K. Saravanan');
    setStoreFormSequence(store.routeSequence || 1);
    setStoreFormNotes(store.notes || '');
    setStoreFormAssignedDate(store.assignedDates?.[0] || '');
    setShowStoreModal(true);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeFormName.trim()) {
      alert('Please enter a store / shop name');
      return;
    }
    if (!storeFormLat || !storeFormLng) {
      alert('Please provide valid latitude and longitude coordinates');
      return;
    }

    const updatedLocation = {
      latitude: Number(storeFormLat),
      longitude: Number(storeFormLng),
      address: storeFormAddress.trim() || storeFormName.trim(),
      accuracyMeters: 5,
    };

    if (editingStore) {
      setStores(prev => prev.map(s => s.id === editingStore.id ? {
        ...s,
        shopName: storeFormName.trim(),
        ownerName: storeFormOwner.trim() || undefined,
        phone: storeFormPhone.trim() || undefined,
        shopCategory: storeFormCategory,
        address: storeFormAddress.trim() || s.address,
        location: updatedLocation,
        assignedDays: storeFormAssignedDays,
        assignedSalesperson: storeFormAssignedSalesperson,
        routeSequence: Number(storeFormSequence) || 1,
        notes: storeFormNotes.trim() || undefined,
        assignedDates: storeFormAssignedDate ? [storeFormAssignedDate] : undefined,
        updatedAt: new Date().toISOString(),
      } : s));
    } else {
      const newStore: StoreLocation = {
        id: `store_${Date.now()}`,
        shopName: storeFormName.trim(),
        ownerName: storeFormOwner.trim() || undefined,
        phone: storeFormPhone.trim() || undefined,
        shopCategory: storeFormCategory,
        address: storeFormAddress.trim() || 'Market Location',
        location: updatedLocation,
        assignedDays: storeFormAssignedDays.length > 0 ? storeFormAssignedDays : ['Monday'],
        assignedSalesperson: storeFormAssignedSalesperson,
        routeSequence: Number(storeFormSequence) || (stores.length + 1),
        notes: storeFormNotes.trim() || undefined,
        assignedDates: storeFormAssignedDate ? [storeFormAssignedDate] : undefined,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setStores(prev => [...prev, newStore]);
    }

    setShowStoreModal(false);
    setEditingStore(null);
    setPinDropperTempLocation(null);
    setIsPinDropperActive(false);

    // Pan map to saved store
    if (mapSettings.mapEngine === 'google' && googleMapInstance) {
      googleMapInstance.panTo({ lat: Number(storeFormLat), lng: Number(storeFormLng) });
      googleMapInstance.setZoom(16);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([Number(storeFormLat), Number(storeFormLng)], 15, { animate: true });
    }
  };

  const handleDeleteStore = (store: StoreLocation) => {
    setStoreToDelete(store);
  };

  const handleConfirmDeleteStore = () => {
    if (!storeToDelete) return;
    setStores(prev => prev.filter(s => s.id !== storeToDelete.id));
    setStoreToDelete(null);
    if (selectedStopForInfo?.id === storeToDelete.id) {
      setSelectedStopForInfo(null);
    }
  };

  const handleToggleStoreDay = (storeId: string, day: DayOfWeek) => {
    setStores(prev => prev.map(s => {
      if (s.id !== storeId) return s;
      const exists = s.assignedDays.includes(day);
      const updated = exists ? s.assignedDays.filter(d => d !== day) : [...s.assignedDays, day];
      return { ...s, assignedDays: updated.length > 0 ? updated : [day] };
    }));
  };

  const handleStartPinDropper = (target: 'store' | 'godown' | 'pickup' = 'store', pickupPointId?: string) => {
    setPinDropperTarget(target);
    setPinDropperPickupPointId(pickupPointId || null);
    setIsPinDropperActive(true);
    setShowStoreModal(false);
    setShowGodownModal(false);
    setShowStockPickupModal(false);
  };

  const handleMapClickToSetLocation = async (lat: number, lng: number) => {
    const resolvedAddress = await fetchAddressFromCoords(lat, lng);

    if (pinDropperTarget === 'godown') {
      setGodownFacility(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: resolvedAddress || prev.address,
        updatedAt: new Date().toISOString(),
      }));
      setIsPinDropperActive(false);
      setLogisticsToast({
        title: '🏢 Godown Marked on Map',
        message: `Set Central Godown at ${resolvedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}`,
      });
      setShowGodownModal(true);
      return;
    }

    if (pinDropperTarget === 'pickup') {
      if (pinDropperPickupPointId && pinDropperPickupPointId !== 'new') {
        setStockPickupPoints(prev => prev.map(p => {
          if (p.id !== pinDropperPickupPointId) return p;
          return {
            ...p,
            latitude: lat,
            longitude: lng,
            address: resolvedAddress || p.address,
          };
        }));
      }
      setIsPinDropperActive(false);
      setLogisticsToast({
        title: '📦 Stock Pickup Point Marked',
        message: `Set pickup location at ${resolvedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}`,
      });
      setShowStockPickupModal(true);
      return;
    }

    // Default: 'store'
    setPinDropperTempLocation({ lat, lng });
    setStoreFormLat(lat);
    setStoreFormLng(lng);
    setStoreFormAddress(resolvedAddress);
    setIsPinDropperActive(false);
    setShowStoreModal(true);
  };

  // High-Precision Robot GPS Capture Handler
  const handleTriggerRobotGps = async (
    target: 'godown' | 'pickup' | 'store' | 'bill' | 'counter',
    pickupPointId?: string
  ) => {
    const targetTitle = target === 'godown'
      ? 'Central Godown (Warehouse)'
      : target === 'pickup'
      ? 'Stock Pickup Bay'
      : target === 'store'
      ? 'Store Location'
      : target === 'bill'
      ? 'Billing Counter'
      : 'Counter Location';

    setRobotGpsProgress({
      active: true,
      stageText: '📡 Calibrating Robot GNSS Hardware...',
      currentAccuracy: 0,
      bestAccuracy: 0,
      samplesCollected: 0,
      targetSamples: mapSettings.robotGpsSampleCount || 5,
      isLocked: false,
      targetTitle,
    });

    try {
      const res = await captureRobotPrecisionGps({
        enabled: mapSettings.robotGpsEnabled,
        minAccuracyMeters: mapSettings.robotGpsMinAccuracy || 5,
        sampleCount: mapSettings.robotGpsSampleCount || 5,
        outlierFilter: mapSettings.robotGpsOutlierFilter,
        captureTheta: mapSettings.robotGpsCaptureTheta,
      }, (status) => {
        setRobotGpsProgress(prev => prev ? { ...prev, ...status } : null);
      });

      const resolvedAddr = await fetchAddressFromCoords(res.latitude, res.longitude);

      setTimeout(() => {
        setRobotGpsProgress(null);

        if (target === 'godown') {
          setGodownFacility(prev => ({
            ...prev,
            latitude: res.latitude,
            longitude: res.longitude,
            accuracyMeters: res.accuracyMeters,
            thetaBearing: res.thetaDegrees,
            address: resolvedAddr || prev.address,
            updatedAt: new Date().toISOString(),
          }));
          setLogisticsToast({
            title: '🏢 Godown Robot GPS Locked',
            message: `Locked at [${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}] (θ=${res.thetaDegrees || 0}°) with ±${res.accuracyMeters}m precision!`,
          });
        } else if (target === 'pickup') {
          if (pickupPointId && pickupPointId !== 'new') {
            setStockPickupPoints(prev => prev.map(p => {
              if (p.id !== pickupPointId) return p;
              return {
                ...p,
                latitude: res.latitude,
                longitude: res.longitude,
                accuracyMeters: res.accuracyMeters,
                thetaBearing: res.thetaDegrees,
                address: resolvedAddr || p.address,
              };
            }));
          }
          setLogisticsToast({
            title: '📦 Stock Pickup Point Synced',
            message: `Locked loading bay coordinates (θ=${res.thetaDegrees || 0}°) with ±${res.accuracyMeters}m robot accuracy!`,
          });
        } else if (target === 'store') {
          setStoreFormLat(res.latitude);
          setStoreFormLng(res.longitude);
          setStoreFormAddress(resolvedAddr);
          setLogisticsToast({
            title: '🏪 Shop Location Synced',
            message: `Accurate shop coordinates locked: ±${res.accuracyMeters}m error radius.`,
          });
        } else if (target === 'bill') {
          setBillCoords({ lat: res.latitude, lng: res.longitude });
          setBillShopAddress(resolvedAddr);
        } else {
          setCounterCoords({ lat: res.latitude, lng: res.longitude });
          setNewShopAddress(resolvedAddr);
        }
      }, 400);
    } catch (err: any) {
      console.warn('Robot GPS capture error:', err);
      setRobotGpsProgress(null);
      if (err.message?.toLowerCase().includes('denied') || err.message?.toLowerCase().includes('permission') || err.code === 1) {
        handleOpenLocationAccessRequest('Robot-grade precision GPS requires browser location permission. Please allow access below to lock high-precision coordinates.');
      } else {
        handleOpenLocationAccessRequest(`GPS Sensor Notice: ${err.message || 'Location signal unavailable. Check device settings.'}`);
      }
    }
  };

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
    if (mapSettings.robotGpsEnabled) {
      handleTriggerRobotGps(target);
      return;
    }

    if (!navigator.geolocation) {
      handleOpenLocationAccessRequest('Geolocation is not supported by your browser.');
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
        if (err.code === err.PERMISSION_DENIED) {
          handleOpenLocationAccessRequest('Location access was denied. Please allow location permissions in your browser to capture counter GPS.');
        }
        const fallback = {
          lat: godownFacility.latitude + (Math.random() - 0.5) * 0.015,
          lng: godownFacility.longitude + (Math.random() - 0.5) * 0.015,
        };
        if (target === 'bill') {
          setBillCoords(fallback);
        } else {
          setCounterCoords(fallback);
        }
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
    if (mapSettings.robotGpsEnabled) {
      handleTriggerRobotGps(target);
      return;
    }

    if (!navigator.geolocation) {
      handleOpenLocationAccessRequest('Geolocation is not supported by your browser.');
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
        if (err.code === err.PERMISSION_DENIED) {
          handleOpenLocationAccessRequest('Location access was denied. Please allow location permissions in your browser to auto-fill address from GPS.');
        }
        const fallback = target === 'bill'
          ? (billCoords || { lat: godownFacility.latitude, lng: godownFacility.longitude })
          : (counterCoords || { lat: godownFacility.latitude, lng: godownFacility.longitude });
        if (target === 'bill') {
          setBillCoords(fallback);
        } else {
          setCounterCoords(fallback);
        }
        setIsSyncingAddressGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
    handleOpenNotBoughtRemarksModal(stop);
  };

  const handleOpenNotBoughtRemarksModal = (stop?: ParsedRouteStop) => {
    if (stop) {
      setEditingNotBoughtStop(stop);
      setNotBoughtShopName(stop.storeName);
      setNotBoughtSalesperson(stop.salesPerson || (selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan'));
      setNotBoughtReason(stop.unsoldReason || 'Stock Already Full');
      setNotBoughtRemarks(stop.unsoldNotes || '');
      setNotBoughtFollowUpDate(stop.visitRecord?.followUpDate || '');
      setNotBoughtIsNewApproach(Boolean(stop.visitRecord?.isNewShopProspect || stop.visitStatus === 'approaching'));
      setCounterCoords({ lat: stop.latitude, lng: stop.longitude });
    } else {
      setEditingNotBoughtStop(null);
      setNotBoughtShopName('');
      setNotBoughtSalesperson(selectedSalesperson !== 'all' ? selectedSalesperson : 'K. Saravanan');
      setNotBoughtReason('Stock Already Full');
      setNotBoughtRemarks('');
      setNotBoughtFollowUpDate('');
      setNotBoughtIsNewApproach(false);
      setCounterCoords(null);
    }
    setShowNotBoughtRemarksModal(true);
  };

  const handleSaveNotBoughtRemarks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notBoughtShopName.trim()) {
      alert('Please enter a shop / customer name');
      return;
    }
    const today = selectedDate || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const lat = counterCoords?.lat || (editingNotBoughtStop ? editingNotBoughtStop.latitude : DEFAULT_DEPOT.latitude + (Math.random() - 0.5) * 0.02);
    const lng = counterCoords?.lng || (editingNotBoughtStop ? editingNotBoughtStop.longitude : DEFAULT_DEPOT.longitude + (Math.random() - 0.5) * 0.02);

    setVisits(prev => {
      const matchIndex = prev.findIndex(v => 
        (editingNotBoughtStop && v.id === editingNotBoughtStop.id) ||
        v.shopName.toLowerCase() === notBoughtShopName.trim().toLowerCase()
      );

      if (matchIndex >= 0) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          status: 'unsold',
          date: today,
          time: nowTime,
          salesperson: notBoughtSalesperson,
          unsoldReason: notBoughtReason,
          unsoldNotes: notBoughtRemarks.trim() || undefined,
          followUpDate: notBoughtFollowUpDate || undefined,
          isNewShopProspect: notBoughtIsNewApproach,
        };
        return updated;
      }

      const newRecord: SalesVisitRecord = {
        id: `visit_not_bought_${Date.now()}`,
        shopName: notBoughtShopName.trim(),
        date: today,
        time: nowTime,
        salesperson: notBoughtSalesperson,
        status: 'unsold',
        location: {
          latitude: lat,
          longitude: lng,
          accuracyMeters: 10,
          address: notBoughtShopName.trim(),
        },
        unsoldReason: notBoughtReason,
        unsoldNotes: notBoughtRemarks.trim() || undefined,
        followUpDate: notBoughtFollowUpDate || undefined,
        isNewShopProspect: notBoughtIsNewApproach,
      };
      return [newRecord, ...prev];
    });

    setShowNotBoughtRemarksModal(false);
    setEditingNotBoughtStop(null);
  };

  const handleCeoAssignStore = (storeId: string, assignedSalesperson: string, assignedDays?: DayOfWeek[], isNewApproach?: boolean, notes?: string) => {
    setStores(prev => prev.map(s => {
      if (s.id !== storeId) return s;
      return {
        ...s,
        assignedSalesperson,
        assignedDays: assignedDays || s.assignedDays,
        notes: notes !== undefined ? notes : s.notes,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const handleClearRouteData = () => {
    setVisits([]);
    localStorage.removeItem('snack_sales_visits');
    setShowClearRouteModal(false);
    if (onClearRouteTracking) {
      onClearRouteTracking();
    }
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
  // Active route day of the week computed from selectedDate or selectedDayOfWeek
  const activeRouteDay = useMemo<DayOfWeek>(() => {
    if (selectedDayOfWeek !== 'all') return selectedDayOfWeek;
    return getDayOfWeekFromDate(selectedDate);
  }, [selectedDayOfWeek, selectedDate]);

  // Main Route & Scheduled Stores Processing Memo
  const routeStops = useMemo<ParsedRouteStop[]>(() => {
    const rawStops: Array<{
      id: string;
      visitStatus: VisitBillingStatus;
      sale?: SaleEntry;
      visitRecord?: SalesVisitRecord;
      storeLocation?: StoreLocation;
      storeName: string;
      address: string;
      invoiceNumber?: string;
      totalAmount: number;
      date: string;
      timeString: string;
      timestampSortKey: string;
      sequencePriority: number;
      salesPerson: string;
      hasGps: boolean;
      lat: number;
      lng: number;
      unsoldReason?: UnsoldReason;
      unsoldNotes?: string;
      shopCategory?: string;
      phone?: string;
      ownerName?: string;
      assignedDays?: DayOfWeek[];
    }> = [];

    const matchedSaleIds = new Set<string>();
    const matchedVisitIds = new Set<string>();

    // 1. Process Stores scheduled for this Day of Week or Date
    const scheduledStores = stores.filter(st => {
      if (st.active === false) return false;
      if (selectedSalesperson !== 'all' && st.assignedSalesperson && st.assignedSalesperson.toLowerCase() !== selectedSalesperson.toLowerCase()) {
        return false;
      }
      if (selectedDayOfWeek !== 'all') {
        return st.assignedDays && st.assignedDays.includes(selectedDayOfWeek);
      }
      if (routeFilterMode === 'date') {
        const matchesDay = st.assignedDays && st.assignedDays.includes(activeRouteDay);
        const matchesDate = st.assignedDates && st.assignedDates.includes(selectedDate);
        return matchesDay || matchesDate;
      }
      return true; // 'all'
    });

    scheduledStores.forEach(st => {
      // Find matching billed sale on selectedDate
      const matchedSale = salesEntries.find(s => {
        if (s.isCancelled) return false;
        if (selectedDate && s.date !== selectedDate) return false;
        if (selectedSalesperson !== 'all' && (s.salesPerson || '').toLowerCase() !== selectedSalesperson.toLowerCase()) return false;
        const nameMatches = s.customerName && s.customerName.trim().toLowerCase() === st.shopName.trim().toLowerCase();
        const coordsMatch = s.location?.latitude && Math.abs(s.location.latitude - st.location.latitude) < 0.002 && Math.abs(s.location.longitude - st.location.longitude) < 0.002;
        return Boolean(nameMatches || coordsMatch);
      });

      // Find matching unsold or visit record on selectedDate
      const matchedVisit = visits.find(v => {
        if (selectedDate && v.date !== selectedDate) return false;
        if (selectedSalesperson !== 'all' && (v.salesperson || '').toLowerCase() !== selectedSalesperson.toLowerCase()) return false;
        return v.shopName.trim().toLowerCase() === st.shopName.trim().toLowerCase();
      });

      if (matchedSale) {
        matchedSaleIds.add(matchedSale.id);
        if (mapSettings.showBilled) {
          rawStops.push({
            id: st.id,
            visitStatus: 'billed',
            sale: matchedSale,
            storeLocation: st,
            storeName: st.shopName,
            address: st.address || matchedSale.customerAddress || 'Store Location',
            invoiceNumber: matchedSale.invoiceNumber,
            totalAmount: matchedSale.finalAmount || matchedSale.totalAmount || 0,
            date: matchedSale.date,
            timeString: matchedSale.time || '10:00 AM',
            timestampSortKey: matchedSale.time || '10:00 AM',
            sequencePriority: st.routeSequence || 50,
            salesPerson: matchedSale.salesPerson || st.assignedSalesperson || 'Sales Rep',
            hasGps: true,
            lat: st.location.latitude,
            lng: st.location.longitude,
            shopCategory: st.shopCategory || matchedSale.customerType,
            phone: st.phone || matchedSale.customerPhone,
            ownerName: st.ownerName,
            assignedDays: st.assignedDays,
          });
        }
      } else if (matchedVisit && matchedVisit.status === 'unsold') {
        matchedVisitIds.add(matchedVisit.id);
        if (mapSettings.showUnsold) {
          rawStops.push({
            id: st.id,
            visitStatus: 'unsold',
            visitRecord: matchedVisit,
            storeLocation: st,
            storeName: st.shopName,
            address: st.address || matchedVisit.address || 'Store Location',
            totalAmount: 0,
            date: matchedVisit.date,
            timeString: matchedVisit.time || '11:00 AM',
            timestampSortKey: matchedVisit.time || '11:00 AM',
            sequencePriority: st.routeSequence || 50,
            salesPerson: matchedVisit.salesperson || st.assignedSalesperson || 'Sales Rep',
            hasGps: true,
            lat: st.location.latitude,
            lng: st.location.longitude,
            unsoldReason: matchedVisit.unsoldReason,
            unsoldNotes: matchedVisit.unsoldNotes,
            shopCategory: st.shopCategory,
            phone: st.phone || matchedVisit.phone,
            ownerName: st.ownerName || matchedVisit.ownerName,
            assignedDays: st.assignedDays,
          });
        }
      } else {
        // Scheduled / Approaching prospective store
        if (mapSettings.showApproaching) {
          rawStops.push({
            id: st.id,
            visitStatus: 'approaching',
            storeLocation: st,
            storeName: st.shopName,
            address: st.address || 'Store Location',
            totalAmount: 0,
            date: selectedDate,
            timeString: `Scheduled (${st.assignedDays?.join(', ') || 'Route'})`,
            timestampSortKey: `seq_${String(st.routeSequence || 99).padStart(3, '0')}`,
            sequencePriority: st.routeSequence || 99,
            salesPerson: st.assignedSalesperson || selectedSalesperson !== 'all' ? selectedSalesperson : 'Sales Rep',
            hasGps: true,
            lat: st.location.latitude,
            lng: st.location.longitude,
            unsoldNotes: st.notes,
            shopCategory: st.shopCategory,
            phone: st.phone,
            ownerName: st.ownerName,
            assignedDays: st.assignedDays,
          });
        }
      }
    });

    // 2. Process Unmatched Billed Sales (ad-hoc counter invoices on this date)
    if (mapSettings.showBilled) {
      salesEntries.filter(s => !s.isCancelled && !matchedSaleIds.has(s.id)).forEach((sale, idx) => {
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
          sequencePriority: 100 + idx,
          salesPerson: sale.salesPerson || 'Sales Executive',
          hasGps: coords.hasGps,
          lat: coords.lat,
          lng: coords.lng,
          shopCategory: sale.customerType,
          phone: sale.customerPhone,
        });
      });
    }

    // 3. Process Unmatched Unsold Visits & Approaching Leads
    visits.filter(v => !matchedVisitIds.has(v.id)).forEach((v, idx) => {
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
        sequencePriority: 200 + idx,
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

    // 4. Filter by visitStatusFilter if clicked
    let filtered = rawStops;
    if (visitStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.visitStatus === visitStatusFilter);
    }

    // 5. Sort stops: Prioritize custom order or Route Sequence Priority, then chronological timestamp
    if (customStopOrder.length > 0) {
      filtered.sort((a, b) => {
        const idxA = customStopOrder.indexOf(a.id);
        const idxB = customStopOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a.sequencePriority !== b.sequencePriority) {
          return a.sequencePriority - b.sequencePriority;
        }
        return a.timestampSortKey.localeCompare(b.timestampSortKey);
      });
    } else {
      filtered.sort((a, b) => {
        if (a.sequencePriority !== b.sequencePriority) {
          return a.sequencePriority - b.sequencePriority;
        }
        return a.timestampSortKey.localeCompare(b.timestampSortKey);
      });
    }

    if (isRouteReversed) {
      filtered.reverse();
    }

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
        storeLocation: item.storeLocation,
        assignedDays: item.assignedDays,
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
        salesPerson: item.salesPerson,
      });

      prevLat = item.lat;
      prevLng = item.lng;
      prevTimeMs = stopTimeMs;
      previousBearing = currentBearing;
    });

    return stops;
  }, [
    salesEntries,
    visits,
    stores,
    selectedDate,
    selectedSalesperson,
    selectedDayOfWeek,
    routeFilterMode,
    activeRouteDay,
    mapSettings,
    visitStatusFilter,
    customStopOrder,
    isRouteReversed
  ]);

  // Filter stops based on deviation tab and live search input
  const displayStops = useMemo(() => {
    let stops = routeStops;
    if (selectedDeviationFilter === 'deviations_only') {
      stops = stops.filter(s => s.isDeviation);
    } else if (selectedDeviationFilter === 'sequential_only') {
      stops = stops.filter(s => !s.isDeviation);
    }

    if (itinerarySearchQuery.trim()) {
      const q = itinerarySearchQuery.toLowerCase();
      stops = stops.filter(s =>
        s.storeName.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(q))
      );
    }

    return stops;
  }, [routeStops, selectedDeviationFilter, itinerarySearchQuery]);

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

  // Commercial Turn-by-Turn Navigation Legs
  const navigationLegs = useMemo(() => {
    if (routeStops.length === 0) return [];
    const legs: Array<{
      stepNumber: number;
      fromName: string;
      fromCoords: { lat: number; lng: number };
      toStop: ParsedRouteStop;
      distanceKm: number;
      estMins: number;
      navUrl: string;
    }> = [];

    let prevName = DEFAULT_DEPOT.name;
    let prevLat = DEFAULT_DEPOT.latitude;
    let prevLng = DEFAULT_DEPOT.longitude;

    routeStops.forEach((stop, idx) => {
      const dist = calculateDistanceKm(prevLat, prevLng, stop.latitude, stop.longitude);
      const estMins = Math.max(3, Math.round(dist * 2.5));
      const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${prevLat},${prevLng}&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;

      legs.push({
        stepNumber: idx + 1,
        fromName: prevName,
        fromCoords: { lat: prevLat, lng: prevLng },
        toStop: stop,
        distanceKm: Math.round(dist * 10) / 10,
        estMins,
        navUrl,
      });

      prevName = stop.storeName;
      prevLat = stop.latitude;
      prevLng = stop.longitude;
    });

    return legs;
  }, [routeStops]);

  // Move a stop up or down in the sequence
  const handleMoveStop = (stopId: string, direction: 'up' | 'down') => {
    const currentIds = routeStops.map(s => s.id);
    const index = currentIds.indexOf(stopId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const updated = [...currentIds];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCustomStopOrder(updated);
  };

  // Route Optimization (TSP Nearest-Neighbor shortest circuit from Central Depot)
  const handleOptimizeRouteSequence = () => {
    if (routeStops.length <= 1) return;
    const unvisited = [...routeStops];
    const optimizedOrder: string[] = [];
    let currentLat = DEFAULT_DEPOT.latitude;
    let currentLng = DEFAULT_DEPOT.longitude;

    let originalTotalDistance = 0;
    let optLat = DEFAULT_DEPOT.latitude;
    let optLng = DEFAULT_DEPOT.longitude;
    routeStops.forEach(s => {
      originalTotalDistance += calculateDistanceKm(optLat, optLng, s.latitude, s.longitude);
      optLat = s.latitude;
      optLng = s.longitude;
    });

    let optimizedTotalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateDistanceKm(currentLat, currentLng, unvisited[i].latitude, unvisited[i].longitude);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      optimizedOrder.push(nextStop.id);
      optimizedTotalDistance += minDistance;
      currentLat = nextStop.latitude;
      currentLng = nextStop.longitude;
    }

    const savedKm = Math.max(0, Math.round((originalTotalDistance - optimizedTotalDistance) * 10) / 10);
    const savedMins = Math.round(savedKm * 2.5);

    setCustomStopOrder(optimizedOrder);
    setOptimizationSummary({
      originalKm: Math.round(originalTotalDistance * 10) / 10,
      optimizedKm: Math.round(optimizedTotalDistance * 10) / 10,
      savedKm,
      savedMins,
    });
    setShowOptimizationToast(true);
  };

  const handleReverseRoute = () => {
    setIsRouteReversed(prev => !prev);
  };

  const handleOpenGoogleMapsMultiStop = () => {
    if (routeStops.length === 0) return;
    if (googleMapsRouteUrl) {
      window.open(googleMapsRouteUrl, '_blank');
    }
  };

  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      handleOpenLocationAccessRequest('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLiveLocation(coords);
        setIsLocatingUser(false);

        if (googleMapInstance) {
          googleMapInstance.panTo(coords);
          googleMapInstance.setZoom(16);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          handleOpenLocationAccessRequest('Location access was denied. Please allow location permissions in your browser to center the map on your position.');
        } else {
          handleOpenLocationAccessRequest('Could not determine your device location. Please ensure location services are enabled.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFitAllBounds = () => {
    if (googleMapInstance) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude });
      routeStops.forEach(s => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      googleMapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
    if (mapInstanceRef.current && routeStops.length > 0) {
      const latlngs: L.LatLngExpression[] = [
        [DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude],
        ...routeStops.map(s => [s.latitude, s.longitude] as L.LatLngExpression),
      ];
      mapInstanceRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    }
  };

  const generateWhatsAppManifestText = () => {
    const lines: string[] = [];
    lines.push(`🚚 *DELIVERY ROUTE DISPATCH MANIFEST*`);
    lines.push(`📅 *Date:* ${selectedDate} (${selectedDayOfWeek !== 'all' ? selectedDayOfWeek : 'Daily Route'})`);
    lines.push(`👤 *Assigned Rep:* ${selectedSalesperson !== 'all' ? selectedSalesperson : 'Sales Team'}`);
    lines.push(`📍 *Central Factory Depot:* ${DEFAULT_DEPOT.name}`);
    lines.push(`📦 *Total Stops:* ${routeStops.length} | *Est. Circuit:* ${metrics.totalDistanceKm} km`);
    lines.push(`----------------------------------------`);

    routeStops.forEach((stop) => {
      const statusIcon = stop.visitStatus === 'billed' ? '✅ BILLED' : stop.visitStatus === 'unsold' ? '⚠️ UNSOLD' : '🏪 SCHEDULED';
      lines.push(`\n*${stop.sequenceNumber}. ${stop.storeName}* [${statusIcon}]`);
      if (stop.phone) lines.push(`📞 Phone: ${stop.phone}`);
      lines.push(`🏠 Address: ${stop.address}`);
      if (stop.totalAmount > 0) lines.push(`💰 Amount: ₹${stop.totalAmount.toLocaleString('en-IN')}`);
      if (stop.unsoldReason) lines.push(`📝 Reason: ${stop.unsoldReason}`);
      lines.push(`🧭 Google Maps Pin: https://maps.google.com/?q=${stop.latitude},${stop.longitude}`);
    });

    lines.push(`\n----------------------------------------`);
    lines.push(`🔗 *Open Full Turn-by-Turn Route Navigation:*`);
    lines.push(googleMapsRouteUrl);

    return lines.join('\n');
  };

  const handleCopyWhatsAppManifest = () => {
    const text = generateWhatsAppManifestText();
    navigator.clipboard.writeText(text);
    setCopiedManifestFeedback(true);
    setTimeout(() => setCopiedManifestFeedback(false), 2500);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude],
        zoom: 13,
        zoomControl: true,
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isPinDropperActiveRef.current) {
          handleMapClickToSetLocation(e.latlng.lat, e.latlng.lng);
        } else if (isCreateRouteModeRef.current) {
          handleAddCustomRoutePoint(e.latlng.lat, e.latlng.lng);
        }
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
      customRouteLayerRef.current = L.layerGroup().addTo(map);
      distributionLinesLayerRef.current = L.layerGroup().addTo(map);

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
    const distLinesGroup = distributionLinesLayerRef.current;
    if (!map || !markersGroup || !polylineGroup) return;

    markersGroup.clearLayers();
    polylineGroup.clearLayers();
    if (distLinesGroup) {
      distLinesGroup.clearLayers();
    }

    // 1. Render Distribution Lines on Leaflet
    if (distLinesGroup && mapSettings.showDistributionLines && mapSettings.distributionLineMode !== 'none') {
      // Primary Inward Supply Lines (Pickup Bay -> Godown)
      if (mapSettings.distributionLineMode === 'all' || mapSettings.distributionLineMode === 'primary_supply') {
        stockPickupPoints.filter(p => p.active).forEach(pt => {
          const feederLine = L.polyline([
            [pt.latitude, pt.longitude],
            [godownFacility.latitude, godownFacility.longitude]
          ], {
            color: '#f59e0b',
            dashArray: '6, 8',
            weight: 3.5,
            opacity: 0.85
          });
          distLinesGroup.addLayer(feederLine);
        });
      }

      // Secondary Retail Beat Lines (Godown -> Stores)
      if (mapSettings.distributionLineMode === 'all' || mapSettings.distributionLineMode === 'retail_beat') {
        if (stores.length > 0) {
          const retailCoords: L.LatLngTuple[] = [
            [godownFacility.latitude, godownFacility.longitude],
            ...stores.map(s => [s.location.latitude, s.location.longitude] as L.LatLngTuple)
          ];
          const retailLine = L.polyline(retailCoords, {
            color: '#4f46e5',
            weight: 3,
            opacity: 0.75
          });
          distLinesGroup.addLayer(retailLine);
        }
      }
    }

    // 2. Render Central Godown Marker on Leaflet
    if (mapSettings.showGodownMarker) {
      const godownIcon = L.divIcon({
        className: 'custom-godown-pin',
        html: `
          <div style="background: linear-gradient(135deg, #d97706, #1e1b4b); color: white; border: 2px solid #fde68a; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; box-shadow: 0 4px 14px rgba(217,119,6,0.5);">
            🏢
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const godownMarker = L.marker([godownFacility.latitude, godownFacility.longitude], { icon: godownIcon });
      godownMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 4px; min-width: 210px;">
          <span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 9999px;">CENTRAL GODOWN (${godownFacility.code || 'MAIN'})</span>
          <h4 style="margin: 4px 0 2px 0; color: #0f172a; font-size: 13px; font-weight: 800;">${godownFacility.name}</h4>
          <div style="color: #64748b; font-size: 11px;">${godownFacility.address}</div>
          <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 11px;">
            <strong>Capacity:</strong> ${godownFacility.stockCapacityKg.toLocaleString()} kg | <strong>Manager:</strong> ${godownFacility.managerName}
          </div>
        </div>
      `);
      godownMarker.on('click', () => setShowGodownModal(true));
      markersGroup.addLayer(godownMarker);
    }

    // 3. Render Stock Pickup Points on Leaflet
    if (mapSettings.showStockPickupPoints) {
      stockPickupPoints.filter(p => p.active).forEach(pickup => {
        const pickupIcon = L.divIcon({
          className: 'custom-pickup-pin',
          html: `
            <div style="background-color: #f59e0b; color: white; border: 2px solid white; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; box-shadow: 0 3px 10px rgba(245,158,11,0.5);">
              📦
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const pickupMarker = L.marker([pickup.latitude, pickup.longitude], { icon: pickupIcon });
        pickupMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
            <span style="background: #fef3c7; color: #b45309; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 4px;">PICKUP BAY • ${pickup.pointType}</span>
            <h4 style="margin: 4px 0 2px 0; color: #1e293b; font-size: 13px; font-weight: 800;">${pickup.name}</h4>
            <div style="color: #64748b; font-size: 11px;">${pickup.address}</div>
            <div style="margin-top: 4px; font-size: 11px; color: #0f172a;">
              <strong>Stocks:</strong> ${pickup.stockItems.join(', ')}<br/>
              <strong>Dispatch:</strong> ${pickup.dispatchWindow}
            </div>
          </div>
        `);
        pickupMarker.on('click', () => setShowStockPickupModal(true));
        markersGroup.addLayer(pickupMarker);
      });
    }

    if (routeStops.length === 0) {
      map.setView([godownFacility.latitude, godownFacility.longitude], 13);
      return;
    }

    const latLngs: L.LatLngTuple[] = [];

    // Add Godown as Start
    latLngs.push([godownFacility.latitude, godownFacility.longitude]);
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
        if (isCreateRouteModeRef.current) {
          handleAddCustomRoutePoint(stop.latitude, stop.longitude, stop.storeLocation || stores.find(s => s.id === stop.id));
          return;
        }
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

  // Render Custom Route Waypoints & Polyline on Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    const customGroup = customRouteLayerRef.current;
    if (!map || !customGroup) return;

    customGroup.clearLayers();

    const points = customRouteDraft.points;
    if (points.length === 0) return;

    const latLngs: L.LatLngTuple[] = [];
    if (customRouteDraft.includeDepotStart) {
      latLngs.push([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude]);
    }

    points.forEach((pt, idx) => {
      latLngs.push([pt.lat, pt.lng]);

      const pinIcon = L.divIcon({
        className: `custom-route-pin-${pt.id}`,
        html: `
          <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; border: 2px solid white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 4px 12px rgba(124,58,237,0.5); cursor: pointer;">
            ${idx + 1}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const customMarker = L.marker([pt.lat, pt.lng], { icon: pinIcon });
      customMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 4px; min-width: 160px;">
          <strong style="color: #6b21a8; font-size: 13px;">#${idx + 1}. ${pt.name}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">${pt.address || `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`}</span><br/>
          <div style="color: #4338ca; font-weight: bold; margin-top: 4px; font-size: 11px;">+${pt.distanceFromPrevKm.toFixed(1)} km leg</div>
        </div>
      `);
      customGroup.addLayer(customMarker);
    });

    if (customRouteDraft.includeDepotFinish && points.length > 0) {
      latLngs.push([DEFAULT_DEPOT.latitude, DEFAULT_DEPOT.longitude]);
    }

    if (latLngs.length >= 2) {
      const polyline = L.polyline(latLngs, {
        color: '#9333ea',
        weight: 4,
        dashArray: '6, 6',
        opacity: 0.9,
      });
      customGroup.addLayer(polyline);
    }
  }, [customRouteDraft.points, customRouteDraft.includeDepotStart, customRouteDraft.includeDepotFinish]);

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

          {/* Salesperson Filter with Add Custom & Delete Options */}
          {availableSalespersons.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <select
                value={selectedSalesperson}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__add_custom__') {
                    const entered = prompt('Enter new custom salesperson / executive name:');
                    if (entered && entered.trim()) {
                      handleAddSalesperson(entered.trim());
                      setSelectedSalesperson(entered.trim());
                    }
                  } else if (val === '__manage_names__') {
                    setShowManageSalespersonsModal(true);
                  } else {
                    setSelectedSalesperson(val);
                  }
                }}
                className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-slate-800"
              >
                <option value="all">All Salespersons</option>
                {availableSalespersons.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__add_custom__">➕ Add Custom Name...</option>
                <option value="__manage_names__">⚙️ Add or Delete Names...</option>
              </select>

              {/* Quick Manage Names (Add / Delete) Button */}
              <button
                type="button"
                onClick={() => setShowManageSalespersonsModal(true)}
                className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                title="Add custom salesperson name, or delete existing names"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
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

          {/* Location Access Request & GPS Status Button */}
          <button
            type="button"
            onClick={() => handleOpenLocationAccessRequest()}
            className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              locationPermissionStatus === 'granted'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : locationPermissionStatus === 'denied'
                ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 ring-2 ring-indigo-200 animate-pulse'
            }`}
            title="Location Access: Manage device GPS hardware permissions for route synchronization"
          >
            {locationPermissionStatus === 'granted' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>📍 Location Active</span>
              </>
            ) : locationPermissionStatus === 'denied' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>⚠️ Location Blocked - Fix</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                <span>📍 Request Location Access</span>
              </>
            )}
          </button>

          {/* Create Route on Map Interactive Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isCreateRouteMode;
              setIsCreateRouteMode(nextState);
              if (nextState) {
                setIsCreateRoutePanelCollapsed(false);
                setIsPinDropperActive(false);
              }
            }}
            className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isCreateRouteMode
                ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-purple-200'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
            }`}
            title="Interactive Route Builder: Click on the map to drop sequential waypoints, reorder stops, and plan new beats"
          >
            <Route className="w-3.5 h-3.5 text-purple-600" />
            <span>{isCreateRouteMode ? '🎯 Create Route Active' : '🗺️ Create Route on Map'}</span>
            {customRouteDraft.points.length > 0 && (
              <span className="px-1.5 py-0.2 bg-purple-700 text-white rounded-full text-[10px] font-mono">
                {customRouteDraft.points.length}
              </span>
            )}
          </button>

          {/* Universal Route Export Hub Button */}
          <button
            type="button"
            onClick={() => {
              setExportTargetSource(customRouteDraft.points.length > 0 ? 'custom' : 'daily');
              setShowExportRouteModal(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Universal Route Export Hub: Download Excel (.xlsx), CSV, GPX, KML, GeoJSON, Google Maps URL, or WhatsApp Manifest"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 Export Route</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-800 text-white rounded-full font-mono font-bold">
              {routeStops.length}
            </span>
          </button>

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
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </button>

          {/* CEO Route & Sales Assignment Hub Button */}
          <button
            type="button"
            onClick={() => setShowCeoAssignmentModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="CEO Route Management: Assign routes to sales representatives and set new approach beats"
          >
            <Route className="w-3.5 h-3.5 text-amber-200" />
            <span>👑 CEO Route Assignment</span>
          </button>

          {/* Clear Route Data Button */}
          <button
            type="button"
            onClick={() => setShowClearRouteModal(true)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Clear route visits, approach logs, and reset tracking data"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Route Data</span>
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

      {/* Location Access Recommendation Banner (When not yet granted) */}
      {locationPermissionStatus !== 'granted' && !isLocationBannerDismissed && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-indigo-700/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Navigation className="w-5 h-5 animate-pulse text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">Device Location Access Recommended</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  GPS Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Allow browser location permission to enable robot-grade GPS lock, auto-tag shop coordinates, and track delivery routes accurately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenLocationAccessRequest('Location access requested to sync your Godown, Shops List, and Stock Pickup Points.')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Allow Location Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLocationBannerDismissed(true);
                localStorage.setItem('snack_location_banner_dismissed', 'true');
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

          {/* Record This Time Not Bought Remarks Trigger */}
          <button
            type="button"
            onClick={() => {
              handleCaptureCurrentGps('counter');
              handleOpenNotBoughtRemarksModal();
            }}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Log remarks for visited stores where customer did not buy this time"
          >
            <XCircle className="w-3.5 h-3.5 text-amber-200" />
            <span>📝 Log "Not Bought" Remarks</span>
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

      {/* Route Scheduling & Store Assignment Bar: Monday to Sunday + Date Sync */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-2xs">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>Route Day Assignment</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {selectedDayOfWeek === 'all' ? 'All Days Master' : `${selectedDayOfWeek} Route`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Assign and filter delivery route stops across days of the week (Monday to Sunday) or selected date.
              </p>
            </div>
          </div>

          {/* Store & Logistics Actions: Godown, Shops List, Pickup Points, Distribution Lines, Route Builder */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Mark Central Godown / Warehouse Button */}
            <button
              type="button"
              onClick={() => setShowGodownModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/50"
              title="Mark and configure Central Godown, warehouse dispatch capacity, and coordinate origin"
            >
              <Warehouse className="w-3.5 h-3.5 text-amber-200" />
              <span>🏢 Mark Godown</span>
              <span className="text-[10px] bg-amber-900/60 text-amber-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                {godownFacility.code || 'GDN'}
              </span>
            </button>

            {/* 2. My Shops List Directory Button */}
            <button
              type="button"
              onClick={() => setShowStoreManagerModal(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Open My Shops List: View registered shops, set delivery sequences, edit pins, or search stores"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span>🏪 My Shops List</span>
              <span className="text-[10px] bg-indigo-900/80 text-indigo-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
                {stores.length}
              </span>
            </button>

            {/* 3. Stock Pickup Points Button */}
            <button
              type="button"
              onClick={() => setShowStockPickupModal(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mark and view stock pickup points (frying ovens, packaging shed, raw materials)"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              <span>📦 Stock Pickup Points</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full font-mono font-bold">
                {stockPickupPoints.length}
              </span>
            </button>

            {/* 4. Distribution Lines Network Button */}
            <button
              type="button"
              onClick={() => setShowDistributionLinesModal(true)}
              className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${
                mapSettings.showDistributionLines && mapSettings.distributionLineMode !== 'none'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 hover:bg-indigo-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
              title="View and configure supply feeder lines and retail beat distribution lines on map"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>⚡ Distribution Lines</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* 5. Create Route on Map Direct Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isCreateRouteMode;
                setIsCreateRouteMode(next);
                if (next) {
                  setIsCreateRoutePanelCollapsed(false);
                  setIsPinDropperActive(false);
                }
              }}
              className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isCreateRouteMode
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
              title="Click on the map to draw and build a new delivery route with sequential stops"
            >
              <Route className="w-3.5 h-3.5" />
              <span>{isCreateRouteMode ? 'Builder Active' : '🗺️ Create Route on Map'}</span>
            </button>

            {/* 6. Mark Location on Map Pin-Dropper Button */}
            <button
              type="button"
              onClick={() => handleStartPinDropper('store')}
              className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isPinDropperActive && pinDropperTarget === 'store'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-pulse'
                  : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
              }`}
              title="Click on the map to mark and drop a new store location pin"
            >
              <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isPinDropperActive && pinDropperTarget === 'store' ? 'Click Map to Mark Pin...' : '📍 Mark Shop Pin'}</span>
            </button>

            {/* 7. Add Store Location Modal Trigger */}
            <button
              type="button"
              onClick={() => handleOpenAddStore()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Shop</span>
            </button>
          </div>
        </div>

        {/* Days of Week Selector Strip: Monday to Sunday */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Select Route Day:
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedDayOfWeek('all');
                setRouteFilterMode('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDayOfWeek === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Days</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                {stores.length}
              </span>
            </button>

            {DAYS_OF_WEEK.map(day => {
              const count = stores.filter(st => st.active !== false && st.assignedDays && st.assignedDays.includes(day)).length;
              const isSelected = selectedDayOfWeek === day;
              const isToday = day === activeRouteDay;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDayOfWeek(day);
                    setRouteFilterMode('day_of_week');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 font-extrabold hover:bg-indigo-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={`View route for ${day} (${count} assigned stores)`}
                >
                  <span>{day}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {count}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Selected date falls on this day"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Date-to-Day Sync helper */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              Selected Date: <strong className="text-slate-800">{selectedDate}</strong> ({activeRouteDay})
            </span>
            {selectedDayOfWeek !== activeRouteDay && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDayOfWeek(activeRouteDay);
                  setRouteFilterMode('day_of_week');
                }}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[11px] cursor-pointer"
              >
                Switch to {activeRouteDay}
              </button>
            )}
          </div>
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
            {/* Pin Dropper Active Notification Overlay */}
            {isPinDropperActive && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white px-4 py-2 rounded-xl shadow-xl border border-amber-300 flex items-center gap-3 animate-pulse pointer-events-auto">
                <div className="flex items-center gap-2 text-xs font-black">
                  <Crosshair className="w-4 h-4 animate-spin" />
                  <span>CLICK ANYWHERE ON MAP TO MARK & DROP STORE PIN</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinDropperActive(false)}
                  className="px-2 py-0.5 bg-black/25 hover:bg-black/40 rounded text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

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
                    onClick={(e) => {
                      if (isPinDropperActiveRef.current && e.detail.latLng) {
                        handleMapClickToSetLocation(e.detail.latLng.lat, e.detail.latLng.lng);
                      } else if (isCreateRouteModeRef.current && e.detail.latLng) {
                        handleAddCustomRoutePoint(e.detail.latLng.lat, e.detail.latLng.lng);
                      }
                    }}
                  >
                    <GoogleMapController onMapLoad={setGoogleMapInstance} />
                    <GoogleMapBoundsController
                      routeStops={routeStops}
                      playbackStep={playbackStep}
                      highlightedStopId={highlightedStopId}
                      depot={godownFacility}
                    />
                    <GoogleMapPolylinesAndGeofence
                      routeStops={routeStops}
                      depot={godownFacility}
                      showPolylines={mapSettings.showPolylines}
                      highlightedStopId={highlightedStopId}
                      geofenceRadius={mapSettings.geofenceRadiusMeters}
                    />

                    {/* Distribution Lines Network Overlay on Google Maps */}
                    <GoogleMapDistributionLinesOverlay
                      godown={godownFacility}
                      pickupPoints={stockPickupPoints}
                      stores={stores}
                      showDistributionLines={mapSettings.showDistributionLines}
                      distributionLineMode={mapSettings.distributionLineMode}
                    />

                    {/* Interactive Custom Route Polyline on Google Maps */}
                    <GoogleMapCustomRouteOverlay
                      customRoutePoints={customRouteDraft.points}
                      includeDepotStart={customRouteDraft.includeDepotStart}
                      includeDepotFinish={customRouteDraft.includeDepotFinish}
                      depot={godownFacility}
                    />

                    {/* Custom Route Waypoint Markers on Google Maps */}
                    {customRouteDraft.points.map((pt, idx) => (
                      <AdvancedMarker
                        key={pt.id}
                        position={{ lat: pt.lat, lng: pt.lng }}
                        title={`#${idx + 1}: ${pt.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete waypoint #${idx + 1} (${pt.name}) from draft?`)) {
                            handleRemoveCustomRoutePoint(pt.id);
                          }
                        }}
                      >
                        <div className="relative group cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border-2 border-white shadow-xl text-white font-black text-xs flex items-center justify-center ring-2 ring-purple-400 hover:scale-125 transition-transform">
                            #{idx + 1}
                          </div>
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-purple-950 text-purple-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none z-50">
                            {pt.name}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}

                    {/* Central Godown / Master Warehouse Marker */}
                    {mapSettings.showGodownMarker && (
                      <AdvancedMarker
                        position={{ lat: godownFacility.latitude, lng: godownFacility.longitude }}
                        title={`🏢 Godown: ${godownFacility.name}`}
                        onClick={() => {
                          setShowGodownModal(true);
                        }}
                      >
                        <div className="relative group cursor-pointer">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-indigo-950 to-amber-700 border-2 border-amber-300 text-white flex items-center justify-center text-xl shadow-2xl hover:scale-115 transition-transform ring-2 ring-amber-400/50">
                            🏢
                          </div>
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-500/40">
                            GODOWN: {godownFacility.name.slice(0, 18)}
                          </div>
                        </div>
                      </AdvancedMarker>
                    )}

                    {/* Stock Pickup Points Markers (Oven, Packaging, Inward Docks) */}
                    {mapSettings.showStockPickupPoints && stockPickupPoints.filter(p => p.active).map((pickup) => (
                      <AdvancedMarker
                        key={pickup.id}
                        position={{ lat: pickup.latitude, lng: pickup.longitude }}
                        title={`📦 Stock Pickup: ${pickup.name}`}
                        onClick={() => {
                          setShowStockPickupModal(true);
                        }}
                      >
                        <div className="relative group cursor-pointer">
                          <div className="w-9 h-9 rounded-xl bg-amber-500 border-2 border-white text-white flex items-center justify-center text-base shadow-xl hover:scale-120 transition-transform ring-2 ring-amber-300">
                            📦
                          </div>
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-950/90 text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none z-40 border border-amber-400/30">
                            {pickup.name.slice(0, 16)}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}

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
                            if (isCreateRouteModeRef.current) {
                              handleAddCustomRoutePoint(stop.latitude, stop.longitude, stop.storeLocation || stores.find(s => s.id === stop.id));
                              return;
                            }
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

                          {/* Quick Store Location Edit & Delete Actions */}
                          {(() => {
                            const matchingStore = selectedStopForInfo.storeLocation || stores.find(st => st.id === selectedStopForInfo.id || st.shopName.toLowerCase() === selectedStopForInfo.storeName.toLowerCase());
                            if (!matchingStore) return null;
                            return (
                              <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditStore(matchingStore);
                                    setSelectedStopForInfo(null);
                                  }}
                                  className="flex-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-indigo-200"
                                  title="Edit store location name, coordinates, or delivery days"
                                >
                                  <Edit className="w-3 h-3 text-indigo-600" />
                                  <span>Edit Store</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteStore(matchingStore);
                                    setSelectedStopForInfo(null);
                                  }}
                                  className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-rose-200"
                                  title="Delete this store location"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                </button>
                              </div>
                            );
                          })()}
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

            {/* Empty State Overlay (only when not creating a route) */}
            {routeStops.length === 0 && !isCreateRouteMode && (
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateRouteMode(true);
                      setIsCreateRoutePanelCollapsed(false);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>🗺️ Create New Route on Map</span>
                  </button>

                  {onAddSampleRouteData && (
                    <button
                      type="button"
                      onClick={onAddSampleRouteData}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Sample Beat</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Create Route Mode Active Notification Banner */}
            {isCreateRouteMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-purple-800 to-indigo-800 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-purple-400/50 flex items-center gap-3 backdrop-blur-md max-w-[94%] pointer-events-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                  <span className="font-extrabold uppercase tracking-wider text-[11px] text-purple-200 shrink-0">
                    🎯 Route Builder Active:
                  </span>
                  <span className="text-[11px] text-purple-100 truncate">
                    Click anywhere on the map or click existing store markers to drop sequential waypoints
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoutePanelCollapsed(!isCreateRoutePanelCollapsed)}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    {isCreateRoutePanelCollapsed ? 'Show Builder' : 'Hide Builder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateRouteMode(false)}
                    className="px-2 py-1 bg-black/35 hover:bg-black/50 text-purple-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Floating Route Builder Panel / Drawer */}
            {isCreateRouteMode && !isCreateRoutePanelCollapsed && (
              <div className="absolute bottom-4 right-4 z-20 w-[94%] sm:w-[440px] max-w-full bg-white/95 backdrop-blur-md rounded-2xl border border-purple-300 shadow-2xl overflow-hidden flex flex-col max-h-[72vh] text-slate-800 pointer-events-auto">
                {/* Panel Header */}
                <div className="p-3 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between gap-2 border-b border-purple-800 shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                      <Route className="w-4 h-4 text-purple-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={customRouteDraft.routeName}
                        onChange={(e) => setCustomRouteDraft(prev => ({ ...prev, routeName: e.target.value }))}
                        className="bg-purple-950/60 border border-purple-700/60 rounded px-2 py-0.5 text-xs font-extrabold text-white w-full focus:outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="Enter Route Name..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCreateRoutePanelCollapsed(true)}
                      className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Minimize builder"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateRouteMode(false)}
                      className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Close builder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Route Summary Metric Strip */}
                <div className="px-3 py-2 bg-purple-50/90 border-b border-purple-100 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-purple-700 font-bold uppercase">Stops:</span>{' '}
                      <strong className="font-mono text-purple-950 font-extrabold">{customRouteStats.totalStops}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-700 font-bold uppercase">Distance:</span>{' '}
                      <strong className="font-mono text-purple-950 font-extrabold">~{customRouteStats.totalDistanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-700 font-bold uppercase">Time:</span>{' '}
                      <strong className="font-mono text-purple-950 font-extrabold">~{customRouteStats.estDriveMinutes}m</strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                    {customRouteDraft.assignedDay} Beat
                  </div>
                </div>

                {/* Configuration Bar: Rep, Day & Depot Checkbox */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-2 text-xs shrink-0">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Assigned Rep:</label>
                    <select
                      value={customRouteDraft.salesperson}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__add_custom__') {
                          const entered = prompt('Enter new custom salesperson / executive name:');
                          if (entered && entered.trim()) {
                            handleAddSalesperson(entered.trim());
                            setCustomRouteDraft(prev => ({ ...prev, salesperson: entered.trim() }));
                          }
                        } else if (val === '__manage_names__') {
                          setShowManageSalespersonsModal(true);
                        } else {
                          setCustomRouteDraft(prev => ({ ...prev, salesperson: val }));
                        }
                      }}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1 text-slate-800"
                    >
                      {availableSalespersons.length > 0 ? (
                        availableSalespersons.map(sp => (
                          <option key={sp} value={sp}>{sp}</option>
                        ))
                      ) : (
                        <option value="K. Saravanan">K. Saravanan</option>
                      )}
                      <option disabled>──────────</option>
                      <option value="__add_custom__">➕ Add Custom Name...</option>
                      <option value="__manage_names__">⚙️ Add or Delete Names...</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Route Day:</label>
                    <select
                      value={customRouteDraft.assignedDay}
                      onChange={(e) => setCustomRouteDraft(prev => ({ ...prev, assignedDay: e.target.value as DayOfWeek }))}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1 text-slate-800"
                    >
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={customRouteDraft.includeDepotStart}
                        onChange={(e) => setCustomRouteDraft(prev => ({ ...prev, includeDepotStart: e.target.checked }))}
                        className="rounded text-purple-600"
                      />
                      <span>Start from Depot ({DEFAULT_DEPOT.name})</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={customRouteDraft.includeDepotFinish}
                        onChange={(e) => setCustomRouteDraft(prev => ({ ...prev, includeDepotFinish: e.target.checked }))}
                        className="rounded text-purple-600"
                      />
                      <span>Return to Depot</span>
                    </label>
                  </div>
                </div>

                {/* Waypoints List */}
                <div className="p-2 overflow-y-auto max-h-[180px] divide-y divide-slate-100 flex-1">
                  {customRouteDraft.points.length === 0 ? (
                    <div className="p-4 text-center space-y-1.5 text-slate-500">
                      <MapPin className="w-6 h-6 text-purple-400 mx-auto animate-bounce" />
                      <p className="text-xs font-bold text-slate-700">No waypoints dropped yet</p>
                      <p className="text-[11px]">Click anywhere on the map or click existing store markers to drop stop #1.</p>
                    </div>
                  ) : (
                    customRouteDraft.points.map((pt, idx) => (
                      <div key={pt.id} className="py-1.5 flex items-center justify-between gap-2 group text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={pt.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomRouteDraft(prev => ({
                                  ...prev,
                                  points: prev.points.map(p => p.id === pt.id ? { ...p, name: val } : p),
                                }));
                              }}
                              className="font-bold text-slate-800 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full"
                            />
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                              <span className="truncate">{pt.address}</span>
                              <span className="text-purple-600 font-bold shrink-0">+{pt.distanceFromPrevKm.toFixed(1)} km</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveCustomRoutePoint(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Stop Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCustomRoutePoint(idx, 'down')}
                            disabled={idx === customRouteDraft.points.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Stop Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomRoutePoint(pt.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Delete Waypoint"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Advanced Optimization & Edit Actions */}
                {customRouteDraft.points.length > 0 && (
                  <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-[11px] shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleOptimizeCustomRoute}
                        disabled={customRouteDraft.points.length <= 2}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        title="Shortest path Traveling Salesperson nearest-neighbor sequence"
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>⚡ Optimize Order</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleReverseCustomRoute}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                        title="Reverse Stop Sequence"
                      >
                        🔄 Reverse
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleUndoLastCustomRoutePoint}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer flex items-center gap-1"
                        title="Undo Last Waypoint"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>Undo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCustomRoutePoints}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold cursor-pointer"
                        title="Clear all waypoints"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Footer Actions */}
                <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExportTargetSource('custom');
                      setShowExportRouteModal(true);
                    }}
                    disabled={customRouteDraft.points.length === 0}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="Export this custom route to Excel, GPX, KML, GeoJSON, Google Maps, or WhatsApp"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Route</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCustomRoute}
                    disabled={customRouteDraft.points.length === 0}
                    className="flex-1 py-1.5 px-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="Save this route to the Master Stores and schedule approach visits"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Save & Activate</span>
                  </button>
                </div>
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
                <span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-300"></span>
                <span className="font-semibold text-slate-700">Custom Route Waypoint</span>
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

                    {/* Visit Status Badge & Not Bought Remarks Details */}
                    <div className="pl-7 space-y-1">
                      {stop.visitStatus === 'billed' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Billed: ₹{stop.totalAmount.toLocaleString('en-IN')} {stop.invoiceNumber ? `(${stop.invoiceNumber})` : ''}</span>
                        </span>
                      ) : stop.visitStatus === 'unsold' ? (
                        <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-lg space-y-0.5 text-[10px]">
                          <div className="flex items-center gap-1 font-bold text-amber-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>⚠️ Not Bought This Time:</span>
                            <span className="underline">{stop.unsoldReason || 'No Order Given'}</span>
                          </div>
                          {stop.unsoldNotes && (
                            <p className="text-amber-800 italic pl-2.5">"{stop.unsoldNotes}"</p>
                          )}
                          {stop.visitRecord?.followUpDate && (
                            <p className="text-amber-700 font-mono text-[9px] pl-2.5">
                              📅 Scheduled Re-visit: {stop.visitRecord.followUpDate}
                            </p>
                          )}
                          {stop.salesPerson && (
                            <p className="text-slate-500 font-medium text-[9px] pl-2.5">
                              Approached by: {stop.salesPerson}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <span>🔵 New Approach Beat ({stop.shopCategory || 'Retail'}) • Assigned: {stop.salesPerson || 'Sales Rep'}</span>
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
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>🧾 Bill Sale</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenNotBoughtRemarksModal(stop)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>📝 Not Bought Remarks</span>
                          </button>
                        </>
                      )}
                      {stop.visitStatus === 'unsold' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenNotBoughtRemarksModal(stop)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Edit this time not bought remarks and reason"
                          >
                            <Edit className="w-2.5 h-2.5 text-amber-700" />
                            <span>Edit Remarks</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenBillModalForStop(stop)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Convert to Bill</span>
                          </button>
                        </>
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
                      {(() => {
                        const matchingStore = stop.storeLocation || stores.find(st => st.id === stop.id || st.shopName.toLowerCase() === stop.storeName.toLowerCase());
                        if (!matchingStore) return null;
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStore(matchingStore)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Edit store location & route days"
                            >
                              <Edit className="w-2.5 h-2.5 text-indigo-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStore(matchingStore)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                              title="Delete store location"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        );
                      })()}
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

              {/* 5. ROBOT-GRADE HIGH-PRECISION GPS LOCK ENGINE */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-600 animate-pulse" />
                    <span>Robot-Grade GPS Precision Engine (Theta θ & Accuracy Sync)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-50 text-cyan-800 border border-cyan-300">
                    {mapSettings.robotGpsEnabled ? '🤖 Robot Accuracy Active' : 'Standard Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Map Setting Option:</strong> Location capture by sync with GPS must be accurate as a robot. Enforces zero-delay hardware GNSS queries, multi-sample fixes, multipath drift rejection, weighted centroid calculations, and Theta (θ) heading angle lock.
                </p>

                {/* Location Access Request Status Row */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      locationPermissionStatus === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : locationPermissionStatus === 'denied'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}>
                      {locationPermissionStatus === 'granted' ? '✓' : locationPermissionStatus === 'denied' ? '⚠️' : '📍'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 block">Device Location Access:</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          locationPermissionStatus === 'granted'
                            ? 'bg-emerald-200 text-emerald-900'
                            : locationPermissionStatus === 'denied'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {locationPermissionStatus === 'granted' ? 'Active & Granted' : locationPermissionStatus === 'denied' ? 'Blocked' : 'Permission Required'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {locationPermissionStatus === 'granted'
                          ? 'Browser location access enabled for high-accuracy GPS.'
                          : locationPermissionStatus === 'denied'
                          ? 'Location permission blocked. Click button to view unblock instructions.'
                          : 'Click to trigger browser prompt to allow device GPS location access.'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenLocationAccessRequest('Verify or request browser location access for GPS synchronization.')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 ${
                      locationPermissionStatus === 'granted'
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        : locationPermissionStatus === 'denied'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{locationPermissionStatus === 'granted' ? 'Test GPS' : locationPermissionStatus === 'denied' ? 'Fix Access' : 'Request Access'}</span>
                  </button>
                </div>

                {/* Master Robot GPS Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-cyan-200 bg-cyan-50/40 hover:bg-cyan-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
                      🤖
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Enable Robot-Grade Precision GPS Sync
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Location capture by sync with GPS must be accurate as a robot across godown, shops list, and stock pickup points.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mapSettings.robotGpsEnabled}
                    onChange={(e) => setMapSettings(prev => ({ ...prev, robotGpsEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </label>

                {/* Tolerance & Sample Options */}
                {mapSettings.robotGpsEnabled && (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {/* Minimum Accuracy Tolerance */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">
                          Strict Accuracy Threshold
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-700">
                          ±{mapSettings.robotGpsMinAccuracy} meters
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { meters: 3, label: '3m (RTK)' },
                          { meters: 5, label: '5m (Robot)' },
                          { meters: 10, label: '10m (Standard)' },
                          { meters: 20, label: '20m (Permissive)' },
                        ].map(opt => (
                          <button
                            key={opt.meters}
                            type="button"
                            onClick={() => setMapSettings(prev => ({ ...prev, robotGpsMinAccuracy: opt.meters }))}
                            className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              mapSettings.robotGpsMinAccuracy === opt.meters
                                ? 'bg-cyan-600 text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-sample averaging count */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">
                          Satellite Fix Sample Averaging
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-700">
                          {mapSettings.robotGpsSampleCount} Fixes Averaged
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[3, 5, 8, 10].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setMapSettings(prev => ({ ...prev, robotGpsSampleCount: cnt }))}
                            className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              mapSettings.robotGpsSampleCount === cnt
                                ? 'bg-cyan-600 text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {cnt} Fixes
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theta Azimuth Orientation Lock Toggle */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100/70 cursor-pointer transition-colors">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Theta (θ) Heading & Bearing Angle Capture</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Calibrate directional orientation angle (0°–360° θ) during GPS sync for precision robot vehicle pathfinding
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mapSettings.robotGpsCaptureTheta}
                        onChange={(e) => setMapSettings(prev => ({ ...prev, robotGpsCaptureTheta: e.target.checked }))}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>

                    {/* Discard Outlier Multipath Drift */}
                    <label className="flex items-center justify-between pt-1 cursor-pointer">
                      <span className="text-xs text-slate-700 font-semibold">
                        Discard Multipath Reflection Outliers
                      </span>
                      <input
                        type="checkbox"
                        checked={mapSettings.robotGpsOutlierFilter}
                        onChange={(e) => setMapSettings(prev => ({ ...prev, robotGpsOutlierFilter: e.target.checked }))}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>

                    {/* Test & Calibrate Button */}
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowRobotCalibrationModal(true)}
                        className="w-full py-2 bg-gradient-to-r from-slate-900 to-cyan-950 hover:from-slate-800 hover:to-cyan-900 text-cyan-300 border border-cyan-600/40 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Bot className="w-4 h-4 text-cyan-400" />
                        <span>🤖 Test & Calibrate Robot GPS Sensor Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. SUPPLY CHAIN & LOGISTICS NETWORK LAYERS */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-amber-600" />
                  <span>Godown, Pickup Points & Distribution Lines</span>
                </h4>

                <div className="space-y-2">
                  {/* Central Godown Marker Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                        🏢
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Show Central Godown Marker</span>
                        <span className="text-[11px] text-slate-500">
                          Renders {godownFacility.name} ({godownFacility.code}) on map
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapSettings.showGodownMarker}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, showGodownMarker: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  {/* Stock Pickup Points Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                        📦
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Show Stock Pickup Points</span>
                        <span className="text-[11px] text-slate-500">
                          Frying ovens, packaging shed, and inward loading bays ({stockPickupPoints.length} points)
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapSettings.showStockPickupPoints}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, showStockPickupPoints: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  {/* Distribution Lines Display Mode */}
                  <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">Distribution Lines Mode</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {mapSettings.distributionLineMode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {[
                        { id: 'all', label: 'All Lines' },
                        { id: 'primary_supply', label: 'Supply Feeders' },
                        { id: 'retail_beat', label: 'Retail Beats' },
                        { id: 'none', label: 'Off / Hide' },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setMapSettings(prev => ({ ...prev, distributionLineMode: mode.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            mapSettings.distributionLineMode === mode.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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
                  robotGpsEnabled: true,
                  robotGpsMinAccuracy: 5,
                  robotGpsSampleCount: 5,
                  robotGpsOutlierFilter: true,
                  robotGpsCaptureTheta: true,
                  showGodownMarker: true,
                  showStockPickupPoints: true,
                  showDistributionLines: true,
                  distributionLineMode: 'all',
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

      {/* 3. RECORD / EDIT "THIS TIME NOT BOUGHT" REMARKS MODAL */}
      {(showUnsoldModal || showNotBoughtRemarksModal) && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingNotBoughtStop ? 'Edit "Not Bought" Remarks' : 'Log "This Time Not Bought" Remarks'}
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    Record salesperson approach remarks & reasons why store did not purchase this time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnsoldModal(false);
                  setShowNotBoughtRemarksModal(false);
                  setEditingNotBoughtStop(null);
                }}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotBoughtRemarks} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Store / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Kannan Tea Stall"
                    value={notBoughtShopName || unsoldShopName}
                    onChange={(e) => {
                      setNotBoughtShopName(e.target.value);
                      setUnsoldShopName(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Sales Representative
                  </label>
                  <select
                    value={notBoughtSalesperson}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__add_custom__') {
                        const entered = prompt('Enter new custom salesperson / executive name:');
                        if (entered && entered.trim()) {
                          handleAddSalesperson(entered.trim());
                          setNotBoughtSalesperson(entered.trim());
                        }
                      } else if (val === '__manage_names__') {
                        setShowManageSalespersonsModal(true);
                      } else {
                        setNotBoughtSalesperson(val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    {availableSalespersons.map(sp => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                    <option disabled>──────────</option>
                    <option value="__add_custom__">➕ Add Custom Name...</option>
                    <option value="__manage_names__">⚙️ Add or Delete Names...</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Reason Why Not Bought This Time *
                </label>
                <select
                  value={notBoughtReason}
                  onChange={(e) => {
                    const r = e.target.value as UnsoldReason;
                    setNotBoughtReason(r);
                    setUnsoldReason(r);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="Stock Already Full">📦 Stock Already Full (Previous inventory unsold)</option>
                  <option value="Owner / Decision Maker Not Available">👤 Owner / Decision Maker Not Available</option>
                  <option value="Existing Credit Pending">💳 Existing Credit / Previous Balance Pending</option>
                  <option value="Price / Margin Disagreement">💰 Price / Margin Disagreement (Demands higher cut)</option>
                  <option value="Competitor Brand Preferred">⚔️ Competitor Brand Preferred / Purchased</option>
                  <option value="Shop Closed">🚪 Shop Closed / Holiday</option>
                  <option value="Sample Given - Trial">🎁 Demanding Free Samples / Trial Pack First</option>
                  <option value="Other">📝 Other Specific Approach Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Sales Approach Remarks & Shop Feedback *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why they didn't buy this time (e.g. 'Shop incharge said owner at market till 2pm. Has 15 packs of Murukku left. Promised order next Tuesday morning.')"
                  value={notBoughtRemarks || unsoldNotes}
                  onChange={(e) => {
                    setNotBoughtRemarks(e.target.value);
                    setUnsoldNotes(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Scheduled Re-visit / Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={notBoughtFollowUpDate || unsoldFollowUpDate}
                    onChange={(e) => {
                      setNotBoughtFollowUpDate(e.target.value);
                      setUnsoldFollowUpDate(e.target.value);
                    }}
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
                    <span>{counterCoords ? '📍 GPS Locked' : '📍 Capture GPS Pin'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="not-bought-prospect-check"
                  checked={notBoughtIsNewApproach}
                  onChange={(e) => setNotBoughtIsNewApproach(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="not-bought-prospect-check" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Mark as New Approach Lead (Prospect Beat for Sales Representative)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsoldModal(false);
                    setShowNotBoughtRemarksModal(false);
                    setEditingNotBoughtStop(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save "Not Bought" Remarks (🟠)</span>
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

      {/* 5. STORE LOCATIONS DIRECTORY & ROUTE ASSIGNMENT MODAL */}
      {showStoreManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
                  <Store className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>🏪 My Shops List & Delivery Route Network</span>
                    <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                      {stores.length} Registered Shops
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mark and manage your retail shops list, drop location pins on map, sync with robot GPS, and assign beat schedules (Monday to Sunday)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportShopsListCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Export complete shops list with GPS coordinates as CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export Shops (CSV)</span>
                  <span className="sm:hidden">Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStoreManagerModal(false);
                    handleStartPinDropper('store');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Drop a pin on the map to mark a new store location"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>📍 Mark on Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenAddStore();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Shop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStoreManagerModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search stores by shop name, owner, phone, address..."
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Day of Week Filter Pills */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Filter Day:</span>
                <button
                  type="button"
                  onClick={() => setStoreManagerDayFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    storeManagerDayFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All ({stores.length})
                </button>
                {DAYS_OF_WEEK.map(day => {
                  const dayCount = stores.filter(st => st.assignedDays && st.assignedDays.includes(day)).length;
                  const isSelected = storeManagerDayFilter === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setStoreManagerDayFilter(day)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{day.slice(0, 3)}</span>
                      <span className={`text-[10px] px-1 rounded-full font-mono ${isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {dayCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stores List Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filteredStores = stores.filter(st => {
                  if (storeManagerDayFilter !== 'all' && (!st.assignedDays || !st.assignedDays.includes(storeManagerDayFilter))) {
                    return false;
                  }
                  if (storeSearchQuery.trim()) {
                    const q = storeSearchQuery.toLowerCase();
                    const matchName = st.shopName.toLowerCase().includes(q);
                    const matchOwner = (st.ownerName || '').toLowerCase().includes(q);
                    const matchPhone = (st.phone || '').includes(q);
                    const matchAddr = (st.address || '').toLowerCase().includes(q);
                    const matchCategory = (st.shopCategory || '').toLowerCase().includes(q);
                    return matchName || matchOwner || matchPhone || matchAddr || matchCategory;
                  }
                  return true;
                });

                if (filteredStores.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 space-y-3">
                      <Store className="w-10 h-10 mx-auto text-slate-300" />
                      <div>
                        <p className="font-bold text-sm text-slate-700">No stores found</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {storeSearchQuery ? 'Try adjusting your search query or day filter.' : 'Add your first store location to start marking your delivery beat routes.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddStore()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Store Location</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredStores.map(st => (
                      <div
                        key={st.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                              #{st.routeSequence || '—'}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-sm text-slate-900">{st.shopName}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                  {st.shopCategory || 'Retail Shop'}
                                </span>
                                {st.assignedSalesperson && (
                                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{st.assignedSalesperson}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{st.address}</span>
                              </p>
                              {(st.ownerName || st.phone) && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {st.ownerName && <span>Owner: <strong className="text-slate-700">{st.ownerName}</strong></span>}
                                  {st.ownerName && st.phone && <span> • </span>}
                                  {st.phone && <a href={`tel:${st.phone}`} className="text-indigo-600 hover:underline font-semibold">{st.phone}</a>}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setShowStoreManagerModal(false);
                                if (mapSettings.mapEngine === 'google' && googleMapInstance) {
                                  googleMapInstance.panTo({ lat: st.location.latitude, lng: st.location.longitude });
                                  googleMapInstance.setZoom(16);
                                } else if (mapInstanceRef.current) {
                                  mapInstanceRef.current.setView([st.location.latitude, st.location.longitude], 16, { animate: true });
                                }
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Center and view this store on the map"
                            >
                              <Navigation className="w-3 h-3 text-indigo-600" />
                              <span>Locate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditStore(st);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-indigo-200"
                              title="Edit store location, name, schedule or coordinates"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStore(st)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center cursor-pointer border border-rose-200"
                              title="Delete this store location"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          </div>
                        </div>

                        {/* Assigned Route Days - Interactive badges to toggle on/off */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Assigned Route Days:
                            </span>
                            {DAYS_OF_WEEK.map(day => {
                              const isAssigned = st.assignedDays && st.assignedDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => handleToggleStoreDay(st.id, day)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isAssigned
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                                  }`}
                                  title={`Click to ${isAssigned ? 'remove from' : 'assign to'} ${day} route`}
                                >
                                  {day.slice(0, 3)}
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[11px] font-mono text-slate-400">
                            GPS: {st.location.latitude.toFixed(4)}, {st.location.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
              <span>Tip: Click on any day badge (Mon..Sun) to quickly toggle route assignment for that day.</span>
              <button
                type="button"
                onClick={() => setShowStoreManagerModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD / EDIT STORE LOCATION MODAL */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <MapPinned className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingStore ? 'Edit Store Location & Schedule' : 'Add Store Location'}
                  </h3>
                  <p className="text-[11px] text-indigo-100">
                    Set store coordinates, mark on map, and assign delivery route days (Monday to Sunday)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStoreModal(false);
                  setEditingStore(null);
                }}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Store Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Store / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Sri Krishna Sweets & Bakery"
                    value={storeFormName}
                    onChange={(e) => setStoreFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Shop Category
                  </label>
                  <select
                    value={storeFormCategory}
                    onChange={(e) => setStoreFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Retail Shop">🏪 Retail Shop</option>
                    <option value="Wholesaler">🏢 Wholesaler</option>
                    <option value="Supermarket">🛒 Supermarket</option>
                    <option value="Bakery/Tea Stall">☕ Bakery / Tea Stall</option>
                    <option value="Canteen">🍽️ Canteen / Food Court</option>
                    <option value="Other">📍 Other Outlet</option>
                  </select>
                </div>
              </div>

              {/* Owner Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Owner / Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. K. Ramachandran"
                    value={storeFormOwner}
                    onChange={(e) => setStoreFormOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98421 11223"
                    value={storeFormPhone}
                    onChange={(e) => setStoreFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address with Reverse Geocoding */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Store Address / Landmark *</span>
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (storeFormLat && storeFormLng) {
                        const addr = await fetchAddressFromCoords(storeFormLat, storeFormLng);
                        setStoreFormAddress(addr);
                      }
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Auto-fill from GPS
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Periyar Bus Stand Road, Madurai"
                  value={storeFormAddress}
                  onChange={(e) => setStoreFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* GPS Coordinates & Mark on Map action */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    <span>GPS Coordinates (Latitude & Longitude)</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleTriggerRobotGps('store')}
                      className="px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Sync shop coordinates with robot-grade multi-sample GPS lock"
                    >
                      <Bot className="w-3 h-3 animate-pulse" />
                      <span>🤖 Robot GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCaptureCurrentGps('counter')}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold cursor-pointer"
                    >
                      {isGettingGps ? 'Locking...' : '📍 Device GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartPinDropper('store')}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3 text-amber-600" />
                      <span>🗺️ Mark on Map</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Latitude:</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={storeFormLat}
                      onChange={(e) => setStoreFormLat(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Longitude:</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={storeFormLng}
                      onChange={(e) => setStoreFormLng(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned Route Days: Monday to Sunday */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-extrabold text-indigo-950 uppercase flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assigned Route Days (Monday to Sunday) *</span>
                  </label>

                  {/* Quick Select Preset Buttons */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setStoreFormAssignedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
                      className="px-1.5 py-0.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 font-bold cursor-pointer"
                    >
                      Mon-Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreFormAssignedDays([...DAYS_OF_WEEK])}
                      className="px-1.5 py-0.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 font-bold cursor-pointer"
                    >
                      All 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreFormAssignedDays(['Monday', 'Wednesday', 'Friday'])}
                      className="px-1.5 py-0.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 font-bold cursor-pointer"
                    >
                      M-W-F
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreFormAssignedDays(['Tuesday', 'Thursday', 'Saturday'])}
                      className="px-1.5 py-0.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 font-bold cursor-pointer"
                    >
                      T-T-S
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreFormAssignedDays([])}
                      className="px-1.5 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isChecked = storeFormAssignedDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStoreFormAssignedDays(prev => [...prev, day]);
                            } else {
                              setStoreFormAssignedDays(prev => prev.filter(d => d !== day));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                        />
                        <span>{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Date (optional), Salesperson & Route Sequence */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Assigned Specific Date
                  </label>
                  <input
                    type="date"
                    value={storeFormAssignedDate}
                    onChange={(e) => setStoreFormAssignedDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Optional calendar date</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Route Sequence #
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={storeFormSequence}
                    onChange={(e) => setStoreFormSequence(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Stop order along route</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Salesperson Assigned
                  </label>
                  <select
                    value={storeFormAssignedSalesperson}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__add_custom__') {
                        const entered = prompt('Enter new custom salesperson / executive name:');
                        if (entered && entered.trim()) {
                          handleAddSalesperson(entered.trim());
                          setStoreFormAssignedSalesperson(entered.trim());
                        }
                      } else if (val === '__manage_names__') {
                        setShowManageSalespersonsModal(true);
                      } else {
                        setStoreFormAssignedSalesperson(val);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {availableSalespersons.map(sp => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                    <option disabled>──────────</option>
                    <option value="__add_custom__">➕ Add Custom Name...</option>
                    <option value="__manage_names__">⚙️ Add or Delete Names...</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Sales executive</span>
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Delivery Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular 250g mixture packs buyer, delivers between 10 AM to 12 PM, payment via UPI"
                  value={storeFormNotes}
                  onChange={(e) => setStoreFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowStoreModal(false);
                    setEditingStore(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingStore ? 'Update Store Location' : 'Save Store Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE STORE CONFIRMATION MODAL */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Store Location?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800">{storeToDelete.shopName}</strong> from your stores directory and delivery route plan?
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              This will remove its pin from the map and route schedule across all assigned days ({storeToDelete.assignedDays?.join(', ')}).
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CEO ROUTE & SALES ASSIGNMENT HUB MODAL */}
      {showCeoAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-indigo-700 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
                  <Route className="w-6 h-6 text-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">👑 CEO Route & Sales Assignment Hub</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                      Executive Route Control
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    Assign stores to sales staff, set new approaches, schedule route days, and audit billing vs "not bought" remarks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCeoAssignmentModal(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl transition-colors cursor-pointer hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Store Stops</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">{stores.length}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Billed Deliveries</span>
                <span className="text-xl font-extrabold text-emerald-700 font-mono">
                  {routeStops.filter(s => s.visitStatus === 'billed').length}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Not Bought Remarks</span>
                <span className="text-xl font-extrabold text-amber-700 font-mono">
                  {routeStops.filter(s => s.visitStatus === 'unsold').length}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-blue-600 uppercase block">Pending Approaches</span>
                <span className="text-xl font-extrabold text-blue-700 font-mono">
                  {routeStops.filter(s => s.visitStatus === 'approaching').length}
                </span>
              </div>
            </div>

            {/* Store Assignments List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {stores.map((store, idx) => {
                const matchingStop = routeStops.find(s => s.id === store.id || s.storeName.toLowerCase() === store.shopName.toLowerCase());
                return (
                  <div
                    key={store.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-indigo-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center font-mono">
                          {store.routeSequence || idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{store.shopName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {store.shopCategory || 'Retail'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{store.address}</span>
                        </div>
                      </div>

                      {/* Visit Status on Selected Date */}
                      <div>
                        {matchingStop?.visitStatus === 'billed' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Billed: ₹{matchingStop.totalAmount.toLocaleString('en-IN')}</span>
                          </span>
                        ) : matchingStop?.visitStatus === 'unsold' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Not Bought: {matchingStop.unsoldReason || 'No Sale'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>Scheduled Approach</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Not Bought Remarks Details if available */}
                    {matchingStop?.visitStatus === 'unsold' && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900">
                            Approach Remarks: <span className="italic font-normal font-sans">"{matchingStop.unsoldNotes || 'No notes provided'}"</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenNotBoughtRemarksModal(matchingStop);
                            }}
                            className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold text-[10px] cursor-pointer"
                          >
                            ✏️ Edit Remarks
                          </button>
                        </div>
                        {matchingStop.visitRecord?.followUpDate && (
                          <span className="text-[11px] text-amber-700 block font-mono">
                            Scheduled Next Visit: {matchingStop.visitRecord.followUpDate}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Salesperson Assignment & Route Day Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Assigned Sales Representative
                        </label>
                        <select
                          value={store.assignedSalesperson || 'K. Saravanan'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__add_custom__') {
                              const entered = prompt('Enter new custom salesperson / executive name:');
                              if (entered && entered.trim()) {
                                handleAddSalesperson(entered.trim());
                                handleCeoAssignStore(store.id, entered.trim());
                              }
                            } else if (val === '__manage_names__') {
                              setShowManageSalespersonsModal(true);
                            } else {
                              handleCeoAssignStore(store.id, val);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {availableSalespersons.map(sp => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                          <option disabled>──────────</option>
                          <option value="__add_custom__">➕ Add Custom Name...</option>
                          <option value="__manage_names__">⚙️ Add or Delete Names...</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Route Scheduled Days (Monday - Sunday)
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {DAYS_OF_WEEK.map(d => {
                            const isAssigned = store.assignedDays && store.assignedDays.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleToggleStoreDay(store.id, d)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {d.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                All assignments and approach updates save instantly to local storage and sync to field devices.
              </span>
              <button
                type="button"
                onClick={() => setShowCeoAssignmentModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. CLEAR ROUTE TRACKING CONFIRMATION MODAL */}
      {showClearRouteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Clear Route Tracking Data?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to clear all logged field visits, "not bought" remarks, and route tracking history?
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              This will reset the visit history and approach logs while leaving your registered store locations intact.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearRouteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearRouteData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear Route Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. UNIVERSAL ROUTE EXPORT & MANIFEST HUB MODAL */}
      {showExportRouteModal && (() => {
        // Prepare current export dataset based on selected tab
        let activeStops: ExportableRouteStop[] = [];
        let activeMeta: ExportRouteMetadata = {
          routeTitle: 'Delivery Route Manifest',
          date: selectedDate,
          salesperson: selectedSalesperson !== 'all' ? selectedSalesperson : 'All Field Sales Reps',
          vehicleType: vehicleType,
          totalDistanceKm: metrics.totalDistanceKm,
          totalStops: routeStops.length,
          totalSalesAmount: metrics.totalSales,
          depot: DEFAULT_DEPOT,
        };

        if (exportTargetSource === 'custom') {
          activeStops = customRouteDraft.points.map((pt, idx) => ({
            sequenceNumber: idx + 1,
            storeName: pt.name,
            ownerName: 'Store Contact',
            phone: '',
            address: pt.address,
            latitude: pt.lat,
            longitude: pt.lng,
            visitStatus: 'custom',
            totalAmount: 0,
            invoiceNumber: '',
            timeString: '',
            distanceFromPrevKm: pt.distanceFromPrevKm,
            notes: pt.notes,
          }));

          activeMeta = {
            routeTitle: customRouteDraft.routeName || 'Custom Planned Route',
            date: selectedDate,
            salesperson: customRouteDraft.salesperson,
            vehicleType: customRouteDraft.vehicleType,
            totalDistanceKm: customRouteStats.totalDistanceKm,
            totalStops: customRouteDraft.points.length,
            totalSalesAmount: 0,
            depot: customRouteDraft.includeDepotStart ? DEFAULT_DEPOT : undefined,
          };
        } else if (exportTargetSource === 'stores') {
          activeStops = stores.map((st, idx) => ({
            sequenceNumber: idx + 1,
            storeName: st.shopName,
            ownerName: st.ownerName,
            phone: st.phone,
            address: st.address,
            latitude: st.location.latitude,
            longitude: st.location.longitude,
            visitStatus: st.active !== false ? 'active' : 'inactive',
            totalAmount: 0,
            invoiceNumber: '',
            timeString: '',
            distanceFromPrevKm: 0,
            notes: `Days: ${st.assignedDays?.join(', ') || 'All Days'} | Rep: ${st.assignedSalesperson || 'Unassigned'}`,
          }));

          activeMeta = {
            routeTitle: 'Master Stores Directory',
            date: selectedDate,
            salesperson: 'All Reps',
            totalDistanceKm: 0,
            totalStops: stores.length,
            totalSalesAmount: 0,
            depot: DEFAULT_DEPOT,
          };
        } else {
          // 'daily'
          activeStops = routeStops.map(s => ({
            sequenceNumber: s.sequenceNumber,
            storeName: s.storeName,
            ownerName: s.ownerName,
            phone: s.phone,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            visitStatus: s.visitStatus,
            totalAmount: s.totalAmount,
            invoiceNumber: s.invoiceNumber,
            timeString: s.timeString,
            distanceFromPrevKm: s.distanceFromPrevKm,
            notes: s.unsoldNotes || s.unsoldReason,
          }));
        }

        const navUrl = generateGoogleMapsRouteUrl(activeStops, activeMeta.depot);
        const qrUrl = navUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(navUrl)}` : '';
        const whatsappText = generateWhatsAppManifest(activeMeta, activeStops);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black flex items-center gap-2">
                      <span>Universal Route & Manifest Export Hub</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        8 Formats Supported
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Export delivery beat manifests, GPS tracks, GIS datasets, and driver navigation directions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExportRouteModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dataset Selection Tabs */}
              <div className="p-3 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Export Source:
                  </span>

                  <button
                    type="button"
                    onClick={() => setExportTargetSource('daily')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      exportTargetSource === 'daily'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>🚚 Active Daily Beat</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      exportTargetSource === 'daily' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {routeStops.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportTargetSource('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      exportTargetSource === 'custom'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>🗺️ Custom Created Route</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      exportTargetSource === 'custom' ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {customRouteDraft.points.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportTargetSource('stores')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      exportTargetSource === 'stores'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>🏪 Master Stores Directory</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      exportTargetSource === 'stores' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stores.length}
                    </span>
                  </button>
                </div>

                {/* Quick Summary Pill */}
                <div className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  Ready to export: <strong className="text-slate-900">{activeStops.length} stops</strong> • ~{activeMeta.totalDistanceKm ? activeMeta.totalDistanceKm.toFixed(1) : 0} km
                </div>
              </div>

              {/* Scrollable Content Body with 8 Export Options */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Active Route Summary Preview Banner */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-emerald-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Selected Route</span>
                    <h4 className="font-extrabold text-sm text-slate-900">{activeMeta.routeTitle}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Rep: <strong className="text-slate-700">{activeMeta.salesperson}</strong> • Date: <strong className="text-slate-700">{activeMeta.date}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Stops</div>
                      <div className="font-mono font-extrabold text-slate-900 text-base">{activeStops.length}</div>
                    </div>
                    {activeMeta.totalDistanceKm !== undefined && activeMeta.totalDistanceKm > 0 && (
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Distance</div>
                        <div className="font-mono font-extrabold text-slate-900 text-base">~{activeMeta.totalDistanceKm.toFixed(1)} km</div>
                      </div>
                    )}
                    {activeMeta.totalSalesAmount !== undefined && activeMeta.totalSalesAmount > 0 && (
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Total Sales</div>
                        <div className="font-mono font-extrabold text-emerald-700 text-base">₹{activeMeta.totalSalesAmount.toLocaleString('en-IN')}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 8 Export Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1. Excel Spreadsheet (.xlsx) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">Microsoft Excel (.xlsx)</h4>
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Recommended</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Comprehensive formatted spreadsheet with stop numbers, shop names, contact persons, phones, addresses, GPS coordinates, invoices, and physical customer signature columns.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportRouteToExcelFile(activeMeta, activeStops)}
                      disabled={activeStops.length === 0}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel Workbook (.xlsx)</span>
                    </button>
                  </div>

                  {/* 2. Universal CSV (.csv) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-slate-700" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm">Standard Tabular CSV (.csv)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Universal comma-separated format compatible with SAP, Tally, Zoho, Salesforce, Fleetx, Locus, and internal database pipelines.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportRouteToCSVFile(activeMeta, activeStops)}
                      disabled={activeStops.length === 0}
                      className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV Table (.csv)</span>
                    </button>
                  </div>

                  {/* 3. GPX Track (.gpx) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">GPS Navigation Track (.gpx)</h4>
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">Hardware GPS</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Standard GPX 1.1 with waypoints and sequential route points for Garmin, OsmAnd, Locus Map, motorcycle GPS receivers, and offline navigation apps.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const gpxXml = generateRouteGPX(activeMeta, activeStops);
                        const safeTitle = (activeMeta.routeTitle || 'Route').replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadFile(gpxXml, `${safeTitle}.gpx`, 'application/gpx+xml');
                      }}
                      disabled={activeStops.length === 0}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download GPX File (.gpx)</span>
                    </button>
                  </div>

                  {/* 4. Google Earth KML (.kml) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">Google Earth & My Maps (.kml)</h4>
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Google Earth</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          3D Placemark pins with store descriptions, contact numbers, and colored continuous LineString paths for Google Earth, Google My Maps, and ArcGIS.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const kmlXml = generateRouteKML(activeMeta, activeStops);
                        const safeTitle = (activeMeta.routeTitle || 'Route').replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadFile(kmlXml, `${safeTitle}.kml`, 'application/vnd.google-earth.kml+xml');
                      }}
                      disabled={activeStops.length === 0}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download KML File (.kml)</span>
                    </button>
                  </div>

                  {/* 5. Standard GeoJSON (.geojson) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                        <FileCode className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">Web GIS GeoJSON (.geojson)</h4>
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">GIS / Web</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          RFC 7946 FeatureCollection with Point and LineString geometry for Leaflet, Mapbox, OpenLayers, QGIS, and web application developers.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const jsonStr = generateRouteGeoJSON(activeMeta, activeStops);
                        const safeTitle = (activeMeta.routeTitle || 'Route').replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadFile(jsonStr, `${safeTitle}.geojson`, 'application/geo+json');
                      }}
                      disabled={activeStops.length === 0}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download GeoJSON File (.geojson)</span>
                    </button>
                  </div>

                  {/* 6. Driver Delivery Manifest (PDF / Print) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                        <Printer className="w-5 h-5 text-rose-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">Driver Trip Sheet & PDF</h4>
                          <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">Print Ready</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Printable physical voucher for field drivers with verification checkboxes, store contacts, invoices, cash reconciliation blanks, and signatures.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportRouteModal(false);
                          setShowPrintModal(true);
                        }}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preview Trip Sheet</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintReport}
                        className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Print immediately"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Turn-by-Turn Google Maps Navigation Link & QR Code Banner */}
                {navUrl && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Navigation className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white">Google Maps Live Turn-by-Turn Driving Link</h4>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.2 rounded-full border border-emerald-500/30">
                            Multi-Stop Navigation
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">
                          {navUrl}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(navUrl);
                          setCopiedLinkFeedback(true);
                          setTimeout(() => setCopiedLinkFeedback(false), 2000);
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedLinkFeedback ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300 font-extrabold">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Maps</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* WhatsApp Route Dispatch Manifest Card */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💬</span>
                      <div>
                        <h4 className="font-extrabold text-sm text-emerald-950">WhatsApp Driver Route Manifest</h4>
                        <p className="text-xs text-emerald-700">Pre-formatted dispatch text ready to message the driver</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(whatsappText);
                          setCopiedWhatsAppFeedback(true);
                          setTimeout(() => setCopiedWhatsAppFeedback(false), 2000);
                        }}
                        className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedWhatsAppFeedback ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-800 font-extrabold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <pre className="p-3 bg-white rounded-xl border border-emerald-200 text-[11px] font-mono text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {whatsappText}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:px-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Export files are generated client-side with full UTF-8 formatting and accurate geocoordinates.
                </span>
                <button
                  type="button"
                  onClick={() => setShowExportRouteModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. GODOWN / MAIN WAREHOUSE MODAL */}
      <GodownModal
        godown={godownFacility}
        isOpen={showGodownModal}
        onClose={() => setShowGodownModal(false)}
        onSave={(updated) => {
          setGodownFacility(updated);
          setLogisticsToast({
            title: '🏢 Central Godown Updated',
            message: `${updated.name} location & dispatch capacity successfully saved.`,
          });
        }}
        onStartPinDrop={() => handleStartPinDropper('godown')}
        onTriggerRobotGps={() => handleTriggerRobotGps('godown')}
        isCapturingGps={robotGpsProgress?.active || false}
      />

      {/* 8. STOCK PICKUP POINTS DIRECTORY MODAL */}
      <StockPickupModal
        pickupPoints={stockPickupPoints}
        isOpen={showStockPickupModal}
        onClose={() => setShowStockPickupModal(false)}
        onSavePoint={(savedPt) => {
          setStockPickupPoints(prev => {
            const idx = prev.findIndex(p => p.id === savedPt.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = savedPt;
              return updated;
            }
            return [...prev, savedPt];
          });
          setLogisticsToast({
            title: '📦 Pickup Point Saved',
            message: `${savedPt.name} details & coordinates saved to logistics registry.`,
          });
        }}
        onDeletePoint={(pointId) => {
          setStockPickupPoints(prev => prev.filter(p => p.id !== pointId));
        }}
        onStartPinDropForPoint={(pointId) => handleStartPinDropper('pickup', pointId)}
        onTriggerRobotGpsForPoint={(pointId) => handleTriggerRobotGps('pickup', pointId)}
        onZoomToPoint={(pt) => {
          if (mapSettings.mapEngine === 'google' && googleMapInstance) {
            googleMapInstance.panTo({ lat: pt.latitude, lng: pt.longitude });
            googleMapInstance.setZoom(16);
          } else if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([pt.latitude, pt.longitude], 16, { animate: true });
          }
        }}
        isCapturingGps={robotGpsProgress?.active || false}
      />

      {/* 9. DISTRIBUTION LINES NETWORK MODAL */}
      <DistributionLinesModal
        isOpen={showDistributionLinesModal}
        onClose={() => setShowDistributionLinesModal(false)}
        godown={godownFacility}
        pickupPoints={stockPickupPoints}
        stores={stores}
        distributionLineMode={mapSettings.distributionLineMode}
        onSetDistributionLineMode={(mode) => {
          setMapSettings(prev => ({
            ...prev,
            showDistributionLines: mode !== 'none',
            distributionLineMode: mode,
          }));
        }}
        onStartDrawCustomLine={() => {
          setIsCreateRouteMode(true);
          setIsCreateRoutePanelCollapsed(false);
        }}
      />

      {/* 10. ROBOT GPS CALIBRATION & LIVE DIAGNOSTIC MODAL */}
      <RobotGpsCalibrationModal
        isOpen={showRobotCalibrationModal}
        onClose={() => setShowRobotCalibrationModal(false)}
        config={{
          enabled: mapSettings.robotGpsEnabled,
          minAccuracyMeters: mapSettings.robotGpsMinAccuracy || 5,
          sampleCount: mapSettings.robotGpsSampleCount || 5,
          timeoutMs: 15000,
          outlierFilter: mapSettings.robotGpsOutlierFilter,
        }}
        onApplyCoords={(coords) => {
          setGodownFacility(prev => ({
            ...prev,
            latitude: coords.lat,
            longitude: coords.lng,
            accuracyMeters: coords.accuracy,
            thetaBearing: coords.thetaBearing,
            updatedAt: new Date().toISOString(),
          }));
          setLogisticsToast({
            title: '🏢 Robot Coordinates Applied to Godown',
            message: `Locked at [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}]${coords.thetaBearing !== undefined ? ` (θ=${coords.thetaBearing}°)` : ''} with ±${coords.accuracy}m error radius!`,
          });
        }}
      />

      {/* 11. ACTIVE ROBOT GPS SCANNING HUD */}
      <RobotGpsHUD
        progress={robotGpsProgress}
        onCancel={() => setRobotGpsProgress(null)}
      />

      {/* 12. LOGISTICS INTERACTION FLOATING TOAST */}
      {logisticsToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-400/30">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-white">{logisticsToast.title}</h5>
            <p className="text-[11px] text-slate-300 truncate">{logisticsToast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setLogisticsToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 13. LOCATION ACCESS ON ACCESS REQUEST MODAL */}
      <LocationAccessModal
        isOpen={showLocationAccessModal}
        onClose={() => setShowLocationAccessModal(false)}
        initialMessage={locationAccessInitialMessage}
        defaultCoords={{ lat: DEFAULT_DEPOT.latitude, lng: DEFAULT_DEPOT.longitude }}
        onLocationGranted={(coords) => {
          setLocationPermissionStatus('granted');
          setUserLiveLocation({ lat: coords.lat, lng: coords.lng });
          setLogisticsToast({
            title: '📍 Location Access Granted',
            message: `Locked GPS at [${coords.lat}, ${coords.lng}] (${coords.label || '±' + coords.accuracy + 'm'}).`,
          });
          if (googleMapInstance) {
            googleMapInstance.panTo({ lat: coords.lat, lng: coords.lng });
          } else if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
          }
        }}
      />

      {/* 14. MANAGE SALESPERSON NAMES (ADD CUSTOM & DELETE OPTIONS) MODAL */}
      <ManageSalespersonsModal
        isOpen={showManageSalespersonsModal}
        onClose={() => setShowManageSalespersonsModal(false)}
        salespersons={availableSalespersons}
        onAddSalesperson={handleAddSalesperson}
        onDeleteSalesperson={handleDeleteSalesperson}
        onResetDefaults={handleResetSalespersonDefaults}
        storeCountsByName={storeCountsBySalesperson}
      />

    </div>
  );
}
