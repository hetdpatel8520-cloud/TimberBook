import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, AVAILABLE_LANGUAGES } from '../../i18n/LanguageContext';
import CustomInput from '../../components/CustomInput';
import ServerConfigModal from '../../components/ServerConfigModal';

export default function LoginScreen({ navigation }) {
  const { login, loginWithPin } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [showServerModal, setShowServerModal] = useState(false);

  // Mode: 'password' | 'pin'
  const [authMode, setAuthMode] = useState('password');

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validatePassword = () => {
    const errs = {};
    if (!identifier.trim()) errs.identifier = 'Mobile number or email is required';
    if (!password.trim()) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordLogin = async () => {
    if (!validatePassword()) return;
    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('network')) {
        Alert.alert(
          'Network Error',
          'Unable to reach TimberBooks server.\n\n• If on 5G/cellular data, connect your phone to the same Wi-Fi as your computer.\n• Or tap "Server" at the top to change the server IP address.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Configure Server', onPress: () => setShowServerModal(true) }
          ]
        );
      } else {
        Alert.alert('Sign In Failed', err.message || 'Invalid credentials. Please verify your mobile/email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinKeyPress = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const submitPin = async (pinToSubmit) => {
    try {
      setLoading(true);
      await loginWithPin(pinToSubmit, identifier.trim() || undefined);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('network')) {
        Alert.alert(
          'Network Error',
          'Unable to reach TimberBooks server.\n\n• If on 5G/cellular data, connect your phone to the same Wi-Fi as your computer.\n• Or tap "Server" at the top to change the server IP address.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Configure Server', onPress: () => setShowServerModal(true) }
          ]
        );
      } else {
        Alert.alert('PIN Error', err.message || 'Incorrect PIN. Try again or sign in with your password.');
      }
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Utility Bar with Back, Server Config, and Language Switcher */}
        <View style={styles.topUtilityBar}>
          <TouchableOpacity
            style={styles.welcomeNavBtn}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.serverPill}
              onPress={() => setShowServerModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="wifi-outline" size={13} color={colors.goldPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.serverPillText}>Server</Text>
            </TouchableOpacity>

            <View style={styles.languagePillContainer}>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChip,
                    language === lang.code && styles.langChipActive
                  ]}
                  onPress={() => setLanguage(lang.code)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      language === lang.code && styles.langChipTextActive
                    ]}
                  >
                    {lang.native}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Brand Banner */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="cube-outline" size={40} color={colors.goldPrimary} />
          </View>
          <Text style={styles.brandTitle}>TimberBooks</Text>
          <Text style={styles.brandTagline}>Cloud GST Billing & Accounting</Text>
        </View>

        {/* Modern Fintech Login Card */}
        <View style={styles.card}>
          {/* Auth Mode Segmented Control */}
          <View style={styles.modeSwitchContainer}>
            <TouchableOpacity
              style={[styles.modeTab, authMode === 'password' && styles.modeTabActive]}
              onPress={() => setAuthMode('password')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="key-outline"
                size={16}
                color={authMode === 'password' ? colors.navyDark : colors.slateGrey}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, authMode === 'password' && styles.modeTabTextActive]}>
                Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, authMode === 'pin' && styles.modeTabActive]}
              onPress={() => setAuthMode('pin')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={authMode === 'pin' ? colors.navyDark : colors.slateGrey}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, authMode === 'pin' && styles.modeTabTextActive]}>
                Quick PIN
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === 'password' ? (
            /* PASSWORD MODE FORM */
            <View style={styles.formContainer}>
              <CustomInput
                label="Registered Mobile or Email *"
                placeholder="e.g. 9876543210 or owner@company.com"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errors.identifier) setErrors({ ...errors, identifier: null });
                }}
                autoCapitalize="none"
                error={errors.identifier}
                prefix={<Ionicons name="person-outline" size={18} color={colors.slateGrey} />}
              />

              <CustomInput
                label="Password *"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                error={errors.password}
                secureTextEntry
                prefix={<Ionicons name="lock-closed-outline" size={18} color={colors.slateGrey} />}
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot Password / PIN?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInButton}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.navyDark} />
                ) : (
                  <>
                    <Text style={styles.signInText}>Sign In to Company</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.navyDark} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* QUICK PIN PAD MODE */
            <View style={styles.pinContainer}>
              <CustomInput
                label="Mobile or Email (Optional)"
                placeholder="Registered mobile or email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                containerStyle={{ marginBottom: 12 }}
              />

              <Text style={styles.pinSubtitle}>Enter your 4-digit Master Quick PIN</Text>

              {/* 4-Digit Indicator Dots */}
              <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        filled && styles.dotFilled
                      ]}
                    />
                  );
                })}
              </View>

              {/* Numeric PIN Pad Grid */}
              <View style={styles.padGrid}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['clear', '0', 'backspace']
                ].map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.padRow}>
                    {row.map((item) => {
                      if (item === 'clear') {
                        return (
                          <TouchableOpacity
                            key={item}
                            style={styles.padKeySpecial}
                            onPress={() => setPin('')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.padKeySpecialText}>C</Text>
                          </TouchableOpacity>
                        );
                      }
                      if (item === 'backspace') {
                        return (
                          <TouchableOpacity
                            key={item}
                            style={styles.padKeySpecial}
                            onPress={handlePinDelete}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="backspace-outline" size={22} color={colors.navyDark} />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={item}
                          style={styles.padKey}
                          onPress={() => handlePinKeyPress(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.padKeyText}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {loading && (
                <View style={styles.pinLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.goldPrimary} />
                  <Text style={styles.pinLoadingText}>Verifying PIN...</Text>
                </View>
              )}
            </View>
          )}

          {/* Registration link at the bottom of the card */}
          <View style={styles.registerPromptContainer}>
            <Text style={styles.registerPromptText}>Don't have a company account yet?</Text>
            <TouchableOpacity
              style={styles.registerLinkBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerLinkText}>Register Your Company</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.navyPrimary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>Secure Multi-Tenant Cloud Architecture</Text>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 44,
    paddingBottom: Platform.OS === 'android' ? 40 : 25
  },
  topUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.3)'
  },
  serverPillText: {
    fontSize: 11,
    color: colors.goldLight,
    fontWeight: '700'
  },
  welcomeNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  languagePillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 3
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16
  },
  langChipActive: {
    backgroundColor: colors.goldPrimary
  },
  langChipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600'
  },
  langChipTextActive: {
    color: colors.navyDark,
    fontWeight: '700'
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.goldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5
  },
  brandTagline: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8
  },
  modeTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slateGrey
  },
  modeTabTextActive: {
    color: colors.navyDark,
    fontWeight: '700'
  },
  formContainer: {},
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4
  },
  forgotText: {
    fontSize: 12,
    color: colors.navyPrimary,
    fontWeight: '600'
  },
  signInButton: {
    backgroundColor: colors.goldPrimary,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3
  },
  signInText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  pinContainer: {
    alignItems: 'center'
  },
  pinSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8
  },
  dotFilled: {
    backgroundColor: colors.goldPrimary,
    transform: [{ scale: 1.15 }]
  },
  padGrid: {
    width: '100%',
    maxWidth: 280
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  padKey: {
    flex: 1,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  padKeyText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.navyDark
  },
  padKeySpecial: {
    flex: 1,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  padKeySpecialText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slateGrey
  },
  pinLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  pinLoadingText: {
    fontSize: 12,
    color: colors.goldPrimary,
    marginLeft: 8,
    fontWeight: '600'
  },
  registerPromptContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center'
  },
  registerPromptText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6
  },
  registerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted
  }
});
