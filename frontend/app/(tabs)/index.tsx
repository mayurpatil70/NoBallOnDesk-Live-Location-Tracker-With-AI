import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StatCard {
  emoji: string;
  label: string;
  value: string;
  color: string;
}

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const stats: StatCard[] = [
    { emoji: '📍', label: 'Status', value: 'Active', color: '#34d399' },
    { emoji: '📡', label: 'Signal', value: 'Good', color: '#60a5fa' },
    { emoji: '🔋', label: 'Battery', value: 'OK', color: '#fbbf24' },
    { emoji: '🌐', label: 'Network', value: 'WiFi', color: '#a78bfa' },
  ];

  const quickActions = [
    { emoji: '🗺️', label: 'Live Map', subtitle: 'View & share location', route: '/(tabs)/map', color: '#6366f1' },
    { emoji: '🎯', label: 'Trace', subtitle: 'Generate trace link', route: '/(tabs)/trace', color: '#8b5cf6' },
    { emoji: '📋', label: 'History', subtitle: 'Past locations', route: '/(tabs)/history', color: '#0ea5e9' },
    { emoji: '👤', label: 'Profile', subtitle: 'Settings & account', route: '/(tabs)/profile', color: '#ec4899' },
  ];

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.timeText}>{time}</Text>
            <Text style={styles.greeting}>{greeting} 👋</Text>
          </View>
          <TouchableOpacity id="home-notifications-btn" style={styles.notifBtn}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeName}>{displayName}</Text>
            <Text style={styles.welcomeEmail}>{user?.emailAddresses?.[0]?.emailAddress}</Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Online</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Device Status</Text>
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              id={`quick-action-${action.label.toLowerCase()}`}
              style={[styles.actionCard, { borderColor: action.color + '33' }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: action.color + '20' }]}>
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📱 Live Tracker</Text>
          <Text style={styles.infoText}>
            Real-time location sharing powered by Socket.IO & Clerk Auth.
            Share your location or trace others with consent-based links.
          </Text>
        </View>

        <TouchableOpacity
          id="home-signout-btn"
          style={styles.signOutBtn}
          onPress={() => signOut()}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0c29' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  timeText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  welcomeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 20, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 24 },
  welcomeText: { flex: 1 },
  welcomeName: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 2 },
  welcomeEmail: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  badgeText: { fontSize: 12, color: '#34d399', fontWeight: '600' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    marginBottom: 12, letterSpacing: 0.3,
  },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24,
  },
  actionCard: {
    width: '46%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 16,
    borderWidth: 1,
  },
  actionIconBg: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  actionSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#a78bfa', marginBottom: 6 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 20 },

  signOutBtn: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },
  signOutText: { color: '#f87171', fontSize: 15, fontWeight: '700' },
});
