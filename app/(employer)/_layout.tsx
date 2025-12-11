import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
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

export default function EmployerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      {/* 🏠 Trang chủ */}
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
              label="Trang chủ"
            />
          ),
        }}
      />

      {/* 💼 Việc làm */}
      <Tabs.Screen
        name="myJobs"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Việc làm",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "briefcase" : "briefcase-outline"}
              color={color}
              focused={focused}
              label="Việc làm"
            />
          ),
        }}
      />

      {/* 👥 Ứng viên */}
      <Tabs.Screen
        name="appliedList"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Ứng viên",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "people" : "people-outline"}
              color={color}
              focused={focused}
              label="Ứng viên"
            />
          ),
        }}
      />

      {/* 🔔 Thông báo */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Ẩn vì có thể truy cập từ Trang chủ
          title: "Thông báo",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "notifications" : "notifications-outline"}
              color={color}
              focused={focused}
              label="Thông báo"
            />
          ),
        }}
      />

      {/* 👤 Hồ sơ */}
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, focused }) => (
            <TabBarItem
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
              label="Hồ sơ"
            />
          ),
        }}
      />
      {/* 💬 Chat - Hidden */}
      <Tabs.Screen name="chat" options={{ href: null }} />

      {/* 🔒 Ẩn màn phụ */}
      <Tabs.Screen name="addJob" options={{ href: null }} />
      <Tabs.Screen name="applications" options={{ href: null }} />
      <Tabs.Screen name="applicationDetail" options={{ href: null }} />
      <Tabs.Screen name="editJob" options={{ href: null }} />
      <Tabs.Screen name="findCandidates" options={{ href: null }} />
    </Tabs>
  );
}
