import { useState, useEffect } from 'react';

export type DeviceOrientationType = 'portrait' | 'landscape-left' | 'landscape-right';

export interface OrientationState {
    orientation: DeviceOrientationType;
    uiRotation: number; // 0, 90, -90, 180
}

export const useDeviceOrientation = (): OrientationState => {
    const [state, setState] = useState<OrientationState>({
        orientation: 'portrait',
        uiRotation: 0
    });

    useEffect(() => {
        const handleMotion = (event: DeviceMotionEvent) => {
            const { accelerationIncludingGravity } = event;
            if (!accelerationIncludingGravity) return;

            const x = accelerationIncludingGravity.x || 0;
            const y = accelerationIncludingGravity.y || 0;

            // Thresholds
            // X > 5: Gravity on Right Edge (Phone Tilted Left/CCW) -> Landscape Left
            // X < -5: Gravity on Left Edge (Phone Tilted Right/CW) -> Landscape Right
            // Y > 5: Gravity on Bottom Edge -> Portrait
            // Y < -5: Gravity on Top Edge -> Upside Down (treat as Portrait for now or add support)

            let newOrientation: DeviceOrientationType = 'portrait';
            let newRotation = 0;

            if (Math.abs(x) > Math.abs(y)) {
                if (x > 5) {
                    newOrientation = 'landscape-left';
                    // Top is Left. Bottom is Right.
                    // We want text bottom to point Right (screen X+).
                    // Normal text bottom points Down (screen Y+).
                    // Rotate -90deg (Counter-Clockwise) makes Top point Left, Bottom point Right.
                    newRotation = -90; 
                } else if (x < -5) {
                    newOrientation = 'landscape-right';
                    // Top is Right. Bottom is Left.
                    // We want text bottom to point Left (screen X-).
                    // Rotate 90deg (Clockwise) makes Top point Right, Bottom point Left.
                    newRotation = 90;
                }
            } else {
                // Portrait or Upside Down
                newOrientation = 'portrait';
                newRotation = 0; 
                // Optional: Add upside down logic (180) if needed later
            }

            setState(prev => {
                // Simple debounce/diff check
                if (prev.orientation !== newOrientation) {
                    return { orientation: newOrientation, uiRotation: newRotation };
                }
                return prev;
            });
        };

        // Check if DeviceMotionEvent is defined
        if (typeof window !== 'undefined' && typeof DeviceMotionEvent !== 'undefined') {
            // Request permission for iOS 13+ if needed (usually handled separately, 
            // but this listener works for basic cases where permission is granted or non-iOS)
            window.addEventListener('devicemotion', handleMotion, true);
        }

        return () => {
            if (typeof window !== 'undefined' && typeof DeviceMotionEvent !== 'undefined') {
                window.removeEventListener('devicemotion', handleMotion, true);
            }
        };
    }, []);

    return state;
};
