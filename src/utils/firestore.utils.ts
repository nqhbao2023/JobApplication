/**
 * Firestore Utilities
 * Handle offline state, network errors, and reconnection logic
 */

import { db } from '@/config/firebase';
import { enableNetwork, disableNetwork } from 'firebase/firestore';

/**
 * Check if error is due to offline state
 */
export const isOfflineError = (error: any): boolean => {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';
  
  return (
    errorCode === 'unavailable' ||
    errorCode === 'failed-precondition' ||
    errorMessage.includes('client is offline') ||
    errorMessage.includes('could not be completed') ||
    errorMessage.includes('Connection failed') ||
    errorMessage.includes('Cloud Firestore backend')
  );
};

/**
 * Retry operation with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a network error
      if (!isOfflineError(error)) {
        throw error;
      }
      
      // Don't wait after last retry
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Force reconnect Firestore
 */
export const forceReconnect = async () => {
  try {
    console.log('🔄 Force reconnecting Firestore...');
    await disableNetwork(db);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await enableNetwork(db);
    console.log('✅ Firestore reconnected');
  } catch (error) {
    console.error('❌ Could not reconnect Firestore:', error);
    throw error;
  }
};

/**
 * Wrap Firestore operation with offline error handling
 */
export const withOfflineHandling = async <T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    return await retryWithBackoff(operation);
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn('⚠️ Operation failed due to offline state');
      if (fallback !== undefined) {
        return fallback;
      }
    }
    throw error;
  }
};
