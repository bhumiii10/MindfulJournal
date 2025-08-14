// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { toDateISO, onGoalsByDate, toggleGoal, deleteGoal } from '../services/db';

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
  const [markedDates, setMarkedDates] = useState({});
  const [goals, setGoals] = useState<any[]>([]);

  // Mark today by default
  useEffect(() => {
    setMarkedDates({
      [toDateISO()]: { selected: true, marked: true, selectedColor: '#a25cb2' },
    });
  }, []);

  // Realtime goals data
  useEffect(() => {
    const unsubscribe = onGoalsByDate(selectedDate, setGoals);
    return () => unsubscribe && unsubscribe();
  }, [selectedDate]);

  const onDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    navigation.navigate('Journal', { journalDate: day.dateString });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Good morning, Bhumi</Text>
        <Text style={styles.headerSub}>How are you feeling today?</Text>
      </View>

      {/* Calendar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Journal Calendar</Text>
        <Calendar
          markedDates={{
            ...markedDates,
            [selectedDate]: { selected: true, marked: true, selectedColor: '#a25cb2' },
          }}
          onDayPress={onDayPress}
          theme={{ todayTextColor: '#f093fb', arrowColor: '#a25cb2' }}
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

      {/* Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goals for {selectedDate}</Text>
        {goals.length === 0 && <Text style={{ color: '#888' }}>No goals for this date yet.</Text>}
        {goals.map(goal => (
          <View key={goal.id} style={styles.goalRow}>
            <TouchableOpacity
              style={styles.goalToggle}
              onPress={() => toggleGoal(goal.id, !Boolean(goal.done))}
            >
              <View style={[styles.checkbox, goal.done && styles.checkboxChecked]} />
              <Text style={[styles.goalText, goal.done && styles.goalDone]}>{goal.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteGoal(goal.id)}
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
