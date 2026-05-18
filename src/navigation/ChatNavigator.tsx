import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ChatListScreen from '../screens/chat/ChatListScreen'
import ChatScreen from '../screens/chat/ChatScreen'
import { colors } from '../theme'
import type { ChatStackParamList } from '../types/navigation'

const Stack = createNativeStackNavigator<ChatStackParamList>()

export default function ChatNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Sandeshak' }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
