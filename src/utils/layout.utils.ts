/**
 * Layout utilities for handling bottom tab bar
 * Giúp tránh content bị che bởi tab bar
 */

import { Platform } from 'react-native';

/**
 * Standard bottom tab bar heights across platforms
 */
export const TAB_BAR_HEIGHT = Platform.select({
  ios: 96, // iOS có thêm safe area
  android: 86,
  default: 86,
});

/**
 * Padding bottom cho ScrollView/FlatList để tránh bị tab bar che
 */
export const SCROLL_BOTTOM_PADDING = TAB_BAR_HEIGHT + 20; // Thêm 20px buffer

/**
 * Margin bottom cho floating action buttons
 */
export const FAB_BOTTOM_MARGIN = TAB_BAR_HEIGHT + 16;

/**
 * Content container style cho ScrollView trong screens có tab bar
 */
export const getScrollContentStyle = (extraPadding: number = 0) => ({
  paddingBottom: SCROLL_BOTTOM_PADDING + extraPadding,
});

/**
 * Style cho floating action button position
 */
export const getFABStyle = () => ({
  position: 'absolute' as const,
  bottom: FAB_BOTTOM_MARGIN,
  left: 20,
  right: 20,
  zIndex: 1000,
});
