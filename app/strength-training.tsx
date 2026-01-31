import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Exercise {
    name: string;
    sets: number;
    reps: number;
    weight: number;
}

const EXERCISES = [
    'Bench Press', 'Squats', 'Deadlift', 'Shoulder Press', 'Pull-ups',
    'Bicep Curls', 'Tricep Dips', 'Lunges', 'Leg Press', 'Rows'
];

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function StrengthTrainingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(0);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
    const [sets, setSets] = useState('3');
    const [reps, setReps] = useState('10');
    const [weight, setWeight] = useState('50');

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

    const handleAddExercise = () => {
        const newExercise: Exercise = {
            name: selectedExercise,
            sets: parseInt(sets) || 0,
            reps: parseInt(reps) || 0,
            weight: parseFloat(weight) || 0,
        };
        setExercises(prev => [...prev, newExercise]);
        setShowAddModal(false);
        setSets('3');
        setReps('10');
        setWeight('50');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsActive(true);
    };

    const handleStop = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIsActive(false);
        setDuration(0);
        setExercises([]);
    };

    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const totalVolume = exercises.reduce((sum, ex) => sum + (ex.sets * ex.reps * ex.weight), 0);
    const estimatedCalories = Math.floor((duration / 1000 / 60) * 5); // ~5 cal/min

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Strength Training</Text>
                <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <MaterialIcons name="add" size={24} color={DesignTokens.primary} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="timer" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Duration</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="fitness-center" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Total Sets</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="show-chart" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalVolume.toLocaleString()}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Volume (kg)</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={28} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{estimatedCalories}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Calories</Text>
                    </View>
                </View>

                {/* Exercises List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercises</Text>
                {exercises.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="fitness-center" size={48} color={isDark ? '#3b5445' : colors.border} />
                        <Text style={[styles.emptyText, { color: isDark ? '#9db9a8' : '#64748b' }]}>
                            No exercises logged yet
                        </Text>
                        <Text style={[styles.emptySubtext, { color: isDark ? '#9db9a8' : '#64748b' }]}>
                            Tap the + button to add exercises
                        </Text>
                    </View>
                ) : (
                    <View style={styles.exercisesList}>
                        {exercises.map((exercise, index) => (
                            <View
                                key={index}
                                style={[styles.exerciseCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}
                            >
                                <View style={styles.exerciseHeader}>
                                    <MaterialIcons name="fitness-center" size={24} color={DesignTokens.primary} />
                                    <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
                                </View>
                                <View style={styles.exerciseStats}>
                                    <Text style={[styles.exerciseStat, { color: isDark ? '#9db9a8' : '#64748b' }]}>
                                        {exercise.sets} sets × {exercise.reps} reps
                                    </Text>
                                    <Text style={[styles.exerciseStat, { color: DesignTokens.primary }]}>
                                        {exercise.weight} kg
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

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
                        {isActive ? 'End Workout' : 'Start Workout'}
                    </Text>
                </Pressable>

                {isActive && <View style={{ width: 56 }} />}
            </View>

            {/* Add Exercise Modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>

                        <Text style={[styles.modalLabel, { color: colors.text }]}>Exercise</Text>
                        <ScrollView style={styles.exerciseSelector} showsVerticalScrollIndicator={false}>
                            {EXERCISES.map((ex) => (
                                <Pressable
                                    key={ex}
                                    style={[
                                        styles.exerciseOption,
                                        selectedExercise === ex && { backgroundColor: 'rgba(19, 236, 109, 0.1)' }
                                    ]}
                                    onPress={() => setSelectedExercise(ex)}
                                >
                                    <Text style={[styles.exerciseOptionText, { color: selectedExercise === ex ? DesignTokens.primary : colors.text }]}>
                                        {ex}
                                    </Text>
                                    {selectedExercise === ex && <MaterialIcons name="check" size={20} color={DesignTokens.primary} />}
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={styles.inputRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.modalLabel, { color: colors.text }]}>Sets</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: isDark ? DesignTokens.border : colors.border, backgroundColor: isDark ? DesignTokens.background : '#f9fafb' }]}
                                    value={sets}
                                    onChangeText={setSets}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9db9a8"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.modalLabel, { color: colors.text }]}>Reps</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: isDark ? DesignTokens.border : colors.border, backgroundColor: isDark ? DesignTokens.background : '#f9fafb' }]}
                                    value={reps}
                                    onChangeText={setReps}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9db9a8"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.modalLabel, { color: colors.text }]}>Weight (kg)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: isDark ? DesignTokens.border : colors.border, backgroundColor: isDark ? DesignTokens.background : '#f9fafb' }]}
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="decimal-pad"
                                    placeholderTextColor="#9db9a8"
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowAddModal(false)}>
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.modalButton, styles.modalButtonAdd]} onPress={handleAddExercise}>
                                <Text style={styles.modalButtonText}>Add Exercise</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    addButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    scrollContent: {
        padding: 16,
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 16,
    },
    emptyState: {
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 4,
    },
    exercisesList: {
        gap: 12,
    },
    exerciseCard: {
        padding: 16,
        borderRadius: 12,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    exerciseStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    exerciseStat: {
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    exerciseSelector: {
        maxHeight: 200,
        marginBottom: 12,
    },
    exerciseOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    exerciseOptionText: {
        fontSize: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: 'rgba(157, 185, 168, 0.2)',
    },
    modalButtonAdd: {
        backgroundColor: DesignTokens.primary,
    },
    modalButtonText: {
        color: DesignTokens.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalButtonTextCancel: {
        color: '#9db9a8',
        fontSize: 16,
        fontWeight: '600',
    },
});
