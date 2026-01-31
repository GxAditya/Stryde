/**
 * Year-End Wrap-Up functionality for Stryde
 * Provides personality classification, annual statistics, and story generation
 */

import { Activity, Goal } from '@/lib/db';
import {
  calculatePeriodStats,
  calculateStreaks,
  getPersonalRecords,
  formatNumber,
  formatDistance,
  formatDuration,
  getActivitiesInRange,
} from '@/lib/statistics';

// Personality Types
export type PersonalityType =
  | 'explorer'
  | 'consistent'
  | 'goal-crusher'
  | 'early-bird'
  | 'night-owl'
  | 'weekender';

export interface Personality {
  type: PersonalityType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const PERSONALITIES: Record<PersonalityType, Personality> = {
  explorer: {
    type: 'explorer',
    name: 'The Explorer',
    description: 'You love discovering new routes and exploring different paths. Variety is the spice of your fitness journey!',
    icon: 'compass',
    color: '#8B5CF6', // Violet
  },
  consistent: {
    type: 'consistent',
    name: 'The Consistent',
    description: 'Day in, day out, you show up. Your dedication to regular activity is truly inspiring.',
    icon: 'calendar',
    color: '#22C55E', // Green
  },
  'goal-crusher': {
    type: 'goal-crusher',
    name: 'The Goal Crusher',
    description: 'When you set a target, nothing stands in your way. You turn goals into achievements!',
    icon: 'trophy',
    color: '#F59E0B', // Amber
  },
  'early-bird': {
    type: 'early-bird',
    name: 'The Early Bird',
    description: 'While others sleep, you stride. The morning hours belong to you!',
    icon: 'sunny',
    color: '#F97316', // Orange
  },
  'night-owl': {
    type: 'night-owl',
    name: 'The Night Owl',
    description: 'Your energy peaks when the sun goes down. Evening strides are your specialty!',
    icon: 'moon',
    color: '#6366F1', // Indigo
  },
  weekender: {
    type: 'weekender',
    name: 'The Weekender',
    description: 'You pack your activity into epic weekend adventures. Quality over quantity!',
    icon: 'rocket',
    color: '#EC4899', // Pink
  },
};

// Annual Statistics
export interface AnnualStats {
  year: number;
  totalSteps: number;
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  averageDailySteps: number;
  bestDay: { date: Date; steps: number } | null;
  bestMonth: { month: number; steps: number } | null;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
}

// Achievement Types
export type AchievementType =
  | 'step-milestone'
  | 'distance-milestone'
  | 'streak-milestone'
  | 'activity-milestone'
  | 'goal-milestone'
  | 'record-breaker';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  value?: number;
}

// Year-over-Year Comparison
export interface YearOverYearComparison {
  currentYear: AnnualStats;
  previousYear: AnnualStats | null;
  changes: {
    steps: number;
    distance: number;
    duration: number;
    activities: number;
    activeDays: number;
  };
  improvements: string[];
}

// Story Card Types
export type StoryCardType =
  | 'intro'
  | 'stats-overview'
  | 'personality-reveal'
  | 'achievements'
  | 'highlights'
  | 'comparison'
  | 'share';

export interface StoryCard {
  id: string;
  type: StoryCardType;
  title: string;
  subtitle?: string;
  content: string;
  data?: Record<string, unknown>;
}

// Helper: Get year date range
function getYearDateRange(year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

// Helper: Get previous year
function getPreviousYear(year: number): number {
  return year - 1;
}

// Helper: Get month name
function getMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[month];
}

