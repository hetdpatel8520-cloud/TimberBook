import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import PartyPickerModal from '../../components/PartyPickerModal';
import ItemPickerModal from '../../components/ItemPickerModal';
import { ledgersApi, itemsApi, purchasesApi } from '../../api/client';
import { calculateGst, calculateRoundOff, formatINR } from '../../utils/timberMath';
import { useResponsive } from '../../utils/responsive';

export default function PurchaseEntryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isSmall } = useResponsive();
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

  // Helper to create empty row
  const createEmptyPurchaseRow = () => ({
    itemId: null,
    description: '',
    hsn: '',
    qty: '',
    unit: 'CFT',
    rate: '',
    discPercent: '',
    taxPercent: null,
    amount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    total: 0
  });

  const [rows, setRows] = useState([createEmptyPurchaseRow()]);

  // Validation errors
  const [rowErrors, setRowErrors] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const clearRowError = (index, field) => {
    if (rowErrors[index] && rowErrors[index][field]) {
      setRowErrors((prev) => {
        const copy = { ...prev };
        if (copy[index]) {
          copy[index] = { ...copy[index] };
          delete copy[index][field];
        }
        return copy;
      });
    }
  };

  const loadData = async () => {
    try {
      const purchaseId = route?.params?.purchaseId;
      const [creditorsRes, itemsRes] = await Promise.all([
        ledgersApi.list({ type: 'creditors' }),
        itemsApi.list()
      ]);
      if (creditorsRes.ledgers) {
        setParties(creditorsRes.ledgers);
      }
      if (itemsRes.items) {
        setItemsMaster(itemsRes.items);
      }

      if (purchaseId) {
        const purRes = await purchasesApi.getById(purchaseId);
        if (purRes.purchase) {
          const pur = purRes.purchase;
          if (pur.mode) setMode(pur.mode);
          if (pur.supplierBillNo) setSupplierBillNo(pur.supplierBillNo);
          if (pur.vehicleNo) setVehicleNo(pur.vehicleNo);
          if (pur.date) setDate(pur.date.split('T')[0]);
          if (pur.partyId) {
            setParty(typeof pur.partyId === 'object' ? pur.partyId : { _id: pur.partyId, name: pur.partyName || 'Supplier' });
          }
          if (pur.items && pur.items.length > 0) {
            setRows(pur.items.map((it) => ({
              itemId: it.itemId || it.item || null,
              description: it.description || it.name || '',
              hsn: it.hsn || '',
              qty: it.qty !== undefined && it.qty !== null ? String(it.qty) : '',
              unit: it.unit || 'CFT',
              rate: it.rate !== undefined && it.rate !== null ? String(it.rate) : '',
              discPercent: it.discPercent !== undefined && it.discPercent !== null ? String(it.discPercent) : '',
              taxPercent: it.taxPercent !== undefined ? it.taxPercent : null,
              amount: it.amount || 0,
              cgstAmount: it.cgstAmount || 0,
              sgstAmount: it.sgstAmount || 0,
              igstAmount: it.igstAmount || 0,
              total: it.total || 0
            })));
          }
        }
      }
    } catch (err) {
      console.warn('Purchase data load error:', err.message);
    }
  };

  const selectItemForRow = (index, item) => {
    clearRowError(index, 'item');
    const updated = [...rows];
    const row = { ...updated[index] };
    row.itemId = item._id || item.id;
    row.description = item.name;
    row.hsn = item.hsn || '4407';
    row.unit = item.unit || 'CFT';
    if (!row.rate && (item.purchaseRate || item.saleRate)) {
      row.rate = String(item.purchaseRate || item.saleRate);
      clearRowError(index, 'rate');
    }
    if (row.taxPercent === null || row.taxPercent === undefined) {
      if (item.cgstRate !== undefined && (item.cgstRate + (item.sgstRate || 0)) > 0) {
        row.taxPercent = item.cgstRate + (item.sgstRate || 0);
        clearRowError(index, 'tax');
      }
    }
    updated[index] = row;
    recalculateRow(updated, index);
  };

  const updateRowField = (index, field, value) => {
    clearRowError(index, field);
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    recalculateRow(updated, index);
  };

  const recalculateRow = (rowsArr, index) => {
    const row = { ...rowsArr[index] };
    const qStr = (row.qty !== undefined && row.qty !== null ? String(row.qty) : '').trim();
    const rStr = (row.rate !== undefined && row.rate !== null ? String(row.rate) : '').trim();
    const dStr = (row.discPercent !== undefined && row.discPercent !== null ? String(row.discPercent) : '').trim();

    const qty = parseFloat(qStr) || 0;
    const rate = parseFloat(rStr) || 0;
    const disc = parseFloat(dStr) || 0;

    let amount = 0;
    if (row.itemId && qty > 0 && rate > 0) {
      let line = qty * rate;
      if (disc > 0) line -= (line * disc) / 100;
      amount = parseFloat(line.toFixed(2));
    }
    row.amount = amount;

    if (amount > 0 && row.taxPercent !== null && row.taxPercent !== undefined) {
      const isLocal = true;
      const tax = calculateGst(amount, row.taxPercent, isLocal);
      row.cgstAmount = tax.cgstAmount;
      row.sgstAmount = tax.sgstAmount;
      row.igstAmount = tax.igstAmount;
      row.total = parseFloat((amount + tax.taxTotal).toFixed(2));
    } else {
      row.cgstAmount = 0;
      row.sgstAmount = 0;
      row.igstAmount = 0;
      row.total = amount;
    }

    rowsArr[index] = row;
    setRows([...rowsArr]);
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyPurchaseRow()]);
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
    const newFormErrors = {};
    if (!party) {
      newFormErrors.party = 'Supplier required';
    }

    if (rows.length === 0) {
      Alert.alert('Items Required', 'Please add at least one timber item.');
      return;
    }

    const newRowErrors = {};
    let hasRowError = false;

    rows.forEach((row, idx) => {
      const errs = {};
      if (!row.itemId) errs.item = 'Select timber item';
      const q = parseFloat(row.qty);
      const r = parseFloat(row.rate);
      if (!row.qty || isNaN(q) || q <= 0) errs.qty = 'Enter quantity';
      if (!row.rate || isNaN(r) || r <= 0) errs.rate = 'Enter rate';
      if (row.taxPercent === null || row.taxPercent === undefined) errs.tax = 'Select GST slab';

      if (Object.keys(errs).length > 0) {
        newRowErrors[idx] = errs;
        hasRowError = true;
      }
    });

    setFormErrors(newFormErrors);
    setRowErrors(newRowErrors);

    if (newFormErrors.party) {
      Alert.alert('Supplier Required', 'Please select a supplier ledger.');
      return;
    }

    if (hasRowError) {
      Alert.alert('Incomplete Row(s)', 'Please fill all required item details, positive quantities/rates, and select GST slab.');
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
    <View style={styles.container}>
      <Header
        title="Purchase Entry"
        subtitle={party ? `${party.name} (${party.city || 'Supplier'})` : 'Select Supplier'}
        showBack
        onBack={() => navigation.goBack()}
        badgeText="INWARD"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 60 + insets.bottom }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>PURCHASE MODE</Text>
          <SegmentedControl
            options={['Credit (Supplier A/c)', 'Cash']}
            selectedIndex={mode === 'Credit' ? 0 : 1}
            onChange={(idx) => setMode(idx === 0 ? 'Credit' : 'Cash')}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }, formErrors.party && { color: colors.errorText }]}>
            SUPPLIER / CREDITOR * {formErrors.party ? `(${formErrors.party})` : ''}
          </Text>
          <TouchableOpacity
            style={[styles.partySelectBtn, formErrors.party && { borderColor: colors.errorText, borderWidth: 1 }]}
            onPress={() => {
              setFormErrors((prev) => ({ ...prev, party: null }));
              setShowPartyPicker(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.partyName, !party && { color: colors.placeholder }]}>
                {party ? party.name : 'Select supplier...'}
              </Text>
              {party && (
                <Text style={styles.partySub}>
                  {party.city} • Bal: {formatINR(party.currentBalance || 0)} {party.currentBalanceType || 'Cr'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.goldPrimary} />
          </TouchableOpacity>

          <View style={[styles.row, isSmall && { flexDirection: 'column' }]}>
            <CustomInput
              label="Supplier Bill No"
              placeholder="e.g. MSM/992"
              value={supplierBillNo}
              onChangeText={setSupplierBillNo}
              containerStyle={{ flex: isSmall ? undefined : 1, marginRight: isSmall ? 0 : 8, marginBottom: isSmall ? 8 : 0 }}
            />
            <CustomInput
              label="Vehicle No"
              placeholder="e.g. TN-43-1122"
              value={vehicleNo}
              onChangeText={setVehicleNo}
              autoCapitalize="characters"
              containerStyle={{ flex: isSmall ? undefined : 1 }}
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
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    styles.itemPickerTrigger,
                    rowErrors[index]?.item && { borderColor: colors.errorText, borderWidth: 1, borderRadius: 6, padding: 4 }
                  ]}
                  onPress={() => {
                    setActiveRowIndex(index);
                    setShowItemPicker(true);
                  }}
                >
                  <Text style={[styles.itemRowTitle, !row.description && { color: colors.placeholder }]}>
                    {index + 1}. {row.description || 'Tap to choose timber... *'}
                  </Text>
                  <Ionicons name="create-outline" size={16} color={colors.goldDark} />
                </TouchableOpacity>
                {rowErrors[index]?.item && (
                  <Text style={styles.inlineRowError}>{rowErrors[index].item}</Text>
                )}
              </View>

              <TouchableOpacity onPress={() => removeRow(index)} style={styles.deleteRowBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.errorText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.row, isSmall && { flexDirection: 'column' }]}>
              <CustomInput
                label={`Quantity (${row.unit})`}
                placeholder="50"
                value={row.qty}
                onChangeText={(v) => updateRowField(index, 'qty', v)}
                error={rowErrors[index]?.qty}
                keyboardType="numeric"
                containerStyle={{ flex: isSmall ? undefined : 1, marginRight: isSmall ? 0 : 8, marginBottom: isSmall ? 8 : 0 }}
              />
              <CustomInput
                label={`Purchase Rate / ${row.unit}`}
                placeholder="1100"
                value={row.rate}
                onChangeText={(v) => updateRowField(index, 'rate', v)}
                error={rowErrors[index]?.rate}
                keyboardType="numeric"
                prefix="₹"
                containerStyle={{ flex: isSmall ? undefined : 1 }}
              />
            </View>

            {/* Quick Tax Slab Selector */}
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: rowErrors[index]?.tax ? colors.errorText : colors.textSecondary, marginBottom: 5 }}>
                GST RATE SLAB {row.taxPercent === null || row.taxPercent === undefined ? '(Select slab *)' : `(${row.taxPercent}%)`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { label: '5% (Firewood)', rate: 5 },
                  { label: '12%', rate: 12 },
                  { label: '18% (Timber)', rate: 18 },
                  { label: '0%', rate: 0 }
                ].map((tax) => {
                  const isSel = row.taxPercent !== null && row.taxPercent !== undefined && row.taxPercent === tax.rate;
                  return (
                    <TouchableOpacity
                      key={tax.rate}
                      style={[styles.taxChip, isSel && styles.taxChipSelected]}
                      onPress={() => updateRowField(index, 'taxPercent', tax.rate)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.taxChipText, isSel && styles.taxChipTextSelected]}>
                        {tax.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {rowErrors[index]?.tax && (
                <Text style={styles.inlineRowError}>{rowErrors[index].tax}</Text>
              )}
            </View>

            <View style={styles.rowTotalBar}>
              <Text style={styles.rowGstText}>
                GST ({row.taxPercent !== null && row.taxPercent !== undefined ? `${row.taxPercent}%` : 'Unselected'}): {formatINR((row.cgstAmount || 0) + (row.sgstAmount || 0))}
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
            <Text
              style={styles.grandTotalValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={1.3}
            >
              {formatINR(grandTotal)}
            </Text>
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
    </View>
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
  inlineRowError: {
    fontSize: 11,
    color: colors.errorText,
    marginTop: 3,
    fontWeight: '500'
  },
  deleteRowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  taxChip: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  taxChipSelected: {
    backgroundColor: colors.goldPrimary,
    borderColor: colors.goldDark
  },
  taxChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyDark
  },
  taxChipTextSelected: {
    fontWeight: '700',
    color: colors.navyDark
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
