import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../types'

// On a real device "localhost" is the device. Set EXPO_PUBLIC_SOCKET_URL to
// your machine's LAN IP (e.g. http://192.168.1.42:3000). The fallback works
// for the iOS simulator only — Android emulator users should use 10.0.2.2.
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Module-scoped singleton — only one socket regardless of how many components
// import this file. The useChatSocket hook owns the lifecycle.
let currentSocket: AppSocket | null = null

export function getSocket(): AppSocket | null {
  return currentSocket
}

export function initSocket(token: string): AppSocket {
  if (currentSocket) {
    currentSocket.disconnect()
    currentSocket = null
  }
  const socket: AppSocket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    transports: ['websocket'],
  })
  currentSocket = socket
  return socket
}

export function teardownSocket(): void {
  if (currentSocket) {
    currentSocket.disconnect()
    currentSocket = null
  }
}
