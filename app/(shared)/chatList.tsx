// app/(shared)/chatList.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
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
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { db, auth } from "@/config/firebase";
import { router } from "expo-router";
import { useRole } from "@/contexts/RoleContext";

dayjs.extend(relativeTime);

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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "candidate" | "recruiter">("all");

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
          from: "/(shared)/chatList",
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

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return chats.filter((chat) => {
      const partnerId = chat.participants?.find((id: string) => id !== myUid);
      const info = chat.participantsInfo?.[partnerId] || {};
      const name = (info.displayName || "").toLowerCase();
      const lastMsg = (chat.lastMessage || "").toLowerCase();
      const matchesSearch = !term || name.includes(term) || lastMsg.includes(term);
      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      const role = (info.role || "").toLowerCase();
      if (activeFilter === "candidate") return role.includes("candidate");
      if (activeFilter === "recruiter") return role.includes("recruiter") || role.includes("employer");
      return true;
    });
  }, [chats, searchTerm, activeFilter, myUid]);

  const stats = useMemo(() => {
    const total = chats.length;
    const recent = chats.filter((chat) => {
      const updatedAt = chat.updatedAt?.toDate?.() ? chat.updatedAt.toDate() : chat.updatedAt;
      if (!updatedAt) return false;
      return dayjs().diff(dayjs(updatedAt), "day") <= 2;
    }).length;
    return { total, recent };
  }, [chats]);

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
        data={filteredChats}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <LinearGradient colors={["#4A80F0", "#7C3AED"]} style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Hộp thư</Text>
                <Text style={styles.heroValue}>{stats.total} cuộc trò chuyện</Text>
                <Text style={styles.heroSub}>{stats.recent} cuộc trò chuyện mới trong 48h</Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="chatbubbles" size={26} color="#fff" />
              </View>
            </LinearGradient>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                placeholder="Tìm theo tên hoặc tin nhắn"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm("")}> 
                  <Ionicons name="close-circle" size={18} color="#cbd5f5" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterRow}>
              {[
                { key: "all", label: "Tất cả" },
                { key: "candidate", label: "Ứng viên" },
                { key: "recruiter", label: "Nhà tuyển dụng" },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, activeFilter === chip.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(chip.key as "all" | "candidate" | "recruiter")}
                >
                  <Text style={[styles.filterChipText, activeFilter === chip.key && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={64} color="#aaa" />
            <Text style={{ color: "#888", marginTop: 10 }}>
              {searchTerm ? "Không tìm thấy kết quả" : "Chưa có cuộc trò chuyện nào"}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContainer,
          filteredChats.length === 0 && { flex: 1 },
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
  const lastUpdated = item.updatedAt?.toDate?.() ? item.updatedAt.toDate() : item.updatedAt;
  const updatedLabel = lastUpdated ? dayjs(lastUpdated).fromNow() : "Vừa xong";

  const isCandidate = viewerRole === "candidate";
  const color = isCandidate ? "#4A80F0" : "#34C759";
  const icon = isCandidate ? "briefcase-outline" : "person-outline";
  const unreadCount = item.unreadCounts?.[myUid] || 0;
  const hasUnread = unreadCount > 0;

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
        <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      )}

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.rowTop}>
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
          <Text style={styles.chatTime}>{updatedLabel}</Text>
        </View>
        <View style={styles.lastMsgRow}>
          <Text style={styles.chatLastMsg} numberOfLines={1}>
            {lastMsg}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
    </TouchableOpacity>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EFF3FF" },
  listContainer: { padding: 14 },

  heroCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#4A80F0",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroLabel: { color: "rgba(255,255,255,0.8)", letterSpacing: 0.5, fontSize: 12 },
  heroValue: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontSize: 13 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#1E40AF",
    borderColor: "#1E40AF",
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  filterChipTextActive: { color: "#fff" },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "78%",
  },
  lastMsgRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  chatLastMsg: { fontSize: 13, color: "#6B7280", flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12, color: "#94A3B8" },

  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  unreadBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
