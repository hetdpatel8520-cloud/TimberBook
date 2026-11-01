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
import { ledgersApi, itemsApi, invoicesApi } from '../../api/client';
import {
  calculateCft,
  calculateCoreWoodCft,
  cftToCbm,
  calculateGst,
  calculateRoundOff,
  formatINR
} from '../../utils/timberMath';

export default function BillEntryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [billType, setBillType] = useState('Size'); // 'Size' | 'Drum' | 'Normal' | 'Core Wood'
  const [mode, setMode] = useState('Credit'); // 'Cash' | 'Credit'
  const [billNo, setBillNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNo, setOrderNo] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('');

  // Party
  const [party, setParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [showPartyPicker, setShowPartyPicker] = useState(false);

  // Items master
  const [itemsMaster, setItemsMaster] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  // Helper to create a fully empty row
  const createEmptyRow = (type = 'Size') => ({
    itemId: null,
    description: '',
    hsn: '',
    pieces: '',
    thickness: '',
    width: '',
    length: '',
    girth: '',
    qty: '',
    cft: 0,
    cbm: 0,
    rateUnit: type === 'Drum' ? 'Man' : 'CFT',
    unit: type === 'Drum' ? 'Man' : 'CFT',
    cftRate: '',
    cbmRate: '',
    rate: '',
    amount: 0,
    taxPercent: null,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    total: 0
  });

  // Line rows start fully empty by default
  const [rows, setRows] = useState([createEmptyRow('Size')]);

  // Validation errors
  const [rowErrors, setRowErrors] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Extra Details (collapsible)
  const [showExtra, setShowExtra] = useState(false);
  const [extra, setExtra] = useState({
    remark: '',
    poNo: '',
    transport: '',
    driverName: '',
    driverPhone: '',
    vehicleNo: '',
    lrNo: '',
    freightNote: '',
    postFreight: 'None',
    freightAmount: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
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

  const loadInitialData = async () => {
    try {
      const invoiceId = route?.params?.invoiceId;
      const [nextNumRes, partiesRes, itemsRes] = await Promise.all([
        invoiceId ? Promise.resolve({}) : invoicesApi.getNextNumber(),
        ledgersApi.list({ type: 'debtors' }),
        itemsApi.list()
      ]);

      if (partiesRes.ledgers) setParties(partiesRes.ledgers);
      if (itemsRes.items) setItemsMaster(itemsRes.items);

      if (invoiceId) {
        const invRes = await invoicesApi.getById(invoiceId);
        if (invRes.invoice) {
          const inv = invRes.invoice;
          if (inv.billType) setBillType(inv.billType);
          if (inv.billNo) setBillNo(inv.billNo);
          if (inv.challanNo) setChallanNo(inv.challanNo);
          if (inv.date) setDate(inv.date.split('T')[0]);
          if (inv.mode) setMode(inv.mode);
          if (inv.orderNo) setOrderNo(inv.orderNo);
          if (inv.deliveryAt) setDeliveryAt(inv.deliveryAt);
          if (inv.partyId) {
            setParty(typeof inv.partyId === 'object' ? inv.partyId : { _id: inv.partyId, name: inv.partyName || 'Customer' });
          }
          if (inv.extraDetails) setExtra((prev) => ({ ...prev, ...inv.extraDetails }));
          if (inv.items && inv.items.length > 0) {
            setRows(inv.items.map((it) => ({
              itemId: it.itemId || it.item || null,
              description: it.description || it.name || '',
              hsn: it.hsn || '',
              pieces: it.pieces !== undefined && it.pieces !== null ? String(it.pieces) : '',
              thickness: it.thickness !== undefined && it.thickness !== null ? String(it.thickness) : '',
              width: it.width !== undefined && it.width !== null ? String(it.width) : '',
              length: it.length !== undefined && it.length !== null ? String(it.length) : '',
              girth: it.girth !== undefined && it.girth !== null ? String(it.girth) : '',
              qty: it.qty !== undefined && it.qty !== null ? String(it.qty) : '',
              cft: it.cft || 0,
              cbm: it.cbm || 0,
              unit: it.unit || 'CFT',
              rateUnit: it.rateUnit || it.unit || 'CFT',
              cftRate: it.cftRate !== undefined && it.cftRate !== null ? String(it.cftRate) : '',
              cbmRate: it.cbmRate !== undefined && it.cbmRate !== null ? String(it.cbmRate) : '',
              rate: it.rate !== undefined && it.rate !== null ? String(it.rate) : '',
              amount: it.amount || 0,
              taxPercent: it.taxPercent !== undefined ? it.taxPercent : null,
              cgstAmount: it.cgstAmount || 0,
              sgstAmount: it.sgstAmount || 0,
              igstAmount: it.igstAmount || 0,
              total: it.total || 0
            })));
          }
        }
      } else {
        if (nextNumRes.nextBillNo) setBillNo(nextNumRes.nextBillNo);
      }
    } catch (err) {
      console.warn('Initial data load error:', err.message);
    }
  };

  const handleBillTypeChange = (type) => {
    setBillType(type);
    const isDrum = type === 'Drum';
    const updated = rows.map((r) => {
      const u = isDrum ? (r.unit === 'CFT' ? 'Man' : r.unit || 'Man') : (r.unit === 'Man' ? 'CFT' : r.unit || 'CFT');
      const hsn = isDrum ? (r.hsn === '4407' ? '4401' : r.hsn || '4401') : (r.hsn === '4401' ? '4407' : r.hsn || '4407');
      return {
        ...r,
        unit: u,
        rateUnit: u,
        hsn
      };
    });
    setRows(updated);
    setTimeout(() => {
      let current = [...updated];
      current.forEach((_, idx) => recalculateRow(current, idx));
    }, 50);
  };

  const selectItemForRow = (index, item) => {
    clearRowError(index, 'item');
    const updated = [...rows];
    const row = { ...updated[index] };
    row.itemId = item._id || item.id;
    row.description = item.name;
    const isFirewood = billType === 'Drum' || (item.group && /drum|firewood/i.test(item.group));
    row.hsn = item.hsn || (isFirewood ? '4401' : '4407');
    if (row.taxPercent === null || row.taxPercent === undefined) {
      if (item.cgstRate !== undefined && (item.cgstRate + (item.sgstRate || 0)) > 0) {
        row.taxPercent = item.cgstRate + (item.sgstRate || 0);
      } else {
        row.taxPercent = isFirewood ? 5 : 18;
      }
      clearRowError(index, 'tax');
    }
    const itemUnit = item.unit || (isFirewood ? 'Man' : 'CFT');
    row.unit = itemUnit;
    row.rateUnit = itemUnit;
    if (!row.rate && item.saleRate) {
      row.rate = String(item.saleRate);
      row.cftRate = String(item.saleRate);
      clearRowError(index, 'rate');
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
    const pStr = (row.pieces !== undefined && row.pieces !== null ? String(row.pieces) : '').trim();
    const tStr = (row.thickness !== undefined && row.thickness !== null ? String(row.thickness) : '').trim();
    const wStr = (row.width !== undefined && row.width !== null ? String(row.width) : '').trim();
    const lStr = (row.length !== undefined && row.length !== null ? String(row.length) : '').trim();
    const gStr = (row.girth !== undefined && row.girth !== null ? String(row.girth) : '').trim();
    const qStr = (row.qty !== undefined && row.qty !== null ? String(row.qty) : '').trim();
    const rStr = (row.rate !== undefined && row.rate !== null ? String(row.rate) : '').trim();

    const rate = parseFloat(rStr) || 0;
    let cft = 0;
    let cbm = 0;
    let amount = 0;

    const hasItem = !!row.itemId;

    if (billType === 'Size') {
      const p = parseFloat(pStr);
      const t = parseFloat(tStr);
      const w = parseFloat(wStr);
      const l = parseFloat(lStr);

      const hasValidDims = p > 0 && t > 0 && w > 0 && l > 0;
      if (hasValidDims) {
        cft = calculateCft(t, w, l, p);
        cbm = cftToCbm(cft);
      }
      row.cft = cft;
      row.cbm = cbm;

      if (hasItem && hasValidDims && rate > 0) {
        if (row.rateUnit === 'CBM' && cbm > 0) {
          amount = parseFloat((cbm * rate).toFixed(2));
        } else if (cft > 0) {
          amount = parseFloat((cft * rate).toFixed(2));
        } else {
          amount = parseFloat((p * rate).toFixed(2));
        }
      }
    } else if (billType === 'Core Wood') {
      const p = parseFloat(pStr);
      const g = parseFloat(gStr);
      const l = parseFloat(lStr);

      const hasValidDims = p > 0 && g > 0 && l > 0;
      if (hasValidDims) {
        cft = calculateCoreWoodCft(g, l, p);
        cbm = cftToCbm(cft);
      }
      row.cft = cft;
      row.cbm = cbm;

      if (hasItem && hasValidDims && rate > 0) {
        if (row.rateUnit === 'CBM' && cbm > 0) {
          amount = parseFloat((cbm * rate).toFixed(2));
        } else if (cft > 0) {
          amount = parseFloat((cft * rate).toFixed(2));
        } else {
          amount = parseFloat((p * rate).toFixed(2));
        }
      }
    } else {
      // Drum / Normal mode
      const q = parseFloat(qStr);
      if (hasItem && q > 0 && rate > 0) {
        amount = parseFloat((q * rate).toFixed(2));
      }
      row.cft = 0;
      row.cbm = 0;
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
    const newRow = createEmptyRow(billType);
    setRows((prev) => [...prev, newRow]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      Alert.alert('Cannot Remove', 'At least one item row is required.');
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  // Compute Totals
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let gross = 0;

  rows.forEach((r) => {
    subtotal += r.amount || 0;
    cgstTotal += r.cgstAmount || 0;
    sgstTotal += r.sgstAmount || 0;
    igstTotal += r.igstAmount || 0;
  });

  gross = subtotal + cgstTotal + sgstTotal + igstTotal;
  const { roundOff, grandTotal } = calculateRoundOff(gross);

  const handleSave = async (andShare = false) => {
    const newFormErrors = {};
    if (!party) {
      newFormErrors.party = 'Customer required';
    }

    if (rows.length === 0) {
      Alert.alert('Items Required', 'Please add at least one timber item.');
      return;
    }

    const newRowErrors = {};
    let hasRowError = false;

    rows.forEach((row, idx) => {
      const errs = {};
      if (!row.itemId) {
        errs.item = 'Select timber item';
      }

      if (billType === 'Size') {
        const p = parseFloat(row.pieces);
        const t = parseFloat(row.thickness);
        const w = parseFloat(row.width);
        const l = parseFloat(row.length);
        const r = parseFloat(row.rate);

        if (!row.pieces || isNaN(p) || p <= 0) errs.pieces = 'Enter pieces';
        if (!row.thickness || isNaN(t) || t <= 0) errs.thickness = 'Enter thick';
        if (!row.width || isNaN(w) || w <= 0) errs.width = 'Enter width';
        if (!row.length || isNaN(l) || l <= 0) errs.length = 'Enter length';
        if (!row.rate || isNaN(r) || r <= 0) errs.rate = 'Enter rate';
      } else if (billType === 'Core Wood') {
        const p = parseFloat(row.pieces);
        const g = parseFloat(row.girth);
        const l = parseFloat(row.length);
        const r = parseFloat(row.rate);

        if (!row.pieces || isNaN(p) || p <= 0) errs.pieces = 'Enter pieces';
        if (!row.girth || isNaN(g) || g <= 0) errs.girth = 'Enter girth';
        if (!row.length || isNaN(l) || l <= 0) errs.length = 'Enter length';
        if (!row.rate || isNaN(r) || r <= 0) errs.rate = 'Enter rate';
      } else {
        const q = parseFloat(row.qty);
        const r = parseFloat(row.rate);

        if (!row.qty || isNaN(q) || q <= 0) errs.qty = 'Enter quantity';
        if (!row.rate || isNaN(r) || r <= 0) errs.rate = 'Enter rate';
      }

      if (row.taxPercent === null || row.taxPercent === undefined) {
        errs.tax = 'Select GST slab';
      }

      if (Object.keys(errs).length > 0) {
        newRowErrors[idx] = errs;
        hasRowError = true;
      }
    });

    setFormErrors(newFormErrors);
    setRowErrors(newRowErrors);

    if (newFormErrors.party) {
      Alert.alert('Party Required', 'Please select a customer / party ledger.');
      return;
    }

    if (hasRowError) {
      Alert.alert('Incomplete Row(s)', 'Please fill all required item details, positive dimensions/rates, and select GST slab.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        billType,
        billNo: (billNo || '').trim(),
        challanNo,
        mode,
        partyId: party._id || party.id,
        date,
        orderNo,
        deliveryAt,
        items: rows.map((r) => ({
          ...r,
          unit: r.unit || r.rateUnit || (billType === 'Drum' ? 'Man' : 'CFT'),
          rateUnit: r.rateUnit || r.unit || (billType === 'Drum' ? 'Man' : 'CFT')
        })),
        extraDetails: extra
      };

      const res = await invoicesApi.create(payload);
      if (res.success) {
        if (andShare) {
          navigation.navigate('InvoicePreview', { invoiceId: res.invoice._id });
        } else {
          Alert.alert(
            'Invoice Saved!',
            `Invoice ${res.invoice.billNo} has been generated and ledger updated.`,
            [
              {
                text: 'View Tax Invoice',
                onPress: () => navigation.navigate('InvoicePreview', { invoiceId: res.invoice._id })
              },
              {
                text: 'Done',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="New Bill / Invoice"
        subtitle={party ? `${party.name} (${party.city || 'Local'})` : 'Select Customer'}
        showBack
        onBack={() => navigation.goBack()}
        badgeText={billNo}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 60 + insets.bottom }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bill Type Selector: Size / Drum / Normal */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>BILL TYPE</Text>
          <SegmentedControl
            options={['Size (Planks)', 'Drum / Firewood', 'Normal', 'Core Wood']}
            selectedIndex={billType === 'Size' ? 0 : billType === 'Drum' ? 1 : billType === 'Normal' ? 2 : 3}
            onChange={(idx) => {
              const types = ['Size', 'Drum', 'Normal', 'Core Wood'];
              handleBillTypeChange(types[idx]);
            }}
          />
        </View>

        {/* Party & General Header Details */}
        <View style={styles.card}>
          {/* Bill No & Date Row - Owner can change/edit Bill No directly */}
          <View style={[styles.row, { marginBottom: 4 }]}>
            <CustomInput
              label="BILL NO *"
              placeholder="e.g. 1"
              value={billNo}
              onChangeText={setBillNo}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="BILL DATE *"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>MODE</Text>
              <SegmentedControl
                options={['Credit', 'Cash']}
                selectedIndex={mode === 'Credit' ? 0 : 1}
                onChange={(idx) => setMode(idx === 0 ? 'Credit' : 'Cash')}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <CustomInput
                label="CHALLAN NO"
                placeholder="e.g. CH-101"
                value={challanNo}
                onChangeText={setChallanNo}
              />
            </View>
          </View>

          {/* Party Selector Button */}
          <Text style={[styles.fieldLabel, formErrors.party && { color: colors.errorText }]}>
            CUSTOMER / PARTY * {formErrors.party ? `(${formErrors.party})` : ''}
          </Text>
          <TouchableOpacity
            style={[styles.partySelectBtn, formErrors.party && { borderColor: colors.errorText, borderWidth: 1 }]}
            activeOpacity={0.7}
            onPress={() => {
              setFormErrors((prev) => ({ ...prev, party: null }));
              setShowPartyPicker(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.partySelectName, !party && { color: colors.placeholder }]}>
                {party ? party.name : 'Tap to select customer...'}
              </Text>
              {party && (
                <Text style={styles.partySelectSub}>
                  {party.city} • GST: {party.gstin || 'Unregistered'} • Bal: {formatINR(party.currentBalance || 0)} {party.currentBalanceType || 'Dr'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.goldPrimary} />
          </TouchableOpacity>

          <View style={styles.row}>
            <CustomInput
              label="ORDER NO"
              placeholder="e.g. PO-892"
              value={orderNo}
              onChangeText={setOrderNo}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="DELIVERY AT"
              placeholder="Site / City"
              value={deliveryAt}
              onChangeText={setDeliveryAt}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* ITEM ROWS SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>TIMBER ITEM ROWS ({rows.length})</Text>
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

              <TouchableOpacity
                onPress={() => removeRow(index)}
                style={styles.deleteRowBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.errorText} />
              </TouchableOpacity>
            </View>

            {/* If Size Mode: Dimensions inputs */}
            {billType === 'Size' ? (
              <View>
                <View style={styles.dimensionRow}>
                  <CustomInput
                    label="Pcs"
                    placeholder="10"
                    value={row.pieces}
                    onChangeText={(v) => updateRowField(index, 'pieces', v)}
                    error={rowErrors[index]?.pieces}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label='Thick (")'
                    placeholder="3"
                    value={row.thickness}
                    onChangeText={(v) => updateRowField(index, 'thickness', v)}
                    error={rowErrors[index]?.thickness}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label='Width (")'
                    placeholder="2"
                    value={row.width}
                    onChangeText={(v) => updateRowField(index, 'width', v)}
                    error={rowErrors[index]?.width}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label="Len (')"
                    placeholder="7"
                    value={row.length}
                    onChangeText={(v) => updateRowField(index, 'length', v)}
                    error={rowErrors[index]?.length}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                </View>

                {/* Calculated Volumes */}
                <View style={styles.volBanner}>
                  <Text style={styles.volText}>CFT: <Text style={styles.volBold}>{row.cft ? row.cft.toFixed(2) : 0}</Text></Text>
                  <Text style={styles.volText}>CBM: <Text style={styles.volBold}>{row.cbm ? row.cbm.toFixed(4) : '0.0000'}</Text></Text>
                  <TouchableOpacity
                    style={styles.rateUnitToggle}
                    onPress={() => {
                      const nextUnit = row.rateUnit === 'CFT' ? 'CBM' : 'CFT';
                      updateRowField(index, 'rateUnit', nextUnit);
                    }}
                  >
                    <Text style={styles.rateUnitToggleText}>Rate by {row.rateUnit}</Text>
                    <Ionicons name="swap-horizontal" size={14} color={colors.navyDark} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : billType === 'Core Wood' ? (
              /* Core Wood (Round Log / Quarter-Girth) Mode */
              <View>
                <View style={styles.dimensionRow}>
                  <CustomInput
                    label="Pcs"
                    placeholder="10"
                    value={row.pieces}
                    onChangeText={(v) => updateRowField(index, 'pieces', v)}
                    error={rowErrors[index]?.pieces}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1, marginRight: 6 }}
                  />
                  <CustomInput
                    label='Girth / Cir (")'
                    value={row.girth || ''}
                    placeholder="36"
                    onChangeText={(v) => updateRowField(index, 'girth', v)}
                    error={rowErrors[index]?.girth}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1.5, marginRight: 6 }}
                  />
                  <CustomInput
                    label="Len (')"
                    placeholder="7"
                    value={row.length}
                    onChangeText={(v) => updateRowField(index, 'length', v)}
                    error={rowErrors[index]?.length}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {/* Calculated Volumes */}
                <View style={styles.volBanner}>
                  <Text style={styles.volText}>Hoppus CFT: <Text style={styles.volBold}>{row.cft ? row.cft.toFixed(2) : 0}</Text></Text>
                  <Text style={styles.volText}>CBM: <Text style={styles.volBold}>{row.cbm ? row.cbm.toFixed(4) : '0.0000'}</Text></Text>
                  <TouchableOpacity
                    style={styles.rateUnitToggle}
                    onPress={() => {
                      const nextUnit = row.rateUnit === 'CFT' ? 'CBM' : 'CFT';
                      updateRowField(index, 'rateUnit', nextUnit);
                    }}
                  >
                    <Text style={styles.rateUnitToggleText}>Rate by {row.rateUnit}</Text>
                    <Ionicons name="swap-horizontal" size={14} color={colors.navyDark} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Drum / Firewood or Normal mode */
              <View>
                {/* Selectable Bill Unit Options */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.unitPickerLabel}>BILLING UNIT / રેટ યુનિટ *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Man', 'Kg', 'Ton', 'Quintal', 'CFT', 'Pcs'].map((u) => {
                      const isSelected = (row.rateUnit || row.unit || 'Man') === u;
                      return (
                        <TouchableOpacity
                          key={u}
                          style={[styles.unitChip, isSelected && styles.unitChipSelected]}
                          onPress={() => {
                            const updated = [...rows];
                            updated[index] = { ...updated[index], rateUnit: u, unit: u };
                            recalculateRow(updated, index);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.unitChipText, isSelected && styles.unitChipTextSelected]}>
                            {u === 'Man' ? 'Man (મણ)' : u === 'Kg' ? 'Kg (કિલો)' : u === 'Ton' ? 'Ton (ટન)' : u === 'Quintal' ? 'Quintal' : u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.row}>
                  <CustomInput
                    label={`Quantity / Weight (${row.rateUnit || row.unit || 'Man'})`}
                    placeholder="40"
                    value={row.qty}
                    onChangeText={(v) => updateRowField(index, 'qty', v)}
                    error={rowErrors[index]?.qty}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1.2, marginRight: 8 }}
                  />
                  <CustomInput
                    label="HSN Code"
                    placeholder="4401"
                    value={row.hsn}
                    onChangeText={(v) => updateRowField(index, 'hsn', v)}
                    containerStyle={{ flex: 0.8 }}
                  />
                </View>
              </View>
            )}

            {/* Rate & Line Amount */}
            <View style={styles.row}>
              <CustomInput
                label={`Rate / ${row.rateUnit || row.unit || 'Unit'} (₹)`}
                placeholder="2400"
                value={row.rate}
                onChangeText={(v) => updateRowField(index, 'rate', v)}
                error={rowErrors[index]?.rate}
                keyboardType="numeric"
                prefix="₹"
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <CustomInput
                label="Taxable Amount"
                value={row.amount ? formatINR(row.amount) : '₹0.00'}
                editable={false}
                containerStyle={{ flex: 1 }}
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

            {/* GST Split & Row Total */}
            <View style={styles.rowTotalBar}>
              <Text style={styles.rowGstText}>
                GST ({row.taxPercent !== null && row.taxPercent !== undefined ? `${row.taxPercent}%` : 'Unselected'}): {formatINR((row.cgstAmount || 0) + (row.sgstAmount || 0) + (row.igstAmount || 0))}
              </Text>
              <Text style={styles.rowTotalText}>Total: {formatINR(row.total || 0)}</Text>
            </View>
          </View>
        ))}

        {/* TOTALS CARD */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>BILL SUMMARY</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal (Taxable Value)</Text>
            <Text style={styles.totalValue}>{formatINR(subtotal)}</Text>
          </View>

          {cgstTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST (9%)</Text>
              <Text style={styles.totalValue}>{formatINR(cgstTotal)}</Text>
            </View>
          )}

          {sgstTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST (9%)</Text>
              <Text style={styles.totalValue}>{formatINR(sgstTotal)}</Text>
            </View>
          )}

          {igstTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGST (18%)</Text>
              <Text style={styles.totalValue}>{formatINR(igstTotal)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Round Off</Text>
            <Text style={styles.totalValue}>{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</Text>
          </View>

          <View style={styles.grandTotalBar}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatINR(grandTotal)}</Text>
          </View>
        </View>

        {/* Collapsible Extra Details */}
        <TouchableOpacity
          style={styles.extraToggleBtn}
          onPress={() => setShowExtra(!showExtra)}
        >
          <Text style={styles.extraToggleText}>
            <Ionicons name={showExtra ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} /> Transporter & Dispatch Details
          </Text>
        </TouchableOpacity>

        {showExtra && (
          <View style={styles.extraCard}>
            <View style={styles.row}>
              <CustomInput
                label="Vehicle No"
                placeholder="e.g. TN-38-AB-1234"
                value={extra.vehicleNo}
                onChangeText={(v) => setExtra({ ...extra, vehicleNo: v })}
                autoCapitalize="characters"
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <CustomInput
                label="Transport Name"
                placeholder="Transporter"
                value={extra.transport}
                onChangeText={(v) => setExtra({ ...extra, transport: v })}
                containerStyle={{ flex: 1 }}
              />
            </View>

            <View style={styles.row}>
              <CustomInput
                label="Driver Name"
                placeholder="Driver"
                value={extra.driverName}
                onChangeText={(v) => setExtra({ ...extra, driverName: v })}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <CustomInput
                label="Driver Phone"
                placeholder="Mobile"
                value={extra.driverPhone}
                onChangeText={(v) => setExtra({ ...extra, driverPhone: v })}
                keyboardType="phone-pad"
                containerStyle={{ flex: 1 }}
              />
            </View>

            <CustomInput
              label="Remark / Note"
              placeholder="Any remarks on invoice..."
              value={extra.remark}
              onChangeText={(v) => setExtra({ ...extra, remark: v })}
            />
          </View>
        )}

        {/* ACTION BUTTONS BAR (Save & Share, Save Only, Clear) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.shareActionBtn, saving && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={() => handleSave(true)}
            disabled={saving}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.navyDark} style={{ marginRight: 6 }} />
            <Text style={styles.shareActionBtnText}>Save & Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Only</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearActionBtn}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'Discard Draft?',
                'Are you sure you want to clear this bill entry draft? Any unsaved rows will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear Draft', style: 'destructive', onPress: () => navigation.goBack() }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.errorText} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <PartyPickerModal
        visible={showPartyPicker}
        onClose={() => setShowPartyPicker(false)}
        parties={parties}
        onSelect={(p) => setParty(p)}
        onAddNew={() => navigation.navigate('LedgerForm')}
      />

      <ItemPickerModal
        visible={showItemPicker}
        onClose={() => setShowItemPicker(false)}
        items={itemsMaster}
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
  row: {
    flexDirection: 'row'
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
  partySelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  partySelectSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
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
  dimensionRow: {
    flexDirection: 'row',
    gap: 6
  },
  dimCol: {
    flex: 1
  },
  volBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: colors.goldDark
  },
  volText: {
    fontSize: 12,
    color: colors.navyDark
  },
  volBold: {
    fontWeight: '700',
    color: colors.navyPrimary
  },
  rateUnitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4
  },
  rateUnitToggleText: {
    fontSize: 11,
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
    marginTop: -4
  },
  rowGstText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  unitPickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3
  },
  unitChip: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  unitChipSelected: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  unitChipTextSelected: {
    color: colors.white,
    fontWeight: '700'
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
    alignItems: 'center',
    paddingVertical: 5
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
  extraToggleBtn: {
    alignItems: 'center',
    paddingVertical: 10
  },
  extraToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navyPrimary
  },
  extraCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  bottomBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shareActionBtn: {
    flex: 1.2,
    backgroundColor: colors.goldPrimary,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  shareActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDark
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.navyDark,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  clearActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnDisabled: {
    opacity: 0.7
  }
});
