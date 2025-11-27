
import React, { useRef, useState } from 'react';
import { AppSettings, WatermarkPosition, WatermarkItemType, WatermarkSize } from '../types';
import { XIcon, CheckIcon, UploadIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ShareIcon, DownloadIcon, RefreshIcon, CloudUploadIcon } from '../icons';
import { shareSettings, validateAndParseSettings, syncSettingsFromWeb, uploadSettingsToWeb } from '../utils/settings-import-export';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const POSITION_OPTIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'top-left', label: '↖ Kiri Atas' },
  { value: 'top-right', label: '↗ Kanan Atas' },
  { value: 'bottom-left', label: '↙ Kiri Bawah' },
  { value: 'bottom-right', label: '↘ Kanan Bawah' },
];

const ITEM_LABELS: Record<WatermarkItemType, string> = {
  logo: 'Logo Image',
  qr: 'QR Code',
  company: 'Nama Perusahaan',
  project: 'Nama Proyek',
  time: 'Waktu',
  coordinates: 'Koordinat'
};

const GROUP_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'Posisi: Kiri Atas (Top Left)',
  'top-right': 'Posisi: Kanan Atas (Top Right)',
  'bottom-left': 'Posisi: Kiri Bawah (Bottom Left)',
  'bottom-right': 'Posisi: Kanan Bawah (Bottom Right)',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Web Sync State
  const [webUrl, setWebUrl] = useState('https://armanjr.my.id/geocamerapro/geocam-settings.json');
  const [uploadUrl, setUploadUrl] = useState('https://armanjr.my.id/geocamerapro/update_settings.php');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleExport = async () => {
    try {
      await shareSettings(settings);
    } catch (err: any) {
      alert("Gagal membagikan file: " + (err.message || err));
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const newSettings = validateAndParseSettings(content);
        onUpdateSettings(newSettings);
        alert("Pengaturan berhasil diimpor! Logo, posisi, dan teks telah diperbarui.");
      } catch (err: any) {
        alert("Gagal impor: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset value to allow re-selecting same file
    e.target.value = '';
  };

  const handleWebSync = async () => {
    // Security Check
    const code = prompt("Masukkan Kode Akses Area:");
    if (!code || code.toLowerCase() !== 'kotabaru') {
        alert("⛔ Akses Ditolak: Kode area salah.");
        return;
    }

    if (!webUrl) return;
    setIsSyncing(true);
    try {
        const result = await syncSettingsFromWeb(webUrl);
        if (result.success && result.settings) {
            onUpdateSettings(result.settings);
            alert("✅ " + result.message + "\nSelamat datang, Tim Kotabaru!");
        } else {
            alert("❌ " + result.message);
        }
    } catch (e) {
        alert("Terjadi kesalahan tidak terduga.");
    } finally {
        setIsSyncing(false);
    }
  };

  const handleAdminUpload = async () => {
      const secret = prompt("🔑 ADMIN ONLY: Masukkan Secret Key untuk mengupdate server:");
      if (!secret) return;

      setIsUploading(true);
      try {
          const result = await uploadSettingsToWeb(uploadUrl, secret, settings);
          if (result.success) {
              alert("✅ SUKSES: " + result.message);
          } else {
              alert("❌ GAGAL: " + result.message);
          }
      } catch (e) {
          alert("Error jaringan.");
      } finally {
          setIsUploading(false);
      }
  };

  const getItemPosition = (type: WatermarkItemType): WatermarkPosition => {
      switch(type) {
          case 'logo': return settings.posLogo;
          case 'qr': return settings.posQr;
          case 'company': return settings.posCompany;
          case 'project': return settings.posProject;
          case 'time': return settings.posTime;
          case 'coordinates': return settings.posCoordinates;
          default: return 'bottom-left';
      }
  };

  // Helper to determine if an item is enabled
  const isItemEnabled = (type: WatermarkItemType): boolean => {
      switch(type) {
          case 'logo': return settings.showLogo && !!settings.logoData;
          case 'qr': return settings.showQrCode;
          case 'company': return settings.showCompany;
          case 'project': return settings.showProject;
          case 'time': return settings.showTime;
          case 'coordinates': return settings.showCoordinates;
          default: return false;
      }
  };

  // Safe access to itemOrder to prevent crashes if settings are corrupted
  const safeItemOrder = Array.isArray(settings.itemOrder) ? settings.itemOrder : [];

  const moveItemInGroup = (item: WatermarkItemType, direction: 'up' | 'down') => {
    if (!safeItemOrder.length) return;
    
    const currentPos = getItemPosition(item);
    const groupItems = safeItemOrder.filter(i => getItemPosition(i) === currentPos);
    
    const groupIndex = groupItems.indexOf(item);
    if (groupIndex === -1) return;
    
    const swapTargetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    if (swapTargetIndex < 0 || swapTargetIndex >= groupItems.length) return;
    
    const swapItem = groupItems[swapTargetIndex];
    
    const indexA = safeItemOrder.indexOf(item);
    const indexB = safeItemOrder.indexOf(swapItem);
    
    const newOrder = [...safeItemOrder];
    newOrder[indexA] = swapItem;
    newOrder[indexB] = item;
    
    handleChange('itemOrder', newOrder);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FIX: MEMORY CRASH FIX
    // Use URL.createObjectURL instead of FileReader to avoid loading the full file into RAM.
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 250; 
        let width = img.width;
        let height = img.height;

        // Resize logic to keep aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/png', 0.8);
          handleChange('logoData', resizedDataUrl);
        }
      } catch (err) {
        console.error("Error processing logo", err);
        alert("Gagal memproses gambar. Coba gambar yang lebih kecil.");
      } finally {
        // Cleanup memory
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) {
           fileInputRef.current.value = '';
        }
      }
    };

    img.onerror = () => {
        console.error("Failed to load image from object URL");
        URL.revokeObjectURL(objectUrl);
        alert("File gambar rusak atau tidak didukung.");
    };

    img.src = objectUrl;
  };

  return (
    // FIX: GPU CRASH FIX
    // Removed 'backdrop-blur-sm'. This effect causes crashes on Android when overlaid on Camera Preview.
    // Changed to solid high-opacity background 'bg-neutral-900/98'.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
          <h2 className="text-xl font-bold text-white">Pengaturan Kamera</h2>
          <button onClick={onClose} className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition">
            <XIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-neutral-900">
          
          {/* Section: Identitas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Identitas Proyek</h3>
            
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Logo / Custom Watermark</label>
              <div className="flex items-center gap-4 bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                {settings.logoData ? (
                  <div className="relative w-16 h-16 bg-white/10 rounded-md overflow-hidden flex-shrink-0">
                    <img src={settings.logoData} alt="Logo" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => handleChange('logoData', null)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition"
                    >
                      <TrashIcon className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-neutral-700 rounded-md flex items-center justify-center flex-shrink-0 text-gray-500 text-xs text-center p-1">
                    No Logo
                  </div>
                )}
                
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg text-sm transition w-full justify-center"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Upload Image
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Nama Perusahaan</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg border border-neutral-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Nama Proyek</label>
              <input
                type="text"
                value={settings.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg border border-neutral-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Section: Tampilan & Posisi */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Tampilan & Posisi</h3>
            
            {/* Global Overlay Font Size */}
            <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wide font-bold">Ukuran Teks Overlay</label>
                <div className="flex gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                  <button
                    onClick={() => handleChange('overlaySize', 'small')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                      settings.overlaySize === 'small' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => handleChange('overlaySize', 'medium')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                      settings.overlaySize === 'medium' || !settings.overlaySize ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleChange('overlaySize', 'large')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                      settings.overlaySize === 'large' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Large
                  </button>
                </div>
            </div>

            <div className="space-y-3">
              {settings.logoData && (
                 <ConfigRow 
                   label="Logo / Image" 
                   active={settings.showLogo} 
                   onToggle={(v) => handleChange('showLogo', v)}
                   position={settings.posLogo}
                   onPosChange={(v) => handleChange('posLogo', v)}
                   size={settings.logoSize}
                   onSizeChange={(v) => handleChange('logoSize', v)}
                 />
              )}
              <ConfigRow 
                label="QR Code Tracker" 
                active={settings.showQrCode} 
                onToggle={(v) => handleChange('showQrCode', v)} 
                position={settings.posQr}
                onPosChange={(v) => handleChange('posQr', v)}
                size={settings.qrSize}
                onSizeChange={(v) => handleChange('qrSize', v)}
              />
              <ConfigRow 
                label="Nama Perusahaan" 
                active={settings.showCompany} 
                onToggle={(v) => handleChange('showCompany', v)} 
                position={settings.posCompany}
                onPosChange={(v) => handleChange('posCompany', v)}
              />
              <ConfigRow 
                label="Nama Proyek" 
                active={settings.showProject} 
                onToggle={(v) => handleChange('showProject', v)} 
                position={settings.posProject}
                onPosChange={(v) => handleChange('posProject', v)}
              />
              <ConfigRow 
                label="Koordinat (GPS)" 
                active={settings.showCoordinates} 
                onToggle={(v) => handleChange('showCoordinates', v)} 
                position={settings.posCoordinates}
                onPosChange={(v) => handleChange('posCoordinates', v)}
              />
              <ConfigRow 
                label="Waktu & Tanggal" 
                active={settings.showTime} 
                onToggle={(v) => handleChange('showTime', v)} 
                position={settings.posTime}
                onPosChange={(v) => handleChange('posTime', v)}
              />
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Section: Reorder / Urutan Grouped */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Urutan Tumpukan</h3>
            
            <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700 text-xs text-gray-400 leading-relaxed">
               <strong className="text-white block mb-1">Logika Urutan (Priority):</strong>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Item <strong>Pertama (Atas)</strong> = Menempel pada <strong className="text-emerald-400">Tepi Layar</strong>.</li>
                 <li>Item <strong>Terakhir (Bawah)</strong> = Menumpuk ke arah <strong className="text-blue-400">Tengah Layar</strong>.</li>
               </ul>
            </div>
            
            {/* Render groups for each position */}
            {Object.keys(GROUP_LABELS).map((posKey) => {
                const pos = posKey as WatermarkPosition;
                // Filter items that are in this position AND enabled
                // We use safeItemOrder instead of settings.itemOrder directly to prevent crashes
                const groupItems = safeItemOrder.filter(item => getItemPosition(item) === pos && isItemEnabled(item));

                if (groupItems.length === 0) return null;

                return (
                    <div key={pos} className="space-y-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                            {GROUP_LABELS[pos]}
                        </div>
                        <div className="bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                            {groupItems.map((item, index) => (
                                <div key={item} className="flex items-center justify-between p-2.5 border-b border-neutral-700 last:border-0 hover:bg-neutral-700/50 transition">
                                    <span className="text-sm text-gray-200 font-medium pl-1">{ITEM_LABELS[item]}</span>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => moveItemInGroup(item, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded-md hover:bg-neutral-600 disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 hover:text-white transition"
                                            title="Geser ke arah Tepi Layar"
                                        >
                                            <ArrowUpIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => moveItemInGroup(item, 'down')}
                                            disabled={index === groupItems.length - 1}
                                            className="p-1.5 rounded-md hover:bg-neutral-600 disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 hover:text-white transition"
                                            title="Geser ke arah Tengah Layar"
                                        >
                                            <ArrowDownIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
          </div>
          
           <hr className="border-neutral-800" />
           
           {/* Section: Output Settings */}
           <div className="space-y-4">
              <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Pengaturan Foto</h3>

              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Rasio Foto (Crop)</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleChange('aspectRatio', '16:9')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      settings.aspectRatio === '16:9' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400'
                    }`}
                  >
                    Wide (16:9)
                  </button>
                  <button
                    onClick={() => handleChange('aspectRatio', '4:3')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      settings.aspectRatio === '4:3' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400'
                    }`}
                  >
                    Standard (4:3)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Kualitas & Resolusi</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleChange('resolution', 'high')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      settings.resolution === 'high' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400'
                    }`}
                  >
                    HD (High)
                  </button>
                  <button
                    onClick={() => handleChange('resolution', 'medium')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      settings.resolution === 'medium' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400'
                    }`}
                  >
                    Standard
                  </button>
                </div>
              </div>
           </div>

           <hr className="border-neutral-800" />
           
           {/* Section: Backup & Restore */}
           <div className="space-y-4">
              <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Backup & Restore</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex flex-col items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white py-4 rounded-lg transition"
                >
                  <ShareIcon className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-medium">Backup / Export</span>
                </button>

                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white py-4 rounded-lg transition"
                >
                  <DownloadIcon className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-medium">Restore / Import</span>
                </button>
                
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  ref={importFileRef} 
                  onChange={handleImportFile}
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center">
                Backup akan menyimpan file .json yang berisi semua konfigurasi termasuk logo.
              </p>
              
              <div className="pt-2 border-t border-neutral-800 mt-2">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Sinkronisasi Web</h4>
                  <div className="flex flex-col gap-2">
                      {/* URL Input hidden for security/simplicity - Hardcoded to armanjr.my.id */}
                      <button 
                        onClick={handleWebSync}
                        disabled={isSyncing}
                        className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-4 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition"
                      >
                        <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium">{isSyncing ? 'Mengunduh Pengaturan...' : 'Sync from Server (Cloud)'}</span>
                      </button>
                      <p className="text-[10px] text-gray-600 text-center">
                        Mengunduh konfigurasi standar perusahaan dari server pusat.
                      </p>
                  </div>

                  {/* Admin Upload Button */}
                  <div className="mt-4 pt-2 border-t border-neutral-800/50">
                      <button 
                        onClick={handleAdminUpload}
                        disabled={isUploading}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white border border-neutral-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition text-xs"
                      >
                        <CloudUploadIcon className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                        <span>{isUploading ? 'Mengupload...' : 'Admin: Upload Setting ke Server'}</span>
                      </button>
                  </div>
              </div>
           </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-900/20"
          >
            <CheckIcon className="w-5 h-5" />
            Simpan Pengaturan
          </button>
        </div>

      </div>
    </div>
  );
};

const ConfigRow = ({ label, active, onToggle, position, onPosChange, size, onSizeChange }: { 
    label: string, 
    active: boolean, 
    onToggle: (v: boolean) => void,
    position: WatermarkPosition,
    onPosChange: (v: WatermarkPosition) => void
    size?: WatermarkSize,
    onSizeChange?: (s: WatermarkSize) => void
}) => (
  <div className="flex flex-col bg-neutral-800/50 rounded-lg border border-neutral-800 overflow-hidden">
    <div className="flex items-center justify-between p-2">
        {/* Toggle Switch */}
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => onToggle(!active)}>
            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 flex-shrink-0 ${active ? 'bg-emerald-600' : 'bg-neutral-600'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className={`text-sm transition ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
        </div>

        {/* Position Selector */}
        {active && (
            <select 
                value={position}
                onChange={(e) => onPosChange(e.target.value as WatermarkPosition)}
                className="bg-neutral-900 text-white text-xs border border-neutral-700 rounded px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
            >
                {POSITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        )}
    </div>

    {/* Optional Size Controls */}
    {active && size && onSizeChange && (
        <div className="flex items-center gap-2 px-2 pb-2 pl-14">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Ukuran:</span>
            <div className="flex bg-neutral-900 rounded-md p-0.5 border border-neutral-700">
                {(['s', 'm', 'l'] as WatermarkSize[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => onSizeChange(s)}
                        className={`px-3 py-0.5 text-[10px] font-bold rounded-sm transition ${
                            size === s 
                            ? 'bg-neutral-700 text-white' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {s.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    )}
  </div>
);