// Calculate annual statistics
export function calculateAnnualStats(
  activities: Activity[],
  year: number
): AnnualStats {
  const { start, end } = getYearDateRange(year);
  const yearActivities = getActivitiesInRange(activities, start, end);

  const totalSteps = yearActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalDistance = yearActivities.reduce((sum, a) => sum + a.distance_m, 0);
  const totalDuration = yearActivities.reduce((sum, a) => sum + a.duration_ms, 0);

  // Aggregate by day
  const dayMap = new Map<string, number>();
  const monthMap = new Map<number, number>();

  yearActivities.forEach((activity) => {
    const date = new Date(activity.started_at);
    const dateKey = date.toISOString().split('T')[0];
    const month = date.getMonth();

    // Daily aggregation
    const currentDaySteps = dayMap.get(dateKey) || 0;
    dayMap.set(dateKey, currentDaySteps + activity.steps);

    // Monthly aggregation
    const currentMonthSteps = monthMap.get(month) || 0;
    monthMap.set(month, currentMonthSteps + activity.steps);
  });

  // Find best day
  let bestDay: { date: Date; steps: number } | null = null;
  dayMap.forEach((steps, dateKey) => {
    if (!bestDay || steps > bestDay.steps) {
      bestDay = { date: new Date(dateKey), steps };
    }
  });

  // Find best month
  let bestMonth: { month: number; steps: number } | null = null;
  monthMap.forEach((steps, month) => {
    if (!bestMonth || steps > bestMonth.steps) {
      bestMonth = { month, steps };
    }
  });

  // Calculate streaks
  const streakInfo = calculateStreaks(yearActivities);

  return {
    year,
    totalSteps,
    totalDistance,
    totalDuration,
    totalActivities: yearActivities.length,
    averageDailySteps: Math.round(totalSteps / 365),
    bestDay,
    bestMonth,
    activeDays: dayMap.size,
    longestStreak: streakInfo.longestStreak,
    currentStreak: streakInfo.currentStreak,
  };
}

// Calculate route diversity score (for Explorer personality)
function calculateRouteDiversity(activities: Activity[]): number {
  if (activities.length === 0) return 0;

  // Count unique route signatures based on start/end coordinates
  const routeSignatures = new Set<string>();

  activities.forEach((activity) => {
    if (activity.route_points.length >= 2) {
      const start = activity.route_points[0];
      const end = activity.route_points[activity.route_points.length - 1];
      // Round coordinates to reduce precision and group nearby routes
      const sig = `${Math.round(start.latitude * 100) / 100},${Math.round(start.longitude * 100) / 100}-${Math.round(end.latitude * 100) / 100},${Math.round(end.longitude * 100) / 100}`;
      routeSignatures.add(sig);
    }
  });

  // Diversity score: unique routes / total activities
  return routeSignatures.size / activities.length;
}

// Calculate consistency score (for Consistent personality)
function calculateConsistencyScore(activities: Activity[], year: number): number {
  if (activities.length === 0) return 0;

  const { start, end } = getYearDateRange(year);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const activeDays = new Set(
    activities.map((a) => new Date(a.started_at).toISOString().split('T')[0])
  ).size;

  return activeDays / totalDays;
}

// Calculate goal completion rate (for Goal Crusher personality)
function calculateGoalCompletionRate(goals: Goal[], year: number): number {
  const yearGoals = goals.filter((goal) => {
    const goalYear = new Date(goal.date).getFullYear();
    return goalYear === year;
  });

  if (yearGoals.length === 0) return 0;

  const completedGoals = yearGoals.filter((goal) => goal.current >= goal.target).length;
  return completedGoals / yearGoals.length;
}

// Calculate time-of-day preference
function calculateTimePreference(activities: Activity[]): {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
} {
  const distribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  activities.forEach((activity) => {
    const hour = new Date(activity.started_at).getHours();

    if (hour >= 5 && hour < 12) {
      distribution.morning++;
    } else if (hour >= 12 && hour < 17) {
      distribution.afternoon++;
    } else if (hour >= 17 && hour < 21) {
      distribution.evening++;
    } else {
      distribution.night++;
    }
  });

  return distribution;
}

// Calculate weekend vs weekday preference
function calculateWeekendPreference(activities: Activity[]): number {
  if (activities.length === 0) return 0;

  const weekendActivities = activities.filter((activity) => {
    const day = new Date(activity.started_at).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });

  return weekendActivities.length / activities.length;
}

