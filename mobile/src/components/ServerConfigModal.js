import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getBaseUrl, setBaseUrl, setupApi, PUBLIC_TUNNEL_URL, LOCAL_WIFI_URL } from '../api/client';

export default function ServerConfigModal({ visible, onClose, onServerSaved }) {
  const [url, setUrl] = useState(getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, msg: string }

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      let cleanUrl = url.trim().replace(/\/+$/, '');
      if (!cleanUrl.endsWith('/api')) {
        cleanUrl += '/api';
      }
      setBaseUrl(cleanUrl);
      const res = await setupApi.getStatus();
      if (res && res.success !== undefined) {
        setTestResult({
          success: true,
          msg: `Connected! Company: ${res.companyName || 'Ready'}`
        });
      } else {
        setTestResult({
          success: true,
          msg: 'Server is reachable!'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        msg: err.message || 'Cannot reach server. Check Wi-Fi or IP.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    let cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl += '/api';
    }
    setBaseUrl(cleanUrl);
    if (onServerSaved) onServerSaved(cleanUrl);
    onClose();
  };

  const handleSetPreset = (presetUrl) => {
    setUrl(presetUrl);
    setTestResult(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="server-outline" size={22} color={colors.goldPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Server Connection</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.slateGrey} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Configure the backend API address for TimberBooks mobile app.
          </Text>

          {/* Quick Presets */}
          <Text style={styles.fieldLabel}>QUICK PRESETS</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetChip, url.includes('trycloudflare') && styles.presetChipActive]}
              onPress={() => handleSetPreset(PUBLIC_TUNNEL_URL)}
            >
              <Ionicons name="cloud-outline" size={14} color={url.includes('trycloudflare') ? colors.goldLight : '#CBD5E1'} style={{ marginRight: 5 }} />
              <Text style={[styles.presetChipText, url.includes('trycloudflare') && styles.presetChipTextActive]}>Cloud 5G Tunnel (Recommended)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, url.includes('10.241.74.108') && styles.presetChipActive]}
              onPress={() => handleSetPreset(LOCAL_WIFI_URL)}
            >
              <Ionicons name="wifi-outline" size={14} color={url.includes('10.241.74.108') ? colors.goldLight : '#CBD5E1'} style={{ marginRight: 5 }} />
              <Text style={[styles.presetChipText, url.includes('10.241.74.108') && styles.presetChipTextActive]}>Laptop Wi-Fi (10.241.74.108)</Text>
            </TouchableOpacity>
          </View>

          {/* URL Input */}
          <Text style={styles.fieldLabel}>SERVER API URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setTestResult(null);
              }}
              placeholder="http://10.241.74.108:5000/api"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Test Status Banner */}
          {testResult && (
            <View style={[styles.testBox, testResult.success ? styles.testSuccess : styles.testError]}>
              <Ionicons
                name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={testResult.success ? '#059669' : '#DC2626'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.testMsg,
                  { color: testResult.success ? '#065F46' : '#991B1B' }
                ]}
              >
                {testResult.msg}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.navyDark} />
              ) : (
                <Text style={styles.testBtnText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Save URL</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>
            💡 If your phone is on 5G/cellular data, connect your phone to the same Wi-Fi as your computer, or enter your Cloud Server URL.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDark
  },
  closeBtn: {
    padding: 4
  },
  subtitle: {
    fontSize: 12,
    color: colors.slateGrey,
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.slateLight,
    marginBottom: 6
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    marginBottom: 8
  },
  presetChipActive: {
    backgroundColor: colors.navyDark,
    borderColor: colors.goldPrimary
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navyDark
  },
  presetChipTextActive: {
    color: colors.goldLight
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  input: {
    fontSize: 13,
    color: colors.navyDark,
    fontWeight: '600'
  },
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  testSuccess: {
    backgroundColor: '#DEF7EC'
  },
  testError: {
    backgroundColor: '#FDE8E8'
  },
  testMsg: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  testBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDark
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.goldPrimary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navyDark
  },
  hintText: {
    fontSize: 11,
    color: colors.slateGrey,
    lineHeight: 15,
    fontStyle: 'italic',
    textAlign: 'center'
  }
});
