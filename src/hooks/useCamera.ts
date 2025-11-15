import { useState, useRef, useCallback } from 'react';

type FacingMode = 'user' | 'environment';
type FlashMode = 'off' | 'on';

interface CameraOptions {
  facingMode?: FacingMode;
  width?: number;
  height?: number;
}

const useCamera = (options: CameraOptions = {}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashAvailable, setIsFlashAvailable] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [facingMode, setFacingMode] = useState<FacingMode>(options.facingMode || 'environment');
  const [isReady, setIsReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsFlashAvailable(false);
      setIsReady(false);
    }
  }, [stream]);

  const startStream = useCallback(async () => {
    stopStream();
    setError(null);
    setIsReady(false);
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 }
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
      setIsReady(true);
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
  }, [facingMode, stopStream, options.width, options.height]);

  const toggleFlash = useCallback(async () => {
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
  }, [stream, isFlashAvailable, flashMode]);

  const flipCamera = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  return {
    stream,
    error,
    isFlashAvailable,
    flashMode,
    facingMode,
    isReady,
    videoRef,
    mediaRecorderRef,
    recordedChunksRef,
    startStream,
    stopStream,
    toggleFlash,
    flipCamera,
    setFlashMode
  };
};

export default useCamera;