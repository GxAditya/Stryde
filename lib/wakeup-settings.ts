/**
 * Wakeup time settings for smart notifications
 * Stores user preferences for awake hours filtering
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const WAKEUP_TIME_KEY = 'stryde_wakeup_time';
const ENABLE_AWAKE_FILTERING_KEY = 'stryde_enable_awake_filtering';

// Default values
const DEFAULT_WAKEUP_TIME = '07:00';
const DEFAULT_ENABLE_AWAKE_FILTERING = false;

// Wakeup time settings interface
export interface WakeupSettings {
  wakeupTime: string; // "HH:MM" format (e.g., "07:00")
  enableAwakeFiltering: boolean;
}

// Default wakeup settings
export const DEFAULT_WAKEUP_SETTINGS: WakeupSettings = {
  wakeupTime: DEFAULT_WAKEUP_TIME,
  enableAwakeFiltering: DEFAULT_ENABLE_AWAKE_FILTERING,
};

/**
 * Load wakeup time settings from AsyncStorage
 */
export async function loadWakeupSettings(): Promise<WakeupSettings> {
  try {
    const [wakeupTime, enableAwakeFiltering] = await Promise.all([
      AsyncStorage.getItem(WAKEUP_TIME_KEY),
      AsyncStorage.getItem(ENABLE_AWAKE_FILTERING_KEY),
    ]);

    return {
      wakeupTime: wakeupTime || DEFAULT_WAKEUP_TIME,
      enableAwakeFiltering: enableAwakeFiltering === 'true',
    };
  } catch {
    return DEFAULT_WAKEUP_SETTINGS;
  }
}

/**
 * Save wakeup time settings to AsyncStorage
 */
export async function saveWakeupSettings(settings: WakeupSettings): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(WAKEUP_TIME_KEY, settings.wakeupTime),
    AsyncStorage.setItem(ENABLE_AWAKE_FILTERING_KEY, settings.enableAwakeFiltering.toString()),
  ]);
}

/**
 * Check if the current time is within the user's awake hours
 * @param wakeupTime - Wakeup time in "HH:MM" format (e.g., "07:00")
 * @param currentDate - Date to check against (defaults to now)
 * @returns true if within awake hours, false otherwise
 */
export function isWithinAwakeHours(wakeupTime: string, currentDate: Date = new Date()): boolean {
  const [wakeHour, wakeMin] = wakeupTime.split(':').map(Number);
  const currentHour = currentDate.getHours();
  const currentMin = currentDate.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMin;
  const wakeupTotalMins = wakeHour * 60 + wakeMin;
  const sleepTotalMins = wakeupTotalMins + 16 * 60; // 16 hours awake

  if (sleepTotalMins < 24 * 60) {
    // Normal day (e.g., wake 7 AM, sleep 11 PM)
    return currentTotalMins >= wakeupTotalMins && currentTotalMins < sleepTotalMins;
  } else {
    // Overnight (e.g., wake 8 PM, sleep 12 PM next day)
    return currentTotalMins >= wakeupTotalMins || currentTotalMins < (sleepTotalMins - 24 * 60);
  }
}

/**
 * Check if notifications should be sent based on awake hours settings
 * @returns true if notifications should be sent, false if within sleep hours
 */
export async function shouldSendNotification(): Promise<boolean> {
  try {
    const settings = await loadWakeupSettings();
    
    // If awake filtering is disabled, always send notifications
    if (!settings.enableAwakeFiltering) {
      return true;
    }
    
    // Check if within awake hours
    return isWithinAwakeHours(settings.wakeupTime);
  } catch (error: unknown) {
    // If there's an error loading settings, allow notifications by default
    console.log('Error loading wakeup settings, allowing notification:', error);
    return true;
  }
}
