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

      // LOGIC: SMART FILTERING
      // 1. Always update if it's the first fix (or we have no data).
      // 2. Always update if accuracy is better (smaller number is better).
      // 3. Update if accuracy is 'Good Enough' (< 15m) to keep movement fluid.
      // 4. Force update if data is stale (> 5 seconds) to avoid getting stuck on an old "perfect" point that is no longer valid.
      
      const isFirstFix = lastUpdateRef.current === 0;
      const isBetterAccuracy = newAccuracy <= currentAccuracyRef.current;
      const isGoodEnough = newAccuracy < 15; 
      const isStale = timeDiff > 5000; 

      if (isFirstFix || isBetterAccuracy || isGoodEnough || isStale) {
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
          maximumAge: 0             // CRITICAL: Do not use cached positions. Force fresh data.
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