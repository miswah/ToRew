import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Request Permissions
export async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    // Optional: Alert user gracefully
    return false;
  }
  return true;
}

// 3. Schedule the Notification
export async function scheduleTaskReminder(title, hours, minutes) {
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours);
  triggerDate.setMinutes(minutes);
  triggerDate.setSeconds(0);

  // If time has passed for today, schedule for tomorrow
  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  // Schedule
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Quest Reminder! ⚔️",
      body: `Don't forget to complete: "${title}"`,
      sound: true,
    },
    trigger: triggerDate,
  });

  return id;
}

// 4. Cancel Notification (when task is deleted/completed)
export async function cancelTaskReminder(notificationId) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}