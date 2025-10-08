import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/config/firebase";
import { SavedJobsProvider } from "../src/contexts/saveJobsContext";

const Layout = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments(); // ✅ Dò xem đang ở group nào (auth / tabs)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("👀 Firebase auth state:", user ? user.email : "No user");

      const inAuthGroup = segments[0] === "(auth)";
      const inTabsGroup = segments[0] === "(tabs)";

      // ✅ Nếu đã login mà đang ở /auth → chuyển sang tabs
      if (user && inAuthGroup) {
        console.log("✅ Logged in → chuyển vào tabs");
        router.replace("/(tabs)");
      }

      // ✅ Nếu chưa login mà đang ở /tabs → chuyển sang login
      else if (!user && inTabsGroup) {
        console.log("🔒 No user → chuyển sang login");
        router.replace("/(auth)/login");
      }

      // 🔹 Sau khi xử lý → ngừng spinner
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [segments]);

  // ⏳ Hiện loading khi đang check auth
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
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen name="(events)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </SavedJobsProvider>
  );
};

export default Layout;
