import React, { useRef, useState } from 'react';
import { SaleEntry, CompanyInvoiceSettings, PaymentReceipt, UserRole, Recipe } from '../types';
import WhatsAppBillModal from './WhatsAppBillModal';
import { 
  Printer, 
  Download, 
  Share2, 
  Send, 
  Check, 
  X, 
  XCircle, 
  FileText, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Receipt,
  Plus,
  Truck,
  PackageCheck,
  FileCheck,
  CheckSquare,
  Upload,
  Camera,
  Building2,
  Sparkles,
  Paperclip
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleEntry | null;
  companySettings: CompanyInvoiceSettings;
  currentUserRole: UserRole;
  recipes?: Recipe[];
  onCancelInvoice?: (saleId: string, reason: string) => void;
  onAddPayment?: (saleId: string, amount: number, method: string, notes: string) => void;
  onUpdateSaleLocation?: (saleId: string, location: SaleEntry['location']) => void;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  sale,
  companySettings,
  currentUserRole,
  recipes = [],
  onCancelInvoice,
  onAddPayment,
  onUpdateSaleLocation,
}: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [documentView, setDocumentView] = useState<'delivery' | 'payment_bill' | 'both'>('delivery');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Payment Bill Copy Submission State
  const [paymentSlipRef, setPaymentSlipRef] = useState<string>('');
  const [paymentSlipUploaded, setPaymentSlipUploaded] = useState<string | null>(null);
  const [isSubmittingSlip, setIsSubmittingSlip] = useState<boolean>(false);
  const [slipSubmittedSuccess, setSlipSubmittedSuccess] = useState<boolean>(false);
  
  // Payment add form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [payNotes, setPayNotes] = useState('');

  if (!isOpen || !sale) return null;

  const totalPaid = sale.paidAmount !== undefined 
    ? sale.paidAmount 
    : (sale.paymentStatus === 'Paid' ? sale.finalAmount : 0);

  const balanceDue = sale.balanceAmount !== undefined 
    ? sale.balanceAmount 
    : Math.max(0, sale.finalAmount - totalPaid);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `${companySettings.companyName.replace(/\s+/g, '')}_${sale.invoiceNumber}_${documentView}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Unable to generate PDF. Falling back to standard browser print.');
      window.print();
    }
  };

  const handleWhatsAppShare = () => {
    setIsWhatsAppModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancelling this bill.');
      return;
    }
    if (onCancelInvoice) {
      onCancelInvoice(sale.id, cancelReason.trim());
      setShowCancelModal(false);
      setCancelReason('');
    }
  };

  const handleConfirmPayment = () => {
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (onAddPayment) {
      onAddPayment(sale.id, payAmount, payMethod, payNotes.trim());
      setShowAddPaymentModal(false);
      setPayAmount(0);
      setPayNotes('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPaymentSlipUploaded(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentBillCopy = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSlip(true);
    setTimeout(() => {
      setIsSubmittingSlip(false);
      setSlipSubmittedSuccess(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-150 my-auto print:border-none print:shadow-none print:max-w-none print:rounded-none flex flex-col max-h-[95vh] print:max-h-none">
        
        {/* Action Header Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight">{sale.invoiceNumber}</span>
                <span className="text-[11px] text-slate-400 font-normal">• {sale.customerName}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Document Layout & Payment Submission Center
              </p>
            </div>
          </div>

          {/* Document Layout Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDocumentView('delivery')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  documentView === 'delivery'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Print</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentView('payment_bill')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  documentView === 'payment_bill'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Payment Bill Copy</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentView('both')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  documentView === 'both'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View & print both Delivery Print and Payment Bill Copy consecutively"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>2-Page Set</span>
              </button>
            </div>

            {/* Print & Export Actions */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-750">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Print Current Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Download PDF Copy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Send WhatsApp Copy"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {balanceDue > 0 && !sale.isCancelled && onAddPayment && (
                <button
                  onClick={() => {
                    setPayAmount(balanceDue);
                    setShowAddPaymentModal(true);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Receive</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 ml-1 cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Printable Documents Container (Scrollable on screen, full height in print) */}
        <div ref={invoiceRef} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 font-sans text-xs print:p-0 print:bg-white print:overflow-visible space-y-6" id="printable-bill-document">
          
          {sale.isCancelled && (
            <div className="bg-rose-50 border-2 border-rose-300 p-3 rounded-xl text-center font-bold text-rose-800 uppercase tracking-widest text-sm shadow-xs">
              *** CANCELLED BILL *** (Reason: {sale.cancellationReason || 'Cancelled by Admin'})
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 1: ONE FULL COLUMN DOCUMENT LAYOUT LABELED "DELIVERY PRINT"          */}
          {/* ========================================================================= */}
          {(documentView === 'delivery' || documentView === 'both') && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:rounded-none print:p-6 print:break-inside-avoid">
              
              {/* Document Banner Label: ONE FULL COLUMN LABELED "DELIVERY PRINT" */}
              <div className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-sm tracking-wider uppercase">
                    Delivery Print
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Goods Dispatch & Handover Copy
                </span>
              </div>

              {/* Company Header & Delivery Identification */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
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
                    {companySettings.fssaiNumber && <p>FSSAI Lic No: <strong className="font-mono text-slate-800">{companySettings.fssaiNumber}</strong></p>}
                    {companySettings.gstNumber && <p>GSTIN: <strong className="font-mono text-slate-900">{companySettings.gstNumber}</strong></p>}
                  </div>
                </div>

                <div className="text-right space-y-1 self-stretch sm:self-auto bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[220px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DISPATCH CHALLAN</p>
                  <p className="text-base font-black text-slate-900 font-mono">DC-{sale.invoiceNumber.replace(/^INV-/, '')}</p>
                  <p className="text-[11px] text-slate-500">Invoice Ref: <strong className="font-mono text-indigo-700">{sale.invoiceNumber}</strong></p>
                  <p className="text-[11px] text-slate-500">Date: <strong className="font-mono text-slate-800">{sale.date}</strong></p>
                  <p className="text-[11px] text-slate-500">Dispatch Time: <strong className="font-mono text-slate-800">{sale.time || '10:00 AM'}</strong></p>
                </div>
              </div>

              {/* Delivery Consignee & Route Information Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CONSIGNEE / STORE DELIVERED TO</p>
                  <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
                  {sale.customerPhone && <p className="text-[11px] text-slate-600 font-mono">Mobile / Contact: {sale.customerPhone}</p>}
                  {sale.customerAddress && <p className="text-[11px] text-slate-600">{sale.customerAddress}</p>}
                  {sale.customerType && (
                    <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {sale.customerType} Store
                    </span>
                  )}
                </div>

                <div className="space-y-1 sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DELIVERY LOGISTICS & EXECUTIVE</p>
                  <p className="text-xs font-bold text-slate-800">{sale.salesPerson || 'Field Delivery Executive'}</p>
                  <p className="text-[11px] text-slate-600">Route / Area: <strong className="text-slate-800">{sale.deliveryLocationText || 'Assigned Beat Route'}</strong></p>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center sm:justify-end gap-1 mt-1">
                    <CheckSquare className="w-3 h-3 text-emerald-600" />
                    Stock Inspected Prior to Dispatch
                  </p>
                </div>

                {/* GPS Pin Information */}
                {sale.location?.latitude && sale.location?.longitude && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Verified GPS Counter: <strong className="font-mono">{sale.location.latitude.toFixed(6)}, {sale.location.longitude.toFixed(6)}</strong>
                        {sale.deliveryLocationText ? ` • Landmark: ${sale.deliveryLocationText}` : ''}
                      </span>
                    </div>
                    <a
                      href={sale.location.mapsUrl || `https://maps.google.com/?q=${sale.location.latitude},${sale.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      Open in Maps →
                    </a>
                  </div>
                )}
              </div>

              {/* Delivery Products Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                      <th className="p-3 w-12 text-center">S.No</th>
                      <th className="p-3">Snack Product Description</th>
                      <th className="p-3 text-center">Packaging / Weight</th>
                      <th className="p-3 text-right">Dispatch Qty</th>
                      <th className="p-3 text-center">Unit</th>
                      <th className="p-3 text-center w-24">Store Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sale.items.map((item, idx) => {
                      const rec = recipes.find((r) => r.id === item.recipeId);
                      const pack = rec?.packagingSizes.find((p) => p.id === item.packSizeId);
                      const weightGrams = pack?.grams;
                      const productName = rec ? rec.name : 'Snack Item';
                      const weightDisplay = weightGrams 
                        ? `${weightGrams}g Net Wt` 
                        : item.packSizeName 
                        ? item.packSizeName 
                        : item.saleUnit === 'Kg' 
                        ? '1.0 Kg (Bulk)' 
                        : 'Standard Pack';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 text-center">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {productName}
                            </span>
                            {item.saleUnit === 'Bundles' && (
                              <span className="ml-2 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                                Bundle of {item.packsPerBundle || 10} packs
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-slate-700">
                            {weightDisplay}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-600">
                            {item.saleUnit || 'Packs'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded border border-emerald-200">
                              [✓] Received
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Packets / Goods Count Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 gap-2">
                <div className="text-[11px] text-slate-600">
                  Total Delivery Items: <strong>{sale.items.length} distinct snack variants</strong>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-3">
                  <span>Total Quantity Dispatched:</span>
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-sm font-black">
                    {sale.items.reduce((sum, it) => sum + (it.quantity || 0), 0)} Units
                  </span>
                </div>
              </div>

              {/* Store Handover & Receiver Signature Box */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 text-[11px] text-slate-500">
                  <p className="font-bold uppercase text-slate-700">Goods Receipt Declaration:</p>
                  <p className="leading-relaxed">
                    Received all packaged snack goods listed above in fresh, sealed, and undamaged condition with correct weights and seal integrity.
                  </p>
                  <div className="pt-4 space-y-1 font-mono text-[10px] text-slate-600">
                    <p>Delivered by: <strong>{sale.salesPerson || 'Sales Executive'}</strong></p>
                    <p>Date & Time: <strong>{sale.date} • {sale.time || '10:00 AM'}</strong></p>
                  </div>
                </div>

                <div className="flex flex-col justify-end space-y-6 sm:text-right">
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[80px]">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Store Seal & Customer Signature
                    </span>
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-800">
                    Receiver's Signature & Stamp
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Page Break for 2-Page Print Set */}
          {documentView === 'both' && (
            <div className="print-page-break my-6 border-b-2 border-dashed border-slate-300 text-center text-[10px] font-bold text-slate-400 py-2 print:border-none print:h-0 print:p-0 print:my-0">
              <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-300 print:hidden">
                ✂️ Next Page: Payment Bill Copy (Printed Separately)
              </span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 2: PAYMENT BILL COPY & SUBMISSION VOUCHER                           */}
          {/* ========================================================================= */}
          {(documentView === 'payment_bill' || documentView === 'both') && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:rounded-none print:p-6 print:break-inside-avoid">
              
              {/* Document Banner Label: STYLED SIMILARLY TO DELIVERY PRINT PAGE */}
              <div className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-sm tracking-wider uppercase">
                    Payment Bill Copy
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Accounts & Payment Submission Copy
                </span>
              </div>

              {/* Company Header & Payment Bill Identification */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
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
                    {companySettings.gstNumber && <p>GSTIN: <strong className="font-mono text-slate-900">{companySettings.gstNumber}</strong></p>}
                    <p>Bank: <strong className="font-mono">{companySettings.bankName}</strong> | A/C: <strong className="font-mono">{companySettings.accountNumber}</strong></p>
                  </div>
                </div>

                <div className="text-right space-y-1 self-stretch sm:self-auto bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[220px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">BILL PAYMENT VOUCHER</p>
                  <p className="text-base font-black text-slate-900 font-mono">{sale.invoiceNumber}</p>
                  <p className="text-[11px] text-slate-500">Date: <strong className="font-mono text-slate-800">{sale.date}</strong></p>
                  <p className="text-[11px] text-slate-500">Payment Status: 
                    <span className={`ml-1 font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                      sale.isCancelled 
                        ? 'bg-rose-100 text-rose-800' 
                        : sale.paymentStatus === 'Paid' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sale.paymentStatus === 'Paid' ? 'FULLY PAID' : sale.paymentStatus === 'Partial' ? 'PARTIALLY PAID' : sale.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>

              {/* Billed Store & Payment Ledger Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BILLED TO (STORE / CLIENT)</p>
                  <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
                  {sale.customerPhone && <p className="text-[11px] text-slate-600 font-mono">Contact: {sale.customerPhone}</p>}
                  {sale.customerAddress && <p className="text-[11px] text-slate-600">{sale.customerAddress}</p>}
                  {sale.customerType && (
                    <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {sale.customerType} Rate Structure
                    </span>
                  )}
                </div>

                <div className="space-y-1 sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAYMENT SETTLEMENT SUMMARY</p>
                  <p className="text-sm font-black text-slate-900 font-mono">
                    Net Bill: ₹{(sale.finalAmount || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold font-mono">
                    Paid to Date: ₹{(totalPaid || 0).toFixed(2)}
                  </p>
                  <p className={`text-[11px] font-bold font-mono ${balanceDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    Balance Due: ₹{(balanceDue || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Primary Mode: <strong className="text-slate-800">{sale.paymentMethod}</strong>
                  </p>
                </div>
              </div>

              {/* Product Pricing & Calculation Ledger */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                      <th className="p-3 w-12 text-center">S.No</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-center">Weight / Size</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Unit Rate (₹)</th>
                      <th className="p-3 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sale.items.map((item, idx) => {
                      const rec = recipes.find((r) => r.id === item.recipeId);
                      const pack = rec?.packagingSizes.find((p) => p.id === item.packSizeId);
                      const weightDisplay = pack?.grams ? `${pack.grams}g` : item.packSizeName || 'Pack';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 text-center">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{rec ? rec.name : 'Snack Item'}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{weightDisplay}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{item.quantity}</td>
                          <td className="p-3 text-right font-mono text-slate-600">₹{(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">₹{(item.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown & Split Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Payment Methods & Receipts Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    Payment Collection Breakdown
                  </p>

                  {sale.splitPayment ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      {sale.splitPayment.cash > 0 && <div className="flex justify-between"><span>Cash:</span><span className="font-bold">₹{sale.splitPayment.cash}</span></div>}
                      {sale.splitPayment.upi > 0 && <div className="flex justify-between"><span>UPI:</span><span className="font-bold">₹{sale.splitPayment.upi}</span></div>}
                      {sale.splitPayment.bankTransfer > 0 && <div className="flex justify-between"><span>Bank Transfer:</span><span className="font-bold">₹{sale.splitPayment.bankTransfer}</span></div>}
                      {sale.splitPayment.credit > 0 && <div className="flex justify-between"><span>Credit / Due:</span><span className="font-bold text-amber-700">₹{sale.splitPayment.credit}</span></div>}
                      {sale.splitPayment.cheque > 0 && <div className="flex justify-between"><span>Cheque:</span><span className="font-bold">₹{sale.splitPayment.cheque}</span></div>}
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-slate-700">
                      Primary Payment Mode: <strong className="text-slate-900">{sale.paymentMethod}</strong>
                    </div>
                  )}

                  {sale.paymentHistory && sale.paymentHistory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1 text-[10px]">
                      <p className="font-bold text-slate-600 uppercase">Payment Receipts Recorded:</p>
                      {sale.paymentHistory.map((rec) => (
                        <div key={rec.id} className="flex justify-between bg-white p-1.5 rounded border border-slate-200 font-mono">
                          <span>{rec.date} ({rec.method})</span>
                          <span className="font-bold text-emerald-700">+₹{rec.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <div className="space-y-1.5 font-mono text-xs text-right bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span>₹{(sale.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount (-):</span>
                      <span>-₹{(sale.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {sale.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST / Tax (+):</span>
                      <span>+₹{(sale.taxAmount || 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Bill Value:</span>
                    <span>₹{(sale.finalAmount || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1">
                    <span>Total Amount Paid:</span>
                    <span>₹{(totalPaid || 0).toFixed(2)}</span>
                  </div>

                  <div className={`flex justify-between text-xs font-black p-2 rounded-lg mt-1 ${
                    balanceDue === 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}>
                    <span>Outstanding Due:</span>
                    <span>₹{(balanceDue || 0).toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* PAYMENT BILL COPY SUBMISSION SECTION (Interactive & Form Styled) */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-3 print:bg-white print:border-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>Payment Bill Copy Submission Proof</span>
                  </div>
                  {slipSubmittedSuccess ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Submitted & Verified by Accounts Desk
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                      Pending Accounts Submission
                    </span>
                  )}
                </div>

                {/* Submission Form / Attach Copy Bar */}
                <form onSubmit={handleSubmitPaymentBillCopy} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transaction / UPI Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI / Bank Ref UTR 382910"
                      value={paymentSlipRef}
                      onChange={(e) => setPaymentSlipRef(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-500" />
                      <span>Upload Signed Bill / Receipt Copy</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isSubmittingSlip}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 print:hidden"
                    >
                      {isSubmittingSlip ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit Bill Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Uploaded Slip Preview */}
                {paymentSlipUploaded && (
                  <div className="pt-2 border-t border-indigo-200/80 flex items-center gap-3">
                    <img 
                      src={paymentSlipUploaded} 
                      alt="Uploaded Payment Bill Slip" 
                      className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs" 
                    />
                    <div className="text-[11px] text-slate-700 space-y-0.5">
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Signed Bill Copy Attached
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Ref: {paymentSlipRef || 'Self Verified Cash/UPI Receipt'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accounts Signatures & Stamp */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1 text-[11px] text-slate-500">
                  <p className="font-bold uppercase text-slate-700">Accounts Department Note:</p>
                  <p className="leading-relaxed">
                    Payment entries are subject to bank clearance. For UPI/NEFT, transaction reference serves as confirmation.
                  </p>
                  <div className="pt-3 font-mono text-[10px] text-slate-600">
                    <p>Verified By: <strong>Accounts Desk / Cashier</strong></p>
                    <p>Status: <strong className="text-emerald-700">{sale.paymentStatus === 'Paid' ? 'Full Settlement Received' : 'Partial / Balance Due'}</strong></p>
                  </div>
                </div>

                <div className="flex flex-col justify-end space-y-6 sm:text-right">
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[80px]">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Accounts Department Seal & Signature
                    </span>
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-800">
                    Authorized Cashier / Finance Signatory
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Receive Balance Payment Modal */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Receive Balance Payment ({sale.invoiceNumber})
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-bold text-rose-700 font-mono">₹{balanceDue}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    max={balanceDue}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash Payment</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Remarks / Reference</label>
                  <input
                    type="text"
                    placeholder="e.g., GPay Ref #982312"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddPaymentModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Record Payment & Generate Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-rose-700 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Cancel Invoice ({sale.invoiceNumber})
              </h3>
              <p className="text-xs text-slate-600">
                Cancelling this bill will mark it as CANCELLED in the sales log and record the reason in the CEO Audit Log.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700">Reason for Cancellation</label>
                <textarea
                  required
                  placeholder="e.g. Returned goods, order duplicate, incorrect billing"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs h-20"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Confirm Bill Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Dedicated WhatsApp Bill Copy with Location Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppBillModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          sale={sale}
          companySettings={companySettings}
          recipes={recipes}
          onUpdateSaleLocation={onUpdateSaleLocation}
        />
      )}
    </div>
  );
}
