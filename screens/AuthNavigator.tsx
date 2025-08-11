import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DevLoginScreen from './DevLoginScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
return (
<Stack.Navigator screenOptions={{ headerShown: false }}>
<Stack.Screen name="DevLogin" component={DevLoginScreen} />
</Stack.Navigator>
);
}