import { useState, useCallback, useEffect } from 'react';
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
  const [watchId, setWatchId] = useState<string | null>(null);

  const startLocationWatch = useCallback(() => {
    if (watchId) return;

    setGeoState(prev => ({ ...prev, loading: true, error: null }));
    
    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
      (pos, err) => {
        if (err) {
          setGeoState(prev => ({ ...prev, loading: false, error: "Izin lokasi ditolak atau GPS mati." }));
          return;
        }
        
        if (pos) {
          setGeoState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            loading: false,
            error: null
          });
        }
      }
    ).then(id => {
      setWatchId(id);
    });
  }, [watchId]);

  const stopLocationWatch = useCallback(() => {
      if (watchId) {
          Geolocation.clearWatch({ id: watchId });
          setWatchId(null);
      }
  }, [watchId]);

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