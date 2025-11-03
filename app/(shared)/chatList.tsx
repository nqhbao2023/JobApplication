// app/(shared)/chatList.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";

import { db, auth } from "@/config/firebase";
import { router } from "expo-router";
import { useRole } from "@/contexts/RoleContext";

/* -------------------------------------------------------------------------- */
/*                                  MAIN LIST                                 */
/* -------------------------------------------------------------------------- */
export default function ChatList() {
  const { role: ctxRole } = useRole(); // ctxRole = "candidate" | "employer" | null
  const viewerRole: "candidate" | "employer" =
    ctxRole === "employer" ? "employer" : "candidate";

  const [myUid, setMyUid] = useState<string>();
  const [chats, setChats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  /* 1️⃣ Lấy uid */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setMyUid(u?.uid));
  }, []);

  /* 2️⃣ Nghe realtime */
  useEffect(() => {
    if (!myUid) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", myUid),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) =>
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [myUid]);

  /* 3️⃣ Mở phòng chat */
  const openChat = useCallback(
    (chat: any) => {
      const partnerId = chat.participants.find((id: string) => id !== myUid);
      const partnerName =
        chat.participantsInfo?.[partnerId]?.displayName || "Người dùng";

      router.push({
        pathname: "/(shared)/chat",
        params: {
          chatId: chat.id,
          partnerId,
          partnerName,
          role: viewerRole === "candidate" ? "Candidate" : "Recruiter",
        },
      });
    },
    [myUid, viewerRole]
  );

  /* 4️⃣ Row component */
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ChatRow
        item={item}
        myUid={myUid!}
        viewerRole={viewerRole}
        onPress={() => openChat(item)}
      />
    ),
    [myUid, viewerRole, openChat]
  );

  /* 5️⃣ Pull refresh stub */
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!myUid)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A80F0" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={chats}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={64} color="#aaa" />
            <Text style={{ color: "#888", marginTop: 10 }}>
              Chưa có cuộc trò chuyện nào
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContainer,
          chats.length === 0 && { flex: 1 },
        ]}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                CHAT ROW                                    */
/* -------------------------------------------------------------------------- */
type RowProps = {
  item: any;
  myUid: string;
  viewerRole: "candidate" | "employer";
  onPress: () => void;
};

const ChatRow = React.memo<RowProps>(({ item, myUid, viewerRole, onPress }) => {
  const partnerId = item.participants.find((id: string) => id !== myUid);
  const info = item.participantsInfo?.[partnerId] || {};
  const name = info.displayName || "Người dùng";
  const lastMsg = item.lastMessage || "Chưa có tin nhắn";
  const partnerRole = info.role || "Unknown";

  const isCandidate = viewerRole === "candidate";
  const color = isCandidate ? "#4A80F0" : "#34C759";
  const icon = isCandidate ? "briefcase-outline" : "person-outline";

  const badge =
    partnerRole === "Recruiter"
      ? { text: "Nhà tuyển dụng", bg: "#E0F2FE", fc: "#0284C7" }
      : partnerRole === "Candidate"
      ? { text: "Ứng viên", bg: "#E8F5E9", fc: "#2E7D32" }
      : null;

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} activeOpacity={0.85}>
      {info.photoURL ? (
        <Image source={{ uri: info.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: `${color}33` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      )}

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.nameRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {name}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fc }]}>{badge.text}</Text>
            </View>
          )}
        </View>
        <Text style={styles.chatLastMsg} numberOfLines={1}>
          {lastMsg}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#A3A3A3" />
    </TouchableOpacity>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  listContainer: { padding: 14 },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "78%",
  },
  chatLastMsg: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
