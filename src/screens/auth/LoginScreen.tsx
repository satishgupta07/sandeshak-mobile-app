import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ApiError, api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import type { ApiResponse, AuthResponse, LoginRequest } from '../../types'
import type { LoginScreenProps } from '../../types/navigation'

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const body: LoginRequest = { email, password }
      const response = await api<ApiResponse<AuthResponse>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      setAuth(response.data.user, response.data.tokens)
      // RootNavigator switches stacks automatically when isAuthenticated flips.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-gray-50 px-6">
      <View className="rounded-xl bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">Sign in</Text>
        <Text className="mt-1 text-sm text-gray-500">Welcome back to Sandeshak</Text>

        <Text className="mt-6 text-sm font-medium text-gray-700">Email</Text>
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
          autoComplete="current-password"
          textContentType="password"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />

        {error && <Text className="mt-4 text-sm text-red-600">{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2.5 active:bg-blue-700 disabled:opacity-50"
        >
          <Text className="text-center text-sm font-medium text-white">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} className="mt-3">
          <Text className="text-center text-sm text-blue-600">Forgot password?</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} className="mt-3">
          <Text className="text-center text-sm text-gray-500">
            New here? <Text className="text-blue-600">Create an account</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
