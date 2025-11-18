/**
 * Push Notification Service
 * 
 * Smart notifications for students:
 * 1. New job matching schedule
 * 2. Job nearby (<3km)
 * 3. High salary job (>20% market)
 * 4. Reminder for saved jobs
 */

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, auth } from '@/config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configure notification behavior (silently fail in Expo Go)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  // Expo Go doesn't support notifications - this is expected
  console.log('⚠️ Notifications not available in Expo Go');
}

export interface NotificationData {
  type: 'new_job_match' | 'nearby_job' | 'high_salary' | 'saved_reminder' | 'application_update';
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  salary?: string;
  distance?: number;
  matchScore?: number;
}

class PushNotificationService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission to receive notifications was denied');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId || projectId === 'your-project-id-here') {
        console.log('⚠️ EAS project ID not configured. Skipping push token registration.');
        console.log('💡 Run "eas init" to set up your project ID for push notifications.');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo việc làm',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A80F0',
        });
      }

      // Save token to Firestore
      await this.saveTokenToFirestore(token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Firestore
   */
  private async saveTokenToFirestore(token: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: token,
        pushNotificationsEnabled: true,
        updatedAt: new Date(),
      });

      console.log('✅ Push token saved to Firestore');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...(data || {}) } as Record<string, unknown>,
        sound: true,
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerSeconds: number,
    data?: NotificationData
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...(data || {}) } as Record<string, unknown>,
        sound: true,
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds },
    });
  }

  /**
   * Notification: New job matching student's schedule
   */
  notifyNewJobMatch(
    jobTitle: string,
    companyName: string,
    matchScore: number,
    jobId: string
  ) {
    const emoji = matchScore > 0.8 ? '🔥' : matchScore > 0.6 ? '⭐' : '✨';
    
    this.sendLocalNotification(
      `${emoji} Việc làm phù hợp với bạn!`,
      `${jobTitle} tại ${companyName} - Độ phù hợp: ${Math.round(matchScore * 100)}%`,
      {
        type: 'new_job_match',
        jobId,
        jobTitle,
        companyName,
        matchScore,
      }
    );
  }

  /**
   * Notification: Job nearby (< 3km)
   */
  notifyNearbyJob(
    jobTitle: string,
    companyName: string,
    distance: number,
    jobId: string
  ) {
    this.sendLocalNotification(
      '📍 Việc làm gần bạn!',
      `${jobTitle} tại ${companyName} - Chỉ cách ${distance.toFixed(1)}km`,
      {
        type: 'nearby_job',
        jobId,
        jobTitle,
        companyName,
        distance,
      }
    );
  }

  /**
   * Notification: High salary job (>20% market average)
   */
  notifyHighSalaryJob(
    jobTitle: string,
    companyName: string,
    salary: string,
    jobId: string
  ) {
    this.sendLocalNotification(
      '💰 Lương cao!',
      `${jobTitle} tại ${companyName} - ${salary}`,
      {
        type: 'high_salary',
        jobId,
        jobTitle,
        companyName,
        salary,
      }
    );
  }

  /**
   * Notification: Reminder to apply saved jobs
   */
  notifySavedJobReminder(jobTitle: string, jobId: string) {
    this.sendLocalNotification(
      '⏰ Bạn chưa ứng tuyển!',
      `Công việc "${jobTitle}" bạn đã lưu đang chờ bạn ứng tuyển`,
      {
        type: 'saved_reminder',
        jobId,
        jobTitle,
      }
    );
  }

  /**
   * Notification: Application status update
   */
  notifyApplicationUpdate(
    jobTitle: string,
    status: 'accepted' | 'rejected',
    jobId: string
  ) {
    const emoji = status === 'accepted' ? '🎉' : '😔';
    const message = status === 'accepted' 
      ? `Chúc mừng! Đơn ứng tuyển "${jobTitle}" đã được chấp nhận`
      : `Đơn ứng tuyển "${jobTitle}" đã bị từ chối`;

    this.sendLocalNotification(
      `${emoji} Cập nhật đơn ứng tuyển`,
      message,
      {
        type: 'application_update',
        jobId,
        jobTitle,
      }
    );
  }

  /**
   * Schedule daily job recommendations (9 AM)
   */
  async scheduleDailyJobRecommendations() {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(9, 0, 0, 0);

    // If 9 AM already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const secondsUntilTrigger = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);

    await this.scheduleNotification(
      '🌅 Chào buổi sáng!',
      'Có những việc làm mới phù hợp với bạn hôm nay',
      secondsUntilTrigger,
      { type: 'new_job_match' }
    );

    console.log(`✅ Daily recommendation scheduled for ${scheduledTime.toLocaleString()}`);
  }

  /**
   * Schedule reminder for saved jobs (every 3 days)
   */
  async scheduleSavedJobReminder(jobTitle: string, jobId: string) {
    const threeDaysInSeconds = 3 * 24 * 60 * 60;

    await this.scheduleNotification(
      '💼 Nhắc nhở ứng tuyển',
      `Bạn vẫn chưa ứng tuyển "${jobTitle}"`,
      threeDaysInSeconds,
      {
        type: 'saved_reminder',
        jobId,
        jobTitle,
      }
    );
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cancelled');
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Handle notification tap
   */
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Handle notification received while app is open
   */
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
