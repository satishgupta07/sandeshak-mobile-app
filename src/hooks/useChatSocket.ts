import { useEffect } from 'react'
import { initSocket, teardownSocket } from '../lib/socket'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'

// Server doesn't auto-clear typing if the sender disconnects mid-burst. We
// auto-clear locally after this much idle time.
const TYPING_AUTOCLEAR_MS = 5000

// Connects the socket whenever an access token is available; tears down on
// logout. Mount from a single authenticated component (AppNavigator) so only
// one connection exists per app session.
export function useChatSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return undefined

    const socket = initSocket(accessToken)
    const chat = useChatStore.getState()

    // Per-(convId,userId) timers used to auto-clear stale typing state.
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()
    const typingKey = (convId: string, userId: string): string => `${convId}::${userId}`

    socket.on('connect', () => useChatStore.getState().setConnected(true))
    socket.on('disconnect', () => useChatStore.getState().setConnected(false))
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message)
    })

    socket.on('message:new', (msg) => {
      useChatStore.getState().appendMessage(msg.conversationId, msg)
    })

    socket.on('conversation:new', (conv) => {
      useChatStore.getState().upsertConversation(conv)
    })

    socket.on('message:receipt', ({ messageId, userId, status }) => {
      useChatStore.getState().setReceipt(messageId, userId, status)
    })

    socket.on('presence:update', ({ userId, isOnline, lastSeen }) => {
      useChatStore.getState().setPresence(userId, { isOnline, lastSeen })
    })

    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      useChatStore.getState().setTyping(conversationId, userId, isTyping)
      const key = typingKey(conversationId, userId)
      const existing = typingTimers.get(key)
      if (existing !== undefined) clearTimeout(existing)
      if (isTyping) {
        const handle = setTimeout(() => {
          useChatStore.getState().setTyping(conversationId, userId, false)
          typingTimers.delete(key)
        }, TYPING_AUTOCLEAR_MS)
        typingTimers.set(key, handle)
      } else {
        typingTimers.delete(key)
      }
    })

    socket.connect()

    return () => {
      for (const handle of typingTimers.values()) clearTimeout(handle)
      typingTimers.clear()
      teardownSocket()
      chat.setConnected(false)
    }
  }, [accessToken])
}
