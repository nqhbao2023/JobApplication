import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCurrentUserRole } from "@/utils/roles";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function AppContent() {
  // Initialize push notifications (only works with EAS project ID configured)
  const { expoPushToken, permissionStatus } = usePushNotifications();

  useEffect(() => {
    if (expoPushToken) {
      console.log('📱 Push token ready:', expoPushToken.slice(0, 20) + '...');
    }
  }, [expoPushToken]);

  return <Slot />;
}

export default function RootLayout() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments();
  const listenerAttached = useRef(false);

  useEffect(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state:", user ? user.email : "No user");

      const group = segments?.[0];
      const inAuth = group === "(auth)";
      const inCandidate = group === "(candidate)";
      const inEmployer = group === "(employer)";
      const inAdmin = group === "(admin)";

      if (user) {
        let role: string | null = null;
        try {
          const roleData = await getCurrentUserRole();
          role = roleData;
          console.log(" User role:", role, "| Current segment:", group);
        } catch (roleError) {
          console.warn("⚠️ Error getting role, using default:", roleError);
          role = "candidate"; // Default to candidate on error
        }

          // Nếu đã ở đúng route, không cần redirect
          if (role === "admin" && inAdmin) {
            console.log("✅ Already in admin route");
            setCheckingAuth(false);
            return;
          }
          if (role === "candidate" && inCandidate) {
            console.log("✅ Already in candidate route");
            setCheckingAuth(false);
            return;
          }
          if (role === "employer" && inEmployer) {
            console.log("✅ Already in employer route");
            setCheckingAuth(false);
            return;
          }

          // Redirect nếu cần
          if (inAuth) {
            if (role === "admin") {
              console.log("🚀 Routing to admin from auth screen");
              router.replace("/(admin)" as any);
            } else if (role === "candidate") {
              console.log("🚀 Routing to candidate");
              router.replace("/(candidate)");
            } else if (role === "employer") {
              console.log("🚀 Routing to employer");
              router.replace("/(employer)");
            } else {
              console.log("❌ Invalid role, signing out");
              await signOut(auth);
              router.replace("/(auth)/login");
            }
          } else if (inAdmin && role !== "admin") {
            console.log("❌ Not admin, redirecting from admin route");
            if (role === "candidate") router.replace("/(candidate)");
            else if (role === "employer") router.replace("/(employer)");
            else router.replace("/(auth)/login");
          } else if (inCandidate && role !== "candidate") {
            console.log("❌ Not candidate, redirecting");
            if (role === "admin") router.replace("/(admin)" as any);
            else if (role === "employer") router.replace("/(employer)");
            else router.replace("/(auth)/login");
          } else if (inEmployer && role !== "employer") {
            console.log("❌ Not employer, redirecting");
            if (role === "admin") router.replace("/(admin)" as any);
            else if (role === "candidate") router.replace("/(candidate)");
            else router.replace("/(auth)/login");
          }
      } else {
        // No user logged in
        if (inCandidate || inEmployer || inAdmin) {
          console.log("🔀 No user, redirecting to login");
          router.replace("/(auth)/login");
        }
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [segments]);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#F97459" />
      </View>
    );
  }

  return (
    <SavedJobsProvider>
      <RoleProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </RoleProvider>
    </SavedJobsProvider>
  );
}