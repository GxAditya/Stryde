import { create } from 'zustand';
import {
  Goal,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoals,
  getGoalsForDate,
  getGoalsByType,
  initDatabase,
} from '@/lib/db';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get ISO date string (YYYY-MM-DD)
function getISODate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
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

interface GoalState {
  // State
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGoals: () => Promise<void>;
  setGoal: (
    goal: Omit<Goal, 'id' | 'current'>
  ) => Promise<Goal>;
  updateProgress: (id: string, current: number) => Promise<void>;
  incrementProgress: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  getGoalsForDate: (date: Date) => Goal[];
  getGoalById: (id: string) => Goal | undefined;
  getGoalsByType: (type: Goal['type']) => Goal[];
  getTodayGoals: () => Goal[];
  getWeeklyGoals: () => Goal[];
  calculateAdaptiveTarget: (type: Goal['type'], historyDays?: number) => number;
  autoCreateDailyGoals: () => Promise<void>;
  getGoalProgress: (id: string) => { current: number; target: number; percentage: number } | null;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  // Initial state
  goals: [],
  isLoading: false,
  error: null,

  // Load all goals from database
  loadGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const goals = await getGoals();
      set({ goals, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load goals',
        isLoading: false,
      });
    }
  },

  // Create a new goal
  setGoal: async (goal) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();

      // Check if goal for this type and date already exists
      const existingGoals = get().goals.filter(
        (g) => g.type === goal.type && g.date === goal.date
      );

      // Delete existing goals of same type for same date
      for (const existing of existingGoals) {
        await deleteGoal(existing.id);
      }

      const newGoal: Goal = {
        ...goal,
        id: generateId(),
        current: 0,
      };

      await createGoal(newGoal);
      const goals = await getGoals();
      set({ goals, isLoading: false });

      return newGoal;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create goal',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update goal progress
  updateProgress: async (id: string, current: number) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await updateGoal(id, { current });

      // Update local state
      const goals = get().goals.map((g) =>
        g.id === id ? { ...g, current } : g
      );
      set({ goals, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update progress',
        isLoading: false,
      });
      throw err;
    }
  },

  // Increment goal progress
  incrementProgress: async (id: string, amount: number) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;

    const newCurrent = goal.current + amount;
    await get().updateProgress(id, newCurrent);
  },

  // Delete a goal
  deleteGoal: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await deleteGoal(id);
      const goals = await getGoals();
      set({ goals, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete goal',
        isLoading: false,
      });
      throw err;
    }
  },

  // Get goals for a specific date
  getGoalsForDate: (date: Date) => {
    const dateStr = getISODate(date);
    return get().goals.filter((g) => g.date === dateStr);
  },

  // Get goal by ID
  getGoalById: (id: string) => {
    return get().goals.find((g) => g.id === id);
  },

  // Get goals by type
  getGoalsByType: (type: Goal['type']) => {
    return get().goals.filter((g) => g.type === type);
  },

  // Get today's goals
  getTodayGoals: () => {
    return get().getGoalsForDate(new Date());
  },

  // Get current week's goals
  getWeeklyGoals: () => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    return get().goals.filter((g) => {
      const goalDate = new Date(g.date);
      return goalDate >= weekStart && goalDate <= weekEnd;
    });
  },

  // Calculate adaptive target based on historical performance
  calculateAdaptiveTarget: (type: Goal['type'], historyDays = 7) => {
    const { goals } = get();
    const now = new Date();

    // Get historical goals of the same type
    const historicalGoals = goals
      .filter((g) => {
        if (g.type !== type) return false;
        const goalDate = new Date(g.date);
        const daysDiff =
          (now.getTime() - goalDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 0 && daysDiff <= historyDays && g.current > 0;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, historyDays);

    if (historicalGoals.length === 0) {
      // Default targets if no history
      switch (type) {
        case 'daily_steps':
          return 10000;
        case 'weekly_steps':
          return 70000;
        case 'daily_distance':
          return 5000; // meters
        default:
          return 0;
      }
    }

    // Calculate average performance
    const averagePerformance =
      historicalGoals.reduce((sum, g) => sum + g.current, 0) /
      historicalGoals.length;

    // Apply a slight increase (5-10%) to encourage improvement
    const improvementFactor = 1.05;
    const suggestedTarget = Math.round(averagePerformance * improvementFactor);

    // Round to nice numbers
    if (type === 'daily_steps' || type === 'weekly_steps') {
      return Math.round(suggestedTarget / 500) * 500;
    } else if (type === 'daily_distance') {
      return Math.round(suggestedTarget / 100) * 100;
    }

    return suggestedTarget;
  },

  // Auto-create daily goals if they don't exist
  autoCreateDailyGoals: async () => {
    const today = getISODate();
    const { goals } = get();

    // Check if daily goals exist for today
    const hasDailySteps = goals.some(
      (g) => g.type === 'daily_steps' && g.date === today
    );
    const hasDailyDistance = goals.some(
      (g) => g.type === 'daily_distance' && g.date === today
    );

    try {
      if (!hasDailySteps) {
        const adaptiveSteps = get().calculateAdaptiveTarget('daily_steps');
        await get().setGoal({
          type: 'daily_steps',
          target: adaptiveSteps,
          date: today,
        });
      }

      if (!hasDailyDistance) {
        const adaptiveDistance = get().calculateAdaptiveTarget('daily_distance');
        await get().setGoal({
          type: 'daily_distance',
          target: adaptiveDistance,
          date: today,
        });
      }

      // Check if weekly goal exists for current week
      const weekStart = getISODate(getWeekStart());
      const hasWeeklySteps = goals.some(
        (g) => g.type === 'weekly_steps' && g.date === weekStart
      );

      if (!hasWeeklySteps) {
        const adaptiveWeeklySteps = get().calculateAdaptiveTarget('weekly_steps');
        await get().setGoal({
          type: 'weekly_steps',
          target: adaptiveWeeklySteps,
          date: weekStart,
        });
      }
    } catch (err) {
      console.error('Failed to auto-create goals:', err);
    }
  },

  // Get goal progress
  getGoalProgress: (id: string) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return null;

    const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));

    return {
      current: goal.current,
      target: goal.target,
      percentage,
    };
  },
}));
