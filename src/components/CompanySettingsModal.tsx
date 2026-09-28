import React, { useState, useRef } from 'react';
import { CompanyInvoiceSettings } from '../types';
import { 
  Building, 
  Upload, 
  X, 
  Check, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanyInvoiceSettings;
  onSave: (updated: CompanyInvoiceSettings) => void;
}

export default function CompanySettingsModal({
  isOpen,
  onClose,
  settings,
  onSave
}: CompanySettingsModalProps) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<CompanyInvoiceSettings>({
    companyName: settings.companyName || 'Aadiyar T3 Snacks',
    tagline: settings.tagline || 'Portion Controls & ERP System',
    logoUrl: settings.logoUrl || '',
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    gstin: settings.gstin || settings.gstNumber || '',
    gstNumber: settings.gstNumber || settings.gstin || '',
    invoicePrefix: settings.invoicePrefix || 'INV-',
    startingNumber: settings.startingNumber || 1001,
    financialYear: settings.financialYear || '2025-2026',
    bankName: settings.bankName || '',
    accountNumber: settings.accountNumber || '',
    ifscCode: settings.ifscCode || '',
    upiId: settings.upiId || '',
    termsAndConditions: settings.termsAndConditions || ''
  });

  const [imagePreview, setImagePreview] = useState<string>(settings.logoUrl || '');
  const [logoInputType, setLogoInputType] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>(settings.logoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, logoUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setImagePreview('');
    setUrlInput('');
    setFormData(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (urlInput) {
      setImagePreview(urlInput);
      setFormData(prev => ({ ...prev, logoUrl: urlInput }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      alert('Company Name is required.');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Edit Company Name & Logo</h3>
              <p className="text-xs text-slate-400">Update organization branding, header logo, and business invoice profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Header Preview Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">
              Header Branding Live Preview
            </div>
            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Company Logo Preview" 
                  className="w-10 h-10 rounded-lg object-cover border border-indigo-500/50 shadow-xs" 
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl text-white shadow-xs">
                  {formData.companyName ? formData.companyName.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight uppercase text-slate-100">
                  {formData.companyName || 'Your Company Name'}
                </span>
                <span className="text-[11px] text-indigo-400 font-medium">
                  {formData.tagline || 'Portion Controls & ERP System'}
                </span>
              </div>
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Company Logo Upload / Change
            </label>
            
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setLogoInputType('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  logoInputType === 'upload' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Upload File from Device
              </button>
              <button
                type="button"
                onClick={() => setLogoInputType('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  logoInputType === 'url' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Image URL Link
              </button>
            </div>

            {logoInputType === 'upload' ? (
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center transition-all bg-slate-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="company-logo-upload-input"
                />
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <label 
                      htmlFor="company-logo-upload-input" 
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                    >
                      Click to choose image file
                    </label>
                    <span className="text-xs text-slate-500"> or drag and drop</span>
                  </div>
                  <p className="text-[10px] text-slate-400">PNG, JPG, WEBP or SVG (Max 5MB)</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL (https://...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Apply URL
                </button>
              </div>
            )}

            {imagePreview && (
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <img src={imagePreview} alt="Logo preview" className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
                  <span className="text-xs font-bold text-slate-700">Logo attached</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              </div>
            )}
          </div>

          {/* Company Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g., Aadiyar T3 Snacks"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subtitle / Tagline
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="e.g., Portion Controls & ERP System"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Contact & GST Invoice Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 9842100011"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="sales@aadiyart3.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstin || formData.gstNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value, gstNumber: e.target.value }))}
                  placeholder="33ABCDE1234F1Z5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Financial Year</label>
                <input
                  type="text"
                  value={formData.financialYear || '2025-2026'}
                  onChange={(e) => setFormData(prev => ({ ...prev, financialYear: e.target.value }))}
                  placeholder="2025-2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Factory / Office Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="124 Factory Lane, Industrial Estate, Tamil Nadu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
