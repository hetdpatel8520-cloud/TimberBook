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
import { reportsApi, syncApi } from '../../api/client';
import { useTranslation, AVAILABLE_LANGUAGES } from '../../i18n/LanguageContext';
import ActionTile from '../../components/ActionTile';

export default function DashboardScreen({ navigation }) {
  const { company, financialYear } = useAuth();
  const { t, language, setLanguage } = useTranslation();

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
    lowStockItems: [],
    counts: { parties: 0, items: 0, bills: 0 }
  });

  const [syncStatus, setSyncStatus] = useState({
    status: 'synced',
    label: 'Cloud Synced',
    storageMode: 'MongoDB Atlas'
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
    checkSync();
  }, []);

  const fetchDashboard = async () => {
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
      console.warn('Dashboard fetch notice:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const checkSync = async () => {
    try {
      const res = await syncApi.getStatus();
      if (res.success) {
        setSyncStatus({
          status: 'synced',
          label: 'Cloud Synced',
          storageMode: res.storageMode
        });
      }
    } catch (e) {
      setSyncStatus({
        status: 'offline',
        label: 'Offline Cache',
        storageMode: 'Local Storage'
      });
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Top Professional Fintech Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.companyTitle} numberOfLines={1}>{company?.name || 'My Company'}</Text>
          <View style={styles.headerSubtitleRow}>
            {/* Clickable Financial Year Badge */}
            <TouchableOpacity
              style={styles.fyBadge}
              onPress={() => navigation.navigate('FinancialYear')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={11} color={colors.navyDark} style={{ marginRight: 4 }} />
              <Text style={styles.fyBadgeText}>{financialYear?.name || 'FY 2026-27'}</Text>
              <Ionicons name="chevron-down" size={11} color={colors.navyDark} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {/* Cloud Sync Status Indicator Pill */}
            <View style={styles.syncPill}>
              <View
                style={[
                  styles.syncDot,
                  syncStatus.status === 'synced' ? styles.syncDotGreen : styles.syncDotYellow
                ]}
              />
              <Text style={styles.syncPillText}>{syncStatus.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Quick Language Toggle */}
          <View style={styles.langSwitch}>
            {AVAILABLE_LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[styles.langChip, language === l.code && styles.langChipActive]}
              >
                <Text style={[styles.langChipText, language === l.code && styles.langChipTextActive]}>
                  {l.code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('SettingsTab')}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboard}
            colors={[colors.goldPrimary]}
            tintColor={colors.goldPrimary}
          />
        }
      >
        {/* Onboarding Empty-State Quick-Start Banner */}
        {(!metrics.counts || (metrics.counts.bills === 0 && metrics.counts.items === 0)) && (
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingHeader}>
              <View style={styles.onboardingIconCircle}>
                <Ionicons name="sparkles" size={20} color={colors.navyDark} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.onboardingTitle}>Welcome to Your Account</Text>
                <Text style={styles.onboardingSubtitle}>Get started with your company in 3 simple steps:</Text>
              </View>
            </View>

            <View style={styles.onboardingSteps}>
              <TouchableOpacity
                style={styles.onboardingStepBtn}
                onPress={() => navigation.navigate('LedgerForm')}
                activeOpacity={0.8}
              >
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepActionTitle}>Add Your First Party</Text>
                  <Text style={styles.stepActionDesc}>Customer, Sawmill Client, or Timber Supplier</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.onboardingStepBtn}
                onPress={() => navigation.navigate('ItemForm')}
                activeOpacity={0.8}
              >
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepActionTitle}>Add Your First Timber Item</Text>
                  <Text style={styles.stepActionDesc}>Logs, Sawn Planks, Firewood with CFT/CBM rates</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.onboardingStepBtn}
                onPress={() => navigation.navigate('BillEntry')}
                activeOpacity={0.8}
              >
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepActionTitle}>Create Your First Bill</Text>
                  <Text style={styles.stepActionDesc}>GST Tax Invoice with auto CFT/CBM & WhatsApp PDF</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* 📊 FINANCE REPORT DASHBOARD HERO BANNER */}
        <TouchableOpacity
          style={styles.financeHeroCard}
          onPress={() => navigation.navigate('AllReports')}
          activeOpacity={0.85}
        >
          <View style={styles.financeHeroContent}>
            <View style={styles.financeHeroIconBox}>
              <Ionicons name="pie-chart" size={24} color={colors.goldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.financeHeroTitle}>Finance Report Dashboard</Text>
                <View style={styles.financeHeroBadge}>
                  <Text style={styles.financeHeroBadgeText}>REPORTS</Text>
                </View>
              </View>
              <Text style={styles.financeHeroSubtitle}>
                Sales trend, debtors, creditors, cash & bank balance
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.goldPrimary} />
        </TouchableOpacity>


        {/* ⚠️ LOW STOCK ALERTS BANNER */}
        {metrics.lowStockItems && metrics.lowStockItems.length > 0 && (
          <View style={styles.stockAlertCard}>
            <View style={styles.stockAlertHeader}>
              <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.stockAlertTitle}>{t('stockAlerts')} ({metrics.lowStockItems.length})</Text>
              <TouchableOpacity
                style={{ marginLeft: 'auto' }}
                onPress={() => navigation.navigate('ItemList')}
              >
                <Text style={styles.stockAlertAction}>View Stock →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stockChipsRow}>
              {metrics.lowStockItems.map((item, i) => (
                <View key={i} style={styles.stockChip}>
                  <Text style={styles.stockChipName}>{item.name}</Text>
                  <Text style={styles.stockChipQty}>
                    {item.stock} {item.unit} (Min: {item.min})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 1. ENTRY TILES */}
        <Text style={styles.sectionHeading}>{t('quickEntry').toUpperCase()}</Text>
        <View style={styles.tilesGrid}>
          <ActionTile
            title={t('billInvoice')}
            subtitle="GST Tax Invoice"
            icon="document-text"
            isPrimary
            badge="NEW"
            onPress={() => navigation.navigate('BillEntry')}
          />
          <ActionTile
            title={t('purchase')}
            subtitle="Inward Stock"
            icon="cart"
            onPress={() => navigation.navigate('PurchaseEntry')}
          />
          <ActionTile
            title={t('receipt')}
            subtitle="Customer Inflow"
            icon="arrow-down-circle"
            onPress={() => navigation.navigate('VoucherEntry', { initialType: 'Receipt' })}
          />
          <ActionTile
            title={t('payment')}
            subtitle="Supplier Outflow"
            icon="arrow-up-circle"
            onPress={() => navigation.navigate('VoucherEntry', { initialType: 'Payment' })}
          />
          <ActionTile
            title={t('contra')}
            subtitle="Bank ↔ Cash"
            icon="swap-horizontal"
            onPress={() => navigation.navigate('VoucherEntry', { initialType: 'Contra' })}
          />
        </View>

        {/* 2. REPORT TILES */}
        <Text style={styles.sectionHeading}>{t('reports').toUpperCase()}</Text>
        <View style={styles.tilesGrid}>
          <ActionTile
            title="Finance Dashboard"
            subtitle="All Reports & Analytics"
            icon="bar-chart"
            isPrimary
            badge="ALL"
            onPress={() => navigation.navigate('AllReports')}
          />
          <ActionTile
            title={t('ledgerReport')}
            subtitle="Party Statement"
            icon="reader-outline"
            onPress={() => navigation.navigate('LedgerReport')}
          />
          <ActionTile
            title={t('cashBook')}
            subtitle="Daily Register"
            icon="book-outline"
            onPress={() => navigation.navigate('CashBook')}
          />
          <ActionTile
            title={t('outstanding')}
            subtitle="Receivables / Payables"
            icon="time-outline"
            badge="REMIND"
            onPress={() => navigation.navigate('Outstanding')}
          />
          <ActionTile
            title={t('salesRegister')}
            subtitle="GST Sales Book"
            icon="newspaper-outline"
            onPress={() => navigation.navigate('SalesRegister')}
          />
          <ActionTile
            title={t('purchaseRegister')}
            subtitle="GST Purchase Book"
            icon="file-tray-full-outline"
            onPress={() => navigation.navigate('PurchaseRegister')}
          />
        </View>

        {/* 3. MASTER TILES */}
        <Text style={styles.sectionHeading}>{t('masters').toUpperCase()}</Text>
        <View style={styles.tilesGrid}>
          <ActionTile
            title={t('ledgerMaster')}
            subtitle="Customers & Suppliers"
            icon="people-outline"
            onPress={() => navigation.navigate('LedgerList')}
          />
          <ActionTile
            title={t('itemMaster')}
            subtitle="Timber Species & Sizes"
            icon="file-tray-stacked-outline"
            onPress={() => navigation.navigate('ItemList')}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button for Quick Bill Entry */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BillEntry')}
      >
        <Ionicons name="add" size={28} color={colors.navyDark} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  topHeader: {
    backgroundColor: colors.navyDark,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flex: 1
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8
  },
  fyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  fyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navyDark
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5
  },
  syncDotGreen: {
    backgroundColor: '#10B981'
  },
  syncDotYellow: {
    backgroundColor: '#F59E0B'
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 2
  },
  langChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12
  },
  langChipActive: {
    backgroundColor: colors.goldPrimary
  },
  langChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0'
  },
  langChipTextActive: {
    color: colors.navyDark
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 90
  },
  financeHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navyDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  financeHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  financeHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  financeHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white
  },
  financeHeroBadge: {
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  financeHeroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.navyDark
  },
  financeHeroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3
  },
  stockAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  stockAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  stockAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E'
  },
  stockAlertAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309'
  },
  stockChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  stockChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  stockChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F'
  },
  stockChipQty: {
    fontSize: 11,
    color: '#92400E'
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slateGrey,
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.7
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 10
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.goldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  onboardingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 160, 23, 0.45)',
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  onboardingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldPrimary
  },
  onboardingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  onboardingSubtitle: {
    fontSize: 12,
    color: colors.slateGrey,
    marginTop: 2
  },
  onboardingSteps: {
    gap: 8
  },
  onboardingStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  stepNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  stepNumText: {
    color: colors.goldPrimary,
    fontWeight: '800',
    fontSize: 12
  },
  stepActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDark
  },
  stepActionDesc: {
    fontSize: 11,
    color: colors.slateGrey,
    marginTop: 1
  }
});
