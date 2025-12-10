/**
 * Simple Event Bus for cross-component communication
 * 
 * Used for:
 * - Profile updated → Trigger home refresh
 * - Jobs changed → Trigger list refresh
 * 
 * Usage:
 *   // Emit
 *   eventBus.emit('profile:updated', { timestamp: Date.now() });
 * 
 *   // Listen
 *   useEffect(() => {
 *     const unsubscribe = eventBus.on('profile:updated', (data) => {
 *       console.log('Profile updated at:', data.timestamp);
 *       loadData();
 *     });
 *     return () => unsubscribe();
 *   }, []);
 */

type EventCallback = (data?: any) => void;
type Unsubscribe = () => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in listener for '${event}':`, error);
        }
      });
    }
    
    if (__DEV__) {
      console.log(`[EventBus] Emitted '${event}'`, data);
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event names constants
export const EVENTS = {
  PROFILE_UPDATED: 'profile:updated',
  JOBS_REFRESH: 'jobs:refresh',
  FILTER_CHANGED: 'filter:changed',
  NOTIFICATIONS_READ: 'notifications:read', // Emitted when notifications are marked as read
  APPLICATION_STATUS_UPDATED: 'application:status_updated', // Emitted when application status changes
} as const;

export default eventBus;
