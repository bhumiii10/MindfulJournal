// screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  toDateISO,
  onGoalsByDate,
  toggleGoal,
  deleteGoal,
  getRecentJournalDates,
} from '../services/db';

const moodOptions = [
  { emoji: '☀️', label: 'Great' },
  { emoji: '⛅', label: 'Good' },
  { emoji: '☁️', label: 'Okay' },
  { emoji: '🌧️', label: 'Down' },
  { emoji: '⛈️', label: 'Struggling' },
  { emoji: '🌨️', label: 'Overwhelmed' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState(toDateISO());
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [goals, setGoals] = useState<any[]>([]);

  // Auth readiness so we only query after user is known
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return unsub;
  }, []);

  // Realtime goals for the currently selected date
  useEffect(() => {
    if (!authReady) return;
    const unsubscribe = onGoalsByDate(selectedDate, setGoals);
    return () => unsubscribe && unsubscribe();
  }, [authReady, selectedDate]);

  // Load all dates with a journal conversation and build markedDates
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set());
  const loadJournalDates = useCallback(async () => {
    try {
      const dates = await getRecentJournalDates(180);
      setJournalDates(new Set(dates));
    } catch {
      setJournalDates(new Set());
    }
  }, []);

  // Refresh highlight dates when Home regains focus or when auth becomes ready
  useFocusEffect(
    useCallback(() => {
      if (authReady) loadJournalDates();
    }, [authReady, loadJournalDates])
  );

  // Build markedDates for Calendar, ensuring today/selected are visible
  const markedDates = useMemo(() => {
    const md: Record<string, any> = {};
    journalDates.forEach((d) => {
      md[d] = { ...(md[d] || {}), marked: true, dotColor: '#f5576c' };
    });
    // Keep the selected day visually selected
    md[selectedDate] = { ...(md[selectedDate] || {}), selected: true, selectedColor: '#a25cb2' };
    // Optionally: highlight today text color via Calendar theme (below)
    return md;
  }, [journalDates, selectedDate]);

  const onDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    navigation.navigate('Journal', { journalDate: day.dateString });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Good morning</Text>
        <Text style={styles.headerSub}>How are you feeling today?</Text>
      </View>

      {/* Calendar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Journal Calendar</Text>
        <Calendar
          markedDates={markedDates}
          onDayPress={onDayPress}
          theme={{
            todayTextColor: '#f093fb',
            arrowColor: '#a25cb2',
            selectedDayBackgroundColor: '#a25cb2',
            dotColor: '#f5576c',
          }}
        />
      </View>

      {/* Mood Check */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Mood Check</Text>
        <View style={styles.moodGrid}>
          {moodOptions.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.moodItem, selectedMood === m.label && styles.moodItemSelected]}
              onPress={() => setSelectedMood(m.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.weatherIcon}>{m.emoji}</Text>
              <Text>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goals for the selected date */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goals for {selectedDate}</Text>
        {goals.length === 0 && <Text style={{ color: '#888' }}>No goals for this date yet.</Text>}
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
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteGoal(goal.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    backgroundColor: '#a25cb2',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: '600', color: 'white', marginBottom: 8 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { fontSize: 18, marginBottom: 12, color: '#374151', fontWeight: '600' },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 20,
    width: '32%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodItemSelected: { backgroundColor: '#ede9fe', borderColor: '#a25cb2' },
  weatherIcon: { fontSize: 32, marginBottom: 8 },

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
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4, marginRight: 12 },
  checkboxChecked: { backgroundColor: '#a25cb2', borderColor: '#a25cb2' },
  goalText: { fontSize: 15, color: '#17435c' },
  goalDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
});
