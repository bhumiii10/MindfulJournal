// services/firebaseEmulators.ts
// In development builds, point Auth, Firestore and Functions at the local Firebase emulators
// (`firebase emulators:start`, then `npm --prefix functions run seed` for demo data).
//
// Set USE_EMULATORS to false to develop against the real Firebase project instead.
// Release builds never use the emulators.
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';

export const USE_EMULATORS = __DEV__ && true;

// The Android emulator reaches the host machine at 10.0.2.2; the iOS simulator shares localhost.
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

let connected = false;

export function connectEmulators(): void {
  if (!USE_EMULATORS || connected) return;
  connected = true;
  try {
    auth().useEmulator(`http://${HOST}:9099`);
    firestore().useEmulator(HOST, 8085);
    functions().useEmulator(HOST, 5001);
    // eslint-disable-next-line no-console
    console.log(`[emulators] Auth, Firestore and Functions -> ${HOST}`);
  } catch (e) {
    // useEmulator throws if it runs after the service was already used (e.g. fast refresh).
    // eslint-disable-next-line no-console
    console.warn('[emulators] could not connect:', e);
  }
}

connectEmulators();