// Classify personality based on activity patterns
export function classifyPersonality(
  activities: Activity[],
  goals: Goal[],
  year: number
): Personality {
  const { start, end } = getYearDateRange(year);
  const yearActivities = getActivitiesInRange(activities, start, end);

  if (yearActivities.length === 0) {
    return PERSONALITIES.consistent; // Default personality
  }

  // Calculate all personality scores
  const scores: Record<PersonalityType, number> = {
    explorer: 0,
    consistent: 0,
    'goal-crusher': 0,
    'early-bird': 0,
    'night-owl': 0,
    weekender: 0,
  };

  // Explorer: High route diversity
  const diversityScore = calculateRouteDiversity(yearActivities);
  scores.explorer = diversityScore * 100;

  // Consistent: High activity frequency throughout the year
  const consistencyScore = calculateConsistencyScore(yearActivities, year);
  scores.consistent = consistencyScore * 100;

  // Goal Crusher: High goal completion rate
  const goalRate = calculateGoalCompletionRate(goals, year);
  scores['goal-crusher'] = goalRate * 100;

  // Early Bird / Night Owl: Time preference
  const timeDist = calculateTimePreference(yearActivities);
  const totalTimeActivities = timeDist.morning + timeDist.afternoon + timeDist.evening + timeDist.night;
  if (totalTimeActivities > 0) {
    scores['early-bird'] = (timeDist.morning / totalTimeActivities) * 100;
    scores['night-owl'] = ((timeDist.evening + timeDist.night) / totalTimeActivities) * 100;
  }

  // Weekender: High weekend activity percentage
  const weekendScore = calculateWeekendPreference(yearActivities);
  scores.weekender = weekendScore * 100;

  // Find highest scoring personality
  let bestType: PersonalityType = 'consistent';
  let bestScore = 0;

  (Object.keys(scores) as PersonalityType[]).forEach((type) => {
    if (scores[type] > bestScore) {
      bestScore = scores[type];
      bestType = type;
    }
  });

  return PERSONALITIES[bestType];
}

// Detect achievements for the year
export function detectAchievements(
  activities: Activity[],
  goals: Goal[],
  stats: AnnualStats
): Achievement[] {
  const achievements: Achievement[] = [];

  // Step milestones
  const stepMilestones = [
    { threshold: 1000000, title: 'Million Steps', description: 'Walked over 1 million steps!', icon: 'footsteps' },
    { threshold: 5000000, title: '5 Million Steps', description: 'Walked over 5 million steps!', icon: 'footsteps' },
    { threshold: 10000000, title: '10 Million Steps', description: 'Walked over 10 million steps!', icon: 'footsteps' },
  ];

  stepMilestones.forEach((milestone) => {
    if (stats.totalSteps >= milestone.threshold) {
      achievements.push({
        id: `step-${milestone.threshold}`,
        type: 'step-milestone',
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        unlockedAt: new Date(),
        value: stats.totalSteps,
      });
    }
  });

  // Distance milestones
  const distanceMilestones = [
    { threshold: 1000000, title: '1,000 KM Club', description: 'Walked over 1,000 kilometers!', icon: 'map' },
    { threshold: 5000000, title: '5,000 KM Club', description: 'Walked over 5,000 kilometers!', icon: 'map' },
  ];

  distanceMilestones.forEach((milestone) => {
    if (stats.totalDistance >= milestone.threshold) {
      achievements.push({
        id: `distance-${milestone.threshold}`,
        type: 'distance-milestone',
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        unlockedAt: new Date(),
        value: stats.totalDistance,
      });
    }
  });

  // Streak milestones
  const streakMilestones = [
    { threshold: 7, title: 'Week Warrior', description: '7-day activity streak!', icon: 'flame' },
    { threshold: 30, title: 'Month Master', description: '30-day activity streak!', icon: 'flame' },
    { threshold: 100, title: 'Century Streak', description: '100-day activity streak!', icon: 'flame' },
  ];

  streakMilestones.forEach((milestone) => {
    if (stats.longestStreak >= milestone.threshold) {
      achievements.push({
        id: `streak-${milestone.threshold}`,
        type: 'streak-milestone',
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        unlockedAt: new Date(),
        value: stats.longestStreak,
      });
    }
  });

  // Activity milestones
  const activityMilestones = [
    { threshold: 100, title: 'Century Club', description: 'Completed 100 activities!', icon: 'fitness' },
    { threshold: 500, title: '500 Activities', description: 'Completed 500 activities!', icon: 'fitness' },
    { threshold: 1000, title: 'Activity Master', description: 'Completed 1,000 activities!', icon: 'fitness' },
  ];

  activityMilestones.forEach((milestone) => {
    if (stats.totalActivities >= milestone.threshold) {
      achievements.push({
        id: `activity-${milestone.threshold}`,
        type: 'activity-milestone',
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        unlockedAt: new Date(),
        value: stats.totalActivities,
      });
    }
  });

  // Goal milestone
  const yearGoals = goals.filter((g) => new Date(g.date).getFullYear() === stats.year);
  const completedGoals = yearGoals.filter((g) => g.current >= g.target).length;

  if (completedGoals >= 50) {
    achievements.push({
      id: 'goal-master',
      type: 'goal-milestone',
      title: 'Goal Master',
      description: `Completed ${completedGoals} goals this year!`,
      icon: 'checkmark-circle',
      unlockedAt: new Date(),
      value: completedGoals,
    });
  }

  // Personal records
  const records = getPersonalRecords(activities);
  if (records.length > 0) {
    achievements.push({
      id: 'record-breaker',
      type: 'record-breaker',
      title: 'Record Breaker',
      description: 'Set new personal records this year!',
      icon: 'trophy',
      unlockedAt: new Date(),
    });
  }

  return achievements;
}

