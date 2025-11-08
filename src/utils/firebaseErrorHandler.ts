export const isOfflineError = (error: any): boolean => {
  if (!error) return false;
  
  const code = error?.code;
  const message = error?.message?.toLowerCase() || '';
  
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    message.includes('offline') ||
    message.includes('client is offline') ||
    message.includes('network')
  );
};

export const handleFirestoreError = (error: any, context: string = ''): void => {
  if (!isOfflineError(error)) {
    console.error(`${context} error:`, error);
  }
};

export const wrapFirestoreCall = async <T>(
  fn: () => Promise<T>,
  context: string = '',
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error: any) {
    if (!isOfflineError(error)) {
      console.error(`${context} error:`, error);
    }
    return fallback;
  }
};

