import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native'
import {
  listBlockedPlayers, unblockPlayer, type BlockedPlayer,
} from '../src/onlineApi'
import { theme } from '../src/theme'

export default function BlockedPlayersScreen() {
  const [players, setPlayers] = useState<BlockedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listBlockedPlayers()
      setPlayers(rows)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load blocked players')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const confirmUnblock = (entry: BlockedPlayer) => {
    Alert.alert(
      'Unblock this player?',
      'Future room invitations from this installation may work again. Your past reports will be retained.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            setBusyId(entry.id)
            void (async () => {
              try {
                const removed = await unblockPlayer(entry.id)
                if (!removed) throw new Error('Block no longer exists')
                await refresh()
              } catch (nextError) {
                Alert.alert('Could not unblock', nextError instanceof Error ? nextError.message : 'Try again.')
              } finally {
                setBusyId(null)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.kicker}>ONLINE PLAYER SAFETY</Text>
        <Text style={styles.title}>BLOCKED PLAYERS</Text>
        <Text style={styles.info}>
          These blocks prevent future room joins between the same app or browser
          installations. Without accounts, reinstalling the app can create a new
          identity. Existing safety reports are not deleted when you unblock.
        </Text>

        {loading ? <ActivityIndicator color={theme.orange} /> : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        ) : null}
        {!loading && !error && players.length === 0 ? (
          <Text style={styles.info}>You haven't blocked any players.</Text>
        ) : null}
        {players.map(player => (
          <View key={player.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{player.playerLabel}</Text>
              <Text style={styles.meta}>Room {player.roomCode}</Text>
              <Text style={styles.meta}>Blocked {new Date(player.createdAt).toLocaleDateString()}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${player.playerLabel} from room ${player.roomCode}`}
              disabled={busyId !== null}
              onPress={() => confirmUnblock(player)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>UNBLOCK</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh blocked players"
          onPress={() => void refresh()}
          style={styles.refresh}
        >
          <Text style={styles.refreshText}>REFRESH BLOCKED LIST</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 22, paddingBottom: 40, gap: 16 },
  kicker: { color: theme.orange, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: theme.text, fontSize: 31, fontWeight: '900' },
  info: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  error: { color: '#e87777', fontSize: 14 },
  card: {
    backgroundColor: theme.panel, padding: 15, borderColor: theme.line,
    borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  copy: { flex: 1, gap: 5 },
  name: { color: theme.text, fontWeight: '900', fontSize: 16 },
  meta: { color: theme.muted, fontSize: 12 },
  button: {
    minHeight: 44, paddingHorizontal: 14, borderWidth: 1,
    borderColor: theme.orange, borderRadius: 11, justifyContent: 'center',
  },
  buttonText: { color: theme.text, fontWeight: '900', fontSize: 11 },
  refresh: { padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: theme.panel },
  refreshText: { color: theme.text, fontWeight: '900', fontSize: 12 },
})
