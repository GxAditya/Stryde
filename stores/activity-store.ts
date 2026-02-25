import {
  Activity,
  RoutePoint,
  createActivity,
  deleteActivity,
  endActivity,
  getActiveActivity,
  getActivities,
  initDatabase,
  updateActivity
} from '@/lib/db';
import { create } from 'zustand';

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

  // Pause tracking - for accurate time calculation
  pausedAt: number | null;  // Timestamp when activity was paused
  totalPausedMs: number;    // Total time spent paused in milliseconds

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
  
  // Helper to calculate elapsed time accounting for pauses
  getElapsedTime: (startTime: number) => number;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  // Initial state
  activities: [],
  currentActivity: null,
  status: 'idle',
  isLoading: false,
  error: null,
  lastSyncTime: 0,
  
  // Pause tracking - for accurate time calculation
  pausedAt: null,
  totalPausedMs: 0,

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
        // Determine if activity was paused based on ended_at
        // If ended_at is null but there's a duration, it might be paused
        // For now, set to active if not ended
        const wasPaused = activeActivity.ended_at === null && activeActivity.duration_ms > 0;
        
        set({
          currentActivity: activeActivity,
          status: wasPaused ? 'paused' : 'active',
          // Reset pause tracking for resumed activity
          pausedAt: null,
          totalPausedMs: 0,
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
        // Reset pause tracking for new activity
        pausedAt: null,
        totalPausedMs: 0,
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
    const { status, pausedAt } = get();
    if (status === 'active' && !pausedAt) {
      // Capture the pause timestamp
      set({ status: 'paused', pausedAt: Date.now() });
    }
  },

  // Resume the current activity
  resumeActivity: () => {
    const { status, currentActivity, pausedAt, totalPausedMs } = get();
    if (status === 'paused' && currentActivity && pausedAt) {
      // Calculate pause duration and add to total
      const pauseDuration = Date.now() - pausedAt;
      set({ 
        status: 'active', 
        pausedAt: null,
        totalPausedMs: totalPausedMs + pauseDuration
      });
    }
  },

  // End the current activity
  endActivity: async () => {
    const { currentActivity, totalPausedMs } = get();
    if (!currentActivity) return;

    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const endedAt = Date.now();

      // Calculate final duration accounting for pauses
      const startedAt = currentActivity.started_at;
      const finalDuration = endedAt - startedAt - totalPausedMs;

      await endActivity(currentActivity.id, endedAt);

      // Update local state
      const updatedActivity: Activity = {
        ...currentActivity,
        ended_at: endedAt,
        duration_ms: finalDuration,
      };

      const activities = await getActivities(50);

      set({
        currentActivity: null,
        status: 'idle',
        activities,
        isLoading: false,
        // Reset pause tracking
        pausedAt: null,
        totalPausedMs: 0,
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

  // Calculate elapsed time accounting for pauses
  getElapsedTime: (startTime: number) => {
    const { status, pausedAt, totalPausedMs } = get();
    const now = Date.now();
    
    // If activity hasn't started, return 0
    if (!startTime) return 0;
    
    // Calculate current elapsed time
    let currentElapsed = now - startTime;
    
    // Subtract total paused time
    currentElapsed -= totalPausedMs;
    
    // If currently paused, subtract the current pause duration
    if (status === 'paused' && pausedAt) {
      currentElapsed -= (now - pausedAt);
    }
    
    return Math.max(0, currentElapsed);
  },
}));
