import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraRotateIcon } from './components/CameraRotateIcon';
import { ShutterIcon } from './components/ShutterIcon';
import { RetakeIcon } from './components/RetakeIcon';
import { LocationMarkerIcon } from './components/LocationMarkerIcon';
import { SaveIcon } from './components/SaveIcon';
import { GalleryIcon } from './components/GalleryIcon';
import { StopIcon } from './components/StopIcon';
import { addMedia } from './db';
import Gallery from './Gallery';
import { FlashIcon } from './components/FlashIcon';
import { SettingsIcon } from './components/SettingsIcon';
import Settings from './Settings';

type FacingMode = 'user' | 'environment';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface AppSettings {
  fontSize: number;
  watermarkPosition: WatermarkPosition;
  autoSave: boolean;
  watermarkText: string;
}

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};
type View = 'camera' | 'gallery';
type Mode = 'photo' | 'video';
type FlashMode = 'off' | 'on';

const App: React.FC = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [capturedCoords, setCapturedCoords] = useState<Coordinates | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<View>('camera');
  const [mode, setMode] = useState<Mode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isFlashAvailable, setIsFlashAvailable] = useState(false);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    fontSize: 14,
    watermarkPosition: 'top-left',
    autoSave: false,
    watermarkText: '{{lat}}, {{lng}}',
  });
  const [showSaveToast, setShowSaveToast] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const geoWatchRef = useRef<number | null>(null); // To store the watchPosition ID
  const geoTimeoutRef = useRef<number | null>(null); // To store the timeout ID
  const hasReceivedLocationRef = useRef(false); // To track if we've received a location

  // Load settings from localStorage on initial load
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('geoCamSettings');
      if (savedSettings) {
        // Merge saved settings with defaults to avoid breaking changes
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({ ...prevSettings, ...parsedSettings }));
      }
    } catch (err) {
      console.error("Could not load settings:", err);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('geoCamSettings', JSON.stringify(settings));
    } catch (err) {
      console.error("Could not save settings:", err);
    }
  }, [settings]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsFlashAvailable(false);
    }
  }, [stream]);
  
  const startStream = useCallback(async () => {
    stopStream();
    setError(null);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true // Request audio for video recording
      });

      // Check for flash support
      const videoTrack = newStream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      if ((capabilities as any).torch) {
        setIsFlashAvailable(true);
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera/mic:", err);
      if (err instanceof Error) {
        setError(`Akses perangkat ditolak atau tidak tersedia: ${err.message}. Silakan periksa izin.`);
      } else {
        setError('Terjadi kesalahan yang tidak diketahui saat mengakses kamera/mikrofon.');
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (view === 'camera') {
        startStream();
    } else {
        stopStream();
    }
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, view]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation tidak didukung oleh browser ini.');
      return;
    }

    // First, try to get a quick location with shorter timeout
    geoTimeoutRef.current = window.setTimeout(() => {
      if (!hasReceivedLocationRef.current) {
        setGeoError('Tidak dapat mendapatkan lokasi saat ini. Pastikan izin lokasi diaktifkan dan sinyal GPS memadai.');
      }
    }, 10000); // 10 second timeout for initial location

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (geoTimeoutRef.current) {
          clearTimeout(geoTimeoutRef.current); // Clear the timeout when we get a location
          geoTimeoutRef.current = null;
        }
        hasReceivedLocationRef.current = true;
        setGeoError(null); // Clear any previous error once we get a location
        setCurrentCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (err) => {
        if (geoTimeoutRef.current) {
          clearTimeout(geoTimeoutRef.current); // Clear the timeout on error
          geoTimeoutRef.current = null;
        }
        hasReceivedLocationRef.current = true; // Prevent the timeout from showing an error later
        console.error("Error getting geolocation:", err);
        setGeoError(`Kesalahan geolokasi: ${err.message}.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,      // Increased timeout to 15 seconds
        maximumAge: 30000    // Accept cached positions up to 30 seconds old
      }
    );

    return () => {
      if (geoTimeoutRef.current) {
        clearTimeout(geoTimeoutRef.current);
      }
      if (geoWatchRef.current) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  const resetCaptureState = () => {
    setCapturedImage(null);
    setCapturedCoords(null);
    setCapturedVideoBlob(null);
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideoUrl(null);
  };
  
  const renderWatermarkText = useCallback((coords: Coordinates | null): string => {
    if (!coords || !settings.watermarkText) return '';
    
    let text = settings.watermarkText
      .replace(/{{lat}}/g, coords.latitude.toFixed(5))
      .replace(/{{lng}}/g, coords.longitude.toFixed(5));

    if (coords.accuracy !== null) {
        text = text.replace(/{{acc}}/g, coords.accuracy.toFixed(1) + 'm');
    } else {
        // Remove the placeholder and any surrounding whitespace if no accuracy is available
        text = text.replace(/\s*{{acc}}\s*/g, '').trim();
    }
    
    return text;
  }, [settings.watermarkText]);


  const drawWatermark = (ctx: CanvasRenderingContext2D, coords: Coordinates) => {
    const { fontSize, watermarkPosition } = settings;
    const text = renderWatermarkText(coords);
    if (!text) return;

    const padding = 10;
    const accuracyFontSize = fontSize * 0.7; // Smaller font for accuracy text

    // Draw main coordinate text
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;

    const textMetrics = ctx.measureText(text);

    // Draw accuracy text if available
    let yAdjustment = 0;
    if (coords.accuracy !== null) {
      ctx.font = `bold ${accuracyFontSize}px sans-serif`;
      const accuracyText = `Akurasi: ${coords.accuracy.toFixed(1)}m`;
      const accuracyMetrics = ctx.measureText(accuracyText);

      // Switch back to main font for measuring main text position
      ctx.font = `bold ${fontSize}px sans-serif`;

      // Calculate positions based on watermark position
      let x, y, accuracyX, accuracyY;

      switch (watermarkPosition) {
        case 'top-right':
          x = ctx.canvas.width - textMetrics.width - padding;
          y = fontSize + padding;
          accuracyX = ctx.canvas.width - accuracyMetrics.width - padding;
          accuracyY = y + fontSize + 5; // Position below main text
          break;
        case 'bottom-left':
          x = padding;
          y = ctx.canvas.height - padding;
          accuracyX = padding;
          accuracyY = y - fontSize - 5; // Position above main text (since y is bottom-aligned)
          yAdjustment = -accuracyFontSize; // Adjust main text upward
          break;
        case 'bottom-right':
          x = ctx.canvas.width - textMetrics.width - padding;
          y = ctx.canvas.height - padding;
          accuracyX = ctx.canvas.width - accuracyMetrics.width - padding;
          accuracyY = y - fontSize - 5; // Position above main text
          yAdjustment = -accuracyFontSize; // Adjust main text upward
          break;
        case 'top-left':
        default:
          x = padding;
          y = fontSize + padding;
          accuracyX = padding;
          accuracyY = y + fontSize + 5; // Position below main text
          break;
      }

      // Draw accuracy text with stroke and fill
      ctx.font = `bold ${accuracyFontSize}px sans-serif`;
      ctx.strokeText(accuracyText, accuracyX, accuracyY);
      ctx.fillText(accuracyText, accuracyX, accuracyY);

      // Switch back to main font
      ctx.font = `bold ${fontSize}px sans-serif`;
    } else {
      // Calculate positions for main text only
      let x, y;

      switch (watermarkPosition) {
        case 'top-right':
          x = ctx.canvas.width - textMetrics.width - padding;
          y = fontSize + padding;
          break;
        case 'bottom-left':
          x = padding;
          y = ctx.canvas.height - padding;
          break;
        case 'bottom-right':
          x = ctx.canvas.width - textMetrics.width - padding;
          y = ctx.canvas.height - padding;
          break;
        case 'top-left':
        default:
          x = padding;
          y = fontSize + padding;
          break;
      }
    }

    // Draw main coordinate text with stroke and fill
    ctx.strokeText(text, x, y + yAdjustment);
    ctx.fillText(text, x, y + yAdjustment);
  };

  const handleTakePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (currentCoords) {
      drawWatermark(ctx, currentCoords);
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (settings.autoSave) {
        if (currentCoords) {
            try {
                await addMedia('photo', imageDataUrl, currentCoords);
                setShowSaveToast(true);
                setTimeout(() => setShowSaveToast(false), 2000);
            } catch (err) {
                console.error("Auto-save failed:", err);
                alert("Simpan otomatis gagal. Lihat konsol untuk detail.");
            }
        } else {
            alert("Tidak dapat menyimpan otomatis: data lokasi tidak tersedia.");
        }
    } else {
        setCapturedImage(imageDataUrl);
        setCapturedCoords(currentCoords);
    }
  };

  const handleSave = async () => {
    if (isSaving || (!capturedImage && !capturedVideoBlob)) return;
    setIsSaving(true);
    try {
      if (capturedImage && capturedCoords) {
        await addMedia('photo', capturedImage, capturedCoords);
      } else if (capturedVideoBlob && capturedCoords) {
        await addMedia('video', capturedVideoBlob, capturedCoords);
      }
      resetCaptureState();
    } catch (err) {
      console.error("Failed to save media:", err);
      alert('Gagal menyimpan media. Lihat konsol untuk detail.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const startRecording = () => {
    if (!stream || isRecording) return;
    
    setIsRecording(true);
    setRecordingDuration(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    try {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setRecordingDuration(0);

        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        const videoUrl = URL.createObjectURL(videoBlob);

        if (settings.autoSave) {
            if (currentCoords) {
                try {
                    await addMedia('video', videoBlob, currentCoords);
                    setShowSaveToast(true);
                    setTimeout(() => setShowSaveToast(false), 2000);
                } catch (err) {
                    console.error("Auto-save failed:", err);
                    alert("Simpan otomatis gagal. Lihat konsol untuk detail.");
                } finally {
                    URL.revokeObjectURL(videoUrl);
                }
            } else {
                alert("Tidak dapat menyimpan otomatis: data lokasi tidak tersedia.");
                URL.revokeObjectURL(videoUrl);
            }
        } else {
            setCapturedVideoBlob(videoBlob);
            setCapturedVideoUrl(videoUrl);
            setCapturedCoords(currentCoords);
        }
      };

      mediaRecorderRef.current.start();
    } catch (e) {
      console.error("Error starting media recorder:", e);
      setError("Tidak dapat memulai perekaman video.");
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleShutterClick = () => {
    if (mode === 'photo') {
      handleTakePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const toggleFlash = async () => {
    if (!stream || !isFlashAvailable) return;
    const videoTrack = stream.getVideoTracks()[0];
    const newFlashMode = flashMode === 'off' ? 'on' : 'off';
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashMode === 'on' }]
      });
      setFlashMode(newFlashMode);
    } catch (err) {
      console.error('Failed to toggle flash:', err);
      setError('Tidak dapat mengontrol flash. Mungkin tidak didukung di perangkat ini.');
    }
  };

  const handleFocus = useCallback(async (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();

    if (!(capabilities as any).focusMode?.includes('manual') || !(capabilities as any).focusDistance) {
      return; // Focus point not supported
    }

    const rect = video.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setFocusIndicator({ x: event.clientX, y: event.clientY, active: true });

    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = window.setTimeout(() => setFocusIndicator(null), 1000);

    try {
        await (videoTrack as any).applyConstraints({
            advanced: [{
                focusMode: 'manual',
                focusPoint: { x, y }
            }]
        });

        // Revert to continuous focus after a delay
        setTimeout(async () => {
             if (stream?.getTracks().some(t => t.readyState === 'live')) {
                await (videoTrack as any).applyConstraints({
                    advanced: [{ focusMode: 'continuous' }]
                });
            }
        }, 1500);

    } catch (error) {
        console.warn("Could not set focus point:", error);
    }
  }, [stream]);

  const getWatermarkStyle = (): React.CSSProperties => {
    const { fontSize, watermarkPosition } = settings;
    const style: React.CSSProperties = {
      position: 'absolute',
      fontSize: `${fontSize}px`,
      color: 'rgba(255, 255, 255, 0.8)',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      padding: '10px',
      pointerEvents: 'none',
      zIndex: 10,
    };
    switch (watermarkPosition) {
        case 'top-left':
            style.top = 0;
            style.left = 0;
            break;
        case 'top-right':
            style.top = 0;
            style.right = 0;
            break;
        case 'bottom-left':
            style.bottom = 0;
            style.left = 0;
            break;
        case 'bottom-right':
            style.bottom = 0;
            style.right = 0;
            break;
    }
    return style;
  };

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
            {currentCoords && !capturedImage && !capturedVideoUrl && (
              <div className="mt-2 w-full max-w-md mx-auto flex flex-col items-center">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-3 rounded-full w-full max-w-xs">
                  <div className={`w-3 h-3 rounded-full ${getAccuracyIndicatorClasses(currentCoords.accuracy)}`}></div>
                  <span className="font-mono text-sm truncate">{renderWatermarkText(currentCoords)}</span>
                </div>
                {currentCoords.accuracy !== null && (
                  <div className="mt-1 text-xs text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    Akurasi: {currentCoords.accuracy.toFixed(1)}m
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
              <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-red-600/80 px-4 py-2 rounded-md text-sm text-center flex items-center gap-2">
                  <LocationMarkerIcon className="w-4 h-4"/>
                  {geoError}
              </div>
          )}
        </div>
      )}

      {view === 'gallery' && <Gallery onBack={() => setView('camera')} />}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} />

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