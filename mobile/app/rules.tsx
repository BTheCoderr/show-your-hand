import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../src/theme'

const sections = [
  ['TURN', 'DROP → resolve the card → PICK UP until you are back to five cards.'],
  ['DISCARD PICKUP', 'Only the next player may take the previous numbered discard. Specials cannot be picked up.'],
  ['SCORING', '1 pt: mixed 1–5 · 2 pts: five same number · 3 pts: five same color · 4 pts: same-color 1–5. First to 5 wins.'],
  ['SHOW YOUR HAND', 'Reveal a target hand until the turn ends. Blank can cancel the attack.'],
  ['DROP COLOR', 'Name a color. The target drops matching numbered cards. The attacker may claim dropped cards.'],
  ['SKIP', 'Skip the next player. Blank can stop it in Standard play.'],
  ['SHUFFLE', 'Choose one or two targets to reshuffle their hands. Blank protects the player who uses it.'],
  ['BLANK', 'Defense only. It cancels an incoming attack when the rules allow it.'],
]

export default function RulesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>THE QUICK RULES</Text>
      {sections.map(([title, body]) => (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 22, gap: 12, backgroundColor: theme.bg },
  title: { color: theme.text, fontSize: 34, fontWeight: '900', marginBottom: 8 },
  section: {
    backgroundColor: theme.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 16,
  },
  sectionTitle: { color: theme.orange, fontWeight: '900', letterSpacing: 1 },
  body: { color: theme.text, fontSize: 15, lineHeight: 22, marginTop: 6 },
})
