import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'

type Product = {
  code?: string
  product_name?: string
  product_name_fr?: string
  product_name_en?: string
}

export default function CameraPage() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [hasScanned, setHasScanned] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)

  const fetchProductByBarcode = async (barcode: string) => {
    console.log('[Camera] Barcode scanne:', barcode)
    setIsFetching(true)
    setError(null)
    setProduct(null)
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      console.log('[Camera] Reponse OpenFoodFacts:', data)
      setProduct(data?.product ?? null)
    } catch {
      setError('Erreur pendant le scan du code-barres.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (hasScanned || isFetching) return
    setHasScanned(true)
   }

  console.log('[Camera] Permission:', permission?.granted)

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/(main)/add')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </Pressable>
          <Text style={styles.title}>Scanner un code-barres</Text>
        </View>
        <Text style={styles.message}>Autorise la caméra pour scanner un code-barres.</Text>
        <Pressable onPress={requestPermission} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/(main)/add')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Scanner un code-barres</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={handleBarcodeScanned}
        /> 
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.focusArea}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.overlayHint}>Place le code barres dans ce cadre</Text>
        </View>
      </View>

      {isFetching && <ActivityIndicator />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!isFetching && !error && !product && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyLogo}>NT</Text>
          <Text style={styles.emptyTitle}>Prêt à scanner</Text>
          <Text style={styles.message}>Centre un code-barres alimentaire dans le cadre de la caméra.</Text>
        </View>
      )}

      {!!product && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Produit trouvé</Text>
          <Text style={styles.resultText}>
            {product.product_name_fr || product.product_name || product.product_name_en || 'Produit sans nom'}
          </Text>
          {!!product.code && <Text style={styles.resultText}>Code: {product.code}</Text>}
        </View>
      )}

      <Pressable
        onPress={() => {
          setHasScanned(false)
          setError(null)
          setProduct(null)
        }}
        style={styles.actionButton}
      >
        <Text style={styles.actionButtonText}>Scanner à nouveau</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF6',
    paddingHorizontal: 16,
    paddingTop: 56,
    gap: 12,
  },
  header: {
    backgroundColor: '#1E7A43',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#165E34',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#E7F8EE',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraContainer: {
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    gap: 12,
  },
  focusArea: {
    width: 220,
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: 12,
    right: 12,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  overlayHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionButton: {
    backgroundColor: '#1E7A43',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  message: {
    color: '#264436',
    marginVertical: 10,
  },
  error: {
    color: '#B3261E',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  emptyLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: 'center',
    lineHeight: 42,
    backgroundColor: '#EAF7EF',
    color: '#1E7A43',
    fontWeight: '800',
  },
  emptyTitle: {
    color: '#145F33',
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 12,
    gap: 4,
  },
  resultTitle: {
    color: '#145F33',
    fontWeight: '800',
  },
  resultText: {
    color: '#183326',
  },
})