// Compare year-over-year statistics
export function compareYearOverYear(
  activities: Activity[],
  currentYear: number
): YearOverYearComparison {
  const currentStats = calculateAnnualStats(activities, currentYear);
  const previousYear = getPreviousYear(currentYear);
  const previousStats = calculateAnnualStats(activities, previousYear);

  const changes = {
    steps: previousStats.totalSteps > 0
      ? (currentStats.totalSteps - previousStats.totalSteps) / previousStats.totalSteps
      : 0,
    distance: previousStats.totalDistance > 0
      ? (currentStats.totalDistance - previousStats.totalDistance) / previousStats.totalDistance
      : 0,
    duration: previousStats.totalDuration > 0
      ? (currentStats.totalDuration - previousStats.totalDuration) / previousStats.totalDuration
      : 0,
    activities: previousStats.totalActivities > 0
      ? (currentStats.totalActivities - previousStats.totalActivities) / previousStats.totalActivities
      : 0,
    activeDays: previousStats.activeDays > 0
      ? (currentStats.activeDays - previousStats.activeDays) / previousStats.activeDays
      : 0,
  };

  // Generate improvement highlights
  const improvements: string[] = [];

  if (changes.steps > 0.1) {
    improvements.push(`Steps increased by ${Math.round(changes.steps * 100)}%`);
  }
  if (changes.distance > 0.1) {
    improvements.push(`Distance increased by ${Math.round(changes.distance * 100)}%`);
  }
  if (changes.activeDays > 0) {
    improvements.push(`${currentStats.activeDays - previousStats.activeDays} more active days`);
  }
  if (currentStats.longestStreak > previousStats.longestStreak) {
    improvements.push(`New longest streak: ${currentStats.longestStreak} days`);
  }

  return {
    currentYear: currentStats,
    previousYear: previousStats.totalActivities > 0 ? previousStats : null,
    changes,
    improvements,
  };
}

