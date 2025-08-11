import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import AuthNavigator from './screens/AuthNavigator'; // stack with DevLogin
import AppTabs from './screens/AppTabs'; // your real tabs

export default function App() {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [initializing, setInitializing] = useState(true);
    
    useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, u => {
    setUser(u);
    if (initializing) setInitializing(false);
    });
    return unsub;
    }, [initializing]);
    
    if (initializing) {
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator />
    </View>
    );
    }
    
    return (
    <NavigationContainer>
    {user ? <AppTabs /> : <AuthNavigator />}
    </NavigationContainer>
    );
    }