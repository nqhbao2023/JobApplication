import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";
import { RoleProvider } from "@/contexts/RoleContext";

export default function RootLayout() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const segments = useSegments();
  const listenerAttached = useRef(false);

  useEffect(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👀 Firebase auth state:", user ? user.email : "No user");

      const group = segments?.[0];
      const inAuth = group === "(auth)";
      const inTabs = group === "(main)";

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          console.log("🔥 User data from Firestore:", snap.data());
          if (inAuth) router.replace("/(main)");
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
    // ✅ Providers bọc quanh Slot
    <SavedJobsProvider>
      <RoleProvider>
        {/* Slot render tất cả group con như (candidate), (employer), (auth)... */}
        <Slot />
      </RoleProvider>
    </SavedJobsProvider>
  );
}
