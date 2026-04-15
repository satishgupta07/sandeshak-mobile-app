import { Text, View } from 'react-native'
import type { ChatListScreenProps } from '../../types/navigation'

export default function ChatListScreen(_props: ChatListScreenProps) {
  return (
    <View className="flex-1 bg-white">
      <Text className="p-4 text-sm text-gray-400">No conversations yet</Text>
    </View>
  )
}
