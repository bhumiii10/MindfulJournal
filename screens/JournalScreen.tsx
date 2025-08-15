import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  ensureDailyConversation,
  toDateISO,
  addGoal,
  onGoalsByDate,
  toggleGoal,
  deleteGoal,
  getDailyConversationId,
  onChatSuggestionsByDate
} from '../services/db';
import { getSuggestedGoals } from '../services/suggestions';

type Mood = { emoji: string; label: string };

const moodOptions: Mood[] = [
  { emoji: '☀️', label: 'Sunny' },
  { emoji: '⛅', label: 'Partly Cloudy' },
  { emoji: '☁️', label: 'Cloudy' },
  { emoji: '🌧️', label: 'Rainy' },
  { emoji: '⛈️', label: 'Stormy' },
  { emoji: '🌨️', label: 'Snowy' },
];

// Normalize a title for dedupe and display checks
const norm = (s: string) =>
  s.replace(/[•\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function JournalScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const journalDate = route?.params?.journalDate || toDateISO();
  const toolId = route?.params?.toolId as string | undefined; 

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [suggested, setSuggested] = useState<string[]>([]);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  // Realtime goals for this date
  useEffect(() => {
    const unsubscribe = onGoalsByDate(journalDate, setGoals);
    return () => unsubscribe && unsubscribe();
  }, [journalDate]);

  // Realtime chat suggestions for this date
  useEffect(() => {
    let unsub: null | (() => void) = null;
    let cancelled = false;

    (async () => {
      const cid = await getDailyConversationId(journalDate);
      if (cancelled || !cid) {
        setChatSuggestions([]);
        return;
      }
      unsub = onChatSuggestionsByDate(cid, journalDate, (items) => {
        const titles = items.map((i) => i.title);
        setChatSuggestions(titles);
      });
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [journalDate]);

  // Merge static mood suggestions + chat suggestions, filter out existing goals & duplicates, keep chat a bit more permissive
  useEffect(() => {
    const existing = goals.map((g) => norm(g.title).toLowerCase());

    const staticSuggestions = getSuggestedGoals({
      mood: selectedMood || undefined,
      dateISO: journalDate,
      existing
    });

    // Chat items: allow up to 10 words/80 chars (we truncate visually)
    const chatOnly = chatSuggestions
      .map(norm)
      .filter((t) => !existing.includes(t.toLowerCase()))
      .filter((t) => t.length > 0);

    const merged: string[] = [];
    const seen = new Set<string>();

    [...chatOnly, ...staticSuggestions].forEach((title) => {
      const key = norm(title).toLowerCase();
      if (seen.has(key)) return;

      const isChat = chatOnly.includes(title);
      const words = title.trim().split(/\s+/).length;
      const len = title.length;

      const ok =
        (isChat && words <= 10 && len <= 80) ||
        (!isChat && words <= 8 && len <= 60);

      if (ok) {
        seen.add(key);
        merged.push(title.trim());
      }
    });

    setSuggested(merged);
  }, [goals, selectedMood, journalDate, chatSuggestions]);

  const handleMoodSelect = async (label: string) => {
    try {
      setSelectedMood(label);
      const cid = await ensureDailyConversation(journalDate, `Journal for ${journalDate}`);
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      await firestore()
        .doc(`users/${uid}/conversations/${cid}`)
        .set({ mood: label }, { merge: true });
        navigation.navigate('Chat', { journalDate, toolId });
    } catch (err) {
      console.error('Error saving mood:', err);
    }
  };

  const handleAddGoal = async () => {
    const title = newGoal.trim();
    if (!title) return;
    await addGoal(title, journalDate);
    setNewGoal('');
  };

  const handleAddSuggestion = async (title: string) => {
    await addGoal(title, journalDate);
    // show a transient "Added" state on chip
    const k = norm(title).toLowerCase();
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }, 1800);
  };

  const truncated = useMemo(
    () =>
      suggested.map((t) => (t.length > 60 ? t.slice(0, 57).trim() + '…' : t)),
    [suggested]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal – {journalDate}</Text>
        <Text style={styles.headerSub}>Let's explore your thoughts</Text>
      </View>

      {/* Mood picker */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How's your weather today?</Text>
        <View style={styles.moodGrid}>
          {moodOptions.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.moodItem, selectedMood === m.label && styles.moodItemSelected]}
              activeOpacity={0.7}
              onPress={() => handleMoodSelect(m.label)}
            >
              <Text style={styles.weatherIcon}>{m.emoji}</Text>
              <Text>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goals section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goals for {journalDate}</Text>

        {/* Add goal row */}
        <View style={styles.addGoalRow}>
          <TextInput
            style={styles.goalInput}
            placeholder="Add a goal..."
            value={newGoal}
            onChangeText={setNewGoal}
            onSubmitEditing={handleAddGoal}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddGoal} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Existing goals */}
        {goals.map((goal) => (
          <View key={goal.id} style={styles.goalRow}>
            <TouchableOpacity
              style={styles.goalToggle}
              onPress={() => toggleGoal(goal.id, !Boolean(goal.done))}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, goal.done && styles.checkboxChecked]} />
              <Text style={[styles.goalText, goal.done && styles.goalDone]}>{goal.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteGoal(goal.id)}>
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Suggested Goals as compact chips */}
      {truncated.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick wins for today</Text>
          <Text style={styles.cardHint}>Tap + to add to goals</Text>
          <View style={styles.chipRow}>
            {truncated.map((displayTitle, idx) => {
              const originalTitle = suggested[idx];
              const key = norm(originalTitle).toLowerCase();
              const added = recentlyAdded.has(key);
              return (
                <View key={idx} style={styles.chip}>
                  <Text numberOfLines={1} style={styles.chipText}>{displayTitle}</Text>
                  {added ? (
                    <View style={[styles.chipAdd, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.chipAddText}>✓</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.chipAdd}
                      onPress={() => handleAddSuggestion(originalTitle)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.chipAddText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#f093fb',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginBottom: 6,
  },
  headerSub: { fontSize: 15, color: 'rgba(255,255,255,0.95)' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, marginBottom: 8, color: '#374151', fontWeight: '600' },
  cardHint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 16,
    width: '32.5%',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodItemSelected: { backgroundColor: '#fef3f2', borderColor: '#f5576c' },
  weatherIcon: { fontSize: 30, marginBottom: 6 },
  addGoalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#f5576c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  goalToggle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteButton: { padding: 6 },
  deleteText: { fontSize: 18, color: '#f5576c', fontWeight: '600' },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#a25cb2', borderColor: '#a25cb2' },
  goalText: { fontSize: 15, color: '#374151' },
  goalDone: { textDecorationLine: 'line-through', color: '#9ca3af' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  chipText: {
    maxWidth: 220,
    color: '#374151',
  },
  chipAdd: {
    marginLeft: 8,
    backgroundColor: '#f5576c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipAddText: { color: '#fff', fontWeight: '700' },
});


