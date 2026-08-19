import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ModalScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Live Tracker</Text>
        <Text style={styles.subtitle}>Real-time location sharing with Socket.IO & Clerk Auth</Text>
        <Link href="/" dismissTo asChild>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>← Go Back</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0c29' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  btnText: { color: '#a78bfa', fontSize: 16, fontWeight: '700' },
});
