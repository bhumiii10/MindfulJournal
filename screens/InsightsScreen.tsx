import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ---------- Date utils ----------
function toDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(baseISO: string, delta: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateISO(dt);
}
function rangeDays(endISO: string, days: number): string[] {
  const arr: string[] = [];
  for (let i = days - 1; i >= 0; i--) arr.push(addDays(endISO, -i));
  return arr;
}
function weekStartISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Sun ... 6 Sat
  const mondayOffset = (day + 6) % 7; // days since Monday
  dt.setDate(dt.getDate() - mondayOffset);
  return toDateISO(dt);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ---------- Types ----------
type DayGoalStats = { date: string; done: number; total: number };
type MoodDay = { date: string; mood?: string | null };

// ---------- Firestore fetchers (simple and clear for MVP) ----------
async function fetchGoalsByDate(dateISO: string): Promise<DayGoalStats> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const snap = await firestore()
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .get();
  let done = 0;
  let total = 0;
  snap.forEach((doc) => {
    const g = doc.data() as any;
    total += 1;
    if (g.done) done += 1;
  });
  return { date: dateISO, done, total };
}

async function fetchGoalsByDates(dates: string[]): Promise<Record<string, DayGoalStats>> {
  const out: Record<string, DayGoalStats> = {};
  // Sequential for simplicity; can be parallelized later
  for (const d of dates) {
    out[d] = await fetchGoalsByDate(d);
  }
  return out;
}

async function fetchMoodByDate(dateISO: string): Promise<MoodDay> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const snap = await firestore()
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();
  if (snap.empty) return { date: dateISO, mood: null };
  const data = snap.docs[0].data() as any;
  return { date: dateISO, mood: data.mood ?? null };
}

async function fetchMoodsByDates(dates: string[]): Promise<Record<string, MoodDay>> {
  const out: Record<string, MoodDay> = {};
  for (const d of dates) out[d] = await fetchMoodByDate(d);
  return out;
}

export default function InsightsScreen() {
  const todayISO = useMemo(() => toDateISO(), []);
  const weekStart = useMemo(() => weekStartISO(todayISO), [todayISO]);

  // Memoize date arrays so their identity only changes when inputs change
  const last7Dates = useMemo(() => rangeDays(todayISO, 7), [todayISO]);
  const thisWeekDates = useMemo(
    () => rangeDays(addDays(weekStart, 6), 7),
    [weekStart]
  );

  const [sevenDayStats, setSevenDayStats] = useState<Record<string, DayGoalStats>>({});
  const [weekStats, setWeekStats] = useState<Record<string, DayGoalStats>>({});
  const [todayStats, setTodayStats] = useState<DayGoalStats | null>(null);
  const [moodMap, setMoodMap] = useState<Record<string, MoodDay>>({});

  // Load goals and moods for cards/charts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [seven, week, todayOnly, moods7] = await Promise.all([
          fetchGoalsByDates(last7Dates),
          fetchGoalsByDates(thisWeekDates),
          fetchGoalsByDates([todayISO]),
          fetchMoodsByDates(last7Dates),
        ]);
        if (!mounted) return;
        setSevenDayStats(seven);
        setWeekStats(week);
        setTodayStats(todayOnly[todayISO] ?? { date: todayISO, done: 0, total: 0 });
        setMoodMap(moods7);
      } catch {
        // Optional: show a lightweight error UI/state
      }
    })();
    return () => {
      mounted = false;
    };
  }, [todayISO, last7Dates, thisWeekDates]);

  // Derived: 7-day streak ending today (consecutive days with ≥1 done)
  const sevenDayStreak = useMemo(() => {
    let streak = 0;
    for (let i = last7Dates.length - 1; i >= 0; i--) {
      const d = last7Dates[i];
      const stats = sevenDayStats[d];
      if (stats && stats.done > 0) streak += 1;
      else break;
    }
    return streak;
  }, [sevenDayStats, last7Dates]);

  // Derived: This week totals
  const thisWeekTotals = useMemo(() => {
    let done = 0;
    let total = 0;
    thisWeekDates.forEach((d) => {
      const s = weekStats[d];
      if (s) {
        done += s.done;
        total += s.total;
      }
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct: clamp(pct, 0, 100) };
  }, [weekStats, thisWeekDates]);

  // Mini chart: last 7 days bar heights
  const miniBars = useMemo(() => {
    const values = last7Dates.map((d) => sevenDayStats[d]?.done ?? 0);
    const max = Math.max(1, ...values);
    return values.map((v) => Math.round((v / max) * 100));
  }, [sevenDayStats, last7Dates]);

  // Mood distribution (last 7 days)
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    last7Dates.forEach((d) => {
      const mood = moodMap[d]?.mood;
      if (mood) counts[mood] = (counts[mood] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [moodMap, last7Dates]);

  // Today progress
  const todayDone = todayStats?.done ?? 0;
  const todayTotal = todayStats?.total ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Insights</Text>
        <Text style={styles.headerSub}>Track your progress</Text>
      </View>

      {/* Today card */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>
          {todayDone}/{todayTotal}
        </Text>
        <Text style={styles.statLabel}>Goals completed today</Text>
      </View>

      {/* Streak + This week */}
      <View style={styles.rowStats}>
        <View style={[styles.statMini, { backgroundColor: '#fef3f2', borderColor: '#fca5a5' }]}>
          <Text style={styles.statMiniNumber}>{sevenDayStreak}</Text>
          <Text style={styles.statMiniLabel}>Day Streak</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: '#ecfeff', borderColor: '#67e8f9' }]}>
          <Text style={styles.statMiniNumber}>
            {thisWeekTotals.done}/{thisWeekTotals.total}
          </Text>
          <Text style={styles.statMiniLabel}>This Week</Text>
        </View>
      </View>

      {/* Last 7 days mini bar chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 7 days</Text>
        <View style={styles.moodChart}>
          {miniBars.map((heightPercent, idx) => (
            <View key={idx} style={[styles.chartBar, { height: `${heightPercent}%` }]} />
          ))}
        </View>
        <Text style={styles.chartCaption}>Each bar = goals completed that day</Text>
      </View>

      {/* This week completion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal completion this week</Text>
        <View style={styles.progressRow}>
          <Text>{thisWeekTotals.done}/{thisWeekTotals.total} completed</Text>
          <Text style={styles.progressText}>{thisWeekTotals.pct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${thisWeekTotals.pct}%` }]} />
        </View>
      </View>

      {/* Mood distribution (last 7 days) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood distribution (last 7 days)</Text>
        {moodCounts.length === 0 ? (
          <Text style={{ color: '#6b7280' }}>No moods recorded yet</Text>
        ) : (
          moodCounts.map(([mood, count], idx) => (
            <View key={idx} style={styles.toolStat}>
              <Text>{mood}</Text>
              <Text style={styles.toolCount}>{count} day{count > 1 ? 's' : ''}</Text>
            </View>
          ))
        )}
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
    backgroundColor: '#764ba2',
    padding: 24,
    borderRadius: 16,
    margin: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  statLabel: {
    color: 'white',
    fontSize: 14,
  },

  rowStats: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  statMini: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statMiniNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  statMiniLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#374151',
    fontWeight: '600',
  },

  moodChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginBottom: 8,
  },
  chartBar: {
    width: 16,
    backgroundColor: '#f5576c',
    borderRadius: 4,
  },
  chartCaption: {
    color: '#4b5563',
    fontSize: 12,
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
    marginBottom: 10,
  },
  toolCount: {
    color: '#f5576c',
    fontWeight: 'bold',
  },
});
