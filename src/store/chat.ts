import { create } from 'zustand'
import type { ConversationDTO, MessageDTO, MessageStatus } from '../types'

export interface PresenceEntry {
  isOnline: boolean
  lastSeen: string | null
}

// 'sent' = server acknowledged; 'delivered' = at least one recipient received;
// 'read' = at least one recipient has read. Matches the web store exactly.
export type ReceiptStatus = Extract<MessageStatus, 'delivered' | 'read'>

interface ChatState {
  isConnected: boolean

  conversations: ConversationDTO[]
  messagesByConv: Record<string, MessageDTO[]> // ordered oldest → newest

  presence: Record<string, PresenceEntry>

  // typingByConv: convId → list of userIds typing (excludes self). Plain array
  // for Zustand structural-equality friendliness.
  typingByConv: Record<string, string[]>

  // receiptsByMessage: messageId → userId → status. Read overrides delivered.
  receiptsByMessage: Record<string, Record<string, ReceiptStatus>>

  activeConversationId: string | null

  setConnected: (connected: boolean) => void
  setConversations: (convs: ConversationDTO[]) => void
  upsertConversation: (conv: ConversationDTO) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: MessageDTO[]) => void
  appendMessage: (conversationId: string, message: MessageDTO) => void

  setPresence: (userId: string, entry: PresenceEntry) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  setReceipt: (messageId: string, userId: string, status: ReceiptStatus) => void

  clear: () => void
}

const initialState = {
  isConnected: false,
  conversations: [] as ConversationDTO[],
  messagesByConv: {} as Record<string, MessageDTO[]>,
  presence: {} as Record<string, PresenceEntry>,
  typingByConv: {} as Record<string, string[]>,
  receiptsByMessage: {} as Record<string, Record<string, ReceiptStatus>>,
  activeConversationId: null as string | null,
}

function seedPresenceFromConversation(
  conv: ConversationDTO,
  presence: Record<string, PresenceEntry>,
): Record<string, PresenceEntry> {
  const next = { ...presence }
  for (const p of conv.participants) {
    next[p.userId] = { isOnline: p.user.isOnline, lastSeen: p.user.lastSeen }
  }
  return next
}

export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setConversations: (convs) =>
    set((state) => {
      let presence = state.presence
      for (const c of convs) presence = seedPresenceFromConversation(c, presence)
      return { conversations: convs, presence }
    }),

  upsertConversation: (conv) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conv.id)
      const conversations =
        idx === -1
          ? [conv, ...state.conversations]
          : state.conversations.map((c, i) => (i === idx ? conv : c))
      const presence = seedPresenceFromConversation(conv, state.presence)
      return { conversations, presence }
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConv: { ...state.messagesByConv, [conversationId]: messages },
    })),

  // Idempotent against dup ids — sender's echo racing optimistic insert is a no-op.
  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId] ?? []
      if (existing.some((m) => m.id === message.id)) return {}
      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: [...existing, message],
        },
      }
    }),

  setPresence: (userId, entry) =>
    set((state) => ({ presence: { ...state.presence, [userId]: entry } })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingByConv[conversationId] ?? []
      const has = current.includes(userId)
      if (isTyping === has) return {}
      const next = isTyping ? [...current, userId] : current.filter((id) => id !== userId)
      return { typingByConv: { ...state.typingByConv, [conversationId]: next } }
    }),

  // Read overrides delivered (monotonic). Delivered never demotes a read.
  setReceipt: (messageId, userId, status) =>
    set((state) => {
      const prev = state.receiptsByMessage[messageId]?.[userId]
      if (prev === 'read' && status === 'delivered') return {}
      if (prev === status) return {}
      const forMessage = { ...(state.receiptsByMessage[messageId] ?? {}), [userId]: status }
      return {
        receiptsByMessage: { ...state.receiptsByMessage, [messageId]: forMessage },
      }
    }),

  clear: () => set({ ...initialState }),
}))
