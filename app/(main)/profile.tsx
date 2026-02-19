import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'

export default function ProfilePage() {
  const { signOut } = useAuth()
  const router = useRouter()
  const { user } = useUser()

  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress

  const [securityMessage, setSecurityMessage] = useState<string | null>(null)

  const handlePasswordResetFromLogin = async () => {
    setSecurityMessage(null)
    await signOut()
    const emailParam = email ? `?reset=1&email=${encodeURIComponent(email)}` : '?reset=1'
    router.replace(`/login${emailParam}`)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>NutriTrack</Text>
        <Text style={styles.title}>Mon profil</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.logo}>NT</Text>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.emailValue}>{email || 'Email indisponible'}</Text>
      </View>

      <View style={styles.securityCard}>
        <Text style={styles.cardTitle}>Sécurité</Text>
        <Text style={styles.cardText}>Le changement se fait sur l’écran de connexion avec code email.</Text>
        <Pressable onPress={handlePasswordResetFromLogin} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Modifier le mot de passe</Text>
        </Pressable>
        {!!securityMessage && <Text style={styles.successText}>{securityMessage}</Text>}
      </View>

      <View style={styles.nutriCard}>
        <Text style={styles.cardTitle}>Repères Nutri-Score</Text>
        <Text style={styles.cardText}>Référence visuelle rapide pour classer les aliments.</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreBadge, { backgroundColor: '#1E7A43' }]}>A</Text>
          <Text style={[styles.scoreBadge, { backgroundColor: '#7FBF45' }]}>B</Text>
          <Text style={[styles.scoreBadge, { backgroundColor: '#F7B500' }]}>C</Text>
          <Text style={[styles.scoreBadge, { backgroundColor: '#F28E2B' }]}>D</Text>
          <Text style={[styles.scoreBadge, { backgroundColor: '#D64545' }]}>E</Text>
        </View>
      </View>

      <Pressable onPress={() => signOut()} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF6',
    paddingTop: 56,
    paddingHorizontal: 16,
    gap: 14,
  },
  header: {
    backgroundColor: '#1E7A43',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  brand: {
    color: '#BFF4D1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE8D8',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0A2B1A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCEAE1',
    padding: 16,
    gap: 10,
  },
  nutriCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 16,
    gap: 10,
  },
  logo: {
    width: 58,
    height: 58,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 58,
    borderRadius: 29,
    backgroundColor: '#EAF7EF',
    color: '#1E7A43',
    fontWeight: '800',
    fontSize: 20,
  },
  cardLabel: {
    color: '#5B7264',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emailValue: {
    color: '#133725',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardTitle: {
    color: '#113723',
    fontSize: 16,
    fontWeight: '800',
  },
  cardText: {
    color: '#5A6E61',
    fontSize: 13,
  },
  primaryAction: {
    backgroundColor: '#1E7A43',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successText: {
    color: '#1E7A43',
    fontSize: 13,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  scoreBadge: {
    color: '#FFFFFF',
    fontWeight: '800',
    width: 30,
    height: 30,
    borderRadius: 6,
    textAlign: 'center',
    lineHeight: 30,
  },
  logoutButton: {
    backgroundColor: '#B3261E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 12,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
})
