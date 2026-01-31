import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pedometer, Accelerometer } from 'expo-sensors';
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
    const [stepCount, setStepCount] = useState(0);
    const [distance, setDistance] = useState(0); // in meters
    const [activityType, setActivityType] = useState<'walking' | 'running'>('walking');
    const [gpsStrength, setGpsStrength] = useState<'Weak' | 'Fair' | 'Strong'>('Weak');
    const [isAccelerometerActive, setIsAccelerometerActive] = useState(false);

    // Refs
    const pedometerSubscription = useRef<Pedometer.Subscription | null>(null);
    const accelerometerSubscription = useRef<{ remove: () => void } | null>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const lastLocation = useRef<Location.LocationObject | null>(null);
    const initialLocation = useRef<Location.LocationObject | null>(null);
    const stepBuffer = useRef(0);

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
                Alert.alert('Permission Required', 'Location permission is strictly needed to measure distance.');
                return;
            }

            // Check Pedometer Availability & Permission
            const isPedometerAvailable = await Pedometer.isAvailableAsync();
            if (isPedometerAvailable) {
                const { status: pedometerStatus } = await Pedometer.requestPermissionsAsync();
                if (pedometerStatus !== 'granted') {
                    Alert.alert(
                        'Pedometer Permission',
                        'Pedometer permission was denied. We will attempt to use the accelerometer to count steps, but it may be less accurate.',
                        [{ text: 'OK' }]
                    );
                }
            }

            setIsCalibrating(true);
            setStepCount(0);
            setDistance(0);
            stepBuffer.current = 0;

            // Get initial fix
            const startLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
            initialLocation.current = startLoc;
            lastLocation.current = startLoc;

            // Start Sensors
            startStepTracking();
            startDistanceTracking();

        } catch (err) {
            console.error('Failed to start calibration:', err);
            setIsCalibrating(false);
        }
    };

    const startStepTracking = async () => {
        const available = await Pedometer.isAvailableAsync();
        let canUsePedometer = available;

        if (available) {
            const { status } = await Pedometer.getPermissionsAsync();
            if (status !== 'granted') {
                canUsePedometer = false;
            }
        }

        if (canUsePedometer) {
            setIsAccelerometerActive(false);
            pedometerSubscription.current = Pedometer.watchStepCount(result => {
                const newSteps = result.steps - stepBuffer.current;
                if (stepBuffer.current === 0) {
                    stepBuffer.current = result.steps; // Initialize buffer
                } else if (newSteps > 0) {
                    incrementSteps(newSteps);
                }
            });
        } else {
            // Fallback to Accelerometer
            setIsAccelerometerActive(true);
            Accelerometer.setUpdateInterval(100);
            let lastAcc = 0;
            let lastStepTime = 0;
            accelerometerSubscription.current = Accelerometer.addListener(({ x, y, z }) => {
                const acc = Math.sqrt(x * x + y * y + z * z);
                const now = Date.now();
                if (acc > 1.2 && now - lastStepTime > 300) {
                    if (acc < lastAcc) {
                        incrementSteps(1);
                        lastStepTime = now;
                    }
                }
                lastAcc = acc;
            });
        }
    };

    const incrementSteps = (count: number) => {
        setStepCount(prev => prev + count);
    };

    // Use useEffect to trigger completion to avoid state update loops and ensure Alert visibility
    useEffect(() => {
        if (isCalibrating && stepCount >= targetSteps) {
            completeCalibration(targetSteps);
        }
    }, [stepCount, targetSteps, isCalibrating]);


    const startDistanceTracking = async () => {
        if (locationSubscription.current) locationSubscription.current.remove();

        locationSubscription.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
            (location) => {
                if (!lastLocation.current) {
                    lastLocation.current = location;
                    return;
                }

                // Calculate distance between points
                // Simple haversine or imported util could work, but for now we use a rough approximation or a proper helper if available
                // Since we don't have a helper imported, let's look at available imports.
                // We can use a simple Euclidean approximation for short distances or Haversine.
                // Actually, simply adding distance from location updates is what we want.

                // However, expo-location doesn't give distanceBetween directly.
                // We will accumulate distance manually.
                // Calculating roughly:
                const lat1 = lastLocation.current.coords.latitude;
                const lon1 = lastLocation.current.coords.longitude;
                const lat2 = location.coords.latitude;
                const lon2 = location.coords.longitude;

                const R = 6371e3; // metres
                const φ1 = lat1 * Math.PI / 180;
                const φ2 = lat2 * Math.PI / 180;
                const Δφ = (lat2 - lat1) * Math.PI / 180;
                const Δλ = (lon2 - lon1) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c; // in meters

                setDistance(prev => prev + d);
                lastLocation.current = location;
            }
        );
    };

    const completeCalibration = async (finalSteps: number) => {
        stopCalibration();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Calculate stride length
        const measuredDistance = distance; // meters
        const strideLength = measuredDistance / finalSteps;

        // Sanity check
        if (strideLength < 0.2 || strideLength > 2.0) {
            setTimeout(() => {
                Alert.alert(
                    "Calibration Failed",
                    `Calculated stride length (${strideLength.toFixed(2)}m) seems invalid. Please try again on a clearer path.`
                );
            }, 500);
            return;
        }

        // Ask for confirmation
        setTimeout(() => {
            Alert.alert(
                "Calibration Finished",
                `Distance: ${measuredDistance.toFixed(2)}m\nSteps: ${finalSteps}\n\nCalculated Stride: ${strideLength.toFixed(2)}m\n\nDo you want to save this profile?`,
                [
                    {
                        text: "Discard",
                        style: "cancel",
                        onPress: () => {
                            setStepCount(0);
                            setDistance(0);
                        }
                    },
                    {
                        text: "Save",
                        onPress: async () => {
                            try {
                                await createProfile({
                                    step_length_m: strideLength,
                                    activity_type: activityType,
                                    confidence: 0.95
                                });
                                Alert.alert("Saved", "Your stride length has been updated!", [{ text: "OK", onPress: () => router.back() }]);
                            } catch (err) {
                                Alert.alert("Error", "Failed to save calibration profile.");
                            }
                        }
                    }
                ]
            );
        }, 500);
    };

    const stopCalibration = () => {
        setIsCalibrating(false);
        pedometerSubscription.current?.remove();
        accelerometerSubscription.current?.remove();
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
                {/* Progress Section Removed */}

                {/* Settings Section (New) */}
                {!isCalibrating && (
                    <View style={styles.settingsContainer}>
                        {/* Step Count Selector */}
                        <View style={styles.settingRow}>
                            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Target Steps</Text>
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
                {!isCalibrating && (
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

                {/* Main Counter */}
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
                            Maintain a steady pace on level ground for the most accurate results.
                        </Text>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
                        <View style={styles.statHeader}>
                            <MaterialIcons name="location-on" size={16} color={DesignTokens.primary} />
                            <Text style={styles.statLabel}>GPS SIGNAL</Text>
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{gpsStrength}</Text>
                        <View style={styles.statStatus}>
                            <View style={[styles.statusDot, { backgroundColor: gpsStrength === 'Weak' ? DesignTokens.error : DesignTokens.primary }]} />
                            <Text style={styles.statusText}>{gpsStrength === 'Strong' ? 'Excellent' : 'Searching...'}</Text>
                        </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
                        <View style={styles.statHeader}>
                            <MaterialIcons name="sensors" size={16} color={DesignTokens.primary} />
                            <Text style={styles.statLabel}>SENSORS</Text>
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{isAccelerometerActive ? 'Accel' : 'Pedometer'}</Text>
                        <View style={styles.statStatus}>
                            <View style={[styles.statusDot, { backgroundColor: DesignTokens.primary }]} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {!isCalibrating ? (
                        <Pressable style={styles.startBtn} onPress={startCalibration}>
                            <MaterialIcons name="play-arrow" size={24} color={DesignTokens.background} />
                            <Text style={styles.startBtnText}>Start Calibrating</Text>
                        </Pressable>
                    ) : (
                        <Pressable style={[styles.startBtn, { backgroundColor: DesignTokens.error }]} onPress={() => completeCalibration(targetSteps)}>
                            <MaterialIcons name="stop" size={24} color={DesignTokens.white} />
                            <Text style={[styles.startBtnText, { color: DesignTokens.white }]}>Stop Calibration</Text>
                        </Pressable>
                    )}

                    <View style={styles.modeIndicator}>
                        <MaterialIcons name="cloud-off" size={12} color={colors.textSecondary} />
                        <Text style={[styles.modeText, { color: colors.textSecondary }]}>OFFLINE PRECISION MODE ACTIVE</Text>
                    </View>
                </View>
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
});
