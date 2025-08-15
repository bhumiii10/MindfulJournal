import React, { useState, useRef, useEffect } from 'react';
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
import {
  ensureDailyConversation,
  addMessage,
  toDateISO,
  getMessages,
  getDailyConversationId,
  addChatSuggestions
} from '../services/db';

type Message = {
  id: string;
  text: string;
  sender: 'bot' | 'user';
};

// Keep goals brief, verb-first (or time-based), realistic
function keepGoal(raw: string): string | null {
  let t = raw.replace(/^[-*•\s]+/, '').trim();
  if (!t) return null;

  // allow a little room; UI truncates anyway
  const words = t.split(/\s+/).length;
  if (words < 2 || words > 9) return null;
  if (t.length > 80) t = t.slice(0, 77).trim() + '…';

  // verb-first or time-based (“5-minute …”, “10 min …”)
  const verbs = [
    'walk','drink','write','text','call','stretch','breathe','tidy','plan','read',
    'meditate','journal','hydrate','email','organize','prep','cook','clean','sort',
    'file','review','water','wash','message','note','list','step','sit','stand'
  ];
  const lower = t.toLowerCase();
  const startsWithVerbOrTimey =
    verbs.some((v) => lower.startsWith(v + ' ')) ||
    /^[0-9]+(-| )?minute(s)?\b/.test(lower) ||
    /^[0-9]+(-| )?min\b/.test(lower);

  if (!startsWithVerbOrTimey) return null;

  // avoid too-vague single-word imperatives
  if (/^(breathe|hydrate|journal|walk|stretch|meditate|clean|plan|read)$/i.test(t)) return null;

  return t;
}

function uniqueGoalsShort(goals: string[], cap = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of goals) {
    const k = g.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(g);
      if (out.length >= cap) break;
    }
  }
  return out;
}

// Basic extractor from reply (safe fallback)
async function extractGoalsFromReply(reply: string): Promise<string[]> {
  // Favor lines near the end of the reply
  const lines = reply.split('\n').map((l) => l.trim()).filter(Boolean);
  const tail = lines.slice(-8);
  const pool = tail.length ? tail : lines;

  const candidates: string[] = [];
  for (const l of pool) {
    const kept = keepGoal(l);
    if (kept) candidates.push(kept);
  }

  return uniqueGoalsShort(candidates, 5);
}

export default function ChatScreen({ route }: any) {
  const journalDate = route?.params?.journalDate || toDateISO();
  const initialConversationId = route?.params?.conversationId || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const flatListRef = useRef<FlatList>(null);

  // Load existing messages for this date
  useEffect(() => {
    let cancelled = false;

    async function loadMessagesForDay() {
      setConversationId(null); // force re-detection for new date
      setMessages([]); // clear UI for fresh start

      const cid = await getDailyConversationId(journalDate);
      if (cancelled) return;

      if (!cid) return; // no convo for this date yet
      setConversationId(cid);

      const docs = await getMessages(cid);
      if (cancelled) return;

      const mapped: Message[] = docs.map((m: any, idx: number) => ({
        id: String(idx + 1),
        text: m.content,
        sender: m.role === 'user' ? 'user' : 'bot',
      }));
      setMessages(mapped);
    }

    loadMessagesForDay();
    return () => { cancelled = true; };
  }, [journalDate]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    // Show user message instantly
    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      text,
      sender: 'user',
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText('');

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      let cid = conversationId;
      if (!cid) {
        cid = await ensureDailyConversation(journalDate, text);
        setConversationId(cid);
      }
      if (!cid) throw new Error('Conversation ID missing');

      // Save user message
      await addMessage(cid, { role: 'user', content: text });

      // Empathetic, concise reply aligned with resilience wheel, with micro-goals at the end
      const chatPayload: ChatMessage[] = [
        {
          role: 'system',
          content: `
You are a warm, non-judgmental journaling assistant that helps build emotional resilience.
Use these skills when relevant: Goal Setting, Strengths, Flexible Thinking, Problem Solving, Self-Acceptance, Emotional Regulation, Coping Skills, Optimistic Thinking.
Guidelines:
- 2–4 short sentences.
- Empathy first: reflect and normalize.
- Then one small, concrete nudge (no lectures, no long lists).

At the very end of your reply, add 3–5 micro-goals for TODAY, each on its own line:
- 2–6 words
- starts with a verb or time hint (e.g., “5-minute …”)
- doable in ≤15 minutes
- examples: "Drink 1 glass water", "5-minute stretch", "List 3 gratitudes", "Text a friend hello".
        `.trim(),
        },
        { role: 'user', content: text },
      ];

      const res = await callChat(chatPayload);

      // Save assistant message
      await addMessage(cid, { role: 'assistant', content: res.reply });

      // Show reply in UI
      const botMessage: Message = {
        id: (updatedMessages.length + 1).toString(),
        text: res.reply,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);

      // Extract short, realistic goals and write as suggestions
      const goalsFromChat = await extractGoalsFromReply(res.reply);
      if (goalsFromChat.length > 0) {
        await addChatSuggestions(cid, journalDate, goalsFromChat);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (messages.length + 1).toString(),
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
        <Text style={styles.headerTitle}>Journal – {journalDate}</Text>
        <Text style={styles.headerSub}>I'm here to help ☀️</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
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
    fontSize: 20,
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




