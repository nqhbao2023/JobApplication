/**
 * Push Notification Service
 * 
 * Smart notifications for students:
 * 1. New job matching schedule
 * 2. Job nearby (<3km)
 * 3. High salary job (>20% market)
 * 4. Reminder for saved jobs
 * 
 * NOTE: Push notifications are NOT supported in Expo Go SDK 53+
 * This service gracefully degrades when running in Expo Go.
 * For full functionality, use a development build.
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, auth } from '@/config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Safe import for notifications - may not be available in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let SchedulableTriggerInputTypes: any = null;
let isNotificationsAvailable = false;

// Check if we're in Expo Go (notifications not supported in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo' || !Constants.executionEnvironment || Constants.executionEnvironment === 'storeClient';

try {
  // Only import if not in Expo Go or if it's a dev build
  if (!isExpoGo) {
    Notifications = require('expo-notifications');
    SchedulableTriggerInputTypes = Notifications?.SchedulableTriggerInputTypes;
    isNotificationsAvailable = true;
    
    // Configure notification behavior
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    console.log('✅ Push notifications initialized');
  } else {
    console.log('ℹ️ Push notifications disabled in Expo Go (SDK 53+)');
  }
} catch (error) {
  // Expected in Expo Go - notifications not supported
  console.log('ℹ️ Push notifications not available (expected in Expo Go)');
  isNotificationsAvailable = false;
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
   * Check if notifications are available
   */
  isAvailable(): boolean {
    return isNotificationsAvailable && Notifications !== null;
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check if notifications are available first
    if (!this.isAvailable()) {
      console.log('ℹ️ Push notifications not available (Expo Go or unsupported)');
      return null;
    }

    if (!Device.isDevice) {
      console.log('ℹ️ Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications!.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications!.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('ℹ️ Permission to receive notifications was denied');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId || projectId === 'your-project-id-here') {
        console.log('⚠️ EAS project ID not configured. Skipping push token registration.');
        console.log('💡 Run "eas init" to set up your project ID for push notifications.');
        return null;
      }

      const token = await Notifications!.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications!.setNotificationChannelAsync('default', {
          name: 'Thông báo việc làm',
          importance: Notifications!.AndroidImportance.MAX,
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
    if (!this.isAvailable() || !Notifications) {
      console.log('ℹ️ Notification skipped (not available):', title);
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...(data || {}) } as Record<string, unknown>,
          sound: true,
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      // Silently fail - expected in Expo Go
      console.log('ℹ️ Local notification failed:', title);
    }
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
    if (!this.isAvailable() || !Notifications || !SchedulableTriggerInputTypes) {
      console.log('ℹ️ Scheduled notification skipped (not available):', title);
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...(data || {}) } as Record<string, unknown>,
          sound: true,
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds },
      });
    } catch (error) {
      // Silently fail - expected in Expo Go
      console.log('ℹ️ Scheduled notification failed:', title);
    }
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
    if (!this.isAvailable() || !Notifications) {
      console.log('ℹ️ Cancel notifications skipped (not available)');
      return;
    }
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.log('ℹ️ Failed to cancel notifications');
    }
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    if (!this.isAvailable() || !Notifications) {
      return 'undetermined';
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      return 'undetermined';
    }
  }

  /**
   * Handle notification tap
   */
  addNotificationResponseListener(callback: (response: any) => void) {
    if (!this.isAvailable() || !Notifications) {
      // Return a dummy subscription that does nothing
      return { remove: () => {} };
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Handle notification received while app is open
   */
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (!this.isAvailable() || !Notifications) {
      // Return a dummy subscription that does nothing
      return { remove: () => {} };
    }
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
