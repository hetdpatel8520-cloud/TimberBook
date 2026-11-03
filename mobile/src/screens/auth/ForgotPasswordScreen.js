import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomInput from '../../components/CustomInput';

function computeMaskedIdentifier(val) {
  if (!val) return 'your registered email/mobile';
  const clean = String(val).trim();
  if (clean.includes('@')) {
    const parts = clean.split('@');
    const user = parts[0];
    const domain = parts[1];
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user[user.length - 1]}@${domain}`;
  }
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `${last10.substring(0, 2)}${'*'.repeat(5)}${last10.slice(-3)}`;
  }
  return clean || 'your registered email/mobile';
}

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { forgotPassword, resetPassword } = useAuth();

  // Stage: 1 (Request OTP) -> 2 (Verify OTP & Set New Password)
  const [stage, setStage] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [targetMasked, setTargetMasked] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer;
    if (stage === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage, resendCooldown]);

  const handleRequestOtp = async () => {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      Alert.alert('Required', 'Please enter your registered mobile number or email.');
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword(cleanId);
      const displayTarget = res?.targetMasked || res?.maskedTarget || computeMaskedIdentifier(cleanId);
      setTargetMasked(displayTarget);
      setResendCooldown(30);
      setOtp('');
      setStage(2);
    } catch (err) {
      console.error('[FORGOT_PASSWORD_REQUEST_ERROR]', err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('matching')) {
        Alert.alert('Account Not Found', 'No account found matching this mobile number or email. Please check or register.');
      } else {
        Alert.alert('Notice', 'Could not send the verification code. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    const cleanId = (identifier || '').trim();
    try {
      setResending(true);
      const res = await forgotPassword(cleanId);
      const displayTarget = res?.targetMasked || res?.maskedTarget || computeMaskedIdentifier(cleanId);
      setTargetMasked(displayTarget);
      setResendCooldown(30);
      Alert.alert('Code Sent', 'A new verification code has been sent to ' + displayTarget);
    } catch (err) {
      console.error('[FORGOT_PASSWORD_RESEND_ERROR]', err);
      Alert.alert('Notice', 'Could not resend the code, please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    if (newPin && (newPin.length < 4 || newPin.length > 6)) {
      Alert.alert('Invalid PIN', 'Quick PIN must be 4 to 6 digits.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword: newPassword ? newPassword.trim() : undefined,
        newPin: newPin ? newPin.trim() : undefined
      });

      Alert.alert(
        'Success',
        res.message || 'Your credentials have been updated successfully.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (err) {
      console.error('[RESET_PASSWORD_ERROR]', err);
      Alert.alert('Reset Failed', err.message || 'Could not reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.3}
        >
          Reset Password / PIN
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={32} color={colors.goldPrimary} />
          </View>

          {stage === 1 ? (
            /* STAGE 1: ENTER CONTACT */
            <View>
              <Text style={styles.cardTitle}>Find Your Account</Text>
              <Text style={styles.cardSubtitle}>
                Enter your registered mobile number or email address. We will send you a 6-digit verification code to reset your password or PIN.
              </Text>

              <CustomInput
                label="Registered Mobile or Email *"
                placeholder="e.g. 9876543210 or owner@company.com"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                prefix={<Ionicons name="person-outline" size={18} color={colors.slateGrey} />}
              />

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.navyDark} />
                ) : (
                  <>
                    <Text style={styles.actionBtnText}>Send Verification Code</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.navyDark} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STAGE 2: ENTER OTP & NEW CREDENTIALS */
            <View>
              <Text style={styles.cardTitle}>Enter OTP & New Password</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to{' '}
                <Text style={{ fontWeight: '700', color: colors.navyDark }}>
                  {targetMasked || computeMaskedIdentifier(identifier)}
                </Text>{' '}
                and create your new login password or Quick PIN.
              </Text>

              <Text style={styles.fieldLabel}>6-DIGIT OTP CODE *</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#B8C0CC"
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />

              {/* Resend Cooldown / Action */}
              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendCountdownText}>
                    Resend code in <Text style={{ fontWeight: '700', color: colors.navyDark }}>{resendCooldown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={resending}>
                    <Text style={styles.resendActionText}>
                      {resending ? 'Sending...' : 'Didn’t receive code? Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <CustomInput
                label="New Password (min 6 chars)"
                placeholder="••••••••"
                placeholderTextColor="#B8C0CC"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                prefix={<Ionicons name="lock-closed-outline" size={18} color={colors.slateGrey} />}
              />

              <CustomInput
                label="Confirm New Password"
                placeholder="••••••••"
                placeholderTextColor="#B8C0CC"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                prefix={<Ionicons name="shield-checkmark-outline" size={18} color={colors.slateGrey} />}
              />

              <CustomInput
                label="New Quick PIN (Optional, 4-6 digits)"
                placeholder="e.g. 1234"
                placeholderTextColor="#B8C0CC"
                value={newPin}
                onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={6}
                prefix={<Ionicons name="keypad-outline" size={18} color={colors.slateGrey} />}
              />

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.navyDark} />
                ) : (
                  <Text style={styles.actionBtnText}>Update Credentials & Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 14, alignItems: 'center' }}
                onPress={() => setStage(1)}
              >
                <Text style={{ color: colors.slateGrey, fontSize: 13 }}>Change Mobile / Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backToLoginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>Remember password? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 12
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyPrimary,
    textAlign: 'center',
    marginBottom: 6
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navyMedium,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  otpInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.navyPrimary,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.navyDark,
    marginBottom: 16,
    backgroundColor: '#F8FAFC'
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  resendCountdownText: {
    fontSize: 13,
    color: colors.slateGrey
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    textDecorationLine: 'underline'
  },
  actionBtn: {
    backgroundColor: colors.goldPrimary,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  backToLoginBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 6
  },
  backToLoginText: {
    fontSize: 13,
    color: colors.navyPrimary,
    fontWeight: '700'
  }
});
