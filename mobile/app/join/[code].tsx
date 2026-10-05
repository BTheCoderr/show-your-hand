import { Redirect, useLocalSearchParams } from 'expo-router'

export default function JoinRoomLink() {
  const { code } = useLocalSearchParams<{ code?: string }>()
  const normalized = String(code ?? '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, 6)

  return (
    <Redirect
      href={{
        pathname: '/online',
        params: normalized ? { code: normalized } : {},
      }}
    />
  )
}
