import Constants from 'expo-constants';

export const FUNCTION_URL: string | undefined =
(Constants.expoConfig?.extra as any)?.functionUrl;

if (!FUNCTION_URL && __DEV__) {
// eslint-disable-next-line no-console
console.warn(
'FUNCTION_URL is not defined. Set EXPO_PUBLIC_FUNCTION_URL for your branch in the Expo dashboard.'
);
}