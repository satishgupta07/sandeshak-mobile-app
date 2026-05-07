import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ApiError, api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import type { ApiResponse, AuthResponse, RegisterRequest } from '../../types'
import type { RegisterScreenProps } from '../../types/navigation'

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const body: RegisterRequest = { name, email, password }
      const response = await api<ApiResponse<AuthResponse>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      setAuth(response.data.user, response.data.tokens)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-gray-50 px-6">
      <View className="rounded-xl bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">Create account</Text>
        <Text className="mt-1 text-sm text-gray-500">Join Sandeshak</Text>

        <Text className="mt-6 text-sm font-medium text-gray-700">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={100}
          autoComplete="name"
          textContentType="name"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />

        <Text className="mt-4 text-sm font-medium text-gray-700">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />

        <Text className="mt-4 text-sm font-medium text-gray-700">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />

        {error && <Text className="mt-4 text-sm text-red-600">{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2.5 active:bg-blue-700 disabled:opacity-50"
        >
          <Text className="text-center text-sm font-medium text-white">
            {submitting ? 'Creating account…' : 'Create account'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')} className="mt-4">
          <Text className="text-center text-sm text-gray-500">
            Already have an account? <Text className="text-blue-600">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
