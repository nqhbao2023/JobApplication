import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useRole } from "@/contexts/RoleContext"; // dùng alias @ cho thống nhất

export default function MainIndex() {
  const { role, loading } = useRole();

  useEffect(() => {
    if (!loading) {
      if (role === "candidate") router.replace("/(candidate)");
      else if (role === "employer") router.replace("/(employer)");
      else router.replace("/(auth)/login");
    }
  }, [role, loading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#4A80F0" />
    </View>
  );
}
