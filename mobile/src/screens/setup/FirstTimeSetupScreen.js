import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import CustomInput from '../../components/CustomInput';

export default function FirstTimeSetupScreen() {
  const { initializeCompany, loginDemoCompany, setSetupNeeded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: 'Bhavani Timbers',
    address: '48, Saw Mill Road, Industrial Estate',
    city: 'Pollachi',
    pincode: '642001',
    state: 'Tamil Nadu',
    stateCode: '33',
    gstin: '33AAAAA1234A1Z5',
    phone: '9842109876',
    email: 'info@bhavanitimbers.com',
    bankName: 'State Bank of India',
    accountNo: '30129845789',
    ifsc: 'SBIN0001234',
    branch: 'Pollachi Main Branch',
    username: 'owner',
    password: 'bhavani123',
    pin: '1234'
  });
  const [errors, setErrors] = useState({});

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.gstin.trim()) errs.gstin = 'GSTIN is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (!form.username.trim()) errs.username = 'Owner username is required';
    if (!form.password.trim() || form.password.length < 4) errs.password = 'Password must be at least 4 characters';
    if (!form.pin || form.pin.length !== 4) errs.pin = 'PIN must be exactly 4 digits';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    try {
      setLoading(true);
      await initializeCompany(form);
      Alert.alert('Setup Complete', `Welcome to TimberBooks! ${form.companyName} has been initialized.`);
    } catch (err) {
      Alert.alert('Setup Failed', err.message || 'Could not complete company setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDemo = async () => {
    try {
      setLoading(true);
      await loginDemoCompany();
    } catch (err) {
      Alert.alert('Demo Error', err.message || 'Could not load Bhavani Timbers demo.');
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
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={24} color={colors.goldPrimary} />
        </View>
        <Text style={styles.headerTitle}>First-Time Setup</Text>
        <Text style={styles.headerSubtitle}>Set up your company profile and owner credentials</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Instant Bhavani Timbers Demo Hero Banner */}
        <View style={styles.demoHeroCard}>
          <View style={styles.demoHeroHeader}>
            <View style={styles.demoHeroBadge}>
              <Ionicons name="flash" size={14} color={colors.navyDark} />
              <Text style={styles.demoHeroBadgeText}>PRE-LOADED DEMO</Text>
            </View>
            <Text style={styles.demoHeroTitle}>Bhavani Timbers Demo Company</Text>
            <Text style={styles.demoHeroDesc}>
              Skip manual registration! Launch the pre-configured Bhavani Timbers demo with complete sample items, invoices, and ledgers in 1 click.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.demoLaunchBtn}
            onPress={handleLaunchDemo}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={colors.navyDark} />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color={colors.navyDark} style={{ marginRight: 8 }} />
                <Text style={styles.demoLaunchBtnText}>⚡ Open Bhavani Timbers Demo (1-Click)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipToLoginBtn}
            onPress={() => setSetupNeeded(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.skipToLoginText}>Already have credentials? Go to Login Screen</Text>
          </TouchableOpacity>
        </View>

        {/* Company Profile Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="business-outline" size={16} color={colors.navyPrimary} /> Or Custom Company Details
          </Text>

          <CustomInput
            label="Company Name *"
            value={form.companyName}
            onChangeText={(v) => update('companyName', v)}
            error={errors.companyName}
          />

          <CustomInput
            label="Address *"
            value={form.address}
            onChangeText={(v) => update('address', v)}
            error={errors.address}
          />

          <View style={styles.row}>
            <CustomInput
              label="City *"
              value={form.city}
              onChangeText={(v) => update('city', v)}
              error={errors.city}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="Pincode"
              value={form.pincode}
              onChangeText={(v) => update('pincode', v)}
              keyboardType="numeric"
              containerStyle={{ width: 110 }}
            />
          </View>

          <View style={styles.row}>
            <CustomInput
              label="State *"
              value={form.state}
              onChangeText={(v) => update('state', v)}
              error={errors.state}
              containerStyle={{ flex: 2, marginRight: 8 }}
            />
            <CustomInput
              label="State Code"
              value={form.stateCode}
              onChangeText={(v) => update('stateCode', v)}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <CustomInput
            label="GSTIN *"
            value={form.gstin}
            onChangeText={(v) => update('gstin', v.toUpperCase())}
            error={errors.gstin}
            autoCapitalize="characters"
          />

          <View style={styles.row}>
            <CustomInput
              label="Phone *"
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
              error={errors.phone}
              keyboardType="phone-pad"
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="Email"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Bank Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="card-outline" size={16} color={colors.navyPrimary} /> Bank Account
          </Text>

          <CustomInput
            label="Bank Name"
            value={form.bankName}
            onChangeText={(v) => update('bankName', v)}
          />

          <CustomInput
            label="Account Number"
            value={form.accountNo}
            onChangeText={(v) => update('accountNo', v)}
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <CustomInput
              label="IFSC Code"
              value={form.ifsc}
              onChangeText={(v) => update('ifsc', v.toUpperCase())}
              autoCapitalize="characters"
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="Branch"
              value={form.branch}
              onChangeText={(v) => update('branch', v)}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Owner Credentials Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="key-outline" size={16} color={colors.navyPrimary} /> Owner Credentials
          </Text>

          <CustomInput
            label="Master Username *"
            value={form.username}
            onChangeText={(v) => update('username', v)}
            error={errors.username}
          />

          <CustomInput
            label="Master Password *"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            error={errors.password}
            secureTextEntry
          />

          <CustomInput
            label="Quick 4-Digit Unlock PIN *"
            value={form.pin}
            onChangeText={(v) => update('pin', v)}
            error={errors.pin}
            keyboardType="numeric"
            suffix="4 DIGITS"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.btnDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.saveBtnText}>Save & Launch TimberBooks</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.goldPrimary} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  topHeader: {
    backgroundColor: colors.navyPrimary,
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  sectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14
  },
  row: {
    flexDirection: 'row'
  },
  saveBtn: {
    backgroundColor: colors.navyPrimary,
    minHeight: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.goldDark,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white
  },
  demoHeroCard: {
    backgroundColor: colors.navyDark,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.goldPrimary,
    shadowColor: colors.goldDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  demoHeroHeader: {
    marginBottom: 14
  },
  demoHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldPrimary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8
  },
  demoHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navyDark,
    marginLeft: 4,
    letterSpacing: 0.5
  },
  demoHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4
  },
  demoHeroDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18
  },
  demoLaunchBtn: {
    backgroundColor: colors.goldPrimary,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3
  },
  demoLaunchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  skipToLoginBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6
  },
  skipToLoginText: {
    fontSize: 13,
    color: colors.goldLight,
    textDecorationLine: 'underline',
    fontWeight: '600'
  }
});
