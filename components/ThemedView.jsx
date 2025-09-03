import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'react-native-paper'

const ThemedView = ({ style, safe = false, ...props }) => {

  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View 
      style={[
        {
          backgroundColor: theme.background,
          paddingTop: insets.top
        }, 
        style
      ]} 
      {...props}
    />
  )
  
}

export default ThemedView