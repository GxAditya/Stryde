import { create } from 'zustand';
import {
  HydrationLog,
  createHydrationLog,
  deleteHydrationLog,
  getHydrationLogs,
  getHydrationLogsByDateRange,
  getHydrationLogsForDay,
  getTodayHydrationTotal,
  initDatabase,
} from '@/lib/db';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get start of day timestamp
function getStartOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Get end of day timestamp
function getEndOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Get start of week (Sunday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get end of week (Saturday)
function getWeekEnd(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
}

interface HydrationState {
  // State
  logs: HydrationLog[];
  todayTotal: number;
  isLoading: boolean;
  error: string | null;
  dailyGoal: number; // in ml

  // Actions
  loadLogs: (limit?: number) => Promise<void>;
  logWater: (amountMl: number, timestamp?: number) => Promise<HydrationLog>;
  deleteLog: (id: string) => Promise<void>;
  getTodayTotal: () => number;
  getTodayLogs: () => HydrationLog[];
  getHistory: (days: number) => Promise<HydrationLog[]>;
  getLogsForDate: (date: Date) => Promise<HydrationLog[]>;
  getWeeklyTotal: () => Promise<number>;
  getDailyAverage: (days?: number) => Promise<number>;
  setDailyGoal: (goal: number) => void;
  getProgressPercentage: () => number;
  getRemainingAmount: () => number;
  quickAdd: (presetAmount: number) => Promise<HydrationLog>;
}

// Common water amounts for quick add (in ml)
export const QUICK_ADD_PRESETS = [
  { label: 'Small', amount: 150 },
  { label: 'Glass', amount: 250 },
  { label: 'Bottle', amount: 500 },
  { label: 'Large', amount: 750 },
];

export const useHydrationStore = create<HydrationState>((set, get) => ({
  // Initial state
  logs: [],
  todayTotal: 0,
  isLoading: false,
  error: null,
  dailyGoal: 2500, // Default 2.5L daily goal

  // Load hydration logs
  loadLogs: async (limit = 100) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const logs = await getHydrationLogs(limit);
      const todayTotal = await getTodayHydrationTotal();
      set({ logs, todayTotal, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load hydration logs',
        isLoading: false,
      });
    }
  },

  // Log water intake
  logWater: async (amountMl: number, timestamp?: number) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();

      const log: HydrationLog = {
        id: generateId(),
        amount_ml: amountMl,
        timestamp: timestamp ?? Date.now(),
      };

      await createHydrationLog(log);

      // Update state
      const logs = await getHydrationLogs(100);
      const todayTotal = await getTodayHydrationTotal();

      set({ logs, todayTotal, isLoading: false });
      return log;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to log water',
        isLoading: false,
      });
      throw err;
    }
  },

  // Quick add using preset amount
  quickAdd: async (presetAmount: number) => {
    return get().logWater(presetAmount);
  },

  // Delete a hydration log
  deleteLog: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await deleteHydrationLog(id);

      // Update state
      const logs = await getHydrationLogs(100);
      const todayTotal = await getTodayHydrationTotal();

      set({ logs, todayTotal, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete log',
        isLoading: false,
      });
      throw err;
    }
  },

  // Get today's total from state
  getTodayTotal: () => {
    return get().todayTotal;
  },

  // Get today's logs from state
  getTodayLogs: () => {
    const today = new Date();
    const startOfDay = getStartOfDay(today);
    const endOfDay = getEndOfDay(today);

    return get()
      .logs.filter((log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  // Get history for specified number of days
  getHistory: async (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      await initDatabase();
      return await getHydrationLogsByDateRange(
        startDate.getTime(),
        endDate.getTime()
      );
    } catch (err) {
      console.error('Failed to get hydration history:', err);
      return [];
    }
  },

  // Get logs for a specific date
  getLogsForDate: async (date: Date) => {
    try {
      await initDatabase();
      return await getHydrationLogsForDay(date);
    } catch (err) {
      console.error('Failed to get logs for date:', err);
      return [];
    }
  },

  // Get weekly total
  getWeeklyTotal: async () => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    try {
      await initDatabase();
      const logs = await getHydrationLogsByDateRange(
        weekStart.getTime(),
        weekEnd.getTime()
      );
      return logs.reduce((sum, log) => sum + log.amount_ml, 0);
    } catch (err) {
      console.error('Failed to get weekly total:', err);
      return 0;
    }
  },

  // Get daily average over specified number of days
  getDailyAverage: async (days = 7) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      await initDatabase();
      const logs = await getHydrationLogsByDateRange(
        startDate.getTime(),
        endDate.getTime()
      );

      if (logs.length === 0) return 0;

      // Group by day
      const dailyTotals = new Map<string, number>();

      logs.forEach((log) => {
        const date = new Date(log.timestamp).toDateString();
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + log.amount_ml);
      });

      // Calculate average
      const total = Array.from(dailyTotals.values()).reduce((sum, val) => sum + val, 0);
      return Math.round(total / dailyTotals.size);
    } catch (err) {
      console.error('Failed to get daily average:', err);
      return 0;
    }
  },

  // Set daily hydration goal
  setDailyGoal: (goal: number) => {
    set({ dailyGoal: goal });
  },

  // Get progress percentage
  getProgressPercentage: () => {
    const { todayTotal, dailyGoal } = get();
    return Math.min(100, Math.round((todayTotal / dailyGoal) * 100));
  },

  // Get remaining amount to reach goal
  getRemainingAmount: () => {
    const { todayTotal, dailyGoal } = get();
    return Math.max(0, dailyGoal - todayTotal);
  },
}));
