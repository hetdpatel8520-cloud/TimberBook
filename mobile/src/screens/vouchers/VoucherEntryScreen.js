import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import PartyPickerModal from '../../components/PartyPickerModal';
import { ledgersApi, vouchersApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function VoucherEntryScreen({ route, navigation }) {
  const defaultType = route?.params?.defaultType || 'Receipt';
  const [voucherType, setVoucherType] = useState(defaultType); // 'Receipt', 'Payment', 'Contra'
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Accounts
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [partyAccounts, setPartyAccounts] = useState([]);

  const [selectedCashBank, setSelectedCashBank] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const [showCashBankPicker, setShowCashBankPicker] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadNextVoucherNo(voucherType);
  }, [voucherType]);

  const loadAccounts = async () => {
    try {
      const [cbRes, allLedgersRes] = await Promise.all([
        ledgersApi.list({ type: 'cashbank' }),
        ledgersApi.list()
      ]);

      if (cbRes.ledgers) {
        setCashBankAccounts(cbRes.ledgers);
        if (!selectedCashBank && cbRes.ledgers.length > 0) {
          setSelectedCashBank(cbRes.ledgers[0]);
        }
      }

      if (allLedgersRes.ledgers) {
        // Filter parties depending on voucher type
        if (voucherType === 'Receipt') {
          const debtors = allLedgersRes.ledgers.filter(l => /debtor/i.test(l.group));
          setPartyAccounts(debtors);
          if (debtors.length > 0) setSelectedParty(debtors[0]);
        } else if (voucherType === 'Payment') {
          const creditorsAndExp = allLedgersRes.ledgers.filter(l =>
            /creditor/i.test(l.group) || /expense/i.test(l.group)
          );
          setPartyAccounts(creditorsAndExp);
          if (creditorsAndExp.length > 0) setSelectedParty(creditorsAndExp[0]);
        } else {
          // Contra: another bank or cash account
          setPartyAccounts(cbRes.ledgers || []);
          if (cbRes.ledgers && cbRes.ledgers.length > 1) {
            setSelectedParty(cbRes.ledgers[1]);
          }
        }
      }
    } catch (err) {
      console.warn('Voucher accounts load error:', err.message);
    }
  };

  const loadNextVoucherNo = async (type) => {
    try {
      const res = await vouchersApi.getNextNumber(type);
      if (res.nextVoucherNo) setVoucherNo(res.nextVoucherNo);
    } catch (err) {
      console.warn('Next voucher no error:', err.message);
    }
  };

  const addChipAmount = (addVal) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addVal));
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount greater than zero.');
      return;
    }
    if (!selectedCashBank || !selectedParty) {
      Alert.alert('Accounts Required', 'Please select both accounts.');
      return;
    }

    let fromAccountId, toAccountId;
    if (voucherType === 'Receipt') {
      // Receipt: Debit Cash/Bank (toAccount), Credit Customer (fromAccount)
      toAccountId = selectedCashBank._id || selectedCashBank.id;
      fromAccountId = selectedParty._id || selectedParty.id;
    } else if (voucherType === 'Payment') {
      // Payment: Debit Party/Expense (toAccount), Credit Cash/Bank (fromAccount)
      toAccountId = selectedParty._id || selectedParty.id;
      fromAccountId = selectedCashBank._id || selectedCashBank.id;
    } else {
      // Contra: Transfer from source to destination
      fromAccountId = selectedCashBank._id || selectedCashBank.id;
      toAccountId = selectedParty._id || selectedParty.id;
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
        Alert.alert(
          'Voucher Saved!',
          `${voucherType} voucher #${res.voucher.voucherNo} of ₹${val.toLocaleString('en-IN')} has been posted to ledgers.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not post voucher');
    } finally {
      setSaving(false);
    }
  };

  const isReceipt = voucherType === 'Receipt';
  const isPayment = voucherType === 'Payment';
  const isContra = voucherType === 'Contra';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={`${voucherType} Entry`}
        subtitle={voucherNo}
        showBack
        onBack={() => navigation.goBack()}
        badgeText={voucherType.toUpperCase()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Type Switcher at Top */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>VOUCHER TYPE</Text>
          <SegmentedControl
            options={['Receipt (Inward)', 'Payment (Outward)', 'Contra (Transfer)']}
            selectedIndex={isReceipt ? 0 : isPayment ? 1 : 2}
            onChange={(idx) => {
              const types = ['Receipt', 'Payment', 'Contra'];
              setVoucherType(types[idx]);
            }}
          />
        </View>

        {/* Double-Entry Posting Preview Card */}
        <View style={styles.accountingPreviewBox}>
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>DEBIT (+) :</Text>
            <Text style={styles.previewAccount} numberOfLines={1}>
              {isReceipt ? selectedCashBank?.name : selectedParty?.name || 'Account'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.goldPrimary} />
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>CREDIT (-) :</Text>
            <Text style={styles.previewAccount} numberOfLines={1}>
              {isReceipt ? selectedParty?.name : selectedCashBank?.name || 'Account'}
            </Text>
          </View>
        </View>

        {/* Account Pickers Card */}
        <View style={styles.card}>
          {/* Primary Cash/Bank Account */}
          <Text style={styles.fieldLabel}>
            {isContra ? 'FROM CASH / BANK A/C *' : isReceipt ? 'DEPOSIT INTO (CASH / BANK) *' : 'PAID FROM (CASH / BANK) *'}
          </Text>
          <TouchableOpacity
            style={styles.accountBtn}
            onPress={() => setShowCashBankPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>
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
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            {isContra ? 'TO CASH / BANK A/C *' : isReceipt ? 'RECEIVED FROM (CUSTOMER) *' : 'PAID TO (SUPPLIER / EXPENSE) *'}
          </Text>
          <TouchableOpacity
            style={styles.accountBtn}
            onPress={() => setShowPartyPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>
                {selectedParty ? selectedParty.name : 'Select Party / Account...'}
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
            onChangeText={setAmount}
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
            placeholder="e.g. Inward part payment against Bill #1001"
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
              <Text style={styles.saveBtnText}>Save {voucherType} Voucher</Text>
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
        onSelect={(acc) => setSelectedCashBank(acc)}
      />

      <PartyPickerModal
        visible={showPartyPicker}
        onClose={() => setShowPartyPicker(false)}
        parties={partyAccounts}
        title={isContra ? 'Select Destination Account' : isReceipt ? 'Select Customer (Debtor)' : 'Select Supplier / Expense'}
        onSelect={(p) => setSelectedParty(p)}
        onAddNew={() => navigation.navigate('LedgerForm')}
      />
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
