import { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { pushNotificationService, NotificationData } from '@/services/pushNotification.service';
import { auth } from '@/config/firebase';

// Type for subscription (expo-notifications returns this)
interface NotificationSubscription {
  remove: () => void;
}

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  
  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    registerForPushNotifications();

    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('📬 Notification received:', notification);
        setNotification(notification);
      }
    );

    responseListener.current = pushNotificationService.addNotificationResponseListener(
      (response: Notifications.NotificationResponse) => {
        console.log('👆 Notification tapped:', response);
        handleNotificationTap(response.notification);
      }
    );

    return () => {
      try {
        // Use the remove() method from the subscription object
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (error) {
        console.log('Cleanup notification subscriptions failed:', error);
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const token = await pushNotificationService.registerForPushNotifications();
      setExpoPushToken(token);

      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);

      if (token) {
        console.log('✅ Push notifications registered:', token);
        await pushNotificationService.scheduleDailyJobRecommendations();
      }
    } catch (error) {
      console.error('Error registering push notifications:', error);
    }
  };

  const handleNotificationTap = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as unknown as NotificationData;

    if (data.jobId) {
      router.push({
        pathname: '/(shared)/jobDescription',
        params: { jobId: data.jobId, from: '/(candidate)' },
      });
    } else if (data.type === 'new_job_match') {
      router.push('/(candidate)');
    } else if (data.type === 'saved_reminder') {
      router.push('/(candidate)/savedJobs');
    } else if (data.type === 'application_update') {
      router.push('/(candidate)/applicationTracker');
    }
  };

  const requestPermissions = async () => {
    try {
      const token = await pushNotificationService.registerForPushNotifications();
      setExpoPushToken(token);
      
      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  return {
    expoPushToken,
    notification,
    permissionStatus,
    requestPermissions,
  };
};