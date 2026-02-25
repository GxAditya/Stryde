import { Card } from '@/components/card';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toggleDeepworkMode } from '@/lib/notifications';
import { useActivityStore } from '@/stores/activity-store';
import { useDeepworkStore } from '@/stores/deepwork-store';
import { useGoalStore } from '@/stores/goal-store';
import { useHydrationStore } from '@/stores/hydration-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Progress Ring Component
const ProgressRing = ({ progress, total }: { progress: number; total: number }) => {
    const size = 250;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const safeTotal = total > 0 ? total : 10000;
    const progressOffset = circumference - (Math.min(progress, safeTotal) / safeTotal) * circumference;

    return (
        <View style={styles.ringContainer}>
            <Svg width={size} height={size} style={styles.ring}>
                {/* Background Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={DesignTokens.primary}
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.1}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={DesignTokens.primary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={styles.ringContent}>
                <Text style={styles.ringValue}>{progress.toLocaleString()}</Text>
                <Text style={styles.ringLabel}>steps</Text>
            </View>
        </View>
    );
};

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter(); // Initialize router hook

    // Data Stores
    const { loadActivities, getTodayStats } = useActivityStore();
    const { loadLogs, todayTotal: hydrationTotal, dailyGoal: hydrationGoal, quickAdd, getTodayLogs, deleteLog } = useHydrationStore();
    const { loadGoals, autoCreateDailyGoals, getTodayGoals } = useGoalStore();
    const { deepworkEnabled, loadSettings, toggleDeepwork, hydrationIntervalMinutes, stretchIntervalMinutes } = useDeepworkStore();

    // Load deepwork settings on mount
    React.useEffect(() => {
        loadSettings();
    }, []);

    // Handle deepwork toggle
    const handleDeepworkToggle = async (value: boolean) => {
        await toggleDeepworkMode(value, hydrationIntervalMinutes, stretchIntervalMinutes);
        await toggleDeepwork();
    };

    // Refresh data when screen receives focus
    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                await loadActivities();
                await loadLogs();
                await loadGoals();
                await autoCreateDailyGoals();
            };
            fetchData();
        }, [])
    );

    const stats = getTodayStats();
    const todayGoals = getTodayGoals();
    const stepGoal = todayGoals.find(g => g.type === 'daily_steps')?.target || 10000;
    const remainingSteps = Math.max(0, stepGoal - stats.steps);

    // Calories: roughly estimated if not returned by generic stats, but stats has it if we tracked it?
    // Actually getTodayStats returns { steps, distance, duration }. Calories isn't in there yet?
    // Let's check getTodayStats in activity-store.ts again.
    // It returns { steps: number; distance: number; duration: number }.
    // We can estimate calories for display: ~0.04 kcal per step is a generic rule of thumb
    const caloriesBurned = Math.round(stats.steps * 0.04);
    const distanceKm = (stats.distance / 1000).toFixed(2);
    const activeMinutes = Math.round(stats.duration / 60000);

    // Hydration bubbles: 1 bubble = 250ml
    const bubbleCount = Math.floor(hydrationTotal / 250);
    const todayLogs = getTodayLogs();

    const renderHydrationBubbles = () => {
        const bubbles = [];
        for (let i = 0; i < bubbleCount; i++) {
            const log = todayLogs[i];
            bubbles.push(
                <Pressable
                    key={i}
                    style={styles.bubbleButton}
                    onPress={() => {
                        if (log) {
                            deleteLog(log.id);
                        }
                    }}
                >
                    <View style={styles.bubbleContainer}>
                        <MaterialIcons name="water-drop" size={28} color={DesignTokens.primary} />
                    </View>
                </Pressable>
            );
        }
        return bubbles;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <MaterialIcons name="bolt" size={32} color={DesignTokens.primary} />
                </View>
                <Text style={[styles.appTitle, { color: colors.text }]}>Stryde</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Deep Work Toggle */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => router.push('/deepwork')}
                >
                    <Card style={StyleSheet.flatten([
                        styles.deepworkCard,
                        deepworkEnabled && styles.deepworkCardActive
                    ])}>
                        <View style={styles.deepworkContent}>
                            <View style={styles.deepworkIconContainer}>
                                <Ionicons 
                                    name={deepworkEnabled ? 'bulb' : 'bulb-outline'} 
                                    size={28} 
                                    color={deepworkEnabled ? '#FFD700' : DesignTokens.primary} 
                                />
                            </View>
                            <View style={styles.deepworkInfo}>
                                <Text style={styles.deepworkTitle}>Deep Work</Text>
                                <Text style={styles.deepworkDescription}>
                                    {deepworkEnabled 
                                        ? `Focus mode active - hydration & stretch reminders`
                                        : 'Tap to enable focus mode with reminders'}
                                </Text>
                            </View>
                            <Switch
                                value={deepworkEnabled}
                                onValueChange={handleDeepworkToggle}
                                trackColor={{ false: '#767577', true: DesignTokens.primary }}
                                thumbColor={deepworkEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </Card>
                </TouchableOpacity>

                {/* Progress Ring Section */}
                <View style={styles.section}>
                    <ProgressRing progress={stats.steps} total={stepGoal} />
                    <Text style={[styles.subtext, { color: isDark ? DesignTokens.primary : colors.textSecondary }]}>
                        {remainingSteps > 0
                            ? `${remainingSteps.toLocaleString()} steps to reach your daily goal`
                            : "Daily goal achieved! Great job!"}
                    </Text>
                </View>

                {/* Main CTA */}
                <View style={styles.ctaContainer}>
                    <Link href="/walking" asChild>
                        <Pressable style={styles.ctaButton}>
                            <MaterialIcons name="play-arrow" size={28} color={DesignTokens.background} />
                            <Text style={styles.ctaText}>Start Activity</Text>
                        </Pressable>
                    </Link>
                </View>

                {/* Stats Grid */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Stats</Text>
                <View style={styles.statsGrid}>
                    {/* Card 1: Calories */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <MaterialIcons name="local-fire-department" size={24} color={DesignTokens.primary} />
                            <Text style={styles.statLabel}>Calories</Text>
                        </View>
                        <Text style={styles.statValue}>
                            {caloriesBurned} <Text style={styles.statUnit}>kcal</Text>
                        </Text>
                    </View>

                    {/* Card 2: Distance */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <MaterialIcons name="map" size={24} color={DesignTokens.primary} />
                            <Text style={styles.statLabel}>Distance</Text>
                        </View>
                        <Text style={styles.statValue}>
                            {distanceKm} <Text style={styles.statUnit}>km</Text>
                        </Text>
                    </View>

                    {/* Card 3: Active */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <MaterialIcons name="timer" size={24} color={DesignTokens.primary} />
                            <Text style={styles.statLabel}>Active</Text>
                        </View>
                        <Text style={styles.statValue}>
                            {activeMinutes} <Text style={styles.statUnit}>min</Text>
                        </Text>
                    </View>
                </View>

                {/* Quick Log: Hydration */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Quick Log</Text>
                <View style={styles.hydrationCard}>
                    <View style={styles.hydrationHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="water-drop" size={24} color={DesignTokens.primary} />
                            <Text style={styles.hydrationTitle}>Hydration</Text>
                        </View>
                        <Text style={styles.hydrationValue}>{(hydrationTotal / 1000).toFixed(1)}L / {(hydrationGoal / 1000).toFixed(1)}L</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hydrationRow}>
                        {renderHydrationBubbles()}
                        <Pressable style={styles.addButton} onPress={() => router.push('/hydration')}>
                            <MaterialIcons name="add" size={24} color={DesignTokens.primary} />
                        </Pressable>
                    </ScrollView>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 8,
    },
    logoContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 8,
        fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }), // Should be Lexend if available
    },
    syncedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.2)',
    },
    syncedText: {
        color: DesignTokens.primary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    scrollContent: {
        paddingBottom: 100,
        paddingHorizontal: 16,
    },
    // Deep Work Card Styles
    deepworkCard: {
        marginTop: 16,
        marginBottom: 8,
        padding: 16,
    },
    deepworkCardActive: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    deepworkContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deepworkIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    deepworkInfo: {
        flex: 1,
    },
    deepworkTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: DesignTokens.textPrimary,
        marginBottom: 2,
    },
    deepworkDescription: {
        fontSize: 13,
        color: DesignTokens.textSecondary,
    },
    section: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    ringContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        transform: [{ rotate: '-90deg' }], // Already handled by svg rotation prop but good for safety
    },
    ringContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: DesignTokens.textPrimary,
    },
    ringLabel: {
        fontSize: 14,
        color: DesignTokens.textSecondary,
        opacity: 0.8,
    },
    subtext: {
        marginTop: 24,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
    },
    ctaContainer: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DesignTokens.primary,
        height: 56,
        borderRadius: 16,
        gap: 12,
        shadowColor: DesignTokens.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaText: {
        color: DesignTokens.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingHorizontal: 16,
    },
    statCard: {
        flex: 1,
        minWidth: 100,
        backgroundColor: 'rgba(19, 236, 109, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.2)',
        borderRadius: 16,
        padding: 16,
        gap: 8,
    },
    statHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        marginBottom: 4,
    },
    statLabel: {
        color: DesignTokens.primary,
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.8,
    },
    statValue: {
        color: DesignTokens.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
    },
    statUnit: {
        fontSize: 12,
        fontWeight: 'normal',
        opacity: 0.7,
    },
    hydrationCard: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(19, 236, 109, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.2)',
        borderRadius: 16,
        padding: 16,
    },
    hydrationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    hydrationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: DesignTokens.textPrimary,
    },
    hydrationValue: {
        fontSize: 14,
        fontWeight: '500',
        color: DesignTokens.primary,
        opacity: 0.8,
    },
    hydrationRow: {
        alignItems: 'center',
        gap: 12,
    },
    dropButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 109, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.4)',
    },
    bubbleButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    bubbleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubbleLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: DesignTokens.primary,
        marginTop: 2,
    },
    batteryStatus: {
        marginHorizontal: 16,
        marginTop: 24,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate 800 roughly
        borderRadius: 8,
    },
    batteryText: {
        color: DesignTokens.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
