import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EmployerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#777",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
          height: 65,
          paddingBottom: 6,
          paddingTop: 4,
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
        name="applications"
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

      {/* 💬 Chat */}
      <Tabs.Screen
        name="chat"
        options={{
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
      <Tabs.Screen name="appliedList" options={{ href: null }} />
    </Tabs>
  );
}
