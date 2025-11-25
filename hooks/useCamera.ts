import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CameraPreview, CameraPreviewStatus } from '@capacitor-community/camera-preview';

export type FlashMode = 'off' | 'on' | 'auto';

export const requestCameraPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    
    let status: CameraPreviewStatus;
    try {
        status = await CameraPreview.checkPermissions();
    } catch (e) {
        status = { camera: 'prompt' };
    }

    if (status.camera === 'granted') {
        return true;
    }
    
    // The start() method will trigger the prompt if status is 'prompt'
    // We just need to call it. This function's role is to ensure we can proceed.
    return true;
};

interface UseCameraProps {
    isEnabled: boolean;
}

export const useCamera = ({ isEnabled }: UseCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [error, setError] = useState<string | null>(null);
  
  const isNative = Capacitor.isNativePlatform();

  const startCamera = useCallback(async () => {
    if (isNative) {
      try {
        await CameraPreview.stop(); 
      } catch (e) { /* ignore */ }

      try {
        await CameraPreview.start({
          position: facingMode === 'user' ? 'front' : 'rear',
          toBack: true,
          width: window.screen.width,
          height: window.screen.height,
          parent: 'cameraPreview',
          className: 'cameraPreview',
          disableAudio: true,
          enableZoom: true
        });
        setFlashMode('off');
        setError(null);
      } catch (err: any) {
        console.error("Native Camera Error:", err);
        setError("Izin kamera ditolak. Aktifkan di pengaturan aplikasi.");
      }
      return;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 4096 }, height: { ideal: 2160 } },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Web Camera Error:", err);
      setError(err.message || "Failed to start camera");
    }
  }, [facingMode, isNative, stream]);

  const stopCamera = useCallback(async () => {
       if (isNative) {
           try { await CameraPreview.stop(); } catch(e) {/* ignore */}
       } else if (stream) {
           stream.getTracks().forEach(t => t.stop());
       }
  }, [isNative, stream]);

  // Main lifecycle effect
  useEffect(() => {
    if (isEnabled) {
        startCamera();
    } else {
        stopCamera();
    }
    // Return cleanup that is always active
    return () => {
        stopCamera();
    }
  }, [isEnabled, startCamera, stopCamera]);


  const toggleCamera = () => {
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };

  const toggleFlash = async () => {
    // ... (rest of the function is unchanged)
    const modes: FlashMode[] = ['off', 'auto', 'on'];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setFlashMode(nextMode);

    if (isNative) {
      try {
        await CameraPreview.setFlashMode({ flashMode: nextMode });
      } catch (e) {
        console.warn("Failed to set flash mode", e);
        setFlashMode(flashMode); 
      }
    }
  };

  const captureImage = async (): Promise<string | null> => {
      if (isNative) {
          try {
              const result = await CameraPreview.capture({ quality: 100, width: 0, height: 0 });
              return result.value; 
          } catch (e) {
              console.error("Native Capture Failed", e);
              throw e;
          }
      } else {
          return null; 
      }
  }

  return {
    videoRef, stream, facingMode, flashMode, error,
    toggleCamera,
    toggleFlash,
    isNative,
    captureImage
  };
};
