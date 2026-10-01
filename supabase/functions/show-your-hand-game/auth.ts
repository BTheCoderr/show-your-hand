export function acceptedPublicApiKeys(
  publishableKeysJson: string | null | undefined,
  legacyAnonKey: string | null | undefined,
): Set<string> {
  const keys = new Set<string>()

  if (legacyAnonKey) keys.add(legacyAnonKey)

  if (publishableKeysJson) {
    try {
      const parsed = JSON.parse(publishableKeysJson) as Record<string, unknown>
      for (const value of Object.values(parsed)) {
        if (typeof value === 'string' && value.length > 0) keys.add(value)
      }
    } catch {
      // Malformed platform configuration should fail closed.
    }
  }

  return keys
}

export function validPublicApiKey(
  candidate: string | null | undefined,
  publishableKeysJson: string | null | undefined,
  legacyAnonKey: string | null | undefined,
): boolean {
  if (!candidate) return false
  return acceptedPublicApiKeys(publishableKeysJson, legacyAnonKey).has(candidate)
}
