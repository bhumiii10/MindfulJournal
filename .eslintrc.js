module.exports = {
  root: true,
  extends: '@react-native',
  // functions/ and api/ are separate Node projects; functions/ has its own strict type-check.
  ignorePatterns: ['functions/', 'api/', 'ios/', 'android/'],
};
