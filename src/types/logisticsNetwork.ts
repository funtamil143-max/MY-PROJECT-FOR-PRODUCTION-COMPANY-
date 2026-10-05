/**
 * Logistics & Distribution Network Types
 * Manages Central Godown (Warehouse), Stock Pickup Points, and Distribution Lines.
 */

export interface GodownFacility {
  id: string;
  name: string;
  code: string;
  managerName: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  thetaBearing?: number; // Heading / azimuth orientation angle in degrees (0 - 360°)
  stockCapacityKg: number;
  stockCapacityPackets: number;
  loadingBays: number;
  operatingHours: string;
  notes?: string;
  updatedAt?: string;
}

export interface StockPickupPoint {
  id: string;
  name: string;
  code: string;
  pointType: 'Factory Frying / Oven' | 'Packaging Shed' | 'Raw Flour & Spices' | 'Third-Party Supplier' | 'Central Loading Dock';
  address: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  thetaBearing?: number; // Heading / azimuth orientation angle in degrees (0 - 360°)
  stockItems: string[];
  dispatchCapacityKg: number;
  supervisorName: string;
  contactPhone: string;
  dispatchWindow: string;
  active: boolean;
  notes?: string;
}

export interface DistributionLine {
  id: string;
  name: string;
  lineType: 'primary_supply' | 'retail_beat' | 'custom_express';
  sourceName: string;
  sourceCoords: { lat: number; lng: number };
  destinationName: string;
  destinationCoords: { lat: number; lng: number };
  intermediateWaypoints?: Array<{ lat: number; lng: number; label?: string; storeId?: string }>;
  color: string;
  dashArray?: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  active: boolean;
  notes?: string;
}

// Default Central Godown (address deleted as requested)
export const DEFAULT_GODOWN: GodownFacility = {
  id: 'godown_main',
  name: 'Central Factory Godown & Master Warehouse',
  code: 'GDN-01',
  managerName: '',
  phone: '',
  address: '', // Address deleted as requested
  latitude: 9.92520,
  longitude: 78.11980,
  accuracyMeters: 5.0,
  stockCapacityKg: 8500,
  stockCapacityPackets: 42000,
  loadingBays: 4,
  operatingHours: '04:30 AM - 09:30 PM',
  notes: '',
  updatedAt: new Date().toISOString(),
};

// Initial Stock Pickup Points: empty list (cleared existing sample data from map)
export const INITIAL_STOCK_PICKUP_POINTS: StockPickupPoint[] = [];
