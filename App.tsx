import './global.css'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import RootNavigator from './src/navigation/RootNavigator'
import { colors, navigationTheme } from './src/theme'

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" backgroundColor={colors.background} />
    </SafeAreaProvider>
  )
}
