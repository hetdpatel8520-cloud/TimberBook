import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { ledgersApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function LedgerListScreen({ navigation }) {
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      setRefreshing(true);
      const res = await ledgersApi.list();
      if (res.ledgers) {
        setLedgers(res.ledgers);
      }
    } catch (err) {
      console.warn('Ledgers error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupFilter = (l) => {
    if (selectedGroup === 'All') return true;
    if (!l.group) return false;
    if (selectedGroup === 'Debtors') return /debtor/i.test(l.group);
    if (selectedGroup === 'Creditors') return /creditor/i.test(l.group);
    if (selectedGroup === 'Cash & Bank') return /cash/i.test(l.group) || /bank/i.test(l.group);
    if (selectedGroup === 'Expenses') return /expense/i.test(l.group);
    return true;
  };

  const filtered = ledgers.filter((l) => {
    const matchesSearch = !search.trim() ||
      (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
      (l.city && l.city.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.includes(search)) ||
      (l.gstin && l.gstin.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && groupFilter(l);
  });

  const canGoBack = navigation.canGoBack?.() ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Ledger Directory"
        subtitle={`${filtered.length} Accounts Found`}
        showBack={canGoBack}
        onBack={() => {
          if (canGoBack) navigation.goBack();
          else navigation.navigate('HomeTab');
        }}
        rightIcon="add"
        onRightPress={() => navigation.navigate('LedgerForm')}
      />

      {/* Masters Segment Switcher */}
      <View style={styles.masterTabRow}>
        <TouchableOpacity style={[styles.masterTab, styles.masterTabActive]} activeOpacity={0.8}>
          <Ionicons name="people" size={16} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.masterTabTextActive}>Parties & Ledgers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.masterTab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ItemList')}
        >
          <Ionicons name="cube-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.masterTabText}>Timber Stock</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by party name, city, phone, GSTIN..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {['All', 'Debtors', 'Creditors', 'Cash & Bank', 'Expenses'].map((grp) => {
            const isSelected = selectedGroup === grp;
            return (
              <TouchableOpacity
                key={grp}
                style={[styles.chip, isSelected ? styles.chipSelected : null]}
                onPress={() => setSelectedGroup(grp)}
              >
                <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>
                  {grp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading ledger accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchLedgers}
              colors={[colors.goldPrimary]}
              tintColor={colors.goldPrimary}
            />
          }
          renderItem={({ item }) => {
            const isDr = item.currentBalanceType === 'Dr';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('LedgerForm', { ledgerId: item._id })}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{item.group}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    {item.city ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                        <Text style={styles.metaText}>{item.city}</Text>
                      </View>
                    ) : null}
                    {item.phone ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="call-outline" size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                        <Text style={styles.metaText}>{item.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.balLabel}>Current Balance</Text>
                  <Text style={[styles.balText, { color: isDr ? colors.navyPrimary : colors.goldDark }]}>
                    {formatINR(item.currentBalance || 0)} {item.currentBalanceType || 'Dr'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.borderDark} style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.borderDark} />
              <Text style={styles.emptyText}>No accounts match your criteria</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('LedgerForm')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  masterTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8
  },
  masterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border
  },
  masterTabActive: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  masterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  masterTabTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary
  },
  chipsContainer: {
    marginVertical: 6
  },
  chipsScroll: {
    paddingHorizontal: 12,
    gap: 8
  },
  chip: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipSelected: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '700'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    padding: 12,
    paddingBottom: 80
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  cardLeft: {
    flex: 1,
    paddingRight: 10
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  groupBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted
  },
  cardRight: {
    alignItems: 'flex-end'
  },
  balLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  balText: {
    fontSize: 13,
    fontWeight: '800'
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
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.goldPrimary,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  }
});
