import { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { handCards, playerById } from '../../src/game/helpers'
import { CardTile } from '../src/CardTile'
import { playMobileFeedback } from '../src/feedback'
import { OnlineTable } from '../src/OnlineTable'
import { PlayerSafetyActions } from '../src/PlayerSafetyActions'
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  loadOnlineSession,
  requestRematch,
  saveOnlineSession,
  setReady,
  setRoomOptions,
  startRoom,
  nativeJoinUrl,
  webJoinUrl,
  type AuthoritativeResponse,
  type OnlineRoom,
  type OnlineSession,
} from '../src/onlineApi'
import { theme } from '../src/theme'

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

export default function OnlineScreen() {
  const params = useLocalSearchParams<{ code?: string }>()
  const invitedCode = useMemo(
    () => String(params.code ?? '').trim().toUpperCase().slice(0, 6),
    [params.code],
  )

  const [joinCode, setJoinCode] = useState(invitedCode)
  const [session, setSession] = useState<OnlineSession | null>(null)
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableSize, setTableSize] = useState(2)

  const localPlayer = room?.players.find(
    (player) => player.gamePlayerId === session?.gamePlayerId,
  )
  const opponents = room?.players.filter(
    (player) => player.gamePlayerId !== session?.gamePlayerId,
  ) ?? []
  const disconnected = opponents.find((player) => !player.connected)

  const refresh = async (activeSession = session) => {
    if (!activeSession) return
    const nextRoom = await getRoom(activeSession)
    setRoom((current) =>
      !current || nextRoom.stateVersion >= current.stateVersion
        ? nextRoom
        : current,
    )
  }

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        const saved = await loadOnlineSession()
        if (!saved || cancelled) return
        setSession(saved)
        const nextRoom = await getRoom(saved)
        if (!cancelled) setRoom(nextRoom)
      } catch (restoreError) {
        if (!cancelled) {
          // A temporary network failure must not erase a player's saved seat.
          // Polling will retry in the background while the recovery screen stays visible.
          setRoom(null)
          setError(
            restoreError instanceof Error
              ? restoreError.message
              : 'Could not reach your saved table. Please retry.',
          )
        }
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (invitedCode) setJoinCode(invitedCode)
  }, [invitedCode])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    let pollInFlight = false
    let foreground = AppState.currentState !== 'background'
    const poll = async () => {
      // Only poll in the foreground, and never overlap a previous request.
      if (cancelled || !foreground || pollInFlight) return
      pollInFlight = true
      try {
        const nextRoom = await getRoom(session)
        if (!cancelled && foreground) {
          setRoom((current) =>
            !current || nextRoom.stateVersion >= current.stateVersion
              ? nextRoom
              : current,
          )
          setError(null)
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error ? pollError.message : String(pollError),
          )
        }
      } finally {
        pollInFlight = false
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), 1200)
    const subscription = AppState.addEventListener('change', (nextState) => {
      const resumed = !foreground && nextState === 'active'
      foreground = nextState === 'active'
      if (resumed) void poll()
    })

    return () => {
      cancelled = true
      clearInterval(timer)
      subscription.remove()
    }
  }, [session?.roomId, session?.playerToken])

  const run = async (task: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      await playMobileFeedback('tap')
      await task()
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : String(taskError))
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = () =>
    run(async () => {
      const created = await createRoom('Player 1', tableSize)
      setSession(created)
      setRoom(await getRoom(created))
    })

  const handleJoin = () =>
    run(async () => {
      if (!/^[A-F0-9]{6}$/.test(joinCode)) {
        throw new Error('Enter the six-character room code.')
      }
      const joined = await joinRoom(joinCode, 'Player 2')
      setSession(joined)
      setRoom(await getRoom(joined))
    })

  const handleLeave = () =>
    run(async () => {
      if (session) await leaveRoom(session)
      setSession(null)
      setRoom(null)
    })

  const confirmLeaveLiveMatch = () =>
    Alert.alert(
      'Leave this online match?',
      'This gives up your seat and may end the match for your opponent. To keep playing later, use Back instead.',
      [
        { text: 'Stay at table', style: 'cancel' },
        { text: 'Leave match', style: 'destructive', onPress: handleLeave },
      ],
    )

  const patchAuthoritativeRoom = (response: AuthoritativeResponse) => {
    setRoom((current) =>
      current && response.stateVersion >= current.stateVersion
        ? {
            ...current,
            stateVersion: response.stateVersion,
            status: response.status,
            gameState: response.gameState,
          }
        : current,
    )

    if (session) {
      const nextSession = {
        ...session,
        stateVersion: response.stateVersion,
      }
      setSession(nextSession)
      void saveOnlineSession(nextSession)
    }
  }

  if (restoring) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Restoring your table…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (session && !room) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.eyebrow}>SAVED ONLINE SEAT</Text>
          <Text style={styles.title}>RECONNECT</Text>
          <Text style={styles.body}>
            Your seat in room {session.roomCode} is still saved on this phone.
            A connection error will not erase it. You can retry now or wait
            for the connection to recover.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <ActionButton
            label={busy ? 'RECONNECTING…' : 'RETRY CONNECTION'}
            disabled={busy}
            onPress={() =>
              void run(async () => {
                setRoom(await getRoom(session))
              })
            }
          />
          <ActionButton
            label="FORGET SAVED ROOM"
            secondary
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Forget your saved room?',
                'This removes your local seat token. You may not be able to rejoin the room without a new invite.',
                [
                  { text: 'Keep seat', style: 'cancel' },
                  {
                    text: 'Forget room',
                    style: 'destructive',
                    onPress: () =>
                      void run(async () => {
                        await saveOnlineSession(null)
                        setSession(null)
                        setRoom(null)
                      }),
                  },
                ],
              )
            }
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!session || !room) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.eyebrow}>PRIVATE MULTIPLAYER</Text>
          <Text style={styles.title}>ONLINE TABLE</Text>
          <Text style={styles.body}>
            Create a private table for 2–7 players and share the code, or enter
            a six-character code to take an open seat.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.formCard}>
            <Text style={styles.label}>TABLE SIZE</Text>
            <View style={styles.countRow}>
              {[2, 3, 4, 5, 6, 7].map((size) => (
                <Pressable
                  key={size}
                  accessibilityRole="button"
                  accessibilityLabel={`${size} players`}
                  onPress={() => setTableSize(size)}
                  style={[styles.countButton, tableSize === size && styles.countButtonActive]}
                >
                  <Text style={[styles.countText, tableSize === size && styles.countTextActive]}>{size}</Text>
                </Pressable>
              ))}
            </View>
            <ActionButton
              label={busy ? 'CREATING…' : 'CREATE PRIVATE ROOM'}
              disabled={busy}
              onPress={handleCreate}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR JOIN</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>ROOM CODE</Text>
            <TextInput
              value={joinCode}
              onChangeText={(value) =>
                setJoinCode(value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6))
              }
              maxLength={6}
              placeholder="ABC123"
              placeholderTextColor="#6f6963"
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.codeInput]}
            />

            <ActionButton
              label={busy ? 'JOINING…' : 'JOIN ROOM'}
              secondary
              disabled={busy || joinCode.length !== 6}
              onPress={handleJoin}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (room.status === 'in_game') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {disconnected ? (
          <View style={styles.disconnectBanner}>
            <Text style={styles.disconnectText}>
              {disconnected.displayName} disconnected · {disconnected.disconnectGraceSeconds}s grace
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave online match"
          disabled={busy}
          onPress={confirmLeaveLiveMatch}
          style={styles.liveLeave}
        >
          <Text style={styles.liveLeaveText}>LEAVE TABLE</Text>
        </Pressable>

        <PlayerSafetyActions
          session={session}
          opponents={opponents}
          onBlocked={() => refresh(session)}
        />

        <View style={styles.tableSlot}>
          <OnlineTable
            room={room}
            session={session}
            busy={busy}
            onBusyChange={setBusy}
            onRoomPatch={patchAuthoritativeRoom}
            onError={setError}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (room.status === 'completed') {
    const localStats = localPlayer?.stats
    const finalState = room.gameState
    const winnerId =
      finalState?.phase.type === 'match_over'
        ? finalState.phase.winnerId
        : null
    const winner =
      finalState && winnerId ? playerById(finalState, winnerId) : null
    const winningCards =
      finalState && winnerId ? handCards(finalState, winnerId) : []

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.eyebrow}>MATCH COMPLETE</Text>
          <Text style={styles.title}>RUN IT BACK?</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {winner ? (
            <View style={styles.winnerCard}>
              <Text style={styles.resultTitle}>
                {winner.id === session.gamePlayerId
                  ? 'YOU WON THE MATCH'
                  : `${winner.name.toUpperCase()} WON`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.winningHand}>
                  {winningCards.map((card) => (
                    <CardTile key={card.id} card={card} compact />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>SESSION STATS</Text>
            <Text style={styles.statLine}>
              Match wins · {localStats?.matchWins ?? 0}
            </Text>
            <Text style={styles.statLine}>
              Rounds won · {localStats?.roundsWon ?? 0}
            </Text>
            <Text style={styles.statLine}>
              Attacks · {localStats?.attacksPlayed ?? 0}
            </Text>
            <Text style={styles.statLine}>
              Defenses · {localStats?.defensesPlayed ?? 0}
            </Text>
          </View>

          <View style={styles.playerCard}>
            {room.players.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <View>
                  <Text style={styles.playerName}>
                    {player.displayName}
                    {player.gamePlayerId === session.gamePlayerId ? ' · YOU' : ''}
                  </Text>
                  <Text style={styles.playerMeta}>
                    {player.rematchReady ? 'READY FOR REMATCH' : 'WAITING'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.presenceDot,
                    player.connected && styles.presenceDotOnline,
                  ]}
                />
              </View>
            ))}
          </View>

          <PlayerSafetyActions
            session={session}
            opponents={opponents}
            onBlocked={() => refresh(session)}
          />

          <ActionButton
            label={
              localPlayer?.rematchReady ? 'CANCEL REMATCH' : 'READY FOR REMATCH'
            }
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await requestRematch(session, !localPlayer?.rematchReady)
                await refresh(session)
              })
            }
          />
          <ActionButton
            label="LEAVE TABLE"
            secondary
            disabled={busy}
            onPress={handleLeave}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (room.status === 'abandoned') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          <Text style={styles.eyebrow}>TABLE CLOSED</Text>
          <Text style={styles.title}>MATCH ENDED</Text>
          <Text style={styles.body}>
            A player did not reconnect during the grace period, or the table was left.
          </Text>
          <PlayerSafetyActions
            session={session}
            opponents={opponents}
            onBlocked={() => refresh(session)}
          />
          <ActionButton
            label="BACK TO ONLINE"
            onPress={handleLeave}
            disabled={busy}
          />
        </View>
      </SafeAreaView>
    )
  }

  const bothReady =
    room.players.length === room.maxPlayers &&
    room.players.length >= 2 &&
    room.players.every((player) => player.ready)
  const openSeats = Math.max(0, room.maxPlayers - room.players.length)

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>PRIVATE TABLE</Text>
        <Text style={styles.roomCode}>{room.code}</Text>
        <Text style={styles.body}>
          Share the code or invite link. Every open seat has to be filled and ready before the host can deal.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.rowActions}>
          <ActionButton
            label="SHARE INVITE"
            onPress={() =>
              void Share.share({
                message:
                  `Join my SHOW YOUR HAND room ${room.code}.\n\nWeb: ${webJoinUrl(room.code)}\nApp: ${nativeJoinUrl(room.code)}`,
              })
            }
          />
          <ActionButton
            label="REFRESH"
            secondary
            disabled={busy}
            onPress={() => void run(() => refresh(session))}
          />
        </View>

        <View style={styles.playerCard}>
          {room.players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <View>
                <Text style={styles.playerName}>
                  {player.displayName}
                  {player.gamePlayerId === session.gamePlayerId ? ' · YOU' : ''}
                  {player.seat === 0 ? ' · HOST' : ''}
                </Text>
                <Text style={styles.playerMeta}>
                  {player.ready ? 'READY' : 'NOT READY'}
                </Text>
              </View>

              <View
                style={[
                  styles.presenceDot,
                  player.connected && styles.presenceDotOnline,
                ]}
              />
            </View>
          ))}

          {openSeats > 0 ? (
            <Text style={styles.waitingText}>
              Waiting for {openSeats} more {openSeats === 1 ? 'player' : 'players'}…
            </Text>
          ) : null}
        </View>

        <PlayerSafetyActions
          session={session}
          opponents={opponents}
          onBlocked={() => refresh(session)}
        />

        {session.isHost ? (
          <View style={styles.optionCard}>
            <View>
              <Text style={styles.label}>BEGINNER MODE</Text>
              <Text style={styles.optionHint}>
                No turn clock. Same rules and scoring.
              </Text>
            </View>
            <ActionButton
              label={room.beginnerMode ? 'ON' : 'OFF'}
              secondary
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await setRoomOptions(session, {
                    beginnerMode: !room.beginnerMode,
                    mode: 'standard',
                  })
                  await refresh(session)
                })
              }
            />
          </View>
        ) : null}

        <ActionButton
          label={localPlayer?.ready ? 'NOT READY' : 'READY UP'}
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await setReady(session, !localPlayer?.ready)
              await refresh(session)
            })
          }
        />

        {session.isHost ? (
          <ActionButton
            label={bothReady ? 'DEAL THE MATCH' : 'WAITING FOR THE TABLE'}
            secondary={!bothReady}
            disabled={busy || !bothReady}
            onPress={() =>
              void run(async () => {
                const response = await startRoom(session)
                patchAuthoritativeRoom(response)
              })
            }
          />
        ) : (
          <Text style={styles.waitingText}>
            {bothReady ? 'Host can deal now.' : 'Waiting for every seated player to ready up.'}
          </Text>
        )}

        <ActionButton
          label="LEAVE ROOM"
          secondary
          disabled={busy}
          onPress={handleLeave}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  tableSlot: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  page: {
    padding: 22,
    paddingBottom: 40,
    gap: 16,
  },
  eyebrow: {
    color: theme.orange,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
  },
  title: {
    color: theme.text,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
  },
  body: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: theme.muted,
  },
  error: {
    color: theme.danger,
    backgroundColor: '#251313',
    borderWidth: 1,
    borderColor: '#512020',
    borderRadius: 12,
    padding: 12,
    lineHeight: 19,
  },
  inlineError: {
    color: theme.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#251313',
  },
  formCard: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  label: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonActive: { borderColor: theme.orange, backgroundColor: '#3a2414' },
  countText: { color: theme.text, fontWeight: '900' },
  countTextActive: { color: theme.orange },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#0f0f0f',
    color: theme.text,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    height: 1,
    flex: 1,
    backgroundColor: theme.line,
  },
  dividerText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  liveLeave: {
    alignSelf: 'flex-end',
    minHeight: 32,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginTop: 6,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
  },
  liveLeaveText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  roomCode: {
    color: theme.text,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 8,
  },
  button: {
    minHeight: 52,
    flex: 1,
    borderRadius: 13,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: theme.panel2,
    borderWidth: 1,
    borderColor: theme.line,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  playerCard: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  playerRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
  },
  playerMeta: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.8,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: '#5a5550',
  },
  presenceDotOnline: {
    backgroundColor: theme.success,
  },
  waitingText: {
    color: theme.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  optionCard: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  optionHint: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 4,
  },
  disconnectBanner: {
    backgroundColor: '#432814',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disconnectText: {
    color: '#ffd2ad',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },
  winnerCard: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.orange,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  winningHand: {
    flexDirection: 'row',
    gap: 7,
  },
  resultCard: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  resultTitle: {
    color: theme.orange,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  statLine: {
    color: theme.text,
    fontSize: 15,
  },
})
