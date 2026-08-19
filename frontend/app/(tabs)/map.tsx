import { useAuth } from '@clerk/expo';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { useLocation } from '@/hooks/use-location';
import { getSocket } from '@/services/socket';

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0c29; }
    #map { height: 100vh; width: 100%; }
    .user-popup { font-family: sans-serif; font-size: 12px; }
    .leaflet-popup-content-wrapper {
      background: #1a1535;
      color: #fff;
      border-radius: 10px;
      border: 1px solid rgba(99,102,241,0.3);
    }
    .leaflet-popup-tip { background: #1a1535; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([20, 78], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 20
    }).addTo(map);

    const markers = {};
    let myMarker = null;
    let myCircle = null;

    function createIcon(color, label) {
      return L.divIcon({
        html: '<div style="width:32px;height:32px;border-radius:50%;background:' + color + ';border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">' + label + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: ''
      });
    }

    window.updateMyLocation = function(lat, lng, accuracy, username) {
      const latlng = [lat, lng];
      if (myMarker) {
        myMarker.setLatLng(latlng);
        if (myCircle) myCircle.setLatLng(latlng).setRadius(accuracy || 50);
      } else {
        myMarker = L.marker(latlng, { icon: createIcon('#6366f1', '📍') })
          .addTo(map)
          .bindPopup('<div class="user-popup"><b>You (' + (username || 'Me') + ')</b></div>');
        myCircle = L.circle(latlng, {
          radius: accuracy || 50,
          color: '#6366f1',
          fillColor: '#6366f1',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(map);
        map.setView(latlng, 15);
      }
    };

    window.updateUserLocation = function(id, lat, lng, username) {
      const latlng = [lat, lng];
      if (markers[id]) {
        markers[id].setLatLng(latlng);
      } else {
        markers[id] = L.marker(latlng, { icon: createIcon('#34d399', '👤') })
          .addTo(map)
          .bindPopup('<div class="user-popup"><b>' + (username || id.slice(0,8)) + '</b></div>');
      }
    };

    window.removeUser = function(id) {
      if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    };

    window.centerOnMe = function() {
      if (myMarker) {
        map.setView(myMarker.getLatLng(), 16);
      }
    };
  </script>
</body>
</html>
`;

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const { location, errorMsg, permissionStatus, startWatching, stopWatching, requestPermission } = useLocation();

  useEffect(() => {
    if (!location || !webViewRef.current) return;
    const js = `window.updateMyLocation(${location.latitude}, ${location.longitude}, ${location.accuracy || 50}, 'Me'); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [location]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('receive-location', (data: any) => {
      if (webViewRef.current && data.id) {
        const js = `window.updateUserLocation('${data.id}', ${data.lat || data.latitude}, ${data.lng || data.longitude}, '${data.username || data.id.slice(0,8)}'); true;`;
        webViewRef.current.injectJavaScript(js);
      }
    });

    socket.on('user-disconnected', (id: string) => {
      if (webViewRef.current) {
        const js = `window.removeUser('${id}'); true;`;
        webViewRef.current.injectJavaScript(js);
      }
    });

    setSocketConnected(socket.connected);

    return () => {
      socket.off('receive-location');
      socket.off('user-disconnected');
    };
  }, []);

  useEffect(() => {
    if (!isSharing || !location) return;

    const socket = getSocket();
    socket.emit('send-location', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      username: 'User',
    });
  }, [location, isSharing]);

  const toggleSharing = async () => {
    if (isSharing) {
      stopWatching();
      setIsSharing(false);
    } else {
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Location permission is needed to share your location.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      await startWatching();
      setIsSharing(true);
    }
  };

  const centerOnMe = () => {
    webViewRef.current?.injectJavaScript('window.centerOnMe(); true;');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🗺️ Live Map</Text>
          <Text style={styles.subtitle}>
            {socketConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity id="map-center-btn" style={styles.centerBtn} onPress={centerOnMe}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
          </TouchableOpacity>
          <TouchableOpacity
            id="map-share-toggle"
            style={[styles.shareBtn, isSharing && styles.shareBtnActive]}
            onPress={toggleSharing}
            activeOpacity={0.8}
          >
            <Text style={styles.shareBtnText}>
              {isSharing ? '⏹ Stop' : '▶ Share'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>⚠️ {errorMsg}</Text>
        </View>
      ) : isSharing && location ? (
        <View style={styles.infoBar}>
          <Text style={styles.infoBarText}>
            📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            {location.accuracy ? `  ±${location.accuracy.toFixed(0)}m` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          mixedContentMode="always"
          originWhitelist={['*']}
        />
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomItem}>
          <Text style={styles.bottomValue}>{isSharing ? '✅' : '⏸'}</Text>
          <Text style={styles.bottomLabel}>Sharing</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomValue}>
            {location ? `${(location.accuracy || 0).toFixed(0)}m` : '—'}
          </Text>
          <Text style={styles.bottomLabel}>Accuracy</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomValue}>{socketConnected ? '🔗' : '❌'}</Text>
          <Text style={styles.bottomLabel}>Socket</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0c29' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  centerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  shareBtnActive: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderColor: 'rgba(248,113,113,0.4)',
  },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  errorBar: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    paddingHorizontal: 20, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(248,113,113,0.2)',
  },
  errorBarText: { color: '#f87171', fontSize: 12 },
  infoBar: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    paddingHorizontal: 20, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(52,211,153,0.15)',
  },
  infoBarText: { color: '#34d399', fontSize: 12, fontFamily: 'monospace' },
  mapContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0f0c29' },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1535',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 12,
  },
  bottomItem: { flex: 1, alignItems: 'center' },
  bottomValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  bottomLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  bottomDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
});
