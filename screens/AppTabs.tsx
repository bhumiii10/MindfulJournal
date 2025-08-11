import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from './HomeScreen';
import JournalScreen from './JournalScreen';
import ChatScreen from './ChatScreen';
import InsightsScreen from './InsightsScreen';
import ToolsScreen from './ToolsScreen';
import ProfileScreen from './ProfileScreen';

function TabBarIcon({ emoji }: { emoji: string }) {
return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

const Tab = createBottomTabNavigator();

export default function AppTabs() {
return (
<Tab.Navigator
initialRouteName="Home"
screenOptions={{
tabBarActiveTintColor: '#f5576c',
tabBarInactiveTintColor: '#6b7280',
headerShown: false,
}}
>
<Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="🏠" /> }} />
<Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="📝" /> }} />
<Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="💬" /> }} />
<Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="📊" /> }} />
<Tab.Screen name="Tools" component={ToolsScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="🛠️" /> }} />
<Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: () => <TabBarIcon emoji="👤" /> }} />
</Tab.Navigator>
);
}