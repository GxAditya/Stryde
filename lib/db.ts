import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'stryde.db';
const DATABASE_VERSION = 1;

// Type definitions
export interface CalibrationProfile {
  id: string;
  activity_type: 'walking' | 'running' | 'hiking';
  step_length_m: number;
  confidence: number;
  created_at: number;
  updated_at: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
}

export interface Activity {
  id: string;
  profile_id: string;
  steps: number;
  distance_m: number;
  duration_ms: number;
  route_points: RoutePoint[];
  elevation_gain_m: number;
  started_at: number;
  ended_at: number | null;
}

export interface Goal {
  id: string;
  type: 'daily_steps' | 'weekly_steps' | 'daily_distance';
  target: number;
  current: number;
  date: string;
}

export interface HydrationLog {
  id: string;
  amount_ml: number;
  timestamp: number;
}

// Database instance
let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Initialize database
export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return Promise.resolve(db);
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // Enable foreign keys
      await database.execAsync('PRAGMA foreign_keys = ON;');

      // Check and create/update schema
      await migrateDatabase(database);

      db = database;
      return db;
    } catch (error) {
      initPromise = null; // Reset promise on failure so we can retry
      throw error;
    }
  })();

  return initPromise;
}

// Get database instance (must call initDatabase first)
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Migration system
async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  // Get current version
  const versionResult = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1;'
  );

  const currentVersion = versionResult?.version ?? 0;

  if (currentVersion < 1) {
    await runMigrationV1(database);
    await database.runAsync(
      'INSERT OR REPLACE INTO schema_version (version) VALUES (?);',
      [1]
    );
  }
}

// Migration V1: Initial schema
async function runMigrationV1(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    -- Calibration Profiles Table
    CREATE TABLE IF NOT EXISTS calibration_profiles (
      id TEXT PRIMARY KEY NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('walking', 'running', 'hiking')),
      step_length_m REAL NOT NULL,
      confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Activities Table
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      steps INTEGER NOT NULL DEFAULT 0,
      distance_m REAL NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      route_points TEXT NOT NULL DEFAULT '[]',
      elevation_gain_m REAL NOT NULL DEFAULT 0,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      FOREIGN KEY (profile_id) REFERENCES calibration_profiles(id) ON DELETE CASCADE
    );

    -- Goals Table
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('daily_steps', 'weekly_steps', 'daily_distance')),
      target REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL
    );

    -- Hydration Logs Table
    CREATE TABLE IF NOT EXISTS hydration_logs (
      id TEXT PRIMARY KEY NOT NULL,
      amount_ml INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_activities_profile_id ON activities(profile_id);
    CREATE INDEX IF NOT EXISTS idx_activities_started_at ON activities(started_at);
    CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(date);
    CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
    CREATE INDEX IF NOT EXISTS idx_hydration_timestamp ON hydration_logs(timestamp);
  `);
}

// ==================== Calibration Profile CRUD ====================

export async function createCalibrationProfile(
  profile: Omit<CalibrationProfile, 'created_at' | 'updated_at'>
): Promise<CalibrationProfile> {
  const database = getDatabase();
  const now = Date.now();

  const fullProfile: CalibrationProfile = {
    ...profile,
    created_at: now,
    updated_at: now,
  };

  await database.runAsync(
    `INSERT INTO calibration_profiles (id, activity_type, step_length_m, confidence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      fullProfile.id,
      fullProfile.activity_type,
      fullProfile.step_length_m,
      fullProfile.confidence,
      fullProfile.created_at,
      fullProfile.updated_at,
    ]
  );

  return fullProfile;
}

export async function updateCalibrationProfile(
  id: string,
  updates: Partial<Omit<CalibrationProfile, 'id' | 'created_at'>>
): Promise<void> {
  const database = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.activity_type !== undefined) {
    fields.push('activity_type = ?');
    values.push(updates.activity_type);
  }
  if (updates.step_length_m !== undefined) {
    fields.push('step_length_m = ?');
    values.push(updates.step_length_m);
  }
  if (updates.confidence !== undefined) {
    fields.push('confidence = ?');
    values.push(updates.confidence);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await database.runAsync(
    `UPDATE calibration_profiles SET ${fields.join(', ')} WHERE id = ?;`,
    values
  );
}

export async function deleteCalibrationProfile(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM calibration_profiles WHERE id = ?;', [id]);
}

export async function getCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const database = getDatabase();
  return await database.getAllAsync<CalibrationProfile>(
    'SELECT * FROM calibration_profiles ORDER BY updated_at DESC;'
  );
}

