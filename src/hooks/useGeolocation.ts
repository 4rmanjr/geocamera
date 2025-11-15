import { useState, useEffect, useRef, useCallback } from 'react';

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type GeoPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | null;

const useGeolocation = () => {
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [geoPermissionStatus, setGeoPermissionStatus] = useState<GeoPermissionStatus>(null);
  const [hasReceivedLocation, setHasReceivedLocation] = useState(false);
  
  const updateLocationInterval = useRef<number | null>(null);
  const initialTimeout = useRef<number | null>(null);
  const geoWatchId = useRef<number | null>(null);
  const geoTimeoutId = useRef<number | null>(null);

  // Function to check geolocation permission status
  const checkGeolocationPermission = useCallback(async (): Promise<GeoPermissionStatus> => {
    if (!navigator.geolocation) {
      return 'unsupported';
    }

    // Modern browsers support the Permissions API
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state as GeoPermissionStatus;
      } catch (error) {
        // If the query method fails, we'll try an alternative approach
        console.warn('Permissions API not supported, using alternative method');
      }
    }

    // For browsers that don't support the Permissions API
    // We can only assume 'prompt' state since we can't know without requesting
    return 'prompt';
  }, []);

  // Function to get current position with retry capability
  const getCurrentLocation = useCallback((maxRetries = 3): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const attemptGeolocation = () => {
        attempts++;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            if (attempts < maxRetries) {
              // Wait a bit before retrying
              setTimeout(attemptGeolocation, 2000);
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      };
      
      attemptGeolocation();
    });
  }, []);

  // Initialize geolocation
  useEffect(() => {
    const initGeolocation = async () => {
      setGeoStatus('requesting');

      const permissionStatus = await checkGeolocationPermission();
      setGeoPermissionStatus(permissionStatus);

      if (permissionStatus === 'denied') {
        setGeoStatus('error');
        setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
        setHasReceivedLocation(true);
        return;
      } else if (permissionStatus === 'unsupported') {
        setGeoStatus('error');
        setGeoError('Geolocation tidak didukung oleh browser ini.');
        setHasReceivedLocation(true);
        return;
      }

      // Define fetchLocation before using it
      const fetchLocation = async () => {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 7000,      // 7 seconds for subsequent updates
                maximumAge: 10000   // Use cached position up to 10 seconds old
              }
            );
          });

          setHasReceivedLocation(true);
          setGeoStatus('success');
          setGeoError(null);

          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setCurrentCoords(coords);
        } catch (err: any) {
          setGeoStatus('error');
          if (err.code === err.PERMISSION_DENIED) {
            setGeoPermissionStatus('denied');
            setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
          } else if (err.code === err.TIMEOUT) {
            // Don't show timeout error if we already have a location
            if (!currentCoords) {
              setGeoError('Tidak dapat mendapatkan lokasi saat ini. Pastikan izin lokasi diaktifkan dan sinyal GPS memadai.');
            }
          } else {
            setGeoError(`Kesalahan geolokasi: ${err.message}.`);
          }
        }
      };

      // Try to get the initial location
      const fetchInitialLocation = async () => {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,     // 10 seconds for initial position
                maximumAge: 0       // Don't use cached position for initial fetch
              }
            );
          });

          setHasReceivedLocation(true);
          setGeoStatus('success');
          setGeoError(null);

          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setCurrentCoords(coords);

          // Start periodic updates after initial success
          if (updateLocationInterval.current) {
            clearInterval(updateLocationInterval.current);
          }
          updateLocationInterval.current = window.setInterval(fetchLocation, 10000); // Update every 10 seconds
        } catch (err: any) {
          setGeoStatus('error');
          if (err.code === err.PERMISSION_DENIED) {
            setGeoPermissionStatus('denied');
            setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
          } else if (err.code === err.TIMEOUT) {
            setGeoError('Tidak dapat mendapatkan lokasi saat ini. Pastikan izin lokasi diaktifkan dan sinyal GPS memadai.');
          } else {
            setGeoError(`Kesalahan geolokasi: ${err.message}.`);
          }
        }
      };

      // Start with initial location fetch
      initialTimeout.current = window.setTimeout(() => {
        if (!hasReceivedLocation) {
          setGeoStatus('error');
          setGeoError('Tidak dapat mendapatkan lokasi dalam batas waktu. Pastikan izin lokasi diaktifkan dan sinyal GPS memadai.');
        }
      }, 15000); // 15 seconds for initial timeout

      await fetchInitialLocation();
    };

    initGeolocation();

    // Listen for visibility change to handle app going to background/foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When app comes back to foreground, refresh location if permission allows
        checkGeolocationPermission()
          .then(permissionStatus => {
            if (permissionStatus === 'granted') {
              // Clear any existing interval before creating a new one
              if (updateLocationInterval.current) {
                clearInterval(updateLocationInterval.current);
              }
              // Define an updated fetchLocation function to update location when app comes to foreground
              const fetchLocation = async () => {
                try {
                  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                      resolve,
                      reject,
                      {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 10000
                      }
                    );
                  });

                  setHasReceivedLocation(true);
                  setGeoStatus('success');
                  setGeoError(null);

                  const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                  };

                  setCurrentCoords(coords);
                } catch (err: any) {
                  if (!currentCoords) {
                    if (err.code === err.PERMISSION_DENIED) {
                      setGeoPermissionStatus('denied');
                      setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
                    } else {
                      setGeoError(`Kesalahan geolokasi: ${err.message}.`);
                    }
                  }
                }
              };

              updateLocationInterval.current = window.setInterval(fetchLocation, 10000); // Update every 10 seconds
            }
          });
      } else {
        // When app goes to background, stop location updates to save battery
        if (updateLocationInterval.current) {
          clearInterval(updateLocationInterval.current);
          updateLocationInterval.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (initialTimeout.current) {
        clearTimeout(initialTimeout.current);
      }
      if (updateLocationInterval.current) {
        clearInterval(updateLocationInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkGeolocationPermission, currentCoords]);

  const refreshGeolocation = useCallback(async () => {
    setGeoStatus('requesting');
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation tidak didukung oleh browser ini.');
      setGeoPermissionStatus('unsupported');
      return;
    }

    // Check current permission status
    const permissionStatus = await checkGeolocationPermission();
    setGeoPermissionStatus(permissionStatus);

    if (permissionStatus === 'denied') {
      setGeoStatus('error');
      setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
      return;
    } else if (permissionStatus === 'unsupported') {
      setGeoStatus('error');
      setGeoError('Geolocation tidak didukung oleh browser ini.');
      return;
    }

    // Try to get fresh location
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      setHasReceivedLocation(true);
      setGeoStatus('success');
      setGeoError(null);

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setCurrentCoords(coords);
    } catch (err: any) {
      setGeoStatus('error');
      if (err.code === err.PERMISSION_DENIED) {
        setGeoPermissionStatus('denied');
        setGeoError('Izin lokasi ditolak. Silakan aktifkan izin lokasi dari pengaturan browser Anda.');
      } else if (err.code === err.TIMEOUT) {
        setGeoError('Tidak dapat mendapatkan lokasi saat ini. Pastikan izin lokasi diaktifkan dan sinyal GPS memadai.');
      } else {
        setGeoError(`Kesalahan geolokasi: ${err.message}.`);
      }
    }
  }, [checkGeolocationPermission]);

  return {
    currentCoords,
    geoError,
    geoStatus,
    geoPermissionStatus,
    hasReceivedLocation,
    refreshGeolocation,
    getCurrentLocation
  };
};

export default useGeolocation;