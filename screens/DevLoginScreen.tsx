import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, SafeAreaView } from 'react-native';
import auth from '@react-native-firebase/auth';
import analytics from '@react-native-firebase/analytics';

export default function DevLoginScreen() {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [initializing, setInitializing] = useState(true);
const [user, setUser] = useState<auth.FirebaseAuthTypes.User | null>(null);
useEffect(() => {
const sub = auth().onAuthStateChanged(async (u) => {
setUser(u);
try {
await analytics().setUserId(u?.uid ?? null);
} catch {}
if (initializing) setInitializing(false);
});
return sub;
}, [initializing]);

const signUp = async () => {
try {
await auth().createUserWithEmailAndPassword(email.trim(), password);
await analytics().logEvent('sign_up', { method: 'email' });
Alert.alert('Success', 'Signed up');
} catch (e: any) {
Alert.alert('Sign up error', e?.message ?? String(e));
}
};

const signIn = async () => {
try {
await auth().signInWithEmailAndPassword(email.trim(), password);
await analytics().logEvent('login', { method: 'email' });
Alert.alert('Success', 'Signed in');
} catch (e: any) {
Alert.alert('Sign in error', e?.message ?? String(e));
}
};

const signOut = async () => {
try {
await auth().signOut();
Alert.alert('Signed out');
} catch (e: any) {
Alert.alert('Sign out error', e?.message ?? String(e));
}
};

if (initializing) return null;

return (
<SafeAreaView style={styles.root}>
<Text style={styles.title}>Dev Login</Text>

text
  <View style={styles.panel}>
    <Text style={styles.label}>Status</Text>
    <Text style={styles.value}>
      {user ? `Logged in as: ${user.email ?? user.uid}` : 'Not logged in'}
    </Text>
  </View>

  {!user && (
    <View style={styles.panel}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Min 6 characters"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button title="Sign Up" onPress={signUp} />
        </View>
        <View style={{ width: 12 }} />
        <View style={styles.flex}>
          <Button title="Sign In" onPress={signIn} />
        </View>
      </View>
    </View>
  )}

  {user && (
    <View style={styles.panel}>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  )}
</SafeAreaView>
);
}

const styles = StyleSheet.create({
root: { flex: 1, padding: 16, backgroundColor: '#fff' },
title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
panel: {
backgroundColor: '#f8fafc',
borderRadius: 12,
padding: 16,
marginBottom: 12,
borderWidth: 1,
borderColor: '#e5e7eb',
},
label: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
value: { fontSize: 16, color: '#111827' },
input: {
borderWidth: 1,
borderColor: '#d1d5db',
borderRadius: 8,
paddingHorizontal: 12,
paddingVertical: 10,
marginBottom: 12,
},
row: { flexDirection: 'row' },
flex: { flex: 1 },
});