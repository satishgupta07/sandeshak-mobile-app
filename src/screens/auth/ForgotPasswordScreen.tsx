import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import AuthLayout, {
  AuthLabel,
  authInputClass,
  authPrimaryBtnClass,
  authPrimaryBtnTextClass,
} from '../../components/AuthLayout'
import { ApiError, api } from '../../lib/api'
import { colors } from '../../theme'
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

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If an account exists for ${email}, we sent a reset link. It expires in 1 hour.`}
        footer={
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text className="text-sm font-semibold text-primary">← Back to sign in</Text>
          </Pressable>
        }
      >
        <View className="items-center py-2">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
            <Text className="text-2xl">✉️</Text>
          </View>
        </View>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="We'll email you a link to reset it."
      footer={
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-sm font-semibold text-primary">← Back to sign in</Text>
        </Pressable>
      }
    >
      <View className="gap-4">
        <View>
          <AuthLabel>Email</AuthLabel>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            className={authInputClass}
          />
        </View>

        {error && (
          <View className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        )}

        <Pressable onPress={onSubmit} disabled={submitting} className={authPrimaryBtnClass}>
          <Text className={authPrimaryBtnTextClass}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  )
}
