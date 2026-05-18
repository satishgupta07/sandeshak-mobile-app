import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native'
import { ApiError, api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useChatStore } from '../../store/chat'
import { colors } from '../../theme'
import type { ApiResponse, ConversationDTO, PaginatedResponse, UserDTO } from '../../types'
import type { ChatListScreenProps } from '../../types/navigation'

const SEARCH_LIMIT = 20

function displayName(conv: ConversationDTO, currentUserId: string | undefined): string {
  if (conv.type === 'group') return conv.name ?? 'Group'
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  return other?.user.name ?? 'Direct'
}

function displayAvatar(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return conv.avatarUrl
  return conv.participants.find((p) => p.userId !== currentUserId)?.user.avatarUrl ?? null
}

function otherUserId(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return null
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Avatar({ url, name, size = 48 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <Image source={{ uri: url }} className="rounded-full" style={{ width: size, height: size }} />
    )
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-primary"
      style={{ width: size, height: size }}
    >
      <Text className="text-base font-semibold text-primary-foreground">
        {name.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  )
}

export default function ChatListScreen({ navigation }: ChatListScreenProps) {
  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)
  const upsertConversation = useChatStore((s) => s.upsertConversation)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const presence = useChatStore((s) => s.presence)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<UserDTO[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<ApiResponse<ConversationDTO[]>>('/conversations')
      .then((res) => {
        if (cancelled) return
        setConversations(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        setListError(err instanceof ApiError ? err.message : 'Network error')
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [setConversations])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    api<PaginatedResponse<UserDTO>>(
      `/users/search?q=${encodeURIComponent(debouncedQuery)}&page=1&limit=${SEARCH_LIMIT}`,
    )
      .then((res) => {
        if (cancelled) return
        setResults(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        setSearchError(err instanceof ApiError ? err.message : 'Network error')
        setResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  async function onStartConversation(user: UserDTO) {
    if (startingId) return
    setStartError(null)
    setStartingId(user.id)
    try {
      const res = await api<ApiResponse<ConversationDTO>>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId: user.id }),
      })
      upsertConversation(res.data)
      setQuery('')
      onOpenConversation(res.data)
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setStartingId(null)
    }
  }

  function onOpenConversation(conv: ConversationDTO) {
    setActiveConversation(conv.id)
    navigation.navigate('Chat', {
      conversationId: conv.id,
      title: displayName(conv, currentUserId),
    })
  }

  const showSearchPane = debouncedQuery.length > 0

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5">
          <Text className="text-base text-muted-foreground">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or email"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            className="flex-1 text-sm text-foreground"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text className="text-base text-muted-foreground">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {showSearchPane ? (
        <View className="flex-1">
          {searchError && <Text className="px-4 py-2 text-sm text-destructive">{searchError}</Text>}
          {!searchError && searching && results.length === 0 && (
            <Text className="px-4 py-2 text-sm text-muted-foreground">Searching…</Text>
          )}
          {!searchError && !searching && results.length === 0 && (
            <Text className="px-4 py-2 text-sm text-muted-foreground">No users found.</Text>
          )}
          {startError && <Text className="px-4 py-2 text-sm text-destructive">{startError}</Text>}
          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onStartConversation(item)}
                disabled={startingId !== null}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:bg-surface-hover"
                style={{ opacity: startingId !== null ? 0.5 : 1 }}
              >
                <Avatar url={item.avatarUrl} name={item.name} size={40} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                {startingId === item.id && (
                  <Text className="ml-2 text-xs text-muted-foreground">Starting…</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      ) : (
        <>
          {loadingList && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          {!loadingList && listError && (
            <Text className="p-4 text-sm text-destructive">{listError}</Text>
          )}
          {!loadingList && !listError && conversations.length === 0 && (
            <View className="flex-1 items-center justify-center px-6">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
                <Text className="text-3xl">💬</Text>
              </View>
              <Text className="mt-4 text-base font-semibold text-foreground">
                No conversations yet
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Search above to start your first chat.
              </Text>
            </View>
          )}
          {!loadingList && !listError && conversations.length > 0 && (
            <FlatList
              data={conversations}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const name = displayName(item, currentUserId)
                const avatar = displayAvatar(item, currentUserId)
                const preview = item.lastMessage?.content ?? 'No messages yet'
                const time = formatRelativeTime(item.lastMessage?.createdAt)
                const otherId = otherUserId(item, currentUserId)
                const isOnline = otherId ? (presence[otherId]?.isOnline ?? false) : false
                const hasUnread = item.unreadCount > 0
                return (
                  <Pressable
                    onPress={() => onOpenConversation(item)}
                    className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:bg-surface-hover"
                  >
                    <View>
                      <Avatar url={avatar} name={name} size={48} />
                      {isOnline && (
                        <View
                          className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full bg-success"
                          style={{ borderWidth: 2, borderColor: colors.background }}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-baseline justify-between">
                        <Text
                          className="flex-1 text-sm font-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        {time !== '' && (
                          <Text
                            className={`ml-2 text-[11px] ${
                              hasUnread ? 'font-semibold text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {time}
                          </Text>
                        )}
                      </View>
                      <View className="mt-0.5 flex-row items-center justify-between">
                        <Text
                          className={`flex-1 text-xs ${
                            hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                          }`}
                          numberOfLines={1}
                        >
                          {preview}
                        </Text>
                        {hasUnread && (
                          <View className="ml-2 rounded-full bg-primary px-2 py-0.5">
                            <Text className="text-[11px] font-semibold text-primary-foreground">
                              {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                )
              }}
            />
          )}
        </>
      )}
    </View>
  )
}
