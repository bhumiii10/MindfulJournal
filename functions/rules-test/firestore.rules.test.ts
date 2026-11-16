// Run with the Firestore emulator:  npm run test:rules
import { readFileSync } from 'fs';
import path from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';

// Denied requests are expected here; don't spam the output with the SDK's warnings.
setLogLevel('error');

let env: RulesTestEnvironment;

beforeAll(async () => {
  const hostPort = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8085').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: hostPort[0],
      port: Number(hostPort[1]),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('own data', () => {
  it.each([
    'users/alice/conversations/c1',
    'users/alice/conversations/c1/messages/m1',
    'users/alice/conversations/c1/suggestions/s1',
    'users/alice/goals/g1',
    'users/alice/summaries/2026-01-01',
  ])('lets a user read and write %s', async (p) => {
    await assertSucceeds(setDoc(doc(alice(), p), { x: 1 }));
    await assertSucceeds(getDoc(doc(alice(), p)));
  });
});

describe("other people's data", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/conversations/c1'), { title: 'private' });
      await setDoc(doc(ctx.firestore(), 'users/alice/goals/g1'), { title: 'private' });
    });
  });

  it('blocks reads', async () => {
    await assertFails(getDoc(doc(bob(), 'users/alice/conversations/c1')));
    await assertFails(getDoc(doc(bob(), 'users/alice/goals/g1')));
  });

  it('blocks writes', async () => {
    await assertFails(setDoc(doc(bob(), 'users/alice/goals/g2'), { title: 'x' }));
    await assertFails(setDoc(doc(bob(), 'users/alice/conversations/c1'), { title: 'hacked' }));
  });
});

describe('signed-out users', () => {
  it('cannot read or write anything', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice/goals/g1')));
    await assertFails(setDoc(doc(anon(), 'users/alice/goals/g1'), { title: 'x' }));
  });
});

describe('server-only collections (used by the chat function)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/aiRequests/req-00000001'), { status: 'done' });
      await setDoc(doc(ctx.firestore(), 'users/alice/rateLimits/chat'), { count: 1 });
    });
  });

  it('denies the owner from reading them', async () => {
    await assertFails(getDoc(doc(alice(), 'users/alice/aiRequests/req-00000001')));
    await assertFails(getDoc(doc(alice(), 'users/alice/rateLimits/chat')));
  });

  it('denies the owner from writing them (so users cannot reset their own rate limit)', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/rateLimits/chat'), { count: 0 }));
    await assertFails(setDoc(doc(alice(), 'users/alice/aiRequests/req-00000002'), { status: 'done' }));
  });
});

describe('everything else', () => {
  it('denies the user document itself and unknown collections', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice'), { admin: true }));
    await assertFails(setDoc(doc(alice(), 'users/alice/secrets/s1'), { x: 1 }));
    await assertFails(setDoc(doc(alice(), 'config/app'), { x: 1 }));
  });
});
