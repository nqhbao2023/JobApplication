import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useRole } from "@/contexts/RoleContext";

export default function ChatList() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUid, setMyUid] = useState<string | null>(null);
  const { role } = useRole(); // ✅ "candidate" hoặc "employer"

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
      else setMyUid(null);
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!myUid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", myUid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatData);
      setLoading(false);
    });

    return unsubscribe;
  }, [myUid]);

  const handleOpenChat = (chat: any) => {
    const partnerId = chat.participants.find((id: string) => id !== myUid);
    const partnerName =
      chat.participantsInfo?.[partnerId]?.displayName || "Người dùng";

    router.push({
      pathname: "/(shared)/chat",
      params: {
        chatId: chat.id,
        partnerId,
        partnerName,
        role: role === "candidate" ? "Candidate" : "Recruiter",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A80F0" />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="chatbubbles-outline" size={64} color="#aaa" />
        <Text style={{ color: "#888", marginTop: 10 }}>
          Chưa có cuộc trò chuyện nào
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      renderItem={({ item }) => {
        const partnerId = item.participants.find((id: string) => id !== myUid);
        const partnerName =
          item.participantsInfo?.[partnerId]?.displayName || "Người dùng";
        const lastMessage = item.lastMessage || "Chưa có tin nhắn";
        const partnerRole = item.participantsInfo?.[partnerId]?.role || "Unknown";

        // 🎨 Đổi màu và icon nhẹ tùy vai trò
        const isCandidateView = role === "candidate";
        const bubbleColor = isCandidateView ? "#4A80F0" : "#34C759";
        const iconName = isCandidateView
          ? "briefcase-outline"
          : "person-outline";
        const badgeText =
          partnerRole === "Recruiter"
            ? "Nhà tuyển dụng"
            : partnerRole === "Candidate"
            ? "Ứng viên"
            : "";

        return (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleOpenChat(item)}
            activeOpacity={0.85}
          >
            {/* Avatar / Icon */}
            {item.participantsInfo?.[partnerId]?.photoURL ? (
              <Image
                source={{ uri: item.participantsInfo[partnerId].photoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: bubbleColor + "33" }]}>
                <Ionicons name={iconName} size={26} color={bubbleColor} />
              </View>
            )}

            {/* Main text */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {partnerName}
                </Text>

                {/* Badge */}
                {badgeText ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          badgeText === "Nhà tuyển dụng" ? "#E0F2FE" : "#E8F5E9",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            badgeText === "Nhà tuyển dụng" ? "#0284C7" : "#2E7D32",
                        },
                      ]}
                    >
                      {badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.chatLastMsg} numberOfLines={1}>
                {lastMessage}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#aaa" />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 14,
    backgroundColor: "#F8FAFC",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  chatLastMsg: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
