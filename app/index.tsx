// app/index.tsx - Public Home Landing Page
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRole } from '@/contexts/RoleContext';

const { width, height } = Dimensions.get('window');

// ✅ Feature highlights (just info display, not buttons)
const FEATURES = [
  {
    icon: 'calendar-outline' as const,
    title: 'Lọc theo lịch học',
    subtitle: 'Tìm việc phù hợp thời gian rảnh',
    gradient: ['#4A80F0', '#6366f1'] as [string, string],
  },
  {
    icon: 'location-outline' as const,
    title: 'Gần trường',
    subtitle: 'Việc làm trong bán kính 5km',
    gradient: ['#10b981', '#059669'] as [string, string],
  },
  {
    icon: 'wallet-outline' as const,
    title: 'Lương hợp lý',
    subtitle: 'Từ 25k/giờ trở lên',
    gradient: ['#f59e0b', '#d97706'] as [string, string],
  },
];

const PublicHome = () => {
  const { role, loading } = useRole();
  
  // ✅ Redirect to home if already logged in
  useEffect(() => {
    if (!loading && role) {
      const routes: Record<string, any> = {
        admin: '/(admin)',
        employer: '/(employer)',
        candidate: '/(candidate)',
      };
      const targetRoute = routes[role];
      if (targetRoute) {
        router.replace(targetRoute);
      }
    }
  }, [role, loading]);

  // Floating animation for hero icon
  const floatAnim = useSharedValue(0);
  
  useEffect(() => {
    floatAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value * -10 }],
  }));

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/login');
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/register');
  };

  // ✅ Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#4A80F0', '#6366f1', '#8b5cf6']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4A80F0', '#6366f1', '#8b5cf6']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Branding */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600)} 
            style={styles.brandingContainer}
          >
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.logoBackground}
              >
                <Text style={styles.logoIcon}>💼</Text>
              </LinearGradient>
            </View>
            <Text style={styles.logo}>Job<Text style={styles.logoAccent}>_4S</Text></Text>
            <Text style={styles.tagline}>Smart Jobs for Students</Text>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View 
            entering={FadeInUp.delay(300).duration(600)} 
            style={styles.heroSection}
          >
            <Animated.View style={[styles.heroIconContainer, floatingStyle]}>
              <LinearGradient
                colors={['#fff', '#f0f4ff']}
                style={styles.heroIconBg}
              >
                <Ionicons name="briefcase" size={48} color="#4A80F0" />
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.heroTitle}>
              Tìm việc phù hợp{'\n'}
              <Text style={styles.heroHighlight}>lịch học & gần trường</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              Part-time • Freelance • Thực tập
            </Text>
          </Animated.View>

          {/* Why Job_4S Section */}
          <Animated.View 
            entering={FadeIn.delay(500).duration(600)} 
            style={styles.whySection}
          >
            <Text style={styles.whySectionTitle}>Tại sao chọn Job_4S?</Text>
            <Text style={styles.whySectionSubtitle}>
              Ứng dụng được thiết kế riêng cho sinh viên Việt Nam
            </Text>
          </Animated.View>

          {/* Features - Info display, not buttons */}
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={index}
                entering={FadeInUp.delay(600 + index * 100).duration(500)}
              >
                <View style={styles.featureCard}>
                  <LinearGradient
                    colors={feature.gradient}
                    style={styles.featureIconBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={feature.icon} size={24} color="#fff" />
                  </LinearGradient>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                  </View>
                  <View style={styles.featureCheck}>
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Auth Buttons */}
          <Animated.View 
            entering={FadeInUp.delay(900).duration(500)} 
            style={styles.authSection}
          >
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4A80F0', '#6366f1']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginText}>Đăng nhập</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.registerText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            entering={FadeIn.delay(1000).duration(500)} 
            style={styles.footerContainer}
          >
            <View style={styles.footerDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Job_4S</Text>
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.footer}>
              Ứng dụng tìm việc thông minh{'\n'}dành riêng cho sinh viên Việt Nam
            </Text>
            <View style={styles.footerBadges}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                <Text style={styles.badgeText}>An toàn</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="flash" size={14} color="#f59e0b" />
                <Text style={styles.badgeText}>Nhanh chóng</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color="#8b5cf6" />
                <Text style={styles.badgeText}>AI hỗ trợ</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A80F0',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 100,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 250,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  brandingContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoBackground: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 36,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  logoAccent: {
    color: '#fbbf24',
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  heroIconBg: {
    width: 90,
    height: 90,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
  },
  heroHighlight: {
    color: '#fbbf24',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    fontWeight: '500',
  },
  whySection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  whySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  whySectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  featureCheck: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  authSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  registerButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  registerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  footer: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  footerBadges: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
});

export default PublicHome;
