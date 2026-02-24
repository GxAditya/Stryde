import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Alert, Platform, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCalibrationStore } from '@/stores/calibration-store';

const { width } = Dimensions.get('window');
// const TARGET_STEPS = 100; // Removed constant

export default function CalibrationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';

    // Store
    const { createProfile, getActiveProfile } = useCalibrationStore();

    // State
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [targetSteps, setTargetSteps] = useState(20);
    const [manualStepInput, setManualStepInput] = useState('');
    const [showStepInput, setShowStepInput] = useState(false);
    const [distance, setDistance] = useState(0); // in meters
    const [activityType, setActivityType] = useState<'walking' | 'running'>('walking');
    const [gpsStrength, setGpsStrength] = useState<'Weak' | 'Fair' | 'Strong'>('Weak');
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    // Refs
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const lastLocation = useRef<Location.LocationObject | null>(null);
    const totalDistanceRef = useRef(0);

    // Initial permission check and GPS warm-up
    useEffect(() => {
        setupGPS();
        return () => stopCalibration();
    }, []);

    const setupGPS = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Watch position just for signal strength initially
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
                (location) => {
                    if (location.coords.accuracy) {
                        setGpsAccuracy(location.coords.accuracy);
                        if (location.coords.accuracy < 10) setGpsStrength('Strong');
                        else if (location.coords.accuracy < 20) setGpsStrength('Fair');
                        else setGpsStrength('Weak');
                    }
                }
            );
        } catch (err) {
            console.error(err);
        }
    };

    const startCalibration = async () => {
        try {
            // Check Location Permission (Required)
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                Alert.alert('Permission Required', 'Location permission is needed to measure distance.');
                return;
            }

            // Check GPS strength before starting
            if (gpsStrength === 'Weak') {
                Alert.alert(
                    'Weak GPS Signal',
                    'GPS signal is weak. For accurate calibration, please move to an open area with clear sky view.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Start Anyway', onPress: () => beginCalibration() }
                    ]
                );
                return;
            }

            beginCalibration();
        } catch (err) {
            console.error('Failed to start calibration:', err);
            setIsCalibrating(false);
        }
    };

    const beginCalibration = async () => {
        setIsCalibrating(true);
        setDistance(0);
        totalDistanceRef.current = 0;
        setManualStepInput('');
        setShowStepInput(false);

        // Get initial fix
        const startLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        lastLocation.current = startLoc;

        // Start GPS distance tracking
        startDistanceTracking();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Calculate distance between two GPS points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };


    const startDistanceTracking = async () => {
        if (locationSubscription.current) locationSubscription.current.remove();

        locationSubscription.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
            (location) => {
                // Update GPS strength
                if (location.coords.accuracy) {
                    setGpsAccuracy(location.coords.accuracy);
                    if (location.coords.accuracy < 10) setGpsStrength('Strong');
                    else if (location.coords.accuracy < 20) setGpsStrength('Fair');
                    else setGpsStrength('Weak');
                }

                if (!lastLocation.current) {
                    lastLocation.current = location;
                    return;
                }

                const d = calculateDistance(
                    lastLocation.current.coords.latitude,
                    lastLocation.current.coords.longitude,
                    location.coords.latitude,
                    location.coords.longitude
                );

                // Filter out GPS noise - only add if movement is reasonable
                // Minimum 0.5m to filter noise, maximum 5m to filter GPS jumps
                if (d > 0.5 && d < 5) {
                    totalDistanceRef.current += d;
                    setDistance(totalDistanceRef.current);
                }
                
                lastLocation.current = location;
            }
        );
    };

    const handleStopCalibration = () => {
        // Stop tracking but keep the data
        locationSubscription.current?.remove();
        setIsCalibrating(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // Check if we have enough distance
        if (distance < 5) {
            Alert.alert(
                'Not Enough Distance',
                'Please walk at least 5 meters for accurate calibration.',
                [{ text: 'OK', onPress: () => resetCalibration() }]
            );
            return;
        }
        
        // Show step input
        setManualStepInput(targetSteps.toString());
        setShowStepInput(true);
    };

    const confirmStepCount = () => {
        Keyboard.dismiss();
        const steps = parseInt(manualStepInput, 10);
        
        if (isNaN(steps) || steps < 5) {
            Alert.alert('Invalid Input', 'Please enter at least 5 steps.');
            return;
        }
        
        completeCalibration(steps);
    };

    const completeCalibration = async (finalSteps: number) => {
        setShowStepInput(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Calculate stride length
        const measuredDistance = distance; // meters
        const strideLength = measuredDistance / finalSteps;

        // Calculate confidence based on GPS accuracy and sample count
        let confidence = 0.9;
        if (gpsAccuracy && gpsAccuracy < 5) confidence = 0.98;
        else if (gpsAccuracy && gpsAccuracy < 10) confidence = 0.95;
        else if (gpsAccuracy && gpsAccuracy < 15) confidence = 0.85;
        else confidence = 0.75;

        // Sanity check
        if (strideLength < 0.3 || strideLength > 1.5) {
            Alert.alert(
                "Calibration Issue",
                `Calculated stride length (${strideLength.toFixed(2)}m) seems ${strideLength < 0.3 ? 'too short' : 'too long'}. \n\nTypical stride lengths:\n• Walking: 0.6m - 0.8m\n• Running: 0.8m - 1.2m\n\nPlease check your step count and try again.`,
                [{ text: 'OK', onPress: () => resetCalibration() }]
            );
            return;
        }

        // Ask for confirmation
        Alert.alert(
            "Calibration Complete",
            `Distance walked: ${measuredDistance.toFixed(1)}m\nSteps counted: ${finalSteps}\n\nCalculated Stride: ${strideLength.toFixed(2)}m\nConfidence: ${(confidence * 100).toFixed(0)}%\n\nSave this profile?`,
            [
                {
                    text: "Discard",
                    style: "cancel",
                    onPress: () => resetCalibration()
                },
                {
                    text: "Save",
                    onPress: async () => {
                        try {
                            await createProfile({
                                step_length_m: strideLength,
                                activity_type: activityType,
                                confidence: confidence
                            });
                            Alert.alert("Saved", "Your stride length has been saved!", [{ text: "OK", onPress: () => router.back() }]);
                        } catch (err) {
                            Alert.alert("Error", "Failed to save calibration profile.");
                        }
                    }
                }
            ]
        );
    };

    const resetCalibration = () => {
        setDistance(0);
        totalDistanceRef.current = 0;
        setManualStepInput('');
        setShowStepInput(false);
    };

    const stopCalibration = () => {
        setIsCalibrating(false);
        setShowStepInput(false);
        locationSubscription.current?.remove();
    };

    const cancel = () => {
        stopCalibration();
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={cancel} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Calibration</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {/* Instructions */}
                {!isCalibrating && !showStepInput && (
                    <View style={styles.instructionCard}>
                        <MaterialIcons name="info-outline" size={20} color={DesignTokens.primary} />
                        <Text style={[styles.instructionCardText, { color: colors.textSecondary }]}>
                            Count your steps out loud while walking. The GPS will measure the distance. When done, enter your step count.
                        </Text>
                    </View>
                )}

                {/* Settings Section */}
                {!isCalibrating && !showStepInput && (
                    <View style={styles.settingsContainer}>
                        {/* Target Step Count Info */}
                        <View style={styles.settingRow}>
                            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Recommended Steps</Text>
                            <View style={styles.stepSelector}>
                                <Pressable
                                    style={styles.stepBtn}
                                    onPress={() => setTargetSteps(prev => Math.max(10, prev - 10))}
                                >
                                    <MaterialIcons name="remove" size={20} color={colors.text} />
                                </Pressable>
                                <Text style={[styles.stepValue, { color: colors.text }]}>{targetSteps}</Text>
                                <Pressable
                                    style={styles.stepBtn}
                                    onPress={() => setTargetSteps(prev => Math.min(100, prev + 10))}
                                >
                                    <MaterialIcons name="add" size={20} color={colors.text} />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {/* Activity Toggle */}
                {!isCalibrating && !showStepInput && (
                    <View style={styles.toggleContainer}>
                        <Pressable
                            style={[styles.toggleButton, activityType === 'walking' && styles.toggleButtonActive]}
                            onPress={() => setActivityType('walking')}
                        >
                            <Text style={[styles.toggleText, activityType === 'walking' && styles.toggleTextActive]}>Walking</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.toggleButton, activityType === 'running' && styles.toggleButtonActive]}
                            onPress={() => setActivityType('running')}
                        >
                            <Text style={[styles.toggleText, activityType === 'running' && styles.toggleTextActive]}>Running</Text>
                        </Pressable>
                    </View>
                )}

                {/* Step Input Section */}
                {showStepInput && (
                    <View style={styles.stepInputContainer}>
                        <Text style={[styles.stepInputTitle, { color: colors.text }]}>How many steps did you take?</Text>
                        <Text style={[styles.stepInputSubtitle, { color: colors.textSecondary }]}>
                            Distance walked: {distance.toFixed(1)} meters
                        </Text>
                        <TextInput
                            style={[styles.stepInput, { color: colors.text, borderColor: DesignTokens.primary }]}
                            value={manualStepInput}
                            onChangeText={setManualStepInput}
                            keyboardType="number-pad"
                            placeholder="Enter step count"
                            placeholderTextColor={colors.textSecondary}
                            autoFocus
                        />
                        <View style={styles.stepInputButtons}>
                            <Pressable 
                                style={[styles.stepInputBtn, styles.stepInputBtnSecondary]} 
                                onPress={() => { setShowStepInput(false); resetCalibration(); }}
                            >
                                <Text style={styles.stepInputBtnTextSecondary}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.stepInputBtn} onPress={confirmStepCount}>
                                <Text style={styles.stepInputBtnText}>Calculate</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Main Counter */}
                {!showStepInput && (
                    <View style={styles.counterContainer}>
                        <View style={styles.ringContainer}>
                            <View style={[styles.ringOuter, isCalibrating && styles.ringPulse]} />
                            <View style={styles.ringInner} />
                            <View style={styles.countWrapper}>
                                <Text style={[styles.countText, { color: colors.text }]}>
                                    {distance.toFixed(1)}
                                </Text>
                                <Text style={styles.countLabel}>METERS COVERED</Text>
                            </View>
                        </View>

                        {isCalibrating && (
                            <Text style={styles.instructionText}>
                                Count your steps out loud!{"\n"}Walk at a steady pace on level ground.
                            </Text>
                        )}
                        {!isCalibrating && !showStepInput && distance === 0 && (
                            <Text style={styles.instructionText}>
                                Press Start, then walk {targetSteps} steps while counting.
                            </Text>
                        )}
                    </View>
                )}

                {/* Stats */}
                {!showStepInput && (
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
                            <View style={styles.statHeader}>
                                <MaterialIcons name="location-on" size={16} color={DesignTokens.primary} />
                                <Text style={styles.statLabel}>GPS SIGNAL</Text>
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{gpsStrength}</Text>
                            <View style={styles.statStatus}>
                                <View style={[styles.statusDot, { backgroundColor: gpsStrength === 'Weak' ? DesignTokens.error : DesignTokens.primary }]} />
                                <Text style={styles.statusText}>
                                    {gpsAccuracy ? `±${gpsAccuracy.toFixed(0)}m` : 'Searching...'}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
                            <View style={styles.statHeader}>
                                <MaterialIcons name="straighten" size={16} color={DesignTokens.primary} />
                                <Text style={styles.statLabel}>TARGET</Text>
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{targetSteps}</Text>
                            <View style={styles.statStatus}>
                                <View style={[styles.statusDot, { backgroundColor: DesignTokens.primary }]} />
                                <Text style={styles.statusText}>steps to count</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Footer */}
                {!showStepInput && (
                    <View style={styles.footer}>
                        {!isCalibrating ? (
                            <Pressable style={styles.startBtn} onPress={startCalibration}>
                                <MaterialIcons name="play-arrow" size={24} color={DesignTokens.background} />
                                <Text style={styles.startBtnText}>Start Calibrating</Text>
                            </Pressable>
                        ) : (
                            <Pressable style={[styles.startBtn, { backgroundColor: DesignTokens.error }]} onPress={handleStopCalibration}>
                                <MaterialIcons name="stop" size={24} color={DesignTokens.white} />
                                <Text style={[styles.startBtnText, { color: DesignTokens.white }]}>Done Walking</Text>
                            </Pressable>
                        )}

                        <View style={styles.modeIndicator}>
                            <MaterialIcons name="gps-fixed" size={12} color={colors.textSecondary} />
                            <Text style={[styles.modeText, { color: colors.textSecondary }]}>GPS-ONLY CALIBRATION</Text>
                        </View>
                    </View>
                )}
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    progressSection: {
        marginBottom: 30,
        gap: 8,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    progressLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    stepProgressText: {
        fontSize: 14,
        color: '#9db9a8',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: DesignTokens.primary,
        borderRadius: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 20,
    },
    settingsContainer: {
        gap: 16,
        marginBottom: 30,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    stepSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 4,
        borderRadius: 12,
    },
    stepBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    stepValue: {
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 30,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: DesignTokens.primary,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9db9a8',
    },
    toggleTextActive: {
        color: DesignTokens.background,
    },
    counterContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    ringContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    ringOuter: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.1)',
    },
    ringPulse: {
        borderColor: 'rgba(19, 236, 109, 0.3)',
        borderWidth: 2,
    },
    ringInner: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(19, 236, 109, 0.2)',
    },
    countWrapper: {
        alignItems: 'center',
    },
    countText: {
        fontSize: 64,
        fontWeight: '800',
        lineHeight: 64,
        fontVariant: ['tabular-nums'],
    },
    countLabel: {
        fontSize: 12,
        color: DesignTokens.primary,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 8,
    },
    instructionText: {
        textAlign: 'center',
        color: '#9db9a8',
        fontSize: 14,
        maxWidth: 240,
        marginTop: 30,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statLabel: {
        fontSize: 10,
        color: '#9db9a8',
        fontWeight: '600',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: DesignTokens.primary,
    },
    footer: {
        gap: 12,
    },
    startBtn: {
        backgroundColor: DesignTokens.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: DesignTokens.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    startBtnText: {
        color: DesignTokens.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    modeText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    instructionCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: 'rgba(19, 236, 109, 0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 109, 0.2)',
    },
    instructionCardText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    stepInputContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    stepInputTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    stepInputSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    stepInput: {
        width: '100%',
        height: 64,
        borderWidth: 2,
        borderRadius: 16,
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 24,
    },
    stepInputButtons: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    stepInputBtn: {
        flex: 1,
        height: 56,
        backgroundColor: DesignTokens.primary,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepInputBtnSecondary: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    stepInputBtnText: {
        color: DesignTokens.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepInputBtnTextSecondary: {
        color: '#9db9a8',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
