import { useState, useRef, useCallback } from 'react';
import { addMedia } from '../../db';

type Mode = 'photo' | 'video';
type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export interface AppSettings {
  fontSize: number;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoSave: boolean;
  watermarkText: string;
  fontSize2: number;
  watermarkPosition2: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkText2: string;
  enableWatermark2: boolean;
}

const useMediaCapture = (settings: AppSettings, captureLocation: Coordinates | null, getCurrentLocation: (maxRetries?: number) => Promise<Coordinates>) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [capturedCoords, setCapturedCoords] = useState<Coordinates | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const captureLocationRef = useRef<Coordinates | null>(captureLocation);

  // Ensure captureLocationRef is updated when captureLocation changes
  captureLocationRef.current = captureLocation;

  const drawWatermark = (ctx: CanvasRenderingContext2D, coords: Coordinates) => {
    // Draw first watermark
    const { fontSize, watermarkPosition } = settings;
    const text1 = renderWatermarkText(coords, 1);

    if (text1) {
      const padding = 10;

      // Draw first watermark
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 2;

      const textMetrics = ctx.measureText(text1);

      // Calculate positions based on watermark position
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

      // Draw first watermark text with stroke and fill
      ctx.strokeText(text1, x, y);
      ctx.fillText(text1, x, y);
    }

    // Draw second watermark if enabled
    if (settings.enableWatermark2) {
      const text2 = renderWatermarkText(coords, 2);

      if (text2) {
        const { fontSize2, watermarkPosition2 } = settings;
        const padding = 10;

        // Draw second watermark
        ctx.font = `bold ${fontSize2}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;

        const textMetrics2 = ctx.measureText(text2);

        // Calculate positions based on second watermark position
        let x2, y2;

        switch (watermarkPosition2) {
          case 'top-right':
            x2 = ctx.canvas.width - textMetrics2.width - padding;
            y2 = fontSize2 + padding;
            break;
          case 'bottom-left':
            x2 = padding;
            y2 = ctx.canvas.height - padding;
            break;
          case 'bottom-right':
            x2 = ctx.canvas.width - textMetrics2.width - padding;
            y2 = ctx.canvas.height - padding;
            break;
          case 'top-left':
          default:
            x2 = padding;
            y2 = fontSize2 + padding;
            break;
        }

        // Draw second watermark text with stroke and fill
        ctx.strokeText(text2, x2, y2);
        ctx.fillText(text2, x2, y2);
      }
    }
  };

  const renderWatermarkText = (coords: Coordinates | null, watermarkIndex: number = 1): string => {
    if (!coords) return '';

    const textTemplate = watermarkIndex === 1 ? settings.watermarkText : settings.watermarkText2;
    if (!textTemplate) return '';

    let text = textTemplate
      .replace(/{{lat}}/g, coords.latitude.toFixed(5))
      .replace(/{{lng}}/g, coords.longitude.toFixed(5));

    if (coords.accuracy !== null) {
        text = text.replace(/{{acc}}/g, coords.accuracy.toFixed(1) + 'm');
    } else {
        // Remove the placeholder and any surrounding whitespace if no accuracy is available
        text = text.replace(/\s*{{acc}}\s*/g, '').trim();
    }

    return text;
  };

  const handleTakePhoto = useCallback(async (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Use the coordinates captured at the time of photo capture
    const coordsForCapture = captureLocationRef.current;
    if (coordsForCapture) {
      drawWatermark(ctx, coordsForCapture);
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (settings.autoSave) {
        // Wait briefly for location data if not available yet
        let locationData = coordsForCapture;
        if (!locationData) {
          try {
            // Wait up to 2 seconds for location data
            locationData = await getCurrentLocation(2); // max 2 attempts
          } catch (err) {
            console.warn("Could not get location for photo:", err);
          }
        }

        if (locationData) {
            try {
                await addMedia('photo', imageDataUrl, locationData);
                setShowSaveToast(true);
                setTimeout(() => setShowSaveToast(false), 2000);
            } catch (err) {
                console.error("Auto-save failed:", err);
                alert("Simpan otomatis gagal. Lihat konsol untuk detail.");
            }
        } else {
            // Fallback: ask user if they want to save without location
            const saveWithoutLocation = window.confirm("Tidak dapat mendapatkan lokasi. Simpan tanpa informasi lokasi?");
            if (saveWithoutLocation) {
                await addMedia('photo', imageDataUrl, {
                  latitude: -1,  // Indicate invalid/unavailable location
                  longitude: -1,
                  accuracy: null
                });
                setShowSaveToast(true);
                setTimeout(() => setShowSaveToast(false), 2000);
            }
        }
    } else {
        setCapturedImage(imageDataUrl);
        setCapturedCoords(coordsForCapture);
    }
  }, [settings.autoSave, settings, getCurrentLocation]);

  const handleSave = useCallback(async () => {
    if (isSaving || (!capturedImage && !capturedVideoBlob)) return;
    setIsSaving(true);
    try {
      if (capturedImage && capturedCoords) {
        await addMedia('photo', capturedImage, capturedCoords);
      } else if (capturedVideoBlob && capturedCoords) {
        await addMedia('video', capturedVideoBlob, capturedCoords);
      }
      setCapturedImage(null);
      setCapturedCoords(null);
      setCapturedVideoBlob(null);
      if (capturedVideoUrl) {
        URL.revokeObjectURL(capturedVideoUrl);
      }
      setCapturedVideoUrl(null);
    } catch (err) {
      console.error("Failed to save media:", err);
      alert('Gagal menyimpan media. Lihat konsol untuk detail.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, capturedImage, capturedVideoBlob, capturedCoords, capturedVideoUrl]);

  const startRecording = useCallback((stream: MediaStream | null, mode: Mode) => {
    if (!stream || mode !== 'video') return;

    // Capture the location at the start of recording
    const recordingLocation = captureLocationRef.current;

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
            // Wait briefly for location data if not available yet
            let locationData = recordingLocation;
            if (!locationData) {
              try {
                // Wait up to 2 seconds for location data
                locationData = await getCurrentLocation(2); // max 2 attempts
              } catch (err) {
                console.warn("Could not get location for video:", err);
              }
            }

            if (locationData) {
                try {
                    await addMedia('video', videoBlob, locationData);
                    setShowSaveToast(true);
                    setTimeout(() => setShowSaveToast(false), 2000);
                } catch (err) {
                    console.error("Auto-save failed:", err);
                    alert("Simpan otomatis gagal. Lihat konsol untuk detail.");
                } finally {
                    URL.revokeObjectURL(videoUrl);
                }
            } else {
                // Fallback: ask user if they want to save without location
                const saveWithoutLocation = window.confirm("Tidak dapat mendapatkan lokasi. Simpan tanpa informasi lokasi?");
                if (saveWithoutLocation) {
                    await addMedia('video', videoBlob, {
                      latitude: -1,  // Indicate invalid/unavailable location
                      longitude: -1,
                      accuracy: null
                    });
                    setShowSaveToast(true);
                    setTimeout(() => setShowSaveToast(false), 2000);
                }
                URL.revokeObjectURL(videoUrl);
            }
        } else {
            setCapturedVideoBlob(videoBlob);
            setCapturedVideoUrl(videoUrl);
            setCapturedCoords(locationData);
        }
      };

      mediaRecorderRef.current.start();
    } catch (e) {
      console.error("Error starting media recorder:", e);
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [settings.autoSave, settings, getCurrentLocation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, []);

  const resetCaptureState = useCallback(() => {
    setCapturedImage(null);
    setCapturedCoords(null);
    setCapturedVideoBlob(null);
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideoUrl(null);
  }, []);

  return {
    capturedImage,
    capturedVideoBlob,
    capturedVideoUrl,
    capturedCoords,
    isRecording,
    recordingDuration,
    isSaving,
    showSaveToast,
    canvasRef,
    mediaRecorderRef,
    recordedChunksRef,
    handleTakePhoto,
    handleSave,
    startRecording,
    stopRecording,
    formatDuration,
    resetCaptureState,
    setCapturedImage,
    setCapturedCoords,
    setCapturedVideoBlob,
    setCapturedVideoUrl,
    setIsRecording,
    setRecordingDuration,
    setIsSaving,
    setShowSaveToast
  };
};

export default useMediaCapture;