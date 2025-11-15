import React from 'react';
import { AppSettings, WatermarkPosition } from './App';
import { CloseIcon } from './components/CloseIcon';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, fontSize: Number(e.target.value) });
  };

  const handlePositionChange = (position: WatermarkPosition) => {
    onSettingsChange({ ...settings, watermarkPosition: position });
  };
  
  const handleWatermarkTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, watermarkText: e.target.value });
  };

  const handleFontSize2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, fontSize2: Number(e.target.value) });
  };

  const handlePosition2Change = (position: WatermarkPosition) => {
    onSettingsChange({ ...settings, watermarkPosition2: position });
  };

  const handleWatermarkText2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, watermarkText2: e.target.value });
  };

  const handleEnableWatermark2Toggle = () => {
    onSettingsChange({ ...settings, enableWatermark2: !settings.enableWatermark2 });
  };

  const handleAutoSaveToggle = () => {
    onSettingsChange({ ...settings, autoSave: !settings.autoSave });
  };

  const positions: { key: WatermarkPosition; label: string }[] = [
    { key: 'top-left', label: 'Kiri Atas' },
    { key: 'top-right', label: 'Kanan Atas' },
    { key: 'bottom-left', label: 'Kiri Bawah' },
    { key: 'bottom-right', label: 'Kanan Bawah' },
  ];

  return (
    <>
        <div
            className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
            aria-hidden="true"
        ></div>
        <div
            className={`fixed top-24 right-4 w-80 max-w-[90vw] max-h-[calc(100vh-7rem)] overflow-y-auto bg-gray-900/90 backdrop-blur-lg shadow-2xl z-40 p-6 rounded-2xl transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div className="flex justify-between items-center mb-8">
                <h2 id="settings-title" className="text-2xl font-bold text-white">Pengaturan</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Tutup pengaturan">
                    <CloseIcon className="w-6 h-6 text-white/80" />
                </button>
            </div>

            <div className="space-y-8">
                {/* Watermark 1 Section */}
                <div className="space-y-4 p-4 rounded-lg bg-white/5">
                    <h3 className="text-lg font-semibold text-white/90">Watermark Utama</h3>

                    {/* Watermark Text Setting */}
                    <div>
                        <label htmlFor="watermark-text" className="block text-sm font-medium text-gray-300 mb-2">
                            Teks Watermark
                        </label>
                        <input
                            id="watermark-text"
                            type="text"
                            value={settings.watermarkText}
                            onChange={handleWatermarkTextChange}
                            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-yellow-400 focus:border-yellow-400"
                            placeholder="e.g. {{lat}}, {{lng}}"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            {/* FIX: Corrected JSX syntax for displaying literal strings `{{lat}}`, `{{lng}}`, and `{{acc}}`. */}
                            Gunakan: <code className="bg-gray-800 p-0.5 rounded-sm">{`{{lat}}`}</code>, <code className="bg-gray-800 p-0.5 rounded-sm">{`{{lng}}`}</code>, <code className="bg-gray-800 p-0.5 rounded-sm">{`{{acc}}`}</code>
                        </p>
                    </div>

                    {/* Font Size Setting */}
                    <div>
                        <label htmlFor="font-size" className="block text-sm font-medium text-gray-300 mb-2">
                            Ukuran Font
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                id="font-size"
                                type="range"
                                min="10"
                                max="32"
                                step="1"
                                value={settings.fontSize}
                                onChange={handleFontSizeChange}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-lg font-mono text-white w-12 text-center">{settings.fontSize}px</span>
                        </div>
                    </div>

                    {/* Watermark Position Setting */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                           Posisi
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {positions.map(({key, label}) => (
                                <button
                                    key={key}
                                    onClick={() => handlePositionChange(key)}
                                    className={`py-3 px-4 rounded-md text-sm font-semibold transition-colors duration-200 border-2 ${
                                        settings.watermarkPosition === key
                                            ? 'bg-yellow-400 text-black border-yellow-400'
                                            : 'bg-gray-700 text-white border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Watermark 2 Section */}
                <div className="space-y-4 p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white/90">Watermark Tambahan</h3>
                        <button
                            onClick={handleEnableWatermark2Toggle}
                            role="switch"
                            aria-checked={settings.enableWatermark2}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-400 ${
                            settings.enableWatermark2 ? 'bg-yellow-400' : 'bg-gray-500'
                            }`}
                        >
                            <span
                            aria-hidden="true"
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${
                                settings.enableWatermark2 ? 'translate-x-5' : 'translate-x-0'
                            }`}
                            />
                        </button>
                    </div>

                    {/* Watermark Text 2 Setting */}
                    <div>
                        <label htmlFor="watermark-text2" className="block text-sm font-medium text-gray-300 mb-2">
                            Teks Watermark
                        </label>
                        <input
                            id="watermark-text2"
                            type="text"
                            value={settings.watermarkText2}
                            onChange={handleWatermarkText2Change}
                            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-yellow-400 focus:border-yellow-400"
                            placeholder="e.g. {{acc}}"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            {/* FIX: Corrected JSX syntax for displaying literal strings `{{lat}}`, `{{lng}}`, and `{{acc}}`. */}
                            Gunakan: <code className="bg-gray-800 p-0.5 rounded-sm">{`{{lat}}`}</code>, <code className="bg-gray-800 p-0.5 rounded-sm">{`{{lng}}`}</code>, <code className="bg-gray-800 p-0.5 rounded-sm">{`{{acc}}`}</code>
                        </p>
                    </div>

                    {/* Font Size 2 Setting */}
                    <div>
                        <label htmlFor="font-size2" className="block text-sm font-medium text-gray-300 mb-2">
                            Ukuran Font
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                id="font-size2"
                                type="range"
                                min="10"
                                max="32"
                                step="1"
                                value={settings.fontSize2}
                                onChange={handleFontSize2Change}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-lg font-mono text-white w-12 text-center">{settings.fontSize2}px</span>
                        </div>
                    </div>

                    {/* Watermark Position 2 Setting */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                           Posisi
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {positions.map(({key, label}) => (
                                <button
                                    key={key}
                                    onClick={() => handlePosition2Change(key)}
                                    className={`py-3 px-4 rounded-md text-sm font-semibold transition-colors duration-200 border-2 ${
                                        settings.watermarkPosition2 === key
                                            ? 'bg-yellow-400 text-black border-yellow-400'
                                            : 'bg-gray-700 text-white border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Auto-Save Setting */}
                <div className="p-4 rounded-lg bg-white/5">
                     <h3 className="text-lg font-semibold text-white/90 mb-2">Pengambilan</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                             <label className="block text-sm font-medium text-gray-200">
                                Simpan Otomatis ke Galeri
                            </label>
                            <p className="text-gray-400 text-xs">Simpan langsung setelah pengambilan</p>
                        </div>
                        <button
                            onClick={handleAutoSaveToggle}
                            role="switch"
                            aria-checked={settings.autoSave}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-400 ${
                            settings.autoSave ? 'bg-yellow-400' : 'bg-gray-500'
                            }`}
                        >
                            <span
                            aria-hidden="true"
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${
                                settings.autoSave ? 'translate-x-5' : 'translate-x-0'
                            }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default Settings;
