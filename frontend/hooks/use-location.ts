import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface UseLocationReturn {
  location: LocationData | null;
  errorMsg: string | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  requestPermission: () => Promise<boolean>;
  isWatching: boolean;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [isWatching, setIsWatching] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') setPermissionStatus('granted');
      else if (status === 'denied') setPermissionStatus('denied');
    });

    return () => {
      watchRef.current?.remove();
    };
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermissionStatus('granted');
      setErrorMsg(null);
      return true;
    } else {
      setPermissionStatus('denied');
      setErrorMsg('Location permission was denied. Please enable it in Settings.');
      return false;
    }
  };

  const startWatching = async () => {
    if (isWatching) return;

    const granted = permissionStatus === 'granted' || (await requestPermission());
    if (!granted) return;

    setIsWatching(true);
    setErrorMsg(null);

    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
          });
        }
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start location tracking');
      setIsWatching(false);
    }
  };

  const stopWatching = () => {
    watchRef.current?.remove();
    watchRef.current = null;
    setIsWatching(false);
  };

  return {
    location,
    errorMsg,
    permissionStatus,
    requestPermission,
    isWatching,
    startWatching,
    stopWatching,
  };
}
