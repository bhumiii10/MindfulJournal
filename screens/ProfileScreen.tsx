import React from 'react';
import { View, Button, Alert } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getAuth, signOut } from '@react-native-firebase/auth';

export default function ProfileScreen() {
const handleSignOut = async () => {
try {
const app = getApp();
const auth = getAuth(app);
await signOut(auth);
// No manual navigation needed — your App.tsx auth gate will switch to login.
} catch (e: any) {
Alert.alert('Sign out error', e?.message ?? String(e));
}
};

return (
<View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
<Button title="Sign Out" onPress={handleSignOut} />
</View>
);
}
