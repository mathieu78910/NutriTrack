import * as SQLite from 'expo-sqlite'

export type FoodRecord = {
  id: string
  mealId: string
  name: string
  brand: string | null
  imageUrl: string | null
  nutriscore: string | null
  calories: number
  proteins: number
  carbs: number
  fats: number
}

export type MealRecord = {
  id: string
  name: string
  date: string
  totalCalories: number
}

export type MealWithFoods = {
  id: string
  name: string
  date: string
  foods: FoodRecord[]
}

export type CreateMealInput = {
  id: string
  name: string
  date: string
  foods: Array<{
    id: string
    name: string
    brand?: string | null
    imageUrl?: string | null
    nutriscore?: string | null
    calories?: number
    proteins?: number
    carbs?: number
    fats?: number
  }>
}

const dbPromise = SQLite.openDatabaseAsync('nutritrack.db')
let initialized = false

async function getDb() {
  const db = await dbPromise
  if (!initialized) {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY NOT NULL,
        meal_id TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        image_url TEXT,
        nutriscore TEXT,
        calories REAL DEFAULT 0,
        proteins REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fats REAL DEFAULT 0,
        FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `)
    initialized = true
  }
  return db
}

export async function saveMeal(input: CreateMealInput) {
  const db = await getDb()
  await db.execAsync('BEGIN TRANSACTION;')
  try {
    await db.runAsync('INSERT OR REPLACE INTO meals (id, name, date) VALUES (?, ?, ?);', [
      input.id,
      input.name,
      input.date,
    ])

    await db.runAsync('DELETE FROM foods WHERE meal_id = ?;', [input.id])

    for (const food of input.foods) {
      await db.runAsync(
        `INSERT INTO foods
          (id, meal_id, name, brand, image_url, nutriscore, calories, proteins, carbs, fats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          food.id,
          input.id,
          food.name,
          food.brand ?? null,
          food.imageUrl ?? null,
          food.nutriscore ?? null,
          Number(food.calories ?? 0),
          Number(food.proteins ?? 0),
          Number(food.carbs ?? 0),
          Number(food.fats ?? 0),
        ]
      )
    }
    await db.execAsync('COMMIT;')
  } catch (error) {
    await db.execAsync('ROLLBACK;')
    throw error
  }
}

export async function getMeals(): Promise<MealRecord[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{
    id: string
    name: string
    date: string
    totalCalories: number
  }>(
    `SELECT m.id, m.name, m.date, COALESCE(SUM(f.calories), 0) AS totalCalories
     FROM meals m
     LEFT JOIN foods f ON f.meal_id = m.id
     GROUP BY m.id
     ORDER BY m.date DESC;`
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    totalCalories: Number(row.totalCalories || 0),
  }))
}

export async function getMealById(mealId: string): Promise<MealWithFoods | null> {
  const db = await getDb()
  const mealRow = await db.getFirstAsync<{ id: string; name: string; date: string }>(
    'SELECT id, name, date FROM meals WHERE id = ?;',
    [mealId]
  )
  if (!mealRow) return null

  const foods = await db.getAllAsync<{
    id: string
    meal_id: string
    name: string
    brand: string | null
    image_url: string | null
    nutriscore: string | null
    calories: number
    proteins: number
    carbs: number
    fats: number
  }>(
    `SELECT id, meal_id, name, brand, image_url, nutriscore, calories, proteins, carbs, fats
     FROM foods
     WHERE meal_id = ?
     ORDER BY name ASC;`,
    [mealId]
  )

  return {
    id: mealRow.id,
    name: mealRow.name,
    date: mealRow.date,
    foods: foods.map((food) => ({
      id: food.id,
      mealId: food.meal_id,
      name: food.name,
      brand: food.brand,
      imageUrl: food.image_url,
      nutriscore: food.nutriscore,
      calories: Number(food.calories || 0),
      proteins: Number(food.proteins || 0),
      carbs: Number(food.carbs || 0),
      fats: Number(food.fats || 0),
    })),
  }
}

export async function deleteMeal(mealId: string) {
  const db = await getDb()
  await db.runAsync('DELETE FROM meals WHERE id = ?;', [mealId])
}

export async function getDailyGoal(defaultValue = 2000): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['daily_goal'])
  if (!row) return defaultValue
  const parsed = Number(row.value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

export async function setDailyGoal(goal: number) {
  const db = await getDb()
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', ['daily_goal', String(goal)])
}
