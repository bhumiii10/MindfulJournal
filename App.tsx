import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const moodOptions = [
  { emoji: '☀️', label: 'Great' },
  { emoji: '⛅', label: 'Good' },
  { emoji: '☁️', label: 'Okay' },
  { emoji: '🌧️', label: 'Down' },
  { emoji: '⛈️', label: 'Struggling' },
  { emoji: '🌨️', label: 'Overwhelmed' },
];

const goalsList = [
  { id: 1, task: "Morning meditation (10 min)", done: false },
  { id: 2, task: "Take a walk outside", done: false },
  { id: 3, task: "Drink 8 glasses of water", done: true },
];

export default function HomeScreen() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [goals, setGoals] = useState(goalsList);

  const toggleGoal = (id) => {
    setGoals(goals.map(goal => (goal.id === id ? { ...goal, done: !goal.done } : goal)));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Good morning, Alex</Text>
        <Text style={styles.headerSub}>How are you feeling today?</Text>
      </View>

      {/* Mood Grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Mood Check</Text>
        <View style={styles.moodGrid}>
          {moodOptions.map((mood, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.moodItem,
                selectedMood === mood.label && styles.moodItemSelected,
              ]}
              onPress={() => setSelectedMood(mood.label)}
            >
              <Text style={styles.weatherIcon}>{mood.emoji}</Text>
              <Text>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Goals</Text>
        {goals.map(goal => (
          <TouchableOpacity
            key={goal.id}
            style={styles.goalItem}
            onPress={() => toggleGoal(goal.id)}
          >
            <View style={[styles.checkbox, goal.done && styles.checkboxChecked]} />
            <Text style={[styles.goalText, goal.done && styles.goalDone]}>
              {goal.task}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // RN needs 3rd party lib for gradients (e.g. expo-linear-gradient)
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    // Shadows work differently on iOS and Android:
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3, // Android shadow
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#374151',
    fontWeight: '600',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: '30%', // roughly 3 per row
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodItemSelected: {
    backgroundColor: '#fef3f2',
    borderColor: '#f5576c',
  },
  weatherIcon: { fontSize: 32, marginBottom: 8 },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#f5576c',
    borderColor: '#f5576c',
  },
  goalText: { fontSize: 15, color: '#17435c' },
  goalDone: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
});