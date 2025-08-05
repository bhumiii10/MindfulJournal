import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type Message = {
  id: string;
  text: string;
  sender: 'bot' | 'user';
};

const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hey there! I noticed you're feeling a bit stormy today. Let's work together to bring some sunshine into your day! ☀️",
    sender: 'bot',
  },
  {
    id: '2',
    text: "Tell me, what's been weighing on your mind lately?",
    sender: 'bot',
  },
  {
    id: '3',
    text: "I've been feeling overwhelmed with work and personal life lately. Everything seems to be piling up.",
    sender: 'user',
  },
  {
    id: '4',
    text: "That sounds really challenging. How did that make you feel? What's one small step you could take today?",
    sender: 'bot',
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom after sending a message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.message,
          isUser ? styles.messageUser : styles.messageBot,
          isUser ? styles.alignRight : styles.alignLeft,
        ]}
      >
        <Text style={isUser ? styles.textUser : styles.textBot}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Let's Talk</Text>
        <Text style={styles.headerSub}>I'm here to help ☀️</Text>
      </View>

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatMessages}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input area */}
      <View style={styles.chatInput}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Share what's on your mind..."
            onChangeText={setInputText}
            value={inputText}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton} activeOpacity={0.7}>
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#f093fb',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  chatMessages: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexGrow: 1,
  },
  message: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  messageBot: {
    backgroundColor: '#f1f5f9',
  },
  messageUser: {
    backgroundColor: '#f5576c',
  },
  textBot: {
    color: '#374151',
    fontSize: 15,
  },
  textUser: {
    color: 'white',
    fontSize: 15,
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  chatInput: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#f5576c',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
});
