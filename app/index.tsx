// app/index.tsx - Public Home Landing Page
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PublicHome = () => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4A80F0', '#6B5CE7']}
        style={styles.header}
      >
        <Text style={styles.logo}>Job_4S</Text>
        <Text style={styles.tagline}>Tìm việc phù hợp lịch học, gần trường</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Ionicons name="briefcase-outline" size={80} color="#4A80F0" />
          <Text style={styles.heroTitle}>500+ việc làm cho sinh viên</Text>
          <Text style={styles.heroSubtitle}>
            Part-time • Freelance • Thực tập
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="calendar-outline" size={32} color="#4A80F0" />
            <Text style={styles.featureTitle}>Lọc theo lịch học</Text>
            <Text style={styles.featureText}>Tìm việc phù hợp thời gian rảnh</Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="location-outline" size={32} color="#4A80F0" />
            <Text style={styles.featureTitle}>Gần trường</Text>
            <Text style={styles.featureText}>Việc làm trong bán kính 5km</Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="card-outline" size={32} color="#4A80F0" />
            <Text style={styles.featureTitle}>Lương hợp lý</Text>
            <Text style={styles.featureText}>Từ 25k/giờ trở lên</Text>
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <Text style={styles.authPrompt}>Đăng nhập để xem việc phù hợp với bạn</Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerText}>Tạo tài khoản mới</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Job_4S - Ứng dụng tìm việc thông minh cho sinh viên
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  features: {
    marginTop: 24,
    gap: 20,
  },
  feature: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  authSection: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  authPrompt: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  registerButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A80F0',
    width: '100%',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  footer: {
    marginTop: 32,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default PublicHome;
