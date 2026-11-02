import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { companyApi } from '../../api/client';
import CustomInput from '../../components/CustomInput';

const BUSINESS_TYPES = ['Timber Trader', 'Saw Mill', 'Firewood Supplier', 'Other'];

export default function MyCompaniesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { owner, company, companies, switchCompany, createNewCompany, refreshCompanies } = useAuth();

  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Company Form State
  const [newForm, setNewForm] = useState({
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
    gstin: '',
    pan: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    branch: ''
  });

  useEffect(() => {
    refreshCompanies();
  }, []);

  const updateNew = (field, val) => {
    setNewForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'gstin' && val.length >= 10) {
        const clean = val.trim().toUpperCase();
        if (clean.length >= 14 && !prev.pan) {
          next.pan = clean.substring(2, 12);
        }
      }
      return next;
    });
  };

  const handleSwitch = async (targetId) => {
    if (String(targetId) === String(company?._id)) return;
    try {
      setSwitchingId(targetId);
      await switchCompany(targetId);
      Alert.alert('Active Company Changed', 'Switched active company successfully.');
    } catch (err) {
      Alert.alert('Switch Failed', err.message || 'Could not switch company.');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateCompany = async () => {
    if (!newForm.companyName.trim()) {
      Alert.alert('Required', 'Please enter Company Name.');
      return;
    }
    if (!newForm.addressLine1.trim() || !newForm.city.trim() || !newForm.pincode.trim()) {
      Alert.alert('Required', 'Address line, city, and pincode are required.');
      return;
    }

    try {
      setCreating(true);
      await createNewCompany({
        companyName: newForm.companyName.trim(),
        businessType: newForm.businessType,
        addressLine1: newForm.addressLine1.trim(),
        addressLine2: newForm.addressLine2.trim(),
        city: newForm.city.trim(),
        district: newForm.district.trim(),
        state: newForm.state.trim(),
        stateCode: newForm.stateCode,
        pincode: newForm.pincode.trim(),
        phone: newForm.phone.trim() || owner?.mobile,
        companyEmail: newForm.companyEmail.trim() || owner?.email,
        gstin: newForm.gstin.trim().toUpperCase(),
        pan: newForm.pan.trim().toUpperCase(),
        bankName: newForm.bankName.trim(),
        accountNo: newForm.accountNo.trim(),
        ifsc: newForm.ifsc.trim().toUpperCase(),
        branch: newForm.branch.trim()
      });

      setShowAddModal(false);
      setNewForm({
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
        gstin: '',
        pan: '',
        bankName: '',
        accountNo: '',
        ifsc: '',
        branch: ''
      });
      Alert.alert('Company Created', 'New company added and set as active!');
    } catch (err) {
      Alert.alert('Creation Failed', err.message || 'Could not create company.');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = (targetComp) => {
    if ((companies?.length || 0) <= 1) {
      Alert.alert('Action Blocked', 'You cannot archive your only active company.');
      return;
    }

    Alert.alert(
      'Archive Company',
      `Are you sure you want to archive "${targetComp.name}"? It will no longer appear in your active business list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await companyApi.archiveCompany(targetComp._id);
              await refreshCompanies();
              Alert.alert('Archived', `"${targetComp.name}" has been archived.`);
            } catch (err) {
              Alert.alert('Archive Failed', err.message || 'Could not archive company.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const maxAllowed = 5;
  const canAddMore = (companies?.length || 0) < maxAllowed;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Companies / Businesses</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 }
        ]}
      >
        {/* Owner Account Card */}
        <View style={styles.ownerCard}>
          <View style={styles.ownerAvatar}>
            <Ionicons name="person" size={20} color={colors.navyDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerName}>{owner?.fullName || 'Business Owner'}</Text>
            <Text style={styles.ownerSub}>{owner?.mobile} • {owner?.email}</Text>
          </View>
          <View style={styles.quotaPill}>
            <Text style={styles.quotaText}>
              {companies?.length || 1} / {maxAllowed} Companies
            </Text>
          </View>
        </View>

        {/* Add Company Action Button */}
        {canAddMore ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color={colors.navyDark} style={{ marginRight: 8 }} />
            <Text style={styles.addBtnText}>Add Another Company</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.limitBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#92400E" style={{ marginRight: 6 }} />
            <Text style={styles.limitBannerText}>
              Maximum limit of {maxAllowed} companies reached under this owner account.
            </Text>
          </View>
        )}

        {/* Companies List */}
        <Text style={styles.sectionHeader}>REGISTERED COMPANIES</Text>

        {companies && companies.map((c) => {
          const isActive = String(c._id) === String(company?._id);
          const isBusy = switchingId === c._id;

          return (
            <View
              key={c._id}
              style={[
                styles.companyCard,
                isActive && styles.companyCardActive
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconCircle}>
                  <Ionicons name="business" size={22} color={isActive ? colors.goldPrimary : colors.slateGrey} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.compCardName} numberOfLines={1}>{c.name}</Text>
                    {isActive ? (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>CURRENT ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.compCardType}>{c.businessType || 'Timber Trader'}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsBox}>
                <Text style={styles.detailText}>
                  📍 {c.addressLine1 || c.address || ''}, {c.city} - {c.pincode}
                </Text>
                {c.gstin ? (
                  <Text style={styles.detailText}>🏷️ GSTIN: {c.gstin}</Text>
                ) : null}
                <Text style={styles.detailText}>
                  📞 {c.phone} {c.email ? `• ✉️ ${c.email}` : ''}
                </Text>
              </View>

              {/* Card Actions */}
              <View style={styles.cardActionsRow}>
                {isActive ? (
                  <View style={styles.activeIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.activeIndicatorText}>Active Company</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={() => handleSwitch(c._id)}
                    disabled={isBusy}
                    activeOpacity={0.8}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.navyDark} />
                    ) : (
                      <>
                        <Ionicons name="swap-horizontal" size={14} color={colors.navyDark} style={{ marginRight: 4 }} />
                        <Text style={styles.switchBtnText}>Switch to this Company</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {companies.length > 1 ? (
                  <TouchableOpacity
                    style={styles.archiveBtn}
                    onPress={() => handleArchive(c)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="archive-outline" size={14} color={colors.slateGrey} style={{ marginRight: 4 }} />
                    <Text style={styles.archiveBtnText}>Archive</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* CREATE NEW COMPANY MODAL */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.navyDark }}
        >
          <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Company</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Company Profile Details</Text>
              <Text style={styles.formCardSub}>
                This company will be added under owner account {owner?.fullName}
              </Text>

              <CustomInput
                label="Company Name *"
                placeholder="e.g. Sri Bhavani Saw Mill"
                value={newForm.companyName}
                onChangeText={(v) => updateNew('companyName', v)}
              />

              <Text style={styles.fieldLabel}>BUSINESS TYPE</Text>
              <View style={styles.typeChipsRow}>
                {BUSINESS_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.typeChip, newForm.businessType === bt && styles.typeChipActive]}
                    onPress={() => updateNew('businessType', bt)}
                  >
                    <Text style={[styles.typeChipText, newForm.businessType === bt && styles.typeChipTextActive]}>
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <CustomInput
                label="Address Line 1 *"
                placeholder="Door No, Street name"
                value={newForm.addressLine1}
                onChangeText={(v) => updateNew('addressLine1', v)}
              />

              <CustomInput
                label="City *"
                placeholder="City / Town"
                value={newForm.city}
                onChangeText={(v) => updateNew('city', v)}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="State"
                    placeholder="State"
                    value={newForm.state}
                    onChangeText={(v) => updateNew('state', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Pincode *"
                    placeholder="6 digits"
                    value={newForm.pincode}
                    onChangeText={(v) => updateNew('pincode', v)}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>

              <CustomInput
                label="GSTIN (Optional)"
                placeholder="15-character GSTIN"
                value={newForm.gstin}
                onChangeText={(v) => updateNew('gstin', v)}
                autoCapitalize="characters"
              />

              <CustomInput
                label="Phone (Leave blank to use owner mobile)"
                placeholder={owner?.mobile || ''}
                value={newForm.phone}
                onChangeText={(v) => updateNew('phone', v)}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.submitCreateBtn}
                onPress={handleCreateCompany}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={colors.navyDark} />
                ) : (
                  <Text style={styles.submitCreateBtnText}>Create & Activate Company</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    paddingBottom: 12,
    backgroundColor: colors.navyDark
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
    padding: 16
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white
  },
  ownerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2
  },
  quotaPill: {
    backgroundColor: 'rgba(212, 160, 23, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.goldPrimary
  },
  quotaText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEA',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20
  },
  limitBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.goldPrimary,
    letterSpacing: 1,
    marginBottom: 12
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  companyCardActive: {
    borderColor: colors.goldPrimary,
    borderWidth: 2,
    backgroundColor: '#FFFCF2'
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  compCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyDark,
    flexShrink: 1
  },
  activeTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  compCardType: {
    fontSize: 12,
    color: colors.slateGrey,
    marginTop: 2
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4
  },
  detailText: {
    fontSize: 12,
    color: colors.navyDark,
    lineHeight: 18
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  activeIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981'
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navyDark
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  archiveBtnText: {
    fontSize: 12,
    color: colors.slateGrey,
    fontWeight: '600'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20
  },
  formCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDark
  },
  formCardSub: {
    fontSize: 12,
    color: colors.slateGrey,
    marginTop: 2,
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navyDark,
    letterSpacing: 0.5,
    marginBottom: 6
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  typeChipActive: {
    backgroundColor: colors.goldPrimary,
    borderColor: colors.goldPrimary
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slateGrey
  },
  typeChipTextActive: {
    color: colors.navyDark,
    fontWeight: '800'
  },
  submitCreateBtn: {
    backgroundColor: colors.goldPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12
  },
  submitCreateBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  }
});
