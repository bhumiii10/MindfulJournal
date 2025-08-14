import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { toDateISO } from '../services/db';

interface Goal {
  id: number;
  task: string;
  done: boolean;
}

const moodOptions = [
  { emoji: '☀️', label: 'Great' },
  { emoji: '⛅', label: 'Good' },
  { emoji: '☁️', label: 'Okay' },
  { emoji: '🌧️', label: 'Down' },
  { emoji: '⛈️', label: 'Struggling' },
  { emoji: '🌨️', label: 'Overwhelmed' },
];

const goalsList: Goal[] = [
  { id: 1, task: 'Morning meditation (10 min)', done: false },
  { id: 2, task: 'Take a walk outside', done: false },
  { id: 3, task: 'Drink 8 glasses of water', done: true },
];

export default function HomeScreen() {
  
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>(goalsList);
  const [selectedDate, setSelectedDate] = useState(toDateISO());
  const [markedDates, setMarkedDates] = useState({});
  const navigation = useNavigation<any>(); 

  // You can query Firestore here to mark all dates with existing journal entries
  useEffect(() => {
    const today = toDateISO();
    setMarkedDates({
      [today]: { selected: true, marked: true, selectedColor: '#a25cb2' }
    });
  }, []);

  const toggleGoal = (id: number) => {
    setGoals(goals.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal));
  };

  const onDayPress = async (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
  
    // maybe you tried to do convo lookup here...
    // const convoId = await getDailyConversationId(day.dateString);
  
    // Navigate to the journal screen directly with the date
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
            [selectedDate]: { selected: true, marked: true, selectedColor: '#a25cb2' }
          }}
          onDayPress={onDayPress}
          theme={{
            todayTextColor: '#f093fb',
            arrowColor: '#a25cb2',
          }}
        />
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
              activeOpacity={0.7}
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
            activeOpacity={0.7}
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
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4, marginRight: 12 },
  checkboxChecked: { backgroundColor: '#a25cb2', borderColor: '#a25cb2' },
  goalText: { fontSize: 15, color: '#17435c' },
  goalDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
});
