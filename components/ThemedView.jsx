import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { View } from 'react-native'
import { MD3LightTheme, PaperProvider } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ThemedView = ({ children, style, ...props }) => {

  const insets = useSafeAreaInsets()
  const { theme } = useMaterial3Theme()
  const base = MD3LightTheme
  const materialColors = theme.light

  const customTheme = {
    ...base,
    colors: { ...base.colors, ...materialColors }
  }

  return (
    <PaperProvider theme={customTheme} >
      <View 
        style={[
          {
            flex: 1,
            paddingTop: insets.top,
            backgroundColor: customTheme.colors.background,
          }, 
          style
        ]} 
        {...props}
      >
        { children }
      </View>  
    </PaperProvider>
    
  )
  
}

export default ThemedView
