import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

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

// Example weather messages (extend as needed)
const weatherMessages: Record<string, { title: string; message: string }> = {
  Stormy: {
    title: "Storms can feel overwhelming, but they always pass. Let's work together to find your sunshine!",
    message: "You're stronger than you know, and I'm here to help you through this storm.",
  },
  // Add more messages per mood as needed
};

export default function JournalScreen() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodSelect = (label: string) => setSelectedMood(label);

  // Render after selection (weather-message)
  if (selectedMood && weatherMessages[selectedMood]) {
    return (
      <View style={styles.weatherMessageContainer}>
        <Text style={styles.weatherIconLarge}>
          {moodOptions.find(m => m.label === selectedMood)?.emoji || ''}
        </Text>
        <Text style={styles.weatherMessageTitle}>
          {weatherMessages[selectedMood].title}
        </Text>
        <Text style={styles.weatherMessageBody}>
          {weatherMessages[selectedMood].message}
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => {/* handle navigation to talk screen */}}>
          <Text style={styles.buttonText}>Let's Talk About It</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Journal mood selection screen
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        <Text style={styles.headerSub}>Let's explore your thoughts</Text>
      </View>

      {/* Mood Select Card */}
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
  // Weather message style
  weatherMessageContainer: {
    backgroundColor: '#fef3f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    margin: 24,
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  weatherIconLarge: {
    fontSize: 48,
    marginBottom: 16,
  },
  weatherMessageTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#f5576c',
  },
  weatherMessageBody: {
    textAlign: 'center',
    color: '#374151',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f5576c',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});
