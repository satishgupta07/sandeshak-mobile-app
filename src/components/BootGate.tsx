import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { API_ORIGIN } from '../lib/api'
import { colors } from '../theme'

// Hits /health at startup to warm Render's dyno. If the response doesn't
// arrive within 3s we show a full-screen splash with the cold-start message.
// As soon as the server responds (or after a hard timeout) we render children.
const SLOW_MS = 3000
const HARD_TIMEOUT_MS = 60_000

type Status = 'pending-fast' | 'pending-slow' | 'ready'

export default function BootGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('pending-fast')

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setStatus((s) => (s === 'pending-fast' ? 'pending-slow' : s))
    }, SLOW_MS)

    const controller = new AbortController()
    const hardTimer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS)

    fetch(`${API_ORIGIN}/health`, { signal: controller.signal })
      .catch(() => {
        // Network/abort — let the app load anyway; subsequent API calls
        // will surface their own errors via the slow-request banner.
      })
      .finally(() => {
        clearTimeout(slowTimer)
        clearTimeout(hardTimer)
        setStatus('ready')
      })

    return () => {
      clearTimeout(slowTimer)
      clearTimeout(hardTimer)
      controller.abort()
    }
  }, [])

  if (status === 'ready' || status === 'pending-fast') return <>{children}</>

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
        <ActivityIndicator color={colors.primaryForeground} />
      </View>
      <Text className="mt-4 text-base font-semibold text-foreground">Waking up our server…</Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        The free-tier backend sleeps when idle.{'\n'}This usually takes ~30 seconds.
      </Text>
    </View>
  )
}
