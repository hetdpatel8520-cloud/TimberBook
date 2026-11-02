import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function CompanySwitcherModal({
  visible,
  onClose,
  onAddNew,
  onManage
}) {
  const { owner, company, companies, switchCompany } = useAuth();
  const [switchingId, setSwitchingId] = useState(null);

  const handleSelect = async (targetId) => {
    if (String(targetId) === String(company?._id)) {
      onClose();
      return;
    }

    try {
      setSwitchingId(targetId);
      await switchCompany(targetId);
      onClose();
    } catch (err) {
      Alert.alert('Switch Failed', err.message || 'Could not switch company.');
    } finally {
      setSwitchingId(null);
    }
  };

  const maxAllowed = 5;
  const canAddMore = (companies?.length || 0) < maxAllowed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Switch Company</Text>
              <Text style={styles.sheetSubtitle}>
                Select active profile for billing, stock & reports
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.slateGrey} />
            </TouchableOpacity>
          </View>

          {/* Owner Account Pill */}
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Ionicons name="person" size={16} color={colors.navyDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{owner?.fullName || 'Business Owner'}</Text>
              <Text style={styles.ownerContact}>{owner?.mobile} • {owner?.email}</Text>
            </View>
            <View style={styles.companyCountBadge}>
              <Text style={styles.companyCountText}>
                {companies?.length || 1}/{maxAllowed}
              </Text>
            </View>
          </View>

          {/* Companies List */}
          <ScrollView
            style={styles.companiesList}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {companies && companies.length > 0 ? (
              companies.map((c) => {
                const isActive = String(c._id) === String(company?._id);
                const isBusy = switchingId === c._id;

                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.companyItem,
                      isActive && styles.companyItemActive
                    ]}
                    onPress={() => handleSelect(c._id)}
                    disabled={!!switchingId}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.compIconCircle,
                        isActive && styles.compIconCircleActive
                      ]}
                    >
                      <Ionicons
                        name="business"
                        size={20}
                        color={isActive ? colors.goldPrimary : colors.slateGrey}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.compItemName,
                            isActive && styles.compItemNameActive
                          ]}
                          numberOfLines={1}
                        >
                          {c.name}
                        </Text>
                        {isActive ? (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>ACTIVE</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.compItemSub} numberOfLines={1}>
                        {c.businessType || 'Timber Trader'} • {c.city || c.state}
                      </Text>
                      {c.gstin ? (
                        <Text style={styles.compGstinText}>GSTIN: {c.gstin}</Text>
                      ) : null}
                    </View>

                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.goldPrimary} />
                    ) : isActive ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.goldPrimary} />
                    ) : (
                      <Ionicons name="radio-button-off" size={22} color={colors.borderDark} />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No companies found.</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.sheetActions}>
            {canAddMore ? (
              <TouchableOpacity
                style={styles.addCompanyBtn}
                onPress={() => {
                  onClose();
                  if (onAddNew) onAddNew();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.navyDark} style={{ marginRight: 6 }} />
                <Text style={styles.addCompanyBtnText}>Add Another Company</Text>
              </TouchableOpacity>
            ) : null}

            {onManage ? (
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => {
                  onClose();
                  onManage();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.manageBtnText}>Manage All Companies</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '80%'
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDark
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.slateGrey,
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  ownerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDark
  },
  ownerContact: {
    fontSize: 11,
    color: colors.slateGrey,
    marginTop: 1
  },
  companyCountBadge: {
    backgroundColor: '#FFFBEA',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  companyCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E'
  },
  companiesList: {
    maxHeight: 280
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10
  },
  companyItemActive: {
    borderColor: colors.goldPrimary,
    backgroundColor: '#FFFCF2'
  },
  compIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  compIconCircleActive: {
    backgroundColor: '#FFFBEA'
  },
  compItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDark,
    flexShrink: 1
  },
  compItemNameActive: {
    color: colors.navyDark,
    fontWeight: '800'
  },
  activePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },
  compItemSub: {
    fontSize: 11,
    color: colors.slateGrey,
    marginTop: 2
  },
  compGstinText: {
    fontSize: 10,
    color: colors.navyPrimary,
    fontWeight: '600',
    marginTop: 1
  },
  emptyState: {
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 13,
    color: colors.slateGrey
  },
  sheetActions: {
    marginTop: 8,
    gap: 8
  },
  addCompanyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldPrimary,
    borderRadius: 10,
    paddingVertical: 12
  },
  addCompanyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navyDark
  },
  manageBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  manageBtnText: {
    fontSize: 13,
    color: colors.navyPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline'
  }
});
