import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { router } from "expo-router";

export default function ChatList() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const myUid = auth.currentUser?.uid;

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
      pathname: "/(candidate)/chat", // tự điều hướng đúng role (app có thể thay candidate -> employer)
      params: { partnerId, partnerName },
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

        return (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleOpenChat(item)}
          >
            <Ionicons name="person-circle-outline" size={42} color="#4A80F0" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.chatName}>{partnerName}</Text>
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
  listContainer: { padding: 16 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chatName: { fontSize: 16, fontWeight: "600", color: "#111" },
  chatLastMsg: { fontSize: 13, color: "#666" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
