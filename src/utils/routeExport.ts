/**
 * Utility functions for exporting delivery and sales routes into industry-standard formats:
 * - GPX (GPS Exchange Format for Garmin, OsmAnd, handhelds & GPS receivers)
 * - KML (Keyhole Markup Language for Google Earth & Google My Maps)
 * - GeoJSON (RFC 7946 Standard for web GIS, Leaflet, Mapbox, QGIS)
 * - Excel (.xlsx via SheetJS/xlsx)
 * - CSV (Universal comma-separated format for ERPs, Locus, Fleetx)
 * - Google Maps Multi-Stop Turn-by-Turn Driving Navigation URL
 * - WhatsApp Dispatch Manifest text
 */

import * as XLSX from 'xlsx';

export interface ExportableRouteStop {
  sequenceNumber: number;
  storeName: string;
  ownerName?: string;
  phone?: string;
  address: string;
  latitude: number;
  longitude: number;
  visitStatus?: 'billed' | 'unsold' | 'approaching' | 'custom' | string;
  totalAmount?: number;
  invoiceNumber?: string;
  timeString?: string;
  distanceFromPrevKm?: number;
  notes?: string;
}

export interface ExportRouteMetadata {
  routeTitle: string;
  date?: string;
  salesperson?: string;
  vehicleType?: string;
  totalDistanceKm?: number;
  totalStops?: number;
  totalSalesAmount?: number;
  depot?: { name: string; latitude: number; longitude: number; address: string };
}

/**
 * Trigger browser file download for text/blob content
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate GPX 1.1 XML string for GPS devices and navigation apps
 */
