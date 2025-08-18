// screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getRecentSummaries, toDateISO } from '../services/db';

type DaySummaryItem = {
  date: string;
  mood?: string | null;
  goalsAdded: number;
  goalsCompleted: number;
  topics?: string[];
  summary?: string;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const auth = getAuth(getApp());
  const user = auth.currentUser;

  const displayName = useMemo(
    () => user?.displayName || user?.email?.split('@')[0] || 'Friend',
    [user]
  );
  const email = user?.email || 'Unknown';

  const [items, setItems] = useState<DaySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return unsub;
  }, [auth]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getRecentSummaries(60);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) load();
  }, [authReady, load]);

  useFocusEffect(
    useCallback(() => {
      if (authReady) load();
    }, [authReady, load])
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      Alert.alert('Sign out error', e?.message ?? String(e));
    }
  };

  const openDaySummary = (dateISO: string) => {
    navigation.navigate('DaySummary', { journalDate: dateISO });
  };

  const renderItem = ({ item }: { item: DaySummaryItem }) => {
    const { date, mood, goalsAdded, goalsCompleted, topics, summary } = item;
    return (
      <TouchableOpacity
        style={styles.summaryCard}
        activeOpacity={0.85}
        onPress={() => openDaySummary(date)}
      >
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryDate}>{date}</Text>
          {!!mood && <Text style={styles.moodPill}>{mood}</Text>}
        </View>

        <Text style={styles.summaryText} numberOfLines={3}>
          {summary || 'No summary yet.'}
        </Text>

        {!!topics?.length && (
          <View style={styles.topicRow}>
            {topics.slice(0, 5).map((t, i) => (
              <View key={`${date}-${t}-${i}`} style={styles.topicChip}>
                <Text style={styles.topicChipText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: '#eef2ff' }]}>
            <Text style={[styles.statPillText, { color: '#4f46e5' }]}>+{goalsAdded} added</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#ecfdf5' }]}>
            <Text style={[styles.statPillText, { color: '#10b981' }]}>{goalsCompleted} completed</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <>
      {/* Header band */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Your reflection space</Text>
      </View>

      {/* User row */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.signOutPill}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Text style={styles.signOutPillText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Section intro */}
      <View style={styles.listIntro}>
        <Text style={styles.sectionTitle}>Daily summaries</Text>
        <Text style={styles.sectionHint}>Tap a day to view its recap</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.date}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={styles.muted}>
                No summaries yet. Try writing today: {toDateISO()}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    backgroundColor: '#a25cb2',
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 6 },

  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1e3f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#7a3aa1' },
  userInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' },
  meta: { marginTop: 2, color: '#4b5563' },

  signOutPill: {
    backgroundColor: '#f5576c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signOutPillText: { color: 'white', fontWeight: '700' },

  listIntro: { paddingHorizontal: 24, paddingTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  summaryCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    backgroundColor: 'white',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryDate: { fontSize: 15, fontWeight: '700', color: '#111827' },
  moodPill: {
    backgroundColor: '#f1e3f6',
    color: '#7a3aa1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },
  summaryText: { color: '#374151', lineHeight: 20 },

  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  topicChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicChipText: { color: '#374151', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statPillText: { fontWeight: '700' },

  muted: { color: '#6b7280' },
});