// Generate story cards for the wrap-up experience
export function generateStoryCards(
  stats: AnnualStats,
  personality: Personality,
  achievements: Achievement[],
  comparison: YearOverYearComparison
): StoryCard[] {
  const cards: StoryCard[] = [];

  // Intro card
  cards.push({
    id: 'intro',
    type: 'intro',
    title: `Your ${stats.year} in Motion`,
    subtitle: 'Let\'s look back at your year',
    content: 'Every step tells a story. Here\'s how you moved through the year.',
  });

  // Stats overview card
  cards.push({
    id: 'stats-overview',
    type: 'stats-overview',
    title: 'By the Numbers',
    content: `You took ${formatNumber(stats.totalSteps)} steps across ${stats.activeDays} active days.`,
    data: {
      steps: stats.totalSteps,
      distance: formatDistance(stats.totalDistance),
      duration: formatDuration(stats.totalDuration),
      activities: stats.totalActivities,
      activeDays: stats.activeDays,
    },
  });

  // Personality reveal card
  cards.push({
    id: 'personality-reveal',
    type: 'personality-reveal',
    title: 'Your Stride Personality',
    subtitle: personality.name,
    content: personality.description,
    data: {
      personalityType: personality.type,
      personalityColor: personality.color,
      personalityIcon: personality.icon,
    },
  });

  // Achievements card
  if (achievements.length > 0) {
    cards.push({
      id: 'achievements',
      type: 'achievements',
      title: 'Achievements Unlocked',
      content: `You earned ${achievements.length} achievements this year!`,
      data: { achievements },
    });
  }

  // Highlights card
  const highlights: string[] = [];
  if (stats.bestDay) {
    highlights.push(`Best day: ${formatNumber(stats.bestDay.steps)} steps on ${stats.bestDay.date.toLocaleDateString()}`);
  }
  if (stats.bestMonth) {
    highlights.push(`Best month: ${getMonthName(stats.bestMonth.month)} with ${formatNumber(stats.bestMonth.steps)} steps`);
  }
  if (stats.longestStreak > 7) {
    highlights.push(`Longest streak: ${stats.longestStreak} days`);
  }

  if (highlights.length > 0) {
    cards.push({
      id: 'highlights',
      type: 'highlights',
      title: 'Year Highlights',
      content: highlights.join('. '),
      data: { highlights },
    });
  }

  // Comparison card (if previous year data exists)
  if (comparison.previousYear && comparison.improvements.length > 0) {
    cards.push({
      id: 'comparison',
      type: 'comparison',
      title: 'Year Over Year',
      content: comparison.improvements.join('. '),
      data: { changes: comparison.changes },
    });
  }

  // Share card
  cards.push({
    id: 'share',
    type: 'share',
    title: 'Share Your Journey',
    content: 'Share your year with friends and inspire others to get moving!',
  });

  return cards;
}

// Check if year-end wrap-up is available
export function isWrapUpAvailable(activities: Activity[], year?: number): boolean {
  const targetYear = year || new Date().getFullYear();
  const { start, end } = getYearDateRange(targetYear);
  const yearActivities = getActivitiesInRange(activities, start, end);

  // Wrap-up is available if user has at least 7 days of activity
  const activeDays = new Set(
    yearActivities.map((a) => new Date(a.started_at).toISOString().split('T')[0])
  ).size;

  return activeDays >= 7;
}

// Get shareable text summary
export function generateShareText(stats: AnnualStats, personality: Personality): string {
  const lines = [
    `My ${stats.year} with Stryde 🚀`,
    '',
    `🏃 ${formatNumber(stats.totalSteps)} steps`,
    `📍 ${formatDistance(stats.totalDistance)}`,
    `⏱️ ${formatDuration(stats.totalDuration)}`,
    `📅 ${stats.activeDays} active days`,
    '',
    `I'm ${personality.name}! ${personality.description}`,
    '',
    '#Stryde #YearInReview',
  ];

  return lines.join('\n');
}

// Generate wrap-up data (main entry point)
export interface WrapUpData {
  year: number;
  stats: AnnualStats;
  personality: Personality;
  achievements: Achievement[];
  comparison: YearOverYearComparison;
  storyCards: StoryCard[];
  shareText: string;
}

export function generateWrapUp(
  activities: Activity[],
  goals: Goal[],
  year?: number
): WrapUpData | null {
  const targetYear = year || new Date().getFullYear();

  if (!isWrapUpAvailable(activities, targetYear)) {
    return null;
  }

  const stats = calculateAnnualStats(activities, targetYear);
  const personality = classifyPersonality(activities, goals, targetYear);
  const achievements = detectAchievements(activities, goals, stats);
  const comparison = compareYearOverYear(activities, targetYear);
  const storyCards = generateStoryCards(stats, personality, achievements, comparison);
  const shareText = generateShareText(stats, personality);

  return {
    year: targetYear,
    stats,
    personality,
    achievements,
    comparison,
    storyCards,
    shareText,
  };
}