export function generateRouteGPX(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): string {
  const timeStamp = new Date().toISOString();
  const safeName = meta.routeTitle.replace(/[<>&'"]/g, '');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<gpx version="1.1" creator="SnackFlow Dispatch & Route Manager" xmlns="http://www.topografix.com/GPX/1/1">\n`;
  xml += `  <metadata>\n`;
  xml += `    <name>${safeName}</name>\n`;
  xml += `    <desc>Sales & Delivery Route: ${stops.length} stops. Date: ${meta.date || timeStamp}</desc>\n`;
  xml += `    <time>${timeStamp}</time>\n`;
  xml += `  </metadata>\n`;

  // Include Central Depot as starting waypoint if available
  if (meta.depot) {
    xml += `  <wpt lat="${meta.depot.latitude.toFixed(6)}" lon="${meta.depot.longitude.toFixed(6)}">\n`;
    xml += `    <name>Start: ${meta.depot.name.replace(/[<>&'"]/g, '')}</name>\n`;
    xml += `    <desc>${meta.depot.address.replace(/[<>&'"]/g, '')}</desc>\n`;
    xml += `    <sym>Depot</sym>\n`;
    xml += `  </wpt>\n`;
  }

  // Waypoints for each stop
  stops.forEach((s) => {
    const sName = (s.storeName || `Stop ${s.sequenceNumber}`).replace(/[<>&'"]/g, '');
    const sDesc = `${s.address || ''}${s.phone ? ' | Tel: ' + s.phone : ''}${s.invoiceNumber ? ' | Inv: ' + s.invoiceNumber : ''}`.replace(/[<>&'"]/g, '');
    xml += `  <wpt lat="${s.latitude.toFixed(6)}" lon="${s.longitude.toFixed(6)}">\n`;
    xml += `    <name>#${s.sequenceNumber} - ${sName}</name>\n`;
    xml += `    <desc>${sDesc}</desc>\n`;
    xml += `    <sym>Shop</sym>\n`;
    xml += `  </wpt>\n`;
  });

  // Route sequence (<rte>)
  xml += `  <rte>\n`;
  xml += `    <name>${safeName} Route Track</name>\n`;
  if (meta.depot) {
    xml += `    <rtept lat="${meta.depot.latitude.toFixed(6)}" lon="${meta.depot.longitude.toFixed(6)}">\n`;
    xml += `      <name>Depot</name>\n`;
    xml += `    </rtept>\n`;
  }
  stops.forEach((s) => {
    xml += `    <rtept lat="${s.latitude.toFixed(6)}" lon="${s.longitude.toFixed(6)}">\n`;
    xml += `      <name>Stop ${s.sequenceNumber}</name>\n`;
    xml += `    </rtept>\n`;
  });
  xml += `  </rte>\n`;
  xml += `</gpx>\n`;

  return xml;
}

/**
 * Generate Google Earth / Google My Maps KML format
 */
export function generateRouteKML(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): string {
  const safeName = meta.routeTitle.replace(/[<>&'"]/g, '');

  let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
  kml += `  <Document>\n`;
  kml += `    <name>${safeName}</name>\n`;
  kml += `    <description>Route with ${stops.length} stops generated from SnackFlow.</description>\n`;

  // Custom Placemark Styles
  kml += `    <Style id="depotStyle">\n`;
  kml += `      <IconStyle>\n`;
  kml += `        <color>ff0000ff</color>\n`;
  kml += `        <scale>1.3</scale>\n`;
  kml += `        <Icon><href>http://maps.google.com/mapfiles/kml/pal3/icon56.png</href></Icon>\n`;
  kml += `      </IconStyle>\n`;
  kml += `    </Style>\n`;
  kml += `    <Style id="stopStyle">\n`;
  kml += `      <IconStyle>\n`;
  kml += `        <color>ffffaa00</color>\n`;
  kml += `        <scale>1.1</scale>\n`;
  kml += `        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>\n`;
  kml += `      </IconStyle>\n`;
  kml += `    </Style>\n`;
  kml += `    <Style id="routeLineStyle">\n`;
  kml += `      <LineStyle>\n`;
  kml += `        <color>ff7f00ff</color>\n`;
  kml += `        <width>4</width>\n`;
  kml += `      </LineStyle>\n`;
  kml += `    </Style>\n`;

  // Depot Placemark
  if (meta.depot) {
    kml += `    <Placemark>\n`;
    kml += `      <name>🏭 ${meta.depot.name.replace(/[<>&'"]/g, '')}</name>\n`;
    kml += `      <description>${meta.depot.address.replace(/[<>&'"]/g, '')}</description>\n`;
    kml += `      <styleUrl>#depotStyle</styleUrl>\n`;
    kml += `      <Point>\n`;
    kml += `        <coordinates>${meta.depot.longitude},${meta.depot.latitude},0</coordinates>\n`;
    kml += `      </Point>\n`;
    kml += `    </Placemark>\n`;
  }

  // Stop Placemarks
  stops.forEach((s) => {
    const sName = (s.storeName || `Stop ${s.sequenceNumber}`).replace(/[<>&'"]/g, '');
    const sDesc = `Stop #${s.sequenceNumber}&lt;br/&gt;Address: ${s.address || 'N/A'}&lt;br/&gt;Phone: ${s.phone || 'N/A'}${s.totalAmount ? '&lt;br/&gt;Amount: ₹' + s.totalAmount : ''}`;
    kml += `    <Placemark>\n`;
    kml += `      <name>#${s.sequenceNumber} ${sName}</name>\n`;
    kml += `      <description>${sDesc}</description>\n`;
    kml += `      <styleUrl>#stopStyle</styleUrl>\n`;
    kml += `      <Point>\n`;
    kml += `        <coordinates>${s.longitude},${s.latitude},0</coordinates>\n`;
    kml += `      </Point>\n`;
    kml += `    </Placemark>\n`;
  });

  // Continuous Polyline LineString
  const coordPairs: string[] = [];
  if (meta.depot) {
    coordPairs.push(`${meta.depot.longitude},${meta.depot.latitude},0`);
  }
  stops.forEach((s) => {
    coordPairs.push(`${s.longitude},${s.latitude},0`);
  });

  if (coordPairs.length >= 2) {
    kml += `    <Placemark>\n`;
    kml += `      <name>${safeName} Travel Line</name>\n`;
    kml += `      <styleUrl>#routeLineStyle</styleUrl>\n`;
    kml += `      <LineString>\n`;
    kml += `        <extrude>1</extrude>\n`;
    kml += `        <tessellate>1</tessellate>\n`;
    kml += `        <coordinates>\n`;
    kml += `          ${coordPairs.join('\n          ')}\n`;
    kml += `        </coordinates>\n`;
    kml += `      </LineString>\n`;
    kml += `    </Placemark>\n`;
  }

  kml += `  </Document>\n`;
  kml += `</kml>\n`;

  return kml;
}

/**
 * Generate standard RFC 7946 GeoJSON FeatureCollection
 */
export function generateRouteGeoJSON(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): string {
  const features: any[] = [];

  // LineString of the complete sequence
  const lineCoords: number[][] = [];
  if (meta.depot) {
    lineCoords.push([meta.depot.longitude, meta.depot.latitude]);
  }
  stops.forEach((s) => {
    lineCoords.push([s.longitude, s.latitude]);
  });

  if (lineCoords.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lineCoords,
      },
      properties: {
        name: `${meta.routeTitle} Route Line`,
        totalDistanceKm: meta.totalDistanceKm || 0,
        stopCount: stops.length,
        salesperson: meta.salesperson || 'Unassigned',
        date: meta.date || new Date().toISOString().split('T')[0],
      },
    });
  }

  // Depot Point
  if (meta.depot) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [meta.depot.longitude, meta.depot.latitude],
      },
      properties: {
        type: 'depot',
        name: meta.depot.name,
        address: meta.depot.address,
      },
    });
  }

  // Stop Points
  stops.forEach((s) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        sequence: s.sequenceNumber,
        storeName: s.storeName,
        ownerName: s.ownerName || '',
        phone: s.phone || '',
        address: s.address,
        visitStatus: s.visitStatus || 'active',
        totalAmount: s.totalAmount || 0,
        invoiceNumber: s.invoiceNumber || '',
        distanceFromPrevKm: s.distanceFromPrevKm || 0,
        notes: s.notes || '',
      },
    });
  });

  const geoJson = {
    type: 'FeatureCollection',
    metadata: {
      generatedBy: 'SnackFlow Route Manager',
      timestamp: new Date().toISOString(),
      routeTitle: meta.routeTitle,
      salesperson: meta.salesperson,
      date: meta.date,
    },
    features,
  };

  return JSON.stringify(geoJson, null, 2);
}

