import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import { ledgersApi } from '../../api/client';

export default function LedgerFormScreen({ route, navigation }) {
  const ledgerId = route?.params?.ledgerId;
  const isEdit = !!ledgerId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState([
    'Sundry Debtors',
    'Sundry Creditors',
    'Cash-in-Hand',
    'Bank Accounts',
    'Bank OD Accounts',
    'Capital Account',
    'Current Assets',
    'Current Liabilities',
    'Deposits',
    'Direct Expenses',
    'Direct Incomes',
    'Duties & Taxes',
    'Indirect Expenses',
    'Indirect Incomes',
    'Sales Accounts',
    'Purchase Accounts'
  ]);

  const [form, setForm] = useState({
    name: '',
    group: 'Sundry Debtors',
    taxType: 'Local',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    pincode: '',
    district: '',
    state: 'Tamil Nadu',
    phone: '',
    email: '',
    openingBalance: '0',
    openingBalanceType: 'Dr',
    creditDays: '30',
    creditLimit: '0'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchGroups();
    if (isEdit) {
      loadLedger();
    }
  }, [ledgerId]);

  const fetchGroups = async () => {
    try {
      const res = await ledgersApi.getGroups();
      if (res.groups && res.groups.length > 0) {
        const unique = Array.from(
          new Set(res.groups.map(g => (typeof g === 'string' ? g : g.name)).filter(Boolean))
        );
        if (unique.length > 0) {
          setGroups(unique);
        }
      }
    } catch (e) {}
  };

  const loadLedger = async () => {
    try {
      setLoading(true);
      const res = await ledgersApi.getById(ledgerId);
      if (res.ledger) {
        setForm({
          name: res.ledger.name || '',
          group: res.ledger.group || 'Sundry Debtors',
          taxType: res.ledger.taxType || 'Local',
          gstin: res.ledger.gstin || '',
          pan: res.ledger.pan || '',
          address: res.ledger.address || '',
          city: res.ledger.city || '',
          pincode: res.ledger.pincode || '',
          district: res.ledger.district || '',
          state: res.ledger.state || 'Tamil Nadu',
          phone: res.ledger.phone || '',
          email: res.ledger.email || '',
          openingBalance: String(res.ledger.openingBalance || 0),
          openingBalanceType: res.ledger.openingBalanceType || 'Dr',
          creditDays: String(res.ledger.creditDays || 30),
          creditLimit: String(res.ledger.creditLimit || 0)
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load ledger');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Party/Ledger name is required';
    if (!form.group) errs.group = 'Account group is required';

    if (form.gstin && form.gstin.trim()) {
      const clean = form.gstin.trim().toUpperCase();
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(clean)) {
        errs.gstin = 'Invalid GSTIN format (e.g. 33AAAAA1234A1Z5)';
      }
    }

    if (form.pan && form.pan.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(form.pan.trim().toUpperCase())) {
        errs.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        gstin: form.gstin.trim().toUpperCase(),
        pan: form.pan.trim().toUpperCase(),
        openingBalance: parseFloat(form.openingBalance) || 0,
        creditDays: parseInt(form.creditDays) || 30,
        creditLimit: parseFloat(form.creditLimit) || 0
      };

      if (isEdit) {
        await ledgersApi.update(ledgerId, payload);
        Alert.alert('Updated', 'Ledger details updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ledgersApi.create(payload);
        Alert.alert('Created', 'New ledger account created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save ledger.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ledger Account',
      `Are you sure you want to permanently delete "${form.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const res = await ledgersApi.delete(ledgerId);
              if (res.success) {
                Alert.alert('Deleted', 'Ledger deleted successfully.', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Cannot Delete', res.message || 'Could not delete ledger.');
              }
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Cannot delete ledger with existing transactions.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={isEdit ? 'Edit Ledger' : 'New Ledger Account'}
        subtitle={isEdit ? form.name : 'Create Party, Customer or Bank'}
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* General Info Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Basic Account Details</Text>

              <CustomInput
                label="Account / Party Name *"
                placeholder="e.g. Sri Venkateswara Wood Works"
                value={form.name}
                onChangeText={(v) => update('name', v)}
                error={errors.name}
              />

              <Text style={styles.fieldLabel}>ACCOUNT GROUP *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.groupChipsRow}>
                  {groups.map((grp, idx) => {
                    const isSelected = form.group === grp;
                    return (
                      <TouchableOpacity
                        key={`${grp}_${idx}`}
                        style={[styles.groupChip, isSelected ? styles.groupChipSelected : null]}
                        onPress={() => update('group', grp)}
                      >
                        <Text style={[styles.groupChipText, isSelected ? styles.groupChipTextSelected : null]}>
                          {grp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>TAX APPLICABILITY</Text>
              <SegmentedControl
                options={['Local (Intra-State)', 'Interstate']}
                selectedIndex={form.taxType === 'Local' ? 0 : 1}
                onChange={(idx) => update('taxType', idx === 0 ? 'Local' : 'Interstate')}
                containerStyle={{ marginBottom: 12 }}
              />

              <View style={styles.row}>
                <CustomInput
                  label="GSTIN"
                  placeholder="33AAAAA1234A1Z5"
                  value={form.gstin}
                  onChangeText={(v) => update('gstin', v.toUpperCase())}
                  error={errors.gstin}
                  autoCapitalize="characters"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="PAN"
                  placeholder="AAAAA1234A"
                  value={form.pan}
                  onChangeText={(v) => update('pan', v.toUpperCase())}
                  error={errors.pan}
                  autoCapitalize="characters"
                  containerStyle={{ width: 130 }}
                />
              </View>
            </View>

            {/* Address & Contact Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Address & Communication</Text>

              <CustomInput
                label="Address"
                placeholder="Door No, Street name, Area"
                value={form.address}
                onChangeText={(v) => update('address', v)}
              />

              <View style={styles.row}>
                <CustomInput
                  label="City"
                  placeholder="City"
                  value={form.city}
                  onChangeText={(v) => update('city', v)}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="Pincode"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChangeText={(v) => update('pincode', v)}
                  keyboardType="numeric"
                  containerStyle={{ width: 110 }}
                />
              </View>

              <View style={styles.row}>
                <CustomInput
                  label="State"
                  placeholder="State"
                  value={form.state}
                  onChangeText={(v) => update('state', v)}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="District"
                  placeholder="District"
                  value={form.district}
                  onChangeText={(v) => update('district', v)}
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <View style={styles.row}>
                <CustomInput
                  label="Phone Number"
                  placeholder="Mobile"
                  value={form.phone}
                  onChangeText={(v) => update('phone', v)}
                  keyboardType="phone-pad"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="Email"
                  placeholder="Email"
                  value={form.email}
                  onChangeText={(v) => update('email', v)}
                  keyboardType="email-address"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </View>

            {/* Opening Balance & Credit Terms */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Balance & Credit Terms</Text>

              <View style={styles.row}>
                <CustomInput
                  label="Opening Balance (₹)"
                  placeholder="0.00"
                  value={form.openingBalance}
                  onChangeText={(v) => update('openingBalance', v)}
                  keyboardType="numeric"
                  prefix="₹"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <View style={{ width: 120 }}>
                  <Text style={styles.fieldLabel}>BALANCE TYPE</Text>
                  <SegmentedControl
                    options={['Dr', 'Cr']}
                    selectedIndex={form.openingBalanceType === 'Dr' ? 0 : 1}
                    onChange={(idx) => update('openingBalanceType', idx === 0 ? 'Dr' : 'Cr')}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <CustomInput
                  label="Credit Days"
                  placeholder="30"
                  value={form.creditDays}
                  onChangeText={(v) => update('creditDays', v)}
                  keyboardType="numeric"
                  suffix="DAYS"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="Credit Limit (₹)"
                  placeholder="0.00"
                  value={form.creditLimit}
                  onChangeText={(v) => update('creditLimit', v)}
                  keyboardType="numeric"
                  prefix="₹"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>{isEdit ? 'Update Ledger' : 'Save Ledger Account'}</Text>
                </>
              )}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.deleteBtnText}>Delete Ledger Account</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.4
  },
  groupChipsRow: {
    flexDirection: 'row',
    gap: 8
  },
  groupChip: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  groupChipSelected: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  groupChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  groupChipTextSelected: {
    color: colors.white,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row'
  },
  saveBtn: {
    backgroundColor: colors.navyPrimary,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldDark,
    marginTop: 6
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.7
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    marginTop: 10
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14
  }
});
