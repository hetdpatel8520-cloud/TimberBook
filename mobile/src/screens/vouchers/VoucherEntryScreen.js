import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import PartyPickerModal from '../../components/PartyPickerModal';
import { ledgersApi, vouchersApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';
import { useTranslation } from '../../i18n/LanguageContext';

export const VOUCHER_TYPES = {
  RECEIPT: 'receipt',
  PAYMENT: 'payment',
  CONTRA: 'contra'
};

function normalizeVoucherType(raw) {
  if (!raw) return VOUCHER_TYPES.RECEIPT;
  const lower = String(raw).toLowerCase().trim();
  if (lower === 'payment') return VOUCHER_TYPES.PAYMENT;
  if (lower === 'contra') return VOUCHER_TYPES.CONTRA;
  return VOUCHER_TYPES.RECEIPT;
}

export default function VoucherEntryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const initialType = normalizeVoucherType(
    route?.params?.voucherType || route?.params?.initialType || route?.params?.defaultType
  );

  const [voucherType, setVoucherType] = useState(initialType);
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Accounts
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [partyAccounts, setPartyAccounts] = useState([]);
  const [allLedgers, setAllLedgers] = useState([]);

  const [selectedCashBank, setSelectedCashBank] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const [showCashBankPicker, setShowCashBankPicker] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // C2: React dynamically to route parameter changes when navigated from Home
  useEffect(() => {
    const nextType = normalizeVoucherType(
      route?.params?.voucherType || route?.params?.initialType || route?.params?.defaultType
    );
    if (nextType !== voucherType) {
      applyVoucherType(nextType, true);
    }
  }, [route?.params?.voucherType, route?.params?.initialType, route?.params?.defaultType]);

  // Initial and on-type change loader
  useEffect(() => {
    loadAccountsAndNextNo(voucherType);
  }, [voucherType]);

  const loadAccountsAndNextNo = async (type) => {
    try {
      const [cbRes, allRes] = await Promise.all([
        ledgersApi.list({ type: 'cashbank' }),
        ledgersApi.list()
      ]);

      const cbList = cbRes.ledgers || [];
      const allList = allRes.ledgers || [];

      setCashBankAccounts(cbList);
      setAllLedgers(allList);

      // Default Cash/Bank account
      if (cbList.length > 0) {
        setSelectedCashBank(cbList[0]);
      }

      // Filter second account based on active type
      configurePartiesForType(type, cbList, allList);

      // Load Next Voucher Number
      const numRes = await vouchersApi.getNextNumber(type);
      if (numRes && numRes.nextVoucherNo) {
        setVoucherNo(numRes.nextVoucherNo);
      }
    } catch (err) {
      console.warn('Voucher accounts load error:', err.message);
    }
  };

  const configurePartiesForType = (type, cbList, allList) => {
    if (type === VOUCHER_TYPES.RECEIPT) {
      // Debtors / Customers
      const debtors = allList.filter((l) => /debtor/i.test(l.group));
      const candidates = debtors.length > 0 ? debtors : allList.filter((l) => !/cash|bank/i.test(l.group));
      setPartyAccounts(candidates);
      setSelectedParty(candidates[0] || null);
    } else if (type === VOUCHER_TYPES.PAYMENT) {
      // Creditors / Suppliers / Expenses
      const creditorsAndExp = allList.filter((l) =>
        /creditor|expense|purchase/i.test(l.group)
      );
      const candidates = creditorsAndExp.length > 0 ? creditorsAndExp : allList.filter((l) => !/cash|bank/i.test(l.group));
      setPartyAccounts(candidates);
      setSelectedParty(candidates[0] || null);
    } else {
      // Contra: another Cash or Bank account
      setPartyAccounts(cbList);
      if (cbList.length > 1) {
        setSelectedParty(cbList[1]);
      } else {
        setSelectedParty(null);
      }
    }
  };

  const applyVoucherType = (newType, resetForm = true) => {
    setVoucherType(newType);
    setErrors({});
    if (resetForm) {
      setAmount('');
      setNarration('');
    }
    configurePartiesForType(newType, cashBankAccounts, allLedgers);
    vouchersApi.getNextNumber(newType).then((res) => {
      if (res && res.nextVoucherNo) setVoucherNo(res.nextVoucherNo);
    }).catch(() => {});
  };

  const handleTabSwitch = (idx) => {
    const types = [VOUCHER_TYPES.RECEIPT, VOUCHER_TYPES.PAYMENT, VOUCHER_TYPES.CONTRA];
    const targetType = types[idx];
    if (targetType === voucherType) return;

    const hasData = amount.trim().length > 0 || narration.trim().length > 0;
    if (hasData) {
      Alert.alert(
        'Switch Voucher Type?',
        t('switchVoucherConfirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('confirm'),
            style: 'destructive',
            onPress: () => applyVoucherType(targetType, true)
          }
        ]
      );
    } else {
      applyVoucherType(targetType, true);
    }
  };

  const addChipAmount = (addVal) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addVal));
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
  };

  const handleSave = async () => {
    const errs = {};
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      errs.amount = 'Please enter a valid amount greater than zero';
    }
    if (!selectedCashBank) {
      errs.cashBank = 'Please select a source cash/bank account';
    }
    if (!selectedParty) {
      errs.party = voucherType === VOUCHER_TYPES.CONTRA ? 'Please select a destination account' : 'Please select a party/ledger account';
    }

    if (voucherType === VOUCHER_TYPES.CONTRA && selectedCashBank && selectedParty) {
      const fromId = selectedCashBank._id || selectedCashBank.id;
      const toId = selectedParty._id || selectedParty.id;
      if (String(fromId) === String(toId)) {
        errs.party = 'Source and Destination accounts cannot be the same';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Alert.alert('Incomplete Voucher', Object.values(errs)[0]);
      return;
    }

    let fromAccountId, toAccountId;
    if (voucherType === VOUCHER_TYPES.RECEIPT) {
      // Receipt: Debit Cash/Bank (toAccount), Credit Customer (fromAccount)
      toAccountId = selectedCashBank._id || selectedCashBank.id;
      fromAccountId = selectedParty._id || selectedParty.id;
    } else if (voucherType === VOUCHER_TYPES.PAYMENT) {
      // Payment: Debit Supplier/Expense (toAccount), Credit Cash/Bank (fromAccount)
      toAccountId = selectedParty._id || selectedParty.id;
      fromAccountId = selectedCashBank._id || selectedCashBank.id;
    } else {
      // Contra: Debit Destination Account (toAccount), Credit Source Account (fromAccount)
      toAccountId = selectedParty._id || selectedParty.id;
      fromAccountId = selectedCashBank._id || selectedCashBank.id;
    }

    try {
      setSaving(true);
      const res = await vouchersApi.create({
        type: voucherType,
        date,
        fromAccountId,
        toAccountId,
        amount: val,
        narration,
        paymentMode
      });

      if (res.success) {
        const typeTitle = voucherType === VOUCHER_TYPES.RECEIPT ? t('receipt') : voucherType === VOUCHER_TYPES.PAYMENT ? t('payment') : t('contra');
        Alert.alert(
          'Voucher Saved!',
          `${typeTitle} voucher #${res.voucher?.voucherNo || voucherNo} of ₹${val.toLocaleString('en-IN')} has been posted to ledgers.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not post voucher');
    } finally {
      setSaving(false);
    }
  };

  const isReceipt = voucherType === VOUCHER_TYPES.RECEIPT;
  const isPayment = voucherType === VOUCHER_TYPES.PAYMENT;
  const isContra = voucherType === VOUCHER_TYPES.CONTRA;

  const headerTitle = isReceipt ? t('receiptEntry') : isPayment ? t('paymentEntry') : t('contraEntry');
  const badgeText = isReceipt ? 'RECEIPT' : isPayment ? 'PAYMENT' : 'CONTRA';
  const badgeColor = isReceipt ? '#2ECC71' : isPayment ? '#E74C3C' : '#3498DB';

  const firstAccountLabel = isContra ? t('fromAccount') : isReceipt ? t('depositInto') : t('payFrom');
  const secondAccountLabel = isContra ? t('toAccount') : isReceipt ? t('receivedFrom') : t('paidTo');

  // For Contra destination picker, filter out first selected account
  const filteredDestinationAccounts = isContra
    ? cashBankAccounts.filter((a) => String(a._id || a.id) !== String(selectedCashBank?._id || selectedCashBank?.id))
    : partyAccounts;

  return (
    <View style={styles.container}>
      <Header
        title={headerTitle}
        subtitle={voucherNo || 'Generating voucher no...'}
        showBack
        onBack={() => navigation.goBack()}
        badgeText={badgeText}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 60 + insets.bottom }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* C4: Real Interactive Voucher Type Switcher */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>VOUCHER TYPE</Text>
          <SegmentedControl
            options={['Receipt (Inward)', 'Payment (Outward)', 'Contra (Transfer)']}
            selectedIndex={isReceipt ? 0 : isPayment ? 1 : 2}
            onChange={handleTabSwitch}
          />
        </View>

        {/* C3: Double-Entry Posting Preview Card */}
        <View style={styles.accountingPreviewBox}>
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>DEBIT (+) :</Text>
            <Text
              style={styles.previewAccount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
            >
              {isReceipt ? (selectedCashBank?.name || 'Cash / Bank') : (selectedParty?.name || 'Party / Account')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.goldPrimary} />
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>CREDIT (-) :</Text>
            <Text
              style={styles.previewAccount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
            >
              {isReceipt ? (selectedParty?.name || 'Customer / Party') : (selectedCashBank?.name || 'Cash / Bank')}
            </Text>
          </View>
        </View>

        {/* Account Pickers Card */}
        <View style={styles.card}>
          <Text style={[styles.fieldLabel, errors.cashBank && { color: colors.errorText }]}>
            {firstAccountLabel.toUpperCase()} * {errors.cashBank ? `(${errors.cashBank})` : ''}
          </Text>
          <TouchableOpacity
            style={[styles.accountBtn, errors.cashBank && { borderColor: colors.errorText, borderWidth: 1 }]}
            onPress={() => {
              if (errors.cashBank) setErrors((prev) => ({ ...prev, cashBank: null }));
              setShowCashBankPicker(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, !selectedCashBank && { color: colors.placeholder }]}>
                {selectedCashBank ? selectedCashBank.name : 'Select Cash / Bank...'}
              </Text>
              {selectedCashBank && (
                <Text style={styles.accountBal}>
                  Current Balance: {formatINR(selectedCashBank.currentBalance || 0)} {selectedCashBank.currentBalanceType || 'Dr'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
          </TouchableOpacity>

          {/* Opposite Account: Customer / Supplier / Transferee */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }, errors.party && { color: colors.errorText }]}>
            {secondAccountLabel.toUpperCase()} * {errors.party ? `(${errors.party})` : ''}
          </Text>
          <TouchableOpacity
            style={[styles.accountBtn, errors.party && { borderColor: colors.errorText, borderWidth: 1 }]}
            onPress={() => {
              if (errors.party) setErrors((prev) => ({ ...prev, party: null }));
              setShowPartyPicker(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, !selectedParty && { color: colors.placeholder }]}>
                {selectedParty ? selectedParty.name : isContra ? 'Select Destination Account...' : 'Select Party / Account...'}
              </Text>
              {selectedParty && (
                <Text style={styles.accountBal}>
                  Current Balance: {formatINR(selectedParty.currentBalance || 0)} {selectedParty.currentBalanceType || 'Dr'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
          </TouchableOpacity>
        </View>

        {/* Amount & Mode Card */}
        <View style={styles.card}>
          <CustomInput
            label="Amount (₹) *"
            placeholder="0.00"
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
            }}
            error={errors.amount}
            keyboardType="numeric"
            prefix="₹"
          />

          {/* Quick denomination chips */}
          <View style={styles.chipsRow}>
            {[5000, 10000, 25000, 50000, 100000].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.chip}
                onPress={() => addChipAmount(val)}
              >
                <Text style={styles.chipText}>+{val >= 100000 ? `${val / 100000}L` : `${val / 1000}K`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PAYMENT MODE</Text>
          <SegmentedControl
            options={['Cash', 'Bank Transfer', 'Cheque', 'UPI']}
            selectedIndex={['Cash', 'Bank Transfer', 'Cheque', 'UPI'].indexOf(paymentMode)}
            onChange={(idx) => setPaymentMode(['Cash', 'Bank Transfer', 'Cheque', 'UPI'][idx])}
          />

          <CustomInput
            label="Narration / Reference"
            placeholder={isReceipt ? 'e.g. Inward part payment against Bill #1001' : isPayment ? 'e.g. Outward payment for timber purchase' : 'e.g. Cash withdrawal / Bank deposit'}
            value={narration}
            onChangeText={setNarration}
            containerStyle={{ marginTop: 12 }}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save {badgeText} Voucher</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Account Picker Modals */}
      <PartyPickerModal
        visible={showCashBankPicker}
        onClose={() => setShowCashBankPicker(false)}
        parties={cashBankAccounts}
        title="Select Cash / Bank Account"
        onSelect={(acc) => {
          setSelectedCashBank(acc);
          if (isContra && selectedParty && String(selectedParty._id || selectedParty.id) === String(acc._id || acc.id)) {
            setSelectedParty(null);
          }
        }}
      />

      <PartyPickerModal
        visible={showPartyPicker}
        onClose={() => setShowPartyPicker(false)}
        parties={filteredDestinationAccounts}
        title={isContra ? 'Select Destination Account' : isReceipt ? 'Select Customer (Debtor)' : 'Select Supplier / Expense'}
        onSelect={(p) => setSelectedParty(p)}
        onAddNew={!isContra ? () => navigation.navigate('LedgerForm') : undefined}
      />
    </View>
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  accountingPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navyPrimary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  previewCol: {
    flex: 1
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldPrimary
  },
  previewAccount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    marginTop: 2
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  accountBal: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 8
  },
  chip: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.goldDark
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyDark
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
  }
});
