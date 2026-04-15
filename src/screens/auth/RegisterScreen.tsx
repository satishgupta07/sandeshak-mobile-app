import { Text, View } from 'react-native'
import type { RegisterScreenProps } from '../../types/navigation'

export default function RegisterScreen(_props: RegisterScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <Text className="text-2xl font-bold text-gray-900">Create account</Text>
      <Text className="mt-2 text-sm text-gray-500">Join Sandeshak</Text>
    </View>
  )
}
