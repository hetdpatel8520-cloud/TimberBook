import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { financialYearsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';

export default function FinancialYearScreen({ navigation }) {
  const { financialYear, switchActiveFY } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [years, setYears] = useState([]);
  const [switchingId, setSwitchingId] = useState(null);

  // Add Year Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [startDate, setStartDate] = useState('2025-04-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [setAsCurrent, setSetAsCurrent] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const res = await financialYearsApi.list();
      if (res.success && res.financialYears) {
        setYears(res.financialYears);
      }
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to fetch financial years');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchYears();
  };

  const handleSwitchYear = (item) => {
    if (item.isCurrent || item._id === financialYear?._id) {
      Alert.alert(t('financialYears'), `${item.name} is already your active financial year.`);
      return;
    }

    Alert.alert(
      t('switchYear'),
      `Switch active accounting year to "${item.name}"?\n\nNew bills and transactions will be recorded in this year. Old years remain completely accessible anytime.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'default',
          onPress: async () => {
            try {
              setSwitchingId(item._id);
              const res = await financialYearsApi.switch(item._id);
              if (res.success && res.financialYear) {
                await switchActiveFY(res.financialYear);
                Alert.alert(t('success'), `${t('yearSwitchedSuccess')} ${res.financialYear.name}`);
                fetchYears();
              }
            } catch (err) {
              Alert.alert(t('error'), err.message || 'Failed to switch financial year');
            } finally {
              setSwitchingId(null);
            }
          }
        }
      ]
    );
  };

  const handleCreateYear = async () => {
    if (!newYearName.trim()) {
      Alert.alert(t('error'), 'Please enter a Financial Year name (e.g. FY 2026-27)');
      return;
    }

    try {
      setCreating(true);
      const res = await financialYearsApi.create({
        name: newYearName.trim(),
        startDate,
        endDate,
        setAsCurrent
      });

      if (res.success) {
        Alert.alert(t('success'), t('yearCreateSuccess'));
        setModalVisible(false);
        setNewYearName('');
        if (setAsCurrent && res.financialYear) {
          await switchActiveFY(res.financialYear);
        }
        fetchYears();
      }
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to create financial year');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('selectFinancialYear')}
        subtitle="Cloud Multi-Year Management"
        onBack={() => navigation.goBack()}
        rightIcon="add-circle-outline"
        onRightPress={() => setModalVisible(true)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.goldPrimary]} />}
      >
        {/* Cloud Notice Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="cloud-done-outline" size={22} color={colors.goldPrimary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Cloud Historical Integrity</Text>
            <Text style={styles.infoBannerText}>{t('cloudPreservedNote')}</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.goldPrimary} />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('financialYears')}</Text>
              <TouchableOpacity style={styles.addYearButton} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={16} color={colors.navyDark} />
                <Text style={styles.addYearButtonText}>Add New Year</Text>
              </TouchableOpacity>
            </View>

            {years.map((item) => {
              const isActive = item.isCurrent || item._id === financialYear?._id;
              const isSwitching = switchingId === item._id;

              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.yearCard, isActive && styles.yearCardActive]}
                  onPress={() => handleSwitchYear(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <Ionicons
                        name={isActive ? 'calendar' : 'calendar-outline'}
                        size={22}
                        color={isActive ? colors.goldPrimary : colors.slateGrey}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.yearName, isActive && styles.yearNameActive]}>{item.name}</Text>
                    </View>

                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.navyDark} style={{ marginRight: 4 }} />
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    ) : (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>SWITCH</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                      <Ionicons name="time-outline" size={14} color={colors.slateLight} style={{ marginRight: 5 }} />
                      <Text style={styles.dateText}>
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </Text>
                    </View>

                    {item.counters && (
                      <View style={styles.countersRow}>
                        <View style={styles.counterChip}>
                          <Text style={styles.counterLabel}>Invoices</Text>
                          <Text style={styles.counterVal}>{item.counters.invoice - 1000}</Text>
                        </View>
                        <View style={styles.counterChip}>
                          <Text style={styles.counterLabel}>Purchases</Text>
                          <Text style={styles.counterVal}>{item.counters.purchase - 500}</Text>
                        </View>
                        <View style={styles.counterChip}>
                          <Text style={styles.counterLabel}>Vouchers</Text>
                          <Text style={styles.counterVal}>
                            {(item.counters.receipt - 100) + (item.counters.payment - 100) + (item.counters.contra - 100)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {isSwitching ? (
                    <View style={styles.switchingContainer}>
                      <ActivityIndicator size="small" color={colors.goldPrimary} />
                      <Text style={styles.switchingText}>Switching context in cloud...</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add New Financial Year Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={22} color={colors.goldPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{t('addNewYear')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.slateGrey} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('yearName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. FY 2026-27"
                placeholderTextColor={colors.slateLight}
                value={newYearName}
                onChangeText={setNewYearName}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2026-04-01"
                  placeholderTextColor={colors.slateLight}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2027-03-31"
                  placeholderTextColor={colors.slateLight}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSetAsCurrent(!setAsCurrent)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={setAsCurrent ? 'checkbox' : 'square-outline'}
                size={22}
                color={setAsCurrent ? colors.goldPrimary : colors.slateLight}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.checkboxLabel}>{t('setAsActive')}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleCreateYear} disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyDark,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldPrimary,
    marginBottom: 3
  },
  infoBannerText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.slateGrey
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navyDark
  },
  addYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  addYearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDark,
    marginLeft: 4
  },
  yearCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  yearCardActive: {
    borderColor: colors.goldPrimary,
    backgroundColor: '#FFFCF2'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  yearName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navyDark
  },
  yearNameActive: {
    color: colors.navyDark
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navyDark
  },
  inactiveBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slateGrey
  },
  cardBody: {
    marginTop: 4
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  dateText: {
    fontSize: 13,
    color: colors.slateGrey,
    fontWeight: '500'
  },
  countersRow: {
    flexDirection: 'row',
    gap: 8
  },
  counterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  counterLabel: {
    fontSize: 11,
    color: colors.slateGrey
  },
  counterVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyDark
  },
  switchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  switchingText: {
    fontSize: 12,
    color: colors.goldPrimary,
    marginLeft: 8,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navyDark
  },
  formGroup: {
    marginBottom: 14
  },
  formRow: {
    flexDirection: 'row'
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slateGrey,
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.navyDark,
    backgroundColor: '#F8FAFC'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.navyDark,
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slateGrey
  },
  saveButton: {
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center'
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDark
  }
});
