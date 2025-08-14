import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { ensureDailyConversation, toDateISO, addGoal, onGoalsByDate, toggleGoal, deleteGoal } from '../services/db';

type Mood = { emoji: string; label: string };

const moodOptions: Mood[] = [
  { emoji: '☀️', label: 'Sunny' },
  { emoji: '⛅', label: 'Partly Cloudy' },
  { emoji: '☁️', label: 'Cloudy' },
  { emoji: '🌧️', label: 'Rainy' },
  { emoji: '⛈️', label: 'Stormy' },
  { emoji: '🌨️', label: 'Snowy' },
];

export default function JournalScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const journalDate = route?.params?.journalDate || toDateISO();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const unsubscribe = onGoalsByDate(journalDate, setGoals);
    return () => unsubscribe && unsubscribe();
  }, [journalDate]);

  const handleMoodSelect = async (label: string) => {
    try {
      setSelectedMood(label);
      const cid = await ensureDailyConversation(journalDate, `Journal for ${journalDate}`);
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      await firestore().doc(`users/${uid}/conversations/${cid}`).set({ mood: label }, { merge: true });
      navigation.navigate('Chat', { journalDate });
    } catch (err) {
      console.error('Error saving mood:', err);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;
    await addGoal(newGoal.trim(), journalDate);
    setNewGoal('');
  };

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

        {/* Add goal */}
        <View style={styles.addGoalRow}>
          <TextInput
            style={styles.goalInput}
            placeholder="Add a goal..."
            value={newGoal}
            onChangeText={setNewGoal}
            onSubmitEditing={handleAddGoal}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Goal list */}
        {goals.map(goal => (
          <View key={goal.id} style={styles.goalRow}>
            <TouchableOpacity
              style={styles.goalToggle}
              onPress={() => toggleGoal(goal.id, !Boolean(goal.done))}
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
    </ScrollView>
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
    fontSize: 24, fontWeight: '600', color: 'white', marginBottom: 8,
  },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 20,
    margin: 24, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardTitle: { fontSize: 18, marginBottom: 12, color: '#374151', fontWeight: '600' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodItem: {
    alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 12, paddingVertical: 20, width: '32.5%', marginBottom: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  moodItemSelected: { backgroundColor: '#fef3f2', borderColor: '#f5576c' },
  weatherIcon: { fontSize: 32, marginBottom: 8 },
  addGoalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  goalInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
  },
  addButton: { backgroundColor: '#f5576c', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  goalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomColor: '#e5e7eb', borderBottomWidth: 1,
  },
  goalToggle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteButton: { padding: 6 },
  deleteText: { fontSize: 18, color: '#f5576c', fontWeight: '600' },
  checkbox: {
    width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db',
    borderRadius: 4, marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#a25cb2', borderColor: '#a25cb2' },
  goalText: { fontSize: 15, color: '#374151' },
  goalDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
});

