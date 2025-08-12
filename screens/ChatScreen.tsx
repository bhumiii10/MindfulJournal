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

import { callChat, type ChatMessage } from '../api/src/services/chat';
import { ensureConversation, addMessage } from '../services/db';

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
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    // Add the user message to UI immediately
    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      text,
      sender: 'user',
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText('');

    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: true }),
      100
    );

    try {
      // Ensure we have a conversation in Firestore
      let cid = conversationId;
      if (!cid) {
        cid = await ensureConversation(text.slice(0, 60)); // use first part of user message as title
        setConversationId(cid);
      }

      // Store the user message in Firestore
      await addMessage(cid, { role: 'user', content: text });

      // Minimal payload to Perplexity to avoid invalid_message error
      const chatPayload: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are a warm and supportive journaling assistant. Keep replies short, empathetic, and encouraging.',
        },
        { role: 'user', content: text },
      ];

      // Call the backend API (which calls Perplexity)
      const res = await callChat(chatPayload);

      // Store the assistant message in Firestore
      await addMessage(cid, { role: 'assistant', content: res.reply });

      // Add bot reply to UI
      const botMessage: Message = {
        id: (updatedMessages.length + 1).toString(),
        text: res.reply,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: (updatedMessages.length + 1).toString(),
          text: '❌ Error getting reply. Please try again.',
          sender: 'bot',
        },
      ]);
    }
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
        <Text style={isUser ? styles.textUser : styles.textBot}>
          {item.text}
        </Text>
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

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatMessages}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Input */}
      <View style={styles.chatInput}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Share what's on your mind..."
            onChangeText={setInputText}
            value={inputText}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={styles.sendButton}
            activeOpacity={0.7}
          >
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
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
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
  messageBot: { backgroundColor: '#f1f5f9' },
  messageUser: { backgroundColor: '#f5576c' },
  textBot: { color: '#374151', fontSize: 15 },
  textUser: { color: 'white', fontSize: 15 },
  alignLeft: { alignSelf: 'flex-start' },
  alignRight: { alignSelf: 'flex-end' },
  chatInput: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  sendButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
});
