# sandeshak-mobile

React Native mobile app for [Sandeshak](../README.md) — a secure, real-time chat application. Runs on iOS and Android from a single codebase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + TypeScript |
| Toolchain | Expo SDK 54 |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| Styling | NativeWind v4 (Tailwind CSS v3) |
| Linting | ESLint + Prettier |
| Git hooks | Husky + lint-staged |
| Builds | EAS Build |

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- For iOS: macOS with Xcode installed
- For Android: Android Studio with an emulator configured
- `sandeshak-server` running locally (see [server README](../sandeshak-server/README.md))

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Start the Expo dev server
npm start
```

Then press `a` for Android, `i` for iOS, or `w` for web in the terminal.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | REST API base URL |
| `EXPO_PUBLIC_WS_URL` | `http://localhost:3000` | WebSocket server URL |

> When running on a physical device, replace `localhost` with your machine's local IP address (e.g. `192.168.1.x`).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start on Android emulator / device |
| `npm run ios` | Start on iOS simulator / device (macOS only) |
| `npm run web` | Start in browser |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint and auto-fix |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check` | Run TypeScript compiler check |

## Project Structure

```
src/
├── navigation/
│   ├── RootNavigator.tsx    # Top-level stack — switches Auth ↔ App
│   ├── AuthNavigator.tsx    # Stack: Login → Register
│   ├── AppNavigator.tsx     # Bottom tabs: Chats | Profile
│   └── ChatNavigator.tsx    # Stack: ChatList → Chat
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── chat/
│   │   ├── ChatListScreen.tsx
│   │   └── ChatScreen.tsx
│   └── profile/
│       └── ProfileScreen.tsx
├── types/
│   ├── navigation.ts        # Typed param lists for all navigators
│   └── index.ts             # Mirror of sandeshak-server/src/types/index.ts
App.tsx                      # NavigationContainer + SafeAreaProvider root
global.css                   # Tailwind CSS directives (NativeWind entry)
```

## Navigation — In Depth

### Core Concepts

React Navigation models the UI as a tree of **navigators**, each managing a collection of **screens**. Every navigator maintains its own history stack internally. Three navigator types are used in this app:

| Navigator | Behaviour | Used for |
|-----------|-----------|---------|
| `NativeStackNavigator` | Screens slide in/out; a back stack is maintained | Auth flow, Chat drill-down |
| `BottomTabNavigator` | Persistent tab bar; each tab keeps its own stack alive | Main app shell |

The entire tree lives inside a single `<NavigationContainer>` (in `App.tsx`), which owns the **navigation state** and syncs it with the OS back button (Android) and swipe-back gesture (iOS).

---

### Navigator Tree

```
NavigationContainer          ← owns global navigation state
└── RootNavigator (Stack)    ← no header, no animation between Auth/App
    │
    ├── [unauthenticated]
    │   └── AuthNavigator (Stack)
    │       ├── LoginScreen       /auth/login
    │       └── RegisterScreen    /auth/register
    │
    └── [authenticated]
        └── AppNavigator (Bottom Tabs)
            ├── Chats tab
            │   └── ChatNavigator (Stack)
            │       ├── ChatListScreen   — list of conversations
            │       └── ChatScreen       — individual chat thread
            │           params: { conversationId: string, title: string }
            │
            └── Profile tab
                └── ProfileScreen
```

---

### How Auth Switching Works

`RootNavigator` conditionally renders either `AuthNavigator` or `AppNavigator` based on auth state:

```tsx
// RootNavigator.tsx
const isAuthenticated = useIsAuthenticated()   // ← auth store (Phase 1)

<Root.Navigator>
  {isAuthenticated
    ? <Root.Screen name="App"  component={AppNavigator} />
    : <Root.Screen name="Auth" component={AuthNavigator} />
  }
