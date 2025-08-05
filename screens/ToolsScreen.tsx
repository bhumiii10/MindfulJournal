import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const tools = [
  { emoji: '🫁', label: 'Breathing' },
  { emoji: '🧘', label: 'Meditation' },
  { emoji: '💪', label: 'Exercises' },
  { emoji: '🎵', label: 'Sounds' },
  { emoji: '📚', label: 'Articles' },
  { emoji: '☎️', label: 'Support' },
];

export default function ToolsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wellness Tools</Text>
        <Text style={styles.headerSub}>Resources to support you</Text>
      </View>

      {/* Tools Grid */}
      <View style={styles.toolGrid}>
        {tools.map((tool, index) => (
          <View key={index} style={styles.toolItem}>
            <Text style={styles.toolIcon}>{tool.emoji}</Text>
            <Text>{tool.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity style={[styles.btn, styles.primaryBtn]}>
          <Text style={styles.btnText}>Start 5-Minute Breathing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.secondaryBtn]}>
          <Text style={styles.btnText}>Journal Check-in</Text>
        </TouchableOpacity>
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
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    margin: 24,
  },
  toolItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  toolIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
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
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#374151',
    fontWeight: '600',
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: '#f5576c',
  },
  secondaryBtn: {
    backgroundColor: '#667eea',
  },
});
