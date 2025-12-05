import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface Props {
  employerId: string;
  employerName: string;
  role: "Candidate" | "Employer";
  style?: ViewStyle; // ✅ thêm dòng này để nhận style từ ngoài
}

export default function ContactEmployerButton({
  employerId,
  employerName,
  role,
  style,
}: Props) {
  const router = useRouter();

  const handlePress = () => {
    if (!employerId) return;
    router.push({
      pathname: "/(shared)/chat",
      params: {
        partnerId: employerId,
        partnerName: employerName,
        role,
        from: "/(shared)/jobDescription",
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.chatBtn, style]} // ✅ áp dụng style từ ngoài
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
      <Text style={styles.chatText}> Liên hệ nhà tuyển dụng</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A80F0",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  chatText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
