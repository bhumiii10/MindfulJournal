import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addGoal, toDateISO } from '../services/db';
import { toolsCatalog, skills, filterBySkill, filterByMaxDuration, durationFilters, type Skill, type Tool } from '../data/tools';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ToolsScreen() {
  const nav = useNavigation<any>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<Skill | undefined>();
  const [maxMinFilter, setMaxMinFilter] = useState<number | undefined>();

  const featured = useMemo(() => toolsCatalog.filter(t => t.featured), []);
  const filtered = useMemo(() => {
    let list = toolsCatalog;
    list = filterBySkill(list, skillFilter);
    list = filterByMaxDuration(list, maxMinFilter);
    return list;
  }, [skillFilter, maxMinFilter]);

  const toggleOpen = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(prev => (prev === id ? null : id));
  };

  const handleAddGoal = async (tool: Tool) => {
    const title = tool.goalTitle.trim();
    if (!title) return;
    await addGoal(title, toDateISO());
  };

  const handleOpenJournal = (tool: Tool) => {
    // Go to Journal first (mood), keep toolId so Chat can start guided mode
    nav.navigate('Journal', { journalDate: toDateISO(), toolId: tool.id });
    };

  const ClearFilters = () => (
    <TouchableOpacity onPress={() => { setSkillFilter(undefined); setMaxMinFilter(undefined); }} style={styles.clearBtn}>
      <Text style={styles.clearText}>Clear</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wellness Tools</Text>
        <Text style={styles.headerSub}>Evidence‑aligned exercises you can do now</Text>
      </View>

      {/* Featured quick actions */}
      {featured.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick actions</Text>
          <View style={styles.quickRow}>
            {featured.map((t) => (
              <TouchableOpacity key={t.id} style={styles.quickBtn} onPress={() => handleAddGoal(t)} activeOpacity={0.8}>
                <Text style={styles.quickTitle}>{t.title}</Text>
                <Text style={styles.quickMeta}>{t.durationMin} min • {t.skill}</Text>
                <Text style={styles.quickAction}>Add to today</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filters</Text>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
            {/* Skill chips */}
            <TouchableOpacity
              onPress={() => setSkillFilter(undefined)}
              style={[styles.chip, !skillFilter && styles.chipActive]}
            >
              <Text style={[styles.chipText, !skillFilter && styles.chipTextActive]}>All skills</Text>
            </TouchableOpacity>
            {skills.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSkillFilter(prev => (prev === s ? undefined : s))}
                style={[styles.chip, skillFilter === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, skillFilter === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
            {/* Duration chips */}
            <TouchableOpacity
              onPress={() => setMaxMinFilter(undefined)}
              style={[styles.chip, !maxMinFilter && styles.chipActive]}
            >
              <Text style={[styles.chipText, !maxMinFilter && styles.chipTextActive]}>Any length</Text>
            </TouchableOpacity>
            {durationFilters.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMaxMinFilter(prev => (prev === m ? undefined : m))}
                style={[styles.chip, maxMinFilter === m && styles.chipActive]}
              >
                <Text style={[styles.chipText, maxMinFilter === m && styles.chipTextActive]}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {(skillFilter || maxMinFilter) ? <ClearFilters /> : null}
      </View>

      {/* Catalog */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exercises</Text>
        {filtered.map((t) => {
          const open = openId === t.id;
          return (
            <View key={t.id} style={styles.toolItem}>
              <TouchableOpacity onPress={() => toggleOpen(t.id)} activeOpacity={0.8} style={styles.toolHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>{t.title}</Text>
                  <Text style={styles.toolMeta}>{t.durationMin} min • {t.skill}</Text>
                </View>
                <Text style={styles.disclosure}>{open ? '−' : '+'}</Text>
              </TouchableOpacity>

              {open && (
                <View style={styles.toolBody}>
                  <Text style={styles.scienceNote}>{t.scienceNote}</Text>
                  <View style={styles.stepList}>
                    {t.steps.map((s, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <Text style={styles.stepBullet}>{idx + 1}.</Text>
                        <Text style={styles.stepText}>{s}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.toolActions}>
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAddGoal(t)} activeOpacity={0.85}>
                      <Text style={styles.addBtnText}>Add “{t.goalTitle}” to today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondary}
                      onPress={() => handleOpenJournal(t)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.secondaryText}>Open Journal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
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
  headerTitle: { fontSize: 24, fontWeight: '600', color: 'white', marginBottom: 8 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, marginBottom: 10, color: '#374151', fontWeight: '600' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    flexBasis: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  quickTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  quickMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  quickAction: { fontSize: 12, color: '#f5576c', marginTop: 8, fontWeight: '700' },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#f5576c', borderColor: '#f5576c' },
  chipText: { color: '#374151', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  clearBtn: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4 },
  clearText: { color: '#6b7280', fontSize: 12, textDecorationLine: 'underline' },

  toolItem: { borderBottomColor: '#e5e7eb', borderBottomWidth: 1, paddingVertical: 8 },
  toolHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toolMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  disclosure: { fontSize: 22, color: '#6b7280', paddingHorizontal: 8 },

  toolBody: { paddingTop: 8 },
  scienceNote: { fontSize: 12, color: '#4b5563', marginBottom: 8 },
  stepList: { marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  stepBullet: { width: 18, color: '#6b7280', marginTop: 1 },
  stepText: { flex: 1, color: '#374151' },

  toolActions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10, flexWrap: 'wrap' },
  addBtn: { backgroundColor: '#f5576c', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondary: { borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  secondaryText: { color: '#374151', fontWeight: '600', fontSize: 13 },
});


