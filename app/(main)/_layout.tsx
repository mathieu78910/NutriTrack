import { Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { ActivityIndicator, Text, View } from 'react-native'

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E7A43',
        tabBarInactiveTintColor: '#7D8F84',
        tabBarStyle: {
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E3EEE8',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: '700' }}>⌂</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: '700' }}>＋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: '700' }}>◉</Text>
          ),
        }}
      />
    </Tabs>
  )
}
