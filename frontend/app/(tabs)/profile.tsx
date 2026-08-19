import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingRow {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';

  const email = user?.emailAddresses?.[0]?.emailAddress || '—';
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const emailVerified = user?.emailAddresses?.[0]?.verification?.status === 'verified';

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            setSigningOut(false);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }
      }
    ]);
  };

  const settingGroups: { title: string; items: SettingRow[] }[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile-email',
          icon: '✉️',
          label: 'Email Address',
          subtitle: email,
          onPress: () => {},
          color: '#60a5fa',
        },
        {
          id: 'profile-verified',
          icon: emailVerified ? '✅' : '⚠️',
          label: 'Email Status',
          subtitle: emailVerified ? 'Verified' : 'Not verified',
          onPress: () => {},
          color: emailVerified ? '#34d399' : '#fbbf24',
        },
        {
          id: 'profile-joined',
          icon: '📅',
          label: 'Member Since',
          subtitle: createdAt,
          onPress: () => {},
          color: '#a78bfa',
        },
      ],
    },
    {
      title: 'App',
      items: [
        {
          id: 'profile-backend',
          icon: '🌐',
          label: 'Backend URL',
          subtitle: process.env.EXPO_PUBLIC_BACKEND_URL || 'Not set',
          onPress: () =>
            Alert.alert(
              'Backend URL',
              'To change the backend URL, edit EXPO_PUBLIC_BACKEND_URL in your .env file in the frontend folder.\n\n• Android Emulator: http://10.0.2.2:3001\n• Physical Device: http://<your-local-ip>:3001\n• iOS Simulator: http://localhost:3001'
            ),
          color: '#0ea5e9',
        },
        {
          id: 'profile-map',
          icon: '🗺️',
          label: 'Live Map',
          subtitle: 'WebView + Leaflet (OpenStreetMap)',
          onPress: () => router.push('/(tabs)/map'),
          color: '#6366f1',
        },
        {
          id: 'profile-about',
          icon: '📱',
          label: 'About Live Tracker',
          subtitle: 'Version 1.0.0 · Clerk + Socket.IO',
          onPress: () =>
            Alert.alert(
              '📍 Live Tracker',
              'Built with:\n• Expo React Native\n• Clerk Authentication\n• Socket.IO for real-time tracking\n• Leaflet.js + OpenStreetMap\n• Express.js backend\n\nAll location sharing is consent-based.'
            ),
          color: '#ec4899',
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'profile-signout',
          icon: '🚪',
          label: 'Sign Out',
          subtitle: 'You will be returned to the sign-in screen',
          onPress: handleSignOut,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>👤 Profile</Text>
        </View>

        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarLetter}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailText}>{email}</Text>
          <View style={styles.clerkBadge}>
            <Text style={styles.clerkBadgeText}>🔐 Powered by Clerk</Text>
          </View>
        </View>

        <View style={styles.statsStrip}>
          {[
            { emoji: '📍', label: 'Tracked', value: 'Live' },
            { emoji: '🎯', label: 'Traces', value: 'Active' },
            { emoji: '🔒', label: 'Security', value: 'Clerk' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {settingGroups.map((group) => (
          <View key={group.title} style={styles.settingGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  id={item.id}
                  style={[
                    styles.settingRow,
                    i < group.items.length - 1 && styles.settingRowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.settingIconBg,
                    { backgroundColor: item.danger ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)' }
                  ]}>
                    <Text style={styles.settingIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.settingTextCol}>
                    <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                      {item.label}
                    </Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {signingOut && (
          <View style={styles.signOutOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.signOutText}>Signing out...</Text>
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
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  avatarCard: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)',
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  avatarInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 34, fontWeight: '800', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  emailText: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
  clerkBadge: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  clerkBadgeText: { fontSize: 12, color: '#a78bfa', fontWeight: '600' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, marginBottom: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  statValue: { fontSize: 12, color: '#a78bfa', fontWeight: '700' },
  settingGroup: { marginBottom: 20 },
  groupTitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, paddingLeft: 4,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingIconBg: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  settingIcon: { fontSize: 18 },
  settingTextCol: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  settingLabelDanger: { color: '#f87171' },
  settingSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  chevron: { fontSize: 20, color: 'rgba(255,255,255,0.2)' },
  signOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,12,41,0.9)',
    alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  signOutText: { color: '#fff', marginTop: 12, fontSize: 15 },
});
