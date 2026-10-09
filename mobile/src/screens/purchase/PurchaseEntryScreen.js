import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import PartyPickerModal from '../../components/PartyPickerModal';
import ItemPickerModal from '../../components/ItemPickerModal';
import { ledgersApi, itemsApi, purchasesApi } from '../../api/client';
import { calculateGst, calculateRoundOff, formatINR } from '../../utils/timberMath';

export default function PurchaseEntryScreen({ navigation }) {
  const [mode, setMode] = useState('Credit');
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');

  const [party, setParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [showPartyPicker, setShowPartyPicker] = useState(false);

  const [itemsMaster, setItemsMaster] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const [rows, setRows] = useState([
    {
      itemId: null,
      description: '',
      hsn: '4407',
      qty: '50',
      unit: 'CFT',
      rate: '1100',
      discPercent: '0',
      taxPercent: 18,
      amount: 55000,
      cgstAmount: 4950,
      sgstAmount: 4950,
      igstAmount: 0,
      total: 64900
    }
  ]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [creditorsRes, itemsRes] = await Promise.all([
        ledgersApi.list({ type: 'creditors' }),
        itemsApi.list()
      ]);
      if (creditorsRes.ledgers) {
        setParties(creditorsRes.ledgers);
        if (creditorsRes.ledgers.length > 0 && !party) {
          setParty(creditorsRes.ledgers[0]);
        }
      }
      if (itemsRes.items) {
        setItemsMaster(itemsRes.items);
        if (itemsRes.items.length > 0 && !rows[0].itemId) {
          selectItemForRow(0, itemsRes.items[0]);
        }
      }
    } catch (err) {
      console.warn('Purchase data load error:', err.message);
    }
  };

  const selectItemForRow = (index, item) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      itemId: item._id || item.id,
      description: item.name,
      hsn: item.hsn || '4407',
      unit: item.unit || 'CFT',
      rate: String(item.purchaseRate || item.saleRate || 1000)
    };
    recalculateRow(updated, index);
  };

  const updateRowField = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    recalculateRow(updated, index);
  };

  const recalculateRow = (rowsArr, index) => {
    const row = rowsArr[index];
    const qty = parseFloat(row.qty) || 1;
    const rate = parseFloat(row.rate) || 0;
    const disc = parseFloat(row.discPercent) || 0;

    let line = qty * rate;
    if (disc > 0) line -= (line * disc) / 100;
    row.amount = parseFloat(line.toFixed(2));

    const isLocal = true;
    const tax = calculateGst(row.amount, row.taxPercent || 18, isLocal);
    row.cgstAmount = tax.cgstAmount;
    row.sgstAmount = tax.sgstAmount;
    row.igstAmount = tax.igstAmount;
    row.total = parseFloat((row.amount + tax.taxTotal).toFixed(2));

    rowsArr[index] = row;
    setRows([...rowsArr]);
  };

  const addRow = () => {
    const defaultItem = itemsMaster[0] || {};
    const newRow = {
      itemId: defaultItem._id || null,
      description: defaultItem.name || 'Timber Item',
      hsn: defaultItem.hsn || '4407',
      qty: '50',
      unit: defaultItem.unit || 'CFT',
      rate: String(defaultItem.purchaseRate || 1000),
      discPercent: '0',
      taxPercent: 18,
      amount: 50000,
      cgstAmount: 4500,
      sgstAmount: 4500,
      igstAmount: 0,
      total: 59000
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      Alert.alert('Cannot Remove', 'At least one item row is required.');
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  rows.forEach((r) => {
    subtotal += r.amount || 0;
    cgstTotal += r.cgstAmount || 0;
    sgstTotal += r.sgstAmount || 0;
    igstTotal += r.igstAmount || 0;
  });

  const gross = subtotal + cgstTotal + sgstTotal + igstTotal;
  const { roundOff, grandTotal } = calculateRoundOff(gross);

  const handleSave = async () => {
    if (!party) {
      Alert.alert('Supplier Required', 'Please select a supplier ledger.');
      return;
    }

    try {
      setSaving(true);
      const res = await purchasesApi.create({
        mode,
        partyId: party._id || party.id,
        supplierBillNo,
        date,
        items: rows,
        vehicleNo
      });

      if (res.success) {
        Alert.alert(
          'Purchase Saved!',
          `Purchase #${res.purchase.purchaseNo} recorded and stock updated.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Purchase Entry"
        subtitle={party ? `${party.name} (${party.city || 'Supplier'})` : 'Select Supplier'}
        showBack
        onBack={() => navigation.goBack()}
        badgeText="INWARD"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>PURCHASE MODE</Text>
          <SegmentedControl
            options={['Credit (Supplier A/c)', 'Cash']}
            selectedIndex={mode === 'Credit' ? 0 : 1}
            onChange={(idx) => setMode(idx === 0 ? 'Credit' : 'Cash')}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>SUPPLIER / CREDITOR *</Text>
          <TouchableOpacity
            style={styles.partySelectBtn}
            onPress={() => setShowPartyPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{party ? party.name : 'Select supplier...'}</Text>
              {party && (
                <Text style={styles.partySub}>
                  {party.city} • Bal: {formatINR(party.currentBalance || 0)} {party.currentBalanceType || 'Cr'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.goldPrimary} />
          </TouchableOpacity>

          <View style={styles.row}>
            <CustomInput
              label="Supplier Bill No"
              placeholder="e.g. MSM/992"
              value={supplierBillNo}
              onChangeText={setSupplierBillNo}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="Vehicle No"
              placeholder="e.g. TN-43-1122"
              value={vehicleNo}
              onChangeText={setVehicleNo}
              autoCapitalize="characters"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Item Rows */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>INWARD TIMBER ITEMS ({rows.length})</Text>
          <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addRowBtnText}>Add Row</Text>
          </TouchableOpacity>
        </View>

        {rows.map((row, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <TouchableOpacity
                style={styles.itemPickerTrigger}
                onPress={() => {
                  setActiveRowIndex(index);
                  setShowItemPicker(true);
                }}
              >
                <Text style={styles.itemRowTitle}>
                  {index + 1}. {row.description || 'Tap to choose timber...'}
                </Text>
                <Ionicons name="create-outline" size={16} color={colors.goldDark} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => removeRow(index)} style={styles.deleteRowBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.errorText} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <CustomInput
                label={`Quantity (${row.unit})`}
                value={row.qty}
                onChangeText={(v) => updateRowField(index, 'qty', v)}
                keyboardType="numeric"
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <CustomInput
                label={`Purchase Rate / ${row.unit}`}
                value={row.rate}
                onChangeText={(v) => updateRowField(index, 'rate', v)}
                keyboardType="numeric"
                prefix="₹"
                containerStyle={{ flex: 1 }}
              />
            </View>

            <View style={styles.rowTotalBar}>
              <Text style={styles.rowGstText}>
                GST ({row.taxPercent || 18}%): {formatINR((row.cgstAmount || 0) + (row.sgstAmount || 0))}
              </Text>
              <Text style={styles.rowTotalText}>Total: {formatINR(row.total || 0)}</Text>
            </View>
          </View>
        ))}

        {/* Totals Summary */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>PURCHASE SUMMARY</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Taxable Amount:</Text>
            <Text style={styles.totalValue}>{formatINR(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Tax (ITC):</Text>
            <Text style={styles.totalValue}>{formatINR(cgstTotal + sgstTotal + igstTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Round Off:</Text>
            <Text style={styles.totalValue}>{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalBar}>
            <Text style={styles.grandTotalLabel}>NET PAYABLE:</Text>
            <Text style={styles.grandTotalValue}>{formatINR(grandTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save Purchase Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <PartyPickerModal
        visible={showPartyPicker}
        onClose={() => setShowPartyPicker(false)}
        parties={parties}
        title="Select Supplier / Creditor"
        onSelect={(p) => setParty(p)}
        onAddNew={() => navigation.navigate('LedgerForm')}
      />

      <ItemPickerModal
        visible={showItemPicker}
        onClose={() => setShowItemPicker(false)}
        items={itemsMaster}
        title="Select Timber Item"
        onSelect={(item) => {
          if (activeRowIndex !== null) {
            selectItemForRow(activeRowIndex, item);
          }
        }}
        onAddNew={() => navigation.navigate('ItemForm')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  partySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  partySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  row: {
    flexDirection: 'row'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    letterSpacing: 0.6
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  addRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 4
  },
  itemCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  itemPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  itemRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginRight: 6
  },
  deleteRowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowTotalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6
  },
  rowGstText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  rowTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  totalsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  totalsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginBottom: 10
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  grandTotalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.navyPrimary,
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  saveBtn: {
    backgroundColor: colors.navyPrimary,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldDark,
    marginTop: 8
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.7
  }
});
