import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatINR } from '../utils/timberMath';

export default function PartyPickerModal({
  visible,
  onClose,
  onSelect,
  parties = [],
  title = 'Select Party / Customer',
  onAddNew
}) {
  const [search, setSearch] = useState('');

  const filtered = parties.filter((p) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return Boolean(
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.city && p.city.toLowerCase().includes(term)) ||
      (p.phone && p.phone.includes(term)) ||
      (p.gstin && p.gstin.toLowerCase().includes(term))
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          {onAddNew ? (
            <TouchableOpacity onPress={onAddNew} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={colors.goldPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search party by name, city, phone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isDr = item.currentBalanceType === 'Dr';
            const balColor = isDr ? colors.navyPrimary : colors.goldDark;
            return (
              <TouchableOpacity
                style={styles.partyItem}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.partyName}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    {item.city ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                        <Ionicons name="location-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.cityText}>{item.city}</Text>
                      </View>
                    ) : null}
                    {item.phone ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="call-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.phoneText}>{item.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.gstin ? (
                    <Text style={styles.gstinText}>GST: {item.gstin}</Text>
                  ) : null}
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.balLabel}>Current Balance</Text>
                  <View style={[styles.balBadge, { backgroundColor: isDr ? colors.surfaceBg : colors.goldSoft }]}>
                    <Text style={[styles.balAmount, { color: balColor }]}>
                      {formatINR(item.currentBalance || 0)} {item.currentBalanceType || 'Dr'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.borderDark} />
              <Text style={styles.emptyText}>No matching parties found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  header: {
    backgroundColor: colors.navyPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 46
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24
  },
  partyItem: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border
  },
  itemLeft: {
    flex: 1,
    paddingRight: 10
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12
  },
  cityText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  phoneText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  gstinText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  itemRight: {
    alignItems: 'flex-end'
  },
  balLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3
  },
  balBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  balAmount: {
    fontSize: 13,
    fontWeight: '700'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted
  }
});
