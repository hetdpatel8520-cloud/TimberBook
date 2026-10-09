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
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { reportsApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function PurchaseRegisterScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRegister();
  }, []);

  const fetchRegister = async () => {
    try {
      setRefreshing(true);
      const res = await reportsApi.getPurchaseRegister();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('Purchase register error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Purchase Register"
        subtitle="Inward ITC Breakdown"
        showBack
        onBack={() => navigation.goBack()}
        badgeText={`${data?.summary?.count || 0} INWARDS`}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Aggregating purchase register...</Text>
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
                <Text style={styles.summaryLabel}>TAXABLE PURCHASES</Text>
                <Text style={styles.summaryVal}>{formatINR(data?.summary?.totalTaxable || 0)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.summaryLabel}>INPUT TAX (ITC)</Text>
                <Text style={[styles.summaryVal, { color: colors.goldPrimary }]}>
                  {formatINR(data?.summary?.totalTax || 0)}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.summaryLabel}>TOTAL PAYABLE</Text>
                <Text style={[styles.summaryVal, { color: colors.white }]}>
                  {formatINR(data?.summary?.totalNet || 0)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>ALL PURCHASE ENTRIES</Text>

          {data?.records?.length > 0 ? (
            data.records.map((pur) => (
              <View key={pur.id} style={styles.purCard}>
                <View style={styles.purTopRow}>
                  <View>
                    <Text style={styles.purNo}>{pur.purchaseNo}</Text>
                    <Text style={styles.supplierName}>{pur.supplierName}</Text>
                    {pur.supplierBillNo ? (
                      <Text style={styles.billRef}>Ref Bill: {pur.supplierBillNo}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.purTotal}>{formatINR(pur.grandTotal)}</Text>
                    <Text style={styles.purDate}>{new Date(pur.date).toLocaleDateString('en-IN')}</Text>
                  </View>
                </View>

                <View style={styles.taxSplitRow}>
                  <Text style={styles.taxSplitText}>Taxable: {formatINR(pur.taxable)}</Text>
                  <Text style={styles.taxSplitText}>ITC: {formatINR(pur.taxTotal)}</Text>
                  <Text style={styles.modeBadge}>{pur.mode.toUpperCase()}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No purchases found.</Text>
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
  purCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  purTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  purNo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  supplierName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  billRef: {
    fontSize: 11,
    color: colors.textMuted
  },
  purTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  purDate: {
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
