import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import React from 'react'
import { COLORS } from '@/constants/theme'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

export default function TabLayout() {
  return (
    <Tabs
        screenOptions={{ 
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.gray
        }}
    >
        <Tabs.Screen name="home"
        options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home-filled" color={color} size={size} />
            ),
        }}
        />
        <Tabs.Screen name="train"
        options={{
            tabBarLabel: 'Train',
            tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="arm-flex" color={color} size={size} />
            ),
        }}
        />
        <Tabs.Screen name="stats"
        options={{
            tabBarLabel: 'Stats',
            tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="bar-chart" color={color} size={size} />
            ),
        }}
        />
        <Tabs.Screen name="profile"
        options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="person" color={color} size={size} />
            ),
        }}
        />
    </Tabs>
  )
};