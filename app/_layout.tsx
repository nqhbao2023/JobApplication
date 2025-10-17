import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../src/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SavedJobsProvider } from "../src/contexts/saveJobsContext";
import { RoleProvider } from "@/contexts/RoleContext";

const Layout = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments();
  const listenerAttached = useRef(false); // ✅ ngăn đăng ký lại listener

  useEffect(() => {
    // 🔒 Nếu listener đã gắn thì không làm gì nữa
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👀 Firebase auth state:", user ? user.email : "No user");

      const group = segments?.[0];
      const inAuth = group === "(auth)";
      const inTabs = group === "(tabs)";

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          console.log("🔥 User data from Firestore:", snap.data());

          if (inAuth) {
            console.log("✅ Logged in → chuyển vào tabs");
            router.replace("/(tabs)");
          }
        } else {
          console.log("⚠️ User không có doc → signOut");
          await signOut(auth);
          router.replace("/(auth)/login");
        }
      } else {
        if (inTabs) {
          console.log("🔒 No user → chuyển sang login");
          router.replace("/(auth)/login");
        }
      }

      setCheckingAuth(false);
    });

    return unsubscribe;
  }, [segments]);

  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#F97459" />
      </View>
    );
  }

  return (
    <SavedJobsProvider>
      <RoleProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          <Stack.Screen name="(events)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </RoleProvider>
    </SavedJobsProvider>
  );
};

export default Layout;
