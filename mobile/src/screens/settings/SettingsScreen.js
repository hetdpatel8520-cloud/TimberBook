import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, AVAILABLE_LANGUAGES } from '../../i18n/LanguageContext';
import { settingsApi, invoicesApi } from '../../api/client';

export default function SettingsScreen({ navigation }) {
  const { company, owner, financialYear, logout, lockApp } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [biometricEnabled, setBiometricEnabled] = useState(owner?.biometricEnabled || true);

  // Invoice Numbering Management
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [nextInvoiceNo, setNextInvoiceNo] = useState('1');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [savingNumbering, setSavingNumbering] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const [nextNumRes, setRes] = await Promise.all([
        invoicesApi.getNextNumber(),
        settingsApi.get()
      ]);
      if (nextNumRes.counter !== undefined) {
        setNextInvoiceNo(String(nextNumRes.counter));
      }
      if (setRes.settings) {
        setInvoicePrefix(setRes.settings.invoicePrefix || '');
      }
    } catch (e) {}
  };

  const handleSaveNumbering = async () => {
    const num = parseInt(nextInvoiceNo, 10);
    if (isNaN(num) || num < 1) {
      Alert.alert('Invalid Number', 'Next bill number must be at least 1.');
      return;
    }
    try {
      setSavingNumbering(true);
      await settingsApi.update({
        nextInvoiceNumber: num,
        invoicePrefix: invoicePrefix.trim()
      });
      setShowNumberingModal(false);
      Alert.alert('Success', `Invoice numbering updated. Next bill will be: ${invoicePrefix.trim()}${num}`);
      loadSettingsData();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not update invoice sequence.');
    } finally {
      setSavingNumbering(false);
    }
  };

  const handleToggleBiometric = (val) => {
    setBiometricEnabled(val);
    Alert.alert('Security', `Biometric / PIN lock ${val ? 'enabled' : 'disabled'}.`);
  };

  const handleLockNow = () => {
    lockApp();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Settings & Utility"
        subtitle="Configuration & Data Tools"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Company Info Header Card */}
        <View style={styles.card}>
          <View style={styles.companyHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="business" size={24} color={colors.goldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compName}>{company?.name || 'Company Profile'}</Text>
              <Text style={styles.compSub}>GSTIN: {company?.gstin}</Text>
              <Text style={styles.compSub}>{company?.city} • Ph: {company?.phone}</Text>
            </View>
          </View>
        </View>

        {/* FINANCIAL YEAR MANAGEMENT */}
        <Text style={styles.sectionTitle}>{t('financialYears').toUpperCase()}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FinancialYear')}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="calendar-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{t('selectFinancialYear')}</Text>
              <Text style={styles.menuSub}>
                Active: <Text style={{ color: colors.goldPrimary, fontWeight: '700' }}>{financialYear?.name || 'FY 2024-25'}</Text> • Tap to switch
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
          </TouchableOpacity>
        </View>

        {/* BILLING & INVOICE NUMBERING */}
        <Text style={styles.sectionTitle}>BILLING & INVOICE NUMBERING</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowNumberingModal(true)}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="receipt-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Bill Starting Number & Prefix</Text>
              <Text style={styles.menuSub}>
                Next Bill: <Text style={{ color: colors.goldPrimary, fontWeight: '700' }}>{invoicePrefix}{nextInvoiceNo}</Text> • Tap to edit
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color={colors.goldPrimary} />
          </TouchableOpacity>
        </View>

        {/* LANGUAGE SELECTION */}
        <Text style={styles.sectionTitle}>{t('language').toUpperCase()}</Text>
        <View style={[styles.menuCard, { padding: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {AVAILABLE_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  language === lang.code && styles.langBtnActive
                ]}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    language === lang.code && styles.langBtnTextActive
                  ]}
                >
                  {lang.native}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* UTILITY & BACKUP */}
        <Text style={styles.sectionTitle}>DATA & BACKUP</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('BackupRestore')}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Backup & Restore</Text>
              <Text style={styles.menuSub}>Export or import full database JSON dump</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Printing Format', 'Default Paper Size: A4 GST Invoice. Margins: 30pt. Thermal slip printer ready.')}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="print-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Print Preferences</Text>
              <Text style={styles.menuSub}>A4 Tax Invoice / Thermal Receipt printer settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
          </TouchableOpacity>
        </View>

        {/* SECURITY */}
        <Text style={styles.sectionTitle}>SECURITY & APP LOCK</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconBox}>
              <Ionicons name="finger-print" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Biometric & PIN Lock</Text>
              <Text style={styles.menuSub}>Require 4-digit PIN on app resume</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.borderDark, true: colors.navyPrimary }}
              thumbColor={biometricEnabled ? colors.goldPrimary : colors.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleLockNow}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Lock App Now</Text>
              <Text style={styles.menuSub}>Instant quick-lock with PIN unlock</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
          </TouchableOpacity>
        </View>

        {/* ABOUT & LOGOUT */}
        <Text style={styles.sectionTitle}>APP INFORMATION</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.navyPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>TimberBooks Mobile ERP</Text>
              <Text style={styles.menuSub}>Version 1.0.0 • Mobile replica of Windows desktop ERP</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.errorText} style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Invoice Numbering Setup Modal */}
      <Modal visible={showNumberingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Numbering Setup</Text>
              <TouchableOpacity onPress={() => setShowNumberingModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Configure your starting bill number and optional prefix. All subsequent invoices will automatically increment from this number.
            </Text>

            <CustomInput
              label="NEXT BILL NUMBER *"
              placeholder="e.g. 1"
              value={nextInvoiceNo}
              onChangeText={setNextInvoiceNo}
              keyboardType="numeric"
              containerStyle={{ marginBottom: 12 }}
            />

            <CustomInput
              label="INVOICE PREFIX (OPTIONAL)"
              placeholder="e.g. INV/ or leave blank for 1, 2, 3..."
              value={invoicePrefix}
              onChangeText={setInvoicePrefix}
              containerStyle={{ marginBottom: 16 }}
            />

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>PREVIEW OF NEXT BILL NO:</Text>
              <Text style={styles.previewValue}>{invoicePrefix}{nextInvoiceNo || '1'}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowNumberingModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingNumbering && styles.btnDisabled]}
                onPress={handleSaveNumbering}
                disabled={savingNumbering}
              >
                {savingNumbering ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  compName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  compSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.6
  },
  menuCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  menuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginLeft: 62
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.errorText,
    borderRadius: 10,
    minHeight: 48,
    marginTop: 10
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.errorText
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0'
  },
  langBtnActive: {
    backgroundColor: colors.goldPrimary,
    borderColor: colors.goldPrimary
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navyDark
  },
  langBtnTextActive: {
    fontWeight: '800',
    color: colors.navyDark
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18
  },
  previewBox: {
    backgroundColor: colors.surfaceBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    alignItems: 'center'
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.6
  }
});
