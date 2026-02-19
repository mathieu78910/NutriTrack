import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { getDailyGoal, getMeals, setDailyGoal, type MealRecord } from '@/lib/db'

export default function HomePage() {
  const router = useRouter()
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [dailyGoal, setDailyGoalState] = useState(2000)
  const [goalInput, setGoalInput] = useState('2000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [mealsData, goal] = await Promise.all([getMeals(), getDailyGoal(2000)])
      setMeals(mealsData)
      setDailyGoalState(goal)
      setGoalInput(String(goal))
    } catch {
      setError('Impossible de charger les repas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const sortedMeals = useMemo(
    () => [...meals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [meals]
  )
  const mealSections = useMemo(() => {
    const groups = new Map<string, MealRecord[]>()

    for (const meal of sortedMeals) {
      const date = new Date(meal.date)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const existing = groups.get(key)
      if (existing) existing.push(meal)
      else groups.set(key, [meal])
    }

    return Array.from(groups.entries()).map(([key, data]) => {
      const [year, month, day] = key.split('-').map(Number)
      const sectionDate = new Date(year, month, day)
      return {
        key,
        title: sectionDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        data,
      }
    })
  }, [sortedMeals])

  const consumedToday = useMemo(() => {
    const today = new Date()
    return meals.reduce((sum, meal) => {
      const date = new Date(meal.date)
      const isSameDay =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      return isSameDay ? sum + meal.totalCalories : sum
    }, 0)
  }, [meals])

  const progress = dailyGoal > 0 ? Math.min(consumedToday / dailyGoal, 1) : 0

  const handleSaveGoal = async () => {
    const parsed = Number(goalInput.trim())
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Objectif calorique invalide.')
      return
    }

    try {
      setError(null)
      await setDailyGoal(parsed)
      setDailyGoalState(parsed)
    } catch {
      setError('Impossible de sauvegarder l’objectif.')
    }
  }

  const handleAddMeal = () => {
    router.push('/(main)/add')
  }

  const handleOpenMeal = (meal: MealRecord) => {
    router.push(`/(main)/(home)/${meal.id}`)
  }

  const renderMealItem = ({ item }: { item: MealRecord }) => (
    <Pressable onPress={() => handleOpenMeal(item)} style={styles.mealCard}>
      <Text style={styles.mealName}>{item.name}</Text>
      <Text style={styles.mealDate}>
        {new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <Text style={styles.mealCalories}>{Math.round(item.totalCalories)} kcal</Text>
    </Pressable>
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NutriTrack</Text>
          <Text style={styles.title}>Mes repas</Text>
        </View>
        <Pressable onPress={handleAddMeal} style={styles.addButton}>
          <Text style={styles.addButtonText}>Ajouter un repas</Text>
        </Pressable>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>Objectif calorique journalier</Text>
        <View style={styles.goalRow}>
          <TextInput
            value={goalInput}
            onChangeText={setGoalInput}
            keyboardType="number-pad"
            placeholder="2000"
            style={styles.goalInput}
          />
          <Pressable onPress={handleSaveGoal} style={styles.goalButton}>
            <Text style={styles.goalButtonText}>Enregistrer</Text>
          </Pressable>
        </View>
        <Text style={styles.goalMeta}>
          Aujourd’hui: {Math.round(consumedToday)} / {Math.round(dailyGoal)} kcal
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {!error && sortedMeals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyLogo}>NT</Text>
          <Text style={styles.emptyTitle}>Aucun repas enregistré</Text>
          <Text style={styles.emptyText}>Ajoute ton premier repas pour commencer ton suivi nutritionnel.</Text>
        </View>
      ) : (
        <SectionList
          sections={mealSections}
          keyExtractor={(meal) => meal.id}
          renderItem={renderMealItem}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1E7A43',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brand: {
    color: '#BFF4D1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#1E7A43',
    fontSize: 12,
    fontWeight: '700',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  goalTitle: {
    color: '#113723',
    fontWeight: '700',
    fontSize: 14,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CDE2D5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#0F2A1A',
  },
  goalButton: {
    backgroundColor: '#1E7A43',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  goalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  goalMeta: {
    color: '#3E5648',
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#DCEAE1',
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#1E7A43',
  },
  errorText: {
    color: '#B3261E',
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    color: '#1E7A43',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginBottom: 8,
    marginTop: 2,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E3EEE8',
  },
  mealName: {
    color: '#0F2A1A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  mealDate: {
    color: '#5A6E61',
    fontSize: 13,
    marginBottom: 2,
  },
  mealCalories: {
    color: '#1E7A43',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: '#5A6E61',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EEE8',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    textAlign: 'center',
    lineHeight: 52,
    backgroundColor: '#EAF7EF',
    color: '#1E7A43',
    fontWeight: '800',
    fontSize: 18,
  },
  emptyTitle: {
    color: '#113723',
    fontSize: 16,
    fontWeight: '700',
  },
})
