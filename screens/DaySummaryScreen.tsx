// screens/DaySummaryScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getDailySummary, toDateISO } from '../services/db';
import { summarizeDayAndSave } from '../utils/summarizeDay';

type RouteParams = { journalDate?: string };

export default function DaySummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { journalDate } = (route.params as RouteParams) || {};
  const dateISO = useMemo(() => journalDate || toDateISO(), [journalDate]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getDailySummary>> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const s = await getDailySummary(dateISO);
      setSummary(s);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [dateISO]);

  const regenerate = useCallback(async () => {
    try {
      setSaving(true);
      await summarizeDayAndSave(dateISO);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Summary error', msg);
    } finally {
      setSaving(false);
    }
  }, [dateISO, load]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      {/* Header (with back) */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <Text style={styles.title}>Day summary</Text>
        <Text style={styles.subtitle}>{dateISO}</Text>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#a25cb2" />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : !summary ? (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 28 }}>
          <View style={[styles.card, styles.rowBetween]}>
            <Text style={styles.cardTitle}>No summary yet</Text>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={regenerate}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.buttonText}>{saving ? 'Generating…' : 'Generate'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Regenerate control */}
          <View style={[styles.card, styles.rowBetween]}>
            <Text style={styles.cardTitle}>Summary</Text>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={regenerate}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.buttonText}>{saving ? 'Regenerating…' : 'Regenerate'}</Text>
            </TouchableOpacity>
          </View>

          {/* Overview */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Overview</Text>
              {!!summary.mood && <Text style={styles.moodPill}>{summary.mood}</Text>}
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: '#eef2ff' }]}>
                <Text style={[styles.statPillText, { color: '#4f46e5' }]}>
                  +{summary.goalsAdded ?? 0} added
                </Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: '#ecfdf5' }]}>
                <Text style={[styles.statPillText, { color: '#10b981' }]}>
                  {summary.goalsCompleted ?? 0} completed
                </Text>
              </View>
            </View>
          </View>

          {/* Topics */}
          {!!summary.topics?.length && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Topics</Text>
              <View style={styles.topicRow}>
                {summary.topics.slice(0, 8).map((t, i) => (
                  <View key={`${t}-${i}`} style={styles.topicChip}>
                    <Text style={styles.topicChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Narrative */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What happened</Text>
            <Text style={styles.summaryText}>
              {summary.summary || 'No summary text available.'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: { backgroundColor: '#a25cb2', paddingTop: 60, paddingBottom: 18, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  backText: { color: 'white', fontWeight: '700', fontSize: 16, paddingVertical: 2 },

  title: { fontSize: 22, fontWeight: '700', color: 'white', marginTop: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#6b7280', marginTop: 8 },

  body: { paddingHorizontal: 16, paddingTop: 12 },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },

  moodPill: {
    backgroundColor: '#f1e3f6',
    color: '#7a3aa1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statPillText: { fontWeight: '700' },

  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicChipText: { color: '#374151', fontSize: 12 },

  summaryText: { color: '#374151', lineHeight: 20 },

  button: {
    backgroundColor: '#f5576c',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: '700' },
});
