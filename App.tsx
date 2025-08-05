import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import JournalScreen from './screens/JournalScreen';
import ChatScreen from './screens/ChatScreen'; 
import InsightsScreen from './screens/InsightsScreen';
import ToolsScreen from './screens/ToolsScreen';
import ProfileScreen from './screens/ProfileScreen';
import { Text } from 'react-native';

function TabBarIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          tabBarActiveTintColor: '#f5576c',
          tabBarInactiveTintColor: '#6b7280',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: () => <TabBarIcon emoji="🏠" />,
          }}
        />
        <Tab.Screen
          name="Journal"
          component={JournalScreen}
          options={{
            tabBarLabel: 'Journal',
            tabBarIcon: () => <TabBarIcon emoji="📝" />,
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            tabBarLabel: "Let's Talk",
            tabBarIcon: () => <TabBarIcon emoji="💬" />,
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarLabel: 'Insights',
            tabBarIcon: () => <TabBarIcon emoji="📊" />,
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            tabBarLabel: 'Tools',
            tabBarIcon: () => <TabBarIcon emoji="🛠️" />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: () => <TabBarIcon emoji="👤" />,
          }}
        />
        
      </Tab.Navigator>
    </NavigationContainer>
  );
}

