import React, { useState, useEffect } from 'react';
import { CameraRotateIcon } from './components/CameraRotateIcon';
import { ShutterIcon } from './components/ShutterIcon';
import { RetakeIcon } from './components/RetakeIcon';
import { LocationMarkerIcon } from './components/LocationMarkerIcon';
import { SaveIcon } from './components/SaveIcon';
import { GalleryIcon } from './components/GalleryIcon';
import { StopIcon } from './components/StopIcon';
import Gallery from './Gallery';
import { FlashIcon } from './components/FlashIcon';
import { SettingsIcon } from './components/SettingsIcon';
import Settings from './Settings';
import useGeolocation from './src/hooks/useGeolocation';
import useCamera from './src/hooks/useCamera';
import useMediaCapture from './src/hooks/useMediaCapture';
import useFocus from './src/hooks/useFocus';
import useAppSettings from './src/hooks/useAppSettings';
import useUIState from './src/hooks/useUIState';

const App: React.FC = () => {
  // Hooks
  const { currentCoords, geoError, geoStatus, geoPermissionStatus, refreshGeolocation, getCurrentLocation } = useGeolocation();
  const { stream, error, isFlashAvailable, flashMode, facingMode, isReady, videoRef, startStream, stopStream, toggleFlash, flipCamera, setFlashMode } = useCamera();
  const { settings, updateSettings } = useAppSettings();
  const { view, mode, isSettingsOpen, setView, setMode, setIsSettingsOpen } = useUIState();
  const { focusIndicator, handleFocus } = useFocus(stream);
  const {
    capturedImage,
    capturedVideoBlob,
    capturedVideoUrl,
    capturedCoords,
    isRecording,
    recordingDuration,
    isSaving,
    showSaveToast,
    canvasRef,
    handleTakePhoto,
    handleSave,
    startRecording,
    stopRecording,
    formatDuration,
    resetCaptureState,
    setCapturedImage,
    setCapturedCoords
  } = useMediaCapture(settings, currentCoords, getCurrentLocation);

  // Set up camera stream when view is camera
  useEffect(() => {
    if (view === 'camera') {
      startStream();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [view, startStream, stopStream]);

  const handleShutterClick = () => {
    if (mode === 'photo') {
      handleTakePhoto(videoRef);
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording(stream, mode);
      }
    }
  };

  const handleFlipCamera = () => {
    flipCamera();
  };

  // Additional UI functions
  const getAccuracyIndicatorClasses = (accuracy: number | null): string => {
    if (accuracy === null || accuracy >= 30) {
        return 'bg-red-500 animate-pulse-red'; // Poor
    }
    if (accuracy < 10) {
        return 'bg-green-500'; // Good
    }
    return 'bg-yellow-500'; // Medium
  };

  const Toast = () => (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 z-50 ${showSaveToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        Disimpan ke Galeri
    </div>
  );

  // Render the app
  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <Toast />
      {view === 'camera' && (
        <div className="w-full h-full relative">
          {error && <div className="absolute top-0 left-0 right-0 bg-red-600 p-2 text-center z-20">{error}</div>}

          <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" onClick={handleFocus}></video>
          <canvas ref={canvasRef} className="hidden"></canvas>

          {focusIndicator?.active && (
            <div
              className="absolute border-2 border-yellow-400 rounded-md transition-all duration-1000 animate-focus-pulse"
              style={{
                left: `${focusIndicator.x - 40}px`,
                top: `${focusIndicator.y - 40}px`,
                width: '80px',
                height: '80px',
              }}
            ></div>
          )}

          {isRecording && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full flex items-center gap-2 z-10">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-sm">{formatDuration(recordingDuration)}</span>
            </div>
          )}

          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent p-4 flex flex-col justify-start items-center z-10">
            <div className="w-full flex justify-between items-center">
              <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors z-20"
                  aria-label="Pengaturan"
              >
                  <SettingsIcon className="w-6 h-6" />
              </button>
              <div className="flex gap-4">
                {isFlashAvailable && (
                  <button
                    onClick={toggleFlash}
                    className={`p-2 rounded-full hover:bg-white/20 transition-colors ${flashMode === 'on' ? 'text-yellow-400' : ''}`}
                    aria-label={`Nyalakan flash ${flashMode === 'on' ? 'mati' : 'nyala'}`}
                  >
                    <FlashIcon mode={flashMode} className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Coordinate display moved to top toolbar */}
            {!capturedImage && !capturedVideoUrl && (
              <div className="mt-2 w-full max-w-md mx-auto flex flex-col items-center">
                {geoStatus === 'requesting' && (
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-3 rounded-full w-full max-w-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="font-mono text-sm">Mendapatkan lokasi...</span>
                  </div>
                )}

                {currentCoords && geoPermissionStatus !== 'denied' && geoStatus === 'success' && (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-3 rounded-full w-full max-w-xs">
                      <div className={`w-3 h-3 rounded-full ${getAccuracyIndicatorClasses(currentCoords.accuracy)}`}></div>
                      <span className="font-mono text-sm truncate">{currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}</span>
                    </div>
                    {currentCoords.accuracy !== null && (
                      <div className="mt-1 text-xs text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                        Akurasi: {currentCoords.accuracy.toFixed(1)}m
                      </div>
                    )}
                  </div>
                )}

                {/* Show permission request guidance when location permission is denied */}
                {geoPermissionStatus === 'denied' && (
                  <div className="flex flex-col items-center p-3 w-full max-w-xs">
                    <div className="bg-red-600/80 backdrop-blur-sm px-4 py-3 rounded-full w-full">
                      <div className="flex items-center justify-center gap-2">
                        <LocationMarkerIcon className="w-4 h-4"/>
                        <span className="font-mono text-sm">Izin lokasi ditolak</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/80 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full text-center">
                      Aktifkan izin lokasi untuk menambahkan koordinat ke foto/video Anda
                    </div>
                  </div>
                )}

                {geoStatus === 'error' && geoPermissionStatus !== 'denied' && !currentCoords && (
                  <div className="flex items-center gap-2 bg-red-600/80 backdrop-blur-sm px-4 py-3 rounded-full w-full max-w-xs">
                    <LocationMarkerIcon className="w-4 h-4"/>
                    <span className="font-mono text-sm truncate">Gagal mendapatkan lokasi</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/50 to-transparent p-4 flex flex-col items-center justify-end z-10">
            <div className="flex w-full items-center justify-around mb-4">
                <button
                  onClick={() => setMode('photo')}
                  className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${mode === 'photo' ? 'bg-yellow-400 text-black' : 'text-white'}`}
                >
                  FOTO
                </button>
                <button
                  onClick={() => setMode('video')}
                  className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${mode === 'video' ? 'bg-yellow-400 text-black' : 'text-white'}`}
                >
                  VIDEO
                </button>
            </div>
            <div className="flex w-full items-center justify-around">
              <button
                onClick={() => setView('gallery')}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Buka galeri"
              >
                <GalleryIcon className="w-8 h-8"/>
              </button>

              <div className="group" onClick={handleShutterClick} role="button" aria-label={isRecording ? "Hentikan perekaman" : (mode === 'photo' ? "Ambil foto" : "Mulai merekam")}>
                {isRecording ? <StopIcon /> : <ShutterIcon />}
              </div>

              <button
                onClick={handleFlipCamera}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Balikkan kamera"
              >
                <CameraRotateIcon className="w-8 h-8"/>
              </button>
            </div>
          </div>

          {(capturedImage || capturedVideoUrl) && (
            <div className="absolute inset-0 bg-black z-20 flex flex-col">
              <div className="flex-grow flex items-center justify-center">
                  {capturedImage && <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />}
                  {capturedVideoUrl && <video src={capturedVideoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain" />}
              </div>
              <div className="h-40 flex-shrink-0 bg-black flex items-center justify-around">
                <button onClick={resetCaptureState} className="flex flex-col items-center gap-1 text-white hover:text-gray-300">
                  <RetakeIcon className="w-10 h-10" />
                  <span className="font-semibold">ULANGI</span>
                </button>
                <button onClick={handleSave} disabled={isSaving} className="flex flex-col items-center gap-1 text-white hover:text-gray-300 disabled:opacity-50">
                  {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                        <span className="font-semibold">MENYIMPAN...</span>
                      </>
                  ) : (
                      <>
                        <SaveIcon className="w-10 h-10" />
                        <span className="font-semibold">SIMPAN</span>
                      </>
                  )}
                </button>
              </div>
            </div>
          )}

          {geoError && (
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-red-600/80 px-4 py-2 rounded-md text-sm text-center">
              <div className="flex items-center gap-2 mb-1">
                <LocationMarkerIcon className="w-4 h-4"/>
                {geoError}
              </div>

              {geoPermissionStatus === 'denied' ? (
                <div className="mt-1 text-xs">
                  <p className="mb-1">Ikuti langkah-langkah berikut untuk mengaktifkan izin lokasi:</p>
                  <ul className="list-disc list-inside text-left text-xs space-y-1">
                    <li>Klik ikon gembok di sebelah kiri URL</li>
                    <li>Pilih "Izin Situs"</li>
                    <li>Cari "Lokasi"</li>
                    <li>Pilih "Izinkan" atau "Tanyakan Saat Digunakan"</li>
                  </ul>
                  <button
                    onClick={refreshGeolocation}
                    className="mt-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
                  >
                    Periksa Izin Lagi
                  </button>
                </div>
              ) : (
                <button
                  onClick={refreshGeolocation}
                  className="mt-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'gallery' && <Gallery onBack={() => setView('camera')} />}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={updateSettings}
      />

      <style>{`
        .animate-focus-pulse {
          animation: focus-pulse 1s ease-out;
        }
        @keyframes focus-pulse {
          0% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .animate-pulse-red {
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default App;