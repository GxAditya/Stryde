import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActivityStore } from '@/stores/activity-store';
import { Activity } from '@/lib/db';

const { width } = Dimensions.get('window');

// GitHub-style heatmap helpers
function getLast365Days() {
    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date);
    }
    return days;
}

function getActivityLevel(steps: number): number {
    if (steps === 0) return 0;
    if (steps < 3000) return 1;
    if (steps < 7000) return 2;
    if (steps < 10000) return 3;
    return 4;
}

export default function InsightsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';

    const { loadActivities, activities, getActivitiesForDateRange } = useActivityStore();
    const [weeklyData, setWeeklyData] = useState<{ day: string; steps: number; highlight: boolean }[]>([]);
    const [streak, setStreak] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [weeklySteps, setWeeklySteps] = useState(0);
    const [heatmapData, setHeatmapData] = useState<{ date: Date; level: number }[]>([]);

    useEffect(() => {
        loadActivities(365);
    }, []);

    useEffect(() => {
        if (activities) {
            // Calculate weekly data (last 7 days)
            const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const last7Days = [];
            const today = new Date();
            let weekSteps = 0;

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dayActivities = activities.filter(a => {
                    const actDate = new Date(a.started_at);
                    return actDate.toDateString() === date.toDateString();
                });
                const daySteps = dayActivities.reduce((sum, a) => sum + a.steps, 0);
                weekSteps += daySteps;
                last7Days.push({
                    day: days[date.getDay()],
                    steps: daySteps,
                    highlight: i === 0,
                });
            }

            setWeeklyData(last7Days);
            setWeeklySteps(weekSteps);

            // Calculate total steps
            const total = activities.reduce((sum, a) => sum + a.steps, 0);
            setTotalSteps(total);

            // Calculate streak
            let currentStreak = 0;
            const sortedActivities = [...activities].sort((a, b) =>
                new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            );

            let checkDate = new Date();
            checkDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < 365; i++) {
                const dayActivities = sortedActivities.filter(a => {
                    const actDate = new Date(a.started_at);
                    actDate.setHours(0, 0, 0, 0);
                    return actDate.getTime() === checkDate.getTime();
                });

                if (dayActivities.length > 0) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            setStreak(currentStreak);

            // Generate heatmap data
            const last365 = getLast365Days();
            const heatmap = last365.map(date => {
                const dayActivities = activities.filter(a => {
                    const actDate = new Date(a.started_at);
                    return actDate.toDateString() === date.toDateString();
                });
                const daySteps = dayActivities.reduce((sum, a) => sum + a.steps, 0);
                return {
                    date,
                    level: getActivityLevel(daySteps),
                };
            });
            setHeatmapData(heatmap);
        }
    }, [activities]);

    const maxSteps = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.steps), 1) : 1;
    const avgDailySteps = weeklySteps > 0 ? Math.floor(weeklySteps / 7) : 0;
    const peakDay = weeklyData.length > 0
        ? weeklyData.reduce((max, d) => d.steps > max.steps ? d : max, weeklyData[0])
        : { day: '-', steps: 0, highlight: false };

    // Group heatmap by weeks
    const weeks: { date: Date; level: number }[][] = [];
    let currentWeek: { date: Date; level: number }[] = [];

    heatmapData.forEach((day, index) => {
        if (index % 7 === 0 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(day);
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Streak-based stories
    const stories = [];
    if (streak >= 7) {
        stories.push({ id: 1, title: `${streak}-Day Streak 🔥`, icon: 'local-fire-department' });
    }
    if (totalSteps >= 100000) {
        stories.push({ id: 2, title: '100K Steps', icon: 'workspace-premium' });
    }
    if (weeklySteps >= 50000) {
        stories.push({ id: 3, title: 'Weekly Goal', icon: 'star' });
    }
    if (stories.length === 0) {
        stories.push({ id: 1, title: 'Start Today', icon: 'play-arrow' });
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Streaks Stories */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Achievements</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
                    {stories.map((story) => (
                        <View key={story.id} style={styles.storyItem}>
                            <View style={[styles.storyCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? `${DesignTokens.primary}40` : colors.border }]}>
                                <MaterialIcons name={story.icon as any} size={32} color={DesignTokens.primary} />
                            </View>
                            <Text style={[styles.storyTitle, { color: colors.text }]}>{story.title}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Activity Heatmap - GitHub Style */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Heatmap</Text>
                    <Text style={[styles.sectionSubtitle, { color: isDark ? '#9db9a8' : '#64748b' }]}>
                        Last 365 days
                    </Text>
                </View>

                <View style={[styles.heatmapCard, { backgroundColor: isDark ? '#1c2720' : colors.white }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.heatmapContainer}>
                            {weeks.map((week, weekIndex) => (
                                <View key={weekIndex} style={styles.heatmapColumn}>
                                    {week.map((day, dayIndex) => (
                                        <View
                                            key={dayIndex}
                                            style={[
                                                styles.heatmapCell,
                                                {
                                                    backgroundColor:
                                                        day.level === 0 ? (isDark ? '#1c2720' : '#e2e8f0') :
                                                            day.level === 1 ? '#13EC6D40' :
                                                                day.level === 2 ? '#13EC6D80' :
                                                                    day.level === 3 ? '#13EC6DB0' :
                                                                        DesignTokens.primary,
                                                    borderColor: isDark ? '#3b5445' : colors.border,
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.heatmapLegend}>
                        <Text style={[styles.legendText, { color: isDark ? '#9db9a8' : '#64748b' }]}>Less</Text>
                        {[0, 1, 2, 3, 4].map(level => (
                            <View
                                key={level}
                                style={[
                                    styles.legendCell,
                                    {
                                        backgroundColor:
                                            level === 0 ? (isDark ? '#1c2720' : '#e2e8f0') :
                                                level === 1 ? '#13EC6D40' :
                                                    level === 2 ? '#13EC6D80' :
                                                        level === 3 ? '#13EC6DB0' :
                                                            DesignTokens.primary,
                                        borderColor: isDark ? '#3b5445' : colors.border,
                                    }
                                ]}
                            />
                        ))}
                        <Text style={[styles.legendText, { color: isDark ? '#9db9a8' : '#64748b' }]}>More</Text>
                    </View>
                </View>

                {/* Weekly Trends Chart */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
                </View>

                <View style={[styles.chartCard, { backgroundColor: isDark ? '#1c2720' : colors.white }]}>
                    <View style={styles.chartContainer}>
                        {weeklyData.map((item, index) => (
                            <View key={index} style={styles.barColumn}>
                                <View style={[
                                    styles.bar,
                                    {
                                        height: `${(item.steps / maxSteps) * 100}%`,
                                        backgroundColor: item.highlight ? DesignTokens.primary : (isDark ? 'rgba(19, 236, 109, 0.4)' : '#e2e8f0'),
                                        opacity: item.highlight ? 1 : 0.4 + ((item.steps / maxSteps) * 0.6)
                                    }
                                ]} />
                                <Text style={[
                                    styles.dayLabel,
                                    { color: item.highlight ? DesignTokens.primary : (isDark ? '#9db9a8' : colors.textSecondary) }
                                ]}>{item.day}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.chartFooter, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
                        <View>
                            <Text style={styles.statLabel}>Peak steps ({peakDay.day})</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{peakDay.steps.toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>Daily Avg</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{avgDailySteps.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Summary */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statCardValue, { color: colors.text }]}>{streak}</Text>
                        <Text style={[styles.statCardLabel, { color: isDark ? '#9db9a8' : '#64748b' }]}>Day Streak</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white }]}>
                        <MaterialIcons name="directions-walk" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statCardValue, { color: colors.text }]}>{(totalSteps / 1000).toFixed(1)}K</Text>
                        <Text style={[styles.statCardLabel, { color: isDark ? '#9db9a8' : '#64748b' }]}>Total Steps</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    sectionSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    storiesContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    storyItem: {
        gap: 8,
        alignItems: 'center',
    },
    storyCard: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyTitle: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '500',
        width: 80,
    },
    heatmapCard: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
    },
    heatmapContainer: {
        flexDirection: 'row',
        gap: 3,
    },
    heatmapColumn: {
        gap: 3,
    },
    heatmapCell: {
        width: 10,
        height: 10,
        borderRadius: 2,
        borderWidth: 1,
    },
    heatmapLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 16,
        justifyContent: 'flex-end',
    },
    legendText: {
        fontSize: 11,
    },
    legendCell: {
        width: 10,
        height: 10,
        borderRadius: 2,
        borderWidth: 1,
    },
    chartCard: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
        marginBottom: 16,
        paddingBottom: 4,
    },
    barColumn: {
        alignItems: 'center',
        gap: 8,
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 4,
        minHeight: 4,
    },
    dayLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#9db9a8',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    statCardValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    statCardLabel: {
        fontSize: 12,
    },
});
