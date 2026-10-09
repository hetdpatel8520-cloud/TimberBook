import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { reportsApi } from '../../api/client';
import { useTranslation } from '../../i18n/LanguageContext';
import MetricCard from '../../components/MetricCard';
import { formatINR } from '../../utils/timberMath';

export default function AllReportsScreen({ navigation }) {
  const { company, financialYear } = useAuth();
  const { t } = useTranslation();

  const [metrics, setMetrics] = useState({
    todaySales: 0,
    monthSales: 0,
    totalReceivables: 0,
    totalPayables: 0,
    cashBalance: 0,
    bankBalance: 0,
    liquidTotal: 0,
    lowStockCount: 0,
    weeklySales: [
      { day: 'Mon', amount: 0 },
      { day: 'Tue', amount: 0 },
      { day: 'Wed', amount: 0 },
      { day: 'Thu', amount: 0 },
      { day: 'Fri', amount: 0 },
      { day: 'Sat', amount: 0 },
      { day: 'Sun', amount: 0 }
    ],
    lowStockItems: []
  });

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await reportsApi.getDashboard();
      if (res.success && res.metrics) {
        setMetrics((prev) => ({
          ...prev,
          ...res.metrics,
          weeklySales: res.metrics.salesTrend && res.metrics.salesTrend.length > 0
            ? res.metrics.salesTrend.map(st => ({ day: st.day, amount: st.total }))
            : (res.metrics.weeklySales || prev.weeklySales),
          lowStockItems: res.metrics.lowStockItems || []
        }));
      }
    } catch (err) {
      console.warn('AllReports fetch notice:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const maxWeeklySale = Math.max(...metrics.weeklySales.map((s) => s.amount), 1);
  const netDue = (metrics.totalReceivables || 0) - (metrics.totalPayables || 0);

  const reportModules = [
    {
      id: 'outstanding',
      title: t('outstanding', 'Outstanding Report'),
      subtitle: 'Customer Receivables & Supplier Payables aging with WhatsApp reminders',
      icon: 'time-outline',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      badge: 'URGENT',
      badgeColor: '#EF4444',
      onPress: () => navigation.navigate('Outstanding')
    },
    {
      id: 'cashbook',
      title: t('cashBook', 'Cash & Bank Book'),
      subtitle: 'Daily Cash in Hand & Bank account statements with running balance',
      icon: 'wallet-outline',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      badge: 'DAILY',
      badgeColor: '#10B981',
      onPress: () => navigation.navigate('CashBook')
    },
    {
      id: 'ledger',
      title: t('ledgerReport', 'Party Ledger Report'),
      subtitle: 'Individual customer / supplier statement of accounts with debit & credit',
      icon: 'reader-outline',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      badge: 'PDF',
      badgeColor: colors.goldPrimary,
      onPress: () => navigation.navigate('LedgerReport')
    },
    {
      id: 'sales_reg',
      title: t('salesRegister', 'GST Sales Register'),
      subtitle: 'Month-wise sales invoices, taxable value, CGST, SGST, IGST tax breakdown',
      icon: 'newspaper-outline',
      iconBg: '#F3E8FF',
      iconColor: '#7C3AED',
      badge: 'GSTR-1',
      badgeColor: '#8B5CF6',
      onPress: () => navigation.navigate('SalesRegister')
    },
    {
      id: 'purchase_reg',
      title: t('purchaseRegister', 'GST Purchase Register'),
      subtitle: 'Inward timber stock, supplier bills, Input Tax Credit (ITC) reconciliation',
      icon: 'file-tray-full-outline',
      iconBg: '#FCE7F3',
      iconColor: '#DB2777',
      badge: 'GSTR-2B',
      badgeColor: '#EC4899',
      onPress: () => navigation.navigate('PurchaseRegister')
    },
    {
      id: 'stock_alert',
      title: t('stockAlerts', 'Timber Stock & Inventory'),
      subtitle: 'Species, cut sizes, firewood lots stock balance & minimum reorder levels',
      icon: 'cube-outline',
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
      badge: `${metrics.lowStockItems.length || 0} ALERTS`,
      badgeColor: '#F59E0B',
      onPress: () => navigation.navigate('ItemList')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>All Reports & Finance</Text>
            <Text style={styles.headerSubtitle}>
              {company?.name || 'My Company'} • {financialYear?.name || 'FY 2026-27'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchDashboardMetrics}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={colors.goldPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboardMetrics}
            colors={[colors.goldPrimary]}
            tintColor={colors.goldPrimary}
          />
        }
      >
        {/* SECTION 1: FINANCE KPI OVERVIEW (MOVED FROM DASHBOARD) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>FINANCIAL METRICS & LIQUIDITY</Text>
          <Text style={styles.sectionBadge}>LIVE</Text>
        </View>

        {/* 4 KPI CARDS (2x2 Grid) */}
        <View style={styles.kpiRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <MetricCard
              title={t('todaysSales')}
              value={formatINR(metrics.todaySales)}
              subtitle="Cash & Credit"
              icon="cart-outline"
              isHighlight
              onPress={() => navigation.navigate('SalesRegister')}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <MetricCard
              title={t('cashBank')}
              value={formatINR(metrics.liquidTotal)}
              subtitle="Cash & Bank Balance"
              icon="wallet-outline"
              onPress={() => navigation.navigate('CashBook')}
            />
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <MetricCard
              title={t('receivables')}
              value={formatINR(metrics.totalReceivables)}
              subtitle="From Customers"
              icon="arrow-down-circle-outline"
              onPress={() => navigation.navigate('Outstanding')}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <MetricCard
              title={t('payables')}
              value={formatINR(metrics.totalPayables)}
              subtitle="To Timber Suppliers"
              icon="arrow-up-circle-outline"
              onPress={() => navigation.navigate('Outstanding')}
            />
          </View>
        </View>

        {/* 📊 DATA VISUALIZATION: 7-DAY SALES TREND */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trending-up" size={18} color={colors.goldPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.chartTitle}>{t('salesTrend')}</Text>
            </View>
            <Text style={styles.chartPeriod}>Last 7 Days</Text>
          </View>

          <View style={styles.barChartContainer}>
            {metrics.weeklySales.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.amount / maxWeeklySale) * 75));
              const isToday = idx === metrics.weeklySales.length - 1;
              return (
                <View key={idx} style={styles.barColumn}>
                  <Text style={styles.barValueText}>₹{(item.amount / 1000).toFixed(0)}k</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` },
                        isToday && styles.barFillToday
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDayText, isToday && styles.barDayTextToday]}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 📉 WORKING CAPITAL & DUE RATIO */}
        <View style={styles.ratioCard}>
          <View style={styles.ratioHeader}>
            <Text style={styles.ratioTitle}>Working Capital & Due Ratio</Text>
            <Text style={[styles.ratioNet, { color: netDue >= 0 ? '#059669' : '#DC2626' }]}>
              Net Due: {netDue >= 0 ? '+' : ''}{formatINR(netDue)}
            </Text>
          </View>

          {/* Visual split progress bar */}
          <View style={styles.splitBarContainer}>
            <View
              style={[
                styles.splitBarLeft,
                {
                  flex: Math.max(metrics.totalReceivables || 1, 1)
                }
              ]}
            />
            <View
              style={[
                styles.splitBarRight,
                {
                  flex: Math.max(metrics.totalPayables || 1, 1)
                }
              ]}
            />
          </View>

          <View style={styles.ratioLabels}>
            <View style={styles.ratioLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.navyDark }]} />
              <Text style={styles.legendText}>Receivables: {formatINR(metrics.totalReceivables)}</Text>
            </View>
            <View style={styles.ratioLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.goldPrimary }]} />
              <Text style={styles.legendText}>Payables: {formatINR(metrics.totalPayables)}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: ALL REPORTS DIRECTORY */}
        <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>ALL ACCOUNTING & GST REPORTS</Text>
          <Text style={styles.sectionCount}>{reportModules.length} Modules</Text>
        </View>

        <View style={styles.reportListContainer}>
          {reportModules.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.reportCard}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.reportIconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={24} color={item.iconColor} />
              </View>

              <View style={styles.reportTextContent}>
                <View style={styles.reportCardTopRow}>
                  <Text style={styles.reportCardTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={[styles.reportBadge, { backgroundColor: item.badgeColor + '20' }]}>
                      <Text style={[styles.reportBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.reportCardSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.navyDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: {
    marginRight: 12,
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.goldPrimary,
    fontWeight: '600',
    marginTop: 2
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.navyDark
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slateGrey
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDark
  },
  chartPeriod: {
    fontSize: 12,
    color: colors.slateGrey,
    fontWeight: '500'
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10
  },
  barColumn: {
    flex: 1,
    alignItems: 'center'
  },
  barValueText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.slateLight,
    marginBottom: 4
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.navyDark,
    borderRadius: 7
  },
  barFillToday: {
    backgroundColor: colors.goldPrimary
  },
  barDayText: {
    fontSize: 11,
    color: colors.slateGrey,
    marginTop: 6,
    fontWeight: '500'
  },
  barDayTextToday: {
    color: colors.navyDark,
    fontWeight: '800'
  },
  ratioCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  ratioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDark
  },
  ratioNet: {
    fontSize: 12,
    fontWeight: '700'
  },
  splitBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  splitBarLeft: {
    backgroundColor: colors.navyDark
  },
  splitBarRight: {
    backgroundColor: colors.goldPrimary
  },
  ratioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  ratioLegendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  legendText: {
    fontSize: 11,
    color: colors.slateGrey,
    fontWeight: '600'
  },
  reportListContainer: {
    gap: 10
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  reportIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  reportTextContent: {
    flex: 1
  },
  reportCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  reportCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDark
  },
  reportBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  reportBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  reportCardSubtitle: {
    fontSize: 12,
    color: colors.slateGrey,
    lineHeight: 16
  }
});
