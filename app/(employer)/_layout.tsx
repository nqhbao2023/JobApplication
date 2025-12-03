import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function EmployerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 96 : 86,
          paddingBottom: Platform.OS === 'ios' ? 32 : 24,
          paddingTop: 12,
          elevation: 15,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -5,
          },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          textAlign: "center",
          flexWrap: "nowrap",
          minWidth: 60,
        },
        tabBarActiveBackgroundColor: "#E8F1FF",
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
          paddingHorizontal: 2,
          minWidth: 70,
        },
      }}
    >
      {/* 🏠 Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 💼 Việc làm */}
      <Tabs.Screen
        name="myJobs"
        options={{
          title: "Việc làm",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 👥 Ứng viên */}
      <Tabs.Screen
        name="appliedList"
        options={{
          title: "Ứng viên",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              color={color}
              size={size}
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? "notifications"
                  : "notifications-outline"
              }
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 💬 Chat */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Ẩn vì có thể truy cập từ Thông báo
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? "chatbubble-ellipses"
                  : "chatbubble-ellipses-outline"
              }
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 👤 Hồ sơ */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused ? "person-circle" : "person-circle-outline"
              }
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 🔒 Ẩn màn phụ */}
      <Tabs.Screen name="addJob" options={{ href: null }} />
      <Tabs.Screen name="applications" options={{ href: null }} />
      <Tabs.Screen name="applicationDetail" options={{ href: null }} />
      <Tabs.Screen name="editJob" options={{ href: null }} />
      <Tabs.Screen name="findCandidates" options={{ href: null }} />
    </Tabs>
  );
}
