import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-2xl">💬</Text>
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">{title}</Text>
            {subtitle && (
              <Text className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</Text>
            )}
          </View>

          <View className="mt-6 rounded-3xl border border-border bg-surface p-5">{children}</View>

          {footer && <View className="mt-6 items-center">{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function AuthLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </Text>
  )
}

export const authInputClass =
  'rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground'

export const authPrimaryBtnClass =
  'mt-2 rounded-2xl bg-primary px-4 py-3.5 active:bg-primary-hover disabled:opacity-50'

export const authPrimaryBtnTextClass = 'text-center text-sm font-semibold text-primary-foreground'
