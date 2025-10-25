import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CandidateLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4A80F0",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
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

      <Tabs.Screen
        name="savedJobs"  // ✅ dùng đúng file savedJobs.tsx
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

      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