</Root.Navigator>
```

React Navigation detects the screen list change and automatically transitions the user — no manual `navigate()` call needed. When `isAuthenticated` flips to `true`, the Auth screens are **unmounted and removed from history**, so pressing back cannot return to the login screen.

---

### Nested Navigators and the Tab Bar

`AppNavigator` renders a bottom tab bar with two tabs. The **Chats** tab hosts its own `ChatNavigator` (a stack), meaning:

- `ChatListScreen` and `ChatScreen` share the same tab
- Navigating `ChatList → Chat` pushes onto the nested stack; the tab bar **stays visible**
- Each tab preserves its own navigation state independently — switching to Profile and back to Chats remembers your position in the chat stack

```
AppNavigator (tabs)
  Chats tab  →  ChatNavigator (stack)
                  ChatListScreen   ← tab bar visible
                  ChatScreen       ← tab bar visible, back arrow in header
  Profile tab →  ProfileScreen    ← tab bar visible
```

---

### Type-Safe Navigation

All param lists are defined in `src/types/navigation.ts`:

```ts
// Declare what params each screen accepts
export type ChatStackParamList = {
  ChatList: undefined                                   // no params
  Chat: { conversationId: string; title: string }      // required params
}
```

Screen components receive fully typed `route` and `navigation` props via the helper types:

```ts
// In ChatScreen.tsx
export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { conversationId, title } = route.params   // ✅ fully typed
}
```

Navigating to a typed screen enforces the correct params at compile time:

```ts
// TypeScript error if conversationId is missing or wrong type
navigation.navigate('Chat', { conversationId: '123', title: 'Alice' })
```

---

### Screen Diagram

```
┌──────────────────────────────┐
│         LoginScreen          │  ← AuthNavigator (Stack)
│  [email]  [password]         │
│  [ Sign in ]                 │
│  → Register                  │
└──────────────────────────────┘
             ↓ login success (Phase 1)
┌──────────────────────────────┐
│  Sandeshak             ⋮      │  ← ChatListScreen (ChatNavigator)
│ ───────────────────────────  │
│  Alice   Hey, how are you?   │
│  Bob     See you tomorrow    │  ← tap a row →
│  ...                         │
├──────────────────────────────┤
│  🗨 Chats    👤 Profile      │  ← AppNavigator (Tab bar)
└──────────────────────────────┘
             ↓ tap conversation
┌──────────────────────────────┐
│ ← Alice               📞 ⋮   │  ← ChatScreen (ChatNavigator)
│                              │
│        Hey, how are you?     │
│  I'm good, thanks!           │
│                              │
│ [     Type a message...    ] │
├──────────────────────────────┤
│  🗨 Chats    👤 Profile      │
└──────────────────────────────┘
```

Auth/App switching is controlled in `RootNavigator.tsx`. Plug in the auth store in Phase 1 to make it dynamic.

## EAS Builds

| Profile | Distribution | Purpose |
|---------|-------------|---------|
| `development` | Internal | Dev client build with hot reload |
| `preview` | Internal | Shareable test build (no store) |
| `production` | Store | App Store / Play Store release |

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Build preview for both platforms
eas build --platform all --profile preview

# Build for production
eas build --platform all --profile production
```

## CI / CD

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | PR → `main` / `develop`, push → `develop` | Lint + Type-check |
| `eas-build.yml` | Push → `main` | Lint + Type-check + EAS build (preview) |

**Required secret:** add `EXPO_TOKEN` to GitHub repo Settings → Secrets and variables → Actions.  
Get your token at: Expo dashboard → Account → Access Tokens.

## Code Quality

Husky runs `lint-staged` on every commit:
- **ESLint fix** + **Prettier** on `src/**/*.{ts,tsx}` and `App.tsx`

## Shared Types

`src/types/index.ts` is a manual mirror of `sandeshak-server/src/types/index.ts`.  
When the server API contract changes, sync it with:

```bash
cp ../sandeshak-server/src/types/index.ts src/types/index.ts
```

## Related Repositories

- [`sandeshak-server`](../sandeshak-server) — Node.js + Express + Socket.io
- [`sandeshak-web`](../sandeshak-web) — React web app
