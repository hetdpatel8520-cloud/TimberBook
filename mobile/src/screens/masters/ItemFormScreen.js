import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import CustomInput from '../../components/CustomInput';
import SegmentedControl from '../../components/SegmentedControl';
import { itemsApi } from '../../api/client';

export default function ItemFormScreen({ route, navigation }) {
  const itemId = route?.params?.itemId;
  const isEdit = !!itemId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    hsn: '4407',
    group: 'Sawn Timber',
    unit: 'CFT',
    cgstRate: '9',
    sgstRate: '9',
    igstRate: '18',
    saleRate: '',
    purchaseRate: '',
    openingQty: '0',
    reorderLevel: '50'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      loadItem();
    }
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const res = await itemsApi.getById(itemId);
      if (res.item) {
        setForm({
          name: res.item.name || '',
          hsn: res.item.hsn || '4407',
          group: res.item.group || 'Sawn Timber',
          unit: res.item.unit || 'CFT',
          cgstRate: String(res.item.cgstRate || 9),
          sgstRate: String(res.item.sgstRate || 9),
          igstRate: String(res.item.igstRate || 18),
          saleRate: String(res.item.saleRate || ''),
          purchaseRate: String(res.item.purchaseRate || ''),
          openingQty: String(res.item.openingQty || 0),
          reorderLevel: String(res.item.reorderLevel || 50)
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load item');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleTaxRateChange = (taxTotal) => {
    const half = taxTotal / 2;
    setForm(prev => ({
      ...prev,
      cgstRate: String(half),
      sgstRate: String(half),
      igstRate: String(taxTotal)
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Item / Wood name is required';
    if (!form.hsn.trim()) errs.hsn = 'HSN Code is required (default 4407)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        hsn: form.hsn.trim(),
        group: form.group,
        unit: form.unit,
        cgstRate: parseFloat(form.cgstRate) || 9,
        sgstRate: parseFloat(form.sgstRate) || 9,
        igstRate: parseFloat(form.igstRate) || 18,
        saleRate: parseFloat(form.saleRate) || 0,
        purchaseRate: parseFloat(form.purchaseRate) || 0,
        openingQty: parseFloat(form.openingQty) || 0,
        reorderLevel: parseFloat(form.reorderLevel) || 50
      };

      if (isEdit) {
        await itemsApi.update(itemId, payload);
        Alert.alert('Updated', 'Timber item updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await itemsApi.create(payload);
        Alert.alert('Created', 'New timber item created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Timber Item',
      `Are you sure you want to permanently delete "${form.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const res = await itemsApi.delete(itemId);
              if (res.success) {
                Alert.alert('Deleted', 'Timber item deleted successfully.', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Cannot Delete', res.message || 'Could not delete item.');
              }
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Cannot delete item with transaction history.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const currentTotalTax = (parseFloat(form.cgstRate) || 0) + (parseFloat(form.sgstRate) || 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={isEdit ? 'Edit Timber Item' : 'New Timber Item'}
        subtitle={isEdit ? form.name : 'Wood Species, Planks or Firewood'}
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Item Identification</Text>

              <CustomInput
                label="Item / Timber Name *"
                placeholder="e.g. Teak Wood Sawn Sizes, Sal Wood Beams"
                value={form.name}
                onChangeText={(v) => update('name', v)}
                error={errors.name}
              />

              <View style={styles.row}>
                <CustomInput
                  label="HSN / SAC Code *"
                  placeholder="4407"
                  value={form.hsn}
                  onChangeText={(v) => update('hsn', v)}
                  error={errors.hsn}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <View style={{ flex: 1.4 }}>
                  <Text style={styles.fieldLabel}>TIMBER GROUP</Text>
                  <SegmentedControl
                    options={['Sawn', 'Drum', 'Logs', 'Offcuts']}
                    selectedIndex={Math.max(0, ['Sawn Timber', 'Drum/Firewood', 'Logs', 'Offcuts'].indexOf(form.group))}
                    onChange={(idx) => {
                      const grps = ['Sawn Timber', 'Drum/Firewood', 'Logs', 'Offcuts'];
                      const selectedGrp = grps[idx];
                      if (selectedGrp === 'Drum/Firewood') {
                        setForm(prev => ({
                          ...prev,
                          group: selectedGrp,
                          hsn: prev.hsn === '4407' ? '4401' : prev.hsn,
                          cgstRate: '2.5',
                          sgstRate: '2.5',
                          igstRate: '5',
                          unit: prev.unit === 'CFT' ? 'Man' : prev.unit
                        }));
                      } else {
                        setForm(prev => ({
                          ...prev,
                          group: selectedGrp,
                          hsn: prev.hsn === '4401' ? '4407' : prev.hsn,
                          cgstRate: '9',
                          sgstRate: '9',
                          igstRate: '18',
                          unit: prev.unit === 'Man' ? 'CFT' : prev.unit
                        }));
                      }
                    }}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>PRIMARY UNIT (માપ / રેટ યુનિટ) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {['CFT', 'CBM', 'Ton', 'Kg', 'Man', 'Quintal', 'Pcs'].map((u) => {
                  const isSel = (form.unit === 'Piece' ? 'Pcs' : form.unit) === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, isSel && styles.unitChipSelected]}
                      onPress={() => update('unit', u === 'Pcs' ? 'Pcs' : u)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.unitChipText, isSel && styles.unitChipTextSelected]}>
                        {u === 'Man' ? 'Man (મણ)' : u === 'Kg' ? 'Kg (કિલો)' : u === 'Ton' ? 'Ton (ટન)' : u === 'Quintal' ? 'Quintal' : u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* GST Rates */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>GST Tax Rate</Text>
              <Text style={styles.fieldLabel}>TAX SLAB (TIMBER STANDARD: 18% / FIREWOOD: 5%)</Text>
              <SegmentedControl
                options={['5% (Firewood)', '12%', '18% (Timber)', '28%']}
                selectedIndex={Math.max(0, [5, 12, 18, 28].indexOf(currentTotalTax))}
                onChange={(idx) => {
                  const taxes = [5, 12, 18, 28];
                  handleTaxRateChange(taxes[idx]);
                }}
                containerStyle={{ marginBottom: 12 }}
              />

              <View style={styles.row}>
                <CustomInput
                  label="CGST Rate"
                  value={form.cgstRate}
                  editable={false}
                  suffix="%"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="SGST Rate"
                  value={form.sgstRate}
                  editable={false}
                  suffix="%"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label="IGST Rate"
                  value={form.igstRate}
                  editable={false}
                  suffix="%"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </View>

            {/* Rates & Stock */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Standard Rates & Stock</Text>

              <View style={styles.row}>
                <CustomInput
                  label={`Sale Rate / ${form.unit}`}
                  placeholder="0.00"
                  value={form.saleRate}
                  onChangeText={(v) => update('saleRate', v)}
                  keyboardType="numeric"
                  prefix="₹"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label={`Purchase Rate / ${form.unit}`}
                  placeholder="0.00"
                  value={form.purchaseRate}
                  onChangeText={(v) => update('purchaseRate', v)}
                  keyboardType="numeric"
                  prefix="₹"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <View style={styles.row}>
                <CustomInput
                  label={`Opening Stock (${form.unit})`}
                  placeholder="0.00"
                  value={form.openingQty}
                  onChangeText={(v) => update('openingQty', v)}
                  keyboardType="numeric"
                  editable={!isEdit} // opening stock set once
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <CustomInput
                  label={`Low Stock Alert Level (${form.unit})`}
                  placeholder="50"
                  value={form.reorderLevel}
                  onChangeText={(v) => update('reorderLevel', v)}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
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
                  <Ionicons name="save-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>{isEdit ? 'Update Item' : 'Save Timber Item'}</Text>
                </>
              )}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.deleteBtnText}>Delete Timber Item</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
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
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.4
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
  row: {
    flexDirection: 'row'
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
    marginTop: 6
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.7
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    marginTop: 10
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14
  }
});
