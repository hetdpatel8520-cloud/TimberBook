import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { reportsApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function CashBookScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCashBook();
  }, []);

  const fetchCashBook = async () => {
    try {
      setRefreshing(true);
      const res = await reportsApi.getCashBook();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('Cash book fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Cash Book"
        subtitle="Cash in Hand Register"
        showBack
        onBack={() => navigation.goBack()}
        badgeText="DAILY"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading cash register...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchCashBook}
              colors={[colors.goldPrimary]}
              tintColor={colors.goldPrimary}
            />
          }
        >
          {/* Summary KPI Banner */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>OPENING CASH</Text>
                <Text style={styles.summaryVal}>{formatINR(data?.openingCash || 0)}</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL RECEIPTS</Text>
                <Text style={[styles.summaryVal, { color: colors.goldPrimary }]}>
                  +{formatINR(data?.totalReceipts || 0).replace('₹ ', '')}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryRow, { marginTop: 10 }]}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL PAYMENTS</Text>
                <Text style={[styles.summaryVal, { color: colors.goldLight }]}>
                  -{formatINR(data?.totalPayments || 0).replace('₹ ', '')}
                </Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>CLOSING CASH</Text>
                <Text style={[styles.summaryVal, { fontSize: 18, color: colors.white }]}>
                  {formatINR(data?.closingCash || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transactions List */}
          <Text style={styles.sectionTitle}>TRANSACTION MOVEMENTS</Text>

          {data?.entries?.length > 0 ? (
            data.entries.map((entry, idx) => {
              const isInflow = entry.inflow > 0;
              return (
                <View key={idx} style={styles.entryCard}>
                  <View style={styles.entryLeft}>
                    <View style={styles.entryHeaderRow}>
                      <Text style={styles.entryDate}>
                        {new Date(entry.date).toLocaleDateString('en-IN')}
                      </Text>
                      <View style={[styles.typeBadge, isInflow ? styles.inflowBadge : styles.outflowBadge]}>
                        <Text style={[styles.typeText, isInflow ? styles.inflowText : styles.outflowText]}>
                          {isInflow ? 'RECEIPT' : 'PAYMENT'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.particularsText}>{entry.particulars}</Text>
                    {entry.narration ? (
                      <Text style={styles.narrationText}>{entry.narration}</Text>
                    ) : null}
                  </View>

                  <View style={styles.entryRight}>
                    <Text style={[styles.amountText, isInflow ? styles.inflowAmount : styles.outflowAmount]}>
                      {isInflow ? `+${formatINR(entry.inflow)}` : `-${formatINR(entry.outflow)}`}
                    </Text>
                    <Text style={styles.balText}>Bal: {formatINR(entry.balance)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No cash transactions recorded yet.</Text>
            </View>
          )}
        </ScrollView>
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
    padding: 12,
    paddingBottom: 40
  },
  summaryCard: {
    backgroundColor: colors.navyPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  summaryCol: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    marginTop: 3
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.6
  },
  entryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  entryLeft: {
    flex: 1,
    paddingRight: 10
  },
  entryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  entryDate: {
    fontSize: 11,
    color: colors.textMuted
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3
  },
  inflowBadge: {
    backgroundColor: colors.goldSoft
  },
  outflowBadge: {
    backgroundColor: colors.surfaceBg
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700'
  },
  inflowText: {
    color: colors.navyDark
  },
  outflowText: {
    color: colors.textSecondary
  },
  particularsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  narrationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  entryRight: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800'
  },
  inflowAmount: {
    color: colors.navyPrimary
  },
  outflowAmount: {
    color: colors.goldDark
  },
  balText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted
  }
});
