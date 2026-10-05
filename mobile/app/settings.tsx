import { useEffect, useState } from 'react'
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  initializeMobileFeedback,
  setMobileFeedbackEnabled,
} from '../src/feedback'
import {
  DEFAULT_MOBILE_PREFERENCES,
  loadMobilePreferences,
  saveMobilePreferences,
  type MobilePreferences,
} from '../src/mobilePrefs'
import {
  clearMobileStats,
  EMPTY_MOBILE_STATS,
  loadMobileStats,
  type MobileStats,
} from '../src/mobileStats'
import { theme } from '../src/theme'

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<MobilePreferences>(
    DEFAULT_MOBILE_PREFERENCES,
  )
  const [stats, setStats] = useState<MobileStats>(EMPTY_MOBILE_STATS)

  useEffect(() => {
    void Promise.all([
      loadMobilePreferences(),
      loadMobileStats(),
      initializeMobileFeedback(),
    ]).then(([nextPrefs, nextStats]) => {
      setPrefs(nextPrefs)
      setStats(nextStats)
    })
  }, [])

  const toggleFeedback = async () => {
    const next = await setMobileFeedbackEnabled(!prefs.feedbackEnabled)
    setPrefs(next)
  }

  const toggleBeginner = async () => {
    const next = { ...prefs, beginnerMode: !prefs.beginnerMode }
    setPrefs(next)
    await saveMobilePreferences(next)
  }

  const resetStats = async () => {
    await clearMobileStats()
    setStats(EMPTY_MOBILE_STATS)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>PLAYER SETTINGS</Text>
        <Text style={styles.title}>YOUR TABLE</Text>

        <View style={styles.card}>
          <View style={styles.optionRow}>
            <View style={styles.optionCopy}>
              <Text style={styles.label}>HAPTIC FEEDBACK</Text>
              <Text style={styles.hint}>
                Card taps, attacks, defenses, scoring, and wins.
              </Text>
            </View>
            <Pressable
              onPress={() => void toggleFeedback()}
              style={[styles.toggle, prefs.feedbackEnabled && styles.toggleOn]}
            >
              <Text style={styles.toggleText}>
                {prefs.feedbackEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={styles.optionCopy}>
              <Text style={styles.label}>BEGINNER MODE DEFAULT</Text>
              <Text style={styles.hint}>
                Starts solo games without the visible 2-minute turn clock.
              </Text>
            </View>
            <Pressable
              onPress={() => void toggleBeginner()}
              style={[styles.toggle, prefs.beginnerMode && styles.toggleOn]}
            >
              <Text style={styles.toggleText}>
                {prefs.beginnerMode ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>LOCAL SOLO STATS</Text>
        <View style={styles.statsGrid}>
          {[
            ['MATCHES', stats.matchesPlayed],
            ['WINS', stats.wins],
            ['ROUNDS', stats.roundsWon],
            ['ATTACKS', stats.attacksPlayed],
            ['DEFENSES', stats.defensesPlayed],
            ['BEST HAND', stats.bestHandPoints],
          ].map(([label, value]) => (
            <View key={String(label)} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.resetButton} onPress={() => void resetStats()}>
          <Text style={styles.resetText}>RESET LOCAL STATS</Text>
        </Pressable>

        <View style={styles.linksCard}>
          <Text style={styles.sectionTitle}>SUPPORT + LEGAL</Text>
          <Pressable
            style={styles.linkRow}
            onPress={() =>
              void Linking.openURL('https://show-your-hand.netlify.app/privacy')
            }
          >
            <Text style={styles.linkText}>Privacy</Text>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
          <Pressable
            style={styles.linkRow}
            onPress={() =>
              void Linking.openURL('https://show-your-hand.netlify.app/terms')
            }
          >
            <Text style={styles.linkText}>Terms</Text>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
          <Pressable
            style={styles.linkRow}
            onPress={() =>
              void Linking.openURL('https://show-your-hand.netlify.app/feedback')
            }
          >
            <Text style={styles.linkText}>Feedback + support</Text>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          Online stats live with the room session and stay server-authoritative.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 22, paddingBottom: 40, gap: 16 },
  eyebrow: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: { color: theme.text, fontSize: 42, fontWeight: '900' },
  card: {
    backgroundColor: theme.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 16,
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionCopy: { flex: 1 },
  label: { color: theme.text, fontSize: 12, fontWeight: '900' },
  hint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  toggle: {
    minWidth: 66,
    minHeight: 40,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  toggleText: { color: theme.text, fontWeight: '900', fontSize: 11 },
  divider: { height: 1, backgroundColor: theme.line },
  sectionTitle: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '31%',
    minHeight: 90,
    borderRadius: 16,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: theme.text, fontSize: 28, fontWeight: '900' },
  statLabel: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: 0.8,
  },
  linksCard: {
    backgroundColor: theme.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 16,
    gap: 4,
  },
  linkRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  linkText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
  },
  linkArrow: {
    color: theme.orange,
    fontSize: 20,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#5d2525',
    backgroundColor: '#251313',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { color: theme.danger, fontWeight: '900', fontSize: 11 },
  note: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
})
