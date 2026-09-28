import React, { useState, useEffect } from 'react';
import { 
  SaleEntry, 
  CompanyInvoiceSettings,
  Recipe
} from '../types';
import { 
  Send, 
  MapPin, 
  Copy, 
  Check, 
  X, 
  Share2, 
  Phone, 
  User, 
  ExternalLink, 
  Navigation,
  RefreshCw,
  Building2,
  FileText
} from 'lucide-react';

interface WhatsAppBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleEntry | null;
  companySettings: CompanyInvoiceSettings;
  recipes?: Recipe[];
  onUpdateSaleLocation?: (saleId: string, location: SaleEntry['location']) => void;
}

export default function WhatsAppBillModal({
  isOpen,
  onClose,
  sale,
  companySettings,
  recipes = [],
  onUpdateSaleLocation,
}: WhatsAppBillModalProps) {
  if (!isOpen || !sale) return null;

  // Phone number management
  const rawCustomerPhone = sale.customerPhone ? sale.customerPhone.replace(/[^0-9]/g, '') : '';
  const initialPhone = rawCustomerPhone.length === 10 ? `91${rawCustomerPhone}` : rawCustomerPhone;
  
  const [targetPhone, setTargetPhone] = useState<string>(initialPhone);
  const [recipientType, setRecipientType] = useState<'customer' | 'owner' | 'custom'>('customer');
  const [includeLocation, setIncludeLocation] = useState<boolean>(true);
  const [locationNote, setLocationNote] = useState<string>(sale.deliveryLocationText || '');
  
  // GPS Location state
  const [currentLocation, setCurrentLocation] = useState<SaleEntry['location']>(sale.location || undefined);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Copy confirmation state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Initialize GPS if available or try to auto-fetch if missing
  useEffect(() => {
    if (sale.location?.latitude && sale.location?.longitude) {
      setCurrentLocation(sale.location);
    } else {
      // Auto-fetch current GPS position on opening if supported
      fetchLiveGPS(false);
    }
  }, [sale.id]);

  const fetchLiveGPS = (isUserTriggered: boolean = true) => {
    if (!('geolocation' in navigator)) {
      if (isUserTriggered) setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        
        const locData = {
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          mapsUrl,
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          address: locationNote || sale.customerAddress || undefined,
        };

        setCurrentLocation(locData);
        setIsLocating(false);

        // Optionally persist location back to the sale record
        if (onUpdateSaleLocation) {
          onUpdateSaleLocation(sale.id, locData);
        }
      },
      (err) => {
        setIsLocating(false);
        if (isUserTriggered) {
          setLocationError(
            err.code === 1
              ? 'GPS Permission denied. Please enable location permissions in browser.'
              : 'Unable to retrieve GPS coordinates.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleRecipientTypeChange = (type: 'customer' | 'owner' | 'custom') => {
    setRecipientType(type);
    if (type === 'customer') {
      setTargetPhone(initialPhone);
    } else if (type === 'owner') {
      const ownerClean = companySettings.phone ? companySettings.phone.replace(/[^0-9]/g, '') : '';
      setTargetPhone(ownerClean.length === 10 ? `91${ownerClean}` : ownerClean);
    } else {
      setTargetPhone('');
    }
  };

  // Safe calculated numbers
  const safeTotalAmount = sale.totalAmount || 0;
  const safeFinalAmount = sale.finalAmount || 0;
  const safePaidAmount = sale.paidAmount !== undefined 
    ? sale.paidAmount 
    : (sale.paymentStatus === 'Paid' ? safeFinalAmount : 0);
  const safeBalanceAmount = sale.balanceAmount !== undefined 
    ? sale.balanceAmount 
    : Math.max(0, safeFinalAmount - safePaidAmount);

  // Generate crisp, professional WhatsApp bill copy
  const generateBillText = () => {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const lines: string[] = [];

    // Header
    lines.push(`🧾 *${companySettings.companyName.toUpperCase()}*`);
    if (companySettings.address) lines.push(`📍 ${companySettings.address}`);
    if (companySettings.gstNumber) lines.push(`🏛️ *GSTIN:* ${companySettings.gstNumber}`);
    if (companySettings.phone) lines.push(`📞 Ph: ${companySettings.phone}`);
    lines.push(divider);

    // Invoice & Date
    lines.push(`*TAX INVOICE / BILL COPY*`);
    lines.push(`*Invoice No:* ${sale.invoiceNumber}`);
    lines.push(`*Date & Time:* ${sale.date} ${sale.time || ''}`);
    lines.push(`*Billed By:* ${sale.salesPerson || 'Sales Team'}`);
    lines.push(divider);

    // Customer
    lines.push(`👤 *CUSTOMER DETAILS:*`);
    lines.push(`*Name:* ${sale.customerName}`);
    if (sale.customerPhone) lines.push(`*Phone:* ${sale.customerPhone}`);
    if (sale.customerAddress) lines.push(`*Address:* ${sale.customerAddress}`);
    if (sale.customerType) lines.push(`*Category:* ${sale.customerType}`);
    lines.push(divider);

    // Ordered Line Items
    lines.push(`📦 *ITEMS ORDERED:*`);
    sale.items.forEach((item, idx) => {
      const rec = recipes.find(r => r.id === item.recipeId);
      const pack = rec?.packagingSizes.find(p => p.id === item.packSizeId);
      const name = rec ? rec.name : (item.packSizeName || 'Snack Item');
      const weight = pack?.grams 
        ? `${pack.grams}g Net Wt` 
        : item.packSizeName 
        ? item.packSizeName 
        : (item.saleUnit === 'Kg' ? '1.0 Kg (Bulk)' : 'Standard Pack');
      const unit = item.saleUnit || 'Packs';
      const qtyStr = unit === 'Bundles' 
        ? `${item.quantity} Bundles (${item.quantity * (item.packsPerBundle || 10)} packs)` 
        : unit === 'Kg' 
        ? `${item.quantity} Kg` 
        : `${item.quantity} packs`;

      lines.push(`${idx + 1}. *${name}* [Weight: ${weight}]`);
      lines.push(`   ${qtyStr} @ ₹${(item.unitPrice || 0).toFixed(2)} = *₹${(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`);
    });
    lines.push(divider);

    // Totals & Pricing
    lines.push(`*Subtotal:* ₹${safeTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    if (sale.discount > 0) {
      lines.push(`*Special Discount:* -₹${sale.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    if (sale.taxAmount > 0) {
      lines.push(`*Tax / GST:* +₹${sale.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    lines.push(`*GRAND TOTAL:* *₹${safeFinalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`);
    lines.push(`*Amount Received:* ₹${safePaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    if (safeBalanceAmount > 0) {
      lines.push(`*BALANCE DUE:* *₹${safeBalanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}* ⚠️`);
    } else {
      lines.push(`*Payment Status:* ✅ *PAID IN FULL* (${sale.paymentMethod || 'UPI/Cash'})`);
    }

    if (sale.splitPayment && (sale.paymentMethod === 'Split Payment' || (sale.paymentMethod as any) === 'Split')) {
      const sp = sale.splitPayment;
      const parts = [];
      if (sp.cash > 0) parts.push(`Cash: ₹${sp.cash}`);
      if (sp.upi > 0) parts.push(`UPI: ₹${sp.upi}`);
      if (sp.bankTransfer > 0) parts.push(`Bank: ₹${sp.bankTransfer}`);
      if (sp.credit > 0) parts.push(`Credit: ₹${sp.credit}`);
      if (sp.cheque > 0) parts.push(`Cheque: ₹${sp.cheque}`);
      if (parts.length > 0) {
        lines.push(`*Split Breakdown:* ${parts.join(', ')}`);
      }
    }
    lines.push(divider);

    // Location / Delivery GPS Pin
    if (includeLocation) {
      lines.push(`📍 *DELIVERY & STORE GPS LOCATION:*`);
      if (currentLocation?.latitude && currentLocation?.longitude) {
        lines.push(`*Google Maps Pin:*`);
        lines.push(`${currentLocation.mapsUrl || `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`}`);
        lines.push(`_Coordinates: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}${currentLocation.accuracyMeters ? ` (±${currentLocation.accuracyMeters}m)` : ''}_`);
      } else if (sale.customerAddress) {
        lines.push(`*Address / Landmark:* ${sale.customerAddress}`);
      } else {
        lines.push(`*Delivery Spot:* Pinned by Salesperson on delivery`);
      }

      if (locationNote.trim()) {
        lines.push(`*Delivery Note:* ${locationNote.trim()}`);
      }
      lines.push(divider);
    }

    // Footer
    lines.push(`🙏 *Thank you for your business!*`);
    lines.push(`_For repeat orders, distributor queries or bulk supply, contact our direct line: ${companySettings.phone || '+91 9842100022'}._`);

    return lines.join('\n');
  };

  const billMessage = generateBillText();

  // Send to WhatsApp handler
  const handleSendWhatsApp = () => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(billMessage);
    
    // If valid number provided, send to that chat, else open generic WhatsApp share
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(billMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy bill message:', err);
    }
  };

  // Web Share API handler (if on mobile device)
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill Copy: ${sale.invoiceNumber} - ${companySettings.companyName}`,
          text: billMessage,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Send className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight flex items-center gap-2">
                <span>Send WhatsApp Bill Copy</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-900/60 text-emerald-200 rounded-full border border-emerald-500/40">
                  {sale.invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90">
                Share complete itemized bill with live store/delivery GPS location
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-800 text-xs">
          
          {/* Target Recipient Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Select WhatsApp Recipient
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Customer or Head Office</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRecipientTypeChange('customer')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  recipientType === 'customer'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span>Customer Phone</span>
                  {recipientType === 'customer' && <Check className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                  {sale.customerPhone || 'Not entered'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientTypeChange('owner')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  recipientType === 'owner'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span>Factory / CEO</span>
                  {recipientType === 'owner' && <Check className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                  {companySettings.phone || 'Owner Ph'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientTypeChange('custom')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  recipientType === 'custom'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span>Custom Number</span>
                  {recipientType === 'custom' && <Check className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Type any mobile
                </div>
              </button>
            </div>

            {/* Recipient Phone Input */}
            <div className="pt-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                WhatsApp Phone Number (with Country Code)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold text-xs">
                  +
                </span>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="e.g. 919842100000"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: For Indian mobile numbers, include prefix <strong>91</strong> (e.g. 919842100000).
              </p>
            </div>
          </div>

          {/* GPS Location & Google Maps Section */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Attach Live GPS Store / Delivery Location
                </span>
              </label>

              <button
                type="button"
                onClick={() => fetchLiveGPS(true)}
                disabled={isLocating}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Fetch updated device GPS coordinates"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Refresh GPS'}</span>
              </button>
            </div>

            {includeLocation && (
              <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                {currentLocation?.latitude && currentLocation?.longitude ? (
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          GPS Coordinates Captured
                        </span>
                        {currentLocation.accuracyMeters && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            (Accuracy: ±{currentLocation.accuracyMeters}m)
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-slate-700">
                        Lat: <strong>{currentLocation.latitude.toFixed(5)}</strong>, Lng: <strong>{currentLocation.longitude.toFixed(5)}</strong>
                      </p>
                    </div>

                    <a
                      href={currentLocation.mapsUrl || `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View Map Pin</span>
                    </a>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                    <span>
                      {locationError || 'No GPS coordinates stored on this bill yet. Click "Refresh GPS" to acquire current live position.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchLiveGPS(true)}
                      className="ml-2 px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-bold hover:bg-amber-700 shrink-0 cursor-pointer"
                    >
                      Get GPS Pin
                    </button>
                  </div>
                )}

                {/* Optional Delivery Landmark Note */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                    Delivery Landmark / Shop Location Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={locationNote}
                    onChange={(e) => setLocationNote(e.target.value)}
                    placeholder="e.g. Near Bus Stand, Bazaar Main Road, Store Front"
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Formatted Bill Preview Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Live WhatsApp Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 bg-emerald-950 text-emerald-100 rounded-xl font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap border border-emerald-900 shadow-inner select-all">
              {billMessage}
            </div>
          </div>

        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{isCopied ? 'Copied to Clipboard' : 'Copy Text'}</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleWebShare}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Share using native device share dialog"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Share...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
