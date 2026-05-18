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
    <AuthLayout
      title="Create account"
      subtitle="Join Sandeshak — chat with anyone, anywhere"
      footer={
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-sm text-muted-foreground">
            Already have an account? <Text className="font-semibold text-primary">Sign in</Text>
          </Text>
        </Pressable>
      }
    >
      <View className="gap-4">
        <View>
          <AuthLabel>Name</AuthLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoComplete="name"
            textContentType="name"
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            className={authInputClass}
          />
        </View>

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
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
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
            {submitting ? 'Creating account…' : 'Create account'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  )
}
