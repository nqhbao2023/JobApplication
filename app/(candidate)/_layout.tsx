import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, Text, View } from "react-native";
import { DrawerMenuButton } from "@/components/candidate/DrawerMenu";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Custom Animated Tab Item (Icon + Label)
const TabBarItem = ({ name, color, focused, label }: { name: any, color: string, focused: boolean, label: string }) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.1, { damping: 10, stiffness: 100 });
      translateY.value = withSpring(-2, { damping: 10, stiffness: 100 });
    } else {
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      translateY.value = withSpring(0, { damping: 10, stiffness: 100 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center', width: 80 }]}>
      <Ionicons name={name} size={24} color={color} style={{ marginBottom: 4 }} />
      <Text style={{ 
        color: color, 
        fontSize: 10, 
        fontWeight: focused ? '700' : '500' 
      }}>
        {label}
      </Text>
    </Animated.View>
  );
};

export default function CandidateLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => <DrawerMenuButton />,
        headerLeftContainerStyle: { paddingLeft: 12 },
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1a1a1a',
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
        tabBarShowLabel: false, // Hide default label to use custom animated one
      }}
    >
      {/* 🏠 Khám phá */}
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Khám phá",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "compass" : "compass-outline"}
              color={color}
              focused={focused}
              label="Khám phá"
            />
          ),
        }}
      />

      {/* 📋 Việc của tôi */}
      <Tabs.Screen
        name="savedJobs"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Việc của tôi",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "briefcase" : "briefcase-outline"}
              color={color}
              focused={focused}
              label="Việc của tôi"
            />
          ),
        }}
      />

      {/* 👤 Cá nhân */}
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Cá nhân",
          headerTitle: "Thông tin cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
              label="Cá nhân"
            />
          ),
        }}
      />

      {/* Hidden screens - accessible via drawer menu */}
      <Tabs.Screen
        name="appliedJob"
        options={{
          href: null, // Hide from tab bar
          title: "Hồ sơ ứng tuyển",
          headerTitle: "Hồ sơ ứng tuyển",
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Hide from tab bar
          title: "Tin nhắn",
          headerTitle: "Tin nhắn",
        }}
      />

      <Tabs.Screen
        name="studentProfile"
        options={{
          href: null, // Hide from tab bar
          title: "Hồ sơ sinh viên",
          headerTitle: "Hồ sơ sinh viên",
          headerShown: false, // Use custom header with Save button
        }}
      />

      <Tabs.Screen
        name="cvManagement"
        options={{
          href: null, // Hide from tab bar
          title: "Quản lý CV",
          headerTitle: "Quản lý CV",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="cvEditor"
        options={{
          href: null, // Hide from tab bar
          title: "Chỉnh sửa CV",
          headerTitle: "Chỉnh sửa CV",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="applicationTracker"
        options={{
          href: null, // Hide from tab bar
          title: "Theo dõi ứng tuyển",
          headerTitle: "Theo dõi ứng tuyển",
          headerShown: false,
        }}
      />
      <Tabs.Screen
      name="myJobPosts"
      options={{
        href: null,
        title: "quick",
        headerTitle: "Theo doi ung tuyen",
        headerShown: false,
      }}
      ></Tabs.Screen>
    </Tabs>
  );
}
