import './global.css'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import BootGate from './src/components/BootGate'
import SlowServerBanner from './src/components/SlowServerBanner'
import RootNavigator from './src/navigation/RootNavigator'
import { colors, navigationTheme } from './src/theme'

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <BootGate>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
          <SlowServerBanner />
        </BootGate>
        <StatusBar style="light" backgroundColor={colors.background} />
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
