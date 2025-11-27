import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { GeoLocationState } from '../types';

export const requestLocationPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    let perm: PermissionStatus;
    try {
        perm = await Geolocation.checkPermissions();
    } catch (e) {
        perm = { location: 'prompt', coarseLocation: 'prompt' };
    }
    
    if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
        return true;
    }

    perm = await Geolocation.requestPermissions();
    
    return perm.location === 'granted' || perm.coarseLocation === 'granted';
};

interface UseGeoLocationProps {
    isEnabled: boolean;
}

export const useGeolocation = ({ isEnabled }: UseGeoLocationProps) => {
  const [geoState, setGeoState] = useState<GeoLocationState>({
    lat: null, 
    lng: null, 
    accuracy: null, 
    loading: false, 
    error: null
  });
  
  // Refs to track internal state without triggering re-renders for logic checks
  const watchIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentAccuracyRef = useRef<number>(9999);

  const updatePosition = useCallback((pos: any) => {
      const now = Date.now();
      const newAccuracy = pos.coords.accuracy;
      const timeDiff = now - lastUpdateRef.current;
      const currentAcc = currentAccuracyRef.current;

      // LOGIC: HIGH PRECISION LOCK (Optimized for GeoCamPro)
      // 1. First fix: Always update to show SOMETHING immediately.
      // 2. Better Accuracy: Always update (e.g., 20m -> 5m).
      // 3. High Accuracy Maintenance: If new point is < 10m, update.
      //    (This allows tracking small movements while we have good signal).
      // 4. Anti-Drift: If we have a good lock (e.g., 5m) and suddenly get 50m, IGNORE it unless...
      // 5. Staleness: ...it's been > 10s. Then we accept the degraded signal (user entered building).
      
      const isFirstFix = lastUpdateRef.current === 0;
      const isBetterAccuracy = newAccuracy <= currentAcc;
      const isHighAccuracy = newAccuracy <= 10; // Excellent GPS lock
      const isStale = timeDiff > 10000; // Refresh if data is > 10s old

      if (isFirstFix || isBetterAccuracy || isHighAccuracy || isStale) {
          lastUpdateRef.current = now;
          currentAccuracyRef.current = newAccuracy;

          setGeoState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(newAccuracy), // Round for cleaner UI
            loading: false,
            error: null
          });
      }
  }, []);

  const startLocationWatch = useCallback(() => {
    if (watchIdRef.current) return;

    setGeoState(prev => ({ ...prev, loading: true, error: null }));
    lastUpdateRef.current = 0; // Reset staleness check
    currentAccuracyRef.current = 9999;

    Geolocation.watchPosition(
      { 
          enableHighAccuracy: true, // Force GPS/Hardware
          timeout: 10000,           // Wait max 10s per fix attempt
          maximumAge: 5000          // Allow 5s old cache for instant start
      },
      (pos, err) => {
        if (err) {
          // Only show error if we have NO data yet. If we have data, keep showing it while retrying silently.
          if (lastUpdateRef.current === 0) {
              setGeoState(prev => ({ ...prev, loading: false, error: "Mencari sinyal GPS..." }));
          }
          return;
        }
        
        if (pos) {
          updatePosition(pos);
        }
      }
    ).then(id => {
      watchIdRef.current = id;
    });
  }, [updatePosition]);

  const stopLocationWatch = useCallback(() => {
      if (watchIdRef.current) {
          Geolocation.clearWatch({ id: watchIdRef.current });
          watchIdRef.current = null;
      }
  }, []);

  useEffect(() => {
      if (isEnabled) {
          startLocationWatch();
      } else {
          stopLocationWatch();
      }
      return () => {
          stopLocationWatch();
      }
  }, [isEnabled, startLocationWatch, stopLocationWatch]);

  return geoState;
};