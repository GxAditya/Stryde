import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const DANCE_STYLES = [
    { name: 'Hip Hop', icon: 'music-note', color: DesignTokens.primary, intensity: 'high' },
    { name: 'Ballet', icon: 'self-improvement', color: DesignTokens.primary, intensity: 'medium' },
    { name: 'Salsa', icon: 'favorite', color: DesignTokens.primary, intensity: 'high' },
    { name: 'Contemporary', icon: 'air', color: DesignTokens.primary, intensity: 'medium' },
    { name: 'Jazz', icon: 'music-note', color: DesignTokens.primary, intensity: 'medium' },
    { name: 'Freestyle', icon: 'self-improvement', color: DesignTokens.primary, intensity: 'high' },
];

const INTENSITY_LEVELS = [
    { level: 'Low', multiplier: 3, color: DesignTokens.primary },
    { level: 'Medium', multiplier: 5, color: DesignTokens.primary },
    { level: 'High', multiplier: 7, color: DesignTokens.primary },
];

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function DanceScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(0);
    const [selectedStyle, setSelectedStyle] = useState(DANCE_STYLES[0]);
    const [intensityIndex, setIntensityIndex] = useState(1); // Medium by default
    const [moveCount, setMoveCount] = useState(0);

    const startTimeRef = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isActive) {
            startTimeRef.current = Date.now() - duration;
            intervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setDuration(elapsed);
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
        setMoveCount(0);
    };

    const handleMoveCount = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMoveCount(prev => prev + 1);
    };

    const caloriesBurned = Math.floor((duration / 1000 / 60) * INTENSITY_LEVELS[intensityIndex].multiplier);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Dance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Dance Style Selector */}
                {!isActive && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Style</Text>
                        <View style={styles.styleGrid}>
                            {DANCE_STYLES.map((style) => (
                                <Pressable
                                    key={style.name}
                                    style={[
                                        styles.styleCard,
                                        {
                                            backgroundColor: selectedStyle.name === style.name
                                                ? 'rgba(19, 236, 109, 0.2)'
                                                : isDark ? DesignTokens.surface : colors.white,
                                            borderColor: selectedStyle.name === style.name
                                                ? style.color
                                                : isDark ? DesignTokens.border : colors.border,
                                        }
                                    ]}
                                    onPress={() => setSelectedStyle(style)}
                                >
                                    <MaterialIcons name={style.icon as any} size={32} color={style.color} />
                                    <Text style={[styles.styleName, { color: colors.text }]}>{style.name}</Text>
                                    {selectedStyle.name === style.name && (
                                        <View style={styles.selectedBadge}>
                                            <MaterialIcons name="check" size={16} color={DesignTokens.background} />
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* Intensity Selector */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Intensity</Text>
                        <View style={styles.intensityButtons}>
                            {INTENSITY_LEVELS.map((intensity, index) => (
                                <Pressable
                                    key={intensity.level}
                                    style={[
                                        styles.intensityButton,
                                        {
                                            backgroundColor: intensityIndex === index
                                                ? intensity.color
                                                : isDark ? DesignTokens.surface : colors.white,
                                        }
                                    ]}
                                    onPress={() => setIntensityIndex(index)}
                                >
                                    <Text
                                        style={[
                                            styles.intensityText,
                                            { color: intensityIndex === index ? DesignTokens.background : colors.text }
                                        ]}
                                    >
                                        {intensity.level}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </>
                )}

                {/* Active Session */}
                {isActive && (
                    <>
                        <View style={styles.activeStyleContainer}>
                            <MaterialIcons name={selectedStyle.icon as any} size={64} color={selectedStyle.color} />
                            <Text style={[styles.activeStyleName, { color: colors.text }]}>{selectedStyle.name}</Text>
                            <View style={[styles.intensityBadge, { backgroundColor: 'rgba(19, 236, 109, 0.2)' }]}>
                                <Text style={[styles.intensityBadgeText, { color: INTENSITY_LEVELS[intensityIndex].color }]}>
                                    {INTENSITY_LEVELS[intensityIndex].level} Intensity
                                </Text>
                            </View>
                        </View>

                        {/* Move Counter Button */}
                        <Pressable style={[styles.moveButton, { borderColor: selectedStyle.color }]} onPress={handleMoveCount}>
                            <MaterialIcons name="touch-app" size={32} color={selectedStyle.color} />
                            <Text style={[styles.moveButtonText, { color: selectedStyle.color }]}>TAP FOR MOVE</Text>
                        </Pressable>
                    </>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="timer" size={28} color={selectedStyle.color} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Duration</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="shuffle" size={28} color="DesignTokens.primary" />
                        <Text style={[styles.statValue, { color: colors.text }]}>{moveCount}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Moves</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={28} color="DesignTokens.primary" />
                        <Text style={[styles.statValue, { color: colors.text }]}>{caloriesBurned}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Calories</Text>
                    </View>
                </View>

                {/* Benefits */}
                <View style={[styles.benefitsCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                    <Text style={[styles.benefitsTitle, { color: colors.text }]}>Dance Benefits</Text>
                    <View style={styles.benefits}>
                        <View style={styles.benefit}>
                            <MaterialIcons name="favorite" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Boosts mood & energy</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="directions-run" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Cardio workout</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="psychology" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Improves coordination</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="groups" size={20} color="DesignTokens.primary" />
                            <Text style={[styles.benefitText, { color: colors.text }]}>Social activity</Text>
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
                    <Text style={styles.actionButtonText}>{isActive ? 'End Dance' : 'Start Dancing'}</Text>
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 16,
    },
    styleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    styleCard: {
        width: '30%',
        aspectRatio: 1,
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    styleName: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
    },
    selectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: DesignTokens.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    intensityButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    intensityButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    intensityText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    activeStyleContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    activeStyleName: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 16,
    },
    intensityBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
    },
    intensityBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    moveButton: {
        alignSelf: 'center',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
    },
    moveButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
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
