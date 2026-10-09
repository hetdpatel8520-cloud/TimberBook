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
import { itemsApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function ItemListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setRefreshing(true);
      const res = await itemsApi.list();
      if (res.items) {
        setItems(res.items);
      }
    } catch (err) {
      console.warn('Items error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = items.filter((i) => {
    const matchesSearch = !search.trim() ||
      (i.name && i.name.toLowerCase().includes(search.toLowerCase())) ||
      (i.hsn && i.hsn.toLowerCase().includes(search.toLowerCase())) ||
      (i.group && i.group.toLowerCase().includes(search.toLowerCase()));
    const matchesGroup = selectedGroup === 'All' || i.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const canGoBack = navigation.canGoBack?.() ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Timber Items"
        subtitle={`${filtered.length} Species / Stock Items`}
        showBack={canGoBack}
        onBack={() => {
          if (canGoBack) navigation.goBack();
          else navigation.navigate('HomeTab');
        }}
        rightIcon="add"
        onRightPress={() => navigation.navigate('ItemForm')}
      />

      {/* Masters Segment Switcher */}
      <View style={styles.masterTabRow}>
        <TouchableOpacity
          style={styles.masterTab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LedgerList')}
        >
          <Ionicons name="people-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.masterTabText}>Parties & Ledgers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.masterTab, styles.masterTabActive]} activeOpacity={0.8}>
          <Ionicons name="cube" size={16} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.masterTabTextActive}>Timber Stock</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search species, HSN, group..."
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

      {/* Group Filters */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {['All', 'Sawn Timber', 'Drum/Firewood', 'Logs', 'Offcuts', 'Plywood'].map((grp) => {
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
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Checking timber stock levels...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchItems}
              colors={[colors.goldPrimary]}
              tintColor={colors.goldPrimary}
            />
          }
          renderItem={({ item }) => {
            const isLow = (item.currentStock || 0) <= (item.reorderLevel || 0);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ItemForm', { itemId: item._id })}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.badgesRow}>
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupBadgeText}>{item.group}</Text>
                    </View>
                    <Text style={styles.metaText}>HSN: {item.hsn || '4407'}</Text>
                    <Text style={styles.metaText}>Unit: {item.unit}</Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.rateText}>{formatINR(item.saleRate || 0)} / {item.unit}</Text>
                  <View style={[styles.stockBadge, isLow ? styles.lowStockBadge : null]}>
                    <Ionicons
                      name={isLow ? 'alert-circle' : 'cube-outline'}
                      size={12}
                      color={isLow ? colors.errorText : colors.navyDark}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.stockText, isLow ? styles.lowStockText : null]}>
                      {item.currentStock || 0} {item.unit}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.borderDark} />
              <Text style={styles.emptyText}>No timber items match your search.</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ItemForm')}
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap'
  },
  groupBadge: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted
  },
  cardRight: {
    alignItems: 'flex-end'
  },
  rateText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldDark
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4
  },
  lowStockBadge: {
    backgroundColor: colors.errorBg
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyPrimary
  },
  lowStockText: {
    color: colors.errorText
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyText: {
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
