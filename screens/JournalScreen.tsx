import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { ensureDailyConversation, toDateISO } from '../services/db';

type Mood = {
  emoji: string;
  label: string;
};

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

  const handleMoodSelect = async (label: string) => {
    try {
      setSelectedMood(label);

      // Ensure a conversation for this date exists
      const cid = await ensureDailyConversation(journalDate, `Journal for ${journalDate}`);
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      // Save mood to the conversation doc
      await firestore()
        .doc(`users/${uid}/conversations/${cid}`)
        .set({ mood: label }, { merge: true });

      // Navigate straight to ChatScreen for that date
      navigation.navigate('Chat', { journalDate });
    } catch (err) {
      console.error('Error saving mood:', err);
    }
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
          {moodOptions.map((mood, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.moodItem,
                selectedMood === mood.label && styles.moodItemSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => handleMoodSelect(mood.label)}
            >
              <Text style={styles.weatherIcon}>{mood.emoji}</Text>
              <Text>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    margin: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    width: '32.5%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodItemSelected: {
    backgroundColor: '#fef3f2',
    borderColor: '#f5576c',
  },
  weatherIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
});
