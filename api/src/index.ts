import 'dotenv/config';
import express = require('express');
import cors = require('cors');
import fetch, { Response } from 'node-fetch';
import admin = require('firebase-admin');
import path = require('path');

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS if set)
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.join(__dirname, '../secrets/serviceAccountKey.json');

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id, // makes project explicit
});
}

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware: verify Firebase ID token from Authorization: Bearer <token>
async function requireAuth(
req: express.Request,
res: express.Response,
next: express.NextFunction
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
} catch (e: any) {
return res
.status(401)
.json({ error: 'Invalid ID token', details: e?.message ?? String(e) });
}
}

// Health check
app.get('/health', (_req, res) => {
res.json({ ok: true });
});

/**

POST /chat

Body: {

messages: Array<{ role: 'system'|'user'|'assistant', content: string }>,

model?: string, // e.g. 'sonar', 'sonar-small-chat'

temperature?: number, // default 0.7

stream?: boolean // keep false for now

}
*/
app.post('/chat', requireAuth, async (req, res) => {
try {
const {
messages,
model = 'sonar',
temperature = 0.7,
stream = false,
} = req.body || {};

if (!Array.isArray(messages) || messages.length === 0) {
return res.status(400).json({ error: 'messages array required' });
}

const apiKey = process.env.PPLX_API_KEY;
if (!apiKey) {
return res.status(500).json({ error: 'Missing PPLX_API_KEY server env' });
}

const resp: Response = await fetch('https://api.perplexity.ai/chat/completions', {
method: 'POST',
headers: {
Authorization: `Bearer ${apiKey}`,
'Content-Type': 'application/json',
},
body: JSON.stringify({
model,
messages,
temperature,
stream, // not streaming in this MVP
}),
});

if (!resp.ok) {
const text = await resp.text();
return res.status(resp.status).json({ error: 'Perplexity error', details: text });
}

const data: any = await resp.json();
// OpenAI-compatible: choices.message.content
const reply =
  data?.choices?.[0]?.message?.content ??
  data?.choices?.[0]?.text ??
  '';


return res.json({
reply,
usage: data?.usage,
model: data?.model,
created: data?.created,
});
} catch (e: any) {
return res
.status(500)
.json({ error: 'Server error', details: e?.message ?? String(e) });
}
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
console.log(`API listening on http://localhost:${PORT}`);
});