import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ApiError, api } from '../../lib/api'
import type { ApiResponse, ForgotPasswordRequest } from '../../types'
import type { ForgotPasswordScreenProps } from '../../types/navigation'

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const body: ForgotPasswordRequest = { email }
      await api<ApiResponse<{ sent: true }>>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-gray-50 px-6">
      <View className="rounded-xl bg-white p-6 shadow-sm">
        {submitted ? (
          <>
            <Text className="text-2xl font-bold text-gray-900">Check your email</Text>
            <Text className="mt-2 text-sm text-gray-500">
              If an account exists for {email}, we sent a reset link. The link expires in 1 hour.
            </Text>
            <Pressable onPress={() => navigation.navigate('Login')} className="mt-6">
              <Text className="text-sm text-blue-600">Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-900">Forgot your password?</Text>
            <Text className="mt-1 text-sm text-gray-500">
              We&apos;ll email you a link to reset it.
            </Text>

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

            {error && <Text className="mt-4 text-sm text-red-600">{error}</Text>}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              className="mt-6 rounded-md bg-blue-600 px-4 py-2.5 active:bg-blue-700 disabled:opacity-50"
            >
              <Text className="text-center text-sm font-medium text-white">
                {submitting ? 'Sending…' : 'Send reset link'}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Login')} className="mt-4">
              <Text className="text-center text-sm text-gray-500">
                <Text className="text-blue-600">Back to sign in</Text>
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}
