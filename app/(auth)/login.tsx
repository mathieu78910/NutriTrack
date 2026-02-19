import { useSignIn } from '@clerk/clerk-expo'
import type { EmailCodeFactor } from '@clerk/types'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import * as React from 'react'
import { Pressable, StyleSheet, TextInput, View, Text } from 'react-native'

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const params = useLocalSearchParams<{ reset?: string; email?: string }>()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [showEmailCode, setShowEmailCode] = React.useState(false)
  const [showResetPassword, setShowResetPassword] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState('')
  const [resetCode, setResetCode] = React.useState('')
  const [resetNewPassword, setResetNewPassword] = React.useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = React.useState('')
  const [resetStep, setResetStep] = React.useState<'request' | 'verify'>('request')
  const [resetMessage, setResetMessage] = React.useState<string | null>(null)
  const [resetError, setResetError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const shouldReset = params.reset === '1'
    const email = typeof params.email === 'string' ? params.email : ''
    setShowResetPassword(shouldReset)
    setResetEmail(email)
    setResetCode('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setResetStep('request')
    setResetMessage(null)
    setResetError(null)
  }, [params.reset, params.email])

  // Handle the submission of the sign-in form
  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) return

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              // Check for tasks and navigate to custom UI to help users resolve them
              // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
              console.log(session?.currentTask)
              return
            }

            router.replace('/')
          },
        })
      } else if (signInAttempt.status === 'needs_second_factor') {
        // Check if email_code is a valid second factor
        // This is required when Client Trust is enabled and the user
        // is signing in from a new device.
        // See https://clerk.com/docs/guides/secure/client-trust
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === 'email_code',
        )

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          })
          setShowEmailCode(true)
        }
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }, [isLoaded, signIn, setActive, router, emailAddress, password])

  // Handle the submission of the email verification code
  const onVerifyPress = React.useCallback(async () => {
    if (!isLoaded) return

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              // Check for tasks and navigate to custom UI to help users resolve them
              // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
              console.log(session?.currentTask)
              return
            }

            router.replace('/')
          },
        })
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
    }
  }, [isLoaded, signIn, setActive, router, code])

  const onStartResetPress = React.useCallback(async () => {
    if (!isLoaded || !resetEmail.trim()) return

    try {
      setResetError(null)
      setResetMessage(null)
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail.trim(),
      })
      setResetStep('verify')
      setResetMessage('Code envoyé par email.')
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      setResetError('Impossible d’envoyer le code de réinitialisation.')
    }
  }, [isLoaded, signIn, resetEmail])

  const onSubmitResetPress = React.useCallback(async () => {
    if (!isLoaded) return
    if (!resetCode.trim() || !resetNewPassword.trim()) {
      setResetError('Renseigne le code et le nouveau mot de passe.')
      return
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Les mots de passe ne correspondent pas.')
      return
    }

    try {
      setResetError(null)
      setResetMessage(null)
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: resetNewPassword,
      })

      if (result.status === 'complete') {
        await setActive({
          session: result.createdSessionId,
          navigate: async () => router.replace('/'),
        })
      } else {
        setResetError('Code invalide ou tentative incomplète.')
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      setResetError('Code invalide ou mot de passe non conforme.')
    }
  }, [isLoaded, signIn, resetCode, resetNewPassword, resetConfirmPassword, setActive, router])

  // Display email code verification form
  if (showResetPassword) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>NutriTrack</Text>
          <Text style={styles.title}>Mot de passe oublié</Text>
        </View>

        {resetStep === 'request' ? (
          <>
            <Text style={styles.description}>Entre ton email pour recevoir le code de réinitialisation.</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={resetEmail}
              placeholder="Ton email"
              placeholderTextColor="#666666"
              onChangeText={(value) => setResetEmail(value)}
              keyboardType="email-address"
            />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                !resetEmail.trim() && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={onStartResetPress}
              disabled={!resetEmail.trim()}
            >
              <Text style={styles.buttonText}>Envoyer le code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.description}>Saisis le code reçu et ton nouveau mot de passe.</Text>
            <TextInput
              style={styles.input}
              value={resetCode}
              placeholder="Code de vérification"
              placeholderTextColor="#666666"
              onChangeText={(value) => setResetCode(value)}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={resetNewPassword}
              placeholder="Nouveau mot de passe"
              placeholderTextColor="#666666"
              onChangeText={(value) => setResetNewPassword(value)}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              value={resetConfirmPassword}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor="#666666"
              onChangeText={(value) => setResetConfirmPassword(value)}
              secureTextEntry
            />
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onSubmitResetPress}>
              <Text style={styles.buttonText}>Valider le nouveau mot de passe</Text>
            </Pressable>
          </>
        )}

        {!!resetMessage && <Text style={styles.successText}>{resetMessage}</Text>}
        {!!resetError && <Text style={styles.errorText}>{resetError}</Text>}

        <Pressable onPress={() => router.replace('/login')} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Retour à la connexion</Text>
        </Pressable>
      </View>
    )
  }

  if (showEmailCode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>NutriTrack</Text>
          <Text style={styles.title}>Vérifie ton email</Text>
        </View>
        <Text style={styles.description}>Un code de vérification a été envoyé à ton adresse email.</Text>
        <TextInput
          style={styles.input}
          value={code}
          placeholder="Code de vérification"
          placeholderTextColor="#666666"
          onChangeText={(code) => setCode(code)}
          keyboardType="numeric"
        />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onVerifyPress}
        >
          <Text style={styles.buttonText}>Valider</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>NutriTrack</Text>
        <Text style={styles.title}>Connexion</Text>
      </View>
      <Text style={styles.label}>Adresse email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Ton email"
        placeholderTextColor="#666666"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
        keyboardType="email-address"
      />
      <Text style={styles.label}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        value={password}
        placeholder="Ton mot de passe"
        placeholderTextColor="#666666"
        secureTextEntry={true}
        onChangeText={(password) => setPassword(password)}
      />
      <Pressable
        style={({ pressed }) => [
          styles.button,
          (!emailAddress || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={onSignInPress}
        disabled={!emailAddress || !password}
      >
        <Text style={styles.buttonText}>Se connecter</Text>
      </Pressable>
      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Pas encore de compte ? </Text>
        <Link href="/signup">
          <Text style={styles.linkAction}>Créer un compte</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF6',
    paddingHorizontal: 20,
    paddingTop: 64,
    gap: 12,
  },
  header: {
    backgroundColor: '#1E7A43',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
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
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    color: '#496153',
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1D3A29',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CDE2D5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1E7A43',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  linkContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: '#4F6758',
  },
  linkAction: {
    color: '#1E7A43',
    fontWeight: '700',
  },
  ghostButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ghostButtonText: {
    color: '#1E7A43',
    fontWeight: '700',
  },
  successText: {
    color: '#1E7A43',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#B3261E',
    fontWeight: '600',
    textAlign: 'center',
  },
})
