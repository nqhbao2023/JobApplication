// app/(shared)/chat.tsx
import { useKeyboard } from "@react-native-community/hooks";
import { useHeaderHeight } from "@react-navigation/elements";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
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
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { SafeAreaView } from "react-native-safe-area-context";

dayjs.extend(relativeTime);

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

const toJsDate = (value: any): Date | null => {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch (error) {
      console.warn("⚠️ Unable to convert timestamp", error);
      return null;
    }
  }
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

// Tách MessageItem thành component riêng với React.memo để tối ưu performance
const MessageItem = React.memo<{
  item: MessageType;
  isMine: boolean;
  previousDate: Date | null;
  nextDate: Date | null;
}>(({ item, isMine, previousDate, nextDate }) => {
  const createdDate = toJsDate(item.createdAt);

  const showDateDivider =
    (!!createdDate && !previousDate) ||
    (!!createdDate && !!previousDate && !dayjs(previousDate).isSame(createdDate, "day"));
  const showTimestamp =
    !!createdDate && (!nextDate || dayjs(nextDate).diff(createdDate, "minute") >= 3);

  const formattedDate = createdDate ? dayjs(createdDate).format("DD MMMM YYYY") : "";
  const formattedTime = createdDate ? dayjs(createdDate).format("HH:mm") : "";

  return (
    <View>
      {showDateDivider && formattedDate ? (
        <Text style={styles.dayDivider}>{formattedDate}</Text>
      ) : null}
      <View style={[styles.row, isMine ? styles.selfRight : styles.selfLeft]}>
        <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{item.text}</Text>
        </View>
      </View>
      {showTimestamp && formattedTime ? (
        <Text style={[styles.time, isMine ? styles.timeRight : styles.timeLeft]}>
          {formattedTime}
        </Text>
      ) : null}
    </View>
  );
});

