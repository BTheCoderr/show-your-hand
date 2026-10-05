import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../src/theme'

export default function OnlineScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Text style={styles.eyebrow}>MOBILE MILESTONE 2</Text>
        <Text style={styles.title}>ONLINE 1V1</Text>
        <Text style={styles.body}>
          The native app will reuse the same hardened Supabase rooms and
          server-authoritative Edge Function as the web game. We are not
          creating a second multiplayer backend.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>NEXT WIRED FLOW</Text>
          <Text style={styles.row}>Create private room</Text>
          <Text style={styles.row}>Share / join six-character code</Text>
          <Text style={styles.row}>Ready check</Text>
          <Text style={styles.row}>Server-authoritative actions</Text>
          <Text style={styles.row}>Reconnect + rematch</Text>
        </View>

        <Text style={styles.note}>
          We finish native solo parity first, then connect the real production
          backend.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { flex: 1, padding: 22, gap: 18 },
  eyebrow: { color: theme.orange, fontWeight: '900', letterSpacing: 2 },
  title: { color: theme.text, fontSize: 42, fontWeight: '900' },
  body: { color: theme.muted, fontSize: 16, lineHeight: 24 },
  card: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: theme.text, fontWeight: '900', marginBottom: 4 },
  row: { color: '#ddd5cf', fontSize: 15 },
  note: { color: theme.muted, fontSize: 13, lineHeight: 19 },
})
