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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <Ionicons name="briefcase" size={32} color="#007AFF" />
                  <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Job4Students</Text>
                <Text style={styles.headerSubtitle}>Menu chính</Text>
              </View>

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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuList: {
    flex: 1,
    paddingTop: 8,
  },
  firstMenuItem: {
    marginTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
