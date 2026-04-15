import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'

// ─── Auth Stack ──────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

// ─── App Tabs ────────────────────────────────────────────────────────────────

export type AppTabParamList = {
  Chats: undefined
  Profile: undefined
}

// ─── Chat Stack (nested inside Chats tab) ────────────────────────────────────

export type ChatStackParamList = {
  ChatList: undefined
  Chat: { conversationId: string; title: string }
}

// ─── Screen prop helpers ─────────────────────────────────────────────────────

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>
export type ChatListScreenProps = NativeStackScreenProps<ChatStackParamList, 'ChatList'>
export type ChatScreenProps = NativeStackScreenProps<ChatStackParamList, 'Chat'>
export type ProfileScreenProps = BottomTabScreenProps<AppTabParamList, 'Profile'>
