import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { selectIsSlow, useServerStatusStore } from '../store/serverStatus'
import { colors } from '../theme'

export default function SlowServerBanner() {
  const isSlow = useServerStatusStore(selectIsSlow)
  if (!isSlow) return null

  return (
    <SafeAreaView
      edges={['top']}
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}
    >
      <View className="mx-4 mt-2 flex-row items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 shadow-lg">
        <ActivityIndicator size="small" color={colors.primary} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">Waking up our server…</Text>
          <Text className="text-xs text-muted-foreground">
            This may take ~30 seconds the first time.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