/**
 * Generate official Google Maps multi-stop directions navigation link
 */
export function generateGoogleMapsRouteUrl(
  stops: { latitude: number; longitude: number }[],
  depot?: { latitude: number; longitude: number }
): string {
  if (stops.length === 0) return '';

  const originLat = depot ? depot.latitude : stops[0].latitude;
  const originLng = depot ? depot.longitude : stops[0].longitude;

  const destStop = stops[stops.length - 1];
  const destLat = destStop.latitude;
  const destLng = destStop.longitude;

  const intermediate = depot ? stops.slice(0, -1) : stops.slice(1, -1);
  const waypoints = intermediate.slice(0, 9).map((s) => `${s.latitude},${s.longitude}`).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  return url;
}

/**
 * Generate formatted WhatsApp message text with driver instructions
 */
export function generateWhatsAppManifest(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): string {
  const dateStr = meta.date || new Date().toISOString().split('T')[0];
  const driver = meta.salesperson || 'Assigned Driver';
  const navUrl = generateGoogleMapsRouteUrl(stops, meta.depot);

  let text = `🚛 *DELIVERY & ROUTE DISPATCH MANIFEST*\n`;
  text += `═══════════════════════════\n`;
  text += `📅 *Date:* ${dateStr}\n`;
  text += `👤 *Rep / Driver:* ${driver}\n`;
  text += `📋 *Route Name:* ${meta.routeTitle}\n`;
  text += `📍 *Total Stops:* ${stops.length}\n`;
  if (meta.totalDistanceKm) {
    text += `🛣️ *Est. Distance:* ~${meta.totalDistanceKm.toFixed(1)} km\n`;
  }
  if (meta.totalSalesAmount) {
    text += `💰 *Total Billed Value:* ₹${meta.totalSalesAmount.toLocaleString('en-IN')}\n`;
  }
  text += `═══════════════════════════\n\n`;

  if (meta.depot) {
    text += `🏭 *START:* ${meta.depot.name} (${meta.depot.address})\n\n`;
  }

  text += `*SEQUENTIAL STOPS ITINERARY:*\n`;
  stops.forEach((s) => {
    const statusEmoji = s.visitStatus === 'billed' ? '🟢' : s.visitStatus === 'unsold' ? '🟠' : '🔵';
    text += `${s.sequenceNumber}. ${statusEmoji} *${s.storeName}*\n`;
    if (s.ownerName) text += `   👤 Contact: ${s.ownerName}${s.phone ? ` (${s.phone})` : ''}\n`;
    text += `   📍 Address: ${s.address}\n`;
    if (s.totalAmount) text += `   💵 Invoice Amount: ₹${s.totalAmount.toLocaleString('en-IN')}\n`;
    if (s.invoiceNumber) text += `   📄 Inv #: ${s.invoiceNumber}\n`;
    if (s.notes) text += `   📝 Note: ${s.notes}\n`;
    text += `   🧭 Map Link: https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}\n\n`;
  });

  if (navUrl) {
    text += `🗺️ *FULL SEQUENTIAL NAVIGATION LINK:*\n${navUrl}\n\n`;
  }

  text += `_Please check off each store after delivery. Report any stock shortages or unsolds immediately._`;

  return text;
}

