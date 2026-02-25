import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActivityStore } from '@/stores/activity-store';
import { useCalibrationStore } from '@/stores/calibration-store';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const { width } = Dimensions.get('window');

// Predefined strength training exercises
const STRENGTH_EXERCISES = [
    'Push-ups',
    'Squats',
    'Lunges',
    'Plank',
    'Burpees',
    'Dumbbell Curl',
    'Bench Press',
    'Deadlift',
    'Shoulder Press',
    'Bent Over Row',
    'Tricep Dip',
    'Leg Press',
    'Lat Pulldown',
    'Bicep Curl',
    'Chest Fly',
];

type SessionMode = 'idle' | 'selecting' | 'single' | 'multiple' | 'active';
type ExerciseMode = 'single' | 'multiple';

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

export default function StrengthTrainingScreen() {
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

    // Session flow state
    const [sessionMode, setSessionMode] = useState<SessionMode>('idle');
    const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('single');
    
    // Exercise selection state
    const [selectedPredefinedExercise, setSelectedPredefinedExercise] = useState<number | null>(null);
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
    const [customExercises, setCustomExercises] = useState<string[]>([]);
    const [customExerciseInput, setCustomExerciseInput] = useState('');

    // Activity state
    const [duration, setDuration] = useState(0);
    const [exerciseCount, setExerciseCount] = useState(0);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const statusRef = useRef<string>(status);
    const lastDbWriteTime = useRef<number>(0);
    const selectedExercisesRef = useRef<Array<{ type: 'predefined' | 'custom'; index: number; name: string }>>([]);

    // Keep statusRef in sync with status
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Handle app state changes
    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (appState.current === 'active' && nextAppState === 'background') {
            if (statusRef.current === 'active') {
                console.log('App going to background - pausing activity timer');
                pauseActivity();
            }
        } else if (appState.current === 'background' && nextAppState === 'active') {
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

    // Sync with currentActivity when it changes
    useEffect(() => {
        if (currentActivity && currentActivity.duration_ms > 0) {
            setDuration(currentActivity.duration_ms);
            startTimeRef.current = currentActivity.started_at;
        }
    }, [currentActivity?.id, currentActivity]);

    // Timer effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (status === 'active' && startTimeRef.current > 0) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = getElapsedTime(startTimeRef.current);
                setDuration(elapsed);
                
                // Estimate calories (strength training burns ~5-7 cal/min)
                setCaloriesBurned(Math.floor((elapsed / 1000 / 60) * 6));

                if (now - lastDbWriteTime.current >= 30000) {
                    updateDuration(elapsed);
                    lastDbWriteTime.current = now;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, getElapsedTime, updateDuration]);

    // Handle exercise mode change
    const handleExerciseModeChange = (mode: ExerciseMode) => {
        setExerciseMode(mode);
        // Reset selections when switching modes
        setSelectedPredefinedExercise(null);
        setCustomExerciseName('');
        setSelectedExercises([]);
        setCustomExercises([]);
    };

    // Handle predefined exercise selection (single mode)
    const handlePredefinedExerciseSelect = (index: number) => {
        setSelectedPredefinedExercise(index);
        setCustomExerciseName(''); // Clear custom input when selecting predefined
    };

    // Handle custom exercise input change (single mode)
    const handleCustomExerciseChange = (text: string) => {
        setCustomExerciseName(text);
        setSelectedPredefinedExercise(null); // Clear predefined when typing custom
    };

    // Handle predefined exercise toggle (multiple mode)
    const handlePredefinedExerciseToggle = (index: number) => {
        if (selectedExercises.includes(index)) {
            setSelectedExercises(selectedExercises.filter(i => i !== index));
        } else {
            setSelectedExercises([...selectedExercises, index]);
        }
    };

    // Handle adding custom exercise to session (multiple mode)
    const handleAddCustomExercise = () => {
        if (customExerciseInput.trim()) {
            setCustomExercises([...customExercises, customExerciseInput.trim()]);
            setCustomExerciseInput('');
        }
    };

    // Handle removing exercise from selected list
    const handleRemoveExercise = (type: 'predefined' | 'custom', index: number) => {
        if (type === 'predefined') {
            setSelectedExercises(selectedExercises.filter(i => i !== index));
        } else {
            setCustomExercises(customExercises.filter((_, i) => i !== index));
        }
    };

    // Build the session exercises array
    const getSessionExercises = (): Array<{ type: 'predefined' | 'custom'; index: number; name: string }> => {
        const exercises: Array<{ type: 'predefined' | 'custom'; index: number; name: string }> = [];
        
        if (exerciseMode === 'single') {
            if (selectedPredefinedExercise !== null) {
                exercises.push({ type: 'predefined', index: selectedPredefinedExercise, name: STRENGTH_EXERCISES[selectedPredefinedExercise] });
            } else if (customExerciseName.trim()) {
                exercises.push({ type: 'custom', index: -1, name: customExerciseName.trim() });
            }
        } else {
            // Multiple mode
            selectedExercises.forEach(index => {
                exercises.push({ type: 'predefined', index, name: STRENGTH_EXERCISES[index] });
            });
            customExercises.forEach((name, i) => {
                exercises.push({ type: 'custom', index: -1 - i, name });
            });
        }
        
        return exercises;
    };

    // Check if can start session
    const canStartSession = () => {
        const exercises = getSessionExercises();
        return exercises.length > 0;
    };

    // Get current exercise name for display
    const getCurrentExerciseName = () => {
        if (sessionMode === 'idle' || sessionMode === 'selecting') return '';
        
        const exercises = getSessionExercises();
        if (exercises.length === 0) return '';
        
        return exercises[currentExerciseIndex]?.name || '';
    };

    // Handle start session (from initial screen)
    const handleStartSession = () => {
        setSessionMode('selecting');
    };

    // Handle starting from exercise selector
    const handleStartFromSelector = async () => {
        if (!canStartSession()) {
            Alert.alert('No Exercise Selected', 'Please select at least one exercise to start your session.');
            return;
        }

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
            
            // Store selected exercises
            selectedExercisesRef.current = getSessionExercises();
            
            await startActivity(activeProfile.id);
            startTimeRef.current = Date.now();
            lastDbWriteTime.current = Date.now();
            setDuration(0);
            setExerciseCount(0);
            setCurrentExerciseIndex(0);
            setCaloriesBurned(0);
            setSessionMode('active');
        } catch (err) {
            console.error('Failed to start activity:', err);
            Alert.alert('Error', 'Failed to start activity. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    const handleStop = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        Alert.alert('End Session', 'Are you sure you want to end this strength training session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End',
                style: 'destructive',
                onPress: async () => {
                    setIsLoading(true);
                    try {
                        if (currentActivity) {
                            const finalDuration = getElapsedTime(startTimeRef.current);
                            await updateDuration(finalDuration);
                        }
                        await endActivity();
                        setDuration(0);
                        setExerciseCount(0);
                        setCurrentExerciseIndex(0);
                        setCaloriesBurned(0);
                        startTimeRef.current = 0;
                        pausedTimeRef.current = 0;
                        lastDbWriteTime.current = 0;
                        setSessionMode('idle');
                        // Reset selection state
                        setSelectedPredefinedExercise(null);
                        setCustomExerciseName('');
                        setSelectedExercises([]);
                        setCustomExercises([]);
                    } catch (_err) {
                        Alert.alert('Error', 'Failed to save activity.');
                    } finally {
                        setIsLoading(false);
                    }
                },
            },
        ]);
    };

    const handleNextExercise = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const exercises = selectedExercisesRef.current;
        setExerciseCount(prev => prev + 1);
        setCurrentExerciseIndex(prev => (prev + 1) % exercises.length);
    };

    const handleBackFromSelector = () => {
        setSessionMode('idle');
    };

    // Use store status instead of local state
    const isActive = status !== 'idle';
    const isPaused = status === 'paused';

    // Render exercise selector screen
    const renderExerciseSelector = () => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBackFromSelector} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Your Exercises</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Mode Selector */}
                <View style={styles.modeSelector}>
                    <Pressable
                        style={[
                            styles.modeButton,
                            exerciseMode === 'single' && { backgroundColor: DesignTokens.primary }
                        ]}
                        onPress={() => handleExerciseModeChange('single')}
                    >
                        <MaterialIcons 
                            name="looks-one" 
                            size={20} 
                            color={exerciseMode === 'single' ? DesignTokens.background : colors.text} 
                        />
                        <Text style={[
                            styles.modeButtonText,
                            { color: exerciseMode === 'single' ? DesignTokens.background : colors.text }
                        ]}>
                            Single Exercise
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.modeButton,
                            exerciseMode === 'multiple' && { backgroundColor: DesignTokens.primary }
                        ]}
                        onPress={() => handleExerciseModeChange('multiple')}
                    >
                        <MaterialIcons 
                            name="queue" 
                            size={20} 
                            color={exerciseMode === 'multiple' ? DesignTokens.background : colors.text} 
                        />
                        <Text style={[
                            styles.modeButtonText,
                            { color: exerciseMode === 'multiple' ? DesignTokens.background : colors.text }
                        ]}>
                            Multiple Exercises
                        </Text>
                    </Pressable>
                </View>

                {/* Single Exercise Mode */}
                {exerciseMode === 'single' && (
                    <View style={styles.selectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Select an Exercise
                        </Text>
                        
                        {/* Predefined Exercises */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Predefined Exercises
                        </Text>
                        <View style={styles.exerciseList}>
                            {STRENGTH_EXERCISES.map((exercise, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.exerciseItem,
                                        { backgroundColor: isDark ? DesignTokens.surface : colors.white },
                                        selectedPredefinedExercise === index && { borderColor: DesignTokens.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => handlePredefinedExerciseSelect(index)}
                                >
                                    <View style={styles.exerciseInfo}>
                                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                                            {exercise}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        selectedPredefinedExercise === index && { backgroundColor: DesignTokens.primary }
                                    ]}>
                                        {selectedPredefinedExercise === index && (
                                            <MaterialIcons name="check" size={18} color={DesignTokens.background} />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: isDark ? DesignTokens.surface : '#e2e8f0' }]} />
                            <Text style={[styles.dividerText, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: isDark ? DesignTokens.surface : '#e2e8f0' }]} />
                        </View>

                        {/* Custom Exercise Input */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Enter Custom Exercise
                        </Text>
                        <TextInput
                            style={[
                                styles.customInput,
                                { 
                                    backgroundColor: isDark ? DesignTokens.surface : colors.white,
                                    color: colors.text,
                                    borderColor: customExerciseName ? DesignTokens.primary : (isDark ? '#374151' : '#e2e8f0')
                                }
                            ]}
                            placeholder="Enter exercise name..."
                            placeholderTextColor={isDark ? DesignTokens.textSecondary : '#94a3b8'}
                            value={customExerciseName}
                            onChangeText={handleCustomExerciseChange}
                        />
                    </View>
                )}

                {/* Multiple Exercises Mode */}
                {exerciseMode === 'multiple' && (
                    <View style={styles.selectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Select Exercises for Your Session
                        </Text>

                        {/* Predefined Exercises */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Predefined Exercises ({selectedExercises.length} selected)
                        </Text>
                        <View style={styles.exerciseList}>
                            {STRENGTH_EXERCISES.map((exercise, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.exerciseItem,
                                        { backgroundColor: isDark ? DesignTokens.surface : colors.white },
                                        selectedExercises.includes(index) && { borderColor: DesignTokens.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => handlePredefinedExerciseToggle(index)}
                                >
                                    <View style={styles.exerciseInfo}>
                                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                                            {exercise}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        selectedExercises.includes(index) && { backgroundColor: DesignTokens.primary }
                                    ]}>
                                        {selectedExercises.includes(index) && (
                                            <MaterialIcons name="check" size={18} color={DesignTokens.background} />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        {/* Custom Exercise Input */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Add Custom Exercises
                        </Text>
                        <View style={styles.customExerciseRow}>
                            <TextInput
                                style={[
                                    styles.customInput,
                                    styles.customInputFlex,
                                    { 
                                        backgroundColor: isDark ? DesignTokens.surface : colors.white,
                                        color: colors.text,
                                        borderColor: isDark ? '#374151' : '#e2e8f0'
                                    }
                                ]}
                                placeholder="Enter custom exercise name..."
                                placeholderTextColor={isDark ? DesignTokens.textSecondary : '#94a3b8'}
                                value={customExerciseInput}
                                onChangeText={setCustomExerciseInput}
                            />
                            <Pressable
                                style={[styles.addButton, { backgroundColor: DesignTokens.primary }]}
                                onPress={handleAddCustomExercise}
                            >
                                <MaterialIcons name="add" size={24} color={DesignTokens.background} />
                            </Pressable>
                        </View>

                        {/* Selected Exercises Display */}
                        {(selectedExercises.length > 0 || customExercises.length > 0) && (
                            <View style={styles.selectedExercisesContainer}>
                                <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                                    Session Exercises
                                </Text>
                                
                                {selectedExercises.map(index => (
                                    <View
                                        key={`predefined-${index}`}
                                        style={[styles.selectedExerciseItem, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}
                                    >
                                        <Text style={[styles.selectedExerciseText, { color: colors.text }]}>
                                            {STRENGTH_EXERCISES[index]}
                                        </Text>
                                        <Pressable
                                            style={styles.removeButton}
                                            onPress={() => handleRemoveExercise('predefined', index)}
                                        >
                                            <MaterialIcons name="close" size={20} color={DesignTokens.primary} />
                                        </Pressable>
                                    </View>
                                ))}
                                
                                {customExercises.map((name, index) => (
                                    <View
                                        key={`custom-${index}`}
                                        style={[styles.selectedExerciseItem, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}
                                    >
                                        <Text style={[styles.selectedExerciseText, { color: colors.text }]}>
                                            {name}
                                        </Text>
                                        <Pressable
                                            style={styles.removeButton}
                                            onPress={() => handleRemoveExercise('custom', index)}
                                        >
                                            <MaterialIcons name="close" size={20} color={DesignTokens.primary} />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                <Pressable
                    style={[
                        styles.actionButton,
                        { backgroundColor: DesignTokens.primary },
                        !canStartSession() && { opacity: 0.5 }
                    ]}
                    onPress={handleStartFromSelector}
                    disabled={!canStartSession() || isLoading}
                >
                    <MaterialIcons name="play-arrow" size={28} color={DesignTokens.background} />
                    <Text style={styles.actionButtonText}>Start Session</Text>
                </Pressable>
            </View>
        </View>
    );

    // Render active session screen
    const renderActiveSession = () => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Strength Training</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Current Exercise Display */}
                <View style={styles.exerciseContainer}>
                    <Text style={[styles.exerciseLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                        CURRENT EXERCISE
                    </Text>
                    <Text style={[styles.exerciseNameActive, { color: colors.text }]}>
                        {getCurrentExerciseName()}
                    </Text>
                    {!isPaused && selectedExercisesRef.current.length > 1 && (
                        <Pressable style={styles.nextExerciseButton} onPress={handleNextExercise}>
                            <MaterialIcons name="skip-next" size={24} color={DesignTokens.primary} />
                            <Text style={styles.nextExerciseText}>Next Exercise</Text>
                        </Pressable>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    {/* Duration */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="timer" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Duration</Text>
                    </View>

                    {/* Exercises Completed */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="fitness-center" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{exerciseCount}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Exercises</Text>
                    </View>

                    {/* Calories */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{caloriesBurned}</Text>
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
                    style={[styles.actionButton, { backgroundColor: DesignTokens.primary }]}
                    onPress={isActive ? (isPaused ? handleResume : handlePause) : handleStartSession}
                    disabled={isLoading}
                >
                    <MaterialIcons
                        name={isActive ? (isPaused ? 'play-arrow' : 'pause') : 'play-arrow'}
                        size={28}
                        color={DesignTokens.background}
                    />
                    <Text style={styles.actionButtonText}>
                        {isActive ? (isPaused ? 'Resume' : 'Pause') : 'Start Session'}
                    </Text>
                </Pressable>

                {isActive && <View style={{ width: 56 }} />}
            </View>
        </View>
    );

    // Main render - show exercise selector or idle/active screen
    if (sessionMode === 'selecting') {
        return renderExerciseSelector();
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Strength Training</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Current Exercise Display */}
                <View style={styles.exerciseContainer}>
                    <Text style={[styles.exerciseLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                        CURRENT EXERCISE
                    </Text>
                    <Text style={[styles.exerciseNameActive, { color: colors.text }]}>
                        {getCurrentExerciseName()}
                    </Text>
                    {!isPaused && selectedExercisesRef.current.length > 1 && (
                        <Pressable style={styles.nextExerciseButton} onPress={handleNextExercise}>
                            <MaterialIcons name="skip-next" size={24} color={DesignTokens.primary} />
                            <Text style={styles.nextExerciseText}>Next Exercise</Text>
                        </Pressable>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    {/* Duration */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="timer" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Duration</Text>
                    </View>

                    {/* Exercises Completed */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="fitness-center" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{exerciseCount}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>Exercises</Text>
                    </View>

                    {/* Calories */}
                    <View style={[styles.statCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
                        <MaterialIcons name="local-fire-department" size={32} color={DesignTokens.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{caloriesBurned}</Text>
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
                    style={[styles.actionButton, { backgroundColor: DesignTokens.primary }]}
                    onPress={isActive ? (isPaused ? handleResume : handlePause) : handleStartSession}
                    disabled={isLoading}
                >
                    <MaterialIcons
                        name={isActive ? (isPaused ? 'play-arrow' : 'pause') : 'play-arrow'}
                        size={28}
                        color={DesignTokens.background}
                    />
                    <Text style={styles.actionButtonText}>
                        {isActive ? (isPaused ? 'Resume' : 'Pause') : 'Start Session'}
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
    // Exercise display styles
    exerciseContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    exerciseLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },
    exerciseNameActive: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    nextExerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
        gap: 4,
    },
    nextExerciseText: {
        color: DesignTokens.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Stats grid
    statsContainer: {
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
    // Info card
    infoCard: {
        padding: 20,
        borderRadius: 16,
    },
    infoTitle: {
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
    // Mode selector
    modeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(157, 185, 168, 0.2)',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Selection container
    selectionContainer: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
    },
    // Exercise list
    exerciseList: {
        gap: 8,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: DesignTokens.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '600',
    },
    // Custom input
    customInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    customInputFlex: {
        flex: 1,
    },
    customExerciseRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-end',
    },
    addButton: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Selected exercises
    selectedExercisesContainer: {
        marginTop: 16,
    },
    selectedExerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    selectedExerciseText: {
        fontSize: 14,
        fontWeight: '600',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Bottom controls
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
