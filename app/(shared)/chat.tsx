// app/(shared)/chat.tsx
import { useKeyboard } from "@react-native-community/hooks";
import { useHeaderHeight } from "@react-navigation/elements"; // expo-router có sẵn
import dayjs from "dayjs";         // expo install dayjs
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";

// Kiểu dữ liệu tin nhắn
type MessageType = {
  id: string;
  text: string;
  role: "Recruiter" | "Candidate";
  senderId: string;
  createdAt: any;
};

// Helper: ép tham số từ useLocalSearchParams về string
const asStr = (v: string | string[] | undefined): string | undefined => {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
};

// Helper: tạo chatId cố định từ 2 UID (thứ tự-độc lập)
const makeChatId = (a: string, b: string) => [a, b].sort().join("_");

const Chat = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    partnerId?: string | string[];   // 👈 UID đối phương (bắt buộc nếu không truyền chatId)
    partnerName?: string | string[]; // 👈 tên hiển thị đối phương (tuỳ chọn)
    role?: "Recruiter" | "Candidate" | string | string[];
  }>();

  // Chuẩn hoá tham số
  const paramChatId = asStr(params.chatId);
  const partnerId = asStr(params.partnerId);
  const partnerName = asStr(params.partnerName) ?? "Chat";
  const myRole = (asStr(params.role) as "Recruiter" | "Candidate") ?? "Candidate";

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Lấy UID người đang đăng nhập
  const myUid = auth.currentUser?.uid;

  // Tính chatId “dùng thật”:
  // - Nếu có paramChatId → dùng luôn
  // - Nếu không mà có myUid & partnerId → tự build
  const effectiveChatId = useMemo(() => {
    if (paramChatId) return paramChatId;
    if (myUid && partnerId) return makeChatId(myUid, partnerId);
    return undefined;
  }, [paramChatId, myUid, partnerId]);
const { keyboardHeight } = useKeyboard();
const headerHeight = useHeaderHeight();

  // Lắng nghe tin nhắn realtime khi đã có effectiveChatId
  useEffect(() => {
    if (!effectiveChatId) return;
    const q = query(
      collection(db, "chats", effectiveChatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as MessageType)
      );
      setMessages(newMsgs);
      // Cuộn về cuối khi có tin mới
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    });
    return unsubscribe;
  }, [effectiveChatId]);

  // Gửi tin nhắn
const handleSendMessage = useCallback(async () => {
  if (!effectiveChatId || !myUid) return;
  const trimmed = message.trim();
  if (!trimmed) return;

  // ⇢ reset input trước để UI mượt
  setMessage("");

  const newMsg = {
    text: trimmed,
    role: myRole,
    senderId: myUid,
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, "chats", effectiveChatId, "messages"), newMsg);
  await setDoc(
    doc(db, "chats", effectiveChatId),
    {
      participants: [myUid, partnerId].filter(Boolean),
      lastMessage: newMsg.text,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}, [message, effectiveChatId, myUid, myRole, partnerId]);

  // Nếu chưa đủ dữ liệu để xác định phòng chat → báo nhẹ nhàng
  if (!effectiveChatId) {
    return (
      <View style={styles.centerBox}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          ❌ Thiếu thông tin để mở chat.
        </Text>
        <Text style={{ color: "#475569", textAlign: "center" }}>
          Cần truyền <Text style={{ fontWeight: "700" }}>partnerId</Text> (UID đối phương)
          hoặc trực tiếp <Text style={{ fontWeight: "700" }}>chatId</Text>.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: "#2563eb", fontWeight: "600" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

const renderMessage = ({ item, index }: { item: MessageType; index: number }) => {
  const isMine = item.senderId === myUid;
  const next = messages[index + 1];
  const showTime =
    !next || dayjs(next.createdAt?.toDate()).diff(item.createdAt?.toDate(), "minute") >= 2;

return (
  <View style={[styles.row, isMine ? styles.selfRight : styles.selfLeft]}>
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
      <Text style={[styles.messageText, isMine && { color:"#fff" }]}>{item.text}</Text>
    </View>
    {showTime && (
      <Text style={styles.time}>
        {dayjs(item.createdAt?.toDate()).format("HH:mm")}
      </Text>
    )}
  </View>
);
};
  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={headerHeight}
  >
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.back_btn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.header_username} numberOfLines={1}>
          {partnerName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

    {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        /* 👉 xoá inverted */
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: keyboardHeight + 70 },
        ]}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
<TouchableOpacity
  style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
  disabled={!message.trim()}
  onPress={handleSendMessage}
>
  <Ionicons name="paper-plane" size={18} color="#fff" />
</TouchableOpacity>


      </View>
    </KeyboardAvoidingView>
  );
};

export default Chat;
const styles = StyleSheet.create({
  /* Layout chung */
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },

  /* Header */
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9FB",
    height: 50,
    paddingHorizontal: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  back_btn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  header_username: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },

  /* Bubble */
  row: { flexDirection: "row", marginVertical: 4 },
  selfRight: { alignSelf: "flex-end" },
  selfLeft: { alignSelf: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  mine: { backgroundColor: "#007AFF", borderBottomRightRadius: 6 },
  theirs: { backgroundColor: "#E6E6EB", borderBottomLeftRadius: 6 },
  time: { fontSize: 11, color: "#94a3b8", marginHorizontal: 6 },
  messageText: { fontSize: 16, color: "#0f172a" },

  /* List & input */
  listContent: { paddingHorizontal: 15, flexGrow: 1, justifyContent: "flex-end" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
