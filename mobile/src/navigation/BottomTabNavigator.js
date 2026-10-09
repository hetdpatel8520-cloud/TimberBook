import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import DashboardScreen from '../screens/home/DashboardScreen';
import BillEntryScreen from '../screens/billing/BillEntryScreen';
import AllReportsScreen from '../screens/all_report/AllReportsScreen';
import LedgerListScreen from '../screens/masters/LedgerListScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.goldPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="EntryTab"
        component={BillEntryScreen}
        options={{
          tabBarLabel: 'New Bill',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="ReportsTab"
        component={AllReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="MastersTab"
        component={LedgerListScreen}
        options={{
          tabBarLabel: 'Masters',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.navyDark,
    borderTopWidth: 1,
    borderTopColor: colors.navyPrimary,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600'
  }
});
