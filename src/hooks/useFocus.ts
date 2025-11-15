import { useState, useRef, useCallback } from 'react';

const useFocus = (stream: MediaStream | null) => {
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);

  const handleFocus = useCallback(async (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
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

  return { focusIndicator, handleFocus, setFocusIndicator };
};

export default useFocus;