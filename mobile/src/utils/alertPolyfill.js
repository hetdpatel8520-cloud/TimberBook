import { Alert, Platform } from 'react-native';

/**
 * Global Web Polyfill for React Native's Alert.alert
 * In react-native-web, Alert.alert is an empty stub: alert() {}.
 * This polyfill ensures alert dialogs, confirm dialogs, and button onPress callbacks
 * work seamlessly on the web.
 */
export function initAlertPolyfill() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (title, message, buttons) => {
      const fullMessage = title
        ? message
          ? `${title}\n\n${message}`
          : title
        : message || '';

      if (!buttons || buttons.length <= 1) {
        window.alert(fullMessage);
        if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
          buttons[0].onPress();
        }
        return;
      }

      // Multi-button dialog (e.g. Cancel + Confirm/OK or Option 1 / Option 2)
      const cancelBtn = buttons.find((b) => b.style === 'cancel') || buttons[1] || buttons[buttons.length - 1];
      const actionBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];

      const confirmed = window.confirm(fullMessage);
      if (confirmed) {
        if (actionBtn && typeof actionBtn.onPress === 'function') {
          actionBtn.onPress();
        }
      } else {
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        }
      }
    };
  }
}

initAlertPolyfill();
