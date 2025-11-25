import React, { useState } from 'react';
import { AppSettings, GeoLocationState, SavedPhoto } from '../types';
import { drawWatermark } from '../utils/imageProcessing';
import { savePhoto } from '../utils/storage';
import { playShutterSound } from '../utils/audio';

interface UseCaptureProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isNative: boolean;
    facingMode: 'user' | 'environment';
    settings: AppSettings;
    geoState: GeoLocationState;
    captureImageNative: () => Promise<string | null>; // Function from useCamera
    addPhotoToGallery: (photo: SavedPhoto) => void;
}

export const useCapture = ({
    videoRef,
    isNative,
    facingMode,
    settings,
    geoState,
    captureImageNative,
    addPhotoToGallery
}: UseCaptureProps) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [effectState, setEffectState] = useState<'idle' | 'shutter' | 'flash'>('idle');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleCapture = async () => {
        if (isCapturing) return;
        if (!isNative && !videoRef.current) return;
        
        playShutterSound();
        setIsCapturing(true);
        setEffectState('shutter');
        
        try {
            // 1. Acquire Raw Image
            let nativeBase64: string | null = null;
            if (isNative) {
                nativeBase64 = await captureImageNative();
            }

            // Visual feedback delay (mimic shutter feel)
            await new Promise(r => setTimeout(r, 50));
            setEffectState('flash');

            // 2. Process Watermark (Worker)
            const isFrontCamera = facingMode === 'user';
            let watermarkResult: string;

            if (isNative && nativeBase64) {
                watermarkResult = await drawWatermark(nativeBase64, settings, geoState, isFrontCamera);
            } else {
                watermarkResult = await drawWatermark(videoRef.current!, settings, geoState, isFrontCamera);
            }

            // 3. Save to Storage
            const newPhoto = await savePhoto(watermarkResult);
            addPhotoToGallery(newPhoto);
            
            setToastMessage("Foto tersimpan");
            setTimeout(() => setToastMessage(null), 2500);

        } catch (e: any) {
            console.error("Capture failed", e);
            setToastMessage(`Gagal: ${e.message || "Error"}`);
            setTimeout(() => setToastMessage(null), 3500);
        } finally {
            setEffectState('idle');
            setIsCapturing(false);
        }
    };

    return {
        isCapturing,
        effectState,
        toastMessage,
        setToastMessage,
        handleCapture
    };
};