export async function getCalibrationProfileById(
  id: string
): Promise<CalibrationProfile | null> {
  const database = getDatabase();
  return await database.getFirstAsync<CalibrationProfile>(
    'SELECT * FROM calibration_profiles WHERE id = ?;',
    [id]
  );
}

export async function getCalibrationProfilesByActivityType(
  activityType: CalibrationProfile['activity_type']
): Promise<CalibrationProfile[]> {
  const database = getDatabase();
  return await database.getAllAsync<CalibrationProfile>(
    'SELECT * FROM calibration_profiles WHERE activity_type = ? ORDER BY confidence DESC, updated_at DESC;',
    [activityType]
  );
}

// ==================== Activity CRUD ====================

export async function createActivity(
  activity: Omit<Activity, 'ended_at'>
): Promise<Activity> {
  const database = getDatabase();

  const fullActivity: Activity = {
    ...activity,
    ended_at: null,
  };

  await database.runAsync(
    `INSERT INTO activities (id, profile_id, steps, distance_m, duration_ms, route_points, elevation_gain_m, started_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      fullActivity.id,
      fullActivity.profile_id,
      fullActivity.steps,
      fullActivity.distance_m,
      fullActivity.duration_ms,
      JSON.stringify(fullActivity.route_points),
      fullActivity.elevation_gain_m,
      fullActivity.started_at,
      fullActivity.ended_at,
    ]
  );

  return fullActivity;
}

export async function updateActivity(
  id: string,
  updates: Partial<Omit<Activity, 'id'>>
): Promise<void> {
  const database = getDatabase();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.profile_id !== undefined) {
    fields.push('profile_id = ?');
    values.push(updates.profile_id);
  }
  if (updates.steps !== undefined) {
    fields.push('steps = ?');
    values.push(updates.steps);
  }
  if (updates.distance_m !== undefined) {
    fields.push('distance_m = ?');
    values.push(updates.distance_m);
  }
  if (updates.duration_ms !== undefined) {
    fields.push('duration_ms = ?');
    values.push(updates.duration_ms);
  }
  if (updates.route_points !== undefined) {
    fields.push('route_points = ?');
    values.push(JSON.stringify(updates.route_points));
  }
  if (updates.elevation_gain_m !== undefined) {
    fields.push('elevation_gain_m = ?');
    values.push(updates.elevation_gain_m);
  }
  if (updates.started_at !== undefined) {
    fields.push('started_at = ?');
    values.push(updates.started_at);
  }
  if (updates.ended_at !== undefined) {
    fields.push('ended_at = ?');
    values.push(updates.ended_at);
  }

  values.push(id);

  await database.runAsync(
    `UPDATE activities SET ${fields.join(', ')} WHERE id = ?;`,
    values
  );
}

export async function endActivity(
  id: string,
  endedAt: number
): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'UPDATE activities SET ended_at = ? WHERE id = ?;',
    [endedAt, id]
  );
}

export async function deleteActivity(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM activities WHERE id = ?;', [id]);
}

export async function getActivities(
  limit?: number,
  offset?: number
): Promise<Activity[]> {
  const database = getDatabase();

  if (limit !== undefined) {
    const rows = await database.getAllAsync<{
      id: string;
      profile_id: string;
      steps: number;
      distance_m: number;
      duration_ms: number;
      route_points: string;
      elevation_gain_m: number;
      started_at: number;
      ended_at: number | null;
    }>(
      'SELECT * FROM activities ORDER BY started_at DESC LIMIT ? OFFSET ?;',
      [limit, offset ?? 0]
    );

    return rows.map(row => ({
      ...row,
      route_points: JSON.parse(row.route_points) as RoutePoint[],
    }));
  }

  const rows = await database.getAllAsync<{
    id: string;
    profile_id: string;
    steps: number;
    distance_m: number;
    duration_ms: number;
    route_points: string;
    elevation_gain_m: number;
    started_at: number;
    ended_at: number | null;
  }>('SELECT * FROM activities ORDER BY started_at DESC;');

  return rows.map(row => ({
    ...row,
    route_points: JSON.parse(row.route_points) as RoutePoint[],
  }));
}

export async function getActivityById(id: string): Promise<Activity | null> {
  const database = getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    profile_id: string;
    steps: number;
    distance_m: number;
    duration_ms: number;
    route_points: string;
    elevation_gain_m: number;
    started_at: number;
    ended_at: number | null;
  }>('SELECT * FROM activities WHERE id = ?;', [id]);

  if (!row) return null;

  return {
    ...row,
    route_points: JSON.parse(row.route_points) as RoutePoint[],
  };
}

export async function getActivitiesByDateRange(
  startDate: number,
  endDate: number
): Promise<Activity[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    profile_id: string;
    steps: number;
    distance_m: number;
    duration_ms: number;
    route_points: string;
    elevation_gain_m: number;
    started_at: number;
    ended_at: number | null;
  }>(
    'SELECT * FROM activities WHERE started_at >= ? AND started_at <= ? ORDER BY started_at DESC;',
    [startDate, endDate]
  );

  return rows.map(row => ({
    ...row,
    route_points: JSON.parse(row.route_points) as RoutePoint[],
  }));
}

export async function getActiveActivity(): Promise<Activity | null> {
  const database = getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    profile_id: string;
    steps: number;
    distance_m: number;
    duration_ms: number;
    route_points: string;
    elevation_gain_m: number;
    started_at: number;
    ended_at: number | null;
  }>('SELECT * FROM activities WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1;');

  if (!row) return null;

  return {
    ...row,
    route_points: JSON.parse(row.route_points) as RoutePoint[],
  };
}

// ==================== Goal CRUD ====================

export async function createGoal(
  goal: Omit<Goal, 'current'>
): Promise<Goal> {
  const database = getDatabase();

  const fullGoal: Goal = {
    ...goal,
    current: 0,
  };

  await database.runAsync(
    `INSERT INTO goals (id, type, target, current, date)
     VALUES (?, ?, ?, ?, ?);`,
    [fullGoal.id, fullGoal.type, fullGoal.target, fullGoal.current, fullGoal.date]
  );

  return fullGoal;
}

export async function updateGoal(
  id: string,
  updates: Partial<Omit<Goal, 'id'>>
): Promise<void> {
  const database = getDatabase();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.target !== undefined) {
    fields.push('target = ?');
    values.push(updates.target);
  }
  if (updates.current !== undefined) {
    fields.push('current = ?');
    values.push(updates.current);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }

  values.push(id);

  await database.runAsync(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ?;`,
    values
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM goals WHERE id = ?;', [id]);
}

export async function getGoals(): Promise<Goal[]> {
  const database = getDatabase();
  return await database.getAllAsync<Goal>('SELECT * FROM goals ORDER BY date DESC;');
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const database = getDatabase();
  return await database.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?;', [id]);
}

export async function getGoalsForDate(date: string): Promise<Goal[]> {
  const database = getDatabase();
  return await database.getAllAsync<Goal>(
    'SELECT * FROM goals WHERE date = ?;',
    [date]
  );
}

export async function getGoalsByType(type: Goal['type']): Promise<Goal[]> {
  const database = getDatabase();
  return await database.getAllAsync<Goal>(
    'SELECT * FROM goals WHERE type = ? ORDER BY date DESC;',
    [type]
  );
}

// ==================== Hydration Log CRUD ====================

export async function createHydrationLog(
  log: HydrationLog
): Promise<HydrationLog> {
  const database = getDatabase();

  await database.runAsync(
    `INSERT INTO hydration_logs (id, amount_ml, timestamp)
     VALUES (?, ?, ?);`,
    [log.id, log.amount_ml, log.timestamp]
  );

  return log;
}

export async function deleteHydrationLog(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM hydration_logs WHERE id = ?;', [id]);
}

export async function getHydrationLogs(
  limit?: number,
  offset?: number
): Promise<HydrationLog[]> {
  const database = getDatabase();

  if (limit !== undefined) {
    return await database.getAllAsync<HydrationLog>(
      'SELECT * FROM hydration_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?;',
      [limit, offset ?? 0]
    );
  }

  return await database.getAllAsync<HydrationLog>(
    'SELECT * FROM hydration_logs ORDER BY timestamp DESC;'
  );
}

export async function getHydrationLogsByDateRange(
  startTimestamp: number,
  endTimestamp: number
): Promise<HydrationLog[]> {
  const database = getDatabase();
  return await database.getAllAsync<HydrationLog>(
    'SELECT * FROM hydration_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC;',
    [startTimestamp, endTimestamp]
  );
}

export async function getHydrationLogsForDay(date: Date): Promise<HydrationLog[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return getHydrationLogsByDateRange(startOfDay.getTime(), endOfDay.getTime());
}

export async function getTodayHydrationTotal(): Promise<number> {
  const today = new Date();
  const logs = await getHydrationLogsForDay(today);
  return logs.reduce((sum, log) => sum + log.amount_ml, 0);
}

// ==================== Utility Functions ====================

export async function resetDatabase(): Promise<void> {
  const database = getDatabase();

  await database.execAsync(`
    DROP TABLE IF EXISTS calibration_profiles;
    DROP TABLE IF EXISTS activities;
    DROP TABLE IF EXISTS goals;
    DROP TABLE IF EXISTS hydration_logs;
    DROP TABLE IF EXISTS schema_version;
  `);

  db = null;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
