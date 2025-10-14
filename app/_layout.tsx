import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../src/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SavedJobsProvider } from "../src/contexts/saveJobsContext";

const Layout = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments(); // ✅ Dò xem đang ở group nào (auth / tabs)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👀 Firebase auth state:", user ? user.email : "No user");

      const inAuthGroup = segments[0] === "(auth)";
      const inTabsGroup = segments[0] === "(tabs)";

      if (user) {
        // 🔍 Kiểm tra Firestore có document user này không
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          console.log("✅ Logged in & user tồn tại → chuyển vào tabs");
          if (inAuthGroup) router.replace("/(tabs)");
        } else {
          console.log("⚠️ User không tồn tại trong Firestore → đăng xuất");
          await signOut(auth);
          router.replace("/(auth)/login");
        }
      } else if (!user && inTabsGroup) {
        console.log("🔒 No user → chuyển sang login");
        router.replace("/(auth)/login");
      }

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
        <Stack.Screen name="(employer)" options={{ headerShown: false }} />

      </Stack>
    </SavedJobsProvider>
  );
};

export default Layout;
