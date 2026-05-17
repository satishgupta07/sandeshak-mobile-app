import { useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ApiError, api } from '../../lib/api'
import { uploadFile } from '../../lib/upload'
import { useAuthStore } from '../../store/auth'
import { useChatStore } from '../../store/chat'
import type { ApiResponse, UpdateProfileRequest, UserDTO } from '../../types'
import type { ProfileScreenProps } from '../../types/navigation'

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
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="pb-12">
      <View className="px-6 pt-12">
        {!user.isVerified && (
          <View className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <Text className="text-sm text-yellow-900">Your email isn&apos;t verified.</Text>
            <Pressable onPress={onResendVerify} disabled={verifySending} className="mt-2">
              <Text className="text-sm font-medium text-yellow-900 underline">
                {verifySending ? 'Sending…' : 'Send verification email'}
              </Text>
            </Pressable>
            {verifyMessage && <Text className="mt-2 text-sm text-yellow-900">{verifyMessage}</Text>}
          </View>
        )}

        {/* Avatar */}
        <View className="rounded-xl bg-white p-6 shadow-sm">
          <Text className="text-sm font-medium text-gray-700">Profile photo</Text>
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="text-2xl font-medium text-gray-500">
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={onPickAvatar}
              disabled={uploading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 active:bg-gray-100 disabled:opacity-50"
            >
              <Text className="text-sm font-medium text-gray-700">
                {uploading ? 'Uploading…' : 'Change photo'}
              </Text>
            </Pressable>
          </View>
          {uploadError && <Text className="mt-3 text-sm text-red-600">{uploadError}</Text>}
        </View>

        {/* Profile fields */}
        <View className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <Text className="text-sm font-medium text-gray-700">About you</Text>

          <Text className="mt-4 text-sm font-medium text-gray-700">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={100}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />

          <Text className="mt-4 text-sm font-medium text-gray-700">Email</Text>
          <TextInput
            value={user.email}
            editable={false}
            className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          />

          <Text className="mt-4 text-sm font-medium text-gray-700">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            maxLength={139}
            multiline
            numberOfLines={3}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            style={{ textAlignVertical: 'top', minHeight: 72 }}
          />
          <Text className="mt-1 text-xs text-gray-400">{bio.length}/139</Text>

          {profileError && <Text className="mt-3 text-sm text-red-600">{profileError}</Text>}

          <Pressable
            onPress={onSaveProfile}
            disabled={savingProfile}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2.5 active:bg-blue-700 disabled:opacity-50"
          >
            <Text className="text-center text-sm font-medium text-white">
              {savingProfile ? 'Saving…' : 'Save changes'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onLogout}
          className="mt-6 rounded-md bg-white px-4 py-3 shadow-sm active:bg-gray-100"
        >
          <Text className="text-center text-sm font-medium text-red-600">Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
