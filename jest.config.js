module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // functions/ and api/ are separate Node projects with their own tests and dependencies.
  testPathIgnorePatterns: ['/node_modules/', '/functions/', '/api/'],
  // These packages ship untranspiled ES modules, so Jest has to compile them too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-calendars|react-native-swipe-gestures|recyclerlistview)/)',
  ],
};
