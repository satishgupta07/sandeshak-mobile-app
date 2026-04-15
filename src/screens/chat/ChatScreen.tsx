import { Text, View } from 'react-native'
import type { ChatScreenProps } from '../../types/navigation'

export default function ChatScreen({ route }: ChatScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-gray-400">{route.params.title}</Text>
    </View>
  )
}
