import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Storage keys
const DEEPWORK_STORAGE_KEY = 'deepwork_settings';

// Default values
const DEFAULT_HYDRATION_INTERVAL = 30; // minutes
const DEFAULT_STRETCH_INTERVAL = 45; // minutes
const DEFAULT_FOCUS_DURATION = 90; // minutes (Pomodoro-like session)

export interface DeepworkSettings {
  deepworkEnabled: boolean;
  hydrationIntervalMinutes: number;
  stretchIntervalMinutes: number;
  focusDurationMinutes: number;
}

interface DeepworkState {
  // State
  deepworkEnabled: boolean;
  hydrationIntervalMinutes: number;
  stretchIntervalMinutes: number;
  focusDurationMinutes: number;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  toggleDeepwork: () => Promise<void>;
  setDeepworkEnabled: (enabled: boolean) => Promise<void>;
  setHydrationInterval: (minutes: number) => Promise<void>;
  setStretchInterval: (minutes: number) => Promise<void>;
  setFocusDuration: (minutes: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

// Save settings helper (outside the store)
async function saveToStorage(settings: DeepworkSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(DEEPWORK_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save deepwork settings:', error);
  }
}

export const useDeepworkStore = create<DeepworkState>((set, get) => ({
  // Initial state
  deepworkEnabled: false,
  hydrationIntervalMinutes: DEFAULT_HYDRATION_INTERVAL,
  stretchIntervalMinutes: DEFAULT_STRETCH_INTERVAL,
  focusDurationMinutes: DEFAULT_FOCUS_DURATION,
  isLoading: false,
  isInitialized: false,

  // Load settings from AsyncStorage
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(DEEPWORK_STORAGE_KEY);
      if (stored) {
        const settings: DeepworkSettings = JSON.parse(stored);
        set({
          deepworkEnabled: settings.deepworkEnabled,
          hydrationIntervalMinutes: settings.hydrationIntervalMinutes,
          stretchIntervalMinutes: settings.stretchIntervalMinutes,
          focusDurationMinutes: settings.focusDurationMinutes,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to load deepwork settings:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Toggle deepwork mode
  toggleDeepwork: async () => {
    const currentState = get();
    const newEnabled = !currentState.deepworkEnabled;
    
    set({ deepworkEnabled: newEnabled });
    
    await saveToStorage({
      deepworkEnabled: newEnabled,
      hydrationIntervalMinutes: currentState.hydrationIntervalMinutes,
      stretchIntervalMinutes: currentState.stretchIntervalMinutes,
      focusDurationMinutes: currentState.focusDurationMinutes,
    });
  },

  // Set deepwork enabled state
  setDeepworkEnabled: async (enabled: boolean) => {
    const currentState = get();
    
    set({ deepworkEnabled: enabled });
    
    await saveToStorage({
      deepworkEnabled: enabled,
      hydrationIntervalMinutes: currentState.hydrationIntervalMinutes,
      stretchIntervalMinutes: currentState.stretchIntervalMinutes,
      focusDurationMinutes: currentState.focusDurationMinutes,
    });
  },

  // Set hydration interval
  setHydrationInterval: async (minutes: number) => {
    const currentState = get();
    const clampedMinutes = Math.max(5, Math.min(120, minutes)); // 5-120 minutes
    
    set({ hydrationIntervalMinutes: clampedMinutes });
    
    await saveToStorage({
      deepworkEnabled: currentState.deepworkEnabled,
      hydrationIntervalMinutes: clampedMinutes,
      stretchIntervalMinutes: currentState.stretchIntervalMinutes,
      focusDurationMinutes: currentState.focusDurationMinutes,
    });
  },

  // Set stretch interval
  setStretchInterval: async (minutes: number) => {
    const currentState = get();
    const clampedMinutes = Math.max(10, Math.min(120, minutes)); // 10-120 minutes
    
    set({ stretchIntervalMinutes: clampedMinutes });
    
    await saveToStorage({
      deepworkEnabled: currentState.deepworkEnabled,
      hydrationIntervalMinutes: currentState.hydrationIntervalMinutes,
      stretchIntervalMinutes: clampedMinutes,
      focusDurationMinutes: currentState.focusDurationMinutes,
    });
  },

  // Set focus duration
  setFocusDuration: async (minutes: number) => {
    const currentState = get();
    const clampedMinutes = Math.max(15, Math.min(180, minutes)); // 15-180 minutes
    
    set({ focusDurationMinutes: clampedMinutes });
    
    await saveToStorage({
      deepworkEnabled: currentState.deepworkEnabled,
      hydrationIntervalMinutes: currentState.hydrationIntervalMinutes,
      stretchIntervalMinutes: currentState.stretchIntervalMinutes,
      focusDurationMinutes: clampedMinutes,
    });
  },

  // Reset to defaults
  resetToDefaults: async () => {
    set({
      deepworkEnabled: false,
      hydrationIntervalMinutes: DEFAULT_HYDRATION_INTERVAL,
      stretchIntervalMinutes: DEFAULT_STRETCH_INTERVAL,
      focusDurationMinutes: DEFAULT_FOCUS_DURATION,
    });
    
    await saveToStorage({
      deepworkEnabled: false,
      hydrationIntervalMinutes: DEFAULT_HYDRATION_INTERVAL,
      stretchIntervalMinutes: DEFAULT_STRETCH_INTERVAL,
      focusDurationMinutes: DEFAULT_FOCUS_DURATION,
    });
  },
}));

// Helper to get current settings
export const getDeepworkSettings = (): DeepworkSettings => {
  const state = useDeepworkStore.getState();
  return {
    deepworkEnabled: state.deepworkEnabled,
    hydrationIntervalMinutes: state.hydrationIntervalMinutes,
    stretchIntervalMinutes: state.stretchIntervalMinutes,
    focusDurationMinutes: state.focusDurationMinutes,
  };
};
