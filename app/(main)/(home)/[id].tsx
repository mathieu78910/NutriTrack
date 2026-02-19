import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { deleteMeal, getMealById, type MealWithFoods } from '@/lib/db'

export default function MealDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string | string[] }>()
  const mealId = Array.isArray(params.id) ? params.id[0] : params.id

  const [meal, setMeal] = useState<MealWithFoods | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getNutriScoreTheme = (grade?: string | null) => {
    const g = (grade || '').toUpperCase()
    if (g === 'A') return { bg: '#1E7A43', border: '#145F33' }
    if (g === 'B') return { bg: '#7FBF45', border: '#699C38' }
    if (g === 'C') return { bg: '#F7B500', border: '#D49900' }
    if (g === 'D') return { bg: '#F28E2B', border: '#CF771E' }
    if (g === 'E') return { bg: '#D64545', border: '#B63636' }
    return { bg: '#94A69C', border: '#7A8C82' }
  }

  const loadMeal = useCallback(async () => {
    if (!mealId) {
      setError('Repas introuvable')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const found = await getMealById(mealId)
      if (!found) {
        setError('Repas introuvable')
        setMeal(null)
      } else {
        setMeal(found)
      }
    } catch {
      setError('Erreur lors du chargement du repas')
    } finally {
      setLoading(false)
    }
  }, [mealId])

  useFocusEffect(
    useCallback(() => {
      loadMeal()
    }, [loadMeal])
  )

  const totals = useMemo(() => {
    if (!meal) return { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    return meal.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + food.calories,
        proteins: acc.proteins + food.proteins,
        carbs: acc.carbs + food.carbs,
        fats: acc.fats + food.fats,
      }),
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    )
  }, [meal])

  const handleDeleteMeal = async () => {
    if (!meal) return
    try {
      await deleteMeal(meal.id)
      router.back()
    } catch {
      setError('Impossible de supprimer ce repas.')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!meal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{error || 'Repas introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Pressable onPress={() => router.back()} style={styles.inlineBackButton}>
            <Text style={styles.inlineBackText}>← Retour</Text>
          </Pressable>
          <Text style={styles.title}>{meal.name}</Text>
          <Text style={styles.date}>
            {new Date(meal.date).toLocaleDateString('fr-FR')} • {new Date(meal.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.countText}>{meal.foods.length} aliment(s)</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.totalCard}>
          <Text style={styles.sectionTitle}>Total nutritionnel</Text>
          <View style={styles.totalGrid}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Calories</Text>
              <Text style={styles.totalValue}>{Math.round(totals.calories)} kcal</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Protéines</Text>
              <Text style={styles.totalValue}>{Math.round(totals.proteins)} g</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Glucides</Text>
              <Text style={styles.totalValue}>{Math.round(totals.carbs)} g</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Lipides</Text>
              <Text style={styles.totalValue}>{Math.round(totals.fats)} g</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aliments</Text>
          {meal.foods.map((food) => {
            const theme = getNutriScoreTheme(food.nutriscore)
            return (
              <View key={food.id} style={styles.foodCard}>
                <View style={styles.foodTopRow}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    {!!food.brand && <Text style={styles.meta}>Marque: {food.brand}</Text>}
                  </View>
                  {!!food.imageUrl && <Image source={{ uri: food.imageUrl }} style={styles.foodImage} />}
                </View>

                <View style={styles.badgesRow}>
                  <View style={styles.kcalBadge}>
                    <Text style={styles.kcalBadgeText}>{Math.round(food.calories)} kcal</Text>
                  </View>
                  <View style={[styles.nutriBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={styles.nutriBadgeText}>Nutri-Score {(food.nutriscore || '?').toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.macrosRow}>
                  <Text style={styles.macroText}>Protéines: {Math.round(food.proteins)} g</Text>
                  <Text style={styles.macroText}>Glucides: {Math.round(food.carbs)} g</Text>
                  <Text style={styles.macroText}>Lipides: {Math.round(food.fats)} g</Text>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <Pressable onPress={handleDeleteMeal} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>Supprimer le repas</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAF6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4FAF6',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  content: {
    paddingBottom: 20,
    gap: 12,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDECE3',
    padding: 14,
    gap: 6,
  },
  inlineBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF7EF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineBackText: {
    color: '#145F33',
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2A1A',
  },
  date: {
    color: '#5A6E61',
    fontSize: 13,
  },
  countText: {
    color: '#1E7A43',
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: '#B3261E',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#145F33',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D2ECDD',
  },
  totalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalItem: {
    width: '48%',
    backgroundColor: '#EAF7EF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D2ECDD',
  },
  totalLabel: {
    color: '#4C6556',
    fontSize: 12,
    fontWeight: '600',
  },
  totalValue: {
    color: '#113723',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 12,
    gap: 8,
  },
  foodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  foodInfo: {
    flex: 1,
    gap: 2,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2A1A',
  },
  meta: {
    color: '#3E5648',
    fontSize: 13,
  },
  foodImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  badgesRow: {
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
  macrosRow: {
    gap: 2,
  },
  macroText: {
    color: '#375244',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#B3261E',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 18,
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backButton: {
    marginTop: 8,
    backgroundColor: '#1E7A43',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
})
