// src/data/tools.ts

export type Skill =
  | 'Emotional Regulation'
  | 'Coping Skills'
  | 'Goal Setting'
  | 'Strengths'
  | 'Flexible Thinking'
  | 'Problem Solving'
  | 'Self-Acceptance'
  | 'Optimistic Thinking';

export type Tool = {
  id: string;
  skill: Skill;
  title: string;
  durationMin: number; // 2–10 preferred
  summary: string;     // one-liner
  scienceNote: string; // short evidence note
  steps: string[];     // 3–6 concise steps
  goalTitle: string;   // micro-goal shortcut
  tags?: string[];     // e.g., ["solo","social","no-phone"]
  featured?: boolean;  // for quick actions
};

// Curated, evidence-aligned exercises (kept short, actionable)
export const toolsCatalog: Tool[] = [
  {
    id: 'emo-reg-breath-5',
    skill: 'Emotional Regulation',
    title: '5-minute paced breathing',
    durationMin: 5,
    summary: 'Slow, paced breathing to downshift arousal.',
    scienceNote:
      'Slow breathing (e.g., 4–6 breaths/min) can reduce sympathetic activity and perceived stress in minutes.',
    steps: [
      'Sit upright, relax shoulders.',
      'Inhale through nose 4s, hold 2s.',
      'Exhale through mouth 6s (soft lips).',
      'Repeat 10 rounds at a comfortable pace.',
      'Notice one thing that feels 1% calmer.',
    ],
    goalTitle: '5-minute breathing',
    tags: ['solo', 'no-phone'],
    featured: true,
  },
  {
    id: 'emo-reg-ground-3',
    skill: 'Emotional Regulation',
    title: '3-minute 5‑4‑3‑2‑1 grounding',
    durationMin: 3,
    summary: 'Orient attention to the present with senses.',
    scienceNote:
      'Brief grounding interrupts spirals by anchoring attention to sensory input.',
    steps: [
      'Name 5 things you see.',
      'Name 4 things you feel (touch).',
      'Name 3 things you hear.',
      'Name 2 things you smell.',
      'Name 1 thing you taste or appreciate.',
    ],
    goalTitle: '3-minute grounding',
    tags: ['solo'],
    featured: true,
  },
  {
    id: 'coping-walk-10',
    skill: 'Coping Skills',
    title: '10-minute mindful walk',
    durationMin: 10,
    summary: 'Gentle movement to discharge stress.',
    scienceNote:
      'Light physical activity improves affect and executive control; brief bouts help immediately.',
    steps: [
      'Walk at a comfortable pace.',
      'Match steps to your breath naturally.',
      'Notice 3 colors and 3 sounds.',
      'At the end, rate stress 0–10 before/after.',
    ],
    goalTitle: '10-minute walk',
    tags: ['solo', 'outdoors'],
    featured: true,
  },
  {
    id: 'goal-smart-7',
    skill: 'Goal Setting',
    title: 'SMART micro-goal setup',
    durationMin: 7,
    summary: 'Turn a vague wish into a tiny, trackable step.',
    scienceNote:
      'Specific, proximal goals with clear criteria increase follow‑through and self‑efficacy.',
    steps: [
      'Write 1 thing you want this week.',
      'Make it Specific and small (≤15 min).',
      'Define Measurable success (e.g., done/not).',
      'Check Achievable with today’s energy.',
      'Confirm Relevant to values now.',
      'Set Time-bound: when exactly today?',
    ],
    goalTitle: 'Define 1 SMART micro-goal',
    tags: ['solo', 'paper'],
  },
  {
    id: 'strengths-savor-5',
    skill: 'Strengths',
    title: 'Strengths in action (savoring)',
    durationMin: 5,
    summary: 'Spot and use one strength today.',
    scienceNote:
      'Using character strengths deliberately correlates with engagement and well‑being.',
    steps: [
      'Pick 1 strength you’ve used before (e.g., kindness, curiosity).',
      'Name 1 situation today to use it.',
      'Do a tiny action (≤5 min) using that strength.',
      'Note how it felt afterward.',
    ],
    goalTitle: 'Use 1 strength today',
    tags: ['solo', 'social'],
  },
  {
    id: 'flexible-reframe-5',
    skill: 'Flexible Thinking',
    title: 'Reframe with “What else is true?”',
    durationMin: 5,
    summary: 'Broaden perspective to loosen all‑or‑nothing thoughts.',
    scienceNote:
      'Cognitive reappraisal reduces negative affect and improves problem orientation.',
    steps: [
      'Write the sticky thought verbatim.',
      'Ask: “What else is true right now?” List 3 items.',
      'Pick a balanced alternative thought.',
      'Choose 1 small action consistent with it.',
    ],
    goalTitle: 'Reframe 1 thought',
    tags: ['solo', 'paper'],
  },
  {
    id: 'problem-solve-7',
    skill: 'Problem Solving',
    title: 'Stepwise problem solve',
    durationMin: 7,
    summary: 'Define → options → pick → next step.',
    scienceNote:
      'Structured problem solving reduces avoidance and increases perceived control.',
    steps: [
      'Define the problem in one sentence.',
      'List 3 options (even imperfect).',
      'Pick the “good enough” one.',
      'Break into the next 10‑minute step.',
      'Schedule it today.',
    ],
    goalTitle: 'Do 1 ten‑minute step',
    tags: ['solo'],
  },
  {
    id: 'self-accept-noting-4',
    skill: 'Self-Acceptance',
    title: 'Noting + kind phrase',
    durationMin: 4,
    summary: 'Notice, name, and respond kindly.',
    scienceNote:
      'Mindful acceptance reduces struggle; self‑compassion improves persistence under stress.',
    steps: [
      'Notice a difficult feeling; label it (“anxiety here”).',
      'Place a hand on chest or cheek.',
      'Say: “This is hard. May I be kind to myself.”',
      'Breathe out slowly once.',
    ],
    goalTitle: '2-minute self‑kindness',
    tags: ['solo'],
  },
  {
    id: 'optimistic-grat-3',
    skill: 'Optimistic Thinking',
    title: '3 good things (today)',
    durationMin: 3,
    summary: 'Shift attention to small positives.',
    scienceNote:
      'Brief gratitude practices can increase positive affect and buffer stress.',
    steps: [
      'List 3 things that went okay or better.',
      'Write 1 reason each happened.',
      'Savor one breath for each item.',
    ],
    goalTitle: 'List 3 gratitudes',
    tags: ['solo', 'paper'],
  },
  {
    id: 'sfbp-scaling-4',
    skill: 'Goal Setting',
    title: 'SFBT scaling step',
    durationMin: 4,
    summary: 'Rate 0–10 and move up by 1 point.',
    scienceNote:
      'Solution‑focused scaling clarifies progress and elicits next actions.',
    steps: [
      'Pick an area (e.g., motivation).',
      'Rate now 0–10 (10 = preferred future).',
      'Ask: “What makes it as high as it is?”',
      'Ask: “What’s 1 tiny sign of +1 point?”',
      'Do that tiny sign today.',
    ],
    goalTitle: 'Do a +1 sign',
    tags: ['solo'],
  },
  {
    id: 'socratic-ans-5',
    skill: 'Flexible Thinking',
    title: 'Socratic loop for anxiety',
    durationMin: 5,
    summary: 'Question assumptions; test a kinder view.',
    scienceNote:
      'Guided questioning reduces cognitive distortions and avoidance.',
    steps: [
      'Write the worry in one sentence.',
      'Clarify: “What do I mean by…?”',
      'Probe: “What if I didn’t avoid it?”',
      'Perspective: “What would I tell a friend?”',
      'Plan 1 small test I can run today.',
    ],
    goalTitle: 'Run 1 small test',
    tags: ['solo', 'paper'],
  },
  {
    id: 'coping-inventory-8',
    skill: 'Coping Skills',
    title: 'Coping strategy inventory',
    durationMin: 8,
    summary: 'List stressors, current coping, and 1 upgrade.',
    scienceNote:
      'Coping audits help replace avoidance with approach strategies.',
    steps: [
      'List 2 current stressors.',
      'Write your go‑to responses for each.',
      'Mark one unhelpful pattern.',
      'Pick 1 alternative strategy to try next time.',
    ],
    goalTitle: 'Choose 1 coping upgrade',
    tags: ['solo', 'paper'],
  },
];

export const skills: Skill[] = [
  'Emotional Regulation',
  'Coping Skills',
  'Goal Setting',
  'Strengths',
  'Flexible Thinking',
  'Problem Solving',
  'Self-Acceptance',
  'Optimistic Thinking',
];

export const durationFilters = [3, 5, 7, 10] as const;

export function filterBySkill(list: Tool[], skill?: Skill) {
  if (!skill) return list;
  return list.filter((t) => t.skill === skill);
}

export function filterByMaxDuration(list: Tool[], maxMin?: number) {
  if (!maxMin) return list;
  return list.filter((t) => t.durationMin <= maxMin);
}
