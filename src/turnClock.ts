/**
 * The engine keeps the most recent 80 log messages. Detect only newly appended
 * events, including when the buffer rolls over during long matches.
 */
export function newHistoryEvents(previous: readonly string[], next: readonly string[]): string[] {
  for (let overlap = Math.min(previous.length, next.length); overlap > 0; overlap--) {
    if (previous.slice(-overlap).every((event, index) => event === next[index])) {
      return next.slice(overlap)
    }
  }
  return next.slice()
}

export function startsAnotherTurn(message: string): boolean {
  return /(?:'s turn\.| starts(?: the round)?\.)$/.test(message)
}
