import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Common yoga poses
const YOGA_POSES = [
    'Downward Dog', 'Child Pose', 'Warrior I', 'Warrior II', 'Tree Pose',
    'Mountain Pose', 'Plank', 'Cobra', 'Bridge', 'Seated Twist'
];

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

export default function YogaScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(0);
    const [poseCount, setPoseCount] = useState(0);
    const [currentPose, setCurrentPose] = useState(0);
    const [caloriesBurned, setCaloriesBurned] = useState(0);

    const startTimeRef = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isActive) {
            startTimeRef.current = Date.now() - duration;
            intervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setDuration(elapsed);
                // Estimate calories (yoga burns ~3-5 cal/min)
                setCaloriesBurned(Math.floor((elapsed / 1000 / 60) * 4));
            }, 1000);
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
    }, [isActive]);

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsActive(true);
    };

    const handleStop = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIsActive(false);
        setDuration(0);
        setPoseCount(0);
        setCurrentPose(0);
        setCaloriesBurned(0);
    };

    const handleNextPose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPoseCount(prev => prev + 1);
        setCurrentPose(prev => (prev + 1) % YOGA_POSES.length);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Yoga Session</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Current Pose Display */}
                {isActive && (
                    <View style={styles.poseContainer}>
                        <Text style={[styles.poseLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            CURRENT POSE
                        </Text>
                        <Text style={[styles.poseName, { color: colors.text }]}>
                            {YOGA_POSES[currentPose]}
                        </Text>
                        <Pressable style={styles.nextPoseButton} onPress={handleNextPose}>
                            <MaterialIcons name="skip-next" size={24} color={DesignTokens.primary} />
                            <Text style={styles.nextPoseText}>Next Pose</Text>
                        </Pressable>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    {/* Duration */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="timer" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Duration</Text>
                    </View>

                    {/* Poses Completed */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="self-improvement" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{poseCount}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Poses</Text>
                    </View>

                    {/* Calories */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{caloriesBurned}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Calories</Text>
                    </View>
                </View>

                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>Yoga Benefits</Text>
                    <View style={styles.benefits}>
                        <View style={styles.benefit}>
                            <MaterialIcons name="favorite" size={20} color={DesignTokens.primary} />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Reduces stress & anxiety</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="accessibility-new" size={20} color={DesignTokens.primary} />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Improves flexibility</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="spa" size={20} color={DesignTokens.primary} />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Enhances mindfulness</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="fitness-center" size={20} color={DesignTokens.primary} />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Builds core strength</Text>
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
                    style={[styles.actionButton, { backgroundColor: DesignTokens.primary }]}
                    onPress={isActive ? handleStop : handleStart}
                >
                    <MaterialIcons
                        name={isActive ? 'stop' : 'play-arrow'}
                        size={28}
                        color={DesignTokens.background}
                    />
                    <Text style={styles.actionButtonText}>
                        {isActive ? 'End Session' : 'Start Session'}
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
    scrollContent: {
        padding: 16,
    },
    poseContainer: {
        alignItems: 'center',
        padding: 32,
        marginBottom: 24,
    },
    poseLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    poseName: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    nextPoseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.3)',
    },
    nextPoseText: {
        color: DesignTokens.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
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
    infoCard: {
        padding: 24,
        borderRadius: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    benefits: {
        gap: 16,
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
