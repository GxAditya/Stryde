import { create } from 'zustand';
import {
  Activity,
  RoutePoint,
  createActivity,
  updateActivity,
  endActivity,
  deleteActivity,
  getActivities,
  getActivityById,
  getActiveActivity,
  initDatabase,
} from '@/lib/db';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

type ActivityStatus = 'idle' | 'active' | 'paused';

interface ActivityState {
  // State
  activities: Activity[];
  currentActivity: Activity | null;
  status: ActivityStatus;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number;

  // Actions
  loadActivities: (limit?: number) => Promise<void>;
  startActivity: (profileId: string) => Promise<Activity>;
  pauseActivity: () => void;
  resumeActivity: () => void;
  endActivity: () => Promise<void>;
  addSteps: (steps: number) => Promise<void>;
  updateSteps: (totalSteps: number) => Promise<void>;
  updateRoute: (point: RoutePoint) => Promise<void>;
  updateDistance: (distanceMeters: number) => Promise<void>;
  updateDuration: (durationMs: number) => Promise<void>;
  updateElevationGain: (elevationMeters: number) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  getActivityById: (id: string) => Activity | undefined;
  getActivitiesForDateRange: (startDate: Date, endDate: Date) => Activity[];
  getTodayStats: () => { steps: number; distance: number; duration: number };
  loadActiveActivity: () => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  // Initial state
  activities: [],
  currentActivity: null,
  status: 'idle',
  isLoading: false,
  error: null,
  lastSyncTime: 0,

  // Load activities from database
  loadActivities: async (limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const activities = await getActivities(limit);
      set({ activities, isLoading: false, lastSyncTime: Date.now() });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load activities',
        isLoading: false,
      });
    }
  },

  // Load any active (unfinished) activity from database
  loadActiveActivity: async () => {
    try {
      await initDatabase();
      const activeActivity = await getActiveActivity();
      if (activeActivity) {
        set({
          currentActivity: activeActivity,
          status: 'active',
        });
      }
    } catch (err) {
      console.error('Failed to load active activity:', err);
    }
  },

  // Start a new activity
  startActivity: async (profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const now = Date.now();

      const newActivity: Activity = {
        id: generateId(),
        profile_id: profileId,
        steps: 0,
        distance_m: 0,
        duration_ms: 0,
        route_points: [],
        elevation_gain_m: 0,
        started_at: now,
        ended_at: null,
      };

      await createActivity(newActivity);

      set({
        currentActivity: newActivity,
        status: 'active',
        isLoading: false,
      });

      return newActivity;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to start activity',
        isLoading: false,
      });
      throw err;
    }
  },

  // Pause the current activity
  pauseActivity: () => {
    const { status } = get();
    if (status === 'active') {
      set({ status: 'paused' });
    }
  },

  // Resume the current activity
  resumeActivity: () => {
    const { status, currentActivity } = get();
    if (status === 'paused' && currentActivity) {
      set({ status: 'active' });
    }
  },

  // End the current activity
  endActivity: async () => {
    const { currentActivity } = get();
    if (!currentActivity) return;

    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const endedAt = Date.now();

      await endActivity(currentActivity.id, endedAt);

      // Update local state
      const updatedActivity: Activity = {
        ...currentActivity,
        ended_at: endedAt,
      };

      const activities = await getActivities(50);

      set({
        currentActivity: null,
        status: 'idle',
        activities,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to end activity',
        isLoading: false,
      });
      throw err;
    }
  },

  // Add steps to current activity (Incremental)
  addSteps: async (steps: number) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      const newSteps = currentActivity.steps + steps;
      await updateActivity(currentActivity.id, { steps: newSteps });

      set({
        currentActivity: {
          ...currentActivity,
          steps: newSteps,
        },
      });
    } catch (err) {
      console.error('Failed to add steps:', err);
    }
  },

  // Update total steps (Absolute) - for GPS derived calculation
  updateSteps: async (totalSteps: number) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      await updateActivity(currentActivity.id, { steps: totalSteps });
      set({
        currentActivity: {
          ...currentActivity,
          steps: totalSteps,
        },
      });
    } catch (err) {
      console.error('Failed to update steps:', err);
    }
  },

  // Update route with new point
  updateRoute: async (point: RoutePoint) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      const newRoutePoints = [...currentActivity.route_points, point];
      await updateActivity(currentActivity.id, {
        route_points: newRoutePoints,
      });

      set({
        currentActivity: {
          ...currentActivity,
          route_points: newRoutePoints,
        },
      });
    } catch (err) {
      console.error('Failed to update route:', err);
    }
  },

  // Update distance
  updateDistance: async (distanceMeters: number) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      await updateActivity(currentActivity.id, {
        distance_m: distanceMeters,
      });

      set({
        currentActivity: {
          ...currentActivity,
          distance_m: distanceMeters,
        },
      });
    } catch (err) {
      console.error('Failed to update distance:', err);
    }
  },

  // Update duration
  updateDuration: async (durationMs: number) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      await updateActivity(currentActivity.id, {
        duration_ms: durationMs,
      });

      set({
        currentActivity: {
          ...currentActivity,
          duration_ms: durationMs,
        },
      });
    } catch (err) {
      console.error('Failed to update duration:', err);
    }
  },

  // Update elevation gain
  updateElevationGain: async (elevationMeters: number) => {
    const { currentActivity, status } = get();
    if (!currentActivity || status !== 'active') return;

    try {
      await updateActivity(currentActivity.id, {
        elevation_gain_m: elevationMeters,
      });

      set({
        currentActivity: {
          ...currentActivity,
          elevation_gain_m: elevationMeters,
        },
      });
    } catch (err) {
      console.error('Failed to update elevation gain:', err);
    }
  },

  // Delete an activity
  deleteActivity: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await deleteActivity(id);
      const activities = await getActivities(50);

      // If deleting current activity, reset state
      const { currentActivity } = get();
      if (currentActivity?.id === id) {
        set({
          currentActivity: null,
          status: 'idle',
          activities,
          isLoading: false,
        });
      } else {
        set({ activities, isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete activity',
        isLoading: false,
      });
      throw err;
    }
  },

  // Get activity by ID from state
  getActivityById: (id: string) => {
    return get().activities.find((a) => a.id === id);
  },

  // Get activities within a date range
  getActivitiesForDateRange: (startDate: Date, endDate: Date) => {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return get().activities.filter((activity) => {
      return activity.started_at >= startTime && activity.started_at <= endTime;
    });
  },

  // Get today's stats
  getTodayStats: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const todayActivities = get().activities.filter((activity) => {
      return (
        activity.started_at >= startOfDay &&
        activity.started_at < endOfDay &&
        activity.ended_at !== null
      );
    });

    return todayActivities.reduce(
      (stats, activity) => ({
        steps: stats.steps + activity.steps,
        distance: stats.distance + activity.distance_m,
        duration: stats.duration + activity.duration_ms,
      }),
      { steps: 0, distance: 0, duration: 0 }
    );
  },
}));
