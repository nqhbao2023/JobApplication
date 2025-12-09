import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

export function DrawerMenuButton() {
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { id: 'home', title: 'Khám phá việc làm', icon: 'compass', route: '/(candidate)' },
//    { id: 'notifications', title: 'Thông báo', icon: 'notifications', route: '/(shared)/Notifications' },
    { id: 'saved', title: 'Việc đã lưu', icon: 'bookmark', route: '/(candidate)/savedJobs' },
    { id: 'applied', title: 'Hồ sơ ứng tuyển', icon: 'document-text', route: '/(candidate)/appliedJob' },
    { id: 'tracker', title: 'Theo dõi ứng tuyển', icon: 'stats-chart', route: '/(candidate)/applicationTracker' },
    { id: 'chat', title: 'Tin nhắn', icon: 'chatbubbles', route: '/(candidate)/chat' },
    { id: 'cv', title: 'Quản lý CV', icon: 'documents', route: '/(candidate)/cvManagement' },
    { id: 'student', title: 'Hồ sơ sinh viên', icon: 'school', route: '/(candidate)/studentProfile' },
  //  { id: 'profile', title: 'Thông tin cá nhân', icon: 'person', route: '/(candidate)/profile' },
  ];

  const openDrawer = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const handleMenuPress = (route: string) => {
    closeDrawer();
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  return (
    <>
      <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
        <Ionicons name="menu" size={26} color="#1a1a1a" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.overlay} onPress={closeDrawer} />
          
          <Animated.View
            style={[
              styles.drawer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <SafeAreaView style={styles.drawerContent} edges={['top', 'bottom']}>
              {/* Header với Gradient đẹp */}
              <LinearGradient
                colors={['#4A80F0', '#6B5CE7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                <View style={styles.headerTop}>
                  <View style={styles.logoContainer}>
                    <View style={styles.logoIcon}>
                      <Ionicons name="briefcase" size={24} color="#4A80F0" />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>Job<Text style={styles.headerTitleAccent}>_4S</Text></Text>
                      <Text style={styles.headerSubtitle}>Việc làm cho sinh viên</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Menu Items */}
              <View style={styles.menuList}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      index === 0 && styles.firstMenuItem,
                    ]}
                    onPress={() => handleMenuPress(item.route)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconContainer}>
                      <Ionicons name={item.icon} size={22} color="#007AFF" />
                    </View>
                    <Text style={styles.menuText}>{item.title}</Text>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Phiên bản 1.0.0</Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerTitleAccent: {
    color: '#FFD700',
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  menuList: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  firstMenuItem: {
    marginTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});
