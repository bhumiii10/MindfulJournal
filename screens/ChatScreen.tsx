// screens/ChatScreen.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  addChatSuggestions,
  upsertDailySummary,
  getGoalStatsForDate,
  getConversationByDate,
} from '../services/db';
import { toolsCatalog } from '../data/tools';

type Message = { id: string; text: string; sender: 'bot' | 'user' };

// ---------------- Daily summary helpers ----------------
function extractTopicsAndSummary(text: string): { topics: string[]; summary: string } {
  const clean = text.replace(/\s+/g, ' ').trim();
  const words = clean.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const stops = new Set([
    'the','and','for','with','that','this','from','your','about','into','later','after','before','today','also',
    'just','you','i','we','me','my','our','but','not','are','was','were','been','will','shall','can','could',
    'would','should','a','an','to','in','on','of','at','it','is','as',
  ]);
  const freq = new Map<string, number>();
  for (const w of words) if (w.length > 3 && !stops.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
  const topics = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
  const sentences = text.split(/(?<=[\.!\?])\s+/).map(s => s.trim()).filter(Boolean);
  const picked = sentences.slice(-2).join(' ');
  const summary = (picked || clean).slice(0, 220);
  return { topics, summary };
}

async function updateDailySummary(journalDate: string, replyText: string) {
  try {
    const { topics, summary } = extractTopicsAndSummary(replyText);
    const [stats, convo] = await Promise.all([
      getGoalStatsForDate(journalDate),
      getConversationByDate(journalDate),
    ]);
    await upsertDailySummary(journalDate, {
      mood: convo?.mood ?? null,
      goalsAdded: stats.added,
      goalsCompleted: stats.completed,
      topics,
      summary,
    });
  } catch {
    // non-blocking
  }
}

// ---------------- Micro-goals helpers ----------------
function keepGoal(raw: string): string | null {
  let t = raw.replace(/^[-\*•\s]+/, '').trim();
  if (!t) return null;
  const words = t.split(/\s+/).length;
  if (words < 2 || words > 9) return null;
  if (t.length > 80) t = t.slice(0, 77).trim() + '…';
  const verbs = ['walk','drink','write','text','call','stretch','breathe','tidy','plan','read','meditate','journal','hydrate','email','organize','prep','cook','clean','sort','file','review','water','wash','message','note','list','step','sit','stand'];
  const lower = t.toLowerCase();
  const startsWithVerbOrTimey =
    verbs.some((v) => lower.startsWith(v + ' ')) ||
    /^[0-9]+(-| )?minute(s)?\b/.test(lower) ||
    /^[0-9]+(-| )?min\b/.test(lower);
  if (!startsWithVerbOrTimey) return null;
  if (/^(breathe|hydrate|journal|walk|stretch|meditate|clean|plan|read)$/i.test(t)) return null;
  return t;
}
function uniqueGoalsShort(goals: string[], cap = 5): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const g of goals) { const k = g.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(g); if (out.length >= cap) break; } }
  return out;
}
async function extractGoalsFromReply(reply: string): Promise<string[]> {
  const lines = reply.split('\n').map((l) => l.trim()).filter(Boolean);
  const pool = (lines.length > 8) ? lines.slice(-8) : lines;
  const candidates: string[] = [];
  for (const l of pool) { const kept = keepGoal(l); if (kept) candidates.push(kept); }
  return uniqueGoalsShort(candidates, 5);
}

