import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import AuthLayout, {
  AuthLabel,
  authInputClass,
  authPrimaryBtnClass,
  authPrimaryBtnTextClass,
} from '../../components/AuthLayout'
import { ApiError, api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { colors } from '../../theme'
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to Sandeshak"
      footer={
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text className="text-sm text-muted-foreground">
            New here? <Text className="font-semibold text-primary">Create an account</Text>
          </Text>
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

        <View>
          <AuthLabel>Password</AuthLabel>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            className={authInputClass}
          />
        </View>

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} className="-mt-1 self-end">
          <Text className="text-xs font-semibold text-primary">Forgot password?</Text>
        </Pressable>

        {error && (
          <View className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        )}

        <Pressable onPress={onSubmit} disabled={submitting} className={authPrimaryBtnClass}>
          <Text className={authPrimaryBtnTextClass}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </AuthLayout>
  )
}
