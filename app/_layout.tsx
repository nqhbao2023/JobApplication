import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCurrentUserRole } from "@/utils/roles";

export default function RootLayout() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments();
  const listenerAttached = useRef(false);

  useEffect(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👀 Auth state:", user ? user.email : "No user");

      const group = segments?.[0];
      const inAuth = group === "(auth)";
      const inCandidate = group === "(candidate)";
      const inEmployer = group === "(employer)";
      const inAdmin = group === "(admin)";

      if (user) {
        try {
          const role = await getCurrentUserRole();
          console.log("🔥 User role from utils:", role, "Current segment:", group);

          if (inAuth) {
            if (role === "admin") {
              console.log("🔐 Routing to admin from auth screen");
              router.replace("/(admin)" as any);
            } else if (role === "candidate") {
              console.log("👤 Routing to candidate");
              router.replace("/(candidate)");
            } else if (role === "employer") {
              console.log("💼 Routing to employer");
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
          }
        } catch (error) {
          console.error("❌ Error:", error);
          if (inAdmin || inCandidate || inEmployer) {
            await signOut(auth);
            router.replace("/(auth)/login");
          }
        }
      } else {
        if (inCandidate || inEmployer || inAdmin) {
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
          <Slot />
        </AuthProvider>
      </RoleProvider>
    </SavedJobsProvider>
  );
}