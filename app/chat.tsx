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
import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../src/config/firebase";
import { doc, setDoc } from "firebase/firestore";
type MessageType = {
  id: string;
  text: string;
  role: "Recruiter" | "Candidate";
  senderId: string;
  createdAt: any;
};

const Chat = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chatId?: string;
    userName?: string;
    role?: "Recruiter" | "Candidate";
  }>();

  const chatId = params.chatId;
  const userName = params.userName || "Chat";
  const role = params.role || "Candidate"; // fallback mặc định

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // ✅ Nếu thiếu chatId thì show thông báo, tránh crash
  if (!chatId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>❌ Thiếu chatId. Vui lòng mở từ màn hình đúng.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 10 }}>
          <Text style={{ color: "blue" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Lắng nghe tin nhắn realtime
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MessageType)
      );
      setMessages(newMsgs);
    });

    return unsubscribe;
  }, [chatId]);

const handleSendMessage = async () => {
  if (message.trim() === "") return;

  const newMsg = {
    text: message.trim(),
    role,
    senderId: auth.currentUser?.uid || "guest",
    createdAt: serverTimestamp(),
  };

  // ✅ Ghi vào subcollection messages
  await addDoc(collection(db, "chats", chatId, "messages"), newMsg);

  // ✅ Update hoặc tạo document phòng chat
  await setDoc(
    doc(db, "chats", chatId),
    {
      participants: [auth.currentUser?.uid, userName], // TODO: đổi userName thành uid thật của đối phương
      lastMessage: newMsg.text,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  setMessage("");
  Keyboard.dismiss();
  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 100);
};

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isUser = item.role === role;
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.recruiterBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.back_btn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.header_username}>{userName}</Text>
      </View>

      {/* Tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Nhập tin nhắn */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity style={styles.send_btn} onPress={handleSendMessage}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
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
  header_username: { fontSize: 20, fontWeight: "bold", flex: 1, textAlign: "center" },
  messageContainer: { padding: 15, flexGrow: 1, justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#007AFF", borderBottomRightRadius: 0 },
  recruiterBubble: { alignSelf: "flex-start", backgroundColor: "#E5E5EA", borderBottomLeftRadius: 0 },
  messageText: { fontSize: 17, color: "black" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    marginRight: 10,
  },
  send_btn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
});

export default Chat;
