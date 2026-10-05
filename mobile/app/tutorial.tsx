import { useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { CardTile } from '../src/CardTile'
import { playMobileFeedback } from '../src/feedback'
import {
  loadMobilePreferences,
  saveMobilePreferences,
} from '../src/mobilePrefs'
import { theme } from '../src/theme'

const steps = [
  {
    kicker: 'THE GOAL',
    title: 'Build a scoring five-card hand',
    body: 'First player to 5 total points wins the match. Every turn is DROP → RESOLVE → PICK UP.',
  },
  {
    kicker: '1 · DROP',
    title: 'Play one card first',
    body: 'Number cards help build your scoring hand. Special cards attack or disrupt the table.',
  },
  {
    kicker: '2 · PICK UP',
    title: 'Finish back at five',
    body: 'After the play resolves, draw back to five. When eligible, you can take the previous numbered discard.',
  },
  {
    kicker: '3 · ATTACK',
    title: 'Special cards change the table',
    body: 'Show Your Hand reveals. Drop Color forces matching cards down. Skip jumps a player. Shuffle re-deals one or two hands.',
  },
  {
    kicker: '4 · DEFEND',
    title: 'Blank cancels',
    body: 'Blank cancels an incoming attack when allowed. Matching specials can counter supported attacks.',
  },
  {
    kicker: '5 · SHUFFLE',
    title: 'Choose one or two targets',
    body: 'Shuffle can hit up to two opponents. Protected players keep their hand.',
  },
  {
    kicker: '6 · DECLARE',
    title: 'Know what scores',
    body: 'Mixed 1–5 = 1 point. Five same number = 2. Five same color = 3. Same-color 1–5 = 4.',
  },
  {
    kicker: 'YOU ARE READY',
    title: 'Drop. Resolve. Pick up.',
    body: 'Watch the active-player indicator, build your hand, defend smart, and declare when your five cards score.',
  },
]

export default function TutorialScreen() {
  const [step, setStep] = useState(0)
  const [practiceDone, setPracticeDone] = useState(false)
  const current = steps[step]

  useEffect(() => {
    setPracticeDone(step === 0 || step === 7)
  }, [step])

  const exampleCards = useMemo(() => {
    if (step === 6) {
      return [1, 2, 3, 4, 5].map((n) => ({
        id: `green-${n}-tutorial`,
        kind: 'number' as const,
        color: 'green' as const,
        number: n as 1 | 2 | 3 | 4 | 5,
        art: `/cards/green-${n}.png`,
      }))
    }
    return null
  }, [step])

  const finish = async () => {
    const prefs = await loadMobilePreferences()
    await saveMobilePreferences({ ...prefs, tutorialSeen: true })
    await playMobileFeedback('score')
    router.replace('/')
  }

  const next = async () => {
    await playMobileFeedback('tap')
    if (step === 7) {
      await finish()
      return
    }
    setStep((value) => Math.min(7, value + 1))
  }

  const stage = (() => {
    if (step === 1) {
      const card = {
        id: 'orange-3-tutorial',
        kind: 'number' as const,
        color: 'orange' as const,
        number: 3 as const,
        art: '/cards/orange-3.png',
      }
      return (
        <View style={styles.centerStage}>
          <CardTile
            card={card}
            selected={!practiceDone}
            onPress={() => {
              setPracticeDone(true)
              void playMobileFeedback('card')
            }}
          />
          <Text style={styles.stageHint}>
            {practiceDone ? '✓ Card played.' : 'Tap the highlighted Orange 3.'}
          </Text>
        </View>
      )
    }

    if (step === 2) {
      return (
        <View style={styles.optionStage}>
          <Pressable
            style={styles.practiceButton}
            onPress={() => {
              setPracticeDone(true)
              void playMobileFeedback('card')
            }}
          >
            <CardTile hidden compact />
            <Text style={styles.practiceTitle}>DRAW PILE</Text>
          </Pressable>
          <Text style={styles.or}>OR</Text>
          <Pressable
            style={styles.practiceButton}
            onPress={() => {
              setPracticeDone(true)
              void playMobileFeedback('card')
            }}
          >
            <CardTile
              compact
              card={{
                id: 'blue-4-tutorial',
                kind: 'number',
                color: 'blue',
                number: 4,
                art: '/cards/blue-4.png',
              }}
            />
            <Text style={styles.practiceTitle}>NUMBERED DISCARD</Text>
          </Pressable>
        </View>
      )
    }

    if (step === 3) {
      const specials = [
        ['show-your-hand', 'SHOW YOUR HAND'],
        ['drop-color', 'DROP COLOR'],
        ['skip', 'SKIP'],
        ['shuffle', 'SHUFFLE'],
      ] as const

      return (
        <View style={styles.specialGrid}>
          {specials.map(([kind, label]) => (
            <Pressable
              key={kind}
              style={styles.specialButton}
              onPress={() => {
                setPracticeDone(true)
                void playMobileFeedback('attack')
              }}
            >
              <CardTile
                compact
                card={{
                  id: `${kind}-tutorial`,
                  kind,
                  art: `/cards/${kind}.png`,
                }}
              />
              <Text style={styles.practiceTitle}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )
    }

    if (step === 4) {
      return (
        <View style={styles.centerStage}>
          <CardTile
            card={{
              id: 'blank-tutorial',
              kind: 'blank',
              art: '/cards/blank.png',
            }}
            selected={!practiceDone}
            onPress={() => {
              setPracticeDone(true)
              void playMobileFeedback('defense')
            }}
          />
          <Text style={styles.stageHint}>
            {practiceDone ? '✓ Attack blocked.' : 'Tap Blank to defend.'}
          </Text>
        </View>
      )
    }

    if (step === 5) {
      return (
        <View style={styles.targetStage}>
          {['CPU 1', 'CPU 2', 'CPU 3'].map((name) => (
            <Pressable
              key={name}
              style={styles.targetChip}
              onPress={() => {
                setPracticeDone(true)
                void playMobileFeedback('attack')
              }}
            >
              <Text style={styles.targetText}>{name}</Text>
            </Pressable>
          ))}
          <Text style={styles.stageHint}>
            {practiceDone ? '✓ Target selected.' : 'Choose a practice target.'}
          </Text>
        </View>
      )
    }

    if (step === 6 && exampleCards) {
      return (
        <View style={styles.scoreStage}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardRow}>
              {exampleCards.map((card) => (
                <CardTile key={card.id} card={card} compact />
              ))}
            </View>
          </ScrollView>
          <Pressable
            style={styles.declareButton}
            onPress={() => {
              setPracticeDone(true)
              void playMobileFeedback('score')
            }}
          >
            <Text style={styles.declareText}>
              {practiceDone ? 'DECLARED ✓' : 'DECLARE THIS HAND'}
            </Text>
          </Pressable>
        </View>
      )
    }

    if (step === 7) {
      return (
        <View style={styles.readyStage}>
          <CardTile
            card={{
              id: 'show-your-hand-ready',
              kind: 'show-your-hand',
              art: '/cards/show-your-hand.png',
            }}
          />
          <Text style={styles.readyText}>FIRST TO 5 POINTS WINS.</Text>
        </View>
      )
    }

    return (
      <View style={styles.loop}>
        <Text style={styles.loopText}>DROP</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.loopText}>RESOLVE</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.loopText}>PICK UP</Text>
      </View>
    )
  })()

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>2-MINUTE TUTORIAL</Text>

        <View style={styles.progress}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= step && styles.progressDotOn,
              ]}
            />
          ))}
        </View>

        <Text style={styles.kicker}>{current.kicker}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.stage}>{stage}</View>

        <View style={styles.footer}>
          <Pressable
            disabled={step === 0}
            style={[styles.navButton, step === 0 && styles.disabled]}
            onPress={() => {
              setStep((value) => Math.max(0, value - 1))
              void playMobileFeedback('tap')
            }}
          >
            <Text style={styles.navText}>BACK</Text>
          </Pressable>

          <Text style={styles.count}>{step + 1} / 8</Text>

          <Pressable style={styles.nextButton} onPress={() => void next()}>
            <Text style={styles.nextText}>
              {step === 7 ? 'FINISH' : practiceDone ? 'NEXT' : 'SKIP STEP'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 22, paddingBottom: 40, gap: 14 },
  eyebrow: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 99,
    backgroundColor: theme.line,
  },
  progressDotOn: { backgroundColor: theme.orange },
  kicker: {
    color: theme.orange,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontSize: 11,
    marginTop: 8,
  },
  title: {
    color: theme.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  body: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  stage: {
    minHeight: 280,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 18,
    justifyContent: 'center',
  },
  loop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  loopText: { color: theme.text, fontWeight: '900', fontSize: 14 },
  arrow: { color: theme.orange, fontSize: 22, fontWeight: '900' },
  centerStage: { alignItems: 'center', gap: 16 },
  stageHint: {
    color: theme.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  optionStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  practiceButton: { alignItems: 'center', gap: 8 },
  practiceTitle: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  or: { color: theme.orange, fontWeight: '900' },
  specialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  specialButton: { width: '44%', alignItems: 'center', gap: 6 },
  targetStage: { gap: 10 },
  targetChip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel2,
  },
  targetText: { color: theme.text, fontWeight: '900' },
  scoreStage: { gap: 18 },
  cardRow: { flexDirection: 'row', gap: 6 },
  declareButton: {
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.orange,
  },
  declareText: { color: theme.text, fontWeight: '900', letterSpacing: 0.6 },
  readyStage: { alignItems: 'center', gap: 18 },
  readyText: { color: theme.text, fontWeight: '900', letterSpacing: 1.2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    minHeight: 48,
    minWidth: 84,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.panel,
  },
  disabled: { opacity: 0.35 },
  navText: { color: theme.text, fontWeight: '900' },
  count: {
    flex: 1,
    color: theme.muted,
    textAlign: 'center',
    fontWeight: '800',
  },
  nextButton: {
    minHeight: 48,
    minWidth: 108,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.orange,
  },
  nextText: { color: theme.text, fontWeight: '900' },
})
