import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: isSsrBuild ? { copyPublicDir: false } : undefined,
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/show-your-hand-game/**/*.test.ts'],
  },
}))
