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
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import CustomInput from '../../components/CustomInput';
import { INDIAN_STATES, getStateCodeByName, isValidGstin, isValidPan } from '../../utils/indianStates';

const BUSINESS_TYPES = ['Timber Trader', 'Saw Mill', 'Firewood Supplier', 'Other'];

export default function RegisterScreen({ navigation }) {
  const { registerCompany, checkDuplicate, sendOtp, verifyOtp } = useAuth();
  const { t } = useTranslation();

  // Wizard Step: 1, 2, 3, 4
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form State across all 4 steps
  const [form, setForm] = useState({
    // Step 1: Owner Account
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',

    // Step 2: Company Details
    companyName: '',
    businessType: 'Timber Trader',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '',
    phone: '',
    companyEmail: '',

    // Step 3: Tax & Bank Details
    gstin: '',
    pan: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    logoUrl: null,
    signatureUrl: null,

    // Step 4: Financial Year & Review
    fyFrom: '2026-04-01',
    fyTo: '2027-03-31',
    agreedToTerms: false
  });

  // State Picker Modal
  const [showStateModal, setShowStateModal] = useState(false);

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  const update = (field, val) => {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      // Auto-derive PAN if 15-char GSTIN entered
      if (field === 'gstin' && val.length >= 10) {
        const clean = val.trim().toUpperCase();
        if (clean.length >= 14 && !prev.pan) {
          next.pan = clean.substring(2, 12);
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Step 1 Validation
  const validateStep1 = async () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!form.mobile.trim() || form.mobile.trim().length !== 10) {
      errs.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.password || form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (form.pin && (form.pin.length < 4 || form.pin.length > 6)) {
      errs.pin = 'PIN must be 4 to 6 digits';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }

    // Check duplicate mobile/email with backend
    try {
      setLoading(true);
      const dupRes = await checkDuplicate({
        mobile: form.mobile.trim(),
        email: form.email.trim()
      });
      if (dupRes.isDuplicate) {
        Alert.alert('Already Registered', dupRes.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Duplicate check warning:', err.message);
      return true;
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs = {};
    if (!form.companyName.trim()) errs.companyName = 'Company Name is required';
    if (!form.addressLine1.trim()) errs.addressLine1 = 'Address Line 1 is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.pincode.trim() || form.pincode.trim().length !== 6) {
      errs.pincode = 'Enter a valid 6-digit Pincode';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = async () => {
    const errs = {};
    if (form.gstin.trim()) {
      if (!isValidGstin(form.gstin.trim())) {
        errs.gstin = 'Invalid GSTIN format (e.g., 33AAAAA1234A1Z5)';
      }
    }

    if (form.pan.trim()) {
      if (!isValidPan(form.pan.trim())) {
        errs.pan = 'Invalid PAN format (e.g., AAAAA1234A)';
      }
    }

    if (form.ifsc.trim() && form.ifsc.trim().length !== 11) {
      errs.ifsc = 'IFSC must be 11 characters';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }

    // Check duplicate GSTIN if provided
    if (form.gstin.trim()) {
      try {
        setLoading(true);
        const dupRes = await checkDuplicate({ gstin: form.gstin.trim() });
        if (dupRes.isDuplicate) {
          Alert.alert('Duplicate GSTIN', dupRes.message);
          return false;
        }
      } catch (err) {
        console.warn('GSTIN check warning:', err.message);
      } finally {
        setLoading(false);
      }
    }

    return true;
  };

  // Handle Next on Steps 1, 2, 3
  const handleNext = async () => {
    if (step === 1) {
      const valid = await validateStep1();
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = validateStep2();
      if (valid) setStep(3);
    } else if (step === 3) {
      const valid = await validateStep3();
      if (valid) setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // Step 4: Trigger OTP Verification before finalizing
  const handleInitiateRegistration = async () => {
    if (!form.agreedToTerms) {
      Alert.alert('Terms Required', 'Please accept the Terms of Service & Privacy Policy to proceed.');
      return;
    }

    try {
      setLoading(true);
      const res = await sendOtp({
        mobile: form.mobile.trim(),
        email: form.email.trim()
      });

      setDevOtpHint(res.devOtp || '123456');
      setShowOtpModal(true);
    } catch (err) {
      Alert.alert('OTP Request Error', err.message || 'Could not send verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Complete Registration
  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    try {
      setOtpLoading(true);
      // 1. Verify OTP
      await verifyOtp({
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        otp: otpCode.trim()
      });

      // 2. Submit full registration
      await registerCompany({
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        password: form.password,
        pin: form.pin || null,

        companyName: form.companyName.trim(),
        businessType: form.businessType,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        stateCode: form.stateCode,
        pincode: form.pincode.trim(),
        phone: form.phone.trim() || form.mobile.trim(),
        companyEmail: form.companyEmail.trim() || form.email.trim(),

        gstin: form.gstin.trim().toUpperCase(),
        pan: form.pan.trim().toUpperCase(),
        bankName: form.bankName.trim(),
        accountNo: form.accountNo.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        branch: form.branch.trim(),
        logoUrl: form.logoUrl,
        signatureUrl: form.signatureUrl,

        fyFrom: form.fyFrom,
        fyTo: form.fyTo
      });

      setShowOtpModal(false);
      // Navigation is automatic as isAuthenticated flips to true in AuthContext!
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not create company account.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Register Your Company</Text>
          <Text style={styles.headerSubtitle}>Step {step} of 4: {
            step === 1 ? 'Owner Account' :
            step === 2 ? 'Company Details' :
            step === 3 ? 'Tax & Bank' : 'Review & Activate'
          }</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressBarSegment,
              i <= step && styles.progressBarSegmentActive
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: OWNER ACCOUNT */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.cardHeading}>Owner Account Details</Text>
            </View>
            <Text style={styles.cardDesc}>
              This will be the master business owner account with full access to company books, billing, and settings.
            </Text>

            <CustomInput
              label="Owner Full Name *"
              placeholder="e.g. Ramesh Kumar"
              value={form.fullName}
              onChangeText={(v) => update('fullName', v)}
              error={errors.fullName}
              prefix={<Ionicons name="person-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Mobile Number (for Login & OTP) *"
              placeholder="10-digit mobile number"
              value={form.mobile}
              onChangeText={(v) => update('mobile', v.replace(/[^0-9]/g, ''))}
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.mobile}
              prefix={<Ionicons name="call-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Email Address *"
              placeholder="owner@mycompany.com"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              prefix={<Ionicons name="mail-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Password (min 6 chars) *"
              placeholder="••••••••"
              value={form.password}
              onChangeText={(v) => update('password', v)}
              secureTextEntry
              error={errors.password}
              prefix={<Ionicons name="lock-closed-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Confirm Password *"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChangeText={(v) => update('confirmPassword', v)}
              secureTextEntry
              error={errors.confirmPassword}
              prefix={<Ionicons name="shield-checkmark-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Set 4-6 Digit Quick PIN (Optional)"
              placeholder="e.g. 1234"
              value={form.pin}
              onChangeText={(v) => update('pin', v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={6}
              error={errors.pin}
              prefix={<Ionicons name="keypad-outline" size={18} color={colors.slateGrey} />}
            />
          </View>
        )}

        {/* STEP 2: COMPANY DETAILS */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={styles.cardHeading}>Company & Address Profile</Text>
            </View>
            <Text style={styles.cardDesc}>
              These details will appear on your GST Tax Invoices, Delivery Challans, and Ledger statements.
            </Text>

            <CustomInput
              label="Company / Firm Name *"
              placeholder="e.g. Shree Balaji Timbers & Saw Mill"
              value={form.companyName}
              onChangeText={(v) => update('companyName', v)}
              error={errors.companyName}
              prefix={<Ionicons name="business-outline" size={18} color={colors.slateGrey} />}
            />

            {/* Business Type Selector */}
            <Text style={styles.fieldLabel}>BUSINESS TYPE</Text>
            <View style={styles.chipsRow}>
              {BUSINESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    form.businessType === type && styles.chipActive
                  ]}
                  onPress={() => update('businessType', type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.businessType === type && styles.chipTextActive
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <CustomInput
              label="Address Line 1 (Street / Mill Area) *"
              placeholder="e.g. 24, Industrial Estate Road"
              value={form.addressLine1}
              onChangeText={(v) => update('addressLine1', v)}
              error={errors.addressLine1}
            />

            <CustomInput
              label="Address Line 2 (Optional)"
              placeholder="e.g. Near Timber Depot, Ward 4"
              value={form.addressLine2}
              onChangeText={(v) => update('addressLine2', v)}
            />

            <View style={styles.row}>
              <CustomInput
                label="City *"
                placeholder="e.g. Pollachi"
                value={form.city}
                onChangeText={(v) => update('city', v)}
                error={errors.city}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />

              <CustomInput
                label="District"
                placeholder="e.g. Coimbatore"
                value={form.district}
                onChangeText={(v) => update('district', v)}
                containerStyle={{ flex: 1, marginLeft: 8 }}
              />
            </View>

            {/* State Picker Button */}
            <Text style={styles.fieldLabel}>STATE (FOR GST STATE CODE) *</Text>
            <TouchableOpacity
              style={styles.stateSelectorBtn}
              onPress={() => setShowStateModal(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="map-outline" size={18} color={colors.navyPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.stateSelectorText}>
                  {form.state} (Code: {form.stateCode})
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.slateGrey} />
            </TouchableOpacity>

            <View style={styles.row}>
              <CustomInput
                label="Pincode *"
                placeholder="642001"
                value={form.pincode}
                onChangeText={(v) => update('pincode', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={6}
                error={errors.pincode}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />

              <CustomInput
                label="Office / Alt Phone"
                placeholder="e.g. 04259 220000"
                value={form.phone}
                onChangeText={(v) => update('phone', v)}
                containerStyle={{ flex: 1, marginLeft: 8 }}
              />
            </View>

            <CustomInput
              label="Company Email (Optional)"
              placeholder="billing@mycompany.com"
              value={form.companyEmail}
              onChangeText={(v) => update('companyEmail', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}

        {/* STEP 3: TAX & BANK DETAILS */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.cardHeading}>Tax & Bank Details</Text>
            </View>
            <Text style={styles.cardDesc}>
              GSTIN is validated for Indian GST formats. Bank details will be printed on your invoice payment section.
            </Text>

            <CustomInput
              label="GSTIN (Optional if Unregistered)"
              placeholder="e.g. 33AAAAA0000A1Z5"
              value={form.gstin}
              onChangeText={(v) => update('gstin', v.toUpperCase())}
              autoCapitalize="characters"
              error={errors.gstin}
              prefix={<Ionicons name="document-text-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="PAN Number"
              placeholder="e.g. AAAAA0000A"
              value={form.pan}
              onChangeText={(v) => update('pan', v.toUpperCase())}
              autoCapitalize="characters"
              error={errors.pan}
            />

            <View style={styles.divider} />
            <Text style={styles.sectionSubtitle}>Primary Bank Account</Text>

            <CustomInput
              label="Bank Name"
              placeholder="e.g. State Bank of India, HDFC Bank"
              value={form.bankName}
              onChangeText={(v) => update('bankName', v)}
              prefix={<Ionicons name="card-outline" size={18} color={colors.slateGrey} />}
            />

            <CustomInput
              label="Account Number"
              placeholder="e.g. 30129845789"
              value={form.accountNo}
              onChangeText={(v) => update('accountNo', v)}
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <CustomInput
                label="IFSC Code"
                placeholder="e.g. SBIN0001234"
                value={form.ifsc}
                onChangeText={(v) => update('ifsc', v.toUpperCase())}
                autoCapitalize="characters"
                error={errors.ifsc}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />

              <CustomInput
                label="Branch"
                placeholder="e.g. Main Branch"
                value={form.branch}
                onChangeText={(v) => update('branch', v)}
                containerStyle={{ flex: 1, marginLeft: 8 }}
              />
            </View>

            <View style={styles.optionalUploadBox}>
              <Ionicons name="images-outline" size={24} color={colors.goldPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.uploadBoxTitle}>Company Logo & Signatures</Text>
                <Text style={styles.uploadBoxSubtitle}>
                  You can upload your company logo and authorised signature image anytime from Settings &gt; Company Profile.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: FINANCIAL YEAR & REVIEW */}
        {step === 4 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={styles.cardHeading}>Financial Year & Final Review</Text>
            </View>
            <Text style={styles.cardDesc}>
              Review your company setup before activating your cloud account.
            </Text>

            {/* Financial Year Inputs */}
            <View style={styles.fyBox}>
              <Text style={styles.fyTitle}>First Financial Year (Current Indian FY)</Text>
              <View style={styles.row}>
                <CustomInput
                  label="From Date"
                  value={form.fyFrom}
                  onChangeText={(v) => update('fyFrom', v)}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="To Date"
                  value={form.fyTo}
                  onChangeText={(v) => update('fyTo', v)}
                  containerStyle={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>

            {/* Review Summary Card */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>Registration Summary</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company Name:</Text>
                <Text style={styles.reviewValue}>{form.companyName}</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Business Type:</Text>
                <Text style={styles.reviewValue}>{form.businessType}</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Address:</Text>
                <Text style={styles.reviewValue}>{form.addressLine1}, {form.city}, {form.state} - {form.pincode}</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Owner Account:</Text>
                <Text style={styles.reviewValue}>{form.fullName} ({form.mobile})</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Email:</Text>
                <Text style={styles.reviewValue}>{form.email}</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>GSTIN:</Text>
                <Text style={styles.reviewValue}>{form.gstin || 'Unregistered / None'}</Text>
              </View>

              {form.bankName ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Bank:</Text>
                  <Text style={styles.reviewValue}>{form.bankName} ({form.accountNo ? `A/c ${form.accountNo}` : 'Default'})</Text>
                </View>
              ) : null}

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Quick PIN:</Text>
                <Text style={styles.reviewValue}>{form.pin ? 'Configured' : 'Not set'}</Text>
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => update('agreedToTerms', !form.agreedToTerms)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={form.agreedToTerms ? 'checkbox' : 'square-outline'}
                size={22}
                color={form.agreedToTerms ? colors.goldPrimary : colors.slateGrey}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.termsText}>
                I accept the Terms of Service and understand all tenant data is securely isolated in the cloud.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Wizard Actions */}
        <View style={styles.wizardBtnRow}>
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.prevBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
          </TouchableOpacity>

          {step < 4 ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={colors.navyDark} />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next Step</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.navyDark} style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleInitiateRegistration}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={colors.navyDark} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.navyDark} style={{ marginRight: 6 }} />
                  <Text style={styles.createBtnText}>Verify OTP & Create</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* STATE PICKER MODAL */}
      <Modal visible={showStateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Indian State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={24} color={colors.navyDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {INDIAN_STATES.map((st) => (
                <TouchableOpacity
                  key={st.code}
                  style={[
                    styles.stateOptionRow,
                    form.state === st.name && styles.stateOptionRowSelected
                  ]}
                  onPress={() => {
                    update('state', st.name);
                    update('stateCode', st.code);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[
                    styles.stateOptionText,
                    form.state === st.name && styles.stateOptionTextSelected
                  ]}>
                    {st.name}
                  </Text>
                  <Text style={styles.stateCodeBadge}>Code: {st.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* OTP VERIFICATION MODAL */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalCard}>
            <View style={styles.otpIconCircle}>
              <Ionicons name="phone-portrait-outline" size={32} color={colors.goldPrimary} />
            </View>
            <Text style={styles.otpModalTitle}>Verify Mobile OTP</Text>
            <Text style={styles.otpModalSubtitle}>
              Enter the 6-digit verification code sent to {form.mobile}
            </Text>

            {devOtpHint ? (
              <View style={styles.devOtpBadge}>
                <Text style={styles.devOtpText}>Instant Verification Code: {devOtpHint}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />

            <TouchableOpacity
              style={styles.verifyOtpBtn}
              onPress={handleConfirmOtp}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color={colors.navyDark} />
              ) : (
                <Text style={styles.verifyOtpBtnText}>Activate Company Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 12 }}
              onPress={() => setShowOtpModal(false)}
            >
              <Text style={{ color: colors.slateGrey, fontSize: 13 }}>Cancel & Edit Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 44,
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
  headerSubtitle: {
    fontSize: 12,
    color: colors.goldLight,
    marginTop: 2
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginHorizontal: 3
  },
  progressBarSegmentActive: {
    backgroundColor: colors.goldPrimary
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 17
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navyMedium,
    marginBottom: 6,
    letterSpacing: 0.5,
    marginTop: 6
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  chipActive: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.navyPrimary
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slateGrey
  },
  chipTextActive: {
    color: colors.goldPrimary,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row'
  },
  stateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12
  },
  stateSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navyPrimary
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  optionalUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEA',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E'
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15
  },
  fyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  fyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginBottom: 8
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  reviewHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navyPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  reviewLabel: {
    width: 110,
    fontSize: 12,
    fontWeight: '600',
    color: colors.slateGrey
  },
  reviewValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyDark
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 6
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  wizardBtnRow: {
    flexDirection: 'row',
    marginTop: 16
  },
  prevBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  nextBtn: {
    flex: 2,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldPrimary,
    marginLeft: 8,
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  createBtn: {
    flex: 2,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldPrimary,
    marginLeft: 8,
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  stateOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  stateOptionRowSelected: {
    backgroundColor: '#FFFBEA'
  },
  stateOptionText: {
    fontSize: 14,
    color: colors.navyDark,
    fontWeight: '500'
  },
  stateOptionTextSelected: {
    fontWeight: '800',
    color: colors.goldDark
  },
  stateCodeBadge: {
    fontSize: 11,
    color: colors.slateGrey,
    fontWeight: '600'
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center'
  },
  otpIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDark,
    marginBottom: 6
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18
  },
  devOtpBadge: {
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14
  },
  devOtpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E'
  },
  otpInput: {
    width: 200,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.navyPrimary,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.navyDark,
    marginBottom: 18
  },
  verifyOtpBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.goldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  verifyOtpBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  }
});
