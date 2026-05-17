import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ApiError, api } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { useAuthStore } from '../../store/auth'
import { useChatStore, type ReceiptStatus } from '../../store/chat'
import type { ConversationDTO, MessageDTO, PaginatedResponse } from '../../types'
import type { ChatScreenProps } from '../../types/navigation'

const TYPING_AUTOSTOP_MS = 3000

type MessageStatus = 'sent' | ReceiptStatus

function otherUserId(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return null
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null
}

// Direct: status from the single other participant. Group: 'read' only when
// everyone has read, else 'delivered' if anyone received, else 'sent'.
function deriveMessageStatus(
  conv: ConversationDTO,
  currentUserId: string | undefined,
  receipts: Record<string, ReceiptStatus> | undefined,
): MessageStatus {
  const otherIds = conv.participants.map((p) => p.userId).filter((id) => id !== currentUserId)
  if (otherIds.length === 0 || !receipts) return 'sent'
  const statuses = otherIds.map((id) => receipts[id]).filter((s): s is ReceiptStatus => Boolean(s))
  if (statuses.length === 0) return 'sent'
  if (statuses.every((s) => s === 'read')) return 'read'
  return 'delivered'
}

function StatusTick({ status, ownIsBlue }: { status: MessageStatus; ownIsBlue: boolean }) {
  const isDouble = status !== 'sent'
  const colorClass =
    status === 'read'
      ? ownIsBlue
        ? 'text-sky-300'
        : 'text-blue-500'
      : ownIsBlue
        ? 'text-blue-200'
        : 'text-gray-400'
  return (
    <Text className={`ml-1 text-[10px] ${colorClass}`} accessibilityLabel={status}>
      {isDouble ? '✓✓' : '✓'}
    </Text>
  )
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Offline'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Offline'
  return `Last seen ${d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { conversationId } = route.params
  const currentUserId = useAuthStore((s) => s.user?.id)
  const conversations = useChatStore((s) => s.conversations)
  const messagesByConv = useChatStore((s) => s.messagesByConv)
  const setMessages = useChatStore((s) => s.setMessages)
  const isConnected = useChatStore((s) => s.isConnected)
  const presence = useChatStore((s) => s.presence)
  const typingByConv = useChatStore((s) => s.typingByConv)
  const receiptsByMessage = useChatStore((s) => s.receiptsByMessage)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)

  const conv = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  )
  const messages = messagesByConv[conversationId] ?? []

  const [draft, setDraft] = useState('')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const listRef = useRef<FlatList<MessageDTO>>(null)

  // Typing-emit state — ref so changes don't re-render.
  const typingRef = useRef<{
    emittedConvId: string | null
    timer: ReturnType<typeof setTimeout> | null
  }>({ emittedConvId: null, timer: null })

  const loading = messagesByConv[conversationId] === undefined && historyError === null

  // Track active conversation in the store so the header on ChatList can
  // highlight it if we ever surface that. Reset on unmount.
  useEffect(() => {
    setActiveConversation(conversationId)
    return () => {
      setActiveConversation(null)
    }
  }, [conversationId, setActiveConversation])

  // Fetch history once per conversation
  useEffect(() => {
    if (messagesByConv[conversationId]) return undefined
    let cancelled = false
    api<PaginatedResponse<MessageDTO>>(`/conversations/${conversationId}/messages?page=1&limit=50`)
      .then((res) => {
        if (cancelled) return
        // Server returns newest-first; reverse to oldest → newest for the feed.
        setMessages(conversationId, [...res.data].reverse())
      })
      .catch((err) => {
        if (cancelled) return
        setHistoryError(err instanceof ApiError ? err.message : 'Network error')
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, messagesByConv, setMessages])

  // Mark latest other-sender message as read whenever it changes.
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const latestMessageId = latestMessage?.id ?? null
  const latestSenderId = latestMessage?.senderId ?? null
  useEffect(() => {
    if (!latestMessageId) return
    if (latestSenderId === currentUserId) return
    const socket = getSocket()
    if (!socket?.connected) return
    socket.emit('message:read', { conversationId, messageId: latestMessageId })
  }, [conversationId, latestMessageId, latestSenderId, currentUserId])

  // Stop typing on unmount / conv change so the other side doesn't see a
  // stuck "typing…".
  useEffect(() => {
    const state = typingRef.current
    return () => {
      if (state.emittedConvId !== null) {
        const socket = getSocket()
        if (socket?.connected) {
          socket.emit('typing:stop', { conversationId: state.emittedConvId })
        }
      }
      if (state.timer !== null) clearTimeout(state.timer)
      state.emittedConvId = null
      state.timer = null
    }
  }, [conversationId])

  // Update the screen header title once we know the display name.
  const headerTitle = useMemo(() => {
    if (!conv) return route.params.title
    if (conv.type === 'group') return conv.name ?? 'Group'
    const other = conv.participants.find((p) => p.userId !== currentUserId)
    return other?.user.name ?? route.params.title
  }, [conv, currentUserId, route.params.title])

  useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle })
  }, [headerTitle, navigation])

  function emitTypingStop() {
    const state = typingRef.current
    if (state.emittedConvId === null) return
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('typing:stop', { conversationId: state.emittedConvId })
    }
    if (state.timer !== null) clearTimeout(state.timer)
    state.emittedConvId = null
    state.timer = null
  }

  function emitTypingStart() {
    const socket = getSocket()
    if (!socket?.connected) return
    const state = typingRef.current
    if (state.emittedConvId !== conversationId) {
      socket.emit('typing:start', { conversationId })
      state.emittedConvId = conversationId
    }
    if (state.timer !== null) clearTimeout(state.timer)
    state.timer = setTimeout(() => emitTypingStop(), TYPING_AUTOSTOP_MS)
  }

  function onDraftChange(text: string) {
    setDraft(text)
    if (text.trim()) emitTypingStart()
    else emitTypingStop()
  }

  function onSend() {
    const trimmed = draft.trim()
    if (!trimmed) return
    const socket = getSocket()
    if (!socket?.connected) return
    socket.emit('message:send', {
      conversationId,
      type: 'text',
      content: trimmed,
    })
    setDraft('')
    emitTypingStop()
  }

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length === 0) return
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 50)
    return () => clearTimeout(id)
  }, [messages.length])

  const otherId = conv ? otherUserId(conv, currentUserId) : null
  const otherPresence = otherId ? (presence[otherId] ?? null) : null
  const typingUsers = typingByConv[conversationId] ?? []
  const showTyping = typingUsers.some((uid) => uid !== currentUserId)

  let statusLine: string | null = null
  if (showTyping) statusLine = 'Typing…'
  else if (otherPresence?.isOnline) statusLine = 'Online'
  else if (otherPresence) statusLine = formatLastSeen(otherPresence.lastSeen)

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <View className="flex-1">
          {statusLine && (
            <Text
              className={`text-xs ${
                showTyping || otherPresence?.isOnline ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {statusLine}
            </Text>
          )}
        </View>
        {!isConnected && <Text className="text-xs text-amber-600">Reconnecting…</Text>}
      </View>

      <View className="flex-1">
        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        )}
        {historyError && (
          <Text className="p-4 text-center text-sm text-red-600">{historyError}</Text>
        )}
        {!loading && !historyError && messages.length === 0 && (
          <Text className="p-4 text-center text-sm text-gray-400">No messages yet. Say hi!</Text>
        )}
        {!loading && !historyError && messages.length > 0 && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isOwn = item.senderId === currentUserId
              const status =
                isOwn && conv
                  ? deriveMessageStatus(conv, currentUserId, receiptsByMessage[item.id])
                  : null
              return (
                <View
                  className={`mb-2 max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwn ? 'self-end bg-blue-600' : 'self-start bg-white'
                  }`}
                  style={!isOwn ? { elevation: 1 } : undefined}
                >
                  <View className="flex-row items-end">
                    <Text className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                      {item.content ?? ''}
                    </Text>
                    {status && <StatusTick status={status} ownIsBlue={isOwn} />}
                  </View>
                </View>
              )
            }}
          />
        )}
      </View>

      <View className="flex-row items-center gap-2 border-t border-gray-200 bg-white p-2">
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          onBlur={emitTypingStop}
          placeholder="Type a message…"
          multiline
          maxLength={8000}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          style={{ maxHeight: 120 }}
        />
        <Pressable
          onPress={onSend}
          disabled={!draft.trim() || !isConnected}
          className="rounded-md bg-blue-600 px-4 py-2 active:bg-blue-700"
          style={{ opacity: !draft.trim() || !isConnected ? 0.5 : 1 }}
        >
          <Text className="text-sm font-medium text-white">Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
