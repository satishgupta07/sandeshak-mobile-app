import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import ProfileScreen from '../screens/profile/ProfileScreen'
import ChatNavigator from './ChatNavigator'
import type { AppTabParamList } from '../types/navigation'

const Tab = createBottomTabNavigator<AppTabParamList>()

export default function AppNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  )
}
