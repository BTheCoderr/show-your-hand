import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { playMobileFeedback } from '../src/feedback'
import {
  DEFAULT_MOBILE_PREFERENCES,
  loadMobilePreferences,
  saveMobilePreferences,
  type MobilePreferences,
} from '../src/mobilePrefs'
import { theme } from '../src/theme'

export default function SoloSetupScreen() {
  const [prefs, setPrefs] = useState<MobilePreferences>(
    DEFAULT_MOBILE_PREFERENCES,
  )

  useEffect(() => {
    void loadMobilePreferences().then(setPrefs)
  }, [])

  const update = async (next: MobilePreferences) => {
    setPrefs(next)
    await saveMobilePreferences(next)
  }

  const start = async () => {
    await playMobileFeedback('tap')
    router.push({
      pathname: '/solo',
      params: {
        opponents: String(prefs.defaultOpponents),
        beginner: prefs.beginnerMode ? '1' : '0',
      },
    })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>SOLO TABLE</Text>
        <Text style={styles.title}>SET THE TABLE</Text>
        <Text style={styles.body}>
          Choose how many CPU opponents you want and whether you want a visible
          turn clock.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>CPU OPPONENTS</Text>
          <View style={styles.countRow}>
            {[1, 2, 3, 4, 5].map((count) => {
              const active = prefs.defaultOpponents === count
              return (
                <Pressable
                  key={count}
                  onPress={() =>
                    void update({
                      ...prefs,
                      defaultOpponents:
                        count as MobilePreferences['defaultOpponents'],
                    })
                  }
                  style={[
                    styles.countButton,
                    active && styles.countButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      active && styles.countTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.optionRow}>
            <View style={styles.optionCopy}>
              <Text style={styles.label}>BEGINNER MODE</Text>
              <Text style={styles.optionHint}>
                No turn clock. Same scoring and same cards.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                void update({
                  ...prefs,
                  beginnerMode: !prefs.beginnerMode,
                })
              }
              style={[
                styles.toggle,
                prefs.beginnerMode && styles.toggleOn,
              ]}
            >
              <Text style={styles.toggleText}>
                {prefs.beginnerMode ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => void start()}
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.startTitle}>DEAL THE CARDS</Text>
          <Text style={styles.startSubtitle}>
            You vs {prefs.defaultOpponents} CPU
            {prefs.defaultOpponents === 1 ? '' : 's'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 22, paddingBottom: 40, gap: 16 },
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
  card: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  label: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel2,
  },
  countButtonActive: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  countText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },
  countTextActive: {
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCopy: { flex: 1 },
  optionHint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  toggle: {
    minWidth: 68,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
    backgroundColor: theme.panel2,
    borderWidth: 1,
    borderColor: theme.line,
  },
  toggleOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  toggleText: {
    color: theme.text,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  startButton: {
    minHeight: 82,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.orange,
    paddingHorizontal: 18,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  startTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  startSubtitle: {
    color: '#fbe4d6',
    marginTop: 4,
    fontSize: 12,
  },
})
