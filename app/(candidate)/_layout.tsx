import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function CandidateLayout() {
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
          elevation: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          textAlign: "center",
          flexWrap: "wrap",
          minWidth: 60,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 3,
          paddingHorizontal: 2,
          minWidth: 70,
        },
        // ✨ Hiệu ứng nền nhẹ cho tab đang chọn
        tabBarActiveBackgroundColor: "#E8F1FF",
      }}
    >
      {/* 🏠 Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* 🔖 Việc đã lưu */}
      <Tabs.Screen
        name="savedJobs"
        options={{
          title: "Đã lưu",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* 📄 Ứng tuyển */}
      <Tabs.Screen
        name="appliedJob"
        options={{
          title: "Ứng tuyển",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "document-text" : "document-text-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* 💬 Chat */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* 👤 Hồ sơ */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused ? "person-circle" : "person-circle-outline"
              }
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
