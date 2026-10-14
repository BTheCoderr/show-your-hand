import { Stack, router } from 'expo-router'
import { Pressable, StatusBar, StyleSheet, Text } from 'react-native'
import { theme } from '../src/theme'

function BackButton() {
  const goBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      // A direct link can open a screen without a previous route.
      router.replace('/')
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      accessibilityHint="Go to the previous screen"
      hitSlop={8}
      onPress={goBack}
      style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
    >
      <Text style={styles.backArrow}>‹</Text>
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  )
}

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          // Do not let iOS use a route name such as "index" as the back label.
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { fontWeight: '900' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'HOME' }} />
        <Stack.Screen name="solo-setup" options={{ title: 'SOLO SETUP' }} />
        <Stack.Screen name="solo" options={{ title: 'SOLO TABLE' }} />
        <Stack.Screen name="online" options={{ title: 'ONLINE 1V1' }} />
        <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ title: 'HOW TO PLAY' }} />
        <Stack.Screen name="rules" options={{ title: 'QUICK RULES' }} />
        <Stack.Screen name="settings" options={{ title: 'SETTINGS + STATS' }} />
        <Stack.Screen name="blocked" options={{ title: 'BLOCKED PLAYERS' }} />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  back: {
    minHeight: 40,
    minWidth: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 22,
    backgroundColor: theme.panel,
    paddingHorizontal: 12,
  },
  backPressed: {
    opacity: 0.75,
  },
  backArrow: {
    color: theme.text,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '500',
    marginTop: -3,
  },
  backLabel: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
})
