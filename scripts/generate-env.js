const fs = require('fs');
const path = require('path');

// Read from environment injected by EAS (or local shell)
// Only include variables the app actually uses:
const API_BASE_URL = process.env.API_BASE_URL || '';
const PPLX_API_KEY = process.env.PPLX_API_KEY || '';

// Compose .env content (react-native-config reads this at native build time)
const lines = [
API_BASE_URL=${API_BASE_URL},
PPLX_API_KEY=${PPLX_API_KEY},
];

// Write .env at repo root (do NOT commit this file)
const outPath = path.join(process.cwd(), '.env');
fs.writeFileSync(outPath, lines.join('\n') + '\n', { encoding: 'utf8' });

console.log('[generate-env] Wrote .env with variables:',
lines.map(l => l.split('=')).join(', ')
);
