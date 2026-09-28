import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, RefreshCw } from 'lucide-react';

interface ImageCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageDataUrl: string) => void;
  title?: string;
}

export default function ImageCaptureModal({
  isOpen,
  onClose,
  onImageCaptured,
  title = 'Attach Image / Photo'
}: ImageCaptureModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please check camera permissions or upload an image.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreview(dataUrl);
      stopCamera();
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onImageCaptured(preview);
      handleModalClose();
    }
  };

  const handleModalClose = () => {
    stopCamera();
    setPreview(null);
    setCameraError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button 
            onClick={handleModalClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!preview && (
            <div className="flex border-b border-slate-200 pb-3 gap-2">
              <button
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Image File
              </button>
              <button
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'camera'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                Capture with Camera
              </button>
            </div>
          )}

          {preview ? (
            <div className="space-y-4 text-center">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-900 flex items-center justify-center">
                <img src={preview} alt="Captured preview" className="max-h-64 object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake / Choose Other
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Use This Photo
                </button>
              </div>
            </div>
          ) : activeTab === 'upload' ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-xl p-8 text-center cursor-pointer transition-all"
              >
                <Upload className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800">Click to upload photo from your device</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, JPEG (Max 5MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 font-medium">
                  {cameraError}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black max-h-64 flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full max-h-64 object-cover" 
                  />
                </div>
              )}
              {cameraActive && !cameraError && (
                <button
                  onClick={capturePhoto}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Snap Photo Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
