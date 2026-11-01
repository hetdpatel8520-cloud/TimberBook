import * as Updates from 'expo-updates';
import { Alert, Linking, Platform } from 'react-native';
import { appVersionApi } from '../api/client';

export const CURRENT_VERSION = '1.0.3';
export const CURRENT_VERSION_CODE = 5;

/**
 * Returns static build metadata of current mobile app.
 */
export function getCurrentAppInfo() {
  return {
    version: CURRENT_VERSION,
    versionCode: CURRENT_VERSION_CODE,
    channel: Updates.channel || 'production',
    updateId: Updates.updateId || null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    isUpdatesEnabled: Updates.isEnabled,
  };
}

/**
 * Checks for Over-The-Air (OTA) updates published via EAS Update.
 * Safe against development environments and emulator sessions.
 */
export async function checkOtaUpdate() {
  try {
    if (!Updates.isEnabled) {
      return { isAvailable: false, isDownloaded: false, reason: 'Updates disabled in dev/local mode' };
    }

    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      const fetchResult = await Updates.fetchUpdateAsync();
      return { isAvailable: true, isDownloaded: fetchResult.isNew };
    }
    return { isAvailable: false, isDownloaded: false };
  } catch (err) {
    console.warn('OTA update check notice:', err.message);
    return { isAvailable: false, isDownloaded: false, error: err.message };
  }
}

/**
 * Checks backend endpoint /api/app-version for native APK updates.
 */
export async function checkNativeUpdate() {
  try {
    const res = await appVersionApi.checkVersion({
      version: CURRENT_VERSION,
      versionCode: CURRENT_VERSION_CODE,
    });

    if (res && res.success) {
      const isAvailable = res.latestVersionCode > CURRENT_VERSION_CODE;
      return {
        updateAvailable: isAvailable,
        latestVersion: res.latestVersion,
        latestVersionCode: res.latestVersionCode,
        minSupportedVersion: res.minSupportedVersion,
        mandatory: !!res.mandatory,
        releaseNotes: res.releaseNotes,
        apkUrl: res.apkUrl,
        releaseDate: res.releaseDate,
      };
    }
    return { updateAvailable: false };
  } catch (err) {
    console.warn('Native update check notice:', err.message);
    return { updateAvailable: false, error: err.message };
  }
}

/**
 * Restarts the app to activate a downloaded OTA update immediately.
 */
export async function reloadApp() {
  try {
    await Updates.reloadAsync();
  } catch (err) {
    Alert.alert('Restart App', 'Please close and reopen the app to apply the latest update.');
  }
}

/**
 * User prompt when an OTA update has been downloaded in the background.
 */
export function promptOtaReload() {
  Alert.alert(
    'Update Ready to Apply',
    'A new update with enhancements and fixes has been downloaded in the background. Would you like to restart TimberBooks now?',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Restart Now',
        onPress: () => reloadApp(),
      },
    ]
  );
}

/**
 * User prompt when a newer APK version is available on the server.
 */
export function promptNativeUpdate(info) {
  if (!info || !info.updateAvailable) return;

  const title = info.mandatory ? 'Important Update Required' : `New Version v${info.latestVersion} Available`;
  const message = `${info.releaseNotes || 'A new version of TimberBooks is ready to install.'}\n\nVersion: v${info.latestVersion} (Code ${info.latestVersionCode})`;

  const buttons = [];
  if (!info.mandatory) {
    buttons.push({ text: 'Later', style: 'cancel' });
  }

  buttons.push({
    text: 'Download & Update',
    onPress: () => {
      if (info.apkUrl) {
        Linking.openURL(info.apkUrl);
      } else {
        Alert.alert('Update Info', 'Please download the latest APK from your administrator or deployment portal.');
      }
    },
  });

  Alert.alert(title, message, buttons, { cancelable: !info.mandatory });
}

/**
 * Universal update checker: runs on app launch, resume, or manual "Check for Updates" button click.
 */
export async function checkAllUpdates(options = { showNoUpdateAlert: false }) {
  try {
    // 1. Try OTA Update first
    const otaResult = await checkOtaUpdate();
    if (otaResult.isDownloaded) {
      promptOtaReload();
      return { type: 'ota', status: 'downloaded' };
    }

    // 2. Check Backend Native APK endpoint
    const nativeResult = await checkNativeUpdate();
    if (nativeResult.updateAvailable) {
      promptNativeUpdate(nativeResult);
      return { type: 'native', status: 'available', info: nativeResult };
    }

    if (options.showNoUpdateAlert) {
      Alert.alert(
        'Up to Date!',
        `TimberBooks is running the latest version (v${CURRENT_VERSION} • Code ${CURRENT_VERSION_CODE}). No new updates are needed at this time.`
      );
    }

    return { type: 'none', status: 'latest' };
  } catch (err) {
    if (options.showNoUpdateAlert) {
      Alert.alert('Update Check', `Could not check for updates: ${err.message}`);
    }
    return { type: 'error', error: err.message };
  }
}
