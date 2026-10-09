import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { reportsApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function SalesRegisterScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRegister();
  }, []);

  const fetchRegister = async () => {
    try {
      setRefreshing(true);
      const res = await reportsApi.getSalesRegister();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('Sales register fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Sales Register"
        subtitle="GST Sales Breakdown"
        showBack
        onBack={() => navigation.goBack()}
        badgeText={`${data?.summary?.count || 0} BILLS`}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Aggregating sales register...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchRegister}
              colors={[colors.goldPrimary]}
              tintColor={colors.goldPrimary}
            />
          }
        >
          {/* Summary Box */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.col}>
                <Text style={styles.summaryLabel}>TAXABLE SALES</Text>
                <Text style={styles.summaryVal}>{formatINR(data?.summary?.totalTaxable || 0)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.summaryLabel}>TOTAL GST</Text>
                <Text style={[styles.summaryVal, { color: colors.goldPrimary }]}>
                  {formatINR(data?.summary?.totalTax || 0)}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.summaryLabel}>NET TURNOVER</Text>
                <Text style={[styles.summaryVal, { color: colors.white }]}>
                  {formatINR(data?.summary?.totalNet || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Bills List */}
          <Text style={styles.sectionTitle}>ALL TAX INVOICES</Text>

          {data?.records?.length > 0 ? (
            data.records.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('InvoicePreview', { invoiceId: bill.id })}
              >
                <View style={styles.billTopRow}>
                  <View>
                    <Text style={styles.billNo}>{bill.billNo}</Text>
                    <Text style={styles.partyName}>{bill.partyName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.billTotal}>{formatINR(bill.grandTotal)}</Text>
                    <Text style={styles.billDate}>{new Date(bill.date).toLocaleDateString('en-IN')}</Text>
                  </View>
                </View>

                <View style={styles.taxSplitRow}>
                  <Text style={styles.taxSplitText}>Taxable: {formatINR(bill.taxable)}</Text>
                  <Text style={styles.taxSplitText}>CGST: {formatINR(bill.cgst)}</Text>
                  <Text style={styles.taxSplitText}>SGST: {formatINR(bill.sgst)}</Text>
                  <Text style={styles.modeBadge}>{bill.mode.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sales bills found in this period.</Text>
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
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  col: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.goldLight,
    textTransform: 'uppercase'
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.6
  },
  billCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  billTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  billNo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  partyName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  billTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  billDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  taxSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border
  },
  taxSplitText: {
    fontSize: 10,
    color: colors.textMuted
  },
  modeBadge: {
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: colors.navyDark
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
