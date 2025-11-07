import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, Redirect } from "expo-router";
import { auth } from "@/config/firebase";
import { getCurrentUserRole } from "@/utils/roles";

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [nextRoute, setNextRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const user = auth.currentUser;
        console.log("🔍 Admin layout checking user:", user?.email);
        
        if (!user) {
          console.log("❌ No user in admin layout");
          setHasAdmin(false);
          setNextRoute("/(auth)/login");
          setLoading(false);
          return;
        }

        const role = await getCurrentUserRole();
        console.log("🔐 Admin layout role check:", { email: user.email, role, isAdmin: role === "admin" });

        if (role === "admin") {
          setHasAdmin(true);
          setNextRoute(null);
        } else {
          setHasAdmin(false);
          if (role === "candidate") setNextRoute("/(candidate)");
          else if (role === "employer") setNextRoute("/(employer)");
          else setNextRoute("/(auth)/login");
        }
      } catch (e) {
        console.error("❌ Admin guard error:", e);
        setHasAdmin(false);
        setNextRoute("/(auth)/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  // Đang xác thực -> loading
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Không có quyền -> chuyển ra ngoài
  if (hasAdmin === false && nextRoute) {
    // ép kiểu về Href để TypeScript chấp nhận chuỗi động
    return <Redirect href={nextRoute as any} />;
  }
  

  // Có quyền admin -> render Stack admin
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A84FF" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="users" options={{ title: "Quản lý Users" }} />
      <Stack.Screen name="jobs" options={{ title: "Quản lý Jobs" }} />
      <Stack.Screen name="companies" options={{ title: "Quản lý Companies" }} />
      <Stack.Screen name="analytics" options={{ title: "Thống kê" }} />
      <Stack.Screen name="job-types" options={{ title: "Job Types" }} />
      <Stack.Screen name="job-categories" options={{ title: "Job Categories" }} />
      <Stack.Screen name="user-detail" options={{ title: "Chỉnh sửa User" }} />
      <Stack.Screen name="job-detail" options={{ title: "Chỉnh sửa Job" }} />
      <Stack.Screen name="user-create" options={{ title: "Tạo User Mới" }} />
<Stack.Screen name="job-create" options={{ title: "Tạo Job Mới" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
});
