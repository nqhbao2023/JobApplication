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
      const inCandidate = group === "(candidate)";
      const inEmployer = group === "(employer)";

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const data = snap.data();
          console.log("🔥 User data:", data);

          // ✅ Route theo role, nhưng chỉ khi đang ở nhóm (auth)
          if (inAuth) {
            if (data.role === "candidate") {
              router.replace("/(candidate)" as any);
            } else if (data.role === "employer") {
              router.replace("/(employer)" as any);
            } else {
              await signOut(auth);
              router.replace("/(auth)/login");
            }
          }
        } else {
          console.log("⚠️ Không có doc → signOut");
          await signOut(auth);
          router.replace("/(auth)/login");
        }
      } else {
        // ❌ Không có user mà lại đang trong nhóm role → về login
        if (inCandidate || inEmployer) {
          console.log("🔒 No user → chuyển login");
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
        <Slot />
      </RoleProvider>
    </SavedJobsProvider>
  );
}
