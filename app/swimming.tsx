import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function SwimmingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [laps, setLaps] = useState(0);
    const [lapDistance, setLapDistance] = useState(25); // 25m or 50m pool
    const [strokeType, setStrokeType] = useState('Freestyle');

    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lapTimes = useRef<number[]>([]);

    useEffect(() => {
        if (isActive && !isPaused) {
            startTimeRef.current = Date.now() - duration;
            intervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setDuration(elapsed);
            }, 100);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, isPaused]);

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsActive(true);
        setIsPaused(false);
    };

    const handlePause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsPaused(true);
        pausedTimeRef.current = Date.now();
    };

    const handleResume = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const pauseDuration = Date.now() - pausedTimeRef.current;
        startTimeRef.current += pauseDuration;
        setIsPaused(false);
    };

    const handleLap = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLaps(prev => prev + 1);
        lapTimes.current.push(duration);
    };

    const handleStop = () => {
        Alert.alert('End Swim', 'Are you sure you want to end this swim session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End',
                style: 'destructive',
                onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setIsActive(false);
                    setIsPaused(false);
                    setDuration(0);
                    setLaps(0);
                    lapTimes.current = [];
                },
            },
        ]);
    };

    const totalDistance = laps * lapDistance;
    const avgPace = laps > 0 ? duration / laps : 0;
    const estimatedCalories = Math.floor((duration / 1000 / 60) * 7.5); // ~7.5 cal/min swimming

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Swimming</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Pool Type Selector */}
            {!isActive && (
                <View style={styles.poolTypeContainer}>
                    <Text style={[styles.poolTypeLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                        Pool Length
                    </Text>
                    <View style={styles.poolTypeButtons}>
                        <Pressable
                            style={[
                                styles.poolTypeButton,
                                lapDistance === 25 && { backgroundColor: DesignTokens.primary },
                                lapDistance !== 25 && { backgroundColor: isDark ? DesignTokens.surface : colors.white }
                            ]}
                            onPress={() => setLapDistance(25)}
                        >
                            <Text style={[styles.poolTypeButtonText, { color: lapDistance === 25 ? DesignTokens.background : colors.text }]}>
                                25m
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.poolTypeButton,
                                lapDistance === 50 && { backgroundColor: DesignTokens.primary },
                                lapDistance !== 50 && { backgroundColor: isDark ? DesignTokens.surface : colors.white }
                            ]}
                            onPress={() => setLapDistance(50)}
                        >
                            <Text style={[styles.poolTypeButtonText, { color: lapDistance === 50 ? DesignTokens.background : colors.text }]}>
                                50m
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Timer */}
                <View style={styles.timerContainer}>
                    <Text style={[styles.timerLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>DURATION</Text>
                    <Text style={[styles.timerValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                </View>

                {/* Lap Button (when active) */}
                {isActive && !isPaused && (
                    <Pressable style={styles.lapButtonLarge} onPress={handleLap}>
                        <MaterialIcons name="flag" size={32} color={DesignTokens.primary} />
                        <Text style={styles.lapButtonText}>LAP</Text>
                    </Pressable>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="pool" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{laps}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Laps</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="straighten" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalDistance}m</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Distance</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="speed" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(avgPace)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Avg/Lap</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{estimatedCalories}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Calories</Text>
                    </View>
                </View>

                {/* Benefits */}
                <View style={[styles.benefitsCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                    <Text style={[styles.benefitsTitle, { color: colors.text }]}>Swimming Benefits</Text>
                    <View style={styles.benefits}>
                        <View style={styles.benefit}>
                            <MaterialIcons name="favorite" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Full-body workout</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="self-improvement" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Low-impact cardio</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="air" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Improves lung capacity</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                {isActive && (
                    <Pressable style={styles.stopButton} onPress={handleStop}>
                        <MaterialIcons name="stop" size={24} color={DesignTokens.primary} />
                    </Pressable>
                )}

                <Pressable
                    style={[
                        styles.actionButton,
                        { backgroundColor: DesignTokens.primary }
                    ]}
                    onPress={isActive ? (isPaused ? handleResume : handlePause) : handleStart}
                >
                    <MaterialIcons
                        name={isActive ? (isPaused ? 'play-arrow' : 'pause') : 'play-arrow'}
                        size={28}
                        color={DesignTokens.background}
                    />
                    <Text style={styles.actionButtonText}>
                        {isActive ? (isPaused ? 'Resume' : 'Pause') : 'Start Swim'}
                    </Text>
                </Pressable>

                {isActive && <View style={{ width: 56 }} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 48,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    poolTypeContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    poolTypeLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    poolTypeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    poolTypeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    poolTypeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
    },
    timerContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    timerLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    timerValue: {
        fontSize: 64,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    lapButtonLarge: {
        alignSelf: 'center',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        borderWidth: 3,
        borderColor: DesignTokens.primary,
        marginBottom: 32,
    },
    lapButtonText: {
        color: DesignTokens.primary,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        letterSpacing: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
    },
    benefitsCard: {
        padding: 24,
        borderRadius: 16,
        marginTop: 12,
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    benefits: {
        gap: 12,
    },
    benefit: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    benefitText: {
        fontSize: 14,
    },
    bottomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 32,
        paddingTop: 8,
        gap: 16,
    },
    stopButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(19, 236, 109, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButton: {
        flex: 1,
        height: 64,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionButtonText: {
        color: DesignTokens.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
