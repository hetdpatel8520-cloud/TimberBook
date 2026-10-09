import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { invoicesApi, companyApi } from '../../api/client';
import { formatINR } from '../../utils/timberMath';

export default function InvoicePreviewScreen({ route, navigation }) {
  const { invoiceId } = route.params || {};
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      if (!invoiceId) {
        const [listRes, compRes] = await Promise.all([
          invoicesApi.list({ limit: 1 }),
          companyApi.get()
        ]);
        if (listRes.invoices && listRes.invoices.length > 0) {
          setInvoice(listRes.invoices[0]);
        }
        if (compRes.company) setCompany(compRes.company);
        return;
      }

      const [invRes, compRes] = await Promise.all([
        invoicesApi.getById(invoiceId),
        companyApi.get()
      ]);
      if (invRes.invoice) setInvoice(invRes.invoice);
      if (compRes.company) setCompany(compRes.company);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!invoice) return;
    const party = invoice.partySnapshot || {};
    const text = `*TAX INVOICE — ${company?.name || 'TAX INVOICE'}*\n` +
      `Invoice No: ${invoice.billNo}\n` +
      `Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}\n` +
      `Customer: ${party.name || 'Customer'}\n` +
      `Total Amount: ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}\n\n` +
      `Thank you for your business!`;

    const phone = party.phone?.replace(/[^0-9]/g, '');
    const url = phone
      ? `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Notice', 'WhatsApp is not installed on this device. Copying text: ' + text);
    });
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setSharing(true);
      const pdfUrl = invoicesApi.getPdfUrl(invoice._id);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = `${pdfUrl}?download=true`;
        link.download = `Invoice_${invoice.billNo.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const localUri = `${FileSystem.documentDirectory}Invoice_${invoice.billNo.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri);
        } else {
          Alert.alert('Success', `PDF downloaded to: ${localUri}`);
        }
      } else {
        Alert.alert('Download Error', 'Could not generate PDF from server.');
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        const pdfUrl = invoicesApi.getPdfUrl(invoice._id);
        window.open(pdfUrl, '_blank');
      } else {
        Alert.alert('PDF Share Error', err.message || 'Error downloading invoice PDF');
      }
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const pdfUrl = invoicesApi.getPdfUrl(invoice._id);
      window.open(pdfUrl, '_blank');
    } else {
      handleDownloadPdf();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Invoice Preview" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldPrimary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Rendering Tax Invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Invoice Preview" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={54} color={colors.slateGrey} />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: colors.navyDark }}>No Invoices Generated Yet</Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 }}>
            Create a bill from the Bill Entry module to preview, print, and share GST tax invoices.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: colors.navyPrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => navigation.navigate('BillEntry')}
          >
            <Text style={{ color: colors.white, fontWeight: '700' }}>➕ Create New Bill</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const party = invoice.partySnapshot || {};
  const bank = company?.bankDetails || {};
  const extra = invoice.extraDetails || {};

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={`Tax Invoice #${invoice.billNo}`}
        subtitle={`${party.name || 'Party'} • ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}`}
        showBack
        onBack={() => navigation.goBack()}
        badgeText="ORIGINAL"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Printable Tax Invoice Document Card */}
        <View style={styles.invoiceDoc}>
          {/* Header Box */}
          <View style={styles.docHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.compName}>{company?.name ? company.name.toUpperCase() : 'TAX INVOICE'}</Text>
              <Text style={styles.compTagline}>{company?.tagline || (company?.businessType ? `${company.businessType}` : '')}</Text>
              <Text style={styles.compMeta}>{company?.address}, {company?.city} - {company?.pincode}</Text>
              <Text style={styles.compMeta}>GSTIN: {company?.gstin} | Ph: {company?.phone}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.taxBadge}>
                <Text style={styles.taxBadgeText}>TAX INVOICE</Text>
              </View>
              <Text style={styles.copyType}>ORIGINAL FOR RECIPIENT</Text>
              <Text style={styles.billNoText}>Bill No: {invoice.billNo}</Text>
              <Text style={styles.billDateText}>Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>

          {/* Receiver & Transport Split Block */}
          <View style={styles.twoColBox}>
            <View style={[styles.colHalf, { borderRightWidth: 0.5, borderColor: colors.border }]}>
              <Text style={styles.blockTitle}>BILLED TO / BUYER:</Text>
              <Text style={styles.partyBold}>{party.name || 'Cash Customer'}</Text>
              <Text style={styles.partySub}>{party.address || 'Local'}, {party.city}</Text>
              <Text style={styles.partySub}>GSTIN: {party.gstin || 'Unregistered'}</Text>
              <Text style={styles.partySub}>Phone: {party.phone || 'N/A'}</Text>
            </View>

            <View style={styles.colHalf}>
              <Text style={styles.blockTitle}>DISPATCH & TRANSPORT:</Text>
              <Text style={styles.partySub}>Mode: {invoice.mode} | Challan: {invoice.challanNo || 'N/A'}</Text>
              <Text style={styles.partySub}>Vehicle No: {extra.vehicleNo || 'N/A'}</Text>
              <Text style={styles.partySub}>Transport: {extra.transport || 'Direct'}</Text>
              <Text style={styles.partySub}>Destination: {invoice.deliveryAt || 'Site'}</Text>
            </View>
          </View>

          {/* Timber Items Table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 22 }]}>#</Text>
            <Text style={[styles.th, { flex: 2 }]}>Item Description</Text>
            <Text style={[styles.th, { width: 44, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>Unit</Text>
            <Text style={[styles.th, { width: 54, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.th, { width: 65, textAlign: 'right' }]}>Amount</Text>
          </View>

          {invoice.items?.map((item, idx) => {
            let dimStr = '';
            if (item.thickness && item.width && item.length) {
              dimStr = ` (${item.thickness}"×${item.width}"×${item.length}')`;
            } else if (item.cft && item.cft > 0 && item.unit !== 'Man' && item.unit !== 'Kg') {
              dimStr = ` (${item.cft} CFT)`;
            }
            const unitLabel = item.unit || item.rateUnit || (item.cft ? 'CFT' : 'Pcs');
            return (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.altRow : null]}>
                <Text style={[styles.td, { width: 22 }]}>{idx + 1}</Text>
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={2}>
                  {item.description}{dimStr}
                </Text>
                <Text style={[styles.td, { width: 44, textAlign: 'right' }]}>{item.qty || item.pieces || 1}</Text>
                <Text style={[styles.td, { width: 50, textAlign: 'center', fontSize: 10, fontWeight: '600', color: colors.navyPrimary }]}>
                  {unitLabel}
                </Text>
                <Text style={[styles.td, { width: 54, textAlign: 'right' }]}>{Number(item.rate || 0).toFixed(0)}</Text>
                <Text style={[styles.td, { width: 65, textAlign: 'right', fontWeight: '600' }]}>
                  {Number(item.amount || 0).toFixed(0)}
                </Text>
              </View>
            );
          })}

          {/* Bottom Totals & Bank Box */}
          <View style={styles.docFooterRow}>
            <View style={[styles.footerHalf, { borderRightWidth: 0.5, borderColor: colors.border }]}>
              <Text style={styles.blockTitle}>BANK DETAILS FOR RTGS/NEFT:</Text>
              <Text style={styles.partySub}>Bank: {bank.bankName || 'SBI'}</Text>
              <Text style={styles.partySub}>A/c No: {bank.accountNo || 'N/A'}</Text>
              <Text style={styles.partySub}>IFSC: {bank.ifsc || 'N/A'}</Text>
              <Text style={styles.partySub}>Branch: {bank.branch || 'Pollachi'}</Text>
            </View>

            <View style={styles.footerHalf}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Taxable Subtotal:</Text>
                <Text style={styles.calcVal}>{formatINR(invoice.subtotal)}</Text>
              </View>
              {invoice.cgstTotal > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>CGST (9%):</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.cgstTotal)}</Text>
                </View>
              )}
              {invoice.sgstTotal > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>SGST (9%):</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.sgstTotal)}</Text>
                </View>
              )}
              {invoice.igstTotal > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>IGST (18%):</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.igstTotal)}</Text>
                </View>
              )}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Round Off:</Text>
                <Text style={styles.calcVal}>{invoice.roundOff >= 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</Text>
              </View>

              <View style={styles.docGrandTotalBar}>
                <Text style={styles.docGrandTotalLabel}>GRAND TOTAL:</Text>
                <Text style={styles.docGrandTotalVal}>{formatINR(invoice.grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Signatory */}
          <View style={styles.signatoryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.termsTitle}>Terms & Conditions:</Text>
              <Text style={styles.termsText}>1. Goods once sold will not be taken back.</Text>
              <Text style={styles.termsText}>2. Interest @ 18% p.a. charged after due date.</Text>
            </View>
            <View style={styles.signatoryBox}>
              <Text style={styles.signatoryComp}>For {company?.name ? company.name.toUpperCase() : 'SUPPLIER'}</Text>
              <View style={{ height: 28 }} />
              <Text style={styles.signatoryAuth}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        {/* Action Share & Print Buttons */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.printBtn}
            activeOpacity={0.8}
            onPress={handlePrint}
          >
            <Ionicons name="print-outline" size={20} color={colors.navyDark} style={{ marginRight: 6 }} />
            <Text style={styles.printBtnText}>Print Invoice (A4)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pdfBtn, sharing && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={handleDownloadPdf}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Open / Download PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsAppBtn}
            activeOpacity={0.8}
            onPress={handleShareWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={20} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 12,
    paddingBottom: 40
  },
  invoiceDoc: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.navyPrimary
  },
  compName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyPrimary
  },
  compTagline: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2
  },
  compMeta: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1
  },
  taxBadge: {
    backgroundColor: colors.navyPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  taxBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  copyType: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 3
  },
  billNoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4
  },
  billDateText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1
  },
  twoColBox: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8
  },
  colHalf: {
    flex: 1,
    paddingHorizontal: 6
  },
  blockTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginBottom: 3
  },
  partyBold: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary
  },
  partySub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.navyPrimary,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 8
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border
  },
  altRow: {
    backgroundColor: '#F8FAFC'
  },
  td: {
    fontSize: 10,
    color: colors.textPrimary
  },
  docFooterRow: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8
  },
  footerHalf: {
    flex: 1,
    paddingHorizontal: 6
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2
  },
  calcLabel: {
    fontSize: 10,
    color: colors.textSecondary
  },
  calcVal: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary
  },
  docGrandTotalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.navyPrimary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 6
  },
  docGrandTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white
  },
  docGrandTotalVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.goldPrimary
  },
  signatoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border
  },
  termsTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted
  },
  termsText: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1
  },
  signatoryBox: {
    alignItems: 'flex-end'
  },
  signatoryComp: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.navyPrimary
  },
  signatoryAuth: {
    fontSize: 8,
    color: colors.textSecondary
  },
  actionsBar: {
    flexDirection: 'column',
    marginTop: 16,
    gap: 10
  },
  printBtn: {
    backgroundColor: colors.goldPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8
  },
  pdfBtn: {
    backgroundColor: colors.navyDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.goldPrimary
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  btnDisabled: {
    opacity: 0.7
  }
});
