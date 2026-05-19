import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useHeaderHeight } from '@react-navigation/elements'
import { ApiError, api } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { useAuthStore } from '../../store/auth'
import { useChatStore, type ReceiptStatus } from '../../store/chat'
import { colors } from '../../theme'
import type { ConversationDTO, MessageDTO, PaginatedResponse } from '../../types'
import type { ChatScreenProps } from '../../types/navigation'

const TYPING_AUTOSTOP_MS = 3000

type MessageStatus = 'sent' | ReceiptStatus

function otherUserId(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return null
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null
}

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
        ? 'text-sky-200'
        : 'text-primary'
      : ownIsBlue
        ? 'text-white/60'
        : 'text-muted-foreground'
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

function formatTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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

  const headerHeight = useHeaderHeight()

  const conv = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  )
  const messages = messagesByConv[conversationId] ?? []

  const [draft, setDraft] = useState('')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const listRef = useRef<FlatList<MessageDTO>>(null)

  const typingRef = useRef<{
    emittedConvId: string | null
    timer: ReturnType<typeof setTimeout> | null
  }>({ emittedConvId: null, timer: null })

  const loading = messagesByConv[conversationId] === undefined && historyError === null

  useEffect(() => {
    setActiveConversation(conversationId)
    return () => {
      setActiveConversation(null)
    }
  }, [conversationId, setActiveConversation])

  useEffect(() => {
    if (messagesByConv[conversationId]) return undefined
    let cancelled = false
    api<PaginatedResponse<MessageDTO>>(`/conversations/${conversationId}/messages?page=1&limit=50`)
      .then((res) => {
        if (cancelled) return
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

  useEffect(() => {
    if (messages.length === 0) return
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 50)
    return () => clearTimeout(id)
  }, [messages.length])

  // Pin the latest message to the bottom of the visible area when the keyboard
  // opens, so the most recent reply isn't hidden behind the input.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(showEvent, () => {
      listRef.current?.scrollToEnd({ animated: true })
    })
    return () => sub.remove()
  }, [])

  const otherId = conv ? otherUserId(conv, currentUserId) : null
  const otherPresence = otherId ? (presence[otherId] ?? null) : null
  const typingUsers = typingByConv[conversationId] ?? []
  const showTyping = typingUsers.some((uid) => uid !== currentUserId)

  let statusLine: string | null = null
  if (showTyping) statusLine = 'Typing…'
  else if (otherPresence?.isOnline) statusLine = 'Online'
  else if (otherPresence) statusLine = formatLastSeen(otherPresence.lastSeen)

  const statusActive = showTyping || Boolean(otherPresence?.isOnline)

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      {(statusLine || !isConnected) && (
        <View className="flex-row items-center justify-between border-b border-border bg-surface px-4 py-1.5">
          {statusLine ? (
            <Text className={`text-xs ${statusActive ? 'text-success' : 'text-muted-foreground'}`}>
              {statusLine}
            </Text>
          ) : (
            <View />
          )}
          {!isConnected && (
            <View className="rounded-full bg-warning/15 px-2.5 py-0.5">
              <Text className="text-[11px] font-medium text-warning">Reconnecting…</Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-1">
        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {historyError && (
          <Text className="p-4 text-center text-sm text-destructive">{historyError}</Text>
        )}
        {!loading && !historyError && messages.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-3xl">👋</Text>
            <Text className="mt-2 text-sm text-muted-foreground">No messages yet. Say hi!</Text>
          </View>
        )}
        {!loading && !historyError && messages.length > 0 && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item, index }) => {
              const isOwn = item.senderId === currentUserId
              const status =
                isOwn && conv
                  ? deriveMessageStatus(conv, currentUserId, receiptsByMessage[item.id])
                  : null
              const prev = messages[index - 1]
              const next = messages[index + 1]
              const prevSame = prev?.senderId === item.senderId
              const nextSame = next?.senderId === item.senderId
              const time = formatTime(item.createdAt)
              return (
                <View
                  className={`${nextSame ? 'mb-1' : 'mb-2'} max-w-[80%] px-3.5 py-2 ${
                    isOwn ? 'self-end bg-bubble-own' : 'self-start bg-bubble-peer'
                  }`}
                  style={{
                    borderTopLeftRadius: isOwn ? 18 : prevSame ? 6 : 18,
                    borderTopRightRadius: isOwn ? (prevSame ? 6 : 18) : 18,
                    borderBottomLeftRadius: isOwn ? 18 : nextSame ? 6 : 18,
                    borderBottomRightRadius: isOwn ? (nextSame ? 6 : 18) : 18,
                  }}
                >
                  <Text
                    className={`text-sm leading-relaxed ${
                      isOwn ? 'text-bubble-own-foreground' : 'text-bubble-peer-foreground'
                    }`}
                  >
                    {item.content ?? ''}
                  </Text>
                  <View className="mt-0.5 flex-row items-center justify-end">
                    {time !== '' && (
                      <Text
                        className={`text-[10px] ${
                          isOwn ? 'text-white/60' : 'text-muted-foreground'
                        }`}
                      >
                        {time}
                      </Text>
                    )}
                    {status && <StatusTick status={status} ownIsBlue={isOwn} />}
                  </View>
                </View>
              )
            }}
          />
        )}
      </View>

      <View className="flex-row items-end gap-2 border-t border-border bg-surface px-3 py-2.5">
        <View className="flex-1 rounded-3xl border border-border bg-surface-2 px-4 py-2.5">
          <TextInput
            value={draft}
            onChangeText={onDraftChange}
            onBlur={emitTypingStop}
            placeholder="Message"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={8000}
            className="text-sm text-foreground"
            style={{ maxHeight: 120, minHeight: 22 }}
          />
        </View>
        <Pressable
          onPress={onSend}
          disabled={!draft.trim() || !isConnected}
          accessibilityLabel="Send message"
          className="h-11 w-11 items-center justify-center rounded-full bg-primary active:bg-primary-hover"
          style={{ opacity: !draft.trim() || !isConnected ? 0.5 : 1 }}
        >
          <Text className="text-base text-primary-foreground">➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
