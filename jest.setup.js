/* eslint-env jest */
// Stand-ins for the native Firebase modules, which cannot load under Jest.
// Each exposes just enough surface for the code under test.

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/auth', () => {
  const instance = {
    currentUser: null,
    useEmulator: jest.fn(),
    onAuthStateChanged: jest.fn((cb) => {
      cb(null);
      return () => {};
    }),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => instance),
    getAuth: jest.fn(() => instance),
    onAuthStateChanged: jest.fn((_auth, cb) => {
      cb(null);
      return () => {};
    }),
    signOut: jest.fn(),
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const instance = {
    useEmulator: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    batch: jest.fn(),
  };
  const firestore = jest.fn(() => instance);
  firestore.FieldValue = { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') };
  return { __esModule: true, default: firestore };
});

jest.mock('@react-native-firebase/functions', () => {
  const instance = {
    useEmulator: jest.fn(),
    httpsCallable: jest.fn(() => jest.fn()),
  };
  return { __esModule: true, default: jest.fn(() => instance) };
});

jest.mock('@react-native-firebase/analytics', () => {
  const instance = {
    logEvent: jest.fn().mockResolvedValue(undefined),
    setUserId: jest.fn().mockResolvedValue(undefined),
  };
  return { __esModule: true, default: jest.fn(() => instance) };
});
