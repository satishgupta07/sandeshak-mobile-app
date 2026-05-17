import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import ProfileScreen from '../screens/profile/ProfileScreen'
import ChatNavigator from './ChatNavigator'
import { useChatSocket } from '../hooks/useChatSocket'
import type { AppTabParamList } from '../types/navigation'

const Tab = createBottomTabNavigator<AppTabParamList>()

export default function AppNavigator() {
  // Single mount point for the chat socket. Lives for the entire authenticated
  // session so message/presence/receipt events keep flowing regardless of
  // which tab is currently focused.
  useChatSocket()

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Chats" component={ChatNavigator} options={{ title: 'Chats' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  )
}
