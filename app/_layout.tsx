import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { Stack } from 'expo-router'
import { Text, View } from 'react-native'

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
      </View>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </ClerkProvider>
  )
}