export default function ChatScreen({ route, navigation }: any) {
  const journalDate = route?.params?.journalDate || toDateISO();
  const initialConversationId = route?.params?.conversationId || null;
  const initialToolId = route?.params?.toolId as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

  // Guided mode
  const [guided, setGuided] = useState<{ toolId: string; stepIndex: number } | null>(
    initialToolId ? { toolId: initialToolId, stepIndex: 0 } : null
  );
  const [guidedOptOut, setGuidedOptOut] = useState(false);
  const [introForToolId, setIntroForToolId] = useState<string | null>(null);

  // Fresh tool intent
  useEffect(() => {
    const nextId = route?.params?.toolId as string | undefined;
    if (nextId) {
      setGuidedOptOut(false);
      if (!guided || guided.toolId !== nextId) setGuided({ toolId: nextId, stepIndex: 0 });
      if (introForToolId !== nextId) setIntroForToolId(null);
    }
  }, [route?.params?.toolId, guided, introForToolId]);

  const guidedTool = useMemo(
    () => (guided ? toolsCatalog.find(t => t.id === guided.toolId) : null),
    [guided]
  );

  // If tool removed, exit guided
  useEffect(() => { if (guided && !guidedTool) setGuided(null); }, [guided, guidedTool]);

  const flatListRef = useRef<FlatList>(null);

  // Load messages for day
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setConversationId(null);
      setMessages([]);
      const cid = await getDailyConversationId(journalDate);
      if (cancelled) return;
      if (!cid) return;
      setConversationId(cid);
      const docs = await getMessages(cid);
      if (cancelled) return;
      setMessages(docs.map((m: any, idx: number) => ({
        id: String(idx + 1),
        text: m.content,
        sender: m.role === 'user' ? 'user' : 'bot',
      })));
    }
    load();
    return () => { cancelled = true; };
  }, [journalDate]);

  // Guided intro once per intent
  useEffect(() => {
    let cancelled = false;
    async function maybeIntro() {
      if (!guided || !guidedTool || guidedOptOut) return;
      if (introForToolId === guided.toolId) return;

      let cid = conversationId;
      if (!cid) {
        cid = await ensureDailyConversation(journalDate, `Start: ${guidedTool.title}`);
        if (cancelled) return;
        setConversationId(cid);
      }
      if (!cid) return;

      const forceIntro = Boolean(route?.params?.toolId);
      const hasIntro = messages.some(m => m.sender === 'bot' && m.text.startsWith(`Let’s do “${guidedTool.title}”`));
      if (!forceIntro && hasIntro) return;

      const intro = [
        `Let’s do “${guidedTool.title}” (${guidedTool.durationMin}min, ${guidedTool.skill}).`,
        `Step 1: ${guidedTool.steps[0]}`,
        `(Reply “skip” to skip, “exit” to leave)`
      ].join('\n');

      try { await addMessage(cid, { role: 'assistant', content: intro }); } catch {}
      if (cancelled) return;

      setIntroForToolId(guided.toolId);

      navigation.setParams?.({ toolId: undefined });
      try { if (!navigation.setParams && route?.params) { /* @ts-ignore */ route.params.toolId = undefined; } } catch {}

      setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: intro, sender: 'bot' }]);
    }
    maybeIntro();
    return () => { cancelled = true; };
  }, [guided, guidedTool, guidedOptOut, conversationId, journalDate, messages, route?.params?.toolId, introForToolId, navigation, route]);

  const sendNormalReply = async (text: string, updatedMessages: Message[], cid: string) => {
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

    await addMessage(cid, { role: 'assistant', content: res.reply });

    setMessages((prev) => [...prev, { id: (updatedMessages.length + 1).toString(), text: res.reply, sender: 'bot' }]);

    try {
      const goalsFromChat = await extractGoalsFromReply(res.reply);
      if (goalsFromChat.length > 0 && cid) await addChatSuggestions(cid, journalDate, goalsFromChat);
    } catch {}

    await updateDailySummary(journalDate, res.reply);
  };

  const clearToolParam = () => {
    navigation.setParams?.({ toolId: undefined });
    try { if (!navigation.setParams && route?.params) { /* @ts-ignore */ route.params.toolId = undefined; } } catch {}
  };

  const exitGuidedNow = async (cid: string) => {
    setGuided(null);
    setGuidedOptOut(true);
    clearToolParam();
    const exitMsg = 'Okay, exiting coach mode. How can I help now?';
    try {
      await addMessage(cid, { role: 'assistant', content: exitMsg });
      setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: exitMsg, sender: 'bot' }]);
    } catch {}
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const newMessage: Message = { id: (messages.length + 1).toString(), text, sender: 'user' };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      let cid = conversationId;
      if (!cid) { cid = await ensureDailyConversation(journalDate, text); setConversationId(cid); }
      if (!cid) throw new Error('Conversation ID missing');

      await addMessage(cid, { role: 'user', content: text });

      if (guided) {
        if (/^(stop|exit|quit|cancel)$/i.test(text)) { await exitGuidedNow(cid); return; }
        if (/^(skip|next)$/i.test(text) && guidedTool) {
          const steps = guidedTool.steps; const current = guided.stepIndex; const next = current + 1;
          if (introForToolId !== guided.toolId) setIntroForToolId(guided.toolId);
          if (next < steps.length) {
            setGuided({ ...guided, stepIndex: next });
            const botText = `No problem. Step ${next + 1}: ${steps[next]}\n(Reply “skip” to skip, “exit” to leave)`;
            await addMessage(cid, { role: 'assistant', content: botText });
            setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: botText, sender: 'bot' }]);
            return;
          } else {
            setGuided(null);
            setGuidedOptOut(false);
            clearToolParam();
            const wrap = [
              `Nice work on “${guidedTool.title}”.`,
              `In one line, what did you notice in your body or mind?`,
              `Tiny follow-ups for today:`,
              `- ${guidedTool.goalTitle}`,
              `- 3-minute check-in later`,
              `- Share one insight with someone`,
            ].join('\n');
            await addMessage(cid, { role: 'assistant', content: wrap });
            setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: wrap, sender: 'bot' }]);
            try {
              const goalsFromChat = await extractGoalsFromReply(wrap);
              if (goalsFromChat.length > 0) await addChatSuggestions(cid, journalDate, goalsFromChat);
            } catch {}
            await updateDailySummary(journalDate, wrap);
            return;
          }
        }
      }

      if (guided && guidedTool) {
        const steps = guidedTool.steps; const current = guided.stepIndex; const next = current + 1;
        if (introForToolId !== guided.toolId) setIntroForToolId(guided.toolId);
        if (next < steps.length) {
          setGuided({ ...guided, stepIndex: next });
          const botText = `Great. Step ${next + 1}: ${steps[next]}\n(Reply “skip” to skip, “exit” to leave)`;
          await addMessage(cid, { role: 'assistant', content: botText });
          setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: botText, sender: 'bot' }]);
          return;
        } else {
          setGuided(null);
          setGuidedOptOut(false);
          clearToolParam();
          const wrap = [
            `Nice work on “${guidedTool.title}”.`,
            `In one line, what did you notice in your body or mind?`,
            `Tiny follow-ups for today:`,
            `- ${guidedTool.goalTitle}`,
            `- 3-minute check-in later`,
            `- Share one insight with someone`,
          ].join('\n');
          await addMessage(cid, { role: 'assistant', content: wrap });
          setMessages(prev => [...prev, { id: (prev.length + 1).toString(), text: wrap, sender: 'bot' }]);
          try {
            const goalsFromChat = await extractGoalsFromReply(wrap);
            if (goalsFromChat.length > 0) await addChatSuggestions(cid, journalDate, goalsFromChat);
          } catch {}
          await updateDailySummary(journalDate, wrap);
          return;
        }
      }

      await sendNormalReply(text, updatedMessages, cid);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (messages.length + 1).toString(), text: '❌ Error getting reply. Please try again.', sender: 'bot' },
      ]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.message, isUser ? styles.messageUser : styles.messageBot, isUser ? styles.alignRight : styles.alignLeft]}>
        <Text style={isUser ? styles.textUser : styles.textBot}>{item.text}</Text>
      </View>
    );
  };

  const inGuide = Boolean(guidedTool);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal – {journalDate}{inGuide ? ` • Guided: ${guidedTool?.title}` : ''}</Text>
        {inGuide ? (
          <View style={styles.headerRow}>
            <Text style={styles.headerSub}>Step-by-step coach mode</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  let cid = conversationId;
                  if (!cid) { cid = await ensureDailyConversation(journalDate, 'Exit guided'); setConversationId(cid); }
                  if (!cid) return;
                  await exitGuidedNow(cid);
                } catch {
                  setGuided(null);
                  setGuidedOptOut(true);
                  clearToolParam();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.headerExit}>Exit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.headerSub}>I'm here to help ☀️</Text>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatMessages}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.chatInput}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={inGuide ? 'Reply to the step… (type “exit” to leave)' : 'Share what’s on your mind…'}
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
  header: { backgroundColor: '#f093fb', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: 'white', marginBottom: 4 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  headerExit: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600' },
  chatMessages: { paddingHorizontal: 24, paddingVertical: 16, flexGrow: 1 },
  message: { maxWidth: '80%', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
  messageBot: { backgroundColor: '#f1f5f9' },
  messageUser: { backgroundColor: '#f5576c' },
  textBot: { color: '#374151', fontSize: 15 },
  textUser: { color: 'white', fontSize: 15 },
  alignLeft: { alignSelf: 'flex-start' },
  alignRight: { alignSelf: 'flex-end' },
  chatInput: { borderTopColor: '#e5e7eb', borderTopWidth: 1, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'white' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textInput: { flex: 1, borderColor: '#d1d5db', borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, maxHeight: 100 },
  sendButton: { backgroundColor: '#f5576c', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
});
