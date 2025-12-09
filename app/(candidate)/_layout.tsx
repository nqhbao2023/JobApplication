import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";
import { DrawerMenuButton } from "@/components/candidate/DrawerMenu";

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
          borderTopWidth: 0,
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
          // Loại bỏ borderRadius để tránh lỗi màu đen ở góc trên thiết bị thật
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      {/* 🏠 Khám phá */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Khám phá",
          headerShown: false, // Tắt header vì có custom animated header
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              color={color}
              size={26}
            />
          ),
        }}
      />

      {/* 📋 Việc của tôi */}
      <Tabs.Screen
        name="savedJobs"
        options={{
          title: "Việc của tôi",
          headerShown: false, // Tắt header vì có custom header
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              color={color}
              size={26}
            />
          ),
        }}
      />

      {/* 👤 Cá nhân */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          headerTitle: "Thông tin cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={26}
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
