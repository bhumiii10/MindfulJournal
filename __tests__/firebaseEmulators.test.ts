import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { USE_EMULATORS, connectEmulators } from '../services/firebaseEmulators';

describe('firebaseEmulators', () => {
  it('is on in development (and never in release builds)', () => {
    expect(USE_EMULATORS).toBe(__DEV__ && true);
  });

  it('connects Auth, Firestore and Functions to the local emulators on import', () => {
    expect(auth().useEmulator).toHaveBeenCalledWith('http://localhost:9099');
    expect(firestore().useEmulator).toHaveBeenCalledWith('localhost', 8085);
    expect(functions().useEmulator).toHaveBeenCalledWith('localhost', 5001);
  });

  it('only connects once, even if called again (fast refresh)', () => {
    connectEmulators();
    connectEmulators();
    expect(auth().useEmulator).toHaveBeenCalledTimes(1);
    expect(firestore().useEmulator).toHaveBeenCalledTimes(1);
    expect(functions().useEmulator).toHaveBeenCalledTimes(1);
  });
});
