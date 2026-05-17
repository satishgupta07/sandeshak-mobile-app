import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native'
import { ApiError, api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useChatStore } from '../../store/chat'
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

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <Image source={{ uri: url }} className="rounded-full" style={{ width: size, height: size }} />
    )
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-gray-200"
      style={{ width: size, height: size }}
    >
      <Text className="text-sm font-medium text-gray-600">
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

  // Search state
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<UserDTO[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  // Initial conversations fetch
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

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Run user search whenever debounced query changes
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
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 p-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </View>

      {showSearchPane ? (
        <View className="flex-1">
          {searchError && <Text className="px-4 py-2 text-sm text-red-600">{searchError}</Text>}
          {!searchError && searching && results.length === 0 && (
            <Text className="px-4 py-2 text-sm text-gray-400">Searching…</Text>
          )}
          {!searchError && !searching && results.length === 0 && (
            <Text className="px-4 py-2 text-sm text-gray-400">No users found.</Text>
          )}
          {startError && <Text className="px-4 py-2 text-sm text-red-600">{startError}</Text>}
          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onStartConversation(item)}
                disabled={startingId !== null}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-gray-50"
                style={{ opacity: startingId !== null ? 0.5 : 1 }}
              >
                <Avatar url={item.avatarUrl} name={item.name} size={36} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                {startingId === item.id && (
                  <Text className="ml-2 text-xs text-gray-400">Starting…</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      ) : (
        <>
          {loadingList && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
            </View>
          )}
          {!loadingList && listError && (
            <Text className="p-4 text-sm text-red-600">{listError}</Text>
          )}
          {!loadingList && !listError && conversations.length === 0 && (
            <Text className="p-4 text-sm text-gray-400">
              No conversations yet. Search above to start one.
            </Text>
          )}
          {!loadingList && !listError && conversations.length > 0 && (
            <FlatList
              data={conversations}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => {
                const name = displayName(item, currentUserId)
                const avatar = displayAvatar(item, currentUserId)
                const preview = item.lastMessage?.content ?? '—'
                const otherId = otherUserId(item, currentUserId)
                const isOnline = otherId ? (presence[otherId]?.isOnline ?? false) : false
                return (
                  <Pressable
                    onPress={() => onOpenConversation(item)}
                    className="flex-row items-center gap-3 px-4 py-3 active:bg-gray-50"
                  >
                    <View>
                      <Avatar url={avatar} name={name} />
                      {isOnline && (
                        <View className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                        {name}
                      </Text>
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {preview}
                      </Text>
                    </View>
                    {item.unreadCount > 0 && (
                      <View className="ml-2 rounded-full bg-blue-600 px-2 py-0.5">
                        <Text className="text-xs font-medium text-white">{item.unreadCount}</Text>
                      </View>
                    )}
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
