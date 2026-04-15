import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AppNavigator from './AppNavigator'
import AuthNavigator from './AuthNavigator'

type RootParamList = {
  Auth: undefined
  App: undefined
}

const Root = createNativeStackNavigator<RootParamList>()

// TODO: replace with real auth store check (Phase 1)
function useIsAuthenticated() {
  return false
}

export default function RootNavigator() {
  const isAuthenticated = useIsAuthenticated()

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
