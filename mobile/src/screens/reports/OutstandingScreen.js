import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import { reportsApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';
import { useAuth } from '../../context/AuthContext';

export default function OutstandingScreen({ navigation }) {
  const { company } = useAuth();
  const [tabIndex, setTabIndex] = useState(0); // 0: Receivable, 1: Payable
  const [data, setData] = useState({ receivables: { count: 0, total: 0, items: [] }, payables: { count: 0, total: 0, items: [] } });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOutstanding();
  }, []);

  const fetchOutstanding = async () => {
    try {
      setRefreshing(true);
      const res = await reportsApi.getOutstanding();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('Outstanding fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('No Phone', 'This party has no phone number recorded.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleSendReminder = (item) => {
    const isReceivable = tabIndex === 0;
    const text = isReceivable
      ? `Dear ${item.name},\n\nThis is a gentle payment reminder from *${company?.name || 'Our Accounts Team'}*. Your current outstanding balance is *₹${Number(item.amountDue || 0).toLocaleString('en-IN')}*.\n\nKindly arrange for payment at your earliest convenience.\n\nThank you!`
      : `Payment follow-up: We have an outstanding payable of ₹${Number(item.amountDue || 0).toLocaleString('en-IN')} to ${item.name}.`;

    const cleanPhone = item.phone?.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'WhatsApp is not installed.');
    });
  };

  const activeGroup = tabIndex === 0 ? data.receivables : data.payables;
  const isReceivable = tabIndex === 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Outstanding Balances"
        subtitle={isReceivable ? 'Sundry Debtors (Receivables)' : 'Sundry Creditors (Payables)'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            `Receivables (${data.receivables.count})`,
            `Payables (${data.payables.count})`
          ]}
          selectedIndex={tabIndex}
          onChange={setTabIndex}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Checking overdue ledgers...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchOutstanding}
              colors={[colors.goldPrimary]}
              tintColor={colors.goldPrimary}
            />
          }
        >
          {activeGroup.items?.length > 0 ? (
            activeGroup.items.map((item) => (
              <View key={item.id} style={styles.partyCard}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyName}>{item.name}</Text>
                    <View style={styles.metaRow}>
                      {item.city ? (
                        <Text style={styles.metaText}>
                          <Ionicons name="location-outline" size={12} /> {item.city}
                        </Text>
                      ) : null}
                      <Text style={styles.metaText}>
                        <Ionicons name="time-outline" size={12} /> {item.creditDays || 30} days credit
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabel}>Outstanding Due</Text>
                    <Text style={[styles.amountDue, { color: isReceivable ? colors.navyPrimary : colors.goldDark }]}>
                      {formatINR(item.amountDue)}
                    </Text>
                  </View>
                </View>

                {/* Bottom Actions Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.phone)}
                  >
                    <Ionicons name="call" size={14} color={colors.navyPrimary} />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reminderBtn}
                    onPress={() => handleSendReminder(item)}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color={colors.white} />
                    <Text style={styles.reminderBtnText}>Send WhatsApp Reminder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={54} color={colors.goldPrimary} />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>No pending {isReceivable ? 'receivables' : 'payables'} found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Grand Total Bar */}
      <View style={styles.bottomTotalBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>
            TOTAL {isReceivable ? 'RECEIVABLE' : 'PAYABLE'}
          </Text>
          <Text style={styles.bottomCount}>
            {activeGroup.count} {isReceivable ? 'Parties' : 'Suppliers'}
          </Text>
        </View>
        <Text style={styles.bottomTotalAmount}>{formatINR(activeGroup.total)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  tabsContainer: {
    padding: 12,
    backgroundColor: colors.navyPrimary
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 90
  },
  partyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary
  },
  amountLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  amountDue: {
    fontSize: 16,
    fontWeight: '800'
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 10
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  reminderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6
  },
  reminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginTop: 10
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4
  },
  bottomTotalBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.navyPrimary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 2,
    borderTopColor: colors.goldPrimary
  },
  bottomTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight
  },
  bottomCount: {
    fontSize: 11,
    color: colors.white,
    marginTop: 1
  },
  bottomTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.goldPrimary
  }
});
