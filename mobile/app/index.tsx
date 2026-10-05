import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { playMobileFeedback } from '../src/feedback'
import { loadMobilePreferences } from '../src/mobilePrefs'
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native'
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
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false)

  useEffect(() => {
    void loadMobilePreferences().then((prefs) => {
      setShowTutorialPrompt(!prefs.tutorialSeen)
    })
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View>
          <Text style={styles.kicker}>BETA MOBILE · 0.1.0</Text>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>SHOW</Text>
            <Text style={styles.title}>YOUR</Text>
            <Text style={styles.title}>HAND</Text>
          </View>
          <View style={styles.taglineBlock}>
            <Text style={styles.tagline}>DROP. PICK UP. ATTACK. DEFEND.</Text>
            <Text style={styles.tagline}>BUT NEVER SHOW YOUR HAND.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {showTutorialPrompt ? (
            <View style={styles.tutorialPrompt}>
              <Text style={styles.tutorialPromptTitle}>FIRST GAME?</Text>
              <Text style={styles.tutorialPromptText}>
                Run the 2-minute interactive tutorial before you sit at the table.
              </Text>
              <View style={styles.promptActions}>
                <Pressable
                  onPress={() => router.push('/tutorial')}
                  style={styles.promptPrimary}
                >
                  <Text style={styles.promptPrimaryText}>START TUTORIAL</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTutorialPrompt(false)}
                  style={styles.promptSecondary}
                >
                  <Text style={styles.promptSecondaryText}>NOT NOW</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 22,
  },
  kicker: {
    color: theme.orange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 18,
  },
  titleBlock: {
    marginBottom: 2,
  },
  title: {
    color: theme.text,
    fontSize: 64,
    lineHeight: 55,
    fontWeight: '900',
    letterSpacing: -3,
  },
  taglineBlock: {
    marginTop: 22,
  },
  tagline: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actions: { gap: 12 },
  tutorialPrompt: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: '#25160d',
    padding: 14,
    gap: 8,
  },
  tutorialPromptTitle: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  tutorialPromptText: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 18,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  promptPrimary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSecondary: {
    minWidth: 90,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptPrimaryText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '900',
  },
  promptSecondaryText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
  },
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
