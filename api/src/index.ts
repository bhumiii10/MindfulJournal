// server.ts (or index.ts)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch, { Response } from 'node-fetch';
import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS if set)
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? process.env.GOOGLE_APPLICATION_CREDENTIALS
    : path.join(__dirname, '../secrets/serviceAccountKey.json');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware: verify Firebase ID token from Authorization: Bearer <token>
async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Missing ID token' });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(401).json({ error: 'Invalid ID token', details: msg });
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /chat
 *
 * Body:
 * {
 *   messages: Array<{ role: 'system'|'user'|'assistant', content: string }>,
 *   model?: string,        // default 'sonar'
 *   temperature?: number,  // default 0.7
 *   stream?: boolean       // default false
 * }
 */
app.post('/chat', requireAuth, async (req, res) => {
  try {
    const {
      messages,
      model = 'sonar',
      temperature = 0.7,
      stream = false,
    }: {
      messages: Array<{ role: string; content: unknown }>;
      model?: string;
      temperature?: number;
      stream?: boolean;
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.PPLX_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing PPLX_API_KEY server env' });
    }

    // 1) Normalize roles/content (avoid empty content; coerce roles)
    const normalized = messages.map((m) => {
      const role: 'system' | 'user' | 'assistant' =
        m.role === 'assistant' || m.role === 'system' ? (m.role as any) : 'user';
      const raw =
        typeof m.content === 'string' ? m.content : String(m.content ?? '');
      const content = raw.trim() || ' ';
      return { role, content };
    });

    // 2) Merge consecutive same-role non-system messages (enforce alternation)
    const folded: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    for (const m of normalized) {
      if (folded.length === 0) {
        folded.push(m);
        continue;
      }
      const prev = folded[folded.length - 1];
      const bothNonSystem = prev.role !== 'system' && m.role !== 'system';
      if (bothNonSystem && prev.role === m.role) {
        const merged = `${prev.content.trim()}\n${m.content.trim()}`.trim() || ' ';
        folded[folded.length - 1] = { role: prev.role, content: merged };
      } else {
        folded.push(m);
      }
    }

    // 3) Ensure first non-system is user (some providers require this)
    const firstNonSystemIdx = folded.findIndex((x) => x.role !== 'system');
    if (firstNonSystemIdx !== -1 && folded[firstNonSystemIdx].role !== 'user') {
      folded.splice(firstNonSystemIdx, 0, {
        role: 'user',
        content:
          'Summarize today’s conversation and return strict JSON with "summary" and "topics".',
      });
    }

    // 4) Log what we will send to Perplexity (roles + first few messages)
    try {
      // eslint-disable-next-line no-console
      console.log('[server:/chat] OUT roles ->', folded.map((m) => m.role).join(' | '));
      // eslint-disable-next-line no-console
      console.log('[server:/chat] OUT first ->', JSON.stringify(folded.slice(0, 6), null, 2));
    } catch {
      // ignore
    }

    // 5) Forward to Perplexity as-is (no extra injection or filtering)
    const resp: Response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: folded,
        temperature,
        stream,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: 'Perplexity error', details: text });
    }

    const data: any = await resp.json();
    // Prefer message.content; fallback to text; coerce to string
    const reply: string =
      (Array.isArray(data?.choices)
        ? (data.choices[0]?.message?.content ?? data.choices?.text)
        : ''
      )?.toString() ?? '';

    return res.json({
      reply,
      usage: data?.usage,
      model: data?.model,
      created: data?.created,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Server error', details: msg });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
