import React, { useState, useEffect, useRef, useLayoutEffect, lazy, Suspense } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { CheckIcon, SettingsIcon, FlashOffIcon, FlashOnIcon, FlashAutoIcon } from './icons';
import { AppSettings, SavedPhoto } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { HUDOverlay } from './components/HUDOverlay';
import { CameraControls } from './components/CameraControls';

// Hooks
import { useCamera, requestCameraPermission } from './hooks/useCamera';
import { useGeolocation, requestLocationPermission } from './hooks/useGeolocation';
import { useGallery } from './hooks/useGallery';
import { useCapture } from './hooks/useCapture';
import { terminateWorker } from './utils/imageProcessing';

const SETTINGS_KEY = 'geoCamSettings_v1';

// Lazy load modals
const SettingsModal = lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const GalleryModal = lazy(() => import('./components/GalleryModal').then(module => ({ default: module.GalleryModal })));


// Helper to safely load and merge settings
const loadSettings = async (): Promise<AppSettings> => {
    try {
        const { value } = await Preferences.get({ key: SETTINGS_KEY });
        if (!value) {
            return DEFAULT_SETTINGS;
        }

        const saved = JSON.parse(value);
        const validatedSettings: any = { ...DEFAULT_SETTINGS };
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            if (saved.hasOwnProperty(key)) {
                validatedSettings[key] = saved[key];
            }
        }
        return validatedSettings as AppSettings;

    } catch (e) {
        console.error("Failed to load/parse settings, falling back to default.", e);
        return DEFAULT_SETTINGS;
    }
};


const App = () => {
  // --- UI State & Permissions ---
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // --- Infrastructure Hooks ---
  // These hooks are now self-managed and activate when `isEnabled` is true.
  const { videoRef, toggleCamera, toggleFlash, flashMode, isNative, captureImage, facingMode, error: cameraError } = useCamera({ isEnabled: permissionsReady });
  const geoState = useGeolocation({ isEnabled: permissionsReady });
  const { photos, setPhotos, addPhoto } = useGallery();
  
  // More UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhoto | null>(null);

  // --- Initial Setup Flow ---
  useEffect(() => {
    const setupApp = async () => {
      // 1. Sequentially request permissions
      await requestCameraPermission();
      await requestLocationPermission();
      
      // 2. Load settings
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);

      // 3. Signal that services can start
      setPermissionsReady(true);
    };

    setupApp();
  }, []);

  // --- Worker Cleanup ---
  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, []);

  // --- Persistence ---
  useEffect(() => {
    // Save settings on change, but only after initial load is complete
    if (permissionsReady) {
      Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(settings) });
    }
  }, [settings, permissionsReady]);

  // --- Capture Logic Hook (Business Logic) ---
  const { 
      isCapturing, 
      effectState, 
      handleCapture 
  } = useCapture({
      videoRef,
      isNative,
      facingMode,
      settings,
      geoState,
      captureImageNative: captureImage,
      addPhotoToGallery: addPhoto
  });

  // --- Back Button Handling ---
  const stateRef = useRef({ isSettingsOpen, isGalleryOpen, selectedPhoto });
  useLayoutEffect(() => {
    stateRef.current = { isSettingsOpen, isGalleryOpen, selectedPhoto };
  }, [isSettingsOpen, isGalleryOpen, selectedPhoto]);

  useEffect(() => {
    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('backButton', () => {
        const current = stateRef.current;
        if (current.selectedPhoto) { setSelectedPhoto(null); return; }
        if (current.isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (current.isGalleryOpen) { setIsGalleryOpen(false); return; }
        CapacitorApp.exitApp();
      });
      return () => { listener.remove(); };
    };
    const cleanupPromise = setupListener();
    return () => { cleanupPromise.then(cleanup => cleanup && cleanup()); };
  }, []);

  // --- Styles ---
  const getAspectRatioStyle = () => ({
      aspectRatio: settings.aspectRatio === '4:3' ? '3/4' : '9/16',
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-transparent overflow-hidden font-sans select-none">
      
      {/* 1. TOP BAR (Header) */}
      <div className="relative z-30 w-full h-16 bg-black/80 backdrop-blur-sm flex items-center justify-between px-5 safe-area-top flex-shrink-0 border-b border-neutral-800">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-white font-bold text-sm tracking-widest">GEOCAM</span>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={toggleFlash}
                className="p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition active:scale-95 flex items-center justify-center w-10 h-10"
                title={`Flash: ${flashMode.toUpperCase()}`}
            >
              {flashMode === 'off' && <FlashOffIcon className="w-5 h-5 text-gray-400" />}
              {flashMode === 'on' && <FlashOnIcon className="w-5 h-5 text-yellow-400" />}
              {flashMode === 'auto' && <FlashAutoIcon className="w-5 h-5 text-white" />}
            </button>

            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition active:scale-95 flex items-center justify-center w-10 h-10"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* 2. MIDDLE AREA (Viewfinder Stage) */}
      <div className="flex-1 relative w-full flex items-center justify-center overflow-hidden bg-transparent">
        
        <div 
          className="relative w-full max-h-full shadow-[0_0_0_9999px_rgba(0,0,0,1)] z-10"
          style={getAspectRatioStyle()}
        >
            {/* Camera Source */}
            {!isNative && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
            )}
            <div className="absolute inset-0 bg-transparent" />

            {/* Overlays */}
            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                <HUDOverlay settings={settings} geoState={geoState} />
            </div>

            {/* Guidelines */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-10">
                 <div className="w-full h-full border border-white/30">
                    <div className="absolute top-1/3 w-full h-px bg-white/30" />
                    <div className="absolute top-2/3 w-full h-px bg-white/30" />
                    <div className="absolute left-1/3 h-full w-px bg-white/30" />
                    <div className="absolute left-2/3 h-full w-px bg-white/30" />
                 </div>
            </div>

            {/* Effects */}
            <div className={`absolute inset-0 bg-black pointer-events-none z-30 transition-opacity duration-75 ${effectState === 'shutter' ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`absolute inset-0 bg-white pointer-events-none z-30 transition-opacity duration-300 ${effectState === 'flash' ? 'opacity-80' : 'opacity-0'}`} />
            
            {/* Camera Error UI */}
            {cameraError && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <SettingsIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Kamera Bermasalah</h3>
                    <p className="text-gray-400 text-sm max-w-xs">{cameraError}</p>
                </div>
            )}
        </div>
      </div>

      {/* 3. BOTTOM BAR (Controls) */}
      <div className="relative z-30 w-full bg-black flex-shrink-0 safe-area-bottom pt-6 pb-8 border-t border-neutral-900">
         <CameraControls 
            onCapture={handleCapture}
            onToggleCamera={toggleCamera}
            onOpenGallery={() => setIsGalleryOpen(true)}
            isCapturing={isCapturing}
            latestPhoto={photos[0]}
        />
      </div>

      {/* --- MODALS --- */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}
        {isGalleryOpen && (
          <GalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            photos={photos}
            setPhotos={setPhotos}
            selectedPhoto={selectedPhoto}
            onSelectPhoto={setSelectedPhoto}
          />
        )}
      </Suspense>

    </div>
  );
};

export default App;
