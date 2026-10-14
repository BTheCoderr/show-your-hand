import { useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native'
import {
  blockOpponent, reportOpponent, type OnlineRoomPlayer,
  type OnlineSession, type ReportReason,
} from './onlineApi'
import { theme } from './theme'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'inappropriate_name', label: 'Inappropriate name or content' },
  { value: 'cheating', label: 'Cheating or exploits' },
  { value: 'other', label: 'Other safety concern' },
]

export function PlayerSafetyActions({
  session, opponents, onBlocked,
}: {
  session: OnlineSession
  opponents: OnlineRoomPlayer[]
  onBlocked: () => Promise<void>
}) {
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '')
  const opponent = opponents.find((player) => player.id === targetId) ?? opponents[0]
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('harassment')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReport = async () => {
    if (submitting || !opponent) return
    setSubmitting(true)
    try {
      await reportOpponent(session, opponent.id, reason, details)
      setReportOpen(false)
      setDetails('')
      Alert.alert('Report submitted', 'Your report was securely recorded for review. You can also block this player.')
    } catch (error) {
      Alert.alert('Report not submitted', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmBlock = () => {
    if (!opponent) return
    Alert.alert(
      `Block ${opponent.displayName}?`,
      'This ends the current online table. Future invitations between these installations will be refused. You can unblock later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block player', style: 'destructive',
          onPress: () => {
            if (submitting) return
            setSubmitting(true)
            void (async () => {
              try {
                await blockOpponent(session, opponent.id)
                await onBlocked()
                Alert.alert('Player blocked', 'Your table has ended. Manage blocks in Settings.')
              } catch (error) {
                Alert.alert('Could not block player', error instanceof Error ? error.message : 'Try again.')
              } finally {
                setSubmitting(false)
              }
            })()
          },
        },
      ],
    )
  }

  if (!opponent) return null

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>PLAYER SAFETY · {opponent.displayName}</Text>
      {opponents.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetRow}>
          {opponents.map((player) => (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={`Safety actions for ${player.displayName}`}
              onPress={() => setTargetId(player.id)}
              style={[styles.target, opponent.id === player.id && styles.targetActive]}
            >
              <Text style={styles.targetText}>{player.displayName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report opposing player"
          disabled={submitting}
          style={styles.control}
          onPress={() => setReportOpen(true)}
        >
          <Text style={styles.controlText}>REPORT PLAYER</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Block opposing player"
          disabled={submitting}
          style={[styles.control, styles.block]}
          onPress={confirmBlock}
        >
          <Text style={styles.controlText}>BLOCK PLAYER</Text>
        </Pressable>
      </View>

      <Modal
        visible={reportOpen}
        animationType="slide"
        transparent
        onRequestClose={() => { if (!submitting) setReportOpen(false) }}
      >
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>REPORT PLAYER</Text>
            <Text style={styles.description}>
              Select why you're reporting this opponent. Reports are stored privately for moderation review.
            </Text>
            {REASONS.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === item.value }}
                onPress={() => setReason(item.value)}
                style={[styles.reason, reason === item.value && styles.reasonActive]}
              >
                <Text style={styles.reasonText}>
                  {reason === item.value ? '● ' : '○ '}{item.label}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.label}>DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.details}
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us what happened. Do not share personal information."
              placeholderTextColor={theme.muted}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{details.length}/500</Text>
            <View style={styles.actions}>
              <Pressable
                disabled={submitting}
                style={styles.control}
                onPress={() => setReportOpen(false)}
              >
                <Text style={styles.controlText}>CANCEL</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                style={[styles.control, styles.submit]}
                accessibilityRole="button"
                accessibilityLabel="Submit player report"
                onPress={() => void submitReport()}
              >
                {submitting
                  ? <ActivityIndicator color={theme.text} />
                  : <Text style={styles.controlText}>SEND REPORT</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 12, marginVertical: 8, gap: 7 },
  heading: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  targetRow: { gap: 6, paddingBottom: 2 },
  target: {
    borderWidth: 1, borderColor: theme.line, borderRadius: 999,
    paddingHorizontal: 10, minHeight: 32, justifyContent: 'center',
  },
  targetActive: { borderColor: theme.orange },
  targetText: { color: theme.text, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  control: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: theme.line,
    backgroundColor: theme.panel, minHeight: 44,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  block: { borderColor: '#b84a4a' },
  controlText: { fontSize: 11, fontWeight: '900', color: theme.text },
  overlay: { flex: 1, backgroundColor: '#000c', justifyContent: 'center', padding: 18 },
  sheet: {
    backgroundColor: theme.panel, padding: 20, gap: 12, borderRadius: 20,
    borderWidth: 1, borderColor: theme.line,
  },
  modalTitle: { color: theme.text, fontSize: 25, fontWeight: '900' },
  description: { color: theme.muted, fontSize: 13, lineHeight: 19 },
  reason: {
    borderWidth: 1, borderColor: theme.line, borderRadius: 11,
    minHeight: 46, paddingHorizontal: 12, justifyContent: 'center',
  },
  reasonActive: { borderColor: theme.orange },
  reasonText: { color: theme.text, fontSize: 13 },
  label: { color: theme.text, fontSize: 11, fontWeight: '800' },
  details: {
    color: theme.text, backgroundColor: theme.bg, borderColor: theme.line,
    borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 95, fontSize: 13,
  },
  counter: { color: theme.muted, textAlign: 'right', fontSize: 11 },
  submit: { backgroundColor: theme.orange, borderColor: theme.orange },
})
