import { Stack } from 'expo-router'
import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { ActivityIndicator, View } from 'react-native'

export default function MainLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!isSignedIn) {
    return <Redirect href="/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
