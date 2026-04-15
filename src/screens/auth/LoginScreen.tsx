import { Text, View } from 'react-native'
import type { LoginScreenProps } from '../../types/navigation'

export default function LoginScreen(_props: LoginScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <Text className="text-2xl font-bold text-gray-900">Sign in</Text>
      <Text className="mt-2 text-sm text-gray-500">Welcome back to Sandeshak</Text>
    </View>
  )
}
