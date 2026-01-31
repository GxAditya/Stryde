import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification identifiers
export const NOTIFICATION_IDS = {
  HYDRATION_REMINDER: 'hydration-reminder',
  HYDRATION_RECURRING: 'hydration-recurring',
  DAILY_GOAL_REMINDER: 'daily-goal-reminder',
  DAILY_REPORT: 'daily-report',
  ACTIVITY_COMPLETE: 'activity-complete',
  WEATHER_RAIN_ALERT: 'weather-rain-alert',
  WEATHER_TEMPERATURE_ALERT: 'weather-temperature-alert',
  DAILY_WEATHER_BRIEFING: 'daily-weather-briefing',
} as const;

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule a hydration reminder notification
 */
export async function scheduleHydrationReminder(
  title: string = 'Time to Hydrate! 💧',
  body: string = 'You\'ve been active. Take a moment to drink some water.',
  delaySeconds: number = 0
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return null;
  }

  // Cancel any existing hydration reminders
  await cancelHydrationReminders();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'hydration_reminder',
        screen: '/hydration',
      },
      sound: 'default',
    },
    trigger: delaySeconds > 0
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds }
      : null,
  });

  return identifier;
}

/**
 * Show immediate hydration reminder after activity
 */
export async function showActivityHydrationReminder(
  steps: number,
  durationMinutes: number
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  let title = 'Great Workout! 💪';
  let body = 'You completed your activity. Remember to hydrate!';

  // Customize message based on activity intensity
  if (steps > 5000 || durationMinutes > 30) {
    title = 'High Intensity Workout! 🔥';
    body = `You crushed ${steps.toLocaleString()} steps! Drink water to help your muscles recover.`;
  } else if (steps > 3000 || durationMinutes > 20) {
    title = 'Activity Complete! 🎯';
    body = `Nice work with ${steps.toLocaleString()} steps. Time to rehydrate!`;
  }

  return scheduleHydrationReminder(title, body, 2); // 2 second delay
}

/**
 * Cancel all hydration reminder notifications
 */
export async function cancelHydrationReminders(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'hydration_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

// ==================== Weather Notifications ====================

/**
 * Schedule a "walk before rain" notification
 */
export async function scheduleRainAlert(
  minutesUntilRain: number,
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate'
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  // Cancel any existing rain alerts
  await cancelWeatherNotifications();

  const intensityText = intensity === 'heavy' ? 'heavy rain' : intensity === 'moderate' ? 'rain' : 'light rain';

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌧️ Walk Before It Rains!',
      body: `${intensityText.charAt(0).toUpperCase() + intensityText.slice(1)} expected in ${minutesUntilRain} minutes. Perfect time for a quick walk!`,
      data: {
        type: 'weather_rain_alert',
        screen: '/activity',
        minutesUntilRain,
        intensity,
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1, // Show immediately
    },
  });

  return identifier;
}

/**
 * Schedule a temperature-based hydration reminder
 */
export async function scheduleTemperatureHydrationReminder(
  temperature: number
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  let title = '☀️ Stay Hydrated!';
  let body = `It's ${temperature}°C outside. Remember to drink water before your walk.`;

  if (temperature >= 35) {
    title = '🔥 Extreme Heat Warning!';
    body = `It's ${temperature}°C! Drink extra water and consider indoor activities.`;
  } else if (temperature >= 30) {
    title = '🌡️ Hot Weather Alert';
    body = `It's ${temperature}°C. Stay hydrated during your activity!`;
  } else if (temperature <= 0) {
    title = '❄️ Cold Weather Tip';
    body = `It's freezing at ${temperature}°C. Hydration is still important in cold weather!`;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'weather_temperature_alert',
        screen: '/hydration',
        temperature,
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1, // Show immediately
    },
  });

  return identifier;
}

/**
 * Schedule daily weather briefing notification
 */
export async function scheduleDailyWeatherBriefing(
  condition: string,
  temperature: number,
  suggestion: string
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  // Cancel existing daily briefing
  await cancelDailyWeatherBriefing();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🌤️ Today's Weather: ${condition}`,
      body: `${temperature}°C - ${suggestion}`,
      data: {
        type: 'daily_weather_briefing',
        screen: '/',
        condition,
        temperature,
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1, // Show immediately (in production, schedule for morning)
    },
  });

  return identifier;
}

/**
 * Cancel all weather-related notifications
 */
export async function cancelWeatherNotifications(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const type = notification.content.data?.type;
    if (type === 'weather_rain_alert' || type === 'weather_temperature_alert') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Cancel daily weather briefing
 */
export async function cancelDailyWeatherBriefing(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'daily_weather_briefing') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Show immediate weather alert notification
 */
export async function showWeatherAlert(
  title: string,
  body: string,
  screen: string = '/'
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'weather_alert',
        screen,
      },
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
}

