import { create } from 'zustand';
import {
  CalibrationProfile,
  createCalibrationProfile,
  updateCalibrationProfile,
  deleteCalibrationProfile,
  getCalibrationProfiles,
  getCalibrationProfileById,
  getCalibrationProfilesByActivityType,
  initDatabase,
} from '@/lib/db';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface CalibrationState {
  // State
  profiles: CalibrationProfile[];
  activeProfileId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProfiles: () => Promise<void>;
  createProfile: (
    profile: Omit<CalibrationProfile, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<CalibrationProfile>;
  updateProfile: (
    id: string,
    updates: Partial<Omit<CalibrationProfile, 'id' | 'created_at'>>
  ) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getProfiles: () => CalibrationProfile[];
  getProfilesByActivityType: (
    activityType: CalibrationProfile['activity_type']
  ) => CalibrationProfile[];
  getActiveProfile: () => CalibrationProfile | null;
  setActiveProfile: (id: string | null) => void;
  getProfileById: (id: string) => CalibrationProfile | undefined;
}

export const useCalibrationStore = create<CalibrationState>((set, get) => ({
  // Initial state
  profiles: [],
  activeProfileId: null,
  isLoading: false,
  error: null,

  // Load all profiles from database
  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const profiles = await getCalibrationProfiles();
      set({ profiles, isLoading: false });

      // Set first profile as active if none selected
      const { activeProfileId } = get();
      if (!activeProfileId && profiles.length > 0) {
        // Prefer highest confidence profile
        const sortedByConfidence = [...profiles].sort(
          (a, b) => b.confidence - a.confidence
        );
        set({ activeProfileId: sortedByConfidence[0].id });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load profiles',
        isLoading: false,
      });
    }
  },

  // Create a new calibration profile
  createProfile: async (profile) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      const newProfile: CalibrationProfile = {
        ...profile,
        id: generateId(),
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const created = await createCalibrationProfile(newProfile);
      const profiles = await getCalibrationProfiles();
      set({ profiles, isLoading: false });

      // Set as active if it's the first profile
      if (profiles.length === 1) {
        set({ activeProfileId: created.id });
      }

      return created;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create profile',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update an existing profile
  updateProfile: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await updateCalibrationProfile(id, updates);
      const profiles = await getCalibrationProfiles();
      set({ profiles, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update profile',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a profile
  deleteProfile: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await initDatabase();
      await deleteCalibrationProfile(id);
      const profiles = await getCalibrationProfiles();

      // Clear active profile if it was deleted
      const { activeProfileId } = get();
      if (activeProfileId === id) {
        const newActiveId = profiles.length > 0 ? profiles[0].id : null;
        set({ activeProfileId: newActiveId });
      }

      set({ profiles, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete profile',
        isLoading: false,
      });
      throw err;
    }
  },

  // Get all profiles (from state)
  getProfiles: () => {
    return get().profiles;
  },

  // Get profiles filtered by activity type
  getProfilesByActivityType: (activityType) => {
    return get().profiles.filter(
      (profile) => profile.activity_type === activityType
    );
  },

  // Get the currently active profile
  getActiveProfile: () => {
    const { profiles, activeProfileId } = get();
    if (!activeProfileId) return null;
    return profiles.find((p) => p.id === activeProfileId) || null;
  },

  // Set the active profile
  setActiveProfile: (id) => {
    set({ activeProfileId: id });
  },

  // Get a profile by ID
  getProfileById: (id) => {
    return get().profiles.find((p) => p.id === id);
  },
}));
