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

// Predefined yoga poses with Sanskrit names
const YOGA_POSES = [
    { name: 'Mountain Pose', sanskrit: 'Tadasana' },
    { name: 'Downward Dog', sanskrit: 'Adho Mukha Svanasana' },
    { name: 'Warrior I', sanskrit: 'Virabhadrasana I' },
    { name: 'Warrior II', sanskrit: 'Virabhadrasana II' },
    { name: 'Tree Pose', sanskrit: 'Vrksasana' },
    { name: "Child's Pose", sanskrit: 'Balasana' },
    { name: 'Cobra Pose', sanskrit: 'Bhujangasana' },
    { name: 'Triangle Pose', sanskrit: 'Trikonasana' },
    { name: 'Bridge Pose', sanskrit: 'Setu Bandhasana' },
    { name: 'Corpse Pose', sanskrit: 'Savasana' },
];

type SessionMode = 'idle' | 'selecting' | 'single' | 'multiple' | 'active';
type PoseMode = 'single' | 'multiple';

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
    const [poseMode, setPoseMode] = useState<PoseMode>('single');
    
    // Pose selection state
    const [selectedPredefinedPose, setSelectedPredefinedPose] = useState<number | null>(null);
    const [customPoseName, setCustomPoseName] = useState('');
    const [selectedPoses, setSelectedPoses] = useState<number[]>([]);
    const [customPoses, setCustomPoses] = useState<string[]>([]);
    const [customPoseInput, setCustomPoseInput] = useState('');

    // Activity state
    const [duration, setDuration] = useState(0);
    const [poseCount, setPoseCount] = useState(0);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const statusRef = useRef<string>(status);
    const lastDbWriteTime = useRef<number>(0);
    const selectedPosesRef = useRef<Array<{ type: 'predefined' | 'custom'; index: number; name: string }>>([]);

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
                
                // Estimate calories (yoga burns ~3-5 cal/min)
                setCaloriesBurned(Math.floor((elapsed / 1000 / 60) * 4));

                if (now - lastDbWriteTime.current >= 30000) {
                    updateDuration(elapsed);
                    lastDbWriteTime.current = now;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, getElapsedTime, updateDuration]);

    // Handle pose mode change
    const handlePoseModeChange = (mode: PoseMode) => {
        setPoseMode(mode);
        // Reset selections when switching modes
        setSelectedPredefinedPose(null);
        setCustomPoseName('');
        setSelectedPoses([]);
        setCustomPoses([]);
    };

    // Handle predefined pose selection (single mode)
    const handlePredefinedPoseSelect = (index: number) => {
        setSelectedPredefinedPose(index);
        setCustomPoseName(''); // Clear custom input when selecting predefined
    };

    // Handle custom pose input change (single mode)
    const handleCustomPoseChange = (text: string) => {
        setCustomPoseName(text);
        setSelectedPredefinedPose(null); // Clear predefined when typing custom
    };

    // Handle predefined pose toggle (multiple mode)
    const handlePredefinedPoseToggle = (index: number) => {
        if (selectedPoses.includes(index)) {
            setSelectedPoses(selectedPoses.filter(i => i !== index));
        } else {
            setSelectedPoses([...selectedPoses, index]);
        }
    };

    // Handle adding custom pose to session (multiple mode)
    const handleAddCustomPose = () => {
        if (customPoseInput.trim()) {
            setCustomPoses([...customPoses, customPoseInput.trim()]);
            setCustomPoseInput('');
        }
    };

    // Handle removing pose from selected list
    const handleRemovePose = (type: 'predefined' | 'custom', index: number) => {
        if (type === 'predefined') {
            setSelectedPoses(selectedPoses.filter(i => i !== index));
        } else {
            setCustomPoses(customPoses.filter((_, i) => i !== index));
        }
    };

    // Build the session poses array
    const getSessionPoses = (): Array<{ type: 'predefined' | 'custom'; index: number; name: string }> => {
        const poses: Array<{ type: 'predefined' | 'custom'; index: number; name: string }> = [];
        
        if (poseMode === 'single') {
            if (selectedPredefinedPose !== null) {
                poses.push({ type: 'predefined', index: selectedPredefinedPose, name: YOGA_POSES[selectedPredefinedPose].name });
            } else if (customPoseName.trim()) {
                poses.push({ type: 'custom', index: -1, name: customPoseName.trim() });
            }
        } else {
            // Multiple mode
            selectedPoses.forEach(index => {
                poses.push({ type: 'predefined', index, name: YOGA_POSES[index].name });
            });
            customPoses.forEach((name, i) => {
                poses.push({ type: 'custom', index: -1 - i, name });
            });
        }
        
        return poses;
    };

    // Check if can start session
    const canStartSession = () => {
        const poses = getSessionPoses();
        return poses.length > 0;
    };

    // Get current pose name for display
    const getCurrentPoseName = () => {
        if (sessionMode === 'idle' || sessionMode === 'selecting') return '';
        
        const poses = getSessionPoses();
        if (poses.length === 0) return '';
        
        return poses[currentPoseIndex]?.name || '';
    };

    // Handle start session
    const handleStartSession = () => {
        setSessionMode('active');
    };

    // Handle starting from pose selector
    const handleStartFromSelector = async () => {
        if (!canStartSession()) {
            Alert.alert('No Pose Selected', 'Please select at least one pose to start your session.');
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
            
            // Store selected poses
            selectedPosesRef.current = getSessionPoses();
            
            await startActivity(activeProfile.id);
            startTimeRef.current = Date.now();
            lastDbWriteTime.current = Date.now();
            setDuration(0);
            setPoseCount(0);
            setCurrentPoseIndex(0);
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
        
        Alert.alert('End Session', 'Are you sure you want to end this yoga session?', [
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
                        setPoseCount(0);
                        setCurrentPoseIndex(0);
                        setCaloriesBurned(0);
                        startTimeRef.current = 0;
                        pausedTimeRef.current = 0;
                        lastDbWriteTime.current = 0;
                        setSessionMode('idle');
                        // Reset selection state
                        setSelectedPredefinedPose(null);
                        setCustomPoseName('');
                        setSelectedPoses([]);
                        setCustomPoses([]);
                    } catch (_err) {
                        Alert.alert('Error', 'Failed to save activity.');
                    } finally {
                        setIsLoading(false);
                    }
                },
            },
        ]);
    };

    const handleNextPose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const poses = selectedPosesRef.current;
        setPoseCount(prev => prev + 1);
        setCurrentPoseIndex(prev => (prev + 1) % poses.length);
    };

    const handleBackFromSelector = () => {
        setSessionMode('idle');
    };

    // Use store status instead of local state
    const isActive = status !== 'idle';
    const isPaused = status === 'paused';

    // Render pose selector screen
    const renderPoseSelector = () => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBackFromSelector} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Your Poses</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Mode Selector */}
                <View style={styles.modeSelector}>
                    <Pressable
                        style={[
                            styles.modeButton,
                            poseMode === 'single' && { backgroundColor: DesignTokens.primary }
                        ]}
                        onPress={() => handlePoseModeChange('single')}
                    >
                        <MaterialIcons 
                            name="looks-one" 
                            size={20} 
                            color={poseMode === 'single' ? DesignTokens.background : colors.text} 
                        />
                        <Text style={[
                            styles.modeButtonText,
                            { color: poseMode === 'single' ? DesignTokens.background : colors.text }
                        ]}>
                            Single Pose
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.modeButton,
                            poseMode === 'multiple' && { backgroundColor: DesignTokens.primary }
                        ]}
                        onPress={() => handlePoseModeChange('multiple')}
                    >
                        <MaterialIcons 
                            name="queue" 
                            size={20} 
                            color={poseMode === 'multiple' ? DesignTokens.background : colors.text} 
                        />
                        <Text style={[
                            styles.modeButtonText,
                            { color: poseMode === 'multiple' ? DesignTokens.background : colors.text }
                        ]}>
                            Multiple Poses
                        </Text>
                    </Pressable>
                </View>

                {/* Single Pose Mode */}
                {poseMode === 'single' && (
                    <View style={styles.selectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Select a Pose
                        </Text>
                        
                        {/* Predefined Poses */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Predefined Poses
                        </Text>
                        <View style={styles.poseList}>
                            {YOGA_POSES.map((pose, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.poseItem,
                                        { backgroundColor: isDark ? DesignTokens.surface : colors.white },
                                        selectedPredefinedPose === index && { borderColor: DesignTokens.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => handlePredefinedPoseSelect(index)}
                                >
                                    <View style={styles.poseInfo}>
                                        <Text style={[styles.poseName, { color: colors.text }]}>
                                            {pose.name}
                                        </Text>
                                        <Text style={[styles.poseSanskrit, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                                            {pose.sanskrit}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        selectedPredefinedPose === index && { backgroundColor: DesignTokens.primary }
                                    ]}>
                                        {selectedPredefinedPose === index && (
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

                        {/* Custom Pose Input */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Enter Custom Pose
                        </Text>
                        <TextInput
                            style={[
                                styles.customInput,
                                { 
                                    backgroundColor: isDark ? DesignTokens.surface : colors.white,
                                    color: colors.text,
                                    borderColor: customPoseName ? DesignTokens.primary : (isDark ? '#374151' : '#e2e8f0')
                                }
                            ]}
                            placeholder="Enter pose name..."
                            placeholderTextColor={isDark ? DesignTokens.textSecondary : '#94a3b8'}
                            value={customPoseName}
                            onChangeText={handleCustomPoseChange}
                        />
                    </View>
                )}

                {/* Multiple Poses Mode */}
                {poseMode === 'multiple' && (
                    <View style={styles.selectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Select Poses for Your Session
                        </Text>

                        {/* Predefined Poses */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Predefined Poses ({selectedPoses.length} selected)
                        </Text>
                        <View style={styles.poseList}>
                            {YOGA_POSES.map((pose, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.poseItem,
                                        { backgroundColor: isDark ? DesignTokens.surface : colors.white },
                                        selectedPoses.includes(index) && { borderColor: DesignTokens.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => handlePredefinedPoseToggle(index)}
                                >
                                    <View style={styles.poseInfo}>
                                        <Text style={[styles.poseName, { color: colors.text }]}>
                                            {pose.name}
                                        </Text>
                                        <Text style={[styles.poseSanskrit, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                                            {pose.sanskrit}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        selectedPoses.includes(index) && { backgroundColor: DesignTokens.primary }
                                    ]}>
                                        {selectedPoses.includes(index) && (
                                            <MaterialIcons name="check" size={18} color={DesignTokens.background} />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        {/* Custom Pose Input */}
                        <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                            Add Custom Poses
                        </Text>
                        <View style={styles.customPoseRow}>
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
                                placeholder="Enter custom pose name..."
                                placeholderTextColor={isDark ? DesignTokens.textSecondary : '#94a3b8'}
                                value={customPoseInput}
                                onChangeText={setCustomPoseInput}
                            />
                            <Pressable
                                style={[styles.addButton, { backgroundColor: DesignTokens.primary }]}
                                onPress={handleAddCustomPose}
                            >
                                <MaterialIcons name="add" size={24} color={DesignTokens.background} />
                            </Pressable>
                        </View>

                        {/* Selected Poses Display */}
                        {(selectedPoses.length > 0 || customPoses.length > 0) && (
                            <View style={styles.selectedPosesContainer}>
                                <Text style={[styles.subsectionTitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                                    Session Poses
                                </Text>
                                
                                {selectedPoses.map(index => (
                                    <View
                                        key={`predefined-${index}`}
                                        style={[styles.selectedPoseItem, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}
                                    >
                                        <Text style={[styles.selectedPoseText, { color: colors.text }]}>
                                            {YOGA_POSES[index].name}
                                        </Text>
                                        <Pressable
                                            style={styles.removeButton}
                                            onPress={() => handleRemovePose('predefined', index)}
                                        >
                                            <MaterialIcons name="close" size={20} color={DesignTokens.primary} />
                                        </Pressable>
                                    </View>
                                ))}
                                
                                {customPoses.map((name, index) => (
                                    <View
                                        key={`custom-${index}`}
                                        style={[styles.selectedPoseItem, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}
                                    >
                                        <Text style={[styles.selectedPoseText, { color: colors.text }]}>
                                            {name}
                                        </Text>
                                        <Pressable
                                            style={styles.removeButton}
                                            onPress={() => handleRemovePose('custom', index)}
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Yoga Session</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Current Pose Display */}
                <View style={styles.poseContainer}>
                    <Text style={[styles.poseLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                        CURRENT POSE
                    </Text>
                    <Text style={[styles.poseNameActive, { color: colors.text }]}>
                        {getCurrentPoseName()}
                    </Text>
                    {!isPaused && selectedPosesRef.current.length > 1 && (
                        <Pressable style={styles.nextPoseButton} onPress={handleNextPose}>
                            <MaterialIcons name="skip-next" size={24} color={DesignTokens.primary} />
                            <Text style={styles.nextPoseText}>Next Pose</Text>
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

    // Main render - show pose selector or idle/active screen
    if (sessionMode === 'selecting') {
        return renderPoseSelector();
    }

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
                <View style={styles.poseContainer}>
                    <Text style={[styles.poseLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                        CURRENT POSE
                    </Text>
                    <Text style={[styles.poseNameActive, { color: colors.text }]}>
                        {getCurrentPoseName()}
                    </Text>
                    {!isPaused && selectedPosesRef.current.length > 1 && (
                        <Pressable style={styles.nextPoseButton} onPress={handleNextPose}>
                            <MaterialIcons name="skip-next" size={24} color={DesignTokens.primary} />
                            <Text style={styles.nextPoseText}>Next Pose</Text>
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
                    onPress={isActive ? (isPaused ? handleResume : handlePause) : () => setSessionMode('selecting')}
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
    poseNameActive: {
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
    // New styles for pose selector
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
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: DesignTokens.surface,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectionContainer: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    poseList: {
        gap: 8,
    },
    poseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    poseInfo: {
        flex: 1,
    },
    poseName: {
        fontSize: 16,
        fontWeight: '600',
    },
    poseSanskrit: {
        fontSize: 12,
        marginTop: 2,
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: '600',
    },
    customInput: {
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    customInputFlex: {
        flex: 1,
    },
    customPoseRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    addButton: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedPosesContainer: {
        marginTop: 8,
        gap: 8,
    },
    selectedPoseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    selectedPoseText: {
        fontSize: 14,
        fontWeight: '500',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(19, 236, 109, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