/**
 * Export route itinerary directly as formatted Excel (.xlsx) file
 */
export function exportRouteToExcelFile(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): void {
  if (stops.length === 0) {
    alert('No route stops to export.');
    return;
  }

  const manifestData = stops.map((s) => ({
    'Stop #': s.sequenceNumber,
    'Store Name': s.storeName,
    'Contact Person': s.ownerName || '-',
    'Phone': s.phone || '-',
    'Full Address': s.address,
    'Latitude': s.latitude,
    'Longitude': s.longitude,
    'Leg Distance (km)': s.distanceFromPrevKm !== undefined ? Number(s.distanceFromPrevKm.toFixed(1)) : 0,
    'Visit Status': s.visitStatus || 'Scheduled',
    'Invoice Total (₹)': s.totalAmount || 0,
    'Invoice No': s.invoiceNumber || '-',
    'Delivery Time': s.timeString || '-',
    'Notes / Remarks': s.notes || '-',
    'Cash Collected (₹)': '',
    'Customer Signature': '',
  }));

  const cleanTitle = (meta.routeTitle || 'Route_Manifest').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = meta.date || new Date().toISOString().split('T')[0];
  const fileName = `${cleanTitle}_${dateStr}.xlsx`;

  const worksheet = XLSX.utils.json_to_sheet(manifestData);

  // Set friendly column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Stop #
    { wch: 28 }, // Store Name
    { wch: 18 }, // Contact
    { wch: 15 }, // Phone
    { wch: 35 }, // Address
    { wch: 12 }, // Lat
    { wch: 12 }, // Lng
    { wch: 16 }, // Leg Dist
    { wch: 14 }, // Visit Status
    { wch: 16 }, // Invoice Total
    { wch: 14 }, // Invoice No
    { wch: 14 }, // Delivery Time
    { wch: 25 }, // Notes
    { wch: 18 }, // Cash Collected
    { wch: 22 }, // Customer Signature
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Route Manifest');

  // Summary Sheet
  const summaryData = [
    { Parameter: 'Route Title', Value: meta.routeTitle },
    { Parameter: 'Date', Value: meta.date || dateStr },
    { Parameter: 'Sales Representative / Driver', Value: meta.salesperson || 'All' },
    { Parameter: 'Vehicle Type', Value: meta.vehicleType || 'Standard Van / Two-Wheeler' },
    { Parameter: 'Total Stops', Value: stops.length },
    { Parameter: 'Total Est. Distance (km)', Value: meta.totalDistanceKm ? meta.totalDistanceKm.toFixed(1) : '-' },
    { Parameter: 'Total Billed Amount (₹)', Value: meta.totalSalesAmount ? `₹${meta.totalSalesAmount.toLocaleString('en-IN')}` : '₹0' },
    { Parameter: 'Starting Depot', Value: meta.depot ? `${meta.depot.name} (${meta.depot.address})` : 'Central Hub' },
    { Parameter: 'Generated At', Value: new Date().toLocaleString('en-IN') },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Route Summary');

  XLSX.writeFile(workbook, fileName);
}

/**
 * Export route itinerary as standard CSV file
 */
export function exportRouteToCSVFile(
  meta: ExportRouteMetadata,
  stops: ExportableRouteStop[]
): void {
  if (stops.length === 0) {
    alert('No route stops to export.');
    return;
  }

  const headers = [
    'Stop Number',
    'Store Name',
    'Contact Person',
    'Phone',
    'Address',
    'Latitude',
    'Longitude',
    'Distance From Prev Km',
    'Visit Status',
    'Invoice Total INR',
    'Invoice Number',
    'Delivery Time',
    'Notes',
  ];

  const escapeCSV = (val: any) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = stops.map((s) => [
    s.sequenceNumber,
    escapeCSV(s.storeName),
    escapeCSV(s.ownerName || ''),
    escapeCSV(s.phone || ''),
    escapeCSV(s.address),
    s.latitude,
    s.longitude,
    s.distanceFromPrevKm !== undefined ? s.distanceFromPrevKm.toFixed(1) : 0,
    escapeCSV(s.visitStatus || 'Scheduled'),
    s.totalAmount || 0,
    escapeCSV(s.invoiceNumber || ''),
    escapeCSV(s.timeString || ''),
    escapeCSV(s.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const cleanTitle = (meta.routeTitle || 'Route_Manifest').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = meta.date || new Date().toISOString().split('T')[0];

  downloadFile(csvContent, `${cleanTitle}_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}
