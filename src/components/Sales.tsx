import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { SaleEntry, SaleItem, Recipe, CompanyInvoiceSettings, UserRole } from '../types';
import InvoiceModal from './InvoiceModal';
import WhatsAppBillModal from './WhatsAppBillModal';
import RouteVisualization from './RouteVisualization';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Receipt, 
  X, 
  TrendingUp, 
  Tag, 
  FileText,
  Building,
  Building2,
  Check,
  AlertCircle,
  Camera,
  Upload,
  Image as ImageIcon,
  Paperclip,
  Eye,
  RefreshCw,
  Box,
  CreditCard,
  Send,
  XCircle,
  FileSpreadsheet,
  Download,
  MapPin,
  Navigation,
  ExternalLink,
  BarChart3,
  Activity
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

// Custom Tooltip for CEO Revenue Trend Line Chart
const RevenueChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-100">{data.displayLabel || label}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {data.count} {data.count === 1 ? 'sale' : 'sales'}
          </span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: entry.color || entry.stroke }}
                />
                <span className="text-slate-300">{entry.name}:</span>
              </span>
              <span className="font-bold font-mono text-slate-50">
                ₹{Number(entry.value || 0).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
        {data.revenue > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Cash Realized:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {Math.round(((data.paid || 0) / data.revenue) * 100)}%
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface SalesProps {
  salesEntries: SaleEntry[];
  recipes: Recipe[];
  onAddSale: (newSale: Omit<SaleEntry, 'id'>) => void;
  onUpdateSaleStatus: (id: string, status: 'Paid' | 'Pending' | 'Partial') => void;
  onDeleteSale: (id: string) => void;
  companySettings: CompanyInvoiceSettings;
  currentUserRole: UserRole;
  canEdit: boolean;
  onCancelInvoice?: (saleId: string, reason: string) => void;
  onAddPayment?: (saleId: string, amount: number, method: string, notes: string) => void;
  onUpdateSaleLocation?: (saleId: string, location: SaleEntry['location']) => void;
  onAddSampleRouteData?: () => void;
  onClearSales?: () => void;
  initialTab?: 'invoices' | 'route-map';
}

export default function Sales({
  salesEntries,
  recipes,
  onAddSale,
  onUpdateSaleStatus,
  onDeleteSale,
  companySettings,
  currentUserRole,
  canEdit,
  onCancelInvoice,
  onAddPayment,
  onUpdateSaleLocation,
  onAddSampleRouteData,
  onClearSales,
  initialTab = 'invoices',
}: SalesProps) {
  const [salesSubTab, setSalesSubTab] = useState<'invoices' | 'route-map'>(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SaleEntry | null>(null);
  const [whatsAppSale, setWhatsAppSale] = useState<SaleEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Partial' | 'Cancelled'>('All');

  // CEO Executive Revenue Trend Chart State
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly'>('daily');
  const [dailyDaysRange, setDailyDaysRange] = useState<'7' | '14' | '30' | 'all'>('30');
  const [showRevenueLine, setShowRevenueLine] = useState<boolean>(true);
  const [showPaidLine, setShowPaidLine] = useState<boolean>(true);
  const [showPendingLine, setShowPendingLine] = useState<boolean>(true);

  // New Sale Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerType, setCustomerType] = useState<'Wholesaler' | 'Shop/Retail'>('Wholesaler');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Credit' | 'Split'>('UPI');
  
  // Split Payment details
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitBank, setSplitBank] = useState<number>(0);
  const [splitCredit, setSplitCredit] = useState<number>(0);
  const [splitCheque, setSplitCheque] = useState<number>(0);

  const [discount, setDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [photoAttachment, setPhotoAttachment] = useState<string>('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);

  // Delivery & GPS Location State
  const [deliveryLocationText, setDeliveryLocationText] = useState('');
  const [gpsLocation, setGpsLocation] = useState<SaleEntry['location']>(undefined);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const captureGpsLocation = (isUserClick: boolean = true) => {
    if (!('geolocation' in navigator)) {
      if (isUserClick) setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        setGpsLocation({
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          address: deliveryLocationText || customerAddress || undefined,
        });
        setIsCapturingGps(false);
      },
      (err) => {
        setIsCapturingGps(false);
        if (isUserClick) {
          setGpsError(
            err.code === 1
              ? 'GPS permission denied. Please allow location access in your browser settings.'
              : 'Unable to acquire GPS location.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Camera Handlers
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please allow camera permissions or upload an image file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoAttachment(dataUrl);
      stopCamera();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to get unit price based on tier
  const calculatePriceByTier = (
    rec: Recipe | undefined,
    packSizeId: string | undefined,
    tier: 'Wholesaler' | 'Shop/Retail'
  ): number => {
    if (!rec) return 20;
    if (packSizeId === 'bulk') {
      const baseBulk = rec.sellingPricePerKg || 250;
      return tier === 'Wholesaler' ? Math.round(baseBulk * 0.9) : baseBulk;
    }
    const pack = rec.packagingSizes.find((p) => p.id === packSizeId);
    if (!pack) return rec.sellingPricePerKg || 20;
    if (tier === 'Wholesaler') {
      return pack.wholesalePrice !== undefined && pack.wholesalePrice > 0
        ? pack.wholesalePrice
        : Math.round(pack.mrp * 0.85); // Default 15% wholesale discount
    }
    return pack.mrp || 20;
  };

  // Line items for the new invoice
  const [items, setItems] = useState<SaleItem[]>([
    {
      recipeId: recipes[0]?.id || '',
      packSizeId: recipes[0]?.packagingSizes[0]?.id || '',
      packSizeName: recipes[0]?.packagingSizes[0] ? `${recipes[0].packagingSizes[0].grams}g Pouch` : 'Bulk (per kg)',
      priceType: 'Wholesaler',
      quantity: 10,
      unitPrice: calculatePriceByTier(recipes[0], recipes[0]?.packagingSizes[0]?.id, 'Wholesaler'),
      totalAmount: 10 * calculatePriceByTier(recipes[0], recipes[0]?.packagingSizes[0]?.id, 'Wholesaler'),
    },
  ]);

  // Open creation modal with auto invoice number
  const handleOpenModal = () => {
    const nextNum = salesEntries.length + 1;
    const generatedInvoiceNum = `INV-2026-${String(nextNum).padStart(3, '0')}`;
    setInvoiceNumber(generatedInvoiceNum);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerType('Wholesaler');
    setDate(new Date().toISOString().split('T')[0]);
    setDiscount(0);
    setTaxAmount(0);
    setNotes('');
    setPhotoAttachment('');
    setPaymentStatus('Paid');
    setPaymentMethod('UPI');
    setCustomerAddress('');
    setDeliveryLocationText('');
    setGpsLocation(undefined);
    setGpsError(null);
    captureGpsLocation(false);

    // Default item
    const firstRec = recipes[0];
    if (firstRec) {
      const firstPack = firstRec.packagingSizes[0];
      const price = calculatePriceByTier(firstRec, firstPack?.id, 'Wholesaler');
      setItems([
        {
          recipeId: firstRec.id,
          packSizeId: firstPack?.id || '',
          packSizeName: firstPack ? `${firstPack.grams}g Pouch` : 'Bulk (per kg)',
          priceType: 'Wholesaler',
          saleUnit: 'Packs',
          packsPerBundle: firstPack?.packsPerBundle || 10,
          quantity: 10,
          unitPrice: price,
          totalAmount: 10 * price,
        },
      ]);
    } else {
      setItems([]);
    }
    setIsModalOpen(true);
  };

  // Handle customer type change for whole invoice
  const handleCustomerTypeChange = (newTier: 'Wholesaler' | 'Shop/Retail') => {
    setCustomerType(newTier);
    // Update all items to new tier prices
    setItems((prevItems) =>
      prevItems.map((item) => {
        const rec = recipes.find((r) => r.id === item.recipeId);
        const basePrice = calculatePriceByTier(rec, item.packSizeId, newTier);
        const packsPerBundle = item.packsPerBundle || 10;
        const finalPrice = item.saleUnit === 'Bundles' ? basePrice * packsPerBundle : basePrice;
        return {
          ...item,
          priceType: newTier,
          unitPrice: finalPrice,
          totalAmount: item.quantity * finalPrice,
        };
      })
    );
  };

  // Line item handlers
  const handleAddItem = () => {
    const firstRec = recipes[0];
    if (!firstRec) return;
    const firstPack = firstRec.packagingSizes[0];
    const price = calculatePriceByTier(firstRec, firstPack?.id, customerType);
    setItems([
      ...items,
      {
        recipeId: firstRec.id,
        packSizeId: firstPack?.id || '',
        packSizeName: firstPack ? `${firstPack.grams}g Pouch` : 'Bulk (per kg)',
        priceType: customerType,
        saleUnit: 'Packs',
        packsPerBundle: firstPack?.packsPerBundle || 10,
        quantity: 10,
        unitPrice: price,
        totalAmount: 10 * price,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleRecipeChange = (index: number, recipeId: string) => {
    const rec = recipes.find((r) => r.id === recipeId);
    if (!rec) return;

    const pack = rec.packagingSizes[0];
    const tier = items[index].priceType || customerType;
    const basePrice = calculatePriceByTier(rec, pack?.id, tier);
    const packsPerBundle = pack?.packsPerBundle || 10;
    const saleUnit = items[index].saleUnit || 'Packs';
    const finalPrice = saleUnit === 'Bundles' ? basePrice * packsPerBundle : basePrice;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      recipeId,
      packSizeId: pack?.id || '',
      packSizeName: pack ? `${pack.grams}g Pouch` : 'Bulk (per kg)',
      saleUnit,
      packsPerBundle,
      unitPrice: finalPrice,
      totalAmount: updated[index].quantity * finalPrice,
    };
    setItems(updated);
  };

  const handlePackSizeChange = (index: number, packSizeId: string) => {
    const updated = [...items];
    const currentItem = updated[index];
    const rec = recipes.find((r) => r.id === currentItem.recipeId);
    if (!rec) return;

    const tier = currentItem.priceType || customerType;
    const basePrice = calculatePriceByTier(rec, packSizeId, tier);

    if (packSizeId === 'bulk') {
      updated[index] = {
        ...currentItem,
        packSizeId: 'bulk',
        packSizeName: 'Bulk (per kg)',
        saleUnit: 'Kg',
        packsPerBundle: 1,
        unitPrice: basePrice,
        totalAmount: currentItem.quantity * basePrice,
      };
    } else {
      const pack = rec.packagingSizes.find((p) => p.id === packSizeId);
      if (pack) {
        const packsPerBundle = pack.packsPerBundle || 10;
        const saleUnit = currentItem.saleUnit === 'Bundles' ? 'Bundles' : 'Packs';
        const finalPrice = saleUnit === 'Bundles' ? basePrice * packsPerBundle : basePrice;

        updated[index] = {
          ...currentItem,
          packSizeId: pack.id,
          packSizeName: `${pack.grams}g Pouch`,
          saleUnit,
          packsPerBundle,
          unitPrice: finalPrice,
          totalAmount: currentItem.quantity * finalPrice,
        };
      }
    }
    setItems(updated);
  };

  const handleSaleUnitChange = (index: number, newUnit: 'Packs' | 'Bundles' | 'Kg') => {
    const updated = [...items];
    const currentItem = updated[index];
    const rec = recipes.find((r) => r.id === currentItem.recipeId);
    const pack = rec?.packagingSizes.find((p) => p.id === currentItem.packSizeId);
    const packsPerBundle = pack?.packsPerBundle || currentItem.packsPerBundle || 10;
    const baseSinglePrice = calculatePriceByTier(rec, currentItem.packSizeId, currentItem.priceType || customerType);

    let newUnitPrice = baseSinglePrice;
    if (newUnit === 'Bundles') {
      newUnitPrice = baseSinglePrice * packsPerBundle;
    }

    updated[index] = {
      ...currentItem,
      saleUnit: newUnit,
      packsPerBundle,
      unitPrice: newUnitPrice,
      totalAmount: currentItem.quantity * newUnitPrice,
    };
    setItems(updated);
  };

  const handlePriceTypeChange = (index: number, newTier: 'Wholesaler' | 'Shop/Retail') => {
    const updated = [...items];
    const currentItem = updated[index];
    const rec = recipes.find((r) => r.id === currentItem.recipeId);
    const basePrice = calculatePriceByTier(rec, currentItem.packSizeId, newTier);
    const packsPerBundle = currentItem.packsPerBundle || 10;
    const finalPrice = currentItem.saleUnit === 'Bundles' ? basePrice * packsPerBundle : basePrice;

    updated[index] = {
      ...currentItem,
      priceType: newTier,
      unitPrice: finalPrice,
      totalAmount: currentItem.quantity * finalPrice,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const qty = Math.max(1, quantity);
    const updated = [...items];
    const price = updated[index].unitPrice;
    updated[index] = {
      ...updated[index],
      quantity: qty,
      totalAmount: qty * price,
    };
    setItems(updated);
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const price = Math.max(0, unitPrice);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unitPrice: price,
      totalAmount: updated[index].quantity * price,
    };
    setItems(updated);
  };

  // Financial totals for the active form
  const rawTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const finalCalculatedTotal = Math.max(0, rawTotal - (discount || 0) + (taxAmount || 0));

  // Handle form submit
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter a Customer Name.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item to the sale invoice.');
      return;
    }

    let calculatedPaid = finalCalculatedTotal;
    let splitData = undefined;

    if (paymentMethod === 'Split') {
      calculatedPaid = splitCash + splitUpi + splitBank + splitCheque;
      splitData = {
        cash: splitCash,
        upi: splitUpi,
        bankTransfer: splitBank,
        credit: splitCredit,
        cheque: splitCheque,
      };
    } else if (paymentStatus === 'Pending') {
      calculatedPaid = 0;
    }

    const calculatedBalance = Math.max(0, finalCalculatedTotal - calculatedPaid);

    onAddSale({
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerType,
      date,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items,
      totalAmount: rawTotal,
      discount: discount || 0,
      taxAmount: taxAmount || 0,
      finalAmount: finalCalculatedTotal,
      paidAmount: calculatedPaid,
      balanceAmount: calculatedBalance,
      splitPayment: splitData,
      paymentStatus: calculatedBalance === 0 ? 'Paid' : calculatedPaid > 0 ? 'Partial' : 'Pending',
      paymentMethod,
      notes: notes.trim(),
      photoAttachment: photoAttachment || undefined,
      location: gpsLocation,
      deliveryLocationText: deliveryLocationText.trim() || undefined,
      salesPerson: currentUserRole === 'CEO' ? 'CEO' : currentUserRole === 'Salesperson' ? 'Sales Executive' : 'Manager / Staff',
    });

    setIsModalOpen(false);
  };

  // KPIs
  const totalRevenue = salesEntries.reduce((sum, s) => sum + s.finalAmount, 0);
  const paidRevenue = salesEntries
    .filter((s) => s.paymentStatus === 'Paid')
    .reduce((sum, s) => sum + s.finalAmount, 0);
  const pendingRevenue = salesEntries
    .filter((s) => s.paymentStatus === 'Pending')
    .reduce((sum, s) => sum + s.finalAmount, 0);

  // CEO Executive Revenue Trend Calculations
  const dailyTrendData = useMemo(() => {
    const dayMap = new Map<string, { date: string; displayLabel: string; revenue: number; paid: number; pending: number; count: number }>();
    const activeSales = salesEntries.filter((s) => !s.isCancelled);

    activeSales.forEach((s) => {
      const dateKey = s.date || 'Unknown';
      let displayLabel = dateKey;
      try {
        if (dateKey.length >= 10) {
          const parts = dateKey.split('-');
          if (parts.length === 3) {
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            displayLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          }
        }
      } catch (e) {
        displayLabel = dateKey;
      }

      const current = dayMap.get(dateKey) || {
        date: dateKey,
        displayLabel,
        revenue: 0,
        paid: 0,
        pending: 0,
        count: 0,
      };

      const rev = Number(s.finalAmount) || 0;
      const paid = s.paidAmount !== undefined ? Number(s.paidAmount) : (s.paymentStatus === 'Paid' ? rev : 0);
      const pending = Math.max(0, rev - paid);

      current.revenue += rev;
      current.paid += paid;
      current.pending += pending;
      current.count += 1;
      dayMap.set(dateKey, current);
    });

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [salesEntries]);

  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { monthKey: string; displayLabel: string; revenue: number; paid: number; pending: number; count: number }>();
    const activeSales = salesEntries.filter((s) => !s.isCancelled);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    activeSales.forEach((s) => {
      const dateKey = s.date || '2026-10-01';
      const monthKey = dateKey.substring(0, 7);
      const parts = monthKey.split('-');
      let displayLabel = monthKey;
      if (parts.length === 2) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        displayLabel = `${monthNames[monthNum - 1] || parts[1]} '${year.slice(2)}`;
      }

      const current = monthMap.get(monthKey) || {
        monthKey,
        displayLabel,
        revenue: 0,
        paid: 0,
        pending: 0,
        count: 0,
      };

      const rev = Number(s.finalAmount) || 0;
      const paid = s.paidAmount !== undefined ? Number(s.paidAmount) : (s.paymentStatus === 'Paid' ? rev : 0);
      const pending = Math.max(0, rev - paid);

      current.revenue += rev;
      current.paid += paid;
      current.pending += pending;
      current.count += 1;
      monthMap.set(monthKey, current);
    });

    return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [salesEntries]);

  const activeChartData = useMemo(() => {
    if (chartPeriod === 'monthly') {
      return monthlyTrendData;
    }
    if (dailyDaysRange === 'all') {
      return dailyTrendData;
    }
    const daysCount = parseInt(dailyDaysRange, 10);
    return dailyTrendData.slice(-daysCount);
  }, [chartPeriod, dailyDaysRange, dailyTrendData, monthlyTrendData]);

  const trendStats = useMemo(() => {
    if (activeChartData.length === 0) {
      return {
        peakRevenue: 0,
        peakLabel: 'N/A',
        averageRevenue: 0,
        collectionRate: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0,
      };
    }

    let peak = activeChartData[0];
    let totalRev = 0;
    let totalPaid = 0;
    let totalInv = 0;

    activeChartData.forEach((d) => {
      if (d.revenue > peak.revenue) {
        peak = d;
      }
      totalRev += d.revenue;
      totalPaid += d.paid;
      totalInv += d.count;
    });

    return {
      peakRevenue: peak.revenue,
      peakLabel: peak.displayLabel,
      averageRevenue: Math.round(totalRev / (activeChartData.length || 1)),
      collectionRate: totalRev > 0 ? (totalPaid / totalRev) * 100 : 0,
      totalInvoices: totalInv,
      totalRevenue: totalRev,
      totalPaid: totalPaid,
      totalPending: Math.max(0, totalRev - totalPaid),
    };
  }, [activeChartData]);

  // Filtered sales history
  const filteredSales = salesEntries.filter((s) => {
    const matchesSearch =
      s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.items.some((i) => {
        const r = recipes.find((rec) => rec.id === i.recipeId);
        return r?.name.toLowerCase().includes(searchTerm.toLowerCase());
      });

    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && s.paymentStatus === statusFilter;
  });

  // Export Sales to Excel (.xlsx)
  const exportSalesToExcel = () => {
    const exportData = filteredSales.map(sale => {
      const totalPaid = sale.paidAmount !== undefined ? sale.paidAmount : (sale.paymentStatus === 'Paid' ? sale.finalAmount : 0);
      const balance = sale.balanceAmount !== undefined ? sale.balanceAmount : Math.max(0, sale.finalAmount - totalPaid);
      const itemsCount = sale.items ? sale.items.reduce((acc, item) => acc + item.quantity, 0) : 0;

      return {
        'Invoice Number': sale.invoiceNumber || '',
        'Date': sale.date || '',
        'Customer Name': sale.customerName || '',
        'Customer Phone': sale.customerPhone || '',
        'Customer Type': sale.customerType || 'Wholesaler',
        'Total Items': itemsCount,
        'Subtotal (₹)': sale.totalAmount || 0,
        'Discount (₹)': sale.discount || 0,
        'Tax (₹)': sale.taxAmount || 0,
        'Final Amount (₹)': sale.finalAmount || 0,
        'Paid Amount (₹)': totalPaid,
        'Balance Due (₹)': balance,
        'Payment Status': sale.paymentStatus || 'Paid',
        'Payment Method': sale.paymentMethod || 'UPI',
        'Notes': sale.notes || '-'
      };
    });
    exportToExcel(exportData, `Sales_Billing_Report_${new Date().toISOString().split('T')[0]}`, 'Sales Invoices');
  };

  // Print Sales Summary Report
  const handlePrintSalesSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Billing Register - ${companySettings.companyName}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 800; }
            p { margin: 0 0 16px 0; font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge { padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; }
            .paid { background-color: #d1fae5; color: #065f46; }
            .pending { background-color: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          <h1>${companySettings.companyName} - Sales Billing Register</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN')} | Total Invoices Recorded: ${filteredSales.length}</p>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Type</th>
                <th class="text-right">Total Amount (₹)</th>
                <th class="text-right">Paid Amount (₹)</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSales.map(s => {
                const paid = s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'Paid' ? s.finalAmount : 0);
                return `
                  <tr>
                    <td><strong>${s.invoiceNumber}</strong></td>
                    <td>${s.date}</td>
                    <td>${s.customerName}</td>
                    <td>${s.customerPhone || 'N/A'}</td>
                    <td>${s.customerType || 'Wholesaler'}</td>
                    <td class="text-right">₹${s.finalAmount.toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${paid.toLocaleString('en-IN')}</td>
                    <td class="text-center"><span class="badge ${s.paymentStatus === 'Paid' ? 'paid' : 'pending'}">${s.paymentStatus}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="sales-tab-content">
      
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20">
              Sales & Dispatch Hub
            </span>
            <span className="text-slate-400 text-xs">• Revenue & Route Verification</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-sans text-slate-100">
            Finished Goods Sales Log
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Record customer sales invoices, track delivery routes with GPS pins on Google Maps, print receipts, and monitor daily revenue streams.
          </p>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-2 pt-2">
            <div className="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSalesSubTab('invoices')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  salesSubTab === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices & Billing Log ({salesEntries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSalesSubTab('route-map')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  salesSubTab === 'route-map'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-300" />
                <span>Field Route Map & Tracking</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-4 md:mt-0">
          <button
            onClick={exportSalesToExcel}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
            title="Export Sales Details to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintSalesSummary}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-sm border border-slate-700 cursor-pointer"
            title="Print Sales Summary"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          {onClearSales && salesEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-4 py-2.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Clear all recorded sales invoices"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Sales</span>
            </button>
          )}

          <button
            id="create-sale-invoice-btn"
            onClick={handleOpenModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-indigo-500/20 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Sales Invoice</span>
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Clear All Sales Invoices?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to clear all {salesEntries.length} billed sales invoices and transactions?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  onClearSales?.();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Subtab View */}
      {salesSubTab === 'route-map' ? (
        <RouteVisualization
          salesEntries={salesEntries}
          companySettings={companySettings}
          currentUserRole={currentUserRole}
          onSelectInvoice={(sale) => setSelectedInvoice(sale)}
          onAddSampleRouteData={onAddSampleRouteData}
          recipes={recipes}
          onAddSale={onAddSale}
        />
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5">
              ₹{(totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{salesEntries.length} Invoices Recorded</p>
          </div>
        </div>

        {/* Collected Paid */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Collected (Paid)</p>
            <h3 className="text-xl font-bold text-emerald-700 mt-0.5">
              ₹{(paidRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Cleared in cash / UPI / bank</p>
          </div>
        </div>

        {/* Pending Credit */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Credit</p>
            <h3 className="text-xl font-bold text-amber-700 mt-0.5">
              ₹{(pendingRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Receivable from stores</p>
          </div>
        </div>

        {/* Active Products Sold */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Sale Value</p>
            <h3 className="text-xl font-bold text-slate-950 mt-0.5">
              ₹{salesEntries.length > 0 ? (totalRevenue / salesEntries.length).toFixed(0) : '0'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Per bill average</p>
          </div>
        </div>
      </div>

      {/* CEO Executive Revenue Trends Line Chart (Recharts) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6 space-y-5" id="ceo-revenue-trend-analytics">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 tracking-wider uppercase">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>CEO Strategic Review · Executive Analytics</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="text-slate-500 font-medium normal-case">
                {currentUserRole === 'CEO' ? 'Active CEO Dashboard' : 'Executive Overview'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>Revenue & Collection Trends</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 max-w-2xl">
              Real-time daily and monthly revenue trajectory, cash vs. credit recovery rates, and peak sales velocity.
            </p>
          </div>

          {/* Timeframe & Chart Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Daily vs Monthly Segmented Toggle */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartPeriod('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartPeriod === 'daily'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Daily Sales Fluctuations"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Trend</span>
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartPeriod === 'monthly'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Month-over-Month Revenue Growth"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Monthly Trend</span>
              </button>
            </div>

            {/* Daily Range Filter (Only shown when Daily is active) */}
            {chartPeriod === 'daily' && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
                {(['7', '14', '30', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setDailyDaysRange(range)}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      dailyDaysRange === range
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {range === 'all' ? 'All Days' : `${range}D`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Executive Metric Cards (Synchronized with chart period) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Period Total Revenue */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              {chartPeriod === 'monthly' ? 'Total Period Billed' : 'Selected Billed Total'}
            </span>
            <div className="text-lg md:text-xl font-extrabold text-slate-900 font-mono mt-1">
              ₹{(trendStats.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {trendStats.totalInvoices} invoice{trendStats.totalInvoices !== 1 ? 's' : ''} in view
            </div>
          </div>

          {/* Peak Revenue */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              {chartPeriod === 'monthly' ? 'Peak Month Sales' : 'Peak Single Day'}
            </span>
            <div className="text-lg md:text-xl font-extrabold text-indigo-700 font-mono mt-1">
              ₹{(trendStats.peakRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              {trendStats.peakLabel !== 'N/A' ? `Achieved on ${trendStats.peakLabel}` : 'No sales recorded'}
            </div>
          </div>

          {/* Average Revenue per Period */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              {chartPeriod === 'monthly' ? 'Avg Monthly Revenue' : 'Avg Daily Revenue'}
            </span>
            <div className="text-lg md:text-xl font-extrabold text-slate-900 font-mono mt-1">
              ₹{(trendStats.averageRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {chartPeriod === 'monthly' ? 'Per recorded month' : 'Per active sales day'}
            </div>
          </div>

          {/* Cash Realization Rate */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Cash Realization Rate
            </span>
            <div className="text-lg md:text-xl font-extrabold text-emerald-700 font-mono mt-1 flex items-center gap-1.5">
              <span>{(trendStats.collectionRate || 0).toFixed(1)}%</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              ₹{(trendStats.totalPaid || 0).toLocaleString('en-IN')} paid · ₹{(trendStats.totalPending || 0).toLocaleString('en-IN')} pending
            </div>
          </div>
        </div>

        {/* Series Filter & Legend Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Metrics:</span>

            {/* Total Revenue toggle */}
            <button
              type="button"
              onClick={() => setShowRevenueLine(!showRevenueLine)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                showRevenueLine
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${showRevenueLine ? 'bg-indigo-600' : 'bg-slate-300'}`} />
              <span>Billed Revenue (₹)</span>
            </button>

            {/* Collected Paid toggle */}
            <button
              type="button"
              onClick={() => setShowPaidLine(!showPaidLine)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                showPaidLine
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${showPaidLine ? 'bg-emerald-600' : 'bg-slate-300'}`} />
              <span>Collected Paid (₹)</span>
            </button>

            {/* Pending Credit toggle */}
            <button
              type="button"
              onClick={() => setShowPendingLine(!showPendingLine)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                showPendingLine
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${showPendingLine ? 'bg-amber-500' : 'bg-slate-300'}`} />
              <span>Pending Credit (₹)</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            <span>Hover points for detailed bill breakdown</span>
          </div>
        </div>

        {/* The Recharts Line Chart / Empty State Container */}
        <div className="w-full pt-2">
          {activeChartData.length === 0 ? (
            <div className="h-72 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <TrendingUp className="w-10 h-10 text-slate-300 stroke-1" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">No Sales Records Available for this Period</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Log customer sales or load multi-period sample route data to visualize daily and monthly trends.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {onAddSampleRouteData && (
                  <button
                    type="button"
                    onClick={onAddSampleRouteData}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Load Multi-Day Sample Sales</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-80 w-full" id="recharts-sales-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeChartData}
                  margin={{ top: 12, right: 24, left: 0, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="displayLabel"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    dy={6}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: number) => (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                    dx={-4}
                  />
                  <Tooltip content={<RevenueChartTooltip />} />
                  {showRevenueLine && (
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Billed Revenue"
                      stroke="#4f46e5"
                      strokeWidth={2.75}
                      dot={{ r: 4, stroke: '#4f46e5', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                  {showPaidLine && (
                    <Line
                      type="monotone"
                      dataKey="paid"
                      name="Collected Paid"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, stroke: '#059669', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                  {showPendingLine && (
                    <Line
                      type="monotone"
                      dataKey="pending"
                      name="Pending Credit"
                      stroke="#d97706"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, stroke: '#d97706', strokeWidth: 1.5, fill: '#ffffff' }}
                      activeDot={{ r: 5, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CEO Strategic Takeaways Banner */}
        {activeChartData.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                CEO Takeaway:
              </span>
              <span>
                {trendStats.peakRevenue > 0
                  ? `Peak sales velocity recorded on ${trendStats.peakLabel} with ₹${trendStats.peakRevenue.toLocaleString('en-IN')}. `
                  : ''}
                {trendStats.collectionRate >= 80
                  ? `Cash recovery is strong at ${trendStats.collectionRate.toFixed(0)}%.`
                  : `Receivables attention required: ₹${(trendStats.totalPending || 0).toLocaleString('en-IN')} pending collection.`}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {onAddSampleRouteData && (
                <button
                  type="button"
                  onClick={onAddSampleRouteData}
                  className="text-slate-500 hover:text-indigo-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Add more test sales data across dates"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh / Add Demo Trends</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all cursor-pointer ${
                statusFilter === 'All' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({salesEntries.length})
            </button>
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all cursor-pointer ${
                statusFilter === 'Paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all cursor-pointer ${
                statusFilter === 'Pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending Credit
            </button>
          </div>
        </div>
      </div>

      {/* Sales Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            Sales History & Dispatches ({filteredSales.length})
          </h2>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-base font-semibold text-slate-600">No sales invoices recorded yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click the "+ Create Sales Invoice" button above to log customer sales, generate bills, and track revenue.
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items / Products Sold</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {sale.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{sale.customerName}</span>
                        {sale.customerType && (
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider ${
                              sale.customerType === 'Wholesaler'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {sale.customerType === 'Wholesaler' ? 'Wholesaler' : 'Shop'}
                          </span>
                        )}
                      </div>
                      {sale.customerPhone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{sale.customerPhone}</span>
                        </div>
                      )}
                      {sale.location?.latitude && sale.location?.longitude && (
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <a
                            href={sale.location.mapsUrl || `https://maps.google.com/?q=${sale.location.latitude},${sale.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-0.5 text-emerald-700"
                            title="Open Delivery GPS Pin in Google Maps"
                          >
                            <span>GPS Pinned</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {sale.items.map((it, idx) => {
                          const recipe = recipes.find((r) => r.id === it.recipeId);
                          const isBundle = it.saleUnit === 'Bundles';
                          const unitText = isBundle
                            ? `🎁 ${it.quantity} Bundles (${it.quantity * (it.packsPerBundle || 10)} packs)`
                            : it.saleUnit === 'Kg'
                            ? `⚖️ ${it.quantity} Kg`
                            : `× ${it.quantity} packs`;

                          return (
                            <div key={idx} className="text-xs text-slate-700 flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {recipe ? recipe.name : 'Snack'}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                ({it.packSizeName || 'Pouch'})
                              </span>
                              {it.priceType && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {it.priceType === 'Wholesaler' ? '🏢 Wholesale' : '🏪 Shop'}
                                </span>
                              )}
                              <span className="font-bold text-indigo-700 font-mono">
                                {unitText} @ ₹{it.unitPrice}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {sale.photoAttachment && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(sale.photoAttachment!)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3 text-indigo-600" />
                            <span>Photo Attached</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950">
                      ₹{(sale.finalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdateSaleStatus(
                              sale.id,
                              sale.paymentStatus === 'Paid' ? 'Pending' : 'Paid'
                            )
                          }
                          title="Click to toggle payment status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 border cursor-pointer transition-all ${
                            sale.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : sale.paymentStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          {sale.paymentStatus === 'Paid' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{sale.paymentStatus}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">
                          via {sale.paymentMethod}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setWhatsAppSale(sale)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-emerald-300 shadow-2xs"
                          title="Send Bill Copy on WhatsApp with GPS Location"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                          title="View / Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete sale invoice ${sale.invoiceNumber}?`)) {
                              onDeleteSale(sale.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* CREATE NEW SALE INVOICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-2 sm:my-4 max-h-[94vh]">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold">New Sales Invoice</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* Customer / Store Details - Top Priority */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200/90 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Customer & Store Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1">
                      <span>Customer / Store Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Sri Amman Wholesale Stores"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-indigo-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phone / Mobile *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9842100000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-indigo-900 uppercase mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Price Category</span>
                    </label>
                    <div className="inline-flex w-full rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
                      <button
                        type="button"
                        onClick={() => handleCustomerTypeChange('Wholesaler')}
                        className={`flex-1 py-1.5 px-2 font-bold rounded-md transition-all text-center cursor-pointer ${
                          customerType === 'Wholesaler'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏢 Wholesaler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomerTypeChange('Shop/Retail')}
                        className={`flex-1 py-1.5 px-2 font-bold rounded-md transition-all text-center cursor-pointer ${
                          customerType === 'Shop/Retail'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏪 Retail
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit">Store Credit / Due</option>
                    <option value="Split">Split Payment (Multiple Modes)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Split Payment Breakdown */}
              {paymentMethod === 'Split' && (
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                  <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    Split Payment Amount Allocation (Total Invoice: ₹{finalCalculatedTotal})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Cash (₹)</label>
                      <input
                        type="number"
                        value={splitCash}
                        onChange={(e) => setSplitCash(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase">UPI (₹)</label>
                      <input
                        type="number"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Bank (₹)</label>
                      <input
                        type="number"
                        value={splitBank}
                        onChange={(e) => setSplitBank(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Cheque (₹)</label>
                      <input
                        type="number"
                        value={splitCheque}
                        onChange={(e) => setSplitCheque(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-800 uppercase">Credit / Due (₹)</label>
                      <input
                        type="number"
                        value={splitCredit}
                        onChange={(e) => setSplitCredit(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono pt-1">
                    <span>Allocated Paid: <strong>₹{splitCash + splitUpi + splitBank + splitCheque}</strong></span>
                    <span className="text-amber-800 font-bold">Unpaid Credit: ₹{Math.max(0, finalCalculatedTotal - (splitCash + splitUpi + splitBank + splitCheque))}</span>
                  </div>
                </div>
              )}

              {/* Store Delivery, Live GPS Location & Photo Proof */}
              <div className="bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/40 p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                        Store Delivery, GPS Pin & Image Proof
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Attach delivery coordinates and store photo directly to this invoice
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => captureGpsLocation(true)}
                      disabled={isCapturingGps}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      title="Fetch live device GPS location"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                      <span>{isCapturingGps ? 'Locating...' : gpsLocation ? 'Update GPS' : 'Capture GPS'}</span>
                    </button>

                    <label className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors" title="Upload store/delivery photo">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Take photo with device camera"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      <span className="hidden sm:inline">Camera</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Responsive Layout for Delivery Info & Photo Proof */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                  {/* Left Column: Store Address, Landmark & GPS Status */}
                  <div className="lg:col-span-7 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Store Address / Area
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Bus Stand, Bazaar Main Road"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Delivery Landmark / Spot
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Counter Drop, Gate 2, Shop Front"
                          value={deliveryLocationText}
                          onChange={(e) => setDeliveryLocationText(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* GPS Status feedback */}
                    {gpsLocation?.latitude && gpsLocation?.longitude ? (
                      <div className="p-2.5 bg-white border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            GPS Pinned
                          </span>
                          <span className="font-mono text-slate-700 text-[11px]">
                            Lat: <strong>{gpsLocation.latitude.toFixed(5)}</strong>, Lng: <strong>{gpsLocation.longitude.toFixed(5)}</strong>
                            {gpsLocation.accuracyMeters && ` (±${gpsLocation.accuracyMeters}m)`}
                          </span>
                        </div>
                        <a
                          href={gpsLocation.mapsUrl || `https://maps.google.com/?q=${gpsLocation.latitude},${gpsLocation.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Maps Pin</span>
                        </a>
                      </div>
                    ) : gpsError ? (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center justify-between">
                        <span>{gpsError}</span>
                        <button
                          type="button"
                          onClick={() => captureGpsLocation(true)}
                          className="text-[10px] font-bold text-amber-900 underline ml-2 cursor-pointer"
                        >
                          Retry GPS
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-500">
                        <span>No GPS pinned yet. Click "Capture GPS" when at store location.</span>
                        <button
                          type="button"
                          onClick={() => captureGpsLocation(true)}
                          className="text-emerald-700 font-bold hover:underline ml-2 cursor-pointer"
                        >
                          Pin Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Direct Image Upload & Thumbnail View */}
                  <div className="lg:col-span-5 flex flex-col justify-center">
                    {photoAttachment ? (
                      <div className="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-2xs flex items-center gap-3">
                        <img
                          src={photoAttachment}
                          alt="Delivery Proof"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                          onClick={() => setPreviewPhoto(photoAttachment)}
                          title="Click to view full photo"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">Photo Proof Attached</span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(photoAttachment)}
                              className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <label className="text-[10px] text-slate-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer">
                              <Upload className="w-3 h-3" /> Change
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setPhotoAttachment('')}
                              className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white/70 hover:bg-white rounded-xl p-3 text-center transition-all flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Choose Image File</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5 text-slate-600" />
                            <span>Snap Photo</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Upload bill counter receipt, delivery proof, or store signage (PNG, JPG)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Snack Line Items ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Line Item</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {items.map((item, idx) => {
                    const currentRecipe = recipes.find((r) => r.id === item.recipeId);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        {/* Recipe Dropdown */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Snack Item
                          </label>
                          <select
                            value={item.recipeId}
                            onChange={(e) => handleRecipeChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pack Size / Type */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Packaging
                          </label>
                          <select
                            value={item.packSizeId || 'bulk'}
                            onChange={(e) => handlePackSizeChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {currentRecipe?.packagingSizes.map((ps) => {
                              const wsPrice = ps.wholesalePrice || Math.round(ps.mrp * 0.85);
                              return (
                                <option key={ps.id} value={ps.id}>
                                  {ps.grams}g Pouch (₹{ps.mrp} | Wholesale ₹{wsPrice})
                                </option>
                              );
                            })}
                            <option value="bulk">Bulk (per kg)</option>
                          </select>
                        </div>

                        {/* Sale Unit Type (Packs vs Bundles) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">
                            Unit Type
                          </label>
                          <select
                            value={item.saleUnit || 'Packs'}
                            onChange={(e) => handleSaleUnitChange(idx, e.target.value as any)}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded-lg text-xs font-bold bg-amber-50/80 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Packs">📦 Packs / Pouches</option>
                            <option value="Bundles">🎁 Bundles (Multi-Pack)</option>
                            <option value="Kg">⚖️ Bulk (Kg)</option>
                          </select>
                        </div>

                        {/* Price Tier Column (Wholesaler vs Shop Rate) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">
                            Price Tier
                          </label>
                          <select
                            value={item.priceType || customerType}
                            onChange={(e) => handlePriceTypeChange(idx, e.target.value as 'Wholesaler' | 'Shop/Retail')}
                            className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg text-xs font-bold bg-indigo-50/70 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Wholesaler">🏢 Wholesaler</option>
                            <option value="Shop/Retail">🏪 Shop/Retail</option>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 1)}
                            className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Rate (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.unitPrice}
                            onChange={(e) => handleUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* This Product Total Bill Value */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">
                            Total Bill Value (₹)
                          </label>
                          <div className="w-full px-2 py-1.5 bg-indigo-100/80 border border-indigo-300 rounded-lg text-xs font-mono font-black text-indigo-950 text-right">
                            ₹{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Delete button */}
                        <div className="sm:col-span-0.5 flex justify-end items-center pt-2 sm:pt-0">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 hover:bg-rose-100 text-rose-500 rounded transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Bundle breakdown banner */}
                        {item.saleUnit === 'Bundles' && (
                          <div className="sm:col-span-12 mt-1 px-3 py-1.5 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-950 text-[11px] font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-amber-700" />
                              1 Bundle = <strong>{item.packsPerBundle || 10} Packs</strong> ({item.packSizeName})
                            </span>
                            <span className="font-bold text-amber-900">
                              Total: {item.quantity * (item.packsPerBundle || 10)} Packs
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Table: Each Product Total Bill Value and Sum of All Products in Full Value */}
                {items.length > 0 && (
                  <div className="mt-3 rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-xs">
                    <div className="bg-slate-900 px-3.5 py-2 text-white flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold">Product Bill Values & Grand Sum Breakdown</span>
                      </div>
                      <span className="text-[11px] text-slate-300 font-mono">
                        {items.length} Product{items.length > 1 ? 's' : ''} Listed
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Product Name & Net Weight</th>
                            <th className="py-2.5 px-3 text-center">Packaging / Unit</th>
                            <th className="py-2.5 px-3 text-right">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                            <th className="py-2.5 px-3 text-right">This Product Total Bill Value (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                          {items.map((it, i) => {
                            const r = recipes.find(rec => rec.id === it.recipeId);
                            const p = r?.packagingSizes.find(ps => ps.id === it.packSizeId);
                            const weightStr = p ? `${p.grams}g Net Wt` : it.packSizeName || (it.saleUnit === 'Kg' ? '1.0 Kg Bulk' : 'Pouch');
                            const lineTotal = (it.quantity || 0) * (it.unitPrice || 0);

                            return (
                              <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                                <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900">{r?.name || 'Snack Item'}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold border border-indigo-200">
                                      ⚖️ {weightStr}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                                  {it.saleUnit === 'Bundles' 
                                    ? `🎁 Bundles (${it.quantity * (it.packsPerBundle || 10)} packs)` 
                                    : it.saleUnit === 'Kg' 
                                    ? '⚖️ Bulk (Kg)' 
                                    : '📦 Packs'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                  {it.quantity}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">
                                  ₹{(it.unitPrice || 0).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-indigo-700 text-xs">
                                  ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-900 text-white font-bold text-xs border-t-2 border-indigo-950">
                            <td colSpan={5} className="py-2.5 px-3 uppercase tracking-wider text-[11px] text-right font-bold">
                              Sum of All Products (Full Gross Value):
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-amber-300">
                              ₹{rawTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Discounts & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Special Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Paid">Cleared (Paid)</option>
                    <option value="Pending">Pending / Store Credit</option>
                  </select>
                </div>
              </div>

              {/* Total Calculation Card & Action Buttons */}
              <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 bg-indigo-950 text-white border-t border-indigo-800 shadow-xl flex flex-wrap justify-between items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                    Total Invoice Amount
                  </p>
                  <p className="text-2xl font-extrabold font-mono mt-0.5 text-amber-300">
                    ₹{(finalCalculatedTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Generate Bill</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FULL INVOICE MODAL (PRINT, PDF, WHATSAPP, SPLIT PAYMENT, RECEIPT) */}
      <InvoiceModal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        sale={selectedInvoice}
        companySettings={companySettings}
        currentUserRole={currentUserRole}
        recipes={recipes}
        onCancelInvoice={onCancelInvoice}
        onAddPayment={onAddPayment}
        onUpdateSaleLocation={onUpdateSaleLocation}
      />

      {/* DIRECT WHATSAPP BILL COPY MODAL WITH LOCATION (1-CLICK FROM TABLE) */}
      {whatsAppSale && (
        <WhatsAppBillModal
          isOpen={whatsAppSale !== null}
          onClose={() => setWhatsAppSale(null)}
          sale={whatsAppSale}
          companySettings={companySettings}
          recipes={recipes}
          onUpdateSaleLocation={onUpdateSaleLocation}
        />
      )}

      {/* LIVE CAMERA OVERLAY MODAL */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span>Snap Delivery / Bill Photo</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhotoFromCamera}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENLARGE PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-4 space-y-3 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-400" /> Photo Attachment
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center bg-slate-950 rounded-xl p-2 border border-slate-800">
              <img src={previewPhoto} alt="Invoice Attachment" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
