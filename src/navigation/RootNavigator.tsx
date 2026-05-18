import { ActivityIndicator, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AppNavigator from './AppNavigator'
import AuthNavigator from './AuthNavigator'
import { selectIsAuthenticated, useAuthStore } from '../store/auth'
import { colors } from '../theme'

type RootParamList = {
  Auth: undefined
  App: undefined
}

const Root = createNativeStackNavigator<RootParamList>()

export default function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Root.Screen name="App" component={AppNavigator} />
      ) : (
        <Root.Screen name="Auth" component={AuthNavigator} />
      )}
    </Root.Navigator>
  )
}