// ==================== Daily Reminders System ====================

/**
 * Schedule recurring hydration reminders
 * @param intervalMinutes - Interval in minutes between reminders (e.g., 120 for every 2 hours)
 * @param enabled - Whether the reminder is enabled
 */
export async function scheduleRecurringHydrationReminder(
  intervalMinutes: number = 120,
  enabled: boolean = true
): Promise<string | null> {
  // First, cancel any existing recurring hydration reminders
  await cancelRecurringHydrationReminder();

  if (!enabled) {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Hydration Reminder',
      body: 'Time to drink some water! Stay hydrated throughout the day.',
      data: {
        type: 'hydration_recurring',
        screen: '/hydration',
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalMinutes * 60, // Convert minutes to seconds
      repeats: true, // This makes it recurring
    },
  });

  console.log(`Scheduled recurring hydration reminder every ${intervalMinutes} minutes`);
  return identifier;
}

/**
 * Cancel recurring hydration reminders
 */
export async function cancelRecurringHydrationReminder(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'hydration_recurring') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log('Cancelled recurring hydration reminder');
    }
  }
}

/**
 * Schedule daily goal completion reminder (6 PM daily - 6 hours before midnight)
 * @param enabled - Whether the reminder is enabled
 */
export async function scheduleDailyGoalReminder(enabled: boolean = true): Promise<string | null> {
  // Cancel any existing daily goal reminders first
  await cancelDailyGoalReminder();

  if (!enabled) {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return null;
  }

  // Schedule for 6 PM (18:00) daily
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(18, 0, 0, 0);

  // If it's already past 6 PM today, schedule for tomorrow
  if (now.getTime() > scheduledTime.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎯 Daily Goal Check-In',
      body: "It's 6 PM! How's your progress? You still have 6 hours to reach your daily goal!",
      data: {
        type: 'daily_goal_reminder',
        screen: '/',
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18, // 6 PM
      minute: 0,
    },
  });

  console.log('Scheduled daily goal reminder for 6 PM');
  return identifier;
}

/**
 * Cancel daily goal reminder
 */
export async function cancelDailyGoalReminder(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'daily_goal_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log('Cancelled daily goal reminder');
    }
  }
}

/**
 * Schedule daily report notification (8 PM daily)
 * Shows user's daily accomplishments
 * @param enabled - Whether the reminder is enabled
 */
export async function scheduleDailyReport(enabled: boolean = true): Promise<string | null> {
  // Cancel any existing daily report notifications first
  await cancelDailyReport();

  if (!enabled) {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Your Daily Report',
      body: "Here's what you accomplished today! Tap to see your detailed progress.",
      data: {
        type: 'daily_report',
        screen: '/insights',
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20, // 8 PM
      minute: 0,
    },
  });

  console.log('Scheduled daily report for 8 PM');
  return identifier;
}

/**
 * Cancel daily report notification
 */
export async function cancelDailyReport(): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'daily_report') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log('Cancelled daily report');
    }
  }
}

/**
 * Send daily report notification with actual data
 * Call this at 8 PM with the user's stats
 */
export async function sendDailyReportWithStats(
  steps: number,
  stepGoal: number,
  distanceKm: number,
  hydrationMl: number,
  hydrationGoalMl: number
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const stepPercentage = Math.round((steps / stepGoal) * 100);
  const hydrationPercentage = Math.round((hydrationMl / hydrationGoalMl) * 100);

  let title = '🎉 Great Day!';
  let body = `Steps: ${steps.toLocaleString()} (${stepPercentage}%) • Distance: ${distanceKm}km • Hydration: ${hydrationPercentage}%`;

  if (steps >= stepGoal && hydrationMl >= hydrationGoalMl) {
    title = '🏆 Perfect Day!';
    body = `Amazing! You crushed your goals! ${steps.toLocaleString()} steps and ${(hydrationMl / 1000).toFixed(1)}L water!`;
  } else if (steps >= stepGoal) {
    title = '✅ Step Goal Achieved!';
    body = `You hit ${steps.toLocaleString()} steps today! Keep hydrating for even better results.`;
  } else if (hydrationMl >= hydrationGoalMl) {
    title = '💧 Hydration Goal Met!';
    body = `Great hydration! You logged ${(hydrationMl / 1000).toFixed(1)}L. Just ${(stepGoal - steps).toLocaleString()} more steps to go!`;
  } else if (steps > 0) {
    title = '📈 Every Step Counts!';
    body = `${steps.toLocaleString()} steps and ${(hydrationMl / 1000).toFixed(1)}L water. Tomorrow is a new day!`;
  }

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'daily_report_stats',
        screen: '/insights',
        steps,
        distanceKm,
        hydrationMl,
      },
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
}

// Configure Android notification channel
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
  });
}
