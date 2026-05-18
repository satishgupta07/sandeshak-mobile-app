import { useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { ApiError, api } from '../../lib/api'
import { uploadFile } from '../../lib/upload'
import { useAuthStore } from '../../store/auth'
import { useChatStore } from '../../store/chat'
import { colors } from '../../theme'
import type { ApiResponse, UpdateProfileRequest, UserDTO } from '../../types'
import type { ProfileScreenProps } from '../../types/navigation'

const inputClass = 'rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground'
const labelClass = 'mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'

export default function ProfileScreen(_props: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setUser = useAuthStore((s) => s.setUser)
  const clear = useAuthStore((s) => s.clear)
  const clearChat = useChatStore((s) => s.clear)

  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [verifySending, setVerifySending] = useState(false)

  if (!user) return null

  async function onSaveProfile() {
    setProfileError(null)
    setSavingProfile(true)
    try {
      const body: UpdateProfileRequest = { name, bio: bio || undefined }
      const res = await api<ApiResponse<UserDTO>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setUser(res.data)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onPickAvatar() {
    setUploadError(null)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setUploadError('Photo library permission denied')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: false,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    if (!asset.fileSize || !asset.mimeType) {
      setUploadError('Could not read file info')
      return
    }
    setUploading(true)
    try {
      const upload = await uploadFile(
        {
          uri: asset.uri,
          fileName: asset.fileName ?? 'photo.jpg',
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        },
        'image',
      )
      const res = await api<ApiResponse<UserDTO>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: upload.url }),
      })
      setUser(res.data)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onResendVerify() {
    setVerifyMessage(null)
    setVerifySending(true)
    try {
      const res = await api<ApiResponse<{ sent: boolean; alreadyVerified?: boolean }>>(
        '/auth/send-verification-email',
        { method: 'POST' },
      )
      setVerifyMessage(
        res.data.alreadyVerified
          ? 'Already verified.'
          : 'Verification email sent — check your inbox.',
      )
    } catch (err) {
      setVerifyMessage(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setVerifySending(false)
    }
  }

  function onLogout() {
    if (refreshToken) {
      api('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    clearChat()
    clear()
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-12">
        <View className="px-5 pt-4">
          <Text className="text-2xl font-bold text-foreground">Profile</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Manage how others see you on Sandeshak.
          </Text>

          {!user.isVerified && (
            <View className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                  <Text className="text-base">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-warning">Email not verified</Text>
                  <Text className="mt-0.5 text-xs text-warning/90">
                    Some features may be limited until you verify your email.
                  </Text>
                  <Pressable onPress={onResendVerify} disabled={verifySending} className="mt-2">
                    <Text className="text-xs font-semibold text-warning underline">
                      {verifySending ? 'Sending…' : 'Send verification email'}
                    </Text>
                  </Pressable>
                  {verifyMessage && (
                    <Text className="mt-2 text-xs text-warning/90">{verifyMessage}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Avatar */}
          <View className="mt-6 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-foreground">Profile photo</Text>
            <View className="mt-4 flex-row items-center gap-4">
              <View
                className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary"
                style={{ borderWidth: 2, borderColor: colors.border }}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} className="h-full w-full" />
                ) : (
                  <Text className="text-2xl font-semibold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onPickAvatar}
                disabled={uploading}
                className="rounded-2xl border border-border bg-surface-2 px-4 py-2.5 active:bg-surface-hover disabled:opacity-50"
              >
                <Text className="text-sm font-medium text-foreground">
                  {uploading ? 'Uploading…' : 'Change photo'}
                </Text>
              </Pressable>
            </View>
            {uploadError && <Text className="mt-3 text-sm text-destructive">{uploadError}</Text>}
          </View>

          {/* Profile fields */}
          <View className="mt-5 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-foreground">About you</Text>

            <View className="mt-4 gap-4">
              <View>
                <Text className={labelClass}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={100}
                  placeholderTextColor={colors.mutedForeground}
                  className={inputClass}
                />
              </View>

              <View>
                <Text className={labelClass}>Email</Text>
                <TextInput
                  value={user.email}
                  editable={false}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
                />
              </View>

              <View>
                <Text className={labelClass}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  maxLength={139}
                  multiline
                  numberOfLines={3}
                  placeholder="Say something about yourself…"
                  placeholderTextColor={colors.mutedForeground}
                  className={inputClass}
                  style={{ textAlignVertical: 'top', minHeight: 72 }}
                />
                <Text className="mt-1 text-right text-[11px] text-muted-foreground">
                  {bio.length}/139
                </Text>
              </View>
            </View>

            {profileError && (
              <View className="mt-3 rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2">
                <Text className="text-sm text-destructive">{profileError}</Text>
              </View>
            )}

            <Pressable
              onPress={onSaveProfile}
              disabled={savingProfile}
              className="mt-5 rounded-2xl bg-primary px-4 py-3.5 active:bg-primary-hover disabled:opacity-50"
            >
              <Text className="text-center text-sm font-semibold text-primary-foreground">
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onLogout}
            className="mt-5 rounded-2xl border border-border bg-surface px-4 py-3.5 active:bg-surface-hover"
          >
            <Text className="text-center text-sm font-semibold text-destructive">Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
