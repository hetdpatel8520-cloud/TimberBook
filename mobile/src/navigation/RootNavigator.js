import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Auth & Setup Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import PinLockScreen from '../screens/auth/PinLockScreen';

// Main Nav
import BottomTabNavigator from './BottomTabNavigator';

// Feature Screens
import BillEntryScreen from '../screens/billing/BillEntryScreen';
import InvoicePreviewScreen from '../screens/billing/InvoicePreviewScreen';
import PurchaseEntryScreen from '../screens/purchase/PurchaseEntryScreen';
import VoucherEntryScreen from '../screens/vouchers/VoucherEntryScreen';

// Report Screens
import AllReportsScreen from '../screens/all_report/AllReportsScreen';
import LedgerReportScreen from '../screens/reports/LedgerReportScreen';
import CashBookScreen from '../screens/reports/CashBookScreen';
import OutstandingScreen from '../screens/reports/OutstandingScreen';
import SalesRegisterScreen from '../screens/reports/SalesRegisterScreen';
import PurchaseRegisterScreen from '../screens/reports/PurchaseRegisterScreen';

// Masters Screens
import LedgerListScreen from '../screens/masters/LedgerListScreen';
import LedgerFormScreen from '../screens/masters/LedgerFormScreen';
import ItemListScreen from '../screens/masters/ItemListScreen';
import ItemFormScreen from '../screens/masters/ItemFormScreen';

// Settings Screens
import SettingsScreen from '../screens/settings/SettingsScreen';
import BackupRestoreScreen from '../screens/settings/BackupRestoreScreen';
import FinancialYearScreen from '../screens/setup/FinancialYearScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isLocked } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navyDark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.goldPrimary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : isLocked ? (
          <Stack.Screen name="PinLock" component={PinLockScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen name="FinancialYear" component={FinancialYearScreen} />
            <Stack.Screen name="BillEntry" component={BillEntryScreen} />
            <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
            <Stack.Screen name="PurchaseEntry" component={PurchaseEntryScreen} />
            <Stack.Screen name="VoucherEntry" component={VoucherEntryScreen} />

            <Stack.Screen name="AllReports" component={AllReportsScreen} />
            <Stack.Screen name="LedgerReport" component={LedgerReportScreen} />
            <Stack.Screen name="CashBook" component={CashBookScreen} />
            <Stack.Screen name="Outstanding" component={OutstandingScreen} />
            <Stack.Screen name="SalesRegister" component={SalesRegisterScreen} />
            <Stack.Screen name="PurchaseRegister" component={PurchaseRegisterScreen} />

            <Stack.Screen name="LedgerList" component={LedgerListScreen} />
            <Stack.Screen name="LedgerForm" component={LedgerFormScreen} />
            <Stack.Screen name="ItemList" component={ItemListScreen} />
            <Stack.Screen name="ItemForm" component={ItemFormScreen} />

            <Stack.Screen name="SettingsTab" component={SettingsScreen} />
            <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
