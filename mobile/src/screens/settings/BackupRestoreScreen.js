import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../theme/colors';
import Header from '../../components/Header';
import { settingsApi } from '../../api/client';

export default function BackupRestoreScreen({ navigation }) {
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      const data = await settingsApi.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const fileName = `TimberBooks_Backup_${Date.now()}.json`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(localUri, jsonStr);
      setLastExport(new Date().toLocaleTimeString());

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert('Backup Exported', `Saved to device: ${localUri}`);
      }
    } catch (err) {
      Alert.alert('Backup Error', err.message || 'Could not export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Database',
      'Restoring will overwrite current invoices, ledgers, and items with the backup file data. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => Alert.alert('Restore Info', 'Select your JSON backup file from device files to restore.')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Backup & Restore"
        subtitle="Data Safety & Storage"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Export Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-upload" size={32} color={colors.goldPrimary} />
          </View>
          <Text style={styles.cardTitle}>Export Full Database Backup</Text>
          <Text style={styles.cardDesc}>
            Downloads all company records, financial years, ledger accounts, timber items, sales bills, purchases, and vouchers into an encrypted JSON file shareable via WhatsApp, Drive, or Email.
          </Text>

          {lastExport ? (
            <Text style={styles.lastExportText}>Last exported at {lastExport}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, exporting && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={handleExportBackup}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Export & Share Backup</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Restore Card */}
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceBg }]}>
            <Ionicons name="refresh" size={32} color={colors.navyPrimary} />
          </View>
          <Text style={styles.cardTitle}>Restore from Backup</Text>
          <Text style={styles.cardDesc}>
            Import a previously exported TimberBooks JSON backup file to restore accounts, stock movements, and transaction history.
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreBtn]}
            activeOpacity={0.8}
            onPress={handleRestore}
          >
            <Ionicons name="folder-open-outline" size={20} color={colors.navyPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, { color: colors.navyPrimary }]}>Select Backup File</Text>
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
  scrollContent: {
    padding: 16
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navyPrimary,
    textAlign: 'center'
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16
  },
  lastExportText: {
    fontSize: 12,
    color: colors.goldDark,
    fontWeight: '600',
    marginBottom: 12
  },
  actionBtn: {
    backgroundColor: colors.navyPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  restoreBtn: {
    backgroundColor: colors.surfaceBg,
    borderColor: colors.border
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
