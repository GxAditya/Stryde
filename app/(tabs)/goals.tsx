import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Switch, Dimensions, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGoalsForDate, updateGoal, createGoal } from '@/lib/db';
import { useGoalStore } from '@/stores/goal-store';
import { useHydrationStore } from '@/stores/hydration-store';
import {
    scheduleRecurringHydrationReminder,
    cancelRecurringHydrationReminder,
    scheduleDailyGoalReminder,
    cancelDailyGoalReminder,
    scheduleDailyReport,
    cancelDailyReport,
    requestNotificationPermissions,
} from '@/lib/notifications';

const { width } = Dimensions.get('window');

export default function GoalsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const { loadGoals } = useGoalStore();
    const { setDailyGoal: setHydrationGoal, dailyGoal: hydrationGoal } = useHydrationStore();

    const [notifications, setNotifications] = useState({
        stayActive: true,
        hydration: false,
        dailySummary: true,
    });

    const [dailyStepGoal, setDailyStepGoal] = useState('10000');
    const [dailyDistance, setDailyDistance] = useState('8.0');
    const [dailyHydration, setDailyHydration] = useState(hydrationGoal.toString());
    const [isSaving, setIsSaving] = useState(false);

    // Custom reminders state
    const [customReminders, setCustomReminders] = useState<Array<{
        id: string;
        title: string;
        message: string;
        hour: number;
        minute: number;
        enabled: boolean;
    }>>([]);
    const [showAddReminderModal, setShowAddReminderModal] = useState(false);
    const [newReminderTitle, setNewReminderTitle] = useState('');
    const [newReminderMessage, setNewReminderMessage] = useState('');
    const [newReminderHour, setNewReminderHour] = useState('12');
    const [newReminderMinute, setNewReminderMinute] = useState('00');

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Load custom reminders on mount
    React.useEffect(() => {
        loadCustomReminders();
    }, []);

    // Initialize notifications on mount
    React.useEffect(() => {
        const initNotifications = async () => {
            // Request permissions on first load
            await requestNotificationPermissions();

            // Schedule active notifications based on current state
            if (notifications.stayActive) {
                await scheduleDailyGoalReminder(true);
            }
            if (notifications.hydration) {
                await scheduleRecurringHydrationReminder(120, true); // Every 2 hours
            }
            if (notifications.dailySummary) {
                await scheduleDailyReport(true);
            }
        };
        initNotifications();
    }, []);

    // Handle notification toggle with actual scheduling
    const handleNotificationToggle = async (key: keyof typeof notifications) => {
        const newValue = !notifications[key];
        setNotifications((prev) => ({ ...prev, [key]: newValue }));

        try {
            if (key === 'stayActive') {
                // Daily goal reminder at 6 PM
                if (newValue) {
                    await scheduleDailyGoalReminder(true);
                } else {
                    await cancelDailyGoalReminder();
                }
            } else if (key === 'hydration') {
                // Recurring hydration reminder every 2 hours
                if (newValue) {
                    await scheduleRecurringHydrationReminder(120, true);
                } else {
                    await cancelRecurringHydrationReminder();
                }
            } else if (key === 'dailySummary') {
                // Daily report at 8 PM
                if (newValue) {
                    await scheduleDailyReport(true);
                } else {
                    await cancelDailyReport();
                }
            }
        } catch (error) {
            console.error('Error toggling notification:', error);
        }
    };

    // Load custom reminders from storage
    const loadCustomReminders = async () => {
        try {
            const stored = await AsyncStorage.getItem('customReminders');
            if (stored) {
                setCustomReminders(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading custom reminders:', error);
        }
    };

    // Save custom reminders to storage
    const saveCustomReminders = async (reminders: typeof customReminders) => {
        try {
            await AsyncStorage.setItem('customReminders', JSON.stringify(reminders));
            setCustomReminders(reminders);
        } catch (error) {
            console.error('Error saving custom reminders:', error);
        }
    };

    // Add new custom reminder
    const handleAddReminder = async () => {
        if (!newReminderTitle.trim()) {
            Alert.alert('Error', 'Please enter a reminder title');
            return;
        }

        const hour = parseInt(newReminderHour);
        const minute = parseInt(newReminderMinute);

        if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
            Alert.alert('Error', 'Please enter a valid time (Hour: 0-23, Minute: 0-59)');
            return;
        }

        const newReminder = {
            id: `custom-${Date.now()}`,
            title: newReminderTitle,
            message: newReminderMessage || `Time for: ${newReminderTitle}`,
            hour,
            minute,
            enabled: true,
        };

        const updatedReminders = [...customReminders, newReminder];
        await saveCustomReminders(updatedReminders);

        // Schedule the notification
        await scheduleCustomReminder(newReminder);

        // Reset form
        setNewReminderTitle('');
        setNewReminderMessage('');
        setNewReminderHour('12');
        setNewReminderMinute('00');
        setShowAddReminderModal(false);

        Alert.alert('Success', 'Custom reminder added!');
    };

    // Schedule a custom reminder
    const scheduleCustomReminder = async (reminder: typeof customReminders[0]) => {
        if (!reminder.enabled) return;

        try {
            const { default: Notifications } = await import('expo-notifications');
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: reminder.title,
                    body: reminder.message,
                    data: {
                        type: 'custom_reminder',
                        reminderId: reminder.id,
                        screen: '/',
                    },
                    sound: 'default',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: reminder.hour,
                    minute: reminder.minute,
                },
            });
        } catch (error) {
            console.error('Error scheduling custom reminder:', error);
        }
    };

    // Toggle custom reminder
    const toggleCustomReminder = async (reminderId: string) => {
        const updatedReminders = customReminders.map(r => {
            if (r.id === reminderId) {
                return { ...r, enabled: !r.enabled };
            }
            return r;
        });

        await saveCustomReminders(updatedReminders);

        const reminder = updatedReminders.find(r => r.id === reminderId);
        if (reminder) {
            if (reminder.enabled) {
                await scheduleCustomReminder(reminder);
            } else {
                // Cancel the notification
                await cancelCustomReminder(reminderId);
            }
        }
    };

    // Cancel a custom reminder
    const cancelCustomReminder = async (reminderId: string) => {
        try {
            const { default: Notifications } = await import('expo-notifications');
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const notification of scheduled) {
                if (notification.content.data?.reminderId === reminderId) {
                    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                }
            }
        } catch (error) {
            console.error('Error canceling custom reminder:', error);
        }
    };

    // Delete custom reminder
    const deleteCustomReminder = async (reminderId: string) => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelCustomReminder(reminderId);
                        const updatedReminders = customReminders.filter(r => r.id !== reminderId);
                        await saveCustomReminders(updatedReminders);
                    },
                },
            ]
        );
    };

    const handleSaveGoals = async () => {
        try {
            setIsSaving(true);
            const today = new Date().toISOString().split('T')[0];

            // Get existing goals for today
            const existingGoals = await getGoalsForDate(today);

            // Update or create daily steps goal
            const stepsGoal = existingGoals.find(g => g.type === 'daily_steps');
            if (stepsGoal) {
                await updateGoal(stepsGoal.id, { target: parseFloat(dailyStepGoal) });
            } else {
                await createGoal({
                    id: `daily_steps_${Date.now()}`,
                    type: 'daily_steps',
                    target: parseFloat(dailyStepGoal),
                    date: today,
                });
            }

            // Update or create daily distance goal
            const distanceGoal = existingGoals.find(g => g.type === 'daily_distance');
            if (distanceGoal) {
                await updateGoal(distanceGoal.id, { target: parseFloat(dailyDistance) * 1000 }); // Convert km to meters
            } else {
                await createGoal({
                    id: `daily_distance_${Date.now()}`,
                    type: 'daily_distance',
                    target: parseFloat(dailyDistance) * 1000, // Convert km to meters
                    date: today,
                });
            }

            // Save hydration goal to hydration store
            setHydrationGoal(parseFloat(dailyHydration));

            Alert.alert('Success', 'Goals saved successfully!');

            // Reload goals in the store so home page shows updated values
            await loadGoals();
        } catch (error) {
            console.error('Error saving goals:', error);
            Alert.alert('Error', 'Failed to save goals. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.backButton}>
                    {/* Back functionality usually goes here, but this is a tab */}
                    {/* <MaterialIcons name="arrow-back-ios" size={20} color={colors.text} /> */}
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Goals & Reminders</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Daily Targets */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Targets</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.inputLabel}>DAILY STEP GOAL</Text>
                        </View>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                value={dailyStepGoal}
                                onChangeText={setDailyStepGoal}
                                keyboardType="numeric"
                            />
                            <View style={[styles.inputIcon, { borderColor: isDark ? '#3b5445' : colors.border }]}>
                                <MaterialIcons name="directions-walk" size={24} color={DesignTokens.primary} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.inputLabel}>DISTANCE (KM)</Text>
                        </View>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                value={dailyDistance}
                                onChangeText={setDailyDistance}
                                keyboardType="numeric"
                            />
                            <View style={[styles.inputIcon, { borderColor: isDark ? '#3b5445' : colors.border }]}>
                                <MaterialIcons name="map" size={24} color={DesignTokens.primary} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.inputLabel}>HYDRATION (ML)</Text>
                        </View>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                value={dailyHydration}
                                onChangeText={setDailyHydration}
                                keyboardType="numeric"
                            />
                            <View style={[styles.inputIcon, { borderColor: isDark ? '#3b5445' : colors.border }]}>
                                <MaterialIcons name="water-drop" size={24} color={DesignTokens.primary} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Save Goals Button */}
                <View style={styles.saveGoalsButtonContainer}>
                    <Pressable
                        style={[styles.saveGoalsButton, isSaving && styles.saveGoalsButtonDisabled]}
                        onPress={handleSaveGoals}
                        disabled={isSaving}
                    >
                        <MaterialIcons name="save" size={20} color={DesignTokens.background} />
                        <Text style={styles.saveGoalsButtonText}>
                            {isSaving ? 'Saving...' : 'Save Goals'}
                        </Text>
                    </Pressable>
                </View>

                {/* Smart Reminders */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text, paddingBottom: 0 }]}>Smart Reminders</Text>
                        <Pressable onPress={() => setShowAddReminderModal(true)}>
                            <Text style={styles.addNewText}>Add New</Text>
                        </Pressable>
                    </View>

                    <View style={styles.remindersStack}>
                        {/* Reminder 1 */}
                        <View style={[styles.reminderCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <View style={styles.reminderInfo}>
                                <View style={styles.reminderIcon}>
                                    <MaterialIcons name="notifications-active" size={24} color={DesignTokens.primary} />
                                </View>
                                <View>
                                    <Text style={[styles.reminderTitle, { color: colors.text }]}>Daily Goal Check-In</Text>
                                    <Text style={styles.reminderSubtitle}>Every day at 6:00 PM</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: '#767577', true: DesignTokens.primary }}
                                thumbColor={DesignTokens.white}
                                onValueChange={() => handleNotificationToggle('stayActive')}
                                value={notifications.stayActive}
                            />
                        </View>

                        {/* Reminder 2 */}
                        <View style={[styles.reminderCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <View style={styles.reminderInfo}>
                                <View style={styles.reminderIcon}>
                                    <MaterialIcons name="local-drink" size={24} color={DesignTokens.primary} />
                                </View>
                                <View>
                                    <Text style={[styles.reminderTitle, { color: colors.text }]}>Hydration Alert</Text>
                                    <Text style={styles.reminderSubtitle}>Every 2 hours</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: '#767577', true: DesignTokens.primary }}
                                thumbColor={DesignTokens.white}
                                onValueChange={() => handleNotificationToggle('hydration')}
                                value={notifications.hydration}
                            />
                        </View>

                        {/* Reminder 3 */}
                        <View style={[styles.reminderCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                            <View style={styles.reminderInfo}>
                                <View style={styles.reminderIcon}>
                                    <MaterialIcons name="summarize" size={24} color={DesignTokens.primary} />
                                </View>
                                <View>
                                    <Text style={[styles.reminderTitle, { color: colors.text }]}>Daily Summary</Text>
                                    <Text style={styles.reminderSubtitle}>Every day at 21:00</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: '#767577', true: DesignTokens.primary }}
                                thumbColor={DesignTokens.white}
                                onValueChange={() => handleNotificationToggle('dailySummary')}
                                value={notifications.dailySummary}
                            />
                        </View>

                        {/* Custom Reminders */}
                        {customReminders.map((reminder) => (
                            <View key={reminder.id} style={[styles.reminderCard, { backgroundColor: isDark ? '#1c2720' : colors.white, borderColor: isDark ? '#3b5445' : colors.border }]}>
                                <View style={styles.reminderInfo}>
                                    <View style={styles.reminderIcon}>
                                        <MaterialIcons name="alarm" size={24} color={DesignTokens.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.reminderTitle, { color: colors.text }]}>{reminder.title}</Text>
                                        <Text style={styles.reminderSubtitle}>
                                            Daily at {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}
                                        </Text>
                                    </View>
                                    <Pressable onPress={() => deleteCustomReminder(reminder.id)} style={{ marginRight: 8 }}>
                                        <MaterialIcons name="delete" size={20} color="#ef4444" />
                                    </Pressable>
                                </View>
                                <Switch
                                    trackColor={{ false: '#767577', true: DesignTokens.primary }}
                                    thumbColor={DesignTokens.white}
                                    onValueChange={() => toggleCustomReminder(reminder.id)}
                                    value={reminder.enabled}
                                />
                            </View>
                        ))}
                    </View>

                    <Text style={styles.disclaimerText}>
                        All reminders are processed locally on your device for privacy.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Reminder Modal */}
            <Modal
                visible={showAddReminderModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddReminderModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c2720' : colors.white }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Reminder</Text>

                        <Text style={[styles.modalLabel, { color: colors.text }]}>Reminder Title</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: isDark ? '#3b5445' : colors.border, backgroundColor: isDark ? '#0f1711' : '#f9fafb' }]}
                            value={newReminderTitle}
                            onChangeText={setNewReminderTitle}
                            placeholder="e.g., Take vitamins"
                            placeholderTextColor="#9db9a8"
                        />

                        <Text style={[styles.modalLabel, { color: colors.text }]}>Message (optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: isDark ? '#3b5445' : colors.border, backgroundColor: isDark ? '#0f1711' : '#f9fafb' }]}
                            value={newReminderMessage}
                            onChangeText={setNewReminderMessage}
                            placeholder="Custom notification message"
                            placeholderTextColor="#9db9a8"
                            multiline
                        />

                        <Text style={[styles.modalLabel, { color: colors.text }]}>Time</Text>
                        <View style={styles.timeInputRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.timeLabel}>Hour (0-23)</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: colors.text, borderColor: isDark ? '#3b5445' : colors.border, backgroundColor: isDark ? '#0f1711' : '#f9fafb' }]}
                                    value={newReminderHour}
                                    onChangeText={setNewReminderHour}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                            <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.timeLabel}>Minute (0-59)</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: colors.text, borderColor: isDark ? '#3b5445' : colors.border, backgroundColor: isDark ? '#0f1711' : '#f9fafb' }]}
                                    value={newReminderMinute}
                                    onChangeText={setNewReminderMinute}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowAddReminderModal(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonAdd]}
                                onPress={handleAddReminder}
                            >
                                <Text style={styles.modalButtonText}>Add Reminder</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
    },
    saveGoalsButtonContainer: {
        marginBottom: 24,
    },
    saveGoalsButton: {
        height: 50,
        backgroundColor: DesignTokens.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: DesignTokens.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    saveGoalsButtonDisabled: {
        opacity: 0.6,
    },
    saveGoalsButtonText: {
        color: DesignTokens.background,
        fontWeight: 'bold',
        fontSize: 15,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16, // added margin bottom for spacing
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingBottom: 16,
    },
    addNewText: {
        color: DesignTokens.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabelContainer: {
        marginBottom: 8,
    },
    inputLabel: {
        color: '#9db9a8',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '500',
    },
    inputIcon: {
        width: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
    },
    remindersStack: {
        gap: 12,
    },
    reminderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    reminderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reminderIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 109, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    reminderSubtitle: {
        color: '#9db9a8',
        fontSize: 12,
    },
    disclaimerText: {
        fontSize: 10,
        color: 'rgba(157, 185, 168, 0.6)',
        textAlign: 'center',
        marginTop: 16,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 4,
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeLabel: {
        fontSize: 12,
        color: '#9db9a8',
        marginBottom: 4,
    },
    timeColon: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
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
        justifyContent: 'center',
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
