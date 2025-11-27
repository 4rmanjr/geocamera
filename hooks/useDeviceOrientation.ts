import { useState, useEffect } from 'react';

export type DeviceOrientationType = 'portrait' | 'landscape-left' | 'landscape-right';

export const useDeviceOrientation = () => {
    const [orientation, setOrientation] = useState<DeviceOrientationType>('portrait');

    useEffect(() => {
        const handleMotion = (event: DeviceMotionEvent) => {
            const { accelerationIncludingGravity } = event;
            if (!accelerationIncludingGravity) return;

            const x = accelerationIncludingGravity.x || 0;
            const y = accelerationIncludingGravity.y || 0;

            // Thresholds for detection (adjust as needed)
            // X > 5 or < -5 usually means landscape
            // Y > 5 or < -5 usually means portrait

            if (Math.abs(x) > Math.abs(y)) {
                if (x > 5) {
                    setOrientation('landscape-left'); // Home button right
                } else if (x < -5) {
                    setOrientation('landscape-right'); // Home button left
                }
            } else {
                if (y > 5 || y < -5) {
                     setOrientation('portrait');
                }
            }
        };

        // Check if DeviceMotionEvent is defined (Desktop compatibility)
        if (typeof DeviceMotionEvent !== 'undefined') {
            window.addEventListener('devicemotion', handleMotion, true);
        }

        return () => {
            if (typeof DeviceMotionEvent !== 'undefined') {
                window.removeEventListener('devicemotion', handleMotion, true);
            }
        };
    }, []);

    return orientation;
};
