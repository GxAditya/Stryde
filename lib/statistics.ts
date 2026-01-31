/**
 * Statistics calculation utilities for Stryde Insights
 * Provides functions for calculating totals, averages, trends, streaks, and comparisons
 */

import { Activity } from '@/lib/db';
import { Goal } from '@/lib/db';

// Type definitions
export interface PeriodStats {
  totalSteps: number;
  totalDistance: number;
  totalDuration: number;
  averageDailySteps: number;
  bestDay: { date: Date; steps: number } | null;
  activityCount: number;
  completionRate: number;
}

export interface DailyData {
  date: Date;
  steps: number;
  distance: number;
  duration: number;
  activities: number;
}

export interface ActivityBreakdown {
  type: string;
  count: number;
  steps: number;
  distance: number;
  duration: number;
  percentage: number;
}

export interface PersonalRecord {
  category: string;
  value: number;
  date: Date;
  label: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

export interface PeriodComparison {
  current: PeriodStats;
  previous: PeriodStats;
  changes: {
    steps: number;
    distance: number;
    duration: number;
    completionRate: number;
  };
}

// Helper: Get start of day
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Get end of day
function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Helper: Check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Helper: Add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper: Format milliseconds to hours and minutes
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

// Helper: Format distance (meters to km or m)
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

// Helper: Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Get activities within a date range
export function getActivitiesInRange(
  activities: Activity[],
  startDate: Date,
  endDate: Date
): Activity[] {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return activities.filter(
    (activity) => activity.started_at >= start && activity.started_at <= end
  );
}

// Aggregate activities by day
export function aggregateByDay(
  activities: Activity[],
  startDate: Date,
  endDate: Date
): DailyData[] {
  const days: DailyData[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayStart = getStartOfDay(currentDate).getTime();
    const dayEnd = getEndOfDay(currentDate).getTime();

    const dayActivities = activities.filter(
      (a) => a.started_at >= dayStart && a.started_at <= dayEnd
    );

    days.push({
      date: new Date(currentDate),
      steps: dayActivities.reduce((sum, a) => sum + a.steps, 0),
      distance: dayActivities.reduce((sum, a) => sum + a.distance_m, 0),
      duration: dayActivities.reduce((sum, a) => sum + a.duration_ms, 0),
      activities: dayActivities.length,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

// Calculate statistics for a period
export function calculatePeriodStats(
  activities: Activity[],
  goals: Goal[],
  startDate: Date,
  endDate: Date
): PeriodStats {
  const periodActivities = getActivitiesInRange(activities, startDate, endDate);
  const dailyData = aggregateByDay(activities, startDate, endDate);

  const totalSteps = periodActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalDistance = periodActivities.reduce((sum, a) => sum + a.distance_m, 0);
  const totalDuration = periodActivities.reduce((sum, a) => sum + a.duration_ms, 0);

  // Find best day
  let bestDay: { date: Date; steps: number } | null = null;
  dailyData.forEach((day) => {
    if (!bestDay || day.steps > bestDay.steps) {
      bestDay = { date: day.date, steps: day.steps };
    }
  });

  // Calculate average daily steps
  const daysCount = dailyData.length || 1;
  const averageDailySteps = Math.round(totalSteps / daysCount);

  // Calculate completion rate from goals
  const periodGoals = goals.filter((goal) => {
    const goalDate = new Date(goal.date);
    return goalDate >= startDate && goalDate <= endDate;
  });

  const completedGoals = periodGoals.filter(
    (goal) => goal.current >= goal.target
  ).length;
  const completionRate =
    periodGoals.length > 0 ? completedGoals / periodGoals.length : 0;

  return {
    totalSteps,
    totalDistance,
    totalDuration,
    averageDailySteps,
    bestDay,
    activityCount: periodActivities.length,
    completionRate,
  };
}

// Calculate streak information
export function calculateStreaks(
  activities: Activity[],
  minStepsPerDay: number = 100
): StreakInfo {
  if (activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  }

  // Get all unique days with activities
  const dayMap = new Map<string, number>();
  activities.forEach((activity) => {
    const date = new Date(activity.started_at);
    const dateKey = date.toISOString().split('T')[0];
    const currentSteps = dayMap.get(dateKey) || 0;
    dayMap.set(dateKey, currentSteps + activity.steps);
  });

  // Convert to array of dates with steps
  const activeDays = Array.from(dayMap.entries())
    .map(([dateKey, steps]) => ({
      date: new Date(dateKey),
      steps,
    }))
    .filter((day) => day.steps >= minStepsPerDay)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (activeDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  }

  // Calculate longest streak
  let longestStreak = 1;
  let currentStreakLength = 1;

  for (let i = 1; i < activeDays.length; i++) {
    const prevDate = activeDays[i - 1].date;
    const currDate = activeDays[i].date;
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreakLength++;
      longestStreak = Math.max(longestStreak, currentStreakLength);
    } else {
      currentStreakLength = 1;
    }
  }

  // Calculate current streak (from today backwards)
  const today = getStartOfDay(new Date());
  let currentStreak = 0;
  let checkDate = new Date(today);

  // Check if today has activity
  const todayKey = today.toISOString().split('T')[0];
  const todaySteps = dayMap.get(todayKey) || 0;
  if (todaySteps >= minStepsPerDay) {
    currentStreak = 1;
  }

  // Check backwards from yesterday
  checkDate = addDays(checkDate, -1);
  while (true) {
    const dateKey = checkDate.toISOString().split('T')[0];
    const steps = dayMap.get(dateKey) || 0;
    if (steps >= minStepsPerDay) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  const lastActiveDate = activeDays[activeDays.length - 1].date;

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
  };
}

// Get personal records
export function getPersonalRecords(activities: Activity[]): PersonalRecord[] {
  if (activities.length === 0) return [];

  const records: PersonalRecord[] = [];

  // Most steps in a single activity
  const mostStepsActivity = activities.reduce((max, activity) =>
    activity.steps > max.steps ? activity : max
  );
  records.push({
    category: 'Most Steps',
    value: mostStepsActivity.steps,
    date: new Date(mostStepsActivity.started_at),
    label: formatNumber(mostStepsActivity.steps),
  });

  // Longest distance
  const longestDistanceActivity = activities.reduce((max, activity) =>
    activity.distance_m > max.distance_m ? activity : max
  );
  records.push({
    category: 'Longest Distance',
    value: longestDistanceActivity.distance_m,
    date: new Date(longestDistanceActivity.started_at),
    label: formatDistance(longestDistanceActivity.distance_m),
  });

  // Longest duration
  const longestDurationActivity = activities.reduce((max, activity) =>
    activity.duration_ms > max.duration_ms ? activity : max
  );
  records.push({
    category: 'Longest Activity',
    value: longestDurationActivity.duration_ms,
    date: new Date(longestDurationActivity.started_at),
    label: formatDuration(longestDurationActivity.duration_ms),
  });

  // Most steps in a day
  const dayMap = new Map<string, number>();
  activities.forEach((activity) => {
    const dateKey = new Date(activity.started_at).toISOString().split('T')[0];
    const currentSteps = dayMap.get(dateKey) || 0;
    dayMap.set(dateKey, currentSteps + activity.steps);
  });

  let bestDaySteps = 0;
  let bestDayDate = new Date();
  dayMap.forEach((steps, dateKey) => {
    if (steps > bestDaySteps) {
      bestDaySteps = steps;
      bestDayDate = new Date(dateKey);
    }
  });

  records.push({
    category: 'Best Day',
    value: bestDaySteps,
    date: bestDayDate,
    label: formatNumber(bestDaySteps),
  });

  return records;
}

// Get activity breakdown by type
export function getActivityBreakdown(
  activities: Activity[],
  startDate: Date,
  endDate: Date
): ActivityBreakdown[] {
  const periodActivities = getActivitiesInRange(activities, startDate, endDate);

  // Group by activity type (we'll use profile_id as a proxy for type since activities don't have explicit type)
  const typeMap = new Map<string, Activity[]>();

  periodActivities.forEach((activity) => {
    // Extract activity type from profile_id or default to 'Walking'
    const type = activity.profile_id.includes('running')
      ? 'Running'
      : activity.profile_id.includes('hiking')
        ? 'Hiking'
        : 'Walking';

    const existing = typeMap.get(type) || [];
    existing.push(activity);
    typeMap.set(type, existing);
  });

  const totalSteps = periodActivities.reduce((sum, a) => sum + a.steps, 0);

  const breakdown: ActivityBreakdown[] = [];
  typeMap.forEach((acts, type) => {
    const typeSteps = acts.reduce((sum, a) => sum + a.steps, 0);
    breakdown.push({
      type,
      count: acts.length,
      steps: typeSteps,
      distance: acts.reduce((sum, a) => sum + a.distance_m, 0),
      duration: acts.reduce((sum, a) => sum + a.duration_ms, 0),
      percentage: totalSteps > 0 ? typeSteps / totalSteps : 0,
    });
  });

  // Sort by steps descending
  return breakdown.sort((a, b) => b.steps - a.steps);
}

// Compare current period with previous period
export function comparePeriods(
  activities: Activity[],
  goals: Goal[],
  currentStart: Date,
  currentEnd: Date
): PeriodComparison {
  const periodLength = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodLength);
  const previousEnd = new Date(currentStart.getTime() - 1);

  const current = calculatePeriodStats(activities, goals, currentStart, currentEnd);
  const previous = calculatePeriodStats(activities, goals, previousStart, previousEnd);

  const changes = {
    steps: previous.totalSteps > 0
      ? (current.totalSteps - previous.totalSteps) / previous.totalSteps
      : 0,
    distance: previous.totalDistance > 0
      ? (current.totalDistance - previous.totalDistance) / previous.totalDistance
      : 0,
    duration: previous.totalDuration > 0
      ? (current.totalDuration - previous.totalDuration) / previous.totalDuration
      : 0,
    completionRate: current.completionRate - previous.completionRate,
  };

  return {
    current,
    previous,
    changes,
  };
}

// Generate chart data for weekly steps
export function getWeeklyStepsData(
  activities: Activity[],
  weeks: number = 4
): { labels: string[]; data: number[] } {
  const labels: string[] = [];
  const data: number[] = [];

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekActivities = getActivitiesInRange(activities, weekStart, weekEnd);
    const weekSteps = weekActivities.reduce((sum, a) => sum + a.steps, 0);

    // Label as "Week X" or date range
    const label = i === 0 ? 'This Week' : `W-${i}`;
    labels.push(label);
    data.push(weekSteps);
  }

  return { labels, data };
}

// Generate chart data for last N days
export function getDailyTrendData(
  activities: Activity[],
  days: number = 30
): { labels: string[]; data: number[] } {
  const labels: string[] = [];
  const data: number[] = [];

  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);

    const dayActivities = getActivitiesInRange(activities, dayStart, dayEnd);
    const daySteps = dayActivities.reduce((sum, a) => sum + a.steps, 0);

    // Label every 5th day or first/last
    if (i === 0 || i === days - 1 || i % 5 === 0) {
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    } else {
      labels.push('');
    }
    data.push(daySteps);
  }

  return { labels, data };
}

// Get date range for period selector
export function getPeriodDates(
  period: 'week' | 'month' | 'lastMonth' | 'allTime'
): { start: Date; end: Date } {
  const today = new Date();
  const end = getEndOfDay(today);

  switch (period) {
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: getStartOfDay(start), end };
    }
    case 'month': {
      const start = new Date(today);
      start.setDate(1);
      return { start: getStartOfDay(start), end };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: getStartOfDay(start), end: getEndOfDay(lastMonthEnd) };
    }
    case 'allTime':
    default: {
      // Return last 365 days as a reasonable default
      const start = new Date(today);
      start.setDate(today.getDate() - 365);
      return { start: getStartOfDay(start), end };
    }
  }
}
