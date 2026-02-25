import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActivityStore } from '@/stores/activity-store';
import { useCalibrationStore } from '@/stores/calibration-store';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function SwimmingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    // Store hooks
    const {
        currentActivity,
        status,
        startActivity,
        pauseActivity,
        resumeActivity,
        endActivity,
        updateDuration,
        loadActiveActivity,
        getElapsedTime,
    } = useActivityStore();

    const { getActiveProfile, loadProfiles } = useCalibrationStore();

    // Local state
    const [duration, setDuration] = useState(0);
    const [laps, setLaps] = useState(0);
    const [lapDistance, setLapDistance] = useState(25); // 25m or 50m pool
    const [customPoolLength, setCustomPoolLength] = useState(''); // Custom pool length input
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const statusRef = useRef<string>(status);
    const lastDbWriteTime = useRef<number>(0);

    // Keep statusRef in sync with status
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Handle app state changes
    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (appState.current === 'active' && nextAppState === 'background') {
            // App is going to background - pause activity if active
            if (statusRef.current === 'active') {
                console.log('App going to background - pausing activity timer');
                pauseActivity();
            }
        } else if (appState.current === 'background' && nextAppState === 'active') {
            // App is coming to foreground - resume if it was paused
            if (statusRef.current === 'paused') {
                console.log('App coming to foreground - resuming activity');
                resumeActivity();
            }
        }
        appState.current = nextAppState;
    }, [pauseActivity, resumeActivity]);

    // Load profiles and any active activity on mount
    useEffect(() => {
        loadProfiles();
        loadActiveActivity();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [handleAppStateChange, loadActiveActivity, loadProfiles]);

    // Sync with currentActivity when it changes (e.g., after loading from DB)
    useEffect(() => {
        if (currentActivity && currentActivity.duration_ms > 0) {
            setDuration(currentActivity.duration_ms);
            startTimeRef.current = currentActivity.started_at;
        }
    }, [currentActivity?.id, currentActivity]);

    // Timer effect - Uses timestamps for accurate time tracking
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (status === 'active' && startTimeRef.current > 0) {
            interval = setInterval(() => {
                const now = Date.now();
                // Use timestamp-based calculation: now - startTime - totalPausedTime
                const elapsed = getElapsedTime(startTimeRef.current);
                setDuration(elapsed);

                // Only persist to database every 30 seconds
                if (now - lastDbWriteTime.current >= 30000) {
                    updateDuration(elapsed);
                    lastDbWriteTime.current = now;
                }
            }, 1000); // Update UI every second, but only write to DB every 30s
        }
        return () => clearInterval(interval);
    }, [status, getElapsedTime, updateDuration]);

    const handleStart = async () => {
        setIsLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const activeProfile = getActiveProfile();
            if (!activeProfile) {
                Alert.alert(
                    'Calibration Required',
                    'You need to calibrate your step size before starting an activity.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
                        {
                            text: 'Calibrate Now', onPress: () => {
                                setIsLoading(false);
                                router.push('/calibration');
                            }
                        }
                    ]
                );
                return;
            }
            await startActivity(activeProfile.id);
            startTimeRef.current = Date.now();
            lastDbWriteTime.current = Date.now();
            setDuration(0);
            setLaps(0);
        } catch (err) {
            console.error('Failed to start activity:', err);
            Alert.alert('Error', 'Failed to start activity. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Persist current duration before pausing
        const currentElapsed = getElapsedTime(startTimeRef.current);
        updateDuration(currentElapsed);
        
        pauseActivity();
        pausedTimeRef.current = Date.now();
    };

    const handleResume = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const pauseDuration = Date.now() - pausedTimeRef.current;
        startTimeRef.current += pauseDuration;
        resumeActivity();
    };

    const handleLap = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLaps(prev => prev + 1);
    };

    const handleStop = () => {
        Alert.alert('End Swim', 'Are you sure you want to end this swim session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End',
                style: 'destructive',
                onPress: async () => {
                    setIsLoading(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    try {
                        if (currentActivity) {
                            // Calculate final duration accounting for pauses
                            const finalDuration = getElapsedTime(startTimeRef.current);
                            await updateDuration(finalDuration);
                        }
                        await endActivity();
                        setDuration(0);
                        setLaps(0);
                        startTimeRef.current = 0;
                        pausedTimeRef.current = 0;
                        lastDbWriteTime.current = 0;
                    } catch (_err) {
                        Alert.alert('Error', 'Failed to save activity.');
                    } finally {
                        setIsLoading(false);
                    }
                },
            },
        ]);
    };

    const handleCustomPoolLengthChange = (text: string) => {
        // Only allow numerical input
        const numericValue = text.replace(/[^0-9]/g, '');
        setCustomPoolLength(numericValue);
        
        // Update lap distance if custom value is entered
        if (numericValue && parseInt(numericValue, 10) > 0) {
            setLapDistance(parseInt(numericValue, 10));
        }
    };

    const handleQuickSelectPoolLength = (length: number) => {
        setLapDistance(length);
        setCustomPoolLength(length.toString());
    };

    const totalDistance = laps * lapDistance;
    const avgPace = laps > 0 ? duration / laps : 0;
    const estimatedCalories = Math.floor((duration / 1000 / 60) * 7.5); // ~7.5 cal/min swimming

    // Use store status instead of local state
    const isActive = status !== 'idle';
    const isPaused = status === 'paused';

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
                        Pool Length (meters)
                    </Text>
                    
                    {/* Quick Select Buttons */}
                    <View style={styles.poolTypeButtons}>
                        <Pressable
                            style={[
                                styles.poolTypeButton,
                                lapDistance === 25 && { backgroundColor: DesignTokens.primary },
                                lapDistance !== 25 && { backgroundColor: isDark ? DesignTokens.surface : colors.white }
                            ]}
                            onPress={() => handleQuickSelectPoolLength(25)}
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
                            onPress={() => handleQuickSelectPoolLength(50)}
                        >
                            <Text style={[styles.poolTypeButtonText, { color: lapDistance === 50 ? DesignTokens.background : colors.text }]}>
                                50m
                            </Text>
                        </Pressable>
                    </View>
                    
                    {/* Custom Pool Length Input */}
                    <View style={styles.customPoolInputContainer}>
                        <Text style={[styles.customPoolInputLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Or enter custom length:
                        </Text>
                        <View style={styles.customPoolInputWrapper}>
                            <TextInput
                                style={[
                                    styles.customPoolInput,
                                    { 
                                        backgroundColor: isDark ? DesignTokens.surface : colors.white,
                                        color: colors.text,
                                        borderColor: isDark ? DesignTokens.border : '#e2e8f0'
                                    }
                                ]}
                                value={customPoolLength}
                                onChangeText={handleCustomPoolLengthChange}
                                placeholder="e.g., 33"
                                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />
                            <Text style={[styles.customPoolInputSuffix, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                                meters
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Timer */}
                <View style={styles.timerContainer}>
                    <Text style={[styles.timerLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>DURATION</Text>
                    <Text style={[styles.timerValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                </View>

                {/* Lap Button (when active and not paused) */}
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
                    disabled={isLoading}
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
    customPoolInputContainer: {
        marginTop: 16,
    },
    customPoolInputLabel: {
        fontSize: 12,
        marginBottom: 8,
    },
    customPoolInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    customPoolInput: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 1,
    },
    customPoolInputSuffix: {
        fontSize: 14,
        fontWeight: '600',
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
