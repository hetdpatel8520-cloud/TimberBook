import './src/utils/alertPolyfill';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { checkAllUpdates } from './src/services/updateService';
import { initApiUrl } from './src/api/client';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    // Initialize & verify cloud backend API URL
    initApiUrl();

    // Check for updates on startup
    checkAllUpdates({ showNoUpdateAlert: false });

    // Check for updates when user returns to app from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAllUpdates({ showNoUpdateAlert: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="light" backgroundColor={colors.navyDark} />
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
