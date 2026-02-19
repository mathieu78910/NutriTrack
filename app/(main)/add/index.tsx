import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { getMealById, getMeals, saveMeal } from '@/lib/db'

type OpenFoodProduct = {
  code?: string
  product_name?: string
  product_name_fr?: string
  product_name_en?: string
  brands?: string
  image_url?: string
  nutriscore_grade?: string
  nutriments?: {
    ['energy-kcal_100g']?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

type MealType = 'Petit-dejeuner' | 'Dejeuner' | 'Diner' | 'Snack'

type MealFood = {
  id: string
  matchKey: string
  name: string
  brand: string | null
  imageUrl: string | null
  nutriscore: string | null
  calories: number
  proteins: number
  carbs: number
  fats: number
}

export default function AddMealPage() {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<OpenFoodProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [selectedFoods, setSelectedFoods] = useState<MealFood[]>([])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const requestIdRef = useRef(0)
  const mealTypeOptions: MealType[] = ['Petit-dejeuner', 'Dejeuner', 'Diner', 'Snack']
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const rawQuery = query.trim()
  const isDebouncing = rawQuery.length >= 2 && rawQuery !== debouncedQuery
  const shouldShowNoResults = !loading && !isDebouncing && !error && debouncedQuery.length >= 2 && results.length === 0

  const getNutriScoreTheme = (grade?: string) => {
    const g = (grade || '').toUpperCase()
    if (g === 'A') return { bg: '#1E7A43', border: '#145F33' }
    if (g === 'B') return { bg: '#7FBF45', border: '#699C38' }
    if (g === 'C') return { bg: '#F7B500', border: '#D49900' }
    if (g === 'D') return { bg: '#F28E2B', border: '#CF771E' }
    if (g === 'E') return { bg: '#D64545', border: '#B63636' }
    return { bg: '#94A69C', border: '#7A8C82' }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      requestIdRef.current += 1
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const requestId = ++requestIdRef.current

    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('[Search] Recherche:', debouncedQuery)

        const url =
          `https://fr.openfoodfacts.org/cgi/search.pl` +
          `?search_terms=${encodeURIComponent(debouncedQuery)}` +
          `&search_simple=1` +
          `&action=process` +
          `&json=1` +
          `&fields=code,product_name,product_name_fr,product_name_en,brands,nutriments,image_url,nutriscore_grade` +
          `&page_size=10`

        const response = await fetch(url, { signal: controller.signal })

        if (!response.ok) {
          throw new Error('Request failed')
        }

        const data = await response.json()
        const products = Array.isArray(data?.products) ? data.products : []
        console.log('[Search] Resultats bruts:', products.length)
        const normalizedQuery = normalize(debouncedQuery)
        const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)

        
        const filteredProducts = products.filter((item: OpenFoodProduct) => {
          const haystack = normalize(
            `${item.product_name_fr || ''} ${item.product_name || ''} ${item.product_name_en || ''} ${item.brands || ''}`
          )
          return queryTokens.every((token) => haystack.includes(token))
        })

        console.log('[Search] Resultats filtres:', filteredProducts.length)
        if (requestIdRef.current === requestId) {
          setResults(filteredProducts)
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          if (requestIdRef.current === requestId) {
            setError('Erreur pendant la recherche.')
          }
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => controller.abort()
  }, [debouncedQuery])

  const totalCalories = useMemo(
    () => selectedFoods.reduce((sum, food) => sum + food.calories, 0),
    [selectedFoods]
  )

  const getProductName = (item: OpenFoodProduct) =>
    item.product_name_fr || item.product_name || item.product_name_en || 'Produit sans nom'

  const getDayKey = (isoDate: string) => {
    const date = new Date(isoDate)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const addFoodToMeal = (item: OpenFoodProduct) => {
    const id = `${Date.now()}-${Math.random()}`
    const matchKey = item.code || getProductName(item).toLowerCase()
    const name = getProductName(item)
    const brand = item.brands || null
    const imageUrl = item.image_url || null
    const nutriscore = item.nutriscore_grade || null
    const calories = Number(item.nutriments?.['energy-kcal_100g'] || 0)
    const proteins = Number(item.nutriments?.proteins_100g || 0)
    const carbs = Number(item.nutriments?.carbohydrates_100g || 0)
    const fats = Number(item.nutriments?.fat_100g || 0)

    setSelectedFoods((prev) => {
      if (prev.some((food) => food.matchKey === matchKey)) {
        return prev
      }
      return [...prev, { id, matchKey, name, brand, imageUrl, nutriscore, calories, proteins, carbs, fats }]
    })
    setSaveMessage(null)
  }

  const removeFood = (foodId: string) => {
    setSelectedFoods((prev) => prev.filter((food) => food.id !== foodId))
  }

  const handleScanBarcode = () => {
    router.push('/(main)/add/camera')
  }

  const handleBackHome = () => {
    router.push('/(main)/(home)')
  }

  const handleValidateMeal = async () => {
    if (!mealType) {
      setSaveMessage('Choisis un type de repas.')
      return
    }
    if (selectedFoods.length === 0) {
      setSaveMessage('Ajoute au moins un aliment.')
      return
    }

    try {
      const nowIso = new Date().toISOString()
      const todayKey = getDayKey(nowIso)
      const meals = await getMeals()
      const existingMeal = meals.find((meal) => meal.name === mealType && getDayKey(meal.date) === todayKey)

      const existingFoods =
        existingMeal ? (await getMealById(existingMeal.id))?.foods.map((food) => ({
          id: food.id,
          name: food.name,
          brand: food.brand,
          imageUrl: food.imageUrl,
          nutriscore: food.nutriscore,
          calories: food.calories,
          proteins: food.proteins,
          carbs: food.carbs,
          fats: food.fats,
        })) || [] : []

      const mergedFoods = [...existingFoods]
      const existingKeys = new Set(
        existingFoods.map((food) => `${(food.name || '').toLowerCase()}|${(food.brand || '').toLowerCase()}`)
      )

      for (const food of selectedFoods) {
        const key = `${food.name.toLowerCase()}|${(food.brand || '').toLowerCase()}`
        if (existingKeys.has(key)) continue
        existingKeys.add(key)
        mergedFoods.push({
          id: food.id,
          name: food.name,
          brand: food.brand,
          imageUrl: food.imageUrl,
          nutriscore: food.nutriscore,
          calories: food.calories,
          proteins: food.proteins,
          carbs: food.carbs,
          fats: food.fats,
        })
      }

      await saveMeal({
        id: existingMeal?.id || `${Date.now()}`,
        name: mealType,
        date: existingMeal?.date || nowIso,
        foods: mergedFoods,
      })
      setSaveMessage('Repas enregistre.')
      setMealType(null)
      setSelectedFoods([])
      setQuery('')
      setDebouncedQuery('')
      setResults([])
      router.push('/(main)/(home)')
    } catch {
      setSaveMessage('Impossible d’enregistrer le repas.')
    }
  }

  const renderProduct = ({ item }: { item: OpenFoodProduct }) => {
    const productName = getProductName(item)
    const calories = Number(item.nutriments?.['energy-kcal_100g'] || 0)
    const nutriScore = (item.nutriscore_grade || '?').toUpperCase()
    const theme = getNutriScoreTheme(item.nutriscore_grade)

    return (
      <Pressable onPress={() => addFoodToMeal(item)} style={styles.resultCard}>
        <View style={styles.resultTopRow}>
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{productName}</Text>
            {!!item.brands && <Text style={styles.resultMeta}>{item.brands}</Text>}
          </View>
          {!!item.image_url && <Image source={{ uri: item.image_url }} style={styles.resultImage} />}
        </View>
        <View style={styles.resultBadgesRow}>
          <View style={styles.kcalBadge}>
            <Text style={styles.kcalBadgeText}>{Math.round(calories)} kcal/100g</Text>
          </View>
          <View style={[styles.nutriBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={styles.nutriBadgeText}>Nutri-Score {nutriScore}</Text>
          </View>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBackHome} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Accueil</Text>
        </Pressable>
        <Text style={styles.headerBrand}>NutriTrack</Text>
        <Text style={styles.headerTitle}>Ajouter un repas</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type de repas</Text>
        <View style={styles.typeRow}>
          {mealTypeOptions.map((type) => (
            <Pressable
              key={type}
              onPress={() => setMealType(type)}
              style={[styles.typeChip, mealType === type && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, mealType === type && styles.typeChipTextActive]}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un produit"
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#7B8F84"
        style={styles.searchInput}
      />

      {isDebouncing && !loading && <Text style={styles.searchHint}>Recherche en cours...</Text>}
      {loading && <ActivityIndicator />}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {shouldShowNoResults && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyLogo}>NT</Text>
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>Essaye un autre mot-clé ou utilise le scan code-barres.</Text>
        </View>
      )}

      <Pressable onPress={handleScanBarcode} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Scanner un code-barres</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aliments ajoutes ({selectedFoods.length})</Text>
        {selectedFoods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyLogo}>NT</Text>
            <Text style={styles.emptyTitle}>Aucun aliment ajouté</Text>
            <Text style={styles.emptyText}>Touchez un produit ou scanne un code-barres pour l’ajouter.</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreBadge, { backgroundColor: '#1E7A43' }]}>A</Text>
              <Text style={[styles.scoreBadge, { backgroundColor: '#7FBF45' }]}>B</Text>
              <Text style={[styles.scoreBadge, { backgroundColor: '#F7B500' }]}>C</Text>
              <Text style={[styles.scoreBadge, { backgroundColor: '#F28E2B' }]}>D</Text>
              <Text style={[styles.scoreBadge, { backgroundColor: '#D64545' }]}>E</Text>
            </View>
          </View>
        ) : (
          selectedFoods.map((food) => {
            const theme = getNutriScoreTheme(food.nutriscore || undefined)
            return (
              <View key={food.id} style={styles.selectedFoodCard}>
                <View style={styles.selectedFoodLeft}>
                  {!!food.imageUrl ? (
                    <Image source={{ uri: food.imageUrl }} style={styles.selectedFoodImage} />
                  ) : (
                    <View style={styles.selectedImageFallback}>
                      <Text style={styles.selectedImageFallbackText}>NT</Text>
                    </View>
                  )}
                  <View style={styles.selectedFoodBadges}>
                    <View style={styles.kcalBadge}>
                      <Text style={styles.kcalBadgeText}>{Math.round(food.calories)} kcal/100g</Text>
                    </View>
                    <View style={[styles.nutriBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <Text style={styles.nutriBadgeText}>Nutri-Score {(food.nutriscore || '?').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <Pressable onPress={() => removeFood(food.id)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Supprimer</Text>
                </Pressable>
              </View>
            )
          })
        )}
      </View>

      <Text style={styles.totalText}>Total: {totalCalories} kcal</Text>

      <Pressable onPress={handleValidateMeal} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Valider</Text>
      </Pressable>

      {!!saveMessage && <Text style={styles.infoText}>{saveMessage}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item, index) => item.code || `${index}`}
        renderItem={renderProduct}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF6',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  header: {
    backgroundColor: '#1E7A43',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#165E34',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#E7F8EE',
    fontSize: 12,
    fontWeight: '700',
  },
  headerBrand: {
    color: '#BFF4D1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  section: {
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#123423',
    fontSize: 14,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CDE2D5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#1E7A43',
    backgroundColor: '#EAF7EF',
  },
  typeChipText: {
    color: '#2F4A3A',
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#145F33',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CDE2D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#183326',
    marginBottom: 10,
  },
  searchHint: {
    color: '#4C6556',
    fontSize: 12,
    marginBottom: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#CDE2D5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#1E7A43',
    fontWeight: '700',
  },
  selectedFoodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  selectedFoodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedFoodImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  selectedImageFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedImageFallbackText: {
    color: '#1E7A43',
    fontWeight: '800',
  },
  selectedFoodBadges: {
    gap: 6,
  },
  removeButton: {
    backgroundColor: '#B3261E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  totalText: {
    color: '#145F33',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#1E7A43',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoText: {
    color: '#1E7A43',
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: '#B3261E',
    marginBottom: 8,
  },
  emptyText: {
    color: '#5A6E61',
    textAlign: 'center',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  emptyLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    lineHeight: 44,
    backgroundColor: '#EAF7EF',
    color: '#1E7A43',
    fontWeight: '800',
  },
  emptyTitle: {
    color: '#113723',
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scoreBadge: {
    color: '#FFFFFF',
    fontWeight: '800',
    width: 22,
    height: 22,
    borderRadius: 4,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    marginBottom: 8,
    gap: 4,
  },
  resultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultBadgesRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kcalBadge: {
    backgroundColor: '#EAF7EF',
    borderWidth: 1,
    borderColor: '#C7E9D3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kcalBadgeText: {
    color: '#145F33',
    fontSize: 12,
    fontWeight: '700',
  },
  nutriBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nutriBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  resultName: {
    color: '#0F2A1A',
    fontWeight: '700',
  },
  resultMeta: {
    color: '#556B5D',
    fontSize: 13,
  },
  resultImage: {
    width: 62,
    height: 62,
    borderRadius: 6,
  },
  resultsContent: {
    paddingBottom: 24,
  },
})