const Chat = () => {
  const router = useRouter();
  const navigation = useNavigation();
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [partnerDisplayName, setPartnerDisplayName] = useState<string>(partnerName);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  // Lấy UID người đang đăng nhập
  const myUid = auth.currentUser?.uid;

  // ✅ Hooks phải được gọi trước useMemo (Rules of Hooks)
  const keyboard = useKeyboard();
  const keyboardHeight = keyboard?.keyboardHeight ?? 0; // Safe fallback
  const headerHeight = useHeaderHeight();

  // Tính chatId "dùng thật":
  // - Nếu có paramChatId → dùng luôn
  // - Nếu không mà có myUid & partnerId → tự build
  const effectiveChatId = useMemo(() => {
    if (paramChatId) return paramChatId;
    if (myUid && partnerId) return makeChatId(myUid, partnerId);
    return undefined;
  }, [paramChatId, myUid, partnerId]);

  const scrollToLatest = useCallback(() => {
    // Đợi animation hoàn tất trước khi scroll
    setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          // Ignore scroll errors
          console.warn('Scroll error:', error);
        }
      });
    }, 100);
  }, []);

  // Lắng nghe tin nhắn realtime khi đã có effectiveChatId
  useEffect(() => {
    if (!effectiveChatId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);

    const q = query(
      collection(db, "chats", effectiveChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMsgs = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as MessageType)
        );
        setMessages(newMsgs);
        setIsLoadingMessages(false);
        // Chỉ scroll khi có tin nhắn mới, không scroll khi load lần đầu
        if (snapshot.docChanges().length && snapshot.docChanges().some(change => change.type === 'added')) {
          scrollToLatest();
        }
      },
      (error) => {
        console.error("🔴 Chat subscription error", error);
        setIsLoadingMessages(false);
      }
    );

    return unsubscribe;
  }, [effectiveChatId, scrollToLatest]);

  // Gửi tin nhắn
  const handleSendMessage = useCallback(async () => {
    if (!effectiveChatId || !myUid) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    setMessage("");
    // Đảm bảo TextInput focus trở lại sau khi gửi
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);

    try {
      const newMsg = {
        text: trimmed,
        role: myRole,
        senderId: myUid,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "chats", effectiveChatId, "messages"), newMsg);
      
      // ✅ Fetch user info to update participantsInfo
      const myUserDoc = await getDoc(doc(db, "users", myUid));
      const myUserData = myUserDoc.exists() ? myUserDoc.data() : null;
      
      let partnerUserData = null;
      if (partnerId) {
        const partnerUserDoc = await getDoc(doc(db, "users", partnerId));
        partnerUserData = partnerUserDoc.exists() ? partnerUserDoc.data() : null;
      }
      
      // ✅ Build participantsInfo
      const participantsInfo: any = {};
      if (myUserData) {
        participantsInfo[myUid] = {
          displayName: myUserData.displayName || myUserData.email || 'User',
          photoURL: myUserData.photoURL || null,
          role: myUserData.role || myRole,
        };
      }
      if (partnerId && partnerUserData) {
        participantsInfo[partnerId] = {
          displayName: partnerUserData.displayName || partnerUserData.email || partnerName,
          photoURL: partnerUserData.photoURL || null,
          role: partnerUserData.role || (myRole === 'Recruiter' ? 'Candidate' : 'Recruiter'),
        };
      }
      
      await setDoc(
        doc(db, "chats", effectiveChatId),
        {
          participants: [myUid, partnerId].filter(Boolean),
          lastMessage: newMsg.text,
          updatedAt: serverTimestamp(),
          participantsInfo, // ✅ Update participant info
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ Send message error:", error);
      // Restore message on error
      setMessage(trimmed);
      // Optionally show alert to user
      if (__DEV__) {
        console.error("Failed to send message:", error);
      }
    }
  }, [message, effectiveChatId, myUid, myRole, partnerId, partnerName]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss(); // Dismiss keyboard trước khi back
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(shared)/chatList');
    }
  }, [navigation, router]);

  // Cleanup keyboard khi unmount
  useEffect(() => {
    return () => {
      Keyboard.dismiss();
    };
  }, []);

  // Scroll to bottom khi load xong tin nhắn lần đầu
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      scrollToLatest();
    }
  }, [isLoadingMessages, messages.length, scrollToLatest]);

  // ✅ Sync participantsInfo when chat opens
  useEffect(() => {
    if (!effectiveChatId || !myUid || !partnerId) return;
    
    const syncParticipantsInfo = async () => {
      try {
        const myUserDoc = await getDoc(doc(db, "users", myUid));
        const partnerUserDoc = await getDoc(doc(db, "users", partnerId));
        
        const myUserData = myUserDoc.exists() ? myUserDoc.data() : null;
        const partnerUserData = partnerUserDoc.exists() ? partnerUserDoc.data() : null;
        
        // ✅ Update local state with partner info
        if (partnerUserData) {
          setPartnerDisplayName(partnerUserData.displayName || partnerUserData.email || partnerName);
          setPartnerAvatar(partnerUserData.photoURL || null);
          console.log('✅ Partner info loaded:', {
            name: partnerUserData.displayName,
            avatar: partnerUserData.photoURL
          });
        }
        
        const participantsInfo: any = {};
        if (myUserData) {
          participantsInfo[myUid] = {
            displayName: myUserData.displayName || myUserData.email || 'User',
            photoURL: myUserData.photoURL || null,
            role: myUserData.role || myRole,
          };
        }
        if (partnerUserData) {
          participantsInfo[partnerId] = {
            displayName: partnerUserData.displayName || partnerUserData.email || partnerName,
            photoURL: partnerUserData.photoURL || null,
            role: partnerUserData.role || (myRole === 'Recruiter' ? 'Candidate' : 'Recruiter'),
          };
        }
        
        // Update chat document with participants info
        await setDoc(
          doc(db, "chats", effectiveChatId),
          {
            participantsInfo,
            participants: [myUid, partnerId],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        
        console.log('✅ ParticipantsInfo synced:', participantsInfo);
      } catch (error) {
        console.error('❌ Failed to sync participantsInfo:', error);
      }
    };
    
    syncParticipantsInfo();
  }, [effectiveChatId, myUid, partnerId, myRole, partnerName]);

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
        <TouchableOpacity onPress={handleBackPress} style={{ marginTop: 14 }}>
          <Text style={{ color: "#2563eb", fontWeight: "600" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMessage = useCallback(({ item, index }: { item: MessageType; index: number }) => {
    const isMine = item.senderId === myUid;
    const previous = index > 0 ? messages[index - 1] : undefined;
    const next = index < messages.length - 1 ? messages[index + 1] : undefined;

    const previousDate = previous ? toJsDate(previous.createdAt) : null;
    const nextDate = next ? toJsDate(next.createdAt) : null;

    return (
      <MessageItem
        item={item}
        isMine={isMine}
        previousDate={previousDate}
        nextDate={nextDate}
      />
    );
  }, [myUid, messages]);

  const partnerInitial = (partnerDisplayName || partnerName).trim().charAt(0).toUpperCase() || "N";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.back_btn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {/* ✅ Show real avatar or placeholder */}
            {partnerAvatar ? (
              <Image 
                source={{ uri: partnerAvatar }} 
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{partnerInitial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.header_username} numberOfLines={1}>
                {partnerDisplayName || partnerName}
              </Text>
              <Text style={styles.header_status}>Đang hoạt động</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerCircle}>
              <Ionicons name="call-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircle}>
              <Ionicons name="videocam-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max((keyboardHeight || 0) + 70, 90) }, // ✅ Safe fallback with minimum
          ]}
          onScroll={(event) => {
            const { contentSize, layoutMeasurement, contentOffset } = event.nativeEvent;
            const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
            setShowScrollButton(distanceFromBottom > 120);
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          removeClippedSubviews={false}
          ListFooterComponent={<View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {isLoadingMessages ? (
                <ActivityIndicator color="#94a3b8" />
              ) : (
                <>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>Hãy bắt đầu trò chuyện</Text>
                  <Text style={styles.emptySubtitle}>
                    Gửi tin nhắn đầu tiên để kết nối nhanh hơn
                  </Text>
                </>
              )}
            </View>
          }
        />

        {showScrollButton && (
          <TouchableOpacity style={styles.scrollToBottom} onPress={scrollToLatest}>
            <Ionicons name="arrow-down-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIcon} onPress={() => Keyboard.dismiss()}>
            <Ionicons name="add-circle-outline" size={24} color="#64748b" />
          </TouchableOpacity>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94a3b8"
            multiline
            editable={true}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
            disabled={!message.trim()}
            onPress={handleSendMessage}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoadingMessages && messages.length === 0 && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  back_btn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "700", color: "#312E81" },
  header_username: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  header_status: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Bubble */
  row: { flexDirection: "row", marginVertical: 4, paddingHorizontal: 12 },
  selfRight: { justifyContent: "flex-end" },
  selfLeft: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  mine: { backgroundColor: "#007AFF", borderBottomRightRadius: 6 },
  theirs: { backgroundColor: "#E6E6EB", borderBottomLeftRadius: 6 },
  dayDivider: {
    alignSelf: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 12,
    marginBottom: 6,
  },
  time: { fontSize: 11, color: "#94a3b8", marginHorizontal: 16, marginTop: 2 },
  timeRight: { textAlign: "right" },
  timeLeft: { textAlign: "left" },
  messageText: { fontSize: 15, color: "#0f172a" },
  messageTextMine: { color: "#fff" },

  /* List & input */
  listContent: { paddingHorizontal: 8, flexGrow: 1, justifyContent: "flex-end", paddingBottom: 16 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#475569" },
  emptySubtitle: { fontSize: 13, color: "#94a3b8", textAlign: "center", paddingHorizontal: 32 },
  scrollToBottom: {
    position: "absolute",
    right: 20,
    bottom: 110,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A80F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: { marginRight: 8 },
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
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: "center",
    gap: 6,
  },
  loadingText: { fontSize: 12, color: "#94a3b8" },
});
