import React, { useState } from 'react';
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
import CustomInput from '../../components/CustomInput';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword, resetPassword } = useAuth();

  // Stage: 1 (Request OTP) -> 2 (Verify OTP & Set New Password)
  const [stage, setStage] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Please enter your registered mobile number or email.');
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword(identifier.trim());
      setDevOtpHint(res.devOtp || '123456');
      Alert.alert('OTP Sent', `A 6-digit password reset code has been sent to ${identifier.trim()}`);
      setStage(2);
    } catch (err) {
      Alert.alert('Request Failed', err.message || 'Account not found matching this contact.');
    } finally {
      setLoading(false);
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
      Alert.alert('Reset Failed', err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password / PIN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                Enter the 6-digit code sent to {identifier} and create your new login password or Quick PIN.
              </Text>

              {devOtpHint ? (
                <View style={styles.devOtpBadge}>
                  <Text style={styles.devOtpText}>Verification Code: {devOtpHint}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>6-DIGIT OTP CODE *</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />

              <CustomInput
                label="New Password (min 6 chars)"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                prefix={<Ionicons name="lock-closed-outline" size={18} color={colors.slateGrey} />}
              />

              <CustomInput
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                prefix={<Ionicons name="shield-checkmark-outline" size={18} color={colors.slateGrey} />}
              />

              <CustomInput
                label="New Quick PIN (Optional, 4-6 digits)"
                placeholder="e.g. 1234"
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
  devOtpBadge: {
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    alignSelf: 'center'
  },
  devOtpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E'
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
