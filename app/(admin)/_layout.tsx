import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { Stack, Redirect } from "expo-router";
import { auth } from "@/config/firebase";
import { useRole } from "@/contexts/RoleContext";

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [nextRoute, setNextRoute] = useState<string | null>(null);
  const checkedRef = useRef(false); // Prevent duplicate checks
  
  // Use RoleContext instead of direct API call to avoid network issues
  const { role, loading: roleLoading } = useRole();

  useEffect(() => {
    // Only check once
    if (checkedRef.current) return;
    
    const checkAdminAccess = async () => {
      try {
        // Wait a bit for auth to stabilize
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const user = auth.currentUser;
        console.log("🔍 Admin layout checking user:", user?.email);
        
        if (!user) {
          console.log("❌ No user in admin layout");
          setHasAdmin(false);
          setNextRoute("/(auth)/login");
          setLoading(false);
          checkedRef.current = true;
          return;
        }

        // Wait for role to load from context
        if (roleLoading) {
          return; // Will re-run when roleLoading changes
        }

        console.log("🔐 Admin layout role check:", { email: user.email, role, isAdmin: role === "admin" });
        checkedRef.current = true;

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
        // Don't retry on error, just redirect
        checkedRef.current = true;
        setHasAdmin(false);
        setNextRoute("/(auth)/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [role, roleLoading]);

  // Show loading while checking
  if (loading || roleLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Đang kiểm tra quyền admin...</Text>
      </View>
    );
  }

  // No permission -> redirect
  if (hasAdmin === false && nextRoute) {
    return <Redirect href={nextRoute as any} />;
  }
  
  // Has admin permission -> render Stack
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
      <Stack.Screen name="jobs" options={{ title: "Quản lý Jobs (Tất cả nguồn)" }} />
      <Stack.Screen name="companies" options={{ title: "Quản lý Companies" }} />
      <Stack.Screen name="analytics" options={{ title: "Thống kê" }} />
      <Stack.Screen name="job-types" options={{ title: "Job Types" }} />
      <Stack.Screen name="job-categories" options={{ title: "Job Categories" }} />
      <Stack.Screen name="user-detail" options={{ title: "Chi tiết User" }} />
      <Stack.Screen name="job-detail" options={{ title: "Chỉnh sửa Job" }} />
      <Stack.Screen name="job-create" options={{ title: "Tạo Job Mới" }} />
      <Stack.Screen name="quick-posts-pending" options={{ title: "Duyệt Quick Posts" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#fff" 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
});
