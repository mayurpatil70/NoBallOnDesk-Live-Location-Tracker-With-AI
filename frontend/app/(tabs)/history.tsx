import { useAuth } from '@clerk/expo';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, LocationEntry } from '@/services/api';

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function formatCoord(n: number, type: 'lat' | 'lng') {
  const dir = type === 'lat' ? (n >= 0 ? 'N' : 'S') : (n >= 0 ? 'E' : 'W');
  return `${Math.abs(n).toFixed(5)}° ${dir}`;
}

export default function HistoryScreen() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await api.getHistory(token);
      setHistory([...(result.history || [])].reverse());
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const renderItem = ({ item, index }: { item: LocationEntry; index: number }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemLeft}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>#{history.length - index}</Text>
        </View>
        <View style={styles.itemLine} />
      </View>
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
          <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={styles.coordRow}>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>LAT</Text>
            <Text style={styles.coordValue}>{formatCoord(item.lat, 'lat')}</Text>
          </View>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>LNG</Text>
            <Text style={styles.coordValue}>{formatCoord(item.lng, 'lng')}</Text>
          </View>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>±</Text>
            <Text style={styles.coordValue}>{item.accuracy.toFixed(0)}m</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📋 History</Text>
          <Text style={styles.subtitle}>{history.length} location points</Text>
        </View>
        <TouchableOpacity id="history-refresh-btn" style={styles.refreshBtn} onPress={() => fetchHistory(true)}>
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>📍</Text>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start sharing your location on the Map tab to see your history here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item, i) => i.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(true)}
              tintColor="#6366f1"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0c29' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#a78bfa', fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22 },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  historyItem: { flexDirection: 'row', marginBottom: 16 },
  itemLeft: { width: 50, alignItems: 'center' },
  indexBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  indexText: { fontSize: 10, fontWeight: '700', color: '#a78bfa' },
  itemLine: { flex: 1, width: 2, backgroundColor: 'rgba(99,102,241,0.15)', marginTop: 4 },
  itemCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  itemTime: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  itemDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  coordRow: { flexDirection: 'row', gap: 8 },
  coordItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, padding: 8,
  },
  coordLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 3 },
  coordValue: { fontSize: 11, color: '#a78bfa', fontFamily: 'monospace', fontWeight: '600' },
});
