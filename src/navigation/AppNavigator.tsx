import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import ProfileScreen from '../screens/profile/ProfileScreen'
import ChatNavigator from './ChatNavigator'
import { useChatSocket } from '../hooks/useChatSocket'
import { colors } from '../theme'
import type { AppTabParamList } from '../types/navigation'

const Tab = createBottomTabNavigator<AppTabParamList>()

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.primary : colors.mutedForeground }}>
      {glyph}
    </Text>
  )
}

export default function AppNavigator() {
  useChatSocket()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => <TabIcon glyph="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon glyph="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}
