import { router } from 'expo-router'
import { playMobileFeedback } from '../src/feedback'
import { SafeAreaView, StyleSheet, Text, Pressable, View } from 'react-native'
import { theme } from '../src/theme'

function ActionButton({
  title,
  subtitle,
  onPress,
  secondary = false,
}: {
  title: string
  subtitle: string
  onPress: () => void
  secondary?: boolean
}) {
  return (
    <Pressable
      onPress={async () => {
        await playMobileFeedback('tap')
        onPress()
      }}
      style={({ pressed }) => [
        styles.action,
        secondary && styles.actionSecondary,
        pressed && styles.actionPressed,
      ]}
    >
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  )
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <View>
          <Text style={styles.kicker}>BETA MOBILE · 0.1.0</Text>
          <Text style={styles.title}>SHOW{'\\n'}YOUR{'\\n'}HAND</Text>
          <Text style={styles.tagline}>
            DROP. PICK UP. ATTACK. DEFEND.{'\\n'}BUT NEVER SHOW YOUR HAND.
          </Text>
        </View>

        <View style={styles.actions}>
          <ActionButton
            title="PLAY SOLO"
            subtitle="1–5 CPU opponents · same shared game engine"
            onPress={() => router.push('/solo-setup')}
          />
          <ActionButton
            title="ONLINE 1V1"
            subtitle="Create, join, play, reconnect, rematch"
            onPress={() => router.push('/online')}
            secondary
          />
          <ActionButton
            title="HOW TO PLAY"
            subtitle="Interactive 8-step tutorial"
            onPress={() => router.push('/tutorial')}
            secondary
          />
          <ActionButton
            title="SETTINGS + STATS"
            subtitle="Haptics, beginner mode, local records"
            onPress={() => router.push('/settings')}
            secondary
          />
        </View>

        <Text style={styles.footer}>
          Native Expo build · shared rules + shared online backend
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  kicker: {
    color: theme.orange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 18,
  },
  title: {
    color: theme.text,
    fontSize: 64,
    lineHeight: 55,
    fontWeight: '900',
    letterSpacing: -3,
  },
  tagline: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 22,
  },
  actions: { gap: 12 },
  action: {
    minHeight: 76,
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: theme.orange,
  },
  actionSecondary: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
  },
  actionPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  actionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  actionSubtitle: {
    color: '#e8d9ce',
    fontSize: 12,
    marginTop: 3,
  },
  footer: {
    color: theme.muted,
    fontSize: 11,
    textAlign: 'center',
  },
})
