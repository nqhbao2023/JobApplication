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
} from 'react-native';
import React, { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type MessageType = {
  id: string;
  text: string;
  role: 'Recruiter' | 'Candidate';
};

const Chat = () => {
  const router = useRouter();
  const { userId, userName } = useLocalSearchParams<{
    userId: string;
    userName: string;
  }>();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageType[]>([
    { id: '1', text: 'Chào! tôi là nhà tuyển dụng!', role: 'Recruiter' },
  ]);

  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = () => {
    if (message.trim() === '') return;

    // Kiểm tra để đảm bảo người tìm việc chỉ có thể gửi tin nhắn khi nhà tuyển dụng đã gửi tin nhắn đầu tiên
    const hasRecruiterMessage = messages.some(msg => msg.role === 'Recruiter');

    if (userId !== 'Recruiter' && !hasRecruiterMessage) {
      alert('Bạn phải đợi nhà tuyển dụng gửi tin nhắn trước.');
      return;
    }

    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: message.trim(),
      role: 'Candidate',
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    Keyboard.dismiss();
  };

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isUser = item.role === 'Candidate';
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.back_btn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.header_username}>{userName || 'Chat'}</Text>
      </View>

      {/* Tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    height: 50,
    paddingHorizontal: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  back_btn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header_username: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  messageContainer: {
    padding: 15,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 0,
  },
  recruiterBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 17,
    color: 'black',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    marginRight: 10,
  },
  send_btn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Chat;
