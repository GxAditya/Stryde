import * as Notifications from 'expo-notifications';

/**
 * Setup notification listener to handle notification taps
 */
export function setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification.request.content.title);
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener(response => {
        const screen = response.notification.request.content.data?.screen;
        console.log('Notification tapped, navigate to:', screen);
        // Navigation will be handled by the app when user taps notification
        // The screen data is available in response.notification.request.content.data
    });
}
