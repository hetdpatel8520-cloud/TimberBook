import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import PartyPickerModal from '../../components/PartyPickerModal';
import { ledgersApi, reportsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/timberMath';

export default function LedgerReportScreen({ navigation }) {
  const { company } = useAuth();
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [showPartyPicker, setShowPartyPicker] = useState(false);

  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const res = await ledgersApi.list();
      if (res.ledgers) {
        setParties(res.ledgers);
        if (res.ledgers.length > 0 && !selectedParty) {
          const debtor = res.ledgers.find(l => /debtor/i.test(l.group)) || res.ledgers[0];
          setSelectedParty(debtor);
          loadStatement(debtor._id);
        }
      }
    } catch (err) {
      console.warn('Load parties error:', err.message);
    }
  };

  const loadStatement = async (partyId) => {
    if (!partyId) return;
    try {
      setLoading(true);
      const res = await reportsApi.getLedgerStatement(partyId);
      if (res.success) {
        setStatementData(res);
      }
    } catch (err) {
      Alert.alert('Report Error', err.message || 'Could not fetch statement');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!statementData || !selectedParty) return;
    const p = selectedParty;
    const text = `*STATEMENT OF ACCOUNT — ${company?.name ? company.name.toUpperCase() : 'STATEMENT'}*\n` +
      `Party: ${p.name}\n` +
      `City: ${p.city || 'Local'}\n` +
      `Closing Balance: ₹${Math.abs(statementData.closingBalance).toLocaleString('en-IN')} ${statementData.closingBalance >= 0 ? 'Dr' : 'Cr'}\n\n` +
      `Please verify and clear any outstanding amounts at your earliest convenience.\nThank you!`;

    const phone = p.phone?.replace(/[^0-9]/g, '');
    const url = phone
      ? `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'WhatsApp is not installed.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Ledger Statement"
        subtitle={selectedParty?.name || 'Statement of Accounts'}
        showBack
        onBack={() => navigation.goBack()}
        rightIcon="logo-whatsapp"
        onRightPress={handleShareWhatsApp}
      />

      <View style={styles.pickerBar}>
        <TouchableOpacity
          style={styles.partySelectBtn}
          onPress={() => setShowPartyPicker(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.selectLabel}>SELECTED PARTY / ACCOUNT</Text>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedParty ? `${selectedParty.name} (${selectedParty.city || selectedParty.group})` : 'Select Party...'}
            </Text>
          </View>
          <Ionicons name="swap-vertical" size={20} color={colors.goldPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Computing running balance...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Opening Balance Card */}
          <View style={styles.openingCard}>
            <View>
              <Text style={styles.cardSubTitle}>OPENING BALANCE</Text>
              <Text style={styles.cardSubNote}>As of start of financial year</Text>
            </View>
            <Text style={styles.openingAmount}>
              {formatINR(statementData?.ledger?.openingBalance || 0)} {statementData?.ledger?.openingBalanceType || 'Dr'}
            </Text>
          </View>

          {/* Statement Table */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 70 }]}>Date</Text>
              <Text style={[styles.th, { flex: 1 }]}>Particulars</Text>
              <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Debit (₹)</Text>
              <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Credit (₹)</Text>
              <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Balance (₹)</Text>
            </View>

            {statementData?.statement?.length > 0 ? (
              statementData.statement.map((row, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.altRow : null]}>
                  <Text style={[styles.td, { width: 70, fontSize: 11 }]}>
                    {new Date(row.date).toLocaleDateString('en-IN')}
                  </Text>
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text style={styles.rowType} numberOfLines={1}>{row.voucherType}</Text>
                    <Text style={styles.rowNo} numberOfLines={1}>#{row.voucherNo}</Text>
                  </View>
                  <Text style={[styles.td, { width: 70, textAlign: 'right', color: row.debit > 0 ? colors.navyPrimary : colors.textMuted }]}>
                    {row.debit > 0 ? formatINR(row.debit).replace('₹ ', '') : '-'}
                  </Text>
                  <Text style={[styles.td, { width: 70, textAlign: 'right', color: row.credit > 0 ? colors.goldDark : colors.textMuted }]}>
                    {row.credit > 0 ? formatINR(row.credit).replace('₹ ', '') : '-'}
                  </Text>
                  <Text style={[styles.td, { width: 80, textAlign: 'right', fontWeight: '700' }]}>
                    {formatINR(row.runningBalance).replace('₹ ', '')} {row.runningBalanceType}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyTableText}>No transactions in selected period</Text>
              </View>
            )}
          </View>

          {/* Closing Balance Card */}
          <View style={styles.closingCard}>
            <View>
              <Text style={styles.closingTitle}>CLOSING BALANCE</Text>
              <Text style={styles.closingSub}>
                Total Debit: {formatINR(statementData?.totalDebit || 0)} • Total Credit: {formatINR(statementData?.totalCredit || 0)}
              </Text>
            </View>
            <Text style={styles.closingAmount}>
              {formatINR(statementData?.closingBalance || 0)} {statementData?.statement?.[statementData?.statement?.length - 1]?.runningBalanceType || 'Dr'}
            </Text>
          </View>

          <TouchableOpacity style={styles.whatsappFloatBtn} onPress={handleShareWhatsApp}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Share Statement on WhatsApp</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <PartyPickerModal
        visible={showPartyPicker}
        onClose={() => setShowPartyPicker(false)}
        parties={parties}
        title="Choose Ledger Account"
        onSelect={(p) => {
          setSelectedParty(p);
          loadStatement(p._id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  pickerBar: {
    backgroundColor: colors.navyPrimary,
    paddingHorizontal: 12,
    paddingBottom: 12
  },
  partySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  selectLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginTop: 2
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40
  },
  openingCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  cardSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  cardSubNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  openingAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  tableCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.navyPrimary,
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border
  },
  altRow: {
    backgroundColor: '#F8FAFC'
  },
  td: {
    fontSize: 11,
    color: colors.textPrimary
  },
  rowType: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  rowNo: {
    fontSize: 10,
    color: colors.textMuted
  },
  emptyTable: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyTableText: {
    fontSize: 13,
    color: colors.textMuted
  },
  closingCard: {
    backgroundColor: colors.navyPrimary,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  closingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white
  },
  closingSub: {
    fontSize: 10,
    color: colors.goldLight,
    marginTop: 2
  },
  closingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  whatsappFloatBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 8,
    marginTop: 14
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  }
});
