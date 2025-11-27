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
  const lastGeocodeRef = useRef<{lat: number, lng: number} | null>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
        // Simple distance check to avoid spamming API (approx 50m)
        if (lastGeocodeRef.current) {
            const dist = Math.sqrt(
                Math.pow(lat - lastGeocodeRef.current.lat, 2) + 
                Math.pow(lng - lastGeocodeRef.current.lng, 2)
            );
            // 0.0005 degrees is roughly 50m at equator
            if (dist < 0.0005) return; 
        }

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
                'User-Agent': 'GeoCamPro/1.0'
            }
        });
        
        if (!response.ok) return;

        const data = await response.json();
        const addr = data.address;

        // Robust mapping for Indonesian Administrative Levels
        // 1. Village / Kelurahan
        const village = addr.village || addr.suburb || addr.neighbourhood;
        
        // 2. District / Kecamatan
        // OSM often puts Kecamatan in 'city_district', 'district', 'town', or sometimes 'municipality' (rarely)
        const district = addr.city_district || addr.district || addr.town || addr.subdistrict;

        // 3. City / Regency (Kabupaten/Kota)
        const city = addr.city || addr.county || addr.regency || addr.municipality;

        // 4. State / Province
        const state = addr.state;

        if (village || district || city) {
            lastGeocodeRef.current = { lat, lng };
            setGeoState(prev => ({
                ...prev,
                address: { village, district, city, state }
            }));
        }

    } catch (e) {
        console.warn("Geocoding failed:", e);
    }
  };

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

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          setGeoState(prev => ({
            lat: lat,
            lng: lng,
            accuracy: Math.round(newAccuracy), // Round for cleaner UI
            address: prev.address, // Keep existing address until updated
            loading: false,
            error: null
          }));

          // Trigger Geocoding (Non-blocking)
          fetchAddress(lat, lng);
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