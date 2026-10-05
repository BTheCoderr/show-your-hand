import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'
import { theme } from '../src/theme'

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { fontWeight: '900' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="solo-setup" options={{ title: 'SOLO SETUP' }} />
        <Stack.Screen name="solo" options={{ title: 'SOLO TABLE' }} />
        <Stack.Screen name="online" options={{ title: 'ONLINE 1V1' }} />
        <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ title: 'HOW TO PLAY' }} />
        <Stack.Screen name="rules" options={{ title: 'QUICK RULES' }} />
        <Stack.Screen name="settings" options={{ title: 'SETTINGS + STATS' }} />
      </Stack>
    </>
  )
}
