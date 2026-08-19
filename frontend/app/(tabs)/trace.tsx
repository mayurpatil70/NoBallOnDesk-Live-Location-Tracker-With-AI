import { useAuth } from '@clerk/expo';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { api, TraceEntry } from '@/services/api';
import { getSocket } from '@/services/socket';

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
}

const MAP_HTML = (lat: number, lng: number) => `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f0c29}#map{height:100vh;width:100%}
  .leaflet-popup-content-wrapper{background:#1a1535;color:#fff;border-radius:10px;border:1px solid rgba(139,92,246,.3)}
  .leaflet-popup-tip{background:#1a1535}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${lat},${lng}], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'© CARTO',maxZoom:20}).addTo(map);
    L.marker([${lat},${lng}], {
      icon: L.divIcon({
        html:'<div style="width:36px;height:36px;border-radius:50%;background:#8b5cf6;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.6)">🎯</div>',
        iconSize:[36,36],iconAnchor:[18,18],className:''
      })
    }).addTo(map).bindPopup('<b>Trace Location</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}').openPopup();
    L.circle([${lat},${lng}],{radius:50,color:'#8b5cf6',fillColor:'#8b5cf6',fillOpacity:.15,weight:2}).addTo(map);
  </script>
</body></html>`;

export default function TraceScreen() {
  const { getToken } = useAuth();
  const [traceToken, setTraceToken] = useState('');
  const [traceUrl, setTraceUrl] = useState('');
  const [results, setResults] = useState<TraceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TraceEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (polling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [polling]);

  useEffect(() => {
    if (!traceToken) return;
    const socket = getSocket();
    socket.emit('subscribe-trace', { token: traceToken });
    socket.on(`trace-update-${traceToken}`, (entry: TraceEntry) => {
      setResults((prev) => [entry, ...prev]);
    });
    return () => { socket.off(`trace-update-${traceToken}`); };
  }, [traceToken]);

  useEffect(() => {
    if (polling && traceToken) {
      pollRef.current = setInterval(fetchResults, 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, traceToken]);

  const fetchResults = async () => {
    if (!traceToken) return;
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getTraceResults(traceToken, token);
      if (data.success) {
        setResults([...data.locations].reverse());
      }
    } catch {}
  };

  const createTrace = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await api.createTraceLink(token);
      setTraceToken(data.token);
      setTraceUrl(data.url);
      setResults([]);
      setPolling(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create trace link');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrace = async () => {
    Alert.alert('Delete Trace', 'This will deactivate the trace link. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token || !traceToken) return;
            await api.deleteTrace(traceToken, token);
          } catch {}
          setTraceToken('');
          setTraceUrl('');
          setResults([]);
          setPolling(false);
        }
      }
    ]);
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    try {
      await Share.share({ message: `📍 Tap this link to share your location with me:\n${traceUrl}`, url: traceUrl });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Trace</Text>
          <Text style={styles.subtitle}>Share a consent-based location request link</Text>
        </View>

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.stepRow}>
            {['1️⃣ Generate link', '2️⃣ Share with target', '3️⃣ They consent & share GPS', '4️⃣ See their location here'].map((s, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {!traceToken ? (
          <TouchableOpacity
            id="trace-generate-btn"
            style={[styles.generateBtn, loading && styles.btnDisabled]}
            onPress={createTrace}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.generateIcon}>🔗</Text>
                <Text style={styles.generateText}>Generate Trace Link</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.activeLinkCard}>
            <View style={styles.activeLinkHeader}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.activeDot} />
              </Animated.View>
              <Text style={styles.activeLinkTitle}>Trace Active</Text>
              <TouchableOpacity id="trace-delete-btn" onPress={deleteTrace} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>✕ Stop</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.urlBox}>
              <Text style={styles.urlText} numberOfLines={2}>{traceUrl}</Text>
            </View>

            <View style={styles.linkActions}>
              <TouchableOpacity id="trace-copy-btn" style={[styles.linkActionBtn, copied && styles.linkActionBtnGreen]} onPress={copyLink}>
                <Text style={styles.linkActionText}>{copied ? '✅ Copied!' : '📋 Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity id="trace-share-btn" style={styles.linkActionBtn} onPress={shareLink}>
                <Text style={styles.linkActionText}>📤 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity id="trace-refresh-btn" style={styles.linkActionBtn} onPress={fetchResults}>
                <Text style={styles.linkActionText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {traceToken && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              📍 Captured Locations ({results.length})
            </Text>

            {results.length === 0 ? (
              <View style={styles.waitingCard}>
                <Text style={styles.waitingEmoji}>⏳</Text>
                <Text style={styles.waitingTitle}>Waiting for response...</Text>
                <Text style={styles.waitingSubtitle}>
                  Share the link above. When the recipient taps it and allows GPS,
                  their location will appear here in real time.
                </Text>
              </View>
            ) : (
              results.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  id={`trace-result-${i}`}
                  style={[styles.resultCard, selectedResult === item && styles.resultCardSelected]}
                  onPress={() => setSelectedResult(selectedResult === item ? null : item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultIndex}>#{results.length - i}</Text>
                    <Text style={styles.resultTime}>{formatTime(item.timestamp)}</Text>
                  </View>
                  <View style={styles.resultGrid}>
                    <View style={styles.resultGridItem}>
                      <Text style={styles.resultGridLabel}>LAT</Text>
                      <Text style={styles.resultGridValue}>{item.lat.toFixed(5)}</Text>
                    </View>
                    <View style={styles.resultGridItem}>
                      <Text style={styles.resultGridLabel}>LNG</Text>
                      <Text style={styles.resultGridValue}>{item.lng.toFixed(5)}</Text>
                    </View>
                    <View style={styles.resultGridItem}>
                      <Text style={styles.resultGridLabel}>IP</Text>
                      <Text style={styles.resultGridValue} numberOfLines={1}>{item.ip}</Text>
                    </View>
                    <View style={styles.resultGridItem}>
                      <Text style={styles.resultGridLabel}>±</Text>
                      <Text style={styles.resultGridValue}>{item.accuracy.toFixed(0)}m</Text>
                    </View>
                  </View>

                  {selectedResult === item && (
                    <View style={styles.traceMapContainer}>
                      <WebView
                        source={{ html: MAP_HTML(item.lat, item.lng) }}
                        style={styles.traceMap}
                        javaScriptEnabled
                        scrollEnabled={false}
                        originWhitelist={['*']}
                      />
                    </View>
                  )}

                  <View style={styles.uaRow}>
                    <Text style={styles.uaLabel}>Device: </Text>
                    <Text style={styles.uaText} numberOfLines={1}>
                      {item.userAgent.split(' ').slice(0, 3).join(' ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0c29' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingVertical: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  howCard: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
    marginBottom: 20,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow: { gap: 6 },
  step: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  stepText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  generateBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16, height: 60,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 24,
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  btnDisabled: { opacity: 0.6 },
  generateIcon: { fontSize: 22 },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activeLinkCard: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    marginBottom: 24,
  },
  activeLinkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34d399', marginRight: 8 },
  activeLinkTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  deleteBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  urlBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  urlText: { color: '#a78bfa', fontSize: 13, fontFamily: 'monospace', lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkActionBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  linkActionBtnGreen: { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)' },
  linkActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14 },
  resultsSection: {},
  waitingCard: {
    alignItems: 'center', padding: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  waitingEmoji: { fontSize: 48, marginBottom: 12 },
  waitingTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 8 },
  waitingSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20 },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  resultCardSelected: { borderColor: 'rgba(139,92,246,0.5)', backgroundColor: 'rgba(139,92,246,0.08)' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultIndex: { fontSize: 12, fontWeight: '700', color: '#8b5cf6' },
  resultTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' },
  resultGrid: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  resultGridItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, padding: 8,
  },
  resultGridLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 3 },
  resultGridValue: { fontSize: 11, color: '#c4b5fd', fontFamily: 'monospace', fontWeight: '600' },
  traceMapContainer: {
    height: 180, borderRadius: 12, overflow: 'hidden',
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  traceMap: { flex: 1, backgroundColor: '#0f0c29' },
  uaRow: { flexDirection: 'row', alignItems: 'center' },
  uaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  uaText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});
