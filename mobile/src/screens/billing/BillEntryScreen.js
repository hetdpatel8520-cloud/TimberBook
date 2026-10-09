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
import { ledgersApi, itemsApi, invoicesApi } from '../../api/client';
import {
  calculateCft,
  calculateCoreWoodCft,
  cftToCbm,
  calculateGst,
  calculateRoundOff,
  formatINR
} from '../../utils/timberMath';

export default function BillEntryScreen({ navigation }) {
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

  // Line rows
  const [rows, setRows] = useState([
    {
      itemId: null,
      description: '',
      hsn: '4407',
      pieces: '10',
      thickness: '3',
      width: '2',
      length: '7',
      qty: '10',
      cft: 35,
      cbm: 0.9911,
      rateUnit: 'CFT',
      cftRate: '2400',
      cbmRate: '84755',
      rate: '2400',
      amount: 84000,
      taxPercent: 18,
      cgstAmount: 7560,
      sgstAmount: 7560,
      igstAmount: 0,
      total: 99120
    }
  ]);

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

  const loadInitialData = async () => {
    try {
      const [nextNumRes, partiesRes, itemsRes] = await Promise.all([
        invoicesApi.getNextNumber(),
        ledgersApi.list({ type: 'debtors' }),
        itemsApi.list()
      ]);

      if (nextNumRes.nextBillNo) setBillNo(nextNumRes.nextBillNo);
      if (partiesRes.ledgers) {
        setParties(partiesRes.ledgers);
        if (partiesRes.ledgers.length > 0 && !party) {
          setParty(partiesRes.ledgers[0]);
        }
      }
      if (itemsRes.items) {
        setItemsMaster(itemsRes.items);
        if (itemsRes.items.length > 0 && !rows[0].itemId) {
          selectItemForRow(0, itemsRes.items[0]);
        }
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
      const tax = isDrum ? 5 : 18;
      const rate = isDrum && (r.rate === '2400' || !r.rate) ? '150' : r.rate;
      const qty = isDrum && (r.qty === '10' || !r.qty) ? '40' : r.qty;
      return {
        ...r,
        unit: u,
        rateUnit: u,
        hsn,
        taxPercent: tax,
        rate,
        qty
      };
    });
    setRows(updated);
    setTimeout(() => {
      let current = [...updated];
      current.forEach((_, idx) => recalculateRow(current, idx));
    }, 50);
  };

  const selectItemForRow = (index, item) => {
    const updated = [...rows];
    const row = { ...updated[index] };
    row.itemId = item._id || item.id;
    row.description = item.name;
    const isFirewood = billType === 'Drum' || (item.group && /drum|firewood/i.test(item.group));
    row.hsn = item.hsn || (isFirewood ? '4401' : '4407');
    row.taxPercent = item.cgstRate !== undefined ? (item.cgstRate + item.sgstRate) : (isFirewood ? 5 : 18);
    const itemUnit = item.unit || (isFirewood ? 'Man' : 'CFT');
    row.unit = itemUnit;
    row.rateUnit = itemUnit;
    row.cftRate = String(item.saleRate || 0);
    row.rate = String(item.saleRate || 0);
    updated[index] = row;
    recalculateRow(updated, index);
  };

  const updateRowField = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    recalculateRow(updated, index);
  };

  const recalculateRow = (rowsArr, index) => {
    const row = rowsArr[index];
    const pieces = parseFloat(row.pieces) || parseFloat(row.qty) || 1;
    const t = parseFloat(row.thickness) || 0;
    const w = parseFloat(row.width) || 0;
    const l = parseFloat(row.length) || 0;

    let cft = 0;
    let cbm = 0;
    let amount = 0;
    const rate = parseFloat(row.rate) || 0;

    if (billType === 'Size') {
      if (t > 0 && w > 0 && l > 0) {
        cft = calculateCft(t, w, l, pieces);
        cbm = cftToCbm(cft);
      }
      row.cft = cft;
      row.cbm = cbm;

      if (row.rateUnit === 'CBM' && cbm > 0) {
        amount = parseFloat((cbm * rate).toFixed(2));
      } else if (cft > 0) {
        amount = parseFloat((cft * rate).toFixed(2));
      } else {
        amount = parseFloat((pieces * rate).toFixed(2));
      }
    } else if (billType === 'Core Wood') {
      const girth = parseFloat(row.girth) || 0;
      if (girth > 0 && l > 0) {
        cft = calculateCoreWoodCft(girth, l, pieces);
        cbm = cftToCbm(cft);
      }
      row.cft = cft;
      row.cbm = cbm;

      if (row.rateUnit === 'CBM' && cbm > 0) {
        amount = parseFloat((cbm * rate).toFixed(2));
      } else if (cft > 0) {
        amount = parseFloat((cft * rate).toFixed(2));
      } else {
        amount = parseFloat((pieces * rate).toFixed(2));
      }
    } else {
      // Drum / Firewood or Normal mode (Rate per Man, Kg, Ton, Quintal, CFT, Pcs)
      const qty = parseFloat(row.qty) || 0;
      amount = parseFloat((qty * rate).toFixed(2));
    }

    row.amount = amount;
    const isLocal = true; // intra-state by default
    const tax = calculateGst(amount, row.taxPercent !== undefined ? row.taxPercent : (billType === 'Drum' ? 5 : 18), isLocal);
    row.cgstAmount = tax.cgstAmount;
    row.sgstAmount = tax.sgstAmount;
    row.igstAmount = tax.igstAmount;
    row.total = parseFloat((amount + tax.taxTotal).toFixed(2));

    rowsArr[index] = row;
    setRows([...rowsArr]);
  };

  const addRow = () => {
    const defaultItem = itemsMaster[0] || {};
    const isDrum = billType === 'Drum';
    const unit = defaultItem.unit || (isDrum ? 'Man' : 'CFT');
    const hsn = defaultItem.hsn || (isDrum ? '4401' : '4407');
    const tax = defaultItem.cgstRate !== undefined ? (defaultItem.cgstRate + defaultItem.sgstRate) : (isDrum ? 5 : 18);
    const newRow = {
      itemId: defaultItem._id || null,
      description: defaultItem.name || (isDrum ? 'Firewood / Drum Wood' : 'Timber Item'),
      hsn,
      pieces: isDrum ? '1' : '10',
      thickness: '3',
      width: '2',
      length: '7',
      qty: isDrum ? '40' : '10',
      cft: isDrum ? 0 : 35,
      cbm: isDrum ? 0 : 0.9911,
      unit,
      rateUnit: unit,
      cftRate: String(defaultItem.saleRate || (isDrum ? '150' : '2400')),
      cbmRate: '',
      rate: String(defaultItem.saleRate || (isDrum ? '150' : '2400')),
      amount: 0,
      taxPercent: tax,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      total: 0
    };
    const newRows = [...rows, newRow];
    recalculateRow(newRows, newRows.length - 1);
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
    if (!party) {
      Alert.alert('Party Required', 'Please select a customer / party ledger.');
      return;
    }
    if (rows.length === 0) {
      Alert.alert('Items Required', 'Please add at least one timber item.');
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
    <SafeAreaView style={styles.container}>
      <Header
        title="New Bill / Invoice"
        subtitle={party ? `${party.name} (${party.city || 'Local'})` : 'Select Customer'}
        showBack
        onBack={() => navigation.goBack()}
        badgeText={billNo}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.fieldLabel}>CUSTOMER / PARTY *</Text>
          <TouchableOpacity
            style={styles.partySelectBtn}
            activeOpacity={0.7}
            onPress={() => setShowPartyPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.partySelectName}>
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
                    value={row.pieces}
                    onChangeText={(v) => updateRowField(index, 'pieces', v)}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label='Thick (")'
                    value={row.thickness}
                    onChangeText={(v) => updateRowField(index, 'thickness', v)}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label='Width (")'
                    value={row.width}
                    onChangeText={(v) => updateRowField(index, 'width', v)}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                  <CustomInput
                    label="Len (')"
                    value={row.length}
                    onChangeText={(v) => updateRowField(index, 'length', v)}
                    keyboardType="numeric"
                    containerStyle={styles.dimCol}
                  />
                </View>

                {/* Calculated Volumes */}
                <View style={styles.volBanner}>
                  <Text style={styles.volText}>CFT: <Text style={styles.volBold}>{row.cft || 0}</Text></Text>
                  <Text style={styles.volText}>CBM: <Text style={styles.volBold}>{row.cbm || 0}</Text></Text>
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
                    value={row.pieces}
                    onChangeText={(v) => updateRowField(index, 'pieces', v)}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1, marginRight: 6 }}
                  />
                  <CustomInput
                    label='Girth / Cir (")'
                    value={row.girth || ''}
                    placeholder="e.g. 36"
                    onChangeText={(v) => updateRowField(index, 'girth', v)}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1.5, marginRight: 6 }}
                  />
                  <CustomInput
                    label="Len (')"
                    value={row.length}
                    onChangeText={(v) => updateRowField(index, 'length', v)}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {/* Calculated Volumes */}
                <View style={styles.volBanner}>
                  <Text style={styles.volText}>Hoppus CFT: <Text style={styles.volBold}>{row.cft || 0}</Text></Text>
                  <Text style={styles.volText}>CBM: <Text style={styles.volBold}>{row.cbm || 0}</Text></Text>
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
                    placeholder="e.g. 40"
                    value={row.qty}
                    onChangeText={(v) => updateRowField(index, 'qty', v)}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1.2, marginRight: 8 }}
                  />
                  <CustomInput
                    label="HSN Code"
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
                placeholder="0.00"
                value={row.rate}
                onChangeText={(v) => updateRowField(index, 'rate', v)}
                keyboardType="numeric"
                prefix="₹"
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <CustomInput
                label="Taxable Amount"
                value={formatINR(row.amount)}
                editable={false}
                containerStyle={{ flex: 1 }}
              />
            </View>

            {/* Quick Tax Slab Selector */}
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 }}>
                GST RATE SLAB
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { label: '5% (Firewood)', rate: 5 },
                  { label: '12%', rate: 12 },
                  { label: '18% (Timber)', rate: 18 },
                  { label: '0%', rate: 0 }
                ].map((tax) => {
                  const isSel = (row.taxPercent || 0) === tax.rate;
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
            </View>

            {/* GST Split & Row Total */}
            <View style={styles.rowTotalBar}>
              <Text style={styles.rowGstText}>
                GST ({row.taxPercent || 18}%): {formatINR((row.cgstAmount || 0) + (row.sgstAmount || 0) + (row.igstAmount || 0))}
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
