import { Text, View } from 'react-native'
import type { ProfileScreenProps } from '../../types/navigation'

export default function ProfileScreen(_props: ProfileScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-gray-400">Profile</Text>
    </View>
  )
}
