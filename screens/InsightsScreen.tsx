import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function InsightsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Insights</Text>
        <Text style={styles.headerSub}>Track your progress</Text>
      </View>

      {/* Streak Counter */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>7</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>

      {/* Mood Trends */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Trends (Past Week)</Text>
        <View style={styles.moodChart}>
          {[60, 80, 40, 90, 70, 50, 85].map((heightPercent, idx) => (
            <View
              key={idx}
              style={[styles.chartBar, { height: `${heightPercent}%` }]}
            />
          ))}
        </View>
        <Text style={styles.chartCaption}>You've been trending upward! 📈</Text>
      </View>

      {/* Goal Completion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal Completion</Text>
        <View style={styles.progressRow}>
          <Text>This Week</Text>
          <Text style={styles.progressText}>12/15 completed</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>
      </View>

      {/* Most Used Tools */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Most Used Tools</Text>
        <View style={styles.toolStat}>
          <Text>Breathing Exercises</Text>
          <Text style={styles.toolCount}>8 times</Text>
        </View>
        <View style={styles.toolStat}>
          <Text>Meditation</Text>
          <Text style={styles.toolCount}>5 times</Text>
        </View>
        <View style={styles.toolStat}>
          <Text>Journaling</Text>
          <Text style={styles.toolCount}>3 times</Text>
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
  statCard: {
    backgroundColor: '#764ba2', // React Native does not support this directly, consider LinearGradient component if needed
    padding: 24,
    borderRadius: 16,
    margin: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  statLabel: {
    color: 'white',
    fontSize: 16,
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
  moodChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    marginBottom: 8,
  },
  chartBar: {
    width: 20,
    backgroundColor: '#f5576c',
    borderRadius: 4,
  },
  chartCaption: {
    color: '#4b5563',
    fontSize: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontWeight: 'bold',
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#f5576c',
    height: '100%',
    borderRadius: 4,
  },
  toolStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toolCount: {
    color: '#f5576c',
    fontWeight: 'bold',
  },
});